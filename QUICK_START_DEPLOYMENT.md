# Quick Start: Secure Deployment to Production

**Server**: 82.165.66.236 (pack-attack.de)  
**Status**: Ready for deployment with enhanced security

---

## Prerequisites ✅

- [x] SSH key generated: `c:\PA\.deploy-keys\id_ed25519_packattack_deploy`
- [x] Server IP: 82.165.66.236
- [x] Database: Neon PostgreSQL (pooled connection)
- [x] Email API: Resend configured
- [x] Security scripts: All created and tested

---

## Step-by-Step Deployment

### 1. Pre-Deployment Validation (Local)

```bash
cd c:\PA

# Run security check (MUST PASS before deploying)
bash scripts/pre-deploy-security-check.sh
```

**❌ STOP if any critical checks fail! Fix issues first.**

---

### 2. Create Production Environment File

```bash
cd c:\PA

# Copy template
copy .env.production.template .env.production

# Edit .env.production and set:
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - Verify DATABASE_URL has connection_limit=10&pool_timeout=30
# - Set ADMIN_PASSWORD for initial admin user
```

**Required variables**:
- `DATABASE_URL` (already filled with Neon connection)
- `NEXTAUTH_SECRET` (generate new one)
- `ADMIN_PASSWORD` (set secure password)
- `RESEND_API_KEY` (already filled)

---

### 3. Add SSH Key to Server

```bash
# Connect to server
ssh root@82.165.66.236

# Add deployment SSH key
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMs8X/8yo4lvUaLnfUVrv9RUt+pUkXjz5KnDVb+XrE9T packattack-deploy-2026-02-02" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Exit
exit
```

---

### 4. Copy Files to Server

```bash
cd c:\PA

# Copy environment file
scp -i .deploy-keys\id_ed25519_packattack_deploy .env.production root@82.165.66.236:/root/

# You should see: .env.production 100%
```

---

### 5. Server Setup (First Time Only)

```bash
# Connect to server with SSH key
ssh -i c:\PA\.deploy-keys\id_ed25519_packattack_deploy root@82.165.66.236

# Clone repository
cd /root
git clone https://github.com/belgarathe/Pack-Attack.git
cd Pack-Attack

# Copy environment file to repo
cp /root/.env.production .

# Step 1: Server Hardening (includes ClamAV malware protection)
chmod +x scripts/server-security-hardening.sh
sudo bash scripts/server-security-hardening.sh

# ⏱️ This takes 5-10 minutes
# Installs: UFW, Fail2Ban, ClamAV, AIDE, auditd, Lynis, etc.
```

---

### 6. Secure Deployment

```bash
# Still on server, in /root/Pack-Attack

# Step 2: Run secure deployment
chmod +x scripts/secure-deploy.sh
sudo bash scripts/secure-deploy.sh

# ⏱️ This takes 10-20 minutes
# - Creates packattack user
# - Installs Node.js 20
# - Configures Nginx with rate limiting
# - Installs SSL certificate (Let's Encrypt)
# - Deploys application
# - Configures PM2
# - Sets up backup scripts

# Follow prompts:
# - Domain: pack-attack.de
# - Admin Email: admin@pack-attack.de
```

---

### 7. Post-Deployment Verification (CRITICAL)

```bash
# Still on server

# Step 3: Run security scan
cd /var/www/packattack/app
sudo bash scripts/post-deploy-security-scan.sh

# Must show: 0 errors, ✅ all checks passed
```

**If errors appear**: Fix them before proceeding!

---

### 8. Setup Continuous Monitoring

```bash
# Still on server

# Step 4: Enable 2-minute security monitoring
chmod +x scripts/setup-continuous-monitoring.sh
sudo bash scripts/setup-continuous-monitoring.sh

# Monitors for: malware, memory leaks, health issues, disk space
```

---

### 9. Verify Deployment

```bash
# Check application health
curl http://localhost:3000/api/health

# Should return: {"status":"healthy",...}

# Check PM2 status
pm2 status

# Should show: packattack | online | 0 restarts

# Monitor logs for 30 minutes
pm2 logs packattack --lines 100

# Watch for errors (Ctrl+C to exit)
```

---

### 10. External Verification

**From your local machine**:

```bash
# Health check
curl https://pack-attack.de/api/health

# Should return: {"status":"healthy"}
```

**SSL Labs Test**:
- Open: https://www.ssllabs.com/ssltest/
- Enter: pack-attack.de
- Wait for scan
- Expected grade: **A+**

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Security alerts
tail -50 /var/log/packattack/security-alerts.log

