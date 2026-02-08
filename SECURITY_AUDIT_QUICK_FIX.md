# SECURITY AUDIT - CRITICAL FIXES NEEDED NOW

## 🚨 IMMEDIATE ACTIONS (Do These RIGHT NOW)

### 1. Delete the Test Admin Endpoint
```bash
# This endpoint creates admin users without authentication!
rm src/app/api/admin/create-test-admin/route.ts
rm Pack-Attack/src/app/api/admin/create-test-admin/route.ts
```

### 2. Remove Production Secrets from Git
```bash
# Add to .gitignore
echo ".env.production" >> .gitignore

# Remove from git history (CRITICAL!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

### 3. Rotate ALL Exposed Credentials

#### A. Database Password (Neon)
1. Go to https://console.neon.tech/
2. Reset database password
3. Update `.env.production` on server ONLY (never commit!)

#### B. NEXTAUTH_SECRET
```bash
# Generate new secret
openssl rand -base64 32

# Update on server: /var/www/packattack/app/.env
# NEVER commit this!
```

#### C. RESEND_API_KEY
1. Go to https://resend.com/api-keys
2. Delete key: `re_X51ny8Yg_KJWc32jEccGK5ezeLYng98HB`
3. Generate new key
4. Update on server ONLY

#### D. Admin Password
```bash
# SSH to server
ssh root@82.165.66.236

# Run admin creation script with NEW password
cd /var/www/packattack/app
tsx scripts/create-admin.ts
```

### 4. Upgrade Next.js (CVE-2025-66478 RCE Vulnerability)
```bash
cd Pack-Attack
npm install next@16.1.6
# Or use latest
npm install next@latest

# Test locally
npm run build
npm run dev

# If works, deploy
```

### 5. Disable Payment Endpoint (Free Coins Exploit)
Edit `src/app/api/payments/purchase-coins/route.ts`:

```typescript
export async function POST(request: Request) {
  // DISABLED: Requires Stripe integration
  return NextResponse.json(
    { error: 'Payment processing temporarily unavailable' }, 
    { status: 503 }
  );
}
```

## ⏰ FIX WITHIN 24 HOURS

### 6. Add Security Headers
Edit `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
```

## 📋 VERIFICATION CHECKLIST

After completing fixes, verify:

```bash
# 1. Check no secrets in git
git log --all --full-history -- .env.production

# 2. Verify Next.js version
npm list next
# Should show 16.1.6 or higher

# 3. Build succeeds
npm run build

# 4. TypeScript check passes
npm run typecheck

# 5. No test endpoints exist
ls -la src/app/api/admin/create-test-admin/
# Should return "No such file or directory"
```

## 🖥️ SERVER-SIDE VERIFICATION

```bash
# SSH to server
ssh root@82.165.66.236

# Run security scan
cd /var/www/packattack/app
sudo bash scripts/post-deploy-security-scan.sh

# Should show 0 CRITICAL errors
```

## 📊 AUDIT SUMMARY

**Security Score:** 68/100 (Will be 85+ after fixes)

**Issues Found:**
- 🔴 4 CRITICAL (fix NOW)
- 🟠 3 HIGH (fix today)
- 🟡 5 MEDIUM (fix this week)
- 🟢 2 LOW

**Most Urgent:**
1. Exposed production credentials in git
2. Test admin endpoint (anyone can create admin!)
3. Next.js RCE vulnerability (CVE-2025-66478)
4. Free coins exploit via payment endpoint

## 🔒 NEVER DO THIS AGAIN

❌ **NEVER commit:**
- `.env.production`
- `.env.local`
- Any file with `SECRET`, `PASSWORD`, `API_KEY`, `TOKEN`

✅ **ALWAYS:**
- Use `.env.example` (with dummy values)
- Store secrets only on server
- Rotate credentials after exposure
- Use environment variables, never hardcode

## ⚡ ESTIMATED TIME

- Critical fixes: **2-4 hours**
- All fixes: **2-3 days**

## 📖 FULL REPORT

See `DEEP_SECURITY_AUDIT_REPORT.md` for complete details.

---

**Priority:** 🚨 **URGENT - Start fixing immediately!**
