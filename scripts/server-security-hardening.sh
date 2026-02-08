#!/bin/bash
#
# Pack-Attack Server Security Hardening Script
# Run this BEFORE deploying the application on a fresh Ubuntu 24.04 server
#
# Usage: sudo bash server-security-hardening.sh
#
# This script implements state-of-the-art security hardening based on:
# - CIS Benchmarks for Ubuntu
# - Lynis security recommendations
# - NIST security guidelines
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo bash $0)"
    exit 1
fi

echo "=============================================="
echo "  Pack-Attack Server Security Hardening"
echo "  Version: 1.0.0"
echo "  Date: $(date)"
echo "=============================================="
echo ""

# ============================================
# 1. SYSTEM UPDATES
# ============================================
log_info "Step 1: Updating system packages..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get dist-upgrade -y -qq
apt-get autoremove -y -qq

log_info "System packages updated."

# ============================================
# 2. INSTALL SECURITY TOOLS
# ============================================
log_info "Step 2: Installing security tools..."

apt-get install -y -qq \
    ufw \
    fail2ban \
    rkhunter \
    chkrootkit \
    aide \
    auditd \
    lynis \
    unattended-upgrades \
    apt-listchanges \
    libpam-pwquality \
    acct

log_info "Security tools installed."

# ============================================
# 2.5. INSTALL AND CONFIGURE CLAMAV (MALWARE PROTECTION)
# ============================================
log_info "Step 2.5: Installing ClamAV for malware protection..."

# Install ClamAV for real-time malware scanning
apt-get install -y -qq clamav clamav-daemon clamav-freshclam

# Stop services for configuration
systemctl stop clamav-freshclam 2>/dev/null || true
systemctl stop clamav-daemon 2>/dev/null || true

# Update virus definitions
log_info "Updating ClamAV virus definitions (this may take a few minutes)..."
freshclam || log_warn "ClamAV update failed, will retry on next boot"

# Configure ClamAV for real-time scanning of /dev/shm
# This is critical as malware was previously found in /dev/shm
log_info "Configuring ClamAV to monitor /dev/shm (previous malware location)..."

# Backup original config
cp /etc/clamav/clamd.conf /etc/clamav/clamd.conf.backup 2>/dev/null || true

# Enable OnAccess scanning for /dev/shm
cat >> /etc/clamav/clamd.conf << 'EOF'

# ============================================
# Pack-Attack Custom Configuration
# Real-time scanning for malware prevention
# ============================================

# Enable on-access scanning
OnAccessIncludePath /dev/shm
OnAccessExcludeUID clamav
OnAccessPrevention yes
OnAccessExtraScanning yes

# Scan options
DetectPUA yes
ScanArchive yes
ScanELF yes
AlertBrokenExecutables yes
EOF

# Create systemd service for on-access scanning
cat > /etc/systemd/system/clamav-onacc.service << 'EOF'
[Unit]
Description=ClamAV On-Access Scanner
Requires=clamav-daemon.service
After=clamav-daemon.service syslog.target network.target

[Service]
Type=simple
User=root
ExecStart=/usr/sbin/clamonacc -F --move=/var/quarantine
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Create quarantine directory
mkdir -p /var/quarantine
chmod 700 /var/quarantine

# Enable and start services
systemctl daemon-reload
systemctl enable clamav-daemon
systemctl enable clamav-freshclam
systemctl enable clamav-onacc
systemctl start clamav-daemon || log_warn "ClamAV daemon failed to start"
systemctl start clamav-freshclam
systemctl start clamav-onacc || log_warn "ClamAV on-access scanning not available (may require newer kernel)"

log_info "ClamAV installed and configured for /dev/shm monitoring."

# ============================================
# 3. CONFIGURE AUTOMATIC SECURITY UPDATES
# ============================================
log_info "Step 3: Configuring automatic security updates..."

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

log_info "Automatic security updates configured."

# ============================================
# 4. KERNEL SECURITY HARDENING
# ============================================
log_info "Step 4: Applying kernel security hardening..."

cat > /etc/sysctl.d/99-security.conf << 'EOF'
# ============================================
# Network Security Hardening
# ============================================

# Disable IP forwarding
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Enable reverse path filtering (anti-spoofing)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log martian packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP errors
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable SYN cookies (SYN flood protection)
net.ipv4.tcp_syncookies = 1

