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

### Initial Deployment

```bash
# 1. Prepare server (Ubuntu 22.04+)
# 2. Copy .env.production with credentials
# 3. Run secure deployment
chmod +x scripts/secure-deploy.sh
sudo ./scripts/secure-deploy.sh
```

### Update Deployment

```bash
# Option 1: Full secure deploy
sudo packattack-deploy

# Option 2: Quick deploy (after initial setup)
sudo ./scripts/quick-deploy.sh
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

# Application logs
pm2 logs packattack
tail -f /var/log/packattack/pm2-out.log

# Security logs
sudo fail2ban-client status
sudo tail -f /var/log/fail2ban.log
sudo ausearch -k packattack_app

# Health check
curl https://your-domain.com/api/health
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

### Pre-Deployment

- [ ] Fresh Ubuntu 22.04+ server
- [ ] SSH key access configured
- [ ] Domain DNS pointing to server
- [ ] .env.production file ready
- [ ] DATABASE_URL with SSL and connection pooling

### Post-Deployment

- [ ] HTTPS working (test with curl)
- [ ] SSL Labs test: A+ rating
- [ ] Health endpoint responding
- [ ] Fail2Ban active
- [ ] Firewall rules verified
- [ ] Auto-updates enabled
- [ ] Backups configured

### Ongoing

- [ ] Weekly security update review
- [ ] Monthly backup restore test
- [ ] Quarterly password rotation
- [ ] Annual security audit

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

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | 1.0 | Initial secure deployment |
