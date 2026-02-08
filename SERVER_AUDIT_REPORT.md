# Server Audit Report - PM2 Issue
**Date:** 2026-02-02  
**Status:** Site Operational, PM2 Needs Fix

## Issues Discovered

### 1. **Root Cause: Orphaned Node Processes**
- Node.js processes keep starting outside PM2 control
- Running as `root` user instead of `packattack` user
- Blocking port 3000, preventing PM2 from managing the app
- Site works but is NOT managed or monitored by PM2

### 2. **PM2 Configuration**
- ✅ Created `ecosystem.config.js` - **DEPLOYED**
- ✅ File exists on server at `/var/www/packattack/app/ecosystem.config.js`
- ✅ PM2 systemd service created: `pm2-packattack`
- ✅ PM2 configured to auto-start on reboot
- ❌ PM2 currently in "errored" state due to port conflicts

### 3. **No Automated Startup Found**
Checked all common startup mechanisms:
- ✅ No cron jobs starting the app
- ✅ No systemd service (other than PM2)
- ✅ No rc.local startup script
- ✅ No init.d scripts
- ✅ No .bashrc/.profile startup commands
- ✅ Nginx only proxies, doesn't start the app

### 4. **Mystery: What Starts the Processes?**
The orphaned processes are manually started or started by a mechanism we haven't identified yet.
Most likely: someone SSHs in and runs `npm start` or `npm run dev` directly.

## Solution Implemented

### 1. **PM2 Ecosystem Configuration** ✅
```javascript
// /var/www/packattack/app/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'packattack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/packattack/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/packattack/.pm2/logs/packattack-error.log',
    out_file: '/home/packattack/.pm2/logs/packattack-out.log',
    log_file: '/home/packattack/.pm2/logs/packattack-combined.log',
    time: true
  }]
};
```

### 2. **Cleanup Script Created** ✅
Created `pm2-cleanup.sh` for aggressive cleanup and restart.

## Next Steps (To Be Completed)

### Immediate Actions:
1. **Kill all orphaned Node processes:**
   ```bash
   pkill -9 -f next-server
   pkill -9 -f "npm start"
   ```

2. **Start with PM2:**
   ```bash
   cd /var/www/packattack/app
   sudo -u packattack pm2 delete all
   sudo -u packattack pm2 start ecosystem.config.js
   sudo -u packattack pm2 save
   ```

3. **Enable and start PM2 systemd service:**
   ```bash
   sudo systemctl start pm2-packattack
   sudo systemctl status pm2-packattack
   ```

### Long-term Solutions:
1. **Create deployment script** that always uses PM2
2. **Document proper restart procedure** for team
3. **Monitor for orphaned processes** with a cron job
4. **Add alerts** if PM2 goes down

## Current Site Status
- ✅ Website: https://pack-attack.de - **OPERATIONAL**
- ✅ API Health: `/api/health` - **200 OK**
- ⚠️ PM2: **NOT MANAGING** the running process
- ⚠️ SSH: Temporarily rate-limited from rapid audit connections

## Risk Assessment
**Low Risk:** Site is operational but not properly managed.
- If the process crashes, it won't auto-restart
- No monitoring or logging through PM2
- Memory leaks won't be caught
- No graceful restarts possible

## Recommendation
Complete the cleanup and restart procedure as soon as SSH access is restored.
