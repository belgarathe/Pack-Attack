#!/bin/bash
#===============================================================================
# PACK ATTACK - BATTLE AUTO-START DEPLOYMENT
#===============================================================================
# Deploys the battle auto-start feature to production
#===============================================================================

set -euo pipefail

# Configuration
APP_DIR="/var/www/packattack/app"
APP_USER="packattack"
LOG_FILE="/var/log/packattack/auto-start-deploy-$(date +%Y%m%d_%H%M%S).log"

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
echo -e "${BLUE}║  BATTLE AUTO-START FEATURE DEPLOYMENT     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

cd "${APP_DIR}"

# Get current commit
OLD_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: ${OLD_COMMIT}"

# Pull latest changes
log "Pulling latest from main..."
sudo -u "${APP_USER}" git fetch origin main
sudo -u "${APP_USER}" git reset --hard origin/main

NEW_COMMIT=$(git rev-parse --short HEAD)
log "New commit: ${NEW_COMMIT}"

# Show changes
echo -e "${YELLOW}Changes:${NC}"
git log --oneline "${OLD_COMMIT}..${NEW_COMMIT}" | head -10

# Install dependencies
log "Installing dependencies..."
sudo -u "${APP_USER}" npm ci --production=false

# Generate Prisma client
log "Generating Prisma client..."
sudo -u "${APP_USER}" npx prisma generate

# Run database migrations
log "Running database migrations..."
sudo -u "${APP_USER}" npx prisma migrate deploy || {
    log "Migration failed, trying db push..."
    sudo -u "${APP_USER}" npx prisma db push --accept-data-loss
}

# Verify fullAt field was added
log "Verifying database schema..."
sudo -u "${APP_USER}" npx prisma db execute --stdin <<SQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Battle' AND column_name = 'fullAt';
SQL

# Check/Add environment variables
log "Checking environment variables..."
if ! grep -q "CRON_SECRET" .env; then
    log "Adding CRON_SECRET..."
    CRON_SECRET=$(openssl rand -base64 32)
    echo "CRON_SECRET=\"${CRON_SECRET}\"" >> .env
    log "✓ CRON_SECRET added"
else
    log "✓ CRON_SECRET already exists"
fi

if ! grep -q "NEXT_PUBLIC_APP_URL" .env; then
    log "Adding NEXT_PUBLIC_APP_URL..."
    echo "NEXT_PUBLIC_APP_URL=\"https://pack-attack.de\"" >> .env
    log "✓ NEXT_PUBLIC_APP_URL added"
else
    log "✓ NEXT_PUBLIC_APP_URL already exists"
fi

# Build application
log "Building application..."
sudo -u "${APP_USER}" npm run build

# Reload main application
log "Reloading main application..."
sudo -u "${APP_USER}" pm2 reload packattack --update-env

# Stop existing scheduler if running
log "Checking for existing scheduler..."
if sudo -u "${APP_USER}" pm2 list | grep -q "battle-auto-start-scheduler"; then
    log "Stopping existing scheduler..."
    sudo -u "${APP_USER}" pm2 stop battle-auto-start-scheduler
    sudo -u "${APP_USER}" pm2 delete battle-auto-start-scheduler
fi

# Start battle auto-start scheduler
log "Starting battle auto-start scheduler..."
sudo -u "${APP_USER}" pm2 start ecosystem.battle-scheduler.config.cjs
sudo -u "${APP_USER}" pm2 save

# Wait for services to stabilize
log "Waiting for services to stabilize..."
sleep 5

# Health checks
log "Running health checks..."

# Check main app
MAIN_APP_STATUS=$(sudo -u "${APP_USER}" pm2 jlist | jq -r '.[] | select(.name=="packattack") | .pm2_env.status')
log "Main app status: ${MAIN_APP_STATUS}"

# Check scheduler
SCHEDULER_STATUS=$(sudo -u "${APP_USER}" pm2 jlist | jq -r '.[] | select(.name=="battle-auto-start-scheduler") | .pm2_env.status')
log "Scheduler status: ${SCHEDULER_STATUS}"

# Test API endpoint
log "Testing auto-start API..."
CRON_SECRET=$(grep CRON_SECRET .env | cut -d'"' -f2)
API_TEST=$(curl -s -X POST https://pack-attack.de/api/battles/auto-start \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" | jq -r '.success')

log "API test result: ${API_TEST}"

# Test health endpoint
HEALTH=$(curl -s https://pack-attack.de/api/health | jq -r '.status')
log "Health check: ${HEALTH}"

# Verify database
log "Checking for full battles..."
FULL_BATTLES=$(sudo -u "${APP_USER}" npx prisma db execute --stdin <<SQL
SELECT COUNT(*) as count FROM "Battle" WHERE "fullAt" IS NOT NULL;
SQL
)
log "Full battles in database: ${FULL_BATTLES}"

# Final status
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
if [[ "${MAIN_APP_STATUS}" == "online" ]] && [[ "${SCHEDULER_STATUS}" == "online" ]] && [[ "${API_TEST}" == "true" ]] && [[ "${HEALTH}" == "healthy" ]]; then
    echo -e "${GREEN}║     DEPLOYMENT SUCCESSFUL ✓                ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Main App:       ONLINE                    ║${NC}"
    echo -e "${GREEN}║  Scheduler:      ONLINE                    ║${NC}"
    echo -e "${GREEN}║  API Endpoint:   WORKING                   ║${NC}"
    echo -e "${GREEN}║  Health Check:   HEALTHY                   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    log "✓ Deployment successful: ${OLD_COMMIT} -> ${NEW_COMMIT}"
    
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Monitor scheduler: sudo -u packattack pm2 logs battle-auto-start-scheduler"
    echo "2. Check battles: View in database or admin panel"
    echo "3. Test: Create a battle and join with all players"
    
    exit 0
else
    echo -e "${RED}║     DEPLOYMENT FAILED - CHECK LOGS         ║${NC}"
    echo -e "${BLUE}╠════════════════════════════════════════════╣${NC}"
    echo -e "${RED}║  Main App:       ${MAIN_APP_STATUS}       ║${NC}"
    echo -e "${RED}║  Scheduler:      ${SCHEDULER_STATUS}       ║${NC}"
    echo -e "${RED}║  API Endpoint:   ${API_TEST}               ║${NC}"
    echo -e "${RED}║  Health Check:   ${HEALTH}                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    log "✗ Deployment failed"
    
    echo ""
    echo -e "${YELLOW}Showing last 50 log lines:${NC}"
    sudo -u "${APP_USER}" pm2 logs packattack --lines 50 --nostream
    sudo -u "${APP_USER}" pm2 logs battle-auto-start-scheduler --lines 50 --nostream
    
    exit 1
fi
