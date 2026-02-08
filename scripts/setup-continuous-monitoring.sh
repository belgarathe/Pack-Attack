#!/bin/bash
# Setup continuous security monitoring
# Monitors for malware, high memory, database issues every 2 minutes

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== SETTING UP CONTINUOUS SECURITY MONITORING ==="

# Create log directory
mkdir -p /var/log/packattack
chmod 750 /var/log/packattack

# Create the continuous monitoring script
cat > /usr/local/bin/packattack-continuous-monitor << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/packattack/security-monitor.log"
ALERT_FILE="/var/log/packattack/security-alerts.log"

# Create log directory if it doesn't exist
mkdir -p /var/log/packattack

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
    echo "[ALERT $(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$ALERT_FILE"
    # TODO: Add email/Slack notification here
    # Example: echo "$1" | mail -s "Pack-Attack Security Alert" admin@pack-attack.de
}

# Check for known malware processes
MALWARE_PROCESSES=$(ps aux | grep -E "(OFHyIf|ZE8sNYuzb|kworker|lrt|ldx)" | grep -v grep || true)
if [ -n "$MALWARE_PROCESSES" ]; then
    alert "MALWARE: Suspicious process detected - $MALWARE_PROCESSES"
    # Kill any processes in /dev/shm
    pkill -9 -f "/dev/shm/" || true
    log "Killed suspicious processes in /dev/shm"
fi

# Check for executables in /dev/shm (where malware was previously found)
SHMALWARE=$(find /dev/shm -type f -executable 2>/dev/null || true)
if [ -n "$SHMALWARE" ]; then
    alert "MALWARE: Executables found in /dev/shm: $SHMALWARE"
    # Remove executables from /dev/shm
    find /dev/shm -type f -executable -delete 2>/dev/null || true
fi

# Check memory usage
MEM_PCT=$(free | grep Mem | awk '{print int(($3/$2) * 100)}' 2>/dev/null || echo "0")
if [ "$MEM_PCT" -gt 85 ]; then
    alert "HIGH MEMORY: ${MEM_PCT}% used"
elif [ "$MEM_PCT" -gt 70 ]; then
    log "Memory usage elevated: ${MEM_PCT}%"
fi

# Check PM2 restart count
if command -v pm2 &>/dev/null; then
    RESTARTS=$(pm2 jlist 2>/dev/null | jq '.[0].pm2_env.restart_time // 0' 2>/dev/null || echo "0")
    if [ "$RESTARTS" -gt 50 ]; then
        alert "EXCESSIVE RESTARTS: $RESTARTS times - possible crash loop"
    elif [ "$RESTARTS" -gt 20 ]; then
        log "Warning: High restart count: $RESTARTS"
    fi
    
    # Check if PM2 process is running
    if ! pm2 list 2>/dev/null | grep -q "packattack.*online"; then
        alert "PM2 PROCESS DOWN: packattack not running"
    fi
fi

# Check database health via API
HEALTH_STATUS=$(curl -sf --max-time 5 http://localhost:3000/api/health 2>/dev/null || echo '{"status":"error"}')
if ! echo "$HEALTH_STATUS" | grep -q '"status":"healthy"'; then
    alert "HEALTH CHECK FAILED: $HEALTH_STATUS"
fi

# Check disk space
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%' 2>/dev/null || echo "0")
if [ "$DISK_PCT" -gt 90 ]; then
    alert "DISK SPACE CRITICAL: ${DISK_PCT}% used"
elif [ "$DISK_PCT" -gt 80 ]; then
    log "Warning: Disk space high: ${DISK_PCT}%"
fi

# Check for suspicious network connections to known C2 servers
C2_CONNECTIONS=$(netstat -tupn 2>/dev/null | grep "91.92.241.10" || true)
if [ -n "$C2_CONNECTIONS" ]; then
    alert "MALWARE C2 CONNECTION: Detected connection to 91.92.241.10"
    # Block the IP if not already blocked
    iptables -A OUTPUT -d 91.92.241.10 -j DROP 2>/dev/null || true
fi

# Check if ClamAV is running
if command -v clamdscan &>/dev/null; then
    if ! systemctl is-active --quiet clamav-daemon 2>/dev/null; then
        alert "CLAMAV DOWN: Malware protection not running"
    fi
fi

# Check if Fail2Ban is running
if ! systemctl is-active --quiet fail2ban 2>/dev/null; then
    alert "FAIL2BAN DOWN: Intrusion prevention not running"
fi

log "Monitoring check complete - Memory: ${MEM_PCT}%, Disk: ${DISK_PCT}%, Restarts: ${RESTARTS:-N/A}"
EOF

# Make the script executable
chmod +x /usr/local/bin/packattack-continuous-monitor

echo -e "${GREEN}✓ Continuous monitoring script created${NC}"

# Add to crontab (run every 2 minutes)
echo "Adding to crontab (runs every 2 minutes)..."
(crontab -l 2>/dev/null | grep -v packattack-continuous-monitor; echo "*/2 * * * * /usr/local/bin/packattack-continuous-monitor") | crontab -

echo -e "${GREEN}✓ Cron job configured${NC}"

# Create logrotate configuration
cat > /etc/logrotate.d/packattack-monitoring << 'EOF'
/var/log/packattack/security-monitor.log
/var/log/packattack/security-alerts.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF

echo -e "${GREEN}✓ Log rotation configured${NC}"

# Run once to test
echo "Running initial monitoring check..."
/usr/local/bin/packattack-continuous-monitor

echo ""
echo "=== CONTINUOUS MONITORING SETUP COMPLETE ==="
echo ""
echo "Monitoring will run every 2 minutes and check for:"
echo "  - Malware processes (OFHyIf, ZE8sNYuzb, etc.)"
echo "  - Executables in /dev/shm"
echo "  - High memory usage (>85%)"
echo "  - Excessive PM2 restarts (>50)"
echo "  - Application health status"
echo "  - Disk space (>90%)"
echo "  - Malware C2 connections"
echo "  - ClamAV and Fail2Ban status"
echo ""
echo "Logs:"
echo "  - Monitor log: /var/log/packattack/security-monitor.log"
echo "  - Alerts log: /var/log/packattack/security-alerts.log"
echo ""
echo "To view recent alerts:"
echo "  tail -f /var/log/packattack/security-alerts.log"
