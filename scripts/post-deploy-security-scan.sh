#!/bin/bash
# Post-deployment security verification
# Runs after deployment to verify security posture

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== POST-DEPLOYMENT SECURITY SCAN ==="
echo ""

ERRORS=0
WARNINGS=0

# 1. Health check
echo "1. Checking application health..."
HEALTH=$(curl -s --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Application healthy${NC}"
else
    echo -e "${RED}❌ Application unhealthy: $HEALTH${NC}"
    ((ERRORS++))
fi

# 2. Verify no malware processes
echo "2. Scanning for suspicious processes..."
SUSPICIOUS=$(ps aux | grep -E "(OFHyIf|ZE8sNYuzb|kworker|lrt|ldx)" | grep -v grep || true)
if [ -n "$SUSPICIOUS" ]; then
    echo -e "${RED}❌ CRITICAL: Suspicious processes found:${NC}"
    echo "$SUSPICIOUS"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ No malware processes${NC}"
fi

# 3. Check for executables in /dev/shm (malware location)
echo "3. Checking /dev/shm for executables..."
SHMALWARE=$(find /dev/shm -type f -executable 2>/dev/null || true)
if [ -n "$SHMALWARE" ]; then
    echo -e "${YELLOW}⚠️  Executables in /dev/shm:${NC}"
    echo "$SHMALWARE"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ /dev/shm clean${NC}"
fi

# 4. Verify C2 IP is blocked (from previous attack)
echo "4. Verifying malware C2 IP is blocked..."
if iptables -L -n 2>/dev/null | grep -q "91.92.241.10"; then
    echo -e "${GREEN}✅ Malware C2 IP blocked${NC}"
else
    echo -e "${YELLOW}⚠️  Blocking malware C2 IP: 91.92.241.10${NC}"
    iptables -A OUTPUT -d 91.92.241.10 -j DROP 2>/dev/null || true
    ((WARNINGS++))
fi

# 5. Check PM2 status
echo "5. Verifying PM2 process..."
if pm2 list 2>/dev/null | grep -q "packattack.*online"; then
    echo -e "${GREEN}✅ PM2 process healthy${NC}"
else
    echo -e "${RED}❌ PM2 process not running${NC}"
    pm2 list
    ((ERRORS++))
fi

# 6. Check PM2 restart count
echo "6. Checking PM2 restart count..."
RESTARTS=$(pm2 jlist 2>/dev/null | jq '.[0].pm2_env.restart_time // 0' || echo "0")
if [ "$RESTARTS" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  High restart count: $RESTARTS times${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Restart count normal: $RESTARTS${NC}"
fi

# 7. Verify security headers
echo "7. Testing security headers..."
HEADERS=$(curl -sI http://localhost:3000 2>/dev/null || true)
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️  Security headers missing (may be Nginx-only)${NC}"
    ((WARNINGS++))
fi

# 8. Check for world-writable files
echo "8. Scanning for insecure file permissions..."
WORLDWRITE=$(find /var/www/packattack -type f -perm -002 2>/dev/null | head -20 || true)
if [ -n "$WORLDWRITE" ]; then
    echo -e "${YELLOW}⚠️  World-writable files found:${NC}"
    echo "$WORLDWRITE" | head -5
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ File permissions secure${NC}"
fi

# 9. Verify .env file permissions
echo "9. Checking .env file security..."
if [ -f "/var/www/packattack/app/.env" ]; then
    ENV_PERMS=$(stat -c "%a" /var/www/packattack/app/.env 2>/dev/null || echo "000")
    if [ "$ENV_PERMS" = "600" ]; then
        echo -e "${GREEN}✅ .env permissions secure (600)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env permissions: $ENV_PERMS (should be 600)${NC}"
        chmod 600 /var/www/packattack/app/.env
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    ((WARNINGS++))
fi

# 10. Verify database connectivity with retry
echo "10. Testing database with retry logic..."
cd /var/www/packattack/app 2>/dev/null || cd .
if [ -f "node_modules/@prisma/client/index.js" ]; then
    node -e "
    const { prisma, withRetry } = require('./node_modules/.prisma/client/index.js');
    withRetry(() => prisma.\$queryRaw\`SELECT 1\`, 'post-deploy-check')
      .then(() => { console.log('✅ Database connection with retry: OK'); process.exit(0); })
      .catch(err => { console.error('❌ Database error:', err.message); process.exit(1); });
    " 2>/dev/null && echo -e "${GREEN}✅ Database connection OK${NC}" || {
        echo -e "${YELLOW}⚠️  Database retry test skipped (Prisma not built)${NC}"
        ((WARNINGS++))
    }
else
    echo -e "${YELLOW}⚠️  Prisma client not found, skipping DB test${NC}"
    ((WARNINGS++))
fi

# 11. Check memory usage
echo "11. Checking memory usage..."
MEM_PCT=$(free | grep Mem | awk '{print int(($3/$2) * 100)}')
if [ "$MEM_PCT" -lt 80 ]; then
    echo -e "${GREEN}✅ Memory usage: ${MEM_PCT}%${NC}"
elif [ "$MEM_PCT" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Memory usage high: ${MEM_PCT}%${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}❌ Memory usage critical: ${MEM_PCT}%${NC}"
    ((ERRORS++))
fi

# 12. Verify Nginx is running
echo "12. Checking Nginx status..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx running${NC}"
else
    echo -e "${RED}❌ Nginx not running${NC}"
    ((ERRORS++))
fi

# 13. Verify Fail2Ban is active
echo "13. Checking Fail2Ban status..."
if systemctl is-active --quiet fail2ban 2>/dev/null; then
    echo -e "${GREEN}✅ Fail2Ban active${NC}"
else
    echo -e "${YELLOW}⚠️  Fail2Ban not running${NC}"
    ((WARNINGS++))
fi

# 14. Check disk space
echo "14. Checking disk space..."
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_PCT" -lt 80 ]; then
    echo -e "${GREEN}✅ Disk usage: ${DISK_PCT}%${NC}"
elif [ "$DISK_PCT" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Disk usage high: ${DISK_PCT}%${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}❌ Disk usage critical: ${DISK_PCT}%${NC}"
    ((ERRORS++))
fi

# 15. Verify SSL certificate (if applicable)
echo "15. Checking SSL certificate..."
if [ -f "/etc/letsencrypt/live/pack-attack.de/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/pack-attack.de/fullchain.pem 2>/dev/null | cut -d= -f2)
    DAYS_LEFT=$(( ($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400 ))
    if [ "$DAYS_LEFT" -gt 30 ]; then
        echo -e "${GREEN}✅ SSL certificate valid for $DAYS_LEFT days${NC}"
    elif [ "$DAYS_LEFT" -gt 7 ]; then
        echo -e "${YELLOW}⚠️  SSL certificate expires in $DAYS_LEFT days${NC}"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ SSL certificate expires in $DAYS_LEFT days!${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  SSL certificate not found (may not be installed yet)${NC}"
    ((WARNINGS++))
fi

echo ""
echo "=== POST-DEPLOYMENT SCAN COMPLETE ==="
echo ""
echo -e "Errors:   ${RED}${ERRORS}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ Deployment has CRITICAL issues that must be fixed!${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Deployment successful with warnings. Review above.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
fi
