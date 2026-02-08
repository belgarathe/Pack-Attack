# Pack Attack - Secure Deployment Guide

## Overview

This document describes the security architecture and deployment procedures for Pack Attack. The deployment implements defense-in-depth with multiple layers of security.

---

## Security Architecture

### Layer 1: Network Security

| Component | Implementation |
|-----------|----------------|
| **Firewall** | UFW with default-deny, only ports 22, 80, 443 open |
| **DDoS Protection** | Nginx rate limiting + Fail2Ban |
| **SSL/TLS** | TLSv1.2/1.3 only, A+ SSL Labs rating |
| **HSTS** | 1 year, includeSubDomains, preload |

### Layer 2: Application Security

| Component | Implementation |
|-----------|----------------|
| **Authentication** | NextAuth with JWT sessions |
| **Rate Limiting** | Multi-tier (login: 1/s, API: 10/s, general: 30/s) |
| **CSRF Protection** | Same-origin policy + security headers |
| **Input Validation** | Zod schema validation on all endpoints |
| **SQL Injection** | Prisma ORM with parameterized queries |

### Layer 3: Server Security

| Component | Implementation |
|-----------|----------------|
| **SSH** | Key-only auth, no root, rate limited |
| **Process Isolation** | Non-root app user, PM2 process manager |
| **Auto Updates** | Unattended security updates |
| **Intrusion Detection** | Fail2Ban, audit logging, AIDE |
| **Malware Scanning** | ClamAV, rkhunter, chkrootkit |

### Layer 4: Data Security

| Component | Implementation |
|-----------|----------------|
| **Database** | SSL connection, connection pooling |
| **Secrets** | Environment variables, restricted permissions |
| **Backups** | Daily automated, 30-day retention |
| **Encryption** | HTTPS everywhere, secure cookies |

---

## Security Headers

