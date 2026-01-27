#!/bin/bash
#===============================================================================
# PACK ATTACK - QUICK DEPLOYMENT SCRIPT
#===============================================================================
# Use this script for quick updates after initial secure setup
# Run on server: sudo ./quick-deploy.sh
#===============================================================================

set -euo pipefail

# Configuration
APP_DIR="/var/www/packattack/app"
APP_USER="packattack"
LOG_FILE="/var/log/packattack/deploy-$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Check root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}Error: Run as root (sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PACK ATTACK QUICK DEPLOY               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

cd "${APP_DIR}"

# Get current commit
OLD_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: ${OLD_COMMIT}"

# Fetch and reset
log "Pulling latest from main..."
sudo -u "${APP_USER}" git fetch origin main
sudo -u "${APP_USER}" git reset --hard origin/main

NEW_COMMIT=$(git rev-parse --short HEAD)
log "New commit: ${NEW_COMMIT}"

if [[ "${OLD_COMMIT}" == "${NEW_COMMIT}" ]]; then
    log "No changes to deploy"
    exit 0
fi

# Show changes
echo -e "${YELLOW}Changes:${NC}"
git log --oneline "${OLD_COMMIT}..${NEW_COMMIT}"

# Install dependencies
log "Installing dependencies..."
sudo -u "${APP_USER}" npm ci --production=false

# Prisma
log "Running Prisma..."
sudo -u "${APP_USER}" npx prisma generate
sudo -u "${APP_USER}" npx prisma migrate deploy

# Build
log "Building..."
sudo -u "${APP_USER}" npm run build

# Reload
log "Reloading PM2..."
sudo -u "${APP_USER}" pm2 reload packattack --update-env

# Health check
sleep 3
HEALTH=$(curl -s http://localhost:3000/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [[ "${HEALTH}" == "healthy" ]]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     DEPLOYMENT SUCCESSFUL ✓                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    log "Deployment successful: ${OLD_COMMIT} -> ${NEW_COMMIT}"
else
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     DEPLOYMENT FAILED - CHECK LOGS         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
    log "Deployment failed - health status: ${HEALTH}"
    pm2 logs packattack --lines 50
    exit 1
fi
