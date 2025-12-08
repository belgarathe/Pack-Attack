#!/bin/bash

# Pack Attack Server Setup Script
# Run this after fresh Ubuntu install

set -e

echo "🚀 Starting Pack Attack Server Setup..."

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
mkdir -p /var/www/pactattack
cd /var/www/pactattack

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/belgarathe/Pack-Attack.git pactattack
cd pactattack

# Create .env file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_8nRWsIZdUN9P@ep-patient-resonance-ahmtm2jq-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://82.165.66.236:3000"
NEXTAUTH_SECRET="pack-attack-super-secret-key-change-in-production-2024"

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

# Create admin user
echo "👤 Creating admin user..."
npm run create-admin

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "pactattack" -- start
pm2 save
pm2 startup

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/pactattack << 'EOF'
server {
    listen 80;
    server_name 82.165.66.236;

    location / {
        proxy_pass http://localhost:3000;
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

# Enable site
ln -sf /etc/nginx/sites-available/pactattack /etc/nginx/sites-enabled/
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
echo "🌐 Your app is running at: http://82.165.66.236"
echo ""
echo "👤 Admin Login:"
echo "   Email: admin@packattack.com"
echo "   Password: admin123"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 logs pactattack    - View logs"
echo "   pm2 restart pactattack - Restart app"
echo "   cd /var/www/pactattack/pactattack - Go to app directory"