All responses include these security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
```

---

## Rate Limiting Configuration

| Endpoint Pattern | Rate | Burst | Purpose |
|-----------------|------|-------|---------|
| `/api/auth/*` | 1/s | 3 | Prevent brute force |
| `/api/payments/*` | 1/s | 3 | Prevent payment abuse |
| `/api/*` | 10/s | 20 | General API protection |
| `/*` | 30/s | 50 | General pages |

Exceeded limits return HTTP 429 and trigger Fail2Ban.

---

## Deployment Procedures

### Pre-Deployment Validation (CRITICAL)

**Run before every deployment to prevent vulnerable code:**

```bash
# Navigate to project root
cd /path/to/Pack-Attack

# Run pre-deployment security check
chmod +x scripts/pre-deploy-security-check.sh
./scripts/pre-deploy-security-check.sh
```

**This check validates:**
- ✅ Next.js version >= 16.1.6 (CVE-2025-66478 patched)
- ✅ npm audit shows 0 high/critical vulnerabilities  
- ✅ `withRetry` usage in critical database routes
- ✅ Global error handlers in `src/instrumentation.ts`
- ✅ DATABASE_URL has connection pooling parameters
- ✅ No hardcoded secrets in code
- ✅ TypeScript compiles without errors
- ✅ PM2 and Prisma configurations present

**❌ Deployment MUST NOT proceed if critical checks fail!**

---

### Initial Deployment

```bash
# 1. Prepare server (Ubuntu 22.04+)
# 2. Add SSH key to server
ssh root@YOUR_SERVER_IP
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit

# 3. Copy deployment files
scp .env.production root@YOUR_SERVER_IP:/root/
scp -r scripts root@YOUR_SERVER_IP:/root/

# 4. Connect and run hardening
ssh root@YOUR_SERVER_IP
git clone https://github.com/belgarathe/Pack-Attack.git
cd Pack-Attack

# 5. Run server hardening first (includes ClamAV)
chmod +x scripts/server-security-hardening.sh
sudo ./scripts/server-security-hardening.sh

# 6. Run secure deployment
chmod +x scripts/secure-deploy.sh
sudo ./scripts/secure-deploy.sh
```

---

### Post-Deployment Verification (REQUIRED)

**Run immediately after deployment:**

```bash
# On server
cd /var/www/packattack/app
sudo bash scripts/post-deploy-security-scan.sh
```

**This scan verifies:**
- ✅ Application health endpoint responding
- ✅ No malware processes (OFHyIf, ZE8sNYuzb, kworker, etc.)
- ✅ /dev/shm is clean (no executables)
- ✅ Malware C2 IP (91.92.241.10) is blocked
- ✅ PM2 process running and stable
- ✅ Security headers present
- ✅ File permissions secure (.env = 600)
- ✅ Database connectivity with retry logic
- ✅ Memory usage < 80%
- ✅ Nginx and Fail2Ban active
- ✅ Disk space < 80%
- ✅ SSL certificate valid > 30 days

**⚠️ Fix any errors before considering deployment successful!**

---

### Continuous Monitoring Setup

**Setup 2-minute security monitoring:**

```bash
# On server (run once after deployment)
cd /var/www/packattack/app
chmod +x scripts/setup-continuous-monitoring.sh
sudo ./scripts/setup-continuous-monitoring.sh
```

**Monitors every 2 minutes for:**
- 🔴 Malware processes and /dev/shm executables
- 🔴 Memory usage > 85%
- 🔴 PM2 restarts > 50
- 🔴 Application health failures
- 🔴 Disk space > 90%
- 🔴 Connections to malware C2 servers
- 🔴 ClamAV/Fail2Ban not running

**Alerts logged to:** `/var/log/packattack/security-alerts.log`

---

### Update Deployment

```bash
# Option 1: Full secure deploy (recommended)
sudo packattack-deploy

# Option 2: Quick deploy (after initial setup)
sudo ./scripts/quick-deploy.sh

# After any deployment, always run:
sudo bash scripts/post-deploy-security-scan.sh
```

### Rollback

```bash
# List backups
ls -la /var/backups/packattack/

# Restore application
cd /var/www/packattack/app
tar -xzf /var/backups/packattack/app_YYYYMMDD_HHMMSS.tar.gz
npm ci && npm run build
pm2 reload packattack
```

---

## Monitoring Commands

```bash
# Application status
pm2 status
pm2 monit
pm2 show packattack  # Detailed info including restart count

# Application logs
pm2 logs packattack
pm2 logs packattack --lines 100 --err  # Error logs only
tail -f /var/log/packattack/pm2-out.log

# Security monitoring logs
tail -f /var/log/packattack/security-alerts.log  # Real-time alerts
tail -f /var/log/packattack/security-monitor.log  # Detailed monitoring
grep "ALERT" /var/log/packattack/security-alerts.log  # All alerts

# Security tools status
sudo fail2ban-client status
sudo fail2ban-client status sshd  # SSH-specific
sudo systemctl status clamav-daemon  # Malware scanner
sudo ausearch -k packattack_app  # Audit logs

# Malware checks
ps aux | grep -E "(OFHyIf|ZE8sNYuzb|kworker)" | grep -v grep  # Known malware
ls -la /dev/shm  # Check for suspicious files
sudo clamscan --infected --recursive /dev/shm  # Scan /dev/shm

# Health check
curl https://pack-attack.de/api/health  # Production
curl http://localhost:3000/api/health  # Local

# SSL certificate status
sudo certbot certificates
openssl s_client -connect pack-attack.de:443 -servername pack-attack.de </dev/null | openssl x509 -noout -dates

# Resource usage
free -h  # Memory
df -h  # Disk space
top -bn1 | head -20  # CPU and processes
```

---

## Incident Response

### Attack Detected

1. Check Fail2Ban: `sudo fail2ban-client status sshd`
2. Check nginx logs: `tail -f /var/log/packattack/nginx-access.log`
3. Block IP manually if needed: `sudo ufw deny from IP_ADDRESS`
4. Review audit logs: `sudo ausearch -ts recent`

### Server Compromise Suspected

1. **Isolate**: Disconnect from network if possible
2. **Preserve**: Don't modify - copy logs first
3. **Investigate**: Check audit logs, file integrity
4. **Recover**: Restore from known-good backup
5. **Report**: Document incident timeline

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Restart nginx
sudo systemctl reload nginx
```

---

## Security Checklist

### Pre-Deployment (MUST pass ALL)

**Code Quality:**
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] Next.js version >= 16.1.6 (CVE-2025-66478 patched)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Run `scripts/pre-deploy-security-check.sh` - all checks pass

**Infrastructure:**
- [ ] Fresh Ubuntu 22.04+ server OR hardened existing server
- [ ] SSH key pair generated and ready
- [ ] Domain DNS pointing to server IP (82.165.66.236)

**Configuration:**
- [ ] `.env.production` created with all required variables
- [ ] `DATABASE_URL` includes `?connection_limit=10&pool_timeout=30`
- [ ] `NEXTAUTH_SECRET` >= 32 characters (generated with `openssl rand -base64 32`)
- [ ] `RESEND_API_KEY` configured for email
- [ ] SSH public key ready to add to server

**Application Code:**
- [ ] `src/instrumentation.ts` exists with global error handlers
- [ ] Critical routes use `withRetry` for database operations
- [ ] `ecosystem.config.cjs` configured with memory limits
- [ ] No hardcoded secrets in code

---

### During Deployment

- [ ] Run `scripts/server-security-hardening.sh` first (includes ClamAV)
- [ ] Run `scripts/secure-deploy.sh` with `.env.production`
- [ ] Monitor deployment logs for errors
- [ ] Verify no "Engine is not yet connected" errors
- [ ] Verify no "ECONNREFUSED" database errors

---

### Post-Deployment (Within 1 hour - REQUIRED)

**Security Scan:**
- [ ] Run `scripts/post-deploy-security-scan.sh` - 0 errors
- [ ] Verify health endpoint: `curl https://pack-attack.de/api/health`
- [ ] Check SSL Labs: https://www.ssllabs.com/ssltest/ (Grade A+)
- [ ] Run `sudo lynis audit system` - score >= 75/100

**Malware Prevention:**
- [ ] No malware processes: `ps aux | grep -E "(OFHyIf|kworker)"`
- [ ] `/dev/shm` is clean: `ls -la /dev/shm`
- [ ] ClamAV active: `sudo systemctl status clamav-daemon`
- [ ] Malware C2 IP blocked: `sudo iptables -L -n | grep 91.92.241.10`

**Application Health:**
- [ ] PM2 status "online": `pm2 status`
- [ ] PM2 restart count < 5: `pm2 show packattack`
- [ ] Memory usage < 600MB: `free -h`
- [ ] No errors in logs: `pm2 logs packattack --lines 50 --err`
- [ ] Monitor for 30 minutes: `pm2 logs packattack --lines 100`

**Security Services:**
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] Fail2Ban active: `sudo fail2ban-client status`
- [ ] UFW firewall active: `sudo ufw status`
- [ ] Automatic updates enabled: `sudo systemctl status unattended-upgrades`

**Continuous Monitoring:**
- [ ] Run `scripts/setup-continuous-monitoring.sh` (sets up 2-min checks)
- [ ] Verify cron job: `crontab -l | grep packattack-continuous-monitor`
- [ ] Check initial run: `tail -20 /var/log/packattack/security-monitor.log`

---

### Daily Monitoring

- [ ] Review security alerts: `tail -50 /var/log/packattack/security-alerts.log`
- [ ] Check PM2 restart count: `pm2 show packattack | grep "restart time"`
- [ ] Monitor memory: `free -h` (should stay < 600MB)
- [ ] Check application health: `curl https://pack-attack.de/api/health`
- [ ] Review Fail2Ban bans: `sudo fail2ban-client status sshd`

---

### Weekly

- [ ] Review full security logs: `grep "ALERT" /var/log/packattack/security-alerts.log`
- [ ] Check for malware: `sudo clamscan --infected --recursive /var/www/packattack`
- [ ] Review PM2 logs for patterns: `pm2 logs packattack --lines 1000`
- [ ] Check disk space: `df -h` (should be < 80%)
- [ ] Verify SSL certificate validity: `sudo certbot certificates`

---

### Monthly

- [ ] Run full security audit: `sudo lynis audit system`
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Review npm dependencies: `npm audit`
- [ ] Test database backup restore
- [ ] Review and rotate credentials if needed
- [ ] Check ClamAV virus definitions: `freshclam`

---

### Quarterly

- [ ] Full security penetration test
- [ ] Review all firewall rules: `sudo ufw status verbose`
- [ ] Audit user accounts: `sudo ausearch -m USER_LOGIN`
- [ ] Review and update security policies
- [ ] Check for CVE announcements for all dependencies

---

## Environment Variables

Required in `.env.production`:

```bash
# Database (with connection pooling)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10&pool_timeout=30"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="minimum-32-character-secret"

# Domain
DOMAIN="your-domain.com"
ADMIN_EMAIL="admin@your-domain.com"

# Optional
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
RESEND_API_KEY="..."
```

---

## Compliance Notes

This deployment implements controls for:

- **OWASP Top 10**: XSS, CSRF, Injection, etc.
- **CIS Benchmarks**: Server hardening
- **SSL/TLS Best Practices**: Modern ciphers only
- **PCI DSS**: (partial) Secure transmission, access control

---

---

## Past Security Incidents & Prevention

### CVE-2025-66478: Next.js RCE Malware Attack (Jan 2026)

**Incident:** Next.js 16.0.3 RCE vulnerability allowed crypto miner installation
- Malware processes: OFHyIf, ZE8sNYuzb in `/dev/shm`
- C2 server: 91.92.241.10:235
- High CPU/memory usage (337% CPU, 2.4GB RAM)

**Prevention Now:**
- ✅ Pre-deployment check enforces Next.js >= 16.1.6
- ✅ ClamAV real-time scanning of `/dev/shm`
- ✅ Continuous monitoring every 2 minutes for known malware
- ✅ C2 IP permanently blocked in iptables
- ✅ Automatic process killing for `/dev/shm` executables

### Database Connection Instability

**Incident:** Prisma connection errors, "Engine is not yet connected", crashes

**Prevention Now:**
- ✅ `withRetry` wrapper enforced on critical routes
- ✅ DATABASE_URL must include `connection_limit` and `pool_timeout`
- ✅ Global error handlers in `src/instrumentation.ts`
- ✅ Database heartbeat enabled (30s interval)
- ✅ PM2 memory limits (600MB) to prevent leaks

### Memory Leaks

**Incident:** Rate limiter unbounded growth causing OOM

**Prevention Now:**
- ✅ Rate limiter has max entries limit
- ✅ PM2 restarts at 600MB memory
- ✅ Continuous monitoring alerts at 85% memory
- ✅ Daily PM2 restart at 4 AM UTC

---

## New Security Features (Feb 2026)

### Pre-Deployment Validation
- Automated security checks before every deployment
- Prevents vulnerable code from reaching production
- Script: `scripts/pre-deploy-security-check.sh`

### Post-Deployment Scanning
- Comprehensive security verification after deployment
- 15-point security checklist
- Script: `scripts/post-deploy-security-scan.sh`

### Continuous Monitoring
- Every 2 minutes: malware, memory, health, disk checks
- Automatic alert logging and process killing
- Script: `scripts/setup-continuous-monitoring.sh`

### ClamAV Integration
- Real-time malware scanning of `/dev/shm`
- Automatic quarantine of suspicious files
- Daily virus definition updates

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-02 | 2.0 | Enhanced security: pre-deploy validation, post-deploy scanning, continuous monitoring, ClamAV integration |
| 2026-01-28 | 1.1 | Fixed CVE-2025-66478, added database retry logic, memory leak fixes |
| 2026-01-27 | 1.0 | Initial secure deployment |
