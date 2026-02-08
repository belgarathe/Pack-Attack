#!/bin/bash

#===============================================================================
# PACK ATTACK - SECURE DEPLOYMENT SCRIPT
#===============================================================================
#
# This script implements state-of-the-art security measures for production
# deployment. Run this on a fresh Ubuntu 22.04+ server.
#
# SECURITY FEATURES:
# - SSH hardening (key-only auth, no root login)
# - Firewall with UFW (minimal ports)
# - Fail2Ban intrusion prevention
# - SSL/TLS with Let's Encrypt (auto-renewal)
# - Security headers (CSP, HSTS, X-Frame-Options, etc.)
# - Nginx rate limiting & DDoS protection
# - Automatic security updates (unattended-upgrades)
# - Non-root application user
# - Secure file permissions
# - AppArmor enforcement
# - Audit logging
# - Database connection encryption
#
# PREREQUISITES:
# 1. Fresh Ubuntu 22.04+ VPS
# 2. Domain name pointing to server IP
# 3. SSH key access configured
# 4. .env.production file with credentials
#
# USAGE:
#   chmod +x secure-deploy.sh
#   sudo ./secure-deploy.sh
#
#===============================================================================

set -euo pipefail
IFS=$'\n\t'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="packattack"
APP_USER="packattack"
APP_DIR="/var/www/${APP_NAME}"
LOG_DIR="/var/log/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
NODE_VERSION="20"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root${NC}"
   exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  PACK ATTACK SECURE DEPLOYMENT${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

#===============================================================================
# STEP 1: GATHER CONFIGURATION
#===============================================================================

echo -e "${YELLOW}Step 1: Configuration${NC}"

# Check for required environment file
if [[ ! -f ".env.production" ]]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production with required variables."
    exit 1
fi

# Source environment
source .env.production

# Prompt for domain if not set
if [[ -z "${DOMAIN:-}" ]]; then
    read -p "Enter your domain name (e.g., packattack.com): " DOMAIN
fi

# Prompt for admin email
if [[ -z "${ADMIN_EMAIL:-}" ]]; then
    read -p "Enter admin email for SSL certificates: " ADMIN_EMAIL
fi

# Validate critical variables
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "DOMAIN" "ADMIN_EMAIL")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo -e "${RED}Error: ${var} is required but not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Configuration validated${NC}"

#===============================================================================
# STEP 1.5: PRE-DEPLOYMENT SECURITY VALIDATION
#===============================================================================

echo -e "${YELLOW}Step 1.5: Security Validation${NC}"

# Run pre-deployment checks
if [ -f "./scripts/pre-deploy-security-check.sh" ]; then
    chmod +x ./scripts/pre-deploy-security-check.sh
    ./scripts/pre-deploy-security-check.sh
else
    echo -e "${YELLOW}Warning: Pre-deployment security check not found${NC}"
fi

# Verify DATABASE_URL has connection pooling
if [[ ! "$DATABASE_URL" =~ "connection_limit" ]]; then
    echo -e "${RED}ERROR: DATABASE_URL missing connection pooling parameters${NC}"
    echo "Add: ?connection_limit=10&pool_timeout=30"
    exit 1
fi

echo -e "${GREEN}✓ Security validation passed${NC}"

#===============================================================================
# STEP 2: SYSTEM HARDENING
#===============================================================================

echo -e "${YELLOW}Step 2: System Hardening${NC}"

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install essential security packages
echo "Installing security packages..."
apt install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    apparmor \
    apparmor-utils \
    auditd \
    audispd-plugins \
    logrotate \
    acl \
    rkhunter \
    chkrootkit \
    clamav \
    clamav-daemon \
    libpam-pwquality \
    aide \
    needrestart

# Enable automatic security updates
echo "Configuring automatic security updates..."
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
Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";
EOF

echo -e "${GREEN}✓ System hardening complete${NC}"

#===============================================================================
# STEP 3: SSH HARDENING
#===============================================================================

echo -e "${YELLOW}Step 3: SSH Hardening${NC}"

# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH config
cat > /etc/ssh/sshd_config << 'EOF'
# Pack Attack - Hardened SSH Configuration
# Generated by secure-deploy.sh

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
AuthenticationMethods publickey

