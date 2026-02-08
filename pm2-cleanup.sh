#!/bin/bash
# PM2 Cleanup and Restart Script
# This ensures only PM2-managed processes run

echo "=== PM2 Cleanup and Restart Script ==="
echo "Starting at: $(date)"

# Stop PM2
echo "Stopping PM2..."
sudo -u packattack pm2 stop all
sudo -u packattack pm2 delete all

# Kill ALL node processes (aggressive cleanup)
echo "Killing all node/next processes..."
pkill -9 -f "next-server"
pkill -9 -f "npm start"
pkill -9 -f "node.*3000"
sleep 2

# Verify port 3000 is free
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Port 3000 still in use, force killing..."
    lsof -ti :3000 | xargs -r kill -9
    sleep 2
fi

# Start fresh with PM2
echo "Starting with PM2 ecosystem..."
cd /var/www/packattack/app
sudo -u packattack pm2 start ecosystem.config.js
sudo -u packattack pm2 save

# Verify
echo ""
echo "=== Final Status ==="
sudo -u packattack pm2 list
echo ""
lsof -i :3000
echo ""
echo "Cleanup complete at: $(date)"
