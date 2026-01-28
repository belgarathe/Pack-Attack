#!/bin/bash
# ============================================================================
# Pack Attack Watchdog Script
# Monitors server health and automatically restarts if needed
# Run this via cron every 2 minutes: */2 * * * * /var/www/packattack/app/scripts/watchdog.sh
# ============================================================================

# Don't exit on error - we want to handle errors gracefully
set +e

LOG_FILE="/var/log/packattack/watchdog.log"
STATE_FILE="/tmp/packattack-watchdog-state"
HEALTH_URL="http://localhost:3000/api/health"
MAX_MEMORY_MB=500
MAX_LOAD=4.0
RESTART_DELAY=15
MAX_RESTARTS_PER_HOUR=5
COOLDOWN_MINUTES=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check restart count to prevent restart loops
check_restart_limit() {
    local NOW=$(date +%s)
    local HOUR_AGO=$((NOW - 3600))
    
    # Read state file or create empty one
    if [ -f "$STATE_FILE" ]; then
        # Filter out old entries (older than 1 hour)
        grep -E "^[0-9]+" "$STATE_FILE" | while read TIMESTAMP; do
            if [ "$TIMESTAMP" -gt "$HOUR_AGO" ]; then
                echo "$TIMESTAMP"
            fi
        done > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "$STATE_FILE"
    else
        touch "$STATE_FILE"
    fi
    
    # Count recent restarts
    RESTART_COUNT=$(wc -l < "$STATE_FILE")
    
    if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
        log "BLOCKED: Too many restarts in the last hour ($RESTART_COUNT). Waiting for cooldown."
        return 1
    fi
    
    return 0
}

record_restart() {
    echo "$(date +%s)" >> "$STATE_FILE"
}

restart_app() {
    # Check if we're in cooldown
    if ! check_restart_limit; then
        return 1
    fi
    
    log "RESTARTING: $1"
    record_restart
    
    # First try graceful restart
    sudo -u packattack pm2 restart packattack --update-env 2>/dev/null
    
    if [ $? -ne 0 ]; then
        log "WARNING: Graceful restart failed, trying hard restart..."
        sudo -u packattack pm2 delete packattack 2>/dev/null || true
        sleep 2
        cd /var/www/packattack/app && sudo -u packattack pm2 start ecosystem.config.cjs --env production
    fi
    
    sleep $RESTART_DELAY
    
    # Verify restart was successful
    if sudo -u packattack pm2 list | grep -q "packattack.*online"; then
        log "RESTART SUCCESS: App is back online"
        return 0
    else
        log "RESTART FAILED: App still not online after restart"
        return 1
    fi
}

# Main health check logic
main() {
    # Check if PM2 process is running
    PM2_STATUS=$(sudo -u packattack pm2 jlist 2>/dev/null)
    if [ -z "$PM2_STATUS" ] || ! echo "$PM2_STATUS" | grep -q '"name":"packattack"'; then
        log "ERROR: PackAttack process not found in PM2"
        restart_app "Process not found"
        exit 0
    fi
    
    # Check process status
    if ! echo "$PM2_STATUS" | grep -q '"status":"online"'; then
        log "ERROR: PackAttack process not in online state"
        
        # Check restart count from PM2
        RESTART_COUNT=$(echo "$PM2_STATUS" | grep -o '"restart_time":[0-9]*' | cut -d':' -f2)
        if [ -n "$RESTART_COUNT" ] && [ "$RESTART_COUNT" -gt 50 ]; then
            log "WARNING: PM2 shows $RESTART_COUNT restarts, resetting counter..."
            sudo -u packattack pm2 reset packattack
        fi
        
        restart_app "Process not online"
        exit 0
    fi
    
    # Check health endpoint with timeout
    HEALTH_RESPONSE=$(curl -s --max-time 15 "$HEALTH_URL" 2>/dev/null)
    CURL_EXIT=$?
    
    if [ $CURL_EXIT -ne 0 ] || [ -z "$HEALTH_RESPONSE" ]; then
        log "ERROR: Health check failed (curl exit: $CURL_EXIT)"
        
        # Try a second time before restarting
        sleep 3
        HEALTH_RESPONSE=$(curl -s --max-time 15 "$HEALTH_URL" 2>/dev/null)
        if [ -z "$HEALTH_RESPONSE" ]; then
            restart_app "Health check timeout (2 attempts)"
            exit 0
        fi
    fi
    
    # Parse health status
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    DB_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6 || echo "unknown")
    UPTIME=$(echo "$HEALTH_RESPONSE" | grep -o '"uptime":[0-9]*' | cut -d':' -f2 || echo "0")
    
    # Only restart if database is actually down (not just degraded)
    if [ "$DB_STATUS" == "down" ]; then
        log "ERROR: Database is down"
        restart_app "Database down"
        exit 0
    fi
    
    if [ "$HEALTH_STATUS" == "unhealthy" ]; then
        log "ERROR: Server reports unhealthy status (DB: $DB_STATUS)"
        restart_app "Unhealthy status"
        exit 0
    fi
    
    # Check memory usage from health endpoint
    MEMORY_USED=$(echo "$HEALTH_RESPONSE" | grep -o '"used":[0-9]*' | cut -d':' -f2 || echo "0")
    MEMORY_PERCENT=$(echo "$HEALTH_RESPONSE" | grep -o '"percentage":[0-9]*' | cut -d':' -f2 || echo "0")
    
    if [ "$MEMORY_USED" -gt "$MAX_MEMORY_MB" ] && [ "$UPTIME" -gt 300 ]; then
        log "WARNING: High memory usage: ${MEMORY_USED}MB (${MEMORY_PERCENT}%), uptime: ${UPTIME}s"
        restart_app "High memory usage"
        exit 0
    fi
    
    # Check for stuck processes (Next.js workers consuming excessive CPU for >5min)
    STUCK_PROCESSES=$(ps -eo pid,pcpu,etimes,cmd --sort=-pcpu 2>/dev/null | grep -E "next|node" | awk '$2 > 150 && $3 > 300 {print $1}' | head -3)
    if [ -n "$STUCK_PROCESSES" ]; then
        log "WARNING: Found stuck processes with high CPU: $STUCK_PROCESSES"
        for PID in $STUCK_PROCESSES; do
            log "Killing stuck process: $PID"
            kill -9 "$PID" 2>/dev/null || true
        done
        sleep 2
        restart_app "Killed stuck processes"
        exit 0
    fi
    
    # Check system load average
    LOAD=$(cat /proc/loadavg | awk '{print $1}')
    
    # Log successful health check periodically (every 30 minutes)
    MINUTE=$(date +%M)
    if [ "$MINUTE" == "00" ] || [ "$MINUTE" == "30" ]; then
        log "OK: Status=$HEALTH_STATUS, DB=$DB_STATUS, Memory=${MEMORY_USED}MB (${MEMORY_PERCENT}%), Uptime=${UPTIME}s, Load=$LOAD"
    fi
}

main
exit 0
