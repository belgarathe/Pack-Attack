#!/bin/bash
# ==============================================================================
# Pack-Attack Security Deployment Script
# Run this on your production server to deploy all security fixes
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================================"
echo "  Pack-Attack Security Deployment"
echo "  $(date)"
echo "============================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo bash deploy-security-update.sh)"
    exit 1
fi

APP_DIR="/var/www/packattack/app"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    log_error "Application directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# ==============================================================================
# STEP 1: Pull latest code
# ==============================================================================
log_info "Step 1/6: Pulling latest code from GitHub..."
sudo -u packattack git fetch origin main
sudo -u packattack git reset --hard origin/main
log_info "Code updated successfully"

# ==============================================================================
# STEP 2: Install dependencies
# ==============================================================================
log_info "Step 2/6: Installing dependencies..."
sudo -u packattack npm ci --production=false
log_info "Dependencies installed"

# ==============================================================================
# STEP 3: Build application
# ==============================================================================
log_info "Step 3/6: Building application..."
sudo -u packattack npx prisma generate
sudo -u packattack npm run build
log_info "Application built successfully"

# ==============================================================================
# STEP 4: Restart PM2
# ==============================================================================
log_info "Step 4/6: Restarting application..."
sudo -u packattack pm2 restart packattack || sudo -u packattack pm2 start npm --name "packattack" -- start
sleep 5
log_info "Application restarted"

# ==============================================================================
# STEP 5: Update Nginx config
# ==============================================================================
log_info "Step 5/6: Updating Nginx configuration..."

# Backup existing config
if [ -f /etc/nginx/sites-available/packattack ]; then
    cp /etc/nginx/sites-available/packattack /etc/nginx/sites-available/packattack.backup.$(date +%Y%m%d%H%M%S)
fi

# Copy new secure config
cp "$APP_DIR/scripts/nginx-packattack-secure.conf" /etc/nginx/sites-available/packattack

# Test nginx config
if nginx -t; then
    systemctl reload nginx
    log_info "Nginx updated and reloaded"
else
    log_error "Nginx config test failed! Restoring backup..."
    cp /etc/nginx/sites-available/packattack.backup.* /etc/nginx/sites-available/packattack 2>/dev/null || true
    exit 1
fi

# ==============================================================================
# STEP 6: Run anti-cryptominer hardening
# ==============================================================================
log_info "Step 6/6: Applying anti-cryptominer hardening..."

# Make /dev/shm noexec (critical - prevents miner execution)
if ! mount | grep -q "/dev/shm.*noexec"; then
    mount -o remount,noexec,nosuid,nodev /dev/shm
    log_info "Mounted /dev/shm as noexec"
    
    # Make persistent
    if ! grep -q "^tmpfs.*\/dev\/shm.*noexec" /etc/fstab; then
        echo "tmpfs /dev/shm tmpfs defaults,noexec,nosuid,nodev 0 0" >> /etc/fstab
    fi
fi

# Kill any suspicious processes in /dev/shm
for pid in $(lsof +D /dev/shm 2>/dev/null | awk 'NR>1 {print $2}' | sort -u); do
    kill -9 $pid 2>/dev/null || true
done

# Clean /dev/shm
rm -rf /dev/shm/* 2>/dev/null || true

# Block known C2 IPs
for ip in "91.92.241.10" "185.165.226.0/24" "185.220.101.0/24"; do
    iptables -C OUTPUT -d "$ip" -j DROP 2>/dev/null || iptables -A OUTPUT -d "$ip" -j DROP
done

# Ensure packattack can't use cron
grep -q "packattack" /etc/cron.deny 2>/dev/null || echo "packattack" >> /etc/cron.deny

# Save iptables
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

log_info "Anti-cryptominer hardening applied"

# ==============================================================================
# VERIFICATION
# ==============================================================================
echo ""
echo "============================================================"
echo "  Verification"
echo "============================================================"

# Check Next.js version
NEXTJS_VERSION=$(grep '"next":' package.json | grep -oP '[\d.]+' | head -1)
if [[ "$NEXTJS_VERSION" == "16.1."* ]] && [[ "${NEXTJS_VERSION##*.}" -ge 5 ]]; then
    log_info "Next.js version: $NEXTJS_VERSION (PATCHED)"
else
    log_error "Next.js version: $NEXTJS_VERSION (VULNERABLE!)"
fi

# Check if app is running
if sudo -u packattack pm2 list | grep -q "online"; then
    log_info "PM2 status: ONLINE"
else
    log_error "PM2 status: NOT RUNNING"
fi

# Check nginx
if systemctl is-active --quiet nginx; then
    log_info "Nginx status: RUNNING"
else
    log_error "Nginx status: NOT RUNNING"
fi

# Check /dev/shm
if mount | grep -q "/dev/shm.*noexec"; then
    log_info "/dev/shm: SECURED (noexec)"
else
    log_warn "/dev/shm: NOT SECURED"
fi

# Health check
echo ""
log_info "Running health check..."
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://pack-attack.de/api/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    log_info "Health check: PASSED (HTTP $HEALTH)"
else
    log_warn "Health check: HTTP $HEALTH (may need a moment to start)"
fi

echo ""
echo "============================================================"
echo "  Deployment Complete!"
echo "============================================================"
echo ""
log_info "All security updates have been deployed."
log_info "Monitor logs: sudo -u packattack pm2 logs packattack"
log_info "Monitor miners: tail -f /var/log/packattack/miner-watch.log"
echo ""
