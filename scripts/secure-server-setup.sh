#!/bin/bash
# Pack-Attack SECURE Server Setup
# Run after fresh Ubuntu install
#
# BEFORE RUNNING: Create a .env.production file with your credentials:
#   DATABASE_URL="your-database-connection-string"
#   NEXTAUTH_SECRET="your-secret-key" (generate with: openssl rand -base64 32)
#   SERVER_IP="your-server-ip"

set -e
echo "🔒 Starting Pack-Attack SECURE server setup..."

# Check if .env.production file exists
if [ ! -f ".env.production" ]; then
    echo "❌ ERROR: .env.production file not found!"
    echo ""
    echo "Please create a .env.production file with the following variables:"
    echo "  DATABASE_URL=\"postgresql://user:password@host/db?sslmode=require\""
    echo "  NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\""
    echo "  SERVER_IP=\"your-server-ip\""
    echo ""
    exit 1
fi

# Load environment variables
source .env.production

# Validate required variables
if [ -z "$DATABASE_URL" ] || [ -z "$NEXTAUTH_SECRET" ] || [ -z "$SERVER_IP" ]; then
    echo "❌ ERROR: Missing required environment variables!"
    echo "Required: DATABASE_URL, NEXTAUTH_SECRET, SERVER_IP"
    exit 1
fi

# 1. UPDATE SYSTEM
echo "📦 Updating system..."
apt update && apt upgrade -y

# 2. INSTALL SECURITY TOOLS
echo "🔒 Installing security tools..."
apt install -y fail2ban ufw unattended-upgrades

# 3. CONFIGURE FIREWALL
echo "🧱 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. CONFIGURE FAIL2BAN
echo "🚫 Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 5. ENABLE AUTO SECURITY UPDATES
dpkg-reconfigure -f noninteractive unattended-upgrades

# 6. INSTALL NODE.JS 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# 7. INSTALL PM2
npm install -g pm2

# 8. CLONE PACK-ATTACK
echo "📥 Cloning Pack-Attack..."
mkdir -p /var/www/packattack
cd /var/www/packattack
git clone https://github.com/belgarathe/Pack-Attack.git app
cd app

# 9. CREATE .env FILE (using environment variables, not hardcoded!)
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
NEXTAUTH_URL="http://${SERVER_IP}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NODE_ENV="production"
EOF

# 10. INSTALL & BUILD
echo "📦 Installing dependencies..."
npm ci
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# 11. CREATE ADMIN USER (uses environment variables)
echo "👤 Creating admin user..."
npm run create-admin || true

# 12. PM2 ECOSYSTEM CONFIG
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'packattack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/packattack/app',
    env: {
      PORT: 4000,
      NODE_ENV: 'production'
    },
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: 10000,
    kill_timeout: 5000,
    max_memory_restart: '500M'
  }]
}
EOF

# 13. START APP
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 14. INSTALL NGINX
echo "🌐 Installing Nginx..."
apt install -y nginx

cat > /etc/nginx/sites-available/packattack << EOF
server {
    listen 80;
    server_name ${SERVER_IP};
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/packattack /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
systemctl enable nginx

# 15. SECURITY MONITORING SCRIPT
cat > /root/security-check.sh << 'EOF'
#!/bin/bash
echo "=== Security Check $(date) ==="
echo "=== Banned IPs ===" && fail2ban-client status sshd
echo "=== PM2 Status ===" && pm2 status
echo "=== Memory ===" && free -h
EOF
chmod +x /root/security-check.sh

echo ""
echo "✅ PACK-ATTACK SETUP COMPLETE!"
echo ""
echo "🌐 URL: http://${SERVER_IP}"
echo "👤 Admin: Check your ADMIN_EMAIL and ADMIN_PASSWORD environment variables"
echo ""
echo "🔒 Security: UFW + Fail2ban + Auto-updates enabled"
echo "📊 Check: /root/security-check.sh"
