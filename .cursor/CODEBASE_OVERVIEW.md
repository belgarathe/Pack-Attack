# Pack Attack – Codebase Overview (What We've Done So Far)

This file summarizes the project and the tools you need so the AI (and you) can work effectively.

---

## What This Project Is

**Pack Attack** is a **trading card box-opening platform** with battles, shop, and admin features.

- **Repo**: [github.com/belgarathe/Pack-Attack](https://github.com/belgarathe/Pack-Attack)
- **Local path**: `c:\PA`
- **Remote**: `origin` → `https://github.com/belgarathe/Pack-Attack.git`
- **Main branch**: `main` (synced with GitHub)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon or self-hosted) via Prisma ORM |
| Auth | NextAuth.js (Credentials, email verification) |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Framer Motion, Lucide icons |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Payments | Stripe, PayPal |
| Email | Resend |
| Tests | Playwright (e2e + API) |
| Security | OWASP-style headers, CSP, HSTS, rate limiting |

---

## Project Structure (Root: `c:\PA`)

```
c:\PA\
├── prisma/
│   └── schema.prisma       # Full DB schema (Users, Boxes, Cards, Battles, Shop, Achievements, etc.)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (admin)/         # Admin: boxes, users, orders, emails
│   │   ├── (auth)/          # Login, register
│   │   ├── (dashboard)/     # User dashboard
│   │   ├── (shop)/          # Shop owner dashboard (boxes, orders, stock)
│   │   ├── api/             # All API routes (auth, battles, boxes, cart, payments, shop, etc.)
│   │   ├── battles/         # Battle create, join, play
│   │   ├── boxes/           # Box listing
│   │   ├── cart/            # Cart + checkout
│   │   ├── collection/      # User collection
│   │   ├── shop/            # Public shop + product pages + shop cart/checkout
│   │   ├── leaderboard/     # Battle leaderboard
│   │   └── ...
│   ├── components/          # Shared UI (Navigation, ui/)
│   ├── lib/                 # auth, prisma, rate-limit, utils, etc.
│   └── types/
├── scripts/                 # create-admin, create-bots, deploy, security, test scripts
├── tests/                   # Playwright: api/, e2e/
├── public/                  # Static assets, PWA manifest, icons
├── package.json             # Dependencies + scripts
├── next.config.ts           # Security headers, CSP
├── tsconfig.json
├── playwright.config.ts
├── .env.example / .env.production.example
└── .github/workflows/       # CI/CD (e.g. deploy on push to main)
```

---

## Main Features (What’s Been Built)

### Users
- **Auth**: Register, login, email verification (NextAuth + Resend).
- **Box opening**: Open boxes, collect cards (MTG, Pokemon, One Piece, Lorcana, Yugioh, Flesh and Blood).
- **Battles**: Create/join battles; modes: Normal, Upside-Down, Jackpot, Share; bots support.
- **Collection & cart**: View collection, add to cart, sell cards, checkout (shipping, coins/euros).
- **Coins**: Purchase coins (Stripe/PayPal), use for boxes/shipping.
- **Achievements**: Progress, unlock, claim coin rewards.
- **Leaderboard**: Monthly battle leaderboard.

### Shop owners (`SHOP_OWNER` role)
- **Shop dashboard**: Products, orders, stock, assigned orders (from main site).
- **Custom boxes**: Create boxes for their shop; orders fulfilled by shop (ShopBoxOrder).

### Admins
- **Admin dashboard**: Users, boxes, orders, emails (e.g. send custom emails).
- **Box presets**: Reusable box templates.
- **Create test admin/bots**: Scripts and API routes for seeding.

### Infrastructure / DevOps
- **Deploy**: GitHub Actions → SSH to server → `git pull`, `npm ci`, Prisma generate/migrate, build, PM2 restart.
- **Security**: Nginx configs, hardening scripts, CSP, HSTS, rate limiting.
- **Health**: `/api/health` for uptime checks.

---

## Database (Prisma)

- **Provider**: PostgreSQL (`DATABASE_URL` + `DIRECT_DATABASE_URL` for Neon).
- **Notable models**: User, Box, Card, Pull, Cart, Transaction, Battle, BattleParticipant, BattlePull, SaleHistory, Order, OrderItem, Shop, ShopProduct, ShopCart, ShopOrder, ShopBoxOrder, BoxPreset, Achievement, UserAchievement, EmailLog, BattleLeaderboard.
- **Enums**: Role (USER, ADMIN, SHOP_OWNER), CardGame, BattleMode, BattleStatus, PaymentStatus, OrderStatus, etc.
- **Indexes**: Added for common queries (see `schema.prisma`).

---

## Tools You Need Installed

1. **Node.js 18+ (LTS)**  
   - Required for `npm`, `next`, `prisma`, `tsx`, Playwright.  
   - Install: https://nodejs.org/ or `winget install OpenJS.NodeJS.LTS`  
   - After install, **restart terminal (or Cursor)** so `node`/`npm` are on PATH.

2. **Git**  
   - Already installed (we used it to add `origin` and reset to `origin/main`).

3. **PostgreSQL** (for local dev)  
   - Or use **Neon** (see `.env.example`) and set `DATABASE_URL` + `DIRECT_DATABASE_URL`.

4. **Optional**: **Playwright browsers** (after `npm install`):  
   `npx playwright install`

---

## Commands to Run After Node Is Available

Open a **new** terminal (so Node/npm are on PATH), then:

```powershell
cd c:\PA

# 1. Install dependencies
npm install

# 2. Copy env and fill in values (database, NextAuth, etc.)
copy .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, etc.

# 3. Generate Prisma client and push schema (or run migrations)
npm run db:generate
npm run db:push
# Or for production: npm run db:migrate:prod

# 4. (Optional) Create admin user
npm run create-admin

# 5. (Optional) Install Playwright browsers for tests
npx playwright install

# 6. Start dev server
npm run dev
```

App: http://localhost:3000

---

## Useful Scripts (from `package.json`)

| Script | Purpose |
|--------|--------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB (dev) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run create-admin` | Create admin user (uses .env ADMIN_*) |
| `npm run create-bots` | Create test bots |
| `npm run test` | Playwright tests |
| `npm run test:ui` | Playwright UI mode |
| `npm run build:prod` | ci + generate + migrate + build |

---

## What We Did in This Session

1. **Git**: Installed Git (winget), added remote `origin` → `https://github.com/belgarathe/Pack-Attack.git`.
2. **Sync**: Fetched and reset local `main` to `origin/main` so local matches GitHub.
3. **Codebase review**: Mapped app structure, Prisma schema, auth, payments, shop, battles, admin, scripts, and deploy flow.
4. **Node/npm**: Not available in the environment (Node install may be pending or needs a new shell). You need Node.js installed and a new terminal to run `npm install` and the commands above.

---

## Quick Reference for AI

- **App root**: `c:\PA` (single Next.js app; `Pack-Attack` subfolder in repo is legacy/nested, main app is root).
- **API routes**: `src/app/api/` (REST-style route handlers).
- **Auth**: NextAuth in `src/lib/auth.ts`, Credentials + email verification; session includes `role`.
- **DB**: Prisma in `prisma/schema.prisma`; use `prisma` and `withRetry` from `src/lib/prisma.ts`.
- **Env**: `.env` from `.env.example`; production uses `DIRECT_DATABASE_URL` for migrations.
- **Deploy**: GitHub Actions → SSH → `git pull origin main`, `npm ci`, Prisma, build, PM2.

---

*Generated for onboarding and AI context. Update this file when you add major features or change structure.*
