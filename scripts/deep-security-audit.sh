#!/bin/bash
#
# Pack-Attack Deep Security Audit
# Comprehensive security analysis of code, infrastructure, and runtime
#
# Usage: sudo bash deep-security-audit.sh
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0
INFO=0

AUDIT_REPORT="/tmp/packattack-security-audit-$(date +%Y%m%d-%H%M%S).txt"

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1" | tee -a "$AUDIT_REPORT"
    ((CRITICAL++))
}

log_high() {
    echo -e "${RED}[HIGH]${NC} $1" | tee -a "$AUDIT_REPORT"
    ((HIGH++))
}

log_medium() {
    echo -e "${YELLOW}[MEDIUM]${NC} $1" | tee -a "$AUDIT_REPORT"
    ((MEDIUM++))
}

log_low() {
    echo -e "${YELLOW}[LOW]${NC} $1" | tee -a "$AUDIT_REPORT"
    ((LOW++))
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$AUDIT_REPORT"
    ((INFO++))
}

log_section() {
    echo "" | tee -a "$AUDIT_REPORT"
    echo -e "${CYAN}============================================${NC}" | tee -a "$AUDIT_REPORT"
    echo -e "${CYAN}$1${NC}" | tee -a "$AUDIT_REPORT"
    echo -e "${CYAN}============================================${NC}" | tee -a "$AUDIT_REPORT"
    echo "" | tee -a "$AUDIT_REPORT"
}

log_subsection() {
    echo "" | tee -a "$AUDIT_REPORT"
    echo -e "${BLUE}--- $1 ---${NC}" | tee -a "$AUDIT_REPORT"
}

# Header
clear
echo -e "${MAGENTA}" | tee -a "$AUDIT_REPORT"
echo "╔════════════════════════════════════════════════════════════╗" | tee -a "$AUDIT_REPORT"
echo "║       PACK-ATTACK DEEP SECURITY AUDIT                     ║" | tee -a "$AUDIT_REPORT"
echo "║       Comprehensive Security Analysis                      ║" | tee -a "$AUDIT_REPORT"
echo "╚════════════════════════════════════════════════════════════╝" | tee -a "$AUDIT_REPORT"
echo -e "${NC}" | tee -a "$AUDIT_REPORT"
echo "Date: $(date)" | tee -a "$AUDIT_REPORT"
echo "Host: $(hostname)" | tee -a "$AUDIT_REPORT"
echo "User: $(whoami)" | tee -a "$AUDIT_REPORT"
echo "" | tee -a "$AUDIT_REPORT"

# ============================================
# 1. CODE SECURITY AUDIT
# ============================================
log_section "1. CODE SECURITY AUDIT"

log_subsection "1.1 Dependency Vulnerabilities"

# Check if we're in the right directory
if [ -f "package.json" ]; then
    APP_DIR="."
elif [ -f "Pack-Attack/package.json" ]; then
    APP_DIR="Pack-Attack"
elif [ -f "/var/www/packattack/app/package.json" ]; then
    APP_DIR="/var/www/packattack/app"
else
    log_critical "Cannot find package.json - run from project root"
    exit 1
fi

cd "$APP_DIR"