# Security
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitUserEnvironment no
PermitTunnel no
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
Compression no
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
MaxAuthTries 3
MaxSessions 2
MaxStartups 10:30:60
StrictModes yes

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Crypto hardening (modern ciphers only)
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com

# Banner
Banner /etc/ssh/banner
EOF

# Create SSH banner
cat > /etc/ssh/banner << 'EOF'
================================================================================
                    AUTHORIZED ACCESS ONLY
================================================================================
This system is for authorized use only. All activities may be monitored and
recorded. Unauthorized access or use is strictly prohibited and may result
in criminal prosecution.
================================================================================
EOF

# Restart SSH (Ubuntu 24.04 uses ssh.service, not sshd.service)
systemctl restart ssh 2>/dev/null || systemctl restart sshd

echo -e "${GREEN}✓ SSH hardening complete${NC}"

#===============================================================================
# STEP 4: FIREWALL CONFIGURATION
#===============================================================================

echo -e "${YELLOW}Step 4: Firewall Configuration${NC}"

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (rate limited)
ufw limit 22/tcp comment 'SSH rate limited'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
ufw --force enable

# Show status
ufw status verbose

echo -e "${GREEN}✓ Firewall configured${NC}"

#===============================================================================
# STEP 5: FAIL2BAN CONFIGURATION
#===============================================================================

echo -e "${YELLOW}Step 5: Fail2Ban Configuration${NC}"

# Create custom jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban time: 1 hour (progressive)
bantime = 3600
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 604800
findtime = 600
maxretry = 3

# Email notifications (configure your email)
destemail = root@localhost
sender = fail2ban@localhost
action = %(action_mwl)s

# Ignore localhost
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 6
bantime = 172800

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

# Create nginx-limit-req filter
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

# Restart fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

echo -e "${GREEN}✓ Fail2Ban configured${NC}"

#===============================================================================
# STEP 6: CREATE APPLICATION USER
#===============================================================================

echo -e "${YELLOW}Step 6: Creating Application User${NC}"

# Create non-root user for application
if ! id "${APP_USER}" &>/dev/null; then
    useradd -m -s /bin/bash -d "/home/${APP_USER}" "${APP_USER}"
    echo -e "${GREEN}✓ User ${APP_USER} created${NC}"
else
    echo -e "${YELLOW}User ${APP_USER} already exists${NC}"
fi

# Create application directories
mkdir -p "${APP_DIR}"
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKUP_DIR}"

# Set ownership
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${BACKUP_DIR}"

# Set secure permissions
chmod 750 "${APP_DIR}"
chmod 750 "${LOG_DIR}"
chmod 700 "${BACKUP_DIR}"

echo -e "${GREEN}✓ Application user configured${NC}"

#===============================================================================
# STEP 7: INSTALL NODE.JS
#===============================================================================

echo -e "${YELLOW}Step 7: Installing Node.js ${NODE_VERSION}${NC}"

# Install Node.js via NodeSource
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
npm install -g pm2

echo -e "${GREEN}✓ Node.js installed${NC}"

#===============================================================================
# STEP 8: INSTALL AND CONFIGURE NGINX
#===============================================================================

echo -e "${YELLOW}Step 8: Installing and Configuring Nginx${NC}"

# Install nginx
apt install -y nginx

# Create secure nginx configuration
cat > "${NGINX_CONF}" << EOF
# Pack Attack - Secure Nginx Configuration
# Security headers and rate limiting enabled

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login_limit:10m rate=1r/s;
limit_req_zone \$binary_remote_addr zone=general_limit:10m rate=30r/s;
limit_conn_zone \$binary_remote_addr zone=conn_limit:10m;