# Disable IPv6 redirects
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# ============================================
# Kernel Security Hardening
# ============================================

# Restrict kernel pointer exposure
kernel.kptr_restrict = 2

# Restrict perf_event access
kernel.perf_event_paranoid = 3

# Enable ASLR
kernel.randomize_va_space = 2

# Restrict ptrace scope
kernel.yama.ptrace_scope = 1

# Restrict dmesg access
kernel.dmesg_restrict = 1

# Disable core dumps for SUID binaries
fs.suid_dumpable = 0

# Protect hardlinks and symlinks
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2

# Restrict SysRq key
kernel.sysrq = 0
EOF

sysctl --system > /dev/null 2>&1

log_info "Kernel security hardening applied."

# ============================================
# 5. SSH HARDENING
# ============================================
log_info "Step 5: Hardening SSH configuration..."

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config << 'EOF'
# Pack-Attack Hardened SSH Configuration
# Generated by security hardening script

# Basic settings
Port 22
Protocol 2
AddressFamily inet

# Authentication
PermitRootLogin prohibit-password
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security restrictions
MaxAuthTries 3
MaxSessions 3
LoginGraceTime 30
StrictModes yes

# Disable forwarding
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
GatewayPorts no

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Keep alive settings
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2

# Modern cryptography only
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,umac-128-etm@openssh.com

# Misc
PrintMotd no
PrintLastLog yes
Banner /etc/issue.net
EOF

# Test SSH config before restarting
sshd -t
systemctl restart sshd

log_info "SSH hardened."

# ============================================
# 6. FIREWALL CONFIGURATION (UFW)
# ============================================
log_info "Step 6: Configuring firewall..."

# Reset UFW to defaults
ufw --force reset > /dev/null 2>&1

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
ufw --force enable

log_info "Firewall configured."