# Application health
curl https://pack-attack.de/api/health

# PM2 status and restart count
pm2 show packattack

# Memory usage (should be < 600MB)
free -h
```

### View Logs

```bash
# Real-time application logs
pm2 logs packattack

# Error logs only
pm2 logs packattack --err --lines 50

# Security monitoring
tail -f /var/log/packattack/security-monitor.log

# Security alerts only
tail -f /var/log/packattack/security-alerts.log
```

### Check for Malware

```bash
# Known malware processes
ps aux | grep -E "(OFHyIf|ZE8sNYuzb|kworker)" | grep -v grep

# Should return: empty (no results)

# Check /dev/shm (where malware was previously found)
ls -la /dev/shm

# Should be empty or only system files

# ClamAV scan
sudo clamscan --infected --recursive /var/www/packattack
```

---

## Updating Application

```bash
# Connect to server
ssh -i c:\PA\.deploy-keys\id_ed25519_packattack_deploy root@82.165.66.236

# Quick update (recommended)
sudo /usr/local/bin/packattack-deploy

# Or manual update
cd /var/www/packattack/app
sudo -u packattack git pull origin main
sudo -u packattack npm ci
sudo -u packattack npx prisma generate
sudo -u packattack npx prisma migrate deploy
sudo -u packattack npm run build
sudo -u packattack pm2 reload packattack

# Always verify after update
sudo bash scripts/post-deploy-security-scan.sh
```

---

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs packattack --err --lines 100

# Check environment variables
cat /var/www/packattack/app/.env | grep -v PASSWORD

# Restart PM2
pm2 restart packattack

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

### Database connection errors

```bash
# Test database connection
cd /var/www/packattack/app
node -e "const { prisma } = require('./.next/server/chunks/ssr/node_modules/.prisma/client/index.js'); prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ DB OK')).catch(e => console.log('❌', e.message));"

# Check DATABASE_URL
grep DATABASE_URL /var/www/packattack/app/.env

# Should include: connection_limit=10&pool_timeout=30
```

### High memory usage

```bash
# Check memory
free -h
pm2 show packattack

# Restart if memory > 600MB
pm2 restart packattack

# Check for memory leaks
pm2 monit
```

### Security alerts

```bash
# View all alerts
cat /var/log/packattack/security-alerts.log

# Check if malware detected
ps aux | grep -E "(OFHyIf|ZE8sNYuzb)"

# Kill suspicious processes
sudo pkill -9 -f "/dev/shm/"

# Check ClamAV status
sudo systemctl status clamav-daemon

# Restart monitoring
sudo systemctl restart clamav-daemon
```

---

## Emergency Procedures

### Application down

```bash
pm2 restart packattack
pm2 logs packattack --lines 50
```

### Suspected security breach

```bash
# 1. Check for malware
sudo bash /var/www/packattack/app/scripts/post-deploy-security-scan.sh

# 2. Review recent logs
pm2 logs packattack --lines 500
tail -100 /var/log/packattack/security-alerts.log

# 3. Check audit logs
sudo ausearch -ts recent -k packattack_app

# 4. If compromised, restore from backup
cd /var/backups/packattack
ls -lt | head -10
# Restore most recent backup
```

---

## Success Indicators

✅ Deployment successful when:

1. Health endpoint returns "healthy"
2. PM2 shows "online" with < 5 restarts
3. SSL Labs grade: A+
4. No malware in `/dev/shm`
5. Memory usage < 600MB
6. No errors in `/var/log/packattack/security-alerts.log`
7. Lynis score >= 75/100
8. Application responds at https://pack-attack.de

---

## Next Steps

- [ ] Test login/register flows
- [ ] Create first admin user
- [ ] Add card data for boxes
- [ ] Test payment integration
- [ ] Set up backups schedule
- [ ] Configure email notifications for alerts
- [ ] Add GitHub Actions for CI/CD

---

**Ready to deploy!** Follow steps 1-10 above in order.

For detailed information, see:
- [DEPLOYMENT_SECURITY.md](c:\PA\DEPLOYMENT_SECURITY.md) - Complete security guide
- [.cursor/SECURE_DEPLOYMENT_IMPLEMENTATION_SUMMARY.md](c:\PA\.cursor\SECURE_DEPLOYMENT_IMPLEMENTATION_SUMMARY.md) - What was implemented
