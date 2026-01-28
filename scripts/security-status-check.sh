#!/bin/bash
#
# Pack-Attack Security Status Check
# Quick script to verify server security status
#
# Usage: sudo bash security-status-check.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "  Pack-Attack Security Status Check"
echo "  $(date)"
echo "=============================================="
echo ""

# Function to check status
check_status() {
    local name="$1"
    local check="$2"
    
    if eval "$check" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name"
        return 1
    fi
}

check_service() {
    local name="$1"
    if systemctl is-active --quiet "$name"; then
        echo -e "  ${GREEN}✓${NC} $name is running"
    else
        echo -e "  ${RED}✗${NC} $name is NOT running"
    fi
}

# ============================================
# Services Status
# ============================================
echo -e "${BLUE}[Services]${NC}"
check_service "nginx"
check_service "fail2ban"
check_service "auditd"
check_service "ufw"

# Check PM2/Node app
if pgrep -f "next-server" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Application is running"
else
    echo -e "  ${YELLOW}!${NC} Application may not be running"
fi

echo ""

# ============================================
# Firewall Status
# ============================================
echo -e "${BLUE}[Firewall]${NC}"
if ufw status | grep -q "Status: active"; then
    echo -e "  ${GREEN}✓${NC} UFW is active"
    
    RULES=$(ufw status | grep -E "^(22|80|443)" | wc -l)
    echo -e "  ${GREEN}✓${NC} $RULES ports allowed (22, 80, 443)"
else
    echo -e "  ${RED}✗${NC} UFW is NOT active"
fi

echo ""

# ============================================
# Fail2Ban Status
# ============================================
echo -e "${BLUE}[Fail2Ban]${NC}"
JAILS=$(fail2ban-client status 2>/dev/null | grep "Jail list" | cut -d: -f2 | tr ',' '\n' | wc -w)
echo -e "  ${GREEN}✓${NC} $JAILS jails active"

BANNED=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $NF}')
echo -e "  ${GREEN}✓${NC} $BANNED IPs banned (SSH)"

echo ""

# ============================================
# SSH Security
# ============================================
echo -e "${BLUE}[SSH Security]${NC}"
check_status "Password auth disabled" "grep -q '^PasswordAuthentication no' /etc/ssh/sshd_config"
check_status "Root login restricted" "grep -q '^PermitRootLogin prohibit-password' /etc/ssh/sshd_config"
check_status "Protocol 2 only" "grep -q '^Protocol 2' /etc/ssh/sshd_config"

echo ""

# ============================================
# SSL Certificate
# ============================================
echo -e "${BLUE}[SSL Certificate]${NC}"
if [ -f /etc/letsencrypt/live/pack-attack.de/fullchain.pem ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/pack-attack.de/fullchain.pem | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    
    if [ $DAYS_LEFT -gt 30 ]; then
        echo -e "  ${GREEN}✓${NC} Certificate valid for $DAYS_LEFT days"
    elif [ $DAYS_LEFT -gt 7 ]; then
        echo -e "  ${YELLOW}!${NC} Certificate expires in $DAYS_LEFT days"
    else
        echo -e "  ${RED}✗${NC} Certificate expires in $DAYS_LEFT days - RENEW NOW!"
    fi
else
    echo -e "  ${YELLOW}!${NC} Certificate not found"
fi

echo ""

# ============================================
# Security Tools
# ============================================
echo -e "${BLUE}[Security Tools]${NC}"
check_status "AIDE installed" "which aide"
check_status "RKHunter installed" "which rkhunter"
check_status "Lynis installed" "which lynis"
check_status "Auditd installed" "which auditctl"

echo ""

# ============================================
# Malware Check
# ============================================
echo -e "${BLUE}[Quick Malware Check]${NC}"

# Check /tmp for suspicious files
SUSP_TMP=$(find /tmp -type f -executable 2>/dev/null | wc -l)
if [ "$SUSP_TMP" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} No executables in /tmp"
else
    echo -e "  ${YELLOW}!${NC} $SUSP_TMP executable(s) in /tmp - investigate!"
fi

# Check for crypto miners
if pgrep -f "xmrig\|minerd\|cpuminer" > /dev/null 2>&1; then
    echo -e "  ${RED}✗${NC} Possible crypto miner detected!"
else
    echo -e "  ${GREEN}✓${NC} No crypto miners detected"
fi

# Check for suspicious processes
SUSP_PROC=$(ps aux | grep -iE '(kdevtmpfsi|kinsing|\.x$|lrt$|kok)' | grep -v grep | wc -l)
if [ "$SUSP_PROC" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} No suspicious processes"
else
    echo -e "  ${RED}✗${NC} $SUSP_PROC suspicious process(es) found!"
fi

echo ""

# ============================================
# Resource Usage
# ============================================
echo -e "${BLUE}[Resource Usage]${NC}"

# Disk usage
DISK=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK" -lt 80 ]; then
    echo -e "  ${GREEN}✓${NC} Disk usage: ${DISK}%"
elif [ "$DISK" -lt 90 ]; then
    echo -e "  ${YELLOW}!${NC} Disk usage: ${DISK}%"
else
    echo -e "  ${RED}✗${NC} Disk usage: ${DISK}% - CRITICAL!"
fi

# Memory usage
MEM=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM" -lt 80 ]; then
    echo -e "  ${GREEN}✓${NC} Memory usage: ${MEM}%"
elif [ "$MEM" -lt 95 ]; then
    echo -e "  ${YELLOW}!${NC} Memory usage: ${MEM}%"
else
    echo -e "  ${RED}✗${NC} Memory usage: ${MEM}% - CRITICAL!"
fi

echo ""

# ============================================
# Application Health
# ============================================
echo -e "${BLUE}[Application Health]${NC}"
HEALTH=$(curl -s --max-time 5 https://pack-attack.de/api/health 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

case "$STATUS" in
    "ok"|"healthy")
        echo -e "  ${GREEN}✓${NC} Application status: $STATUS"
        ;;
    "degraded")
        echo -e "  ${YELLOW}!${NC} Application status: $STATUS"
        ;;
    *)
        echo -e "  ${RED}✗${NC} Application status: $STATUS"
        ;;
esac

echo ""

# ============================================
# Recent Security Events
# ============================================
echo -e "${BLUE}[Recent Security Events]${NC}"

# Failed SSH attempts in last hour
FAILED_SSH=$(journalctl -u sshd --since "1 hour ago" 2>/dev/null | grep -c "Failed\|Invalid" || echo 0)
if [ "$FAILED_SSH" -lt 10 ]; then
    echo -e "  ${GREEN}✓${NC} Failed SSH attempts (1h): $FAILED_SSH"
else
    echo -e "  ${YELLOW}!${NC} Failed SSH attempts (1h): $FAILED_SSH"
fi

# Security alerts
if [ -f /var/log/packattack/security-alerts.log ]; then
    ALERTS=$(tail -20 /var/log/packattack/security-alerts.log 2>/dev/null | grep -c "ALERT" || echo 0)
    if [ "$ALERTS" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} No recent security alerts"
    else
        echo -e "  ${YELLOW}!${NC} $ALERTS security alerts - review logs!"
    fi
fi

echo ""
echo "=============================================="
echo "  Check Complete"
echo "=============================================="
echo ""
echo "For detailed analysis, run:"
echo "  lynis audit system"
echo ""
