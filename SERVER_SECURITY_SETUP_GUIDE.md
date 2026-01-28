# Pack-Attack Server Security Setup Guide

This guide documents how to set up a new server with state-of-the-art security BEFORE deploying the application.

## Quick Start

```bash
# 1. SSH into your fresh Ubuntu 24.04 server
ssh root@YOUR_SERVER_IP

# 2. Download and run the security hardening script
curl -O https://raw.githubusercontent.com/YOUR_REPO/main/scripts/server-security-hardening.sh
chmod +x server-security-hardening.sh
sudo bash server-security-hardening.sh

# 3. Follow the post-hardening steps below
```

---

## Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Server Requirements](#server-requirements)
3. [Initial Server Setup](#initial-server-setup)
4. [Security Hardening](#security-hardening)
5. [Application User Setup](#application-user-setup)
6. [Nginx Installation](#nginx-installation)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Application Deployment](#application-deployment)
9. [Post-Deployment Security](#post-deployment-security)
10. [Ongoing Security Maintenance](#ongoing-security-maintenance)

---

## Pre-Deployment Security Checklist

Before deploying, ensure ALL items are checked:

### Server Level
- [ ] Ubuntu 24.04 LTS installed
- [ ] All system packages updated
- [ ] SSH hardened (key-only auth)
- [ ] Firewall configured (UFW)
- [ ] Fail2Ban active
- [ ] Audit daemon configured
- [ ] Kernel hardening applied
- [ ] Automatic security updates enabled

### Application Level
- [ ] npm audit shows 0 vulnerabilities
- [ ] Environment variables secured
- [ ] Database connection encrypted
- [ ] Rate limiting configured
- [ ] Input validation in place

### Network Level
- [ ] Only ports 22, 80, 443 exposed
- [ ] SSL/TLS properly configured
- [ ] Security headers set
- [ ] DDoS protection active

---

## Server Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 40 GB SSD | 80+ GB SSD |
| Network | 100 Mbps | 1 Gbps |

---

## Initial Server Setup

### 1. First Login

```bash
# Connect to server (first time may use password)
ssh root@YOUR_SERVER_IP

# Update system immediately
apt update && apt upgrade -y
```

### 2. Create SSH Key (on your local machine)

```bash
# Generate a new SSH key for this server
ssh-keygen -t ed25519 -C "packattack-$(date +%Y-%m-%d)" -f ~/.ssh/id_ed25519_packattack

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519_packattack root@YOUR_SERVER_IP
```

### 3. Add SSH Config (local machine)

Add to `~/.ssh/config`:

```
Host packattack
    HostName YOUR_SERVER_IP
    User root
    IdentityFile ~/.ssh/id_ed25519_packattack
    IdentitiesOnly yes
```

Now you can connect with: `ssh packattack`

---

## Security Hardening

### Automated Hardening (Recommended)

Run the security hardening script:

```bash
# On the server
cd /root
curl -O https://raw.githubusercontent.com/YOUR_REPO/main/scripts/server-security-hardening.sh
chmod +x server-security-hardening.sh
bash server-security-hardening.sh
```

The script automatically:
- Updates all packages
- Installs security tools (AIDE, auditd, Fail2Ban, RKHunter, Lynis)
- Hardens kernel parameters
- Configures SSH securely
- Sets up firewall
- Configures audit logging
- Enables automatic security updates

### Manual Hardening Reference

If you prefer manual setup, here are the key configurations:

#### Kernel Hardening (`/etc/sysctl.d/99-security.conf`)

```ini
# Network security
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1

# Kernel security
kernel.kptr_restrict = 2
kernel.randomize_va_space = 2
kernel.yama.ptrace_scope = 1
fs.suid_dumpable = 0
```

#### SSH Hardening (`/etc/ssh/sshd_config`)

```
Port 22
Protocol 2
PermitRootLogin prohibit-password
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
MaxAuthTries 3
X11Forwarding no
AllowTcpForwarding no
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com
```

---

## Application User Setup

### Create packattack User

```bash
# Create user with no login shell (security)
useradd -r -s /bin/bash -d /home/packattack -m packattack

# Create application directory
mkdir -p /var/www/packattack/app
chown -R packattack:packattack /var/www/packattack

# Block user from cron (security)
echo "packattack" >> /etc/cron.deny
```

---

## Nginx Installation

### Install Nginx

```bash
apt install -y nginx
```

### Configure Nginx

```bash
# Copy secure config
cp /path/to/nginx-secure-config.conf /etc/nginx/sites-available/packattack

# Enable site
ln -s /etc/nginx/sites-available/packattack /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Generate DH parameters (takes a few minutes)
openssl dhparam -out /etc/nginx/dhparam.pem 4096

# Create log directory
mkdir -p /var/log/packattack
chown www-data:www-data /var/log/packattack

# Test and restart
nginx -t
systemctl restart nginx
```

---

## SSL Certificate Setup

### Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
# Create webroot directory
mkdir -p /var/www/certbot

# Obtain certificate
certbot certonly --webroot -w /var/www/certbot \
    -d pack-attack.de -d www.pack-attack.de \
    --email your@email.com \
    --agree-tos \
    --no-eff-email

# Restart Nginx with SSL
nginx -t && systemctl restart nginx
```

### Auto-Renewal

```bash
# Test renewal
certbot renew --dry-run

# Renewal runs automatically via systemd timer
systemctl status certbot.timer
```

---

## Application Deployment

### Install Node.js

```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### Deploy Application

```bash
# Switch to packattack user
su - packattack
cd /var/www/packattack/app

# Clone repository
git clone https://github.com/YOUR_REPO.git .

# Install dependencies
npm ci --production=false

# Setup environment
cp .env.example .env
# Edit .env with production values
nano .env

# Generate Prisma client
npx prisma generate
npx prisma db push

# Build application
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "packattack" -- start
pm2 save
pm2 startup
```

### PM2 Service (as root)

```bash
# Run the command PM2 outputs from 'pm2 startup'
env PATH=$PATH:/usr/bin pm2 startup systemd -u packattack --hp /home/packattack
```

---

## Post-Deployment Security

### Run Security Audit

```bash
# Full Lynis audit
lynis audit system

# Check for vulnerabilities
npm audit

# RKHunter scan
rkhunter --check
```

### Verify Configuration

```bash
# Check firewall
ufw status verbose

# Check Fail2Ban
fail2ban-client status

# Check SSL (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=pack-attack.de

# Check security headers
curl -I https://pack-attack.de
```

---

## Ongoing Security Maintenance

### Daily Tasks

```bash
# Review security alerts
cat /var/log/packattack/security-alerts.log

# Check Fail2Ban bans
fail2ban-client status sshd
```

### Weekly Tasks

```bash
# Review auth logs
grep "Failed\|Invalid" /var/log/auth.log | tail -50

# Check audit logs
ausearch -k identity --start today

# Review application logs
tail -100 /var/log/packattack/nginx-error.log
```

### Monthly Tasks

```bash
# Full security audit
lynis audit system

# Update system
apt update && apt upgrade -y

# Check npm dependencies
cd /var/www/packattack/app
npm audit

# Rotate credentials if needed
# Check SSL certificate expiry
certbot certificates
```

### Quick Commands Reference

```bash
# SSH into server
ssh -i ~/.ssh/id_ed25519_packattack root@82.165.66.236

# Deploy updates
sudo packattack-deploy

# View application logs
sudo -u packattack pm2 logs packattack

# Restart application
sudo -u packattack pm2 restart packattack

# Check health
curl https://pack-attack.de/api/health

# Security scan
lynis audit system --quick
```

---

## Security Contact

If you discover a security vulnerability, please report it to:
- Email: security@your-domain.com

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Hardening Script | `scripts/server-security-hardening.sh` | Automated security setup |
| Nginx Config | `scripts/nginx-secure-config.conf` | Secure web server config |
| Security Report | `DEEP_SECURITY_AUDIT_REPORT.md` | Audit findings |
| This Guide | `SERVER_SECURITY_SETUP_GUIDE.md` | Setup documentation |

---

**Last Updated:** January 27, 2026  
**Security Level:** Enterprise-Grade  
**Lynis Score Target:** 77+/100