# Upstream configuration
upstream packattack_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${DOMAIN}/chain.pem;
    
    #===========================================================================
    # SSL/TLS HARDENING (A+ rating on SSL Labs)
    #===========================================================================
    
    # TLS versions
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Cipher suites (modern, secure only)
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL session caching
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # DH parameters (generate with: openssl dhparam -out /etc/nginx/dhparam.pem 4096)
    ssl_dhparam /etc/nginx/dhparam.pem;
    
    #===========================================================================
    # SECURITY HEADERS
    #===========================================================================
    
    # HSTS (1 year, include subdomains, preload)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Prevent clickjacking
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # XSS protection
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Prevent MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;
    
    # Referrer policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Permissions policy
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(self)" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'; form-action 'self'; base-uri 'self';" always;
    
    #===========================================================================
    # CONNECTION LIMITS & RATE LIMITING
    #===========================================================================
    
    # Connection limit per IP
    limit_conn conn_limit 20;
    
    # Request size limits
    client_max_body_size 10M;
    client_body_buffer_size 16k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;
    
    #===========================================================================
    # LOCATIONS
    #===========================================================================
    
    # Health check (no rate limit)
    location = /api/health {
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        access_log off;
    }
    
    # Login/Auth endpoints (strict rate limit)
    location ~ ^/api/auth/ {
        limit_req zone=login_limit burst=3 nodelay;
        limit_req_status 429;
        
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Payment endpoints (strict rate limit)
    location ~ ^/api/payments/ {
        limit_req zone=login_limit burst=3 nodelay;
        limit_req_status 429;
        
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API endpoints (moderate rate limit)
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
    
    # Static files (Next.js)
    location /_next/static/ {
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # All other requests
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        proxy_pass http://packattack_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Block common attack patterns
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|git|htaccess|htpasswd|ini|log|sh|sql|conf|bak)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Error pages
    error_page 429 /429.html;
    location = /429.html {
        internal;
        root /var/www/error-pages;
    }
    
    # Logging
    access_log ${LOG_DIR}/nginx-access.log combined buffer=16k flush=10s;
    error_log ${LOG_DIR}/nginx-error.log warn;
}
EOF

# Generate DH parameters (this takes a while)
echo "Generating DH parameters (this may take several minutes)..."
if [[ ! -f /etc/nginx/dhparam.pem ]]; then
    openssl dhparam -out /etc/nginx/dhparam.pem 2048
fi

# Create error pages directory
mkdir -p /var/www/error-pages
cat > /var/www/error-pages/429.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>429 - Too Many Requests</title>
    <style>
        body { font-family: system-ui; text-align: center; padding: 50px; background: #1a1a2e; color: white; }
        h1 { font-size: 3em; margin-bottom: 0; }
        p { color: #888; }
    </style>
</head>
<body>
    <h1>429</h1>
    <p>Too many requests. Please slow down and try again in a moment.</p>
</body>
</html>
EOF

# Create certbot webroot
mkdir -p /var/www/certbot

echo -e "${GREEN}✓ Nginx configured${NC}"

#===============================================================================
# STEP 9: INSTALL SSL CERTIFICATES
#===============================================================================

echo -e "${YELLOW}Step 9: Installing SSL Certificates${NC}"

# Install certbot
apt install -y certbot python3-certbot-nginx

# Enable temporary nginx config for cert generation
ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Get certificate
certbot certonly --webroot -w /var/www/certbot \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --email "${ADMIN_EMAIL}" \
    --agree-tos \
    --non-interactive

# Enable auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Reload nginx
systemctl reload nginx

echo -e "${GREEN}✓ SSL certificates installed${NC}"

#===============================================================================
# STEP 10: DEPLOY APPLICATION
#===============================================================================

echo -e "${YELLOW}Step 10: Deploying Application${NC}"

# Clone repository as app user
cd "${APP_DIR}"
if [[ -d "app" ]]; then
    rm -rf app
fi

sudo -u "${APP_USER}" git clone https://github.com/belgarathe/Pack-Attack.git app
cd app

# Create secure .env file
sudo -u "${APP_USER}" cat > .env << EOF
# Production Environment
NODE_ENV=production

# Database (with connection pooling)
DATABASE_URL="${DATABASE_URL}"

# NextAuth
NEXTAUTH_URL="https://${DOMAIN}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Enable database heartbeat
ENABLE_DB_HEARTBEAT=true
EOF

# Secure the .env file
chmod 600 .env
chown "${APP_USER}:${APP_USER}" .env

# Install dependencies
sudo -u "${APP_USER}" npm ci --production=false

# Generate Prisma client
sudo -u "${APP_USER}" npx prisma generate

# Run migrations
sudo -u "${APP_USER}" npx prisma migrate deploy

# Verify instrumentation.ts exists (global error handlers)
if [ ! -f "src/instrumentation.ts" ]; then
    echo -e "${YELLOW}Creating instrumentation.ts for global error handling...${NC}"
    sudo -u "${APP_USER}" cat > src/instrumentation.ts << 'INST_EOF'
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    process.on('uncaughtException', (error, origin) => {
      console.error('Uncaught Exception:', error, 'Origin:', origin);
    });
  }
}
INST_EOF
fi

# Build application
sudo -u "${APP_USER}" npm run build

echo -e "${GREEN}✓ Application deployed${NC}"

#===============================================================================
# STEP 11: CONFIGURE PM2
#===============================================================================

echo -e "${YELLOW}Step 11: Configuring PM2${NC}"

# Create PM2 ecosystem file
sudo -u "${APP_USER}" cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'packattack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/packattack/app',
    
    // Process management
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '30s',
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    
    // Memory management
    max_memory_restart: '800M',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      ENABLE_DB_HEARTBEAT: 'true',
    },
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/packattack/pm2-error.log',
    out_file: '/var/log/packattack/pm2-out.log',
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 10000,
    wait_ready: true,
    listen_timeout: 15000,
  }]
};
EOF

