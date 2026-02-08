# Pack Attack – Codebase Review & New Deployment SSH Key Report

**Date:** 2026-02-02  
**Repo:** https://github.com/belgarathe/Pack-Attack  
**Local path:** `c:\PA`

---

## Part 1: Codebase Review (What We Did)

### 1.1 Project Overview

**Pack Attack** is a **trading card box-opening platform** with battles, webshop, and admin features. Users open boxes (MTG, Pokemon, One Piece, Lorcana, Yugioh, Flesh and Blood), collect cards, join battles, buy/sell, and use a coin system. Shop owners run stores and custom boxes; admins manage users, boxes, orders, and emails.

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon or self-hosted) via Prisma ORM |
| Auth | NextAuth.js (Credentials + email verification) |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Framer Motion, Lucide |
| Payments | Stripe, PayPal |
| Email | Resend |
| Tests | Playwright (e2e + API) |
| Security | OWASP-style headers, CSP, HSTS, rate limiting |

### 1.3 Application Structure

- **`src/app/`** – Next.js App Router:
  - **(admin)/** – Admin: boxes, users, orders, emails
  - **(auth)/** – Login, register
  - **(dashboard)/** – User dashboard
  - **(shop)/** – Shop owner dashboard (products, orders, boxes, stock, assigned orders)
  - **api/** – REST-style API (auth, battles, boxes, cart, payments, shop, user, health, leaderboard)
  - **battles/** – Create/join battles, battle play UI
  - **boxes/** – Box listing
  - **cart/** – Cart and checkout (main site)
  - **collection/** – User collection
  - **shop/** – Public shop, product pages, shop cart/checkout
  - **leaderboard/** – Monthly battle leaderboard
- **`src/lib/`** – auth, prisma, rate-limit, stripe, paypal, cache, justtcg, etc.
- **`src/components/`** – Navigation, admin/shop UI components
- **`prisma/schema.prisma`** – Full DB schema (User, Box, Card, Pull, Battle, Shop, Order, Achievements, etc.)

### 1.4 Features Implemented

- **Users:** Register/login, email verification, box opening, collection, cart, sell cards, checkout (shipping, coins/euros), coins (Stripe/PayPal), achievements, leaderboard.
- **Battles:** Create/join, Normal/Upside-Down/Jackpot/Share modes, bots, battle flow and UI.
- **Shop owners:** Shop dashboard, products, orders, custom boxes (ShopBoxOrder), stock, assigned orders from main site.
- **Admins:** Users, boxes, orders, emails (e.g. custom emails), box presets.
- **Infrastructure:** `/api/health`, security headers, rate limiting, deploy scripts, Nginx configs.

### 1.5 Deployment & SSH (How Deploy Works)

- **GitHub Actions** (when `.github/workflows/deploy.yml` exists): On push to `main`, workflow uses **appleboy/ssh-action** with secrets:
  - `SSH_HOST` – server host
  - `SSH_USER` – SSH user (e.g. `root` or `packattack`)
  - `SSH_PRIVATE_KEY` – **Private key** (from a deploy key pair)
  - `SSH_PORT` – optional, default 22  

  On the server it: `cd` app dir → `git pull origin main` → `npm ci` → Prisma generate/migrate → `npm run build` → PM2 restart.

- **Server scripts** (in `scripts/`):
  - **secure-deploy.sh** – Full secure setup: SSH hardening (key-only, no password), UFW, Fail2Ban, Nginx, Let’s Encrypt, app user, Node, PM2, audit, logrotate, backup, `packattack-deploy` update script.
  - **server-security-hardening.sh** – Pre-deploy hardening: updates, security tools, kernel/SSH hardening, firewall, Fail2Ban, audit.
  - **quick-deploy.sh** – Quick update on server: pull, `npm ci`, Prisma, build, PM2 reload, health check.
  - **deploy-security-update.sh** – Deploy security fixes: pull, npm, Prisma, build, PM2, Nginx update.
  - **server-setup.sh** – Basic setup: Node, PM2, clone repo, .env, npm, Prisma, build, create-admin.

- **SSH usage:** Scripts assume **key-only SSH** (no password). You generate a key pair, put the **public** key on the server (`~/.ssh/authorized_keys`), and use the **private** key for:
  - Your own SSH access, and/or
  - GitHub Actions secret `SSH_PRIVATE_KEY` for automated deploy.

### 1.6 Security & Server Docs

- **SERVER_SECURITY_SETUP_GUIDE.md** – Pre-deploy checklist, SSH key creation (`ssh-keygen -t ed25519 ...`), SSH config, hardening, Nginx, SSL, deployment, maintenance.
- **DEPLOYMENT_SECURITY.md** – Security architecture, deploy procedures, `packattack-deploy` / quick-deploy.
- **DEPLOYMENT_CHECKLIST.md** – Env vars, DB, security checklist, build, platforms (VPS/PM2, etc.).
- **PRODUCTION_READY.md** – Production readiness summary.

---

## Part 2: New SSH Key Pair for Deployment

### 2.1 Where the New Key Was Created

A **new SSH key pair** for deployment was created at:

| Item | Path |
|------|------|
| **Directory** | `c:\PA\.deploy-keys\` |
| **Private key** | `c:\PA\.deploy-keys\id_ed25519_packattack_deploy` |
| **Public key** | `c:\PA\.deploy-keys\id_ed25519_packattack_deploy.pub` |

- **Algorithm:** ED25519  
- **Comment:** `packattack-deploy-2026-02-02`  
- **Passphrase:** None (so GitHub Actions or scripts can use it without interaction; use a passphrase if you only use it locally).

### 2.2 Fingerprint & Public Key

- **Fingerprint (SHA256):**  
  `SHA256:ljs9s0IolZiXpzGzBBCETvzfnarskn1KlLGsZ0Zq9FY packattack-deploy-2026-02-02`

- **Public key (one line):**  
  `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMs8X/8yo4lvUaLnfUVrv9RUt+pUkXjz5KnDVb+XrE9T packattack-deploy-2026-02-02`

### 2.3 Gitignore

The directory **`.deploy-keys/`** was added to **`.gitignore`** so the **private key is never committed**. Only the public key is safe to share; keep the private key secret and back it up securely.

### 2.4 What to Do Next (New Deployment)

1. **On the server (once per server):**  
   Add the **public** key to the deploy user’s `authorized_keys`:
   ```bash
   # On server, as the user that runs deploys (e.g. root or packattack)
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMs8X/8yo4lvUaLnfUVrv9RUt+pUkXjz5KnDVb+XrE9T packattack-deploy-2026-02-02" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

2. **For GitHub Actions deploy:**  
   - In GitHub: **Settings → Secrets and variables → Actions**  
   - Add secret **`SSH_PRIVATE_KEY`** with the **entire contents** of  
     `c:\PA\.deploy-keys\id_ed25519_packattack_deploy`  
     (the file with no extension).  
   - Set **`SSH_HOST`**, **`SSH_USER`**, and optionally **`SSH_PORT`** in the same place (or in the workflow).

3. **For local SSH to the server:**  
   Use the private key explicitly:
   ```powershell
   ssh -i "c:\PA\.deploy-keys\id_ed25519_packattack_deploy" user@your-server-ip
   ```
   Or add a host block in `~/.ssh/config` with `IdentityFile` pointing to that path.

### 2.5 Security Reminders

- **Never commit** `c:\PA\.deploy-keys\id_ed25519_packattack_deploy` (private key).  
- **Back up** the private key in a secure place (e.g. password manager or secure vault).  
- If this key is ever exposed, generate a new pair, replace the public key on the server and the `SSH_PRIVATE_KEY` secret in GitHub, and remove the old key from the server.

---

## Part 3: Quick Reference

| What | Where / How |
|------|-------------|
| App root | `c:\PA` |
| Deploy SSH key dir | `c:\PA\.deploy-keys\` |
| Private key file | `c:\PA\.deploy-keys\id_ed25519_packattack_deploy` |
| Public key file | `c:\PA\.deploy-keys\id_ed25519_packattack_deploy.pub` |
| GitHub repo | https://github.com/belgarathe/Pack-Attack |
| GitHub Actions secret for private key | `SSH_PRIVATE_KEY` |
| Server deploy path (from scripts) | `/var/www/packattack` or `/var/www/packattack/app` |
| Quick deploy on server | `sudo ./scripts/quick-deploy.sh` or `sudo packattack-deploy` |

---

*Report generated for codebase learning and new deployment SSH key setup. Keep this file and the private key location confidential where appropriate.*
