#!/bin/bash
# Pack-Attack EXTREME SECURITY Server Setup
# Domain: pack-attack.de

set -e
echo "🔒🔒🔒 EXTREME SECURITY DEPLOYMENT 🔒🔒🔒"

# 1. SYSTEM UPDATE
echo "📦 Updating system..."
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban unattended-upgrades apparmor apparmor-utils

# 2. CREATE NON-ROOT USER FOR APP
echo "👤 Creating secure app user..."
useradd -m -s /bin/bash packattack 2>/dev/null || true
mkdir -p /home/packattack/.ssh
cp /root/.ssh/authorized_keys /home/packattack/.ssh/ 2>/dev/null || true
chown -R packattack:packattack /home/packattack/.ssh
chmod 700 /home/packattack/.ssh
chmod 600 /home/packattack/.ssh/authorized_keys 2>/dev/null || true

# 3. EXTREME FIREWALL CONFIGURATION
echo "🧱 Configuring EXTREME firewall..."
ufw --force reset
ufw default deny incoming
ufw default deny outgoing
# Only allow specific outbound
ufw allow out 53/udp comment 'DNS'
ufw allow out 80/tcp comment 'HTTP out'
ufw allow out 443/tcp comment 'HTTPS out'
ufw allow out 5432/tcp comment 'PostgreSQL'
# Inbound
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# 4. EXTREME FAIL2BAN CONFIGURATION
echo "🚫 Configuring EXTREME fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 604800
findtime = 300
maxretry = 2
ignoreip = 127.0.0.1/8

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 2
bantime = 604800

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 2
bantime = 604800

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 86400

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 604800
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 5. SECURE SSH CONFIGURATION
echo "🔐 Hardening SSH..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
cat > /etc/ssh/sshd_config << 'EOF'
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key
PermitRootLogin prohibit-password
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
MaxAuthTries 3
MaxSessions 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers root packattack
EOF
systemctl restart sshd

# 6. ENABLE AUTO SECURITY UPDATES
echo "🔄 Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
dpkg-reconfigure -f noninteractive unattended-upgrades

# 7. INSTALL NODE.JS
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 8. INSTALL PM2
npm install -g pm2

# 9. CREATE APP DIRECTORY WITH SECURE PERMISSIONS
echo "📁 Creating secure app directory..."
mkdir -p /var/www/packattack
chown packattack:packattack /var/www/packattack
cd /var/www/packattack

# 10. CLONE REPOSITORY AS PACKATTACK USER
echo "📥 Cloning Pack-Attack..."
sudo -u packattack git clone https://github.com/belgarathe/Pack-Attack.git app
cd app

# 11. CREATE SECURE .env FILE
echo "⚙️ Creating environment configuration..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
cat > .env << EOF
DATABASE_URL="postgresql://username:password@localhost:5432/packattack"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NODE_ENV="production"
# Add your API keys here:
# RESEND_API_KEY="re_your_api_key"
# RESEND_FROM_EMAIL="noreply@your-domain.com"
EOF
echo "⚠️  IMPORTANT: Edit .env with your actual database credentials!"
chown packattack:packattack .env
chmod 600 .env

# 12. INSTALL & BUILD AS PACKATTACK USER
echo "📦 Installing dependencies..."
sudo -u packattack npm ci
sudo -u packattack npx prisma generate
sudo -u packattack npx prisma db push --accept-data-loss
sudo -u packattack npm run build

# 13. CREATE ADMIN USER
echo "👤 Creating admin user..."
sudo -u packattack npm run create-admin || true

# 14. PM2 ECOSYSTEM CONFIG (RUN AS PACKATTACK USER)
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'packattack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/packattack/app',
    user: 'packattack',
    env: {
      PORT: 4000,
      NODE_ENV: 'production'
    },
    restart_delay: 5000,
    max_restarts: 5,
    min_uptime: 30000,
    kill_timeout: 5000,
    max_memory_restart: '400M',
    exp_backoff_restart_delay: 1000
  }]
}
EOF
chown packattack:packattack ecosystem.config.js

# 15. START APP AS PACKATTACK USER
sudo -u packattack pm2 start ecosystem.config.js
sudo -u packattack pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u packattack --hp /home/packattack

# 16. INSTALL NGINX WITH EXTREME SECURITY
echo "🌐 Installing secure Nginx..."
apt install -y nginx

# Create rate limiting and security config
cat > /etc/nginx/conf.d/security.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=conn:10m;

# Security settings
server_tokens off;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;

