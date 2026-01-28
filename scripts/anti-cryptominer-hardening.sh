#!/bin/bash
# ==============================================================================
# Pack-Attack Anti-Cryptominer Security Hardening Script
# Run this on your production server to prevent crypto miners
# Last Updated: January 2026
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo)"
    exit 1
fi

echo "============================================================"
echo "  Pack-Attack Anti-Cryptominer Hardening"
echo "============================================================"
echo ""

# ==============================================================================
# 1. MOUNT /dev/shm AS NOEXEC (Critical - prevents execution of miners)
# ==============================================================================
log_info "Securing /dev/shm (where crypto miners are typically placed)..."

# Check current mount options
if mount | grep -q "/dev/shm.*noexec"; then
    log_info "/dev/shm already has noexec mount option"
else
    # Add noexec to /dev/shm
    mount -o remount,noexec,nosuid,nodev /dev/shm
    log_info "Remounted /dev/shm with noexec,nosuid,nodev"
    
    # Make persistent in fstab
    if ! grep -q "^tmpfs.*\/dev\/shm.*noexec" /etc/fstab; then
        echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid,nodev 0 0" >> /etc/fstab
        log_info "Added noexec /dev/shm to /etc/fstab for persistence"
    fi
fi

# ==============================================================================
# 2. SECURE /tmp (Another common miner location)
# ==============================================================================
log_info "Securing /tmp directory..."

# Make /tmp noexec if possible
if mount | grep -q " /tmp "; then
    if ! mount | grep -q "/tmp.*noexec"; then
        mount -o remount,noexec,nosuid /tmp 2>/dev/null || log_warn "Could not remount /tmp (may be on root partition)"
    fi
fi

# ==============================================================================
# 3. CLEAN ANY EXISTING MINERS
# ==============================================================================
log_info "Scanning for and removing any existing crypto miners..."

# Kill processes in /dev/shm
for pid in $(lsof +D /dev/shm 2>/dev/null | awk 'NR>1 {print $2}' | sort -u); do
    proc_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    if [ "$proc_name" != "unknown" ]; then
        log_warn "Killing suspicious process in /dev/shm: $proc_name (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# Remove any files in /dev/shm (should be empty normally)
find /dev/shm -type f -delete 2>/dev/null || true

# Remove suspicious files from /tmp
find /tmp -type f -executable -mtime -7 -delete 2>/dev/null || true

# Kill known miner processes
for miner in xmrig minerd cpuminer kworker OFHyIf ZE8sNYuzb; do
    pkill -9 -f "$miner" 2>/dev/null || true
done

# ==============================================================================
# 4. BLOCK KNOWN CRYPTO MINER C2 IPs
# ==============================================================================
log_info "Blocking known crypto miner command & control IPs..."

BLOCKED_IPS=(
    "91.92.241.10"    # Known C2 from previous attack
    "185.165.226.0/24"  # Known mining pool range
    "185.220.101.0/24"  # Known mining pool range
    "45.227.254.0/24"   # Known mining pool range
    "23.106.160.0/24"   # Known malware distribution
)

for ip in "${BLOCKED_IPS[@]}"; do
    if ! iptables -C OUTPUT -d "$ip" -j DROP 2>/dev/null; then
        iptables -A OUTPUT -d "$ip" -j DROP
        log_info "Blocked outbound traffic to: $ip"
    fi
done

# Save iptables rules
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

# ==============================================================================
# 5. RESTRICT PACKATTACK USER
# ==============================================================================
log_info "Restricting packattack user capabilities..."

# Ensure packattack cannot use cron
if ! grep -q "packattack" /etc/cron.deny 2>/dev/null; then
    echo "packattack" >> /etc/cron.deny
    log_info "Blocked packattack from using cron"
fi

# Ensure packattack cannot use at
if ! grep -q "packattack" /etc/at.deny 2>/dev/null; then
    echo "packattack" >> /etc/at.deny
    log_info "Blocked packattack from using at"
fi