# npm audit
if command -v npm &> /dev/null; then
    echo "Running npm audit..." | tee -a "$AUDIT_REPORT"
    NPM_AUDIT=$(npm audit --json 2>/dev/null || echo '{}')
    
    CRITICAL_VULN=$(echo "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    HIGH_VULN=$(echo "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    MODERATE_VULN=$(echo "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")
    LOW_VULN=$(echo "$NPM_AUDIT" | jq -r '.metadata.vulnerabilities.low // 0' 2>/dev/null || echo "0")
    
    if [ "$CRITICAL_VULN" -gt 0 ]; then
        log_critical "Found $CRITICAL_VULN critical npm vulnerabilities - RUN 'npm audit fix' IMMEDIATELY"
    fi
    
    if [ "$HIGH_VULN" -gt 0 ]; then
        log_high "Found $HIGH_VULN high npm vulnerabilities - Update packages ASAP"
    fi
    
    if [ "$MODERATE_VULN" -gt 0 ]; then
        log_medium "Found $MODERATE_VULN moderate npm vulnerabilities"
    fi
    
    if [ "$LOW_VULN" -gt 0 ]; then
        log_low "Found $LOW_VULN low npm vulnerabilities"
    fi
    
    if [ "$CRITICAL_VULN" -eq 0 ] && [ "$HIGH_VULN" -eq 0 ] && [ "$MODERATE_VULN" -eq 0 ]; then
        log_info "No critical/high/moderate npm vulnerabilities detected"
    fi
fi

log_subsection "1.2 Next.js CVE Check"

# Check Next.js version for CVE-2025-66478
if [ -f "package.json" ]; then
    NEXTJS_VERSION=$(jq -r '.dependencies.next // "0.0.0"' package.json)
    
    # Extract major.minor.patch
    MAJOR=$(echo "$NEXTJS_VERSION" | cut -d. -f1)
    MINOR=$(echo "$NEXTJS_VERSION" | cut -d. -f2)
    
    if [ "$MAJOR" -lt 16 ] || ([ "$MAJOR" -eq 16 ] && [ "$MINOR" -lt 1 ]); then
        log_critical "Next.js $NEXTJS_VERSION vulnerable to CVE-2025-66478 RCE - UPGRADE TO >= 16.1.6"
    else
        log_info "Next.js $NEXTJS_VERSION - CVE-2025-66478 patched"
    fi
fi

log_subsection "1.3 Hardcoded Secrets Scan"

# Scan for common secret patterns
echo "Scanning for hardcoded secrets..." | tee -a "$AUDIT_REPORT"

SECRETS_FOUND=0

# Check for API keys, tokens, passwords in code
if grep -rE "(password|secret|api_key|token|private_key).*=.*['\"]([A-Za-z0-9+/=]{20,}|[a-z0-9]{32,})['\"]" \
    src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "NEXTAUTH_SECRET"; then
    log_high "Potential hardcoded secrets found in source code"
    ((SECRETS_FOUND++))
fi

# Check for AWS keys
if grep -rE "AKIA[0-9A-Z]{16}" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    log_critical "AWS Access Key found in code - REVOKE IMMEDIATELY"
    ((SECRETS_FOUND++))
fi

# Check for private keys
if grep -rE "-----BEGIN.*PRIVATE KEY-----" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    log_critical "Private key found in code - REMOVE IMMEDIATELY"
    ((SECRETS_FOUND++))
fi

if [ "$SECRETS_FOUND" -eq 0 ]; then
    log_info "No obvious hardcoded secrets detected"
fi

log_subsection "1.4 Security Best Practices in Code"

# Check for SQL injection risks
if grep -rE "prisma\.\$executeRaw\(|prisma\.\$queryRaw\(" src/ --include="*.ts" 2>/dev/null | grep -v '\$executeRaw`' | grep -v '\$queryRaw`'; then
    log_high "Potential SQL injection risk - use tagged templates with Prisma raw queries"
fi

# Check for eval usage
if grep -rE "\beval\(" src/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null; then
    log_high "eval() usage detected - high security risk"
fi

# Check for dangerouslySetInnerHTML
DANGEROUS_HTML=$(grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l)
if [ "$DANGEROUS_HTML" -gt 0 ]; then
    log_medium "Found $DANGEROUS_HTML uses of dangerouslySetInnerHTML - verify XSS protection"
fi

# Check for authentication on API routes
echo "Checking API route authentication..." | tee -a "$AUDIT_REPORT"
if [ -d "src/app/api" ]; then
    UNPROTECTED_ROUTES=$(find src/app/api -name "route.ts" -exec grep -L "getServerSession\|auth\(" {} \; 2>/dev/null | wc -l)
    if [ "$UNPROTECTED_ROUTES" -gt 5 ]; then
        log_medium "$UNPROTECTED_ROUTES API routes may lack authentication - verify access control"
    fi
fi

log_info "Code security audit completed"

# ============================================
# 2. CONFIGURATION SECURITY
# ============================================
log_section "2. CONFIGURATION SECURITY"

log_subsection "2.1 Environment Variables"

# Check for .env files with wrong permissions
if [ -f ".env" ]; then
    ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null || echo "???")
    if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
        log_high ".env file permissions: $ENV_PERMS (should be 600)"
    else
        log_info ".env file permissions secure: $ENV_PERMS"
    fi
fi

if [ -f "/var/www/packattack/app/.env" ]; then
    ENV_PERMS=$(stat -c "%a" /var/www/packattack/app/.env 2>/dev/null || echo "???")
    if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
        log_high "Production .env permissions: $ENV_PERMS (should be 600)"
    else
        log_info "Production .env permissions secure: $ENV_PERMS"
    fi