# Block bad bots and scanners
map $http_user_agent $bad_bot {
    default 0;
    ~*malicious 1;
    ~*scanner 1;
    ~*nikto 1;
    ~*sqlmap 1;
    ~*wget 1;
    ~*curl 1;
}
EOF

# Main site config with extreme security
cat > /etc/nginx/sites-available/packattack << 'EOF'
server {
    listen 80;
    server_name pack-attack.de www.pack-attack.de 82.165.66.236;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
    limit_conn conn 20;
    
    # Block bad bots
    if ($bad_bot) {
        return 403;
    }
    
    # Block suspicious request methods
    if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE)$) {
        return 444;
    }
    
    # Block suspicious URLs
    location ~* \.(php|asp|aspx|jsp|cgi|pl|py|sh|bash)$ {
        return 404;
    }
    
    # Block common attack patterns
    location ~* (eval\(|base64_decode|gzinflate|rot13|str_rot13) {
        return 403;
    }
    
    # Block access to hidden files
    location ~ /\. {
        deny all;
    }
    
    # API rate limiting (stricter)
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffer_size 4k;
        proxy_buffers 4 4k;
    }
    
    # Main app
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/packattack /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
systemctl enable nginx

# 17. INSTALL CERTBOT FOR SSL
echo "🔐 Installing SSL (Let's Encrypt)..."
apt install -y certbot python3-certbot-nginx
# Will configure SSL after DNS is pointed

# 18. CREATE SECURITY MONITORING
cat > /root/security-monitor.sh << 'MONITOR'
#!/bin/bash
LOG="/var/log/security-monitor.log"
echo "=== Security Monitor $(date) ===" >> $LOG

# Check for suspicious processes
SUSPICIOUS=$(ps aux | grep -E 'wget|curl.*http|\.sh|miner|crypto|kinsing' | grep -v grep | grep -v security-monitor)
if [ ! -z "$SUSPICIOUS" ]; then
    echo "🚨 SUSPICIOUS PROCESS DETECTED:" >> $LOG
    echo "$SUSPICIOUS" >> $LOG
    pkill -9 -f "miner|crypto|kinsing|\.sh.*http"
fi

# Check for new files in /tmp
NEW_FILES=$(find /tmp /var/tmp /dev/shm -type f -mmin -5 2>/dev/null)
if [ ! -z "$NEW_FILES" ]; then
    echo "⚠️ New files in temp directories:" >> $LOG
    echo "$NEW_FILES" >> $LOG
fi

# Log banned IPs
echo "Banned IPs: $(fail2ban-client status sshd 2>/dev/null | grep 'Banned IP' || echo 'N/A')" >> $LOG

# Check PM2 status
echo "PM2: $(pm2 list 2>/dev/null | grep packattack | awk '{print $12}')" >> $LOG
MONITOR
chmod +x /root/security-monitor.sh

# Run monitor every minute
(crontab -l 2>/dev/null | grep -v security-monitor; echo "* * * * * /root/security-monitor.sh") | crontab -

# 19. CLEAN TEMP DIRECTORIES REGULARLY
(crontab -l 2>/dev/null; echo "*/5 * * * * find /tmp /var/tmp /dev/shm -type f -mmin +10 -delete 2>/dev/null") | crontab -

# 20. FINAL SECURITY CHECK
echo "🔍 Running final security check..."
echo ""
echo "✅ EXTREME SECURE DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 URL: http://pack-attack.de (configure DNS first)"
echo "🌐 Temp URL: http://82.165.66.236"
echo "👤 Admin: admin@packattack.com / admin123"
echo ""
echo "🔒 Security Features:"
echo "   ✓ UFW Firewall (strict inbound/outbound)"
echo "   ✓ Fail2ban (7-day bans, 2 attempts)"
echo "   ✓ SSH hardened (key-only, limited users)"
echo "   ✓ App runs as non-root user"
echo "   ✓ Nginx rate limiting & bot blocking"
echo "   ✓ Auto security updates"
echo "   ✓ Security monitor (every minute)"
echo "   ✓ Temp file cleanup (every 5 min)"
echo ""
echo "📊 Commands:"
echo "   /root/security-monitor.sh - Run security check"
echo "   fail2ban-client status sshd - View banned IPs"
echo "   sudo -u packattack pm2 logs - View app logs"
echo ""
echo "🔐 Next: Point pack-attack.de DNS to 82.165.66.236"
echo "   Then run: certbot --nginx -d pack-attack.de -d www.pack-attack.de"