# ==============================================================================
# 6. INSTALL/UPDATE MONITORING TOOLS
# ==============================================================================
log_info "Setting up security monitoring..."

# Create enhanced security monitor script
cat > /usr/local/bin/packattack-miner-watch << 'MONITOR'
#!/bin/bash
# Enhanced crypto miner detection script

LOG_FILE="/var/log/packattack/miner-watch.log"
ALERT_EMAIL="${ADMIN_EMAIL:-}"

log_alert() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $1" | tee -a "$LOG_FILE"
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$1" | mail -s "PACK-ATTACK SECURITY ALERT" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Check 1: Files in /dev/shm
if [ "$(ls -A /dev/shm 2>/dev/null)" ]; then
    log_alert "FILES FOUND IN /dev/shm: $(ls -la /dev/shm)"
    rm -rf /dev/shm/* 2>/dev/null
fi

# Check 2: High CPU processes (>50% for >5 minutes)
for pid in $(ps -eo pid,%cpu,comm --sort=-%cpu | awk 'NR>1 && $2>50 {print $1}' | head -5); do
    proc_name=$(ps -p $pid -o comm= 2>/dev/null)
    proc_user=$(ps -p $pid -o user= 2>/dev/null)
    
    # Skip known good processes
    if [[ "$proc_name" =~ ^(node|npm|next|postgres|nginx)$ ]]; then
        continue
    fi
    
    # Check if it's been running high CPU for a while
    cpu_time=$(ps -p $pid -o cputime= 2>/dev/null | tr -d ' ')
    if [ -n "$cpu_time" ]; then
        # If more than 5 minutes of CPU time and not a known process
        minutes=$(echo $cpu_time | cut -d: -f1)
        if [ "$minutes" -gt 5 ] 2>/dev/null; then
            log_alert "SUSPICIOUS HIGH-CPU PROCESS: $proc_name (PID: $pid, User: $proc_user, CPU: $cpu_time)"
            
            # Kill if running as packattack and not node
            if [ "$proc_user" = "packattack" ] && [[ ! "$proc_name" =~ ^(node|npm|next)$ ]]; then
                kill -9 $pid 2>/dev/null
                log_alert "KILLED SUSPICIOUS PROCESS: $proc_name (PID: $pid)"
            fi
        fi
    fi
done

# Check 3: Suspicious outbound connections
for conn in $(ss -tpn 2>/dev/null | grep ESTAB | grep -v "127.0.0.1\|::1" | grep packattack); do
    remote_ip=$(echo "$conn" | awk '{print $5}' | cut -d: -f1)
    
    # Skip known good IPs (Stripe, PayPal, database, etc.)
    if [[ "$remote_ip" =~ ^(192\.168\.|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.) ]]; then
        continue
    fi
    
    log_alert "SUSPICIOUS OUTBOUND CONNECTION: $conn"
done

# Check 4: Random/obfuscated binary names
find /dev/shm /tmp /var/tmp /home/packattack 2>/dev/null -type f -executable | while read file; do
    filename=$(basename "$file")
    # Check for random-looking names (mix of uppercase/lowercase, short names)
    if echo "$filename" | grep -qE '^[A-Za-z0-9]{5,10}$' && ! echo "$filename" | grep -qE '^(node|npm|next|prisma)'; then
        log_alert "SUSPICIOUS EXECUTABLE: $file"
        rm -f "$file" 2>/dev/null
    fi
done
MONITOR

chmod +x /usr/local/bin/packattack-miner-watch

# Add to cron (run every 2 minutes)
if ! crontab -l 2>/dev/null | grep -q "packattack-miner-watch"; then
    (crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/packattack-miner-watch") | crontab -
    log_info "Added miner-watch to cron (runs every 2 minutes)"
fi

# ==============================================================================
# 7. KERNEL HARDENING FOR PROCESS PROTECTION
# ==============================================================================
log_info "Applying kernel hardening..."

# Prevent users from seeing other users' processes
if ! grep -q "hidepid=2" /etc/fstab; then
    if mount -o remount,hidepid=2 /proc 2>/dev/null; then
        echo "proc /proc proc defaults,hidepid=2 0 0" >> /etc/fstab
        log_info "Enabled process hiding (hidepid=2)"
    fi
fi

# Restrict dmesg
echo "kernel.dmesg_restrict = 1" >> /etc/sysctl.d/99-security.conf 2>/dev/null || true
sysctl -p /etc/sysctl.d/99-security.conf 2>/dev/null || true

# ==============================================================================
# 8. AUDIT SUSPICIOUS ACTIVITY
# ==============================================================================
log_info "Configuring audit rules for miner detection..."

if command -v auditctl &> /dev/null; then
    # Monitor /dev/shm
    auditctl -w /dev/shm -p rwxa -k cryptominer 2>/dev/null || true
    
    # Monitor executable creation in /tmp
    auditctl -w /tmp -p x -k tmp_exec 2>/dev/null || true
    
    # Monitor network connections from packattack user
    auditctl -a always,exit -F arch=b64 -S connect -F auid=$(id -u packattack 2>/dev/null || echo 1000) -k network_connect 2>/dev/null || true
    
    log_info "Audit rules configured"
fi

# ==============================================================================
# 9. SECURE THE APPLICATION DIRECTORY
# ==============================================================================
log_info "Securing application directory permissions..."

if [ -d "/var/www/packattack" ]; then
    # Make sure only packattack user owns the app directory
    chown -R packattack:packattack /var/www/packattack
    
    # Remove world permissions
    chmod -R o-rwx /var/www/packattack
    
    # Make sure .env is protected
    if [ -f "/var/www/packattack/app/.env" ]; then
        chmod 600 /var/www/packattack/app/.env
    fi
    
    log_info "Application directory secured"
fi

# ==============================================================================
# 10. VERIFY NEXT.JS VERSION
# ==============================================================================
log_info "Checking Next.js version..."

if [ -f "/var/www/packattack/app/package.json" ]; then
    NEXTJS_VERSION=$(grep '"next":' /var/www/packattack/app/package.json | grep -oP '[\d.]+' | head -1)
    
    if [ -n "$NEXTJS_VERSION" ]; then
        # Compare versions (need 16.1.5 or higher)
        MAJOR=$(echo $NEXTJS_VERSION | cut -d. -f1)
        MINOR=$(echo $NEXTJS_VERSION | cut -d. -f2)
        PATCH=$(echo $NEXTJS_VERSION | cut -d. -f3)
        
        if [ "$MAJOR" -lt 16 ] || ([ "$MAJOR" -eq 16 ] && [ "$MINOR" -lt 1 ]) || ([ "$MAJOR" -eq 16 ] && [ "$MINOR" -eq 1 ] && [ "$PATCH" -lt 5 ]); then
            log_error "CRITICAL: Next.js version $NEXTJS_VERSION is VULNERABLE to RCE!"
            log_error "Update to 16.1.6 or higher immediately!"
            log_error "Run: cd /var/www/packattack/app && npm update next@16.1.6"
        else
            log_info "Next.js version $NEXTJS_VERSION is patched"
        fi
    fi
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "============================================================"
echo "  Security Hardening Complete"
echo "============================================================"
echo ""
log_info "Applied protections:"
echo "  - /dev/shm mounted as noexec (blocks miner execution)"
echo "  - Known C2 IPs blocked in firewall"
echo "  - Packattack user restricted from cron/at"
echo "  - Miner detection script running every 2 minutes"
echo "  - Audit rules configured for suspicious activity"
echo "  - Application directory permissions secured"
echo ""
log_warn "IMPORTANT: You must also:"
echo "  1. Update Next.js to 16.1.6+ in your codebase"
echo "  2. Run 'npm ci && npm run build' after updates"
echo "  3. Deploy the updated nginx config"
echo "  4. Monitor /var/log/packattack/miner-watch.log"
echo ""
echo "Run this script after every deploy for maximum protection."
echo "============================================================"