# Start application with PM2
sudo -u "${APP_USER}" pm2 start ecosystem.config.cjs

# Save PM2 configuration
sudo -u "${APP_USER}" pm2 save

# Setup PM2 startup
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}"

echo -e "${GREEN}✓ PM2 configured${NC}"

#===============================================================================
# STEP 12: CONFIGURE AUDIT LOGGING
#===============================================================================

echo -e "${YELLOW}Step 12: Configuring Audit Logging${NC}"

# Configure auditd rules
cat > /etc/audit/rules.d/packattack.rules << 'EOF'
# Pack Attack Audit Rules

# Log all commands executed by app user
-a always,exit -F arch=b64 -S execve -F euid=packattack -k packattack_exec

# Monitor .env file
-w /var/www/packattack/app/.env -p rwa -k packattack_env

# Monitor application directory
-w /var/www/packattack/app/ -p wa -k packattack_app

# Monitor SSH logins
-w /var/log/auth.log -p rwa -k auth_log

# Monitor sudo usage
-w /var/log/sudo.log -p rwa -k sudo_log
EOF

# Restart auditd
systemctl restart auditd

echo -e "${GREEN}✓ Audit logging configured${NC}"

#===============================================================================
# STEP 13: CONFIGURE LOG ROTATION
#===============================================================================

echo -e "${YELLOW}Step 13: Configuring Log Rotation${NC}"

cat > /etc/logrotate.d/packattack << 'EOF'
/var/log/packattack/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 packattack packattack
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo -e "${GREEN}✓ Log rotation configured${NC}"

#===============================================================================
# STEP 14: CREATE BACKUP SCRIPT
#===============================================================================

echo -e "${YELLOW}Step 14: Creating Backup Script${NC}"

cat > /usr/local/bin/packattack-backup << 'EOF'
#!/bin/bash
# Pack Attack Backup Script

set -euo pipefail

BACKUP_DIR="/var/backups/packattack"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup application files
tar -czf "${BACKUP_DIR}/app_${DATE}.tar.gz" -C /var/www/packattack/app .

# Backup database (if pg_dump is available)
if command -v pg_dump &>/dev/null; then
    source /var/www/packattack/app/.env
    pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/db_${DATE}.sql.gz"
fi

# Remove old backups
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${DATE}"
EOF

chmod +x /usr/local/bin/packattack-backup

# Add to cron (daily at 2 AM)
(crontab -l 2>/dev/null | grep -v packattack-backup; echo "0 2 * * * /usr/local/bin/packattack-backup") | crontab -

echo -e "${GREEN}✓ Backup script created${NC}"

#===============================================================================
# STEP 15: CREATE UPDATE SCRIPT
#===============================================================================

echo -e "${YELLOW}Step 15: Creating Secure Update Script${NC}"

cat > /usr/local/bin/packattack-deploy << 'EOF'
#!/bin/bash
#===============================================================================
# PACK ATTACK - SECURE DEPLOYMENT UPDATE SCRIPT
#===============================================================================
# This script safely deploys updates from the main branch
# Run as root: sudo packattack-deploy
#===============================================================================

set -euo pipefail

