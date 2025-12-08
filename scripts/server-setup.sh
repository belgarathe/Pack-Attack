#!/bin/bash

# Pack Attack Server Setup Script
# Run this after fresh Ubuntu install
#
# BEFORE RUNNING: Create a .env file with your credentials:
#   DATABASE_URL="your-database-connection-string"
#   NEXTAUTH_SECRET="your-secret-key"
#   SERVER_IP="your-server-ip"
#   ADMIN_EMAIL="your-admin-email"
#   ADMIN_PASSWORD="your-secure-password"

set -e

echo "🚀 Starting Pack Attack Server Setup..."

# Check if .env file exists
if [ ! -f ".env.production" ]; then
    echo "❌ ERROR: .env.production file not found!"
    echo ""
    echo "Please create a .env.production file with the following variables:"
    echo "  DATABASE_URL=\"postgresql://user:password@host/db?sslmode=require\""
    echo "  NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\""
    echo "  NEXTAUTH_URL=\"http://your-server-ip:3000\""
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

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node installation
node --version
npm --version

# Install PM2 and Git
echo "📦 Installing PM2 and Git..."
npm install -g pm2
apt install -y git

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/packattack
cd /var/www/packattack

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/belgarathe/Pack-Attack.git packattack
cd packattack

# Create .env file from production config
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
# Database
DATABASE_URL="${DATABASE_URL}"

# NextAuth Configuration
NEXTAUTH_URL="http://${SERVER_IP}:3000"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Environment
NODE_ENV="production"
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️ Building application..."
npm run build

# Create admin user (uses environment variables)
echo "👤 Creating admin user..."
npm run create-admin

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "packattack" -- start
pm2 save
pm2 startup

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/packattack << EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/packattack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Show status
echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "🌐 Your app is running at: http://${SERVER_IP}"
echo ""
echo "👤 Admin Login: Check your ADMIN_EMAIL and ADMIN_PASSWORD environment variables"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 logs packattack    - View logs"
echo "   pm2 restart packattack - Restart app"
echo "   cd /var/www/packattack/packattack - Go to app directory"