# ============================================
# 7. FAIL2BAN CONFIGURATION
# ============================================
log_info "Step 7: Configuring Fail2Ban..."

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd
banaction = ufw

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 10
findtime = 60
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/*access.log
maxretry = 2
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log_info "Fail2Ban configured."

# ============================================
# 8. AUDIT DAEMON CONFIGURATION
# ============================================
log_info "Step 8: Configuring audit daemon..."

cat > /etc/audit/rules.d/packattack.rules << 'EOF'
# Delete all existing rules
-D

# Buffer size
-b 8192

# Failure mode (1 = printk, 2 = panic)
-f 1

# ============================================
# Authentication and Identity
# ============================================
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# ============================================
# SSH and Authentication
# ============================================
-w /etc/ssh/sshd_config -p wa -k sshd_config
-w /root/.ssh/ -p wa -k ssh_keys

# ============================================
# Cron and Scheduled Tasks
# ============================================
-w /etc/crontab -p wa -k cron
-w /etc/cron.d/ -p wa -k cron
-w /etc/cron.daily/ -p wa -k cron
-w /etc/cron.hourly/ -p wa -k cron
-w /etc/cron.monthly/ -p wa -k cron
-w /etc/cron.weekly/ -p wa -k cron
-w /var/spool/cron/ -p wa -k cron

# ============================================
# Network Configuration
# ============================================
-w /etc/hosts -p wa -k hosts
-w /etc/network/ -p wa -k network
-w /etc/netplan/ -p wa -k network

# ============================================
# System Startup
# ============================================
-w /etc/systemd/ -p wa -k systemd
-w /etc/init.d/ -p wa -k init

# ============================================
# Suspicious Activity
# ============================================
-a always,exit -F path=/usr/bin/wget -F perm=x -F auid>=1000 -F auid!=4294967295 -k downloads
-a always,exit -F path=/usr/bin/curl -F perm=x -F auid>=1000 -F auid!=4294967295 -k downloads
-a always,exit -F path=/usr/bin/nc -F perm=x -F auid>=1000 -F auid!=4294967295 -k network_tools
-a always,exit -F path=/usr/bin/ncat -F perm=x -F auid>=1000 -F auid!=4294967295 -k network_tools

# ============================================
# Temporary Directory Activity
# ============================================
-w /tmp -p wxa -k tmp_activity
-w /var/tmp -p wxa -k tmp_activity

# ============================================
# Module Loading
# ============================================
-w /sbin/insmod -p x -k modules
-w /sbin/rmmod -p x -k modules
-w /sbin/modprobe -p x -k modules
EOF

augenrules --load > /dev/null 2>&1
systemctl enable auditd
systemctl restart auditd

log_info "Audit daemon configured."

# ============================================
# 9. LEGAL BANNERS
# ============================================
log_info "Step 9: Adding legal banners..."

cat > /etc/issue << 'EOF'
***************************************************************************
                            AUTHORIZED ACCESS ONLY
***************************************************************************

This system is for authorized users only. All activities are monitored and
logged. Unauthorized access is prohibited and may be subject to criminal
prosecution. By accessing this system, you consent to monitoring.

***************************************************************************
EOF

cp /etc/issue /etc/issue.net

log_info "Legal banners added."

# ============================================
# 10. PASSWORD POLICY
# ============================================
log_info "Step 10: Configuring password policy..."

# Configure PAM for password quality
cat > /etc/security/pwquality.conf << 'EOF'
# Password quality configuration
minlen = 14
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
minclass = 4
maxrepeat = 3
gecoscheck = 1
dictcheck = 1
usercheck = 1
enforcing = 1
EOF

log_info "Password policy configured."

# ============================================
# 11. DISABLE UNNECESSARY SERVICES
# ============================================
log_info "Step 11: Disabling unnecessary services..."

# List of services to disable if they exist
SERVICES_TO_DISABLE=(
    "avahi-daemon"
    "cups"
    "bluetooth"
    "isc-dhcp-server"
    "named"
    "vsftpd"
    "dovecot"
    "smbd"
    "nmbd"
    "snmpd"
    "squid"
    "nis"
    "rsh.socket"
    "rlogin.socket"
    "rexec.socket"
    "telnet.socket"
    "tftp.socket"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        systemctl stop "$service"
        systemctl disable "$service"
        log_info "Disabled: $service"
    fi
done

log_info "Unnecessary services disabled."

# ============================================
# 12. FILE PERMISSIONS
# ============================================
log_info "Step 12: Securing file permissions..."

# Secure sensitive files
chmod 600 /etc/shadow
chmod 600 /etc/gshadow
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 700 /root
chmod 700 /root/.ssh 2>/dev/null || true
chmod 600 /root/.ssh/authorized_keys 2>/dev/null || true

# Secure cron directories
chmod 700 /etc/cron.d
chmod 700 /etc/cron.daily
chmod 700 /etc/cron.hourly
chmod 700 /etc/cron.monthly
chmod 700 /etc/cron.weekly
chmod 600 /etc/crontab

# Restrict access to su
dpkg-statoverride --update --add root sudo 4750 /bin/su 2>/dev/null || true

log_info "File permissions secured."

# ============================================
# 13. RESTRICT CRON ACCESS
# ============================================
log_info "Step 13: Restricting cron access..."

# Only root can use cron by default
echo "root" > /etc/cron.allow
touch /etc/at.allow
echo "root" > /etc/at.allow

log_info "Cron access restricted."

# ============================================
# 14. DISABLE CORE DUMPS
# ============================================
log_info "Step 14: Disabling core dumps..."

cat >> /etc/security/limits.conf << 'EOF'

# Disable core dumps
* hard core 0
* soft core 0
EOF

echo 'ulimit -c 0' >> /etc/profile

log_info "Core dumps disabled."

# ============================================
# 15. CONFIGURE UMASK
# ============================================
log_info "Step 15: Configuring secure umask..."

# Set default umask to 027
sed -i 's/^UMASK.*/UMASK 027/' /etc/login.defs

# Add to profile
echo "umask 027" >> /etc/profile

log_info "Umask configured."

# ============================================
# 16. ENABLE PROCESS ACCOUNTING
# ============================================
log_info "Step 16: Enabling process accounting..."

systemctl enable acct
systemctl start acct

log_info "Process accounting enabled."

# ============================================
# 17. INITIALIZE AIDE DATABASE
# ============================================
log_info "Step 17: Initializing AIDE database (this may take a while)..."

aideinit &
AIDE_PID=$!

log_info "AIDE database initialization started in background (PID: $AIDE_PID)"

# ============================================
# 18. UPDATE RKHUNTER
# ============================================
log_info "Step 18: Updating RKHunter database..."