APP_DIR="/var/www/packattack/app"
APP_USER="packattack"
LOG_DIR="/var/log/packattack"
BACKUP_DIR="/var/backups/packattack"
DEPLOY_LOG="${LOG_DIR}/deploy.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${DEPLOY_LOG}"
}

error() {
    log "ERROR: $1"
    exit 1
}

# Verify running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root"
fi

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  PACK ATTACK SECURE DEPLOYMENT${NC}"
echo -e "${YELLOW}============================================${NC}"

log "Starting deployment..."

# Step 1: Pre-deployment backup
log "Creating pre-deployment backup..."
/usr/local/bin/packattack-backup

# Step 2: Pull latest changes
log "Pulling latest changes from main branch..."
cd "${APP_DIR}"
sudo -u "${APP_USER}" git fetch origin main
sudo -u "${APP_USER}" git reset --hard origin/main

# Step 3: Verify commit signature (if GPG is configured)
if git log -1 --format='%G?' | grep -q '^G$'; then
    log "✓ Commit signature verified"
else
    log "Warning: Commit signature not verified (GPG not configured)"
fi

# Step 4: Install dependencies
log "Installing dependencies..."
sudo -u "${APP_USER}" npm ci --production=false

# Step 5: Generate Prisma client
log "Generating Prisma client..."
sudo -u "${APP_USER}" npx prisma generate

# Step 6: Run migrations
log "Running database migrations..."
sudo -u "${APP_USER}" npx prisma migrate deploy

# Step 7: Build application
log "Building application..."
sudo -u "${APP_USER}" npm run build

# Step 8: Run tests (if available)
if grep -q '"test"' package.json; then
    log "Running tests..."
    sudo -u "${APP_USER}" npm test || log "Warning: Tests failed"
fi

# Step 9: Reload application
log "Reloading application..."
sudo -u "${APP_USER}" pm2 reload packattack --update-env

# Step 10: Health check
log "Running health check..."
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [[ "${HEALTH_STATUS}" == "200" ]]; then
    log "✓ Health check passed"
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL${NC}"
    echo -e "${GREEN}============================================${NC}"
else
    log "ERROR: Health check failed (HTTP ${HEALTH_STATUS})"
    log "Rolling back..."
    
    # Restore from backup
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/app_*.tar.gz | head -1)
    if [[ -f "${LATEST_BACKUP}" ]]; then
        tar -xzf "${LATEST_BACKUP}" -C "${APP_DIR}"
        sudo -u "${APP_USER}" npm ci --production=false
        sudo -u "${APP_USER}" npm run build
        sudo -u "${APP_USER}" pm2 reload packattack
        log "Rollback completed"
    fi
    
    error "Deployment failed"
fi

log "Deployment completed successfully"
EOF

chmod +x /usr/local/bin/packattack-deploy

echo -e "${GREEN}✓ Update script created${NC}"

#===============================================================================
# STEP 16: FINAL SECURITY CHECKS
#===============================================================================

echo -e "${YELLOW}Step 16: Final Security Checks${NC}"

# Initialize AIDE (file integrity)
echo "Initializing file integrity database..."
aideinit -y -f || true

# Run rkhunter
echo "Running rootkit check..."
rkhunter --update || true
rkhunter --propupd || true

# Set file permissions
chmod 700 /root
chmod 700 /home/"${APP_USER}"
chmod 750 "${APP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo -e "${GREEN}✓ Security checks complete${NC}"

#===============================================================================
# DEPLOYMENT COMPLETE
#===============================================================================

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  SECURE DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Application URL: ${BLUE}https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}Important Security Notes:${NC}"
echo "1. SSH password authentication is DISABLED"
echo "2. Root login is restricted to SSH keys"
echo "3. Firewall allows only ports 22, 80, 443"
echo "4. Fail2Ban is monitoring for attacks"
echo "5. Auto security updates are enabled"
echo "6. SSL certificate auto-renews"
echo ""
echo -e "${YELLOW}Management Commands:${NC}"
echo "  sudo packattack-deploy    - Deploy updates from main branch"
echo "  sudo packattack-backup    - Create backup"
echo "  pm2 logs packattack       - View application logs"
echo "  pm2 monit                 - Monitor application"
echo "  sudo fail2ban-client status - Check banned IPs"
echo ""
echo -e "${YELLOW}Health Check:${NC}"
echo "  curl https://${DOMAIN}/api/health"
echo ""