fi

log_subsection "2.2 Database Security"

# Check DATABASE_URL for security features
if [ -f ".env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
    
    if [ -n "$DATABASE_URL" ]; then
        if ! echo "$DATABASE_URL" | grep -q "sslmode=require"; then
            log_high "DATABASE_URL missing sslmode=require - database connection not encrypted"
        else
            log_info "Database SSL encryption enabled"
        fi
        
        if ! echo "$DATABASE_URL" | grep -q "connection_limit"; then
            log_medium "DATABASE_URL missing connection_limit - may cause connection pool issues"
        else
            log_info "Database connection pooling configured"
        fi
    fi
fi

log_subsection "2.3 NextAuth Configuration"

if [ -f ".env" ]; then
    NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        log_critical "NEXTAUTH_SECRET not set - authentication completely broken"
    elif [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
        log_high "NEXTAUTH_SECRET too short (${#NEXTAUTH_SECRET} chars) - should be >= 32 characters"
    else
        log_info "NEXTAUTH_SECRET length adequate (${#NEXTAUTH_SECRET} chars)"
    fi
    
    NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
    if [ -n "$NEXTAUTH_URL" ]; then
        if echo "$NEXTAUTH_URL" | grep -q "^http://"; then
            log_medium "NEXTAUTH_URL uses HTTP - should use HTTPS in production"
        else
            log_info "NEXTAUTH_URL uses HTTPS"
        fi
    fi
fi

log_info "Configuration security audit completed"

# ============================================
# 3. INFRASTRUCTURE SECURITY (Server-side only)
# ============================================
log_section "3. INFRASTRUCTURE SECURITY"

# Check if we're on a server (has systemctl, ufw, etc.)
if command -v systemctl &> /dev/null && [ -f "/etc/os-release" ]; then
    log_subsection "3.1 Firewall Status"
    
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(ufw status 2>/dev/null | head -1)
        if echo "$UFW_STATUS" | grep -q "Status: active"; then
            log_info "UFW firewall is active"
            
            # Check for only essential ports
            OPEN_PORTS=$(ufw status numbered 2>/dev/null | grep ALLOW | wc -l)
            if [ "$OPEN_PORTS" -gt 6 ]; then
                log_medium "$OPEN_PORTS firewall rules - verify all are necessary"
            fi
        else
            log_critical "UFW firewall is INACTIVE - server unprotected"
        fi
    else
        log_medium "UFW not installed - using iptables or no firewall"
    fi
    
    log_subsection "3.2 SSH Hardening"
    
    if [ -f "/etc/ssh/sshd_config" ]; then
        # Check for root login
        if grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config 2>/dev/null; then
            log_high "SSH allows root login - should be 'prohibit-password' or 'no'"
        else
            log_info "SSH root login properly restricted"
        fi
        
        # Check for password auth
        if grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config 2>/dev/null; then
            log_high "SSH allows password authentication - should use keys only"
        else
            log_info "SSH password authentication disabled"
        fi
        
        # Check for old protocol
        if grep -q "^Protocol 1" /etc/ssh/sshd_config 2>/dev/null; then
            log_critical "SSH using old Protocol 1 - critical vulnerability"
        fi
    fi
    
    log_subsection "3.3 Security Services"
    
    # Fail2Ban
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        log_info "Fail2Ban is active"
        
        # Check for bans
        if command -v fail2ban-client &> /dev/null; then
            TOTAL_BANS=$(fail2ban-client status 2>/dev/null | grep "Currently banned" | awk '{sum+=$NF} END {print sum}' || echo "0")
            if [ "$TOTAL_BANS" -gt 0 ]; then
                log_info "Fail2Ban has blocked $TOTAL_BANS IPs"
            fi
        fi
    else
        log_high "Fail2Ban not running - no brute force protection"
    fi
    
    # ClamAV
    if systemctl is-active --quiet clamav-daemon 2>/dev/null; then
        log_info "ClamAV malware scanner is active"
    else
        log_medium "ClamAV not running - no malware scanning"
    fi
    
    # Auditd
    if systemctl is-active --quiet auditd 2>/dev/null; then
        log_info "Audit daemon is active"
    else
        log_medium "Audit daemon not running - limited intrusion detection"
    fi
    
    log_subsection "3.4 System Updates"
    
    if command -v apt-get &> /dev/null; then
        echo "Checking for available security updates..." | tee -a "$AUDIT_REPORT"
        UPDATES=$(apt-get -s upgrade 2>/dev/null | grep "^Inst" | wc -l || echo "?")
        if [ "$UPDATES" != "?" ] && [ "$UPDATES" -gt 0 ]; then
            log_medium "$UPDATES system packages need updating"
        elif [ "$UPDATES" = "0" ]; then
            log_info "System is up to date"
        fi
    fi
    
    log_subsection "3.5 Running Services"
    
    # Check for unnecessary services
    UNNECESSARY_SERVICES=("telnet" "ftp" "rsh" "rlogin" "cups" "avahi-daemon" "bluetooth")
    for service in "${UNNECESSARY_SERVICES[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log_medium "Unnecessary service running: $service"
        fi
    done
    
else
    log_info "Not on a Linux server - skipping infrastructure checks"
fi

# ============================================
# 4. RUNTIME SECURITY
# ============================================
log_section "4. RUNTIME SECURITY"

log_subsection "4.1 Malware Detection"

# Check for known malware processes
echo "Scanning for known malware processes..." | tee -a "$AUDIT_REPORT"
MALWARE_PROCS=$(ps aux 2>/dev/null | grep -iE '(xmrig|minerd|cpuminer|kdevtmpfsi|kinsing|OFHyIf|ZE8sNYuzb|\.x$|lrt$|ldx$)' | grep -v grep || true)
if [ -n "$MALWARE_PROCS" ]; then
    log_critical "MALWARE DETECTED - Suspicious processes running:"
    echo "$MALWARE_PROCS" | tee -a "$AUDIT_REPORT"
else
    log_info "No known malware processes detected"
fi

# Check /dev/shm for executables (common malware location)
if [ -d "/dev/shm" ]; then
    SHMALWARE=$(find /dev/shm -type f -executable 2>/dev/null || true)
    if [ -n "$SHMALWARE" ]; then
        log_critical "EXECUTABLES IN /dev/shm (common malware location):"
        echo "$SHMALWARE" | tee -a "$AUDIT_REPORT"
    else
        log_info "/dev/shm is clean"
    fi
fi

log_subsection "4.2 Network Security"

# Check for connections to suspicious IPs
if command -v ss &> /dev/null; then
    echo "Checking network connections..." | tee -a "$AUDIT_REPORT"
    
    # Known malware C2 server
    if ss -tn 2>/dev/null | grep -q "91.92.241.10"; then
        log_critical "ACTIVE CONNECTION TO KNOWN MALWARE C2 SERVER: 91.92.241.10"
    fi
    
    # Check for unusual high ports
    HIGH_PORT_CONNS=$(ss -tn 2>/dev/null | grep ESTAB | awk '{print $5}' | grep -E ":[5-9][0-9]{4}" | wc -l || echo "0")
    if [ "$HIGH_PORT_CONNS" -gt 10 ]; then
        log_medium "$HIGH_PORT_CONNS connections to unusual high ports - investigate"
    fi
fi

# Check if malware C2 IP is blocked
if command -v iptables &> /dev/null; then
    if iptables -L -n 2>/dev/null | grep -q "91.92.241.10"; then
        log_info "Malware C2 IP (91.92.241.10) is blocked"
    else
        log_medium "Malware C2 IP not in iptables - consider blocking 91.92.241.10"
    fi
fi

log_subsection "4.3 Application Status"

# Check PM2 if available
if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q "packattack.*online"; then
        log_info "PM2 application is online"
        
        # Check restart count
        RESTARTS=$(pm2 jlist 2>/dev/null | jq '.[0].pm2_env.restart_time // 0' || echo "0")
        if [ "$RESTARTS" -gt 50 ]; then
            log_high "High PM2 restart count: $RESTARTS - application unstable"
        elif [ "$RESTARTS" -gt 20 ]; then
            log_medium "Moderate PM2 restart count: $RESTARTS - investigate"
        else
            log_info "PM2 restart count normal: $RESTARTS"
        fi
    else
        log_high "PM2 application not online - check 'pm2 status'"
    fi
fi

log_subsection "4.4 Resource Usage"

# Memory
if command -v free &> /dev/null; then
    MEM_PCT=$(free 2>/dev/null | grep Mem | awk '{print int(($3/$2) * 100)}' || echo "0")
    if [ "$MEM_PCT" -gt 90 ]; then
        log_high "Memory usage critical: ${MEM_PCT}%"
    elif [ "$MEM_PCT" -gt 80 ]; then
        log_medium "Memory usage high: ${MEM_PCT}%"
    else
        log_info "Memory usage normal: ${MEM_PCT}%"
    fi
fi

# Disk space
if command -v df &> /dev/null; then
    DISK_PCT=$(df -h / 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%' || echo "0")
    if [ "$DISK_PCT" -gt 90 ]; then
        log_critical "Disk space critical: ${DISK_PCT}%"
    elif [ "$DISK_PCT" -gt 80 ]; then
        log_high "Disk space high: ${DISK_PCT}%"
    else
        log_info "Disk space normal: ${DISK_PCT}%"
    fi
fi

log_info "Runtime security audit completed"

# ============================================
# 5. APPLICATION SECURITY
# ============================================
log_section "5. APPLICATION SECURITY"

log_subsection "5.1 Admin Access Control"

# Check if there are admin users in database (if we can access it)
if command -v psql &> /dev/null && [ -f ".env" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
    if [ -n "$DATABASE_URL" ]; then
        ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"User\" WHERE role = 'ADMIN'" 2>/dev/null || echo "?")
        if [ "$ADMIN_COUNT" = "0" ]; then
            log_high "No admin users found in database - cannot manage application"
        elif [ "$ADMIN_COUNT" = "?" ]; then
            log_info "Cannot check admin users (database not accessible from here)"
        else
            log_info "Admin users configured: $ADMIN_COUNT"
        fi
    fi
fi

log_subsection "5.2 Health Endpoint"

# Try to check health endpoint
if command -v curl &> /dev/null; then
    # Try localhost first
    HEALTH_LOCAL=$(curl -s --max-time 5 http://localhost:3000/api/health 2>/dev/null || echo "")
    if [ -n "$HEALTH_LOCAL" ] && echo "$HEALTH_LOCAL" | grep -q "healthy"; then
        log_info "Application health check: OK (localhost)"
    else
        # Try production domain if we know it
        if [ -f ".env" ]; then
            DOMAIN=$(grep "^DOMAIN=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
            if [ -n "$DOMAIN" ]; then
                HEALTH_PROD=$(curl -s --max-time 5 "https://$DOMAIN/api/health" 2>/dev/null || echo "")
                if echo "$HEALTH_PROD" | grep -q "healthy"; then
                    log_info "Application health check: OK (production)"
                else
                    log_high "Application health check FAILED - may be down"
                fi
            fi
        fi
    fi
fi

log_subsection "5.3 SSL/TLS Configuration"

if [ -f ".env" ]; then
    DOMAIN=$(grep "^DOMAIN=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
    
    if [ -n "$DOMAIN" ] && command -v openssl &> /dev/null; then
        echo "Checking SSL certificate for $DOMAIN..." | tee -a "$AUDIT_REPORT"
        
        CERT_INFO=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || true)
        
        if [ -n "$CERT_INFO" ]; then
            EXPIRY=$(echo "$CERT_INFO" | grep "notAfter" | cut -d= -f2)
            DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null || echo "0") - $(date +%s)) / 86400 ))
            
            if [ "$DAYS_LEFT" -lt 7 ]; then
                log_critical "SSL certificate expires in $DAYS_LEFT days!"
            elif [ "$DAYS_LEFT" -lt 30 ]; then
                log_high "SSL certificate expires in $DAYS_LEFT days"
            else
                log_info "SSL certificate valid for $DAYS_LEFT days"
            fi
        fi
    fi
fi

log_info "Application security audit completed"

# ============================================
# 6. COMPLIANCE & BEST PRACTICES
# ============================================
log_section "6. COMPLIANCE & BEST PRACTICES"

log_subsection "6.1 OWASP Top 10 Coverage"

# A01:2021 - Broken Access Control
if grep -rq "getServerSession" src/app/api 2>/dev/null; then
    log_info "Authentication checks implemented in API routes"
else
    log_medium "Limited authentication checks in API routes - verify access control"
fi

# A02:2021 - Cryptographic Failures
if [ -f ".env" ] && grep -q "sslmode=require" .env 2>/dev/null; then
    log_info "Database encryption enforced"
fi

# A03:2021 - Injection
if grep -rq "zod" src/app/api 2>/dev/null; then
    log_info "Input validation with Zod detected"
else
    log_medium "No obvious input validation library - verify all inputs are validated"
fi

# A05:2021 - Security Misconfiguration
if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    if grep -q "headers()" next.config.* 2>/dev/null; then
        log_info "Security headers configured in Next.js"
    else
        log_medium "No security headers in Next.js config - verify Nginx adds them"
    fi
fi

# A07:2021 - Identification and Authentication Failures
if grep -rq "next-auth" package.json 2>/dev/null; then
    log_info "NextAuth authentication framework in use"
fi

log_subsection "6.2 File Permissions"

# Check for world-writable files
if [ -d "src" ]; then
    WORLD_WRITE=$(find src -type f -perm -002 2>/dev/null | wc -l || echo "0")
    if [ "$WORLD_WRITE" -gt 0 ]; then
        log_medium "$WORLD_WRITE world-writable files found in src/"
    else
        log_info "No world-writable files in src/"
    fi
fi

log_subsection "6.3 Backup Verification"

# Check for backup directory
if [ -d "/var/backups/packattack" ]; then
    BACKUP_COUNT=$(ls -1 /var/backups/packattack/*.tar.gz 2>/dev/null | wc -l || echo "0")
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t /var/backups/packattack/*.tar.gz 2>/dev/null | head -1)
        BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || echo "0")) / 86400 ))
        
        if [ "$BACKUP_AGE" -gt 7 ]; then
            log_high "Latest backup is $BACKUP_AGE days old - backups may not be running"
        else
            log_info "Backups available: $BACKUP_COUNT (latest: $BACKUP_AGE days old)"
        fi
    else
        log_high "No backups found in /var/backups/packattack"
    fi
else
    log_info "Backup directory not present (may be on development machine)"
fi

log_info "Compliance audit completed"

# ============================================
# SUMMARY
# ============================================
log_section "AUDIT SUMMARY"

echo "" | tee -a "$AUDIT_REPORT"
echo "Findings Summary:" | tee -a "$AUDIT_REPORT"
echo -e "${RED}  Critical Issues: $CRITICAL${NC}" | tee -a "$AUDIT_REPORT"
echo -e "${RED}  High Severity:   $HIGH${NC}" | tee -a "$AUDIT_REPORT"
echo -e "${YELLOW}  Medium Severity: $MEDIUM${NC}" | tee -a "$AUDIT_REPORT"
echo -e "${YELLOW}  Low Severity:    $LOW${NC}" | tee -a "$AUDIT_REPORT"
echo -e "${GREEN}  Info/Passed:     $INFO${NC}" | tee -a "$AUDIT_REPORT"
echo "" | tee -a "$AUDIT_REPORT"

# Calculate security score
TOTAL_ISSUES=$((CRITICAL * 10 + HIGH * 5 + MEDIUM * 2 + LOW * 1))
if [ "$TOTAL_ISSUES" -eq 0 ]; then
    SCORE=100
else
    SCORE=$((100 - TOTAL_ISSUES))
    if [ "$SCORE" -lt 0 ]; then
        SCORE=0
    fi
fi

echo "Security Score: $SCORE/100" | tee -a "$AUDIT_REPORT"
echo "" | tee -a "$AUDIT_REPORT"

if [ "$CRITICAL" -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED${NC}" | tee -a "$AUDIT_REPORT"
    EXIT_CODE=2
elif [ "$HIGH" -gt 0 ]; then
    echo -e "${RED}⚠️  HIGH SEVERITY ISSUES - ADDRESS WITHIN 24 HOURS${NC}" | tee -a "$AUDIT_REPORT"
    EXIT_CODE=1
elif [ "$MEDIUM" -gt 0 ]; then
    echo -e "${YELLOW}ℹ️  MEDIUM SEVERITY ISSUES - ADDRESS WITHIN 1 WEEK${NC}" | tee -a "$AUDIT_REPORT"
    EXIT_CODE=0
else
    echo -e "${GREEN}✅ NO CRITICAL/HIGH ISSUES DETECTED${NC}" | tee -a "$AUDIT_REPORT"
    EXIT_CODE=0
fi

echo "" | tee -a "$AUDIT_REPORT"
echo "Full report saved to: $AUDIT_REPORT" | tee -a "$AUDIT_REPORT"
echo "" | tee -a "$AUDIT_REPORT"

exit $EXIT_CODE