rkhunter --update --quiet
rkhunter --propupd --quiet

log_info "RKHunter database updated."

# ============================================
# 19. CREATE SECURITY MONITORING SCRIPT
# ============================================
log_info "Step 19: Creating security monitoring script..."

cat > /usr/local/bin/packattack-security-monitor << 'SCRIPT_EOF'
#!/bin/bash
# Pack-Attack Security Monitor
# Runs every 5 minutes via cron

LOG_DIR="/var/log/packattack"
LOG_FILE="$LOG_DIR/security-monitor.log"
ALERT_FILE="$LOG_DIR/security-alerts.log"

mkdir -p "$LOG_DIR"

log_event() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_alert() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $1" >> "$ALERT_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $1" >> "$LOG_FILE"
}

log_event "Security check started"

# Check for suspicious processes
SUSPICIOUS=$(ps aux | grep -iE '(xmrig|minerd|cpuminer|kdevtmpfsi|kinsing|\.x$|lrt$)' | grep -v grep)
if [ -n "$SUSPICIOUS" ]; then
    log_alert "Suspicious processes detected: $SUSPICIOUS"
fi

# Check for new executables in /tmp
NEW_EXEC=$(find /tmp /var/tmp -type f -executable -mmin -5 2>/dev/null)
if [ -n "$NEW_EXEC" ]; then
    log_alert "New executables in temp directories: $NEW_EXEC"
fi

# Check for unusual network connections
UNUSUAL_CONN=$(ss -tnp 2>/dev/null | grep -v -E '(127.0.0.1|::1|22|80|443|3000|5432)' | grep ESTAB)
if [ -n "$UNUSUAL_CONN" ]; then
    log_alert "Unusual network connections: $UNUSUAL_CONN"
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_alert "High disk usage: ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt 95 ]; then
    log_alert "High memory usage: ${MEM_USAGE}%"
fi

# Check for failed SSH attempts in last 5 minutes
FAILED_SSH=$(journalctl -u sshd --since "5 minutes ago" 2>/dev/null | grep -c "Failed\|Invalid" || echo 0)
if [ "$FAILED_SSH" -gt 10 ]; then
    log_alert "High number of failed SSH attempts: $FAILED_SSH"
fi

# Check if critical services are running
for service in nginx fail2ban auditd; do
    if ! systemctl is-active --quiet "$service"; then
        log_alert "Critical service not running: $service"
    fi
done

log_event "Security check completed"
SCRIPT_EOF

chmod +x /usr/local/bin/packattack-security-monitor

# Add to crontab
(crontab -l 2>/dev/null | grep -v packattack-security-monitor; echo "*/5 * * * * /usr/local/bin/packattack-security-monitor") | crontab -

log_info "Security monitoring script created."

# ============================================
# 20. FINAL STEPS
# ============================================
log_info "Step 20: Running final security checks..."

# Create log directory
mkdir -p /var/log/packattack
chmod 750 /var/log/packattack

# Run Lynis quick audit
lynis audit system --quick --quiet 2>/dev/null || true

echo ""
echo "=============================================="
echo "  Security Hardening Complete!"
echo "=============================================="
echo ""
echo "Summary:"
echo "  - System packages updated"
echo "  - Security tools installed (AIDE, auditd, Fail2Ban, RKHunter, Lynis, ClamAV)"
echo "  - Kernel hardening applied"
echo "  - SSH hardened (key-only auth, modern ciphers)"
echo "  - Firewall enabled (ports 22, 80, 443 only)"
echo "  - Fail2Ban configured"
echo "  - Audit rules configured"
echo "  - File permissions secured"
echo "  - Automatic security updates enabled"
echo "  - Security monitoring enabled"
echo ""
echo "Next Steps:"
echo "  1. Add your SSH public key to /root/.ssh/authorized_keys"
echo "  2. Create the 'packattack' application user"
echo "  3. Install and configure Nginx"
echo "  4. Deploy the application"
echo "  5. Run 'lynis audit system' for a full security report"
echo ""
echo "Log files:"
echo "  - /var/log/packattack/security-monitor.log"
echo "  - /var/log/packattack/security-alerts.log"
echo "  - /var/log/lynis.log"
echo "  - /var/log/audit/audit.log"
echo ""
log_info "Server is now hardened and ready for application deployment."
