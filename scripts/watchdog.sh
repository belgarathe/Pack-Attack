#!/bin/bash
# ============================================================================
# Pack Attack Watchdog Script
# Monitors server health and automatically restarts if needed
# Run this via cron every 5 minutes: */5 * * * * /var/www/packattack/app/scripts/watchdog.sh
# ============================================================================

set -e

LOG_FILE="/var/log/packattack/watchdog.log"
HEALTH_URL="http://localhost:3000/api/health"
MAX_MEMORY_MB=500
MAX_LOAD=4.0
RESTART_DELAY=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

restart_app() {
    log "RESTARTING: $1"
    sudo -u packattack pm2 restart packattack --update-env
    sleep $RESTART_DELAY
}

# Check if PM2 process is running
if ! sudo -u packattack pm2 list | grep -q "packattack.*online"; then
    log "ERROR: PackAttack process not running, starting..."
    restart_app "Process not running"
    exit 0
fi

# Check health endpoint with timeout
HEALTH_RESPONSE=$(curl -s --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "TIMEOUT")

if [ "$HEALTH_RESPONSE" == "TIMEOUT" ]; then
    log "ERROR: Health check timed out"
    restart_app "Health check timeout"
    exit 0
fi

# Parse health status
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$HEALTH_STATUS" == "unhealthy" ]; then
    log "ERROR: Server reports unhealthy status"
    restart_app "Unhealthy status"
    exit 0
fi

# Check for stuck processes (Next.js workers consuming excessive CPU)
STUCK_PROCESSES=$(ps -eo pid,pcpu,cmd --sort=-pcpu | grep -E "next|node" | awk '$2 > 200 {print $1}' | head -5)
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
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)
LOAD_INT=$(echo "$LOAD" | awk '{printf "%d", $1}')

if [ "$LOAD_INT" -gt "${MAX_LOAD%.*}" ]; then
    log "WARNING: High system load: $LOAD"
    # Only restart if load has been high for multiple checks
    # (This is a simple approach - could be enhanced with state file)
fi

# Check memory usage from health endpoint
MEMORY_USED=$(echo "$HEALTH_RESPONSE" | grep -o '"used":[0-9]*' | cut -d':' -f2 || echo "0")

if [ "$MEMORY_USED" -gt "$MAX_MEMORY_MB" ]; then
    log "WARNING: High memory usage: ${MEMORY_USED}MB"
    restart_app "High memory usage"
    exit 0
fi

# Log successful health check (only every 12th check = hourly with 5min interval)
MINUTE=$(date +%M)
if [ "$MINUTE" == "00" ]; then
    log "OK: Health check passed - Status: $HEALTH_STATUS, Memory: ${MEMORY_USED}MB, Load: $LOAD"
fi

exit 0
