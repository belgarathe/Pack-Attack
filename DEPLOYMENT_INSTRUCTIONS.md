# 🚀 Deployment Instructions for Battle Auto-Start Feature

## ✅ Changes Pushed to GitHub

**Commit**: `938a411`
**Branch**: `main`
**Repository**: `https://github.com/belgarathe/Pack-Attack.git`

---

## 📦 What Was Pushed

### Modified Files (4)
1. `prisma/schema.prisma` - Added `fullAt` field to Battle model
2. `src/app/api/battles/[battleId]/join/route.ts` - Sets `fullAt` when battle becomes full
3. `src/app/battles/[id]/BattleDrawClient.tsx` - Added countdown timer UI
4. `package.json` - Added `check-auto-start` script

### New Files (8+)
1. `src/app/api/battles/auto-start/route.ts` - Auto-start API endpoint
2. `scripts/check-battle-auto-start.ts` - Scheduler script
3. `ecosystem.battle-scheduler.config.cjs` - PM2 configuration
4. `src/lib/battle-auto-start-scheduler.ts` - Alternative scheduler
5. Multiple documentation files

---

## 🖥️ Server Deployment Steps

### Step 1: SSH into Your Production Server

```bash
ssh your-user@your-server.com
```

### Step 2: Navigate to Application Directory

```bash
cd /var/www/packattack
# Or wherever your app is deployed
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

### Step 4: Install Dependencies (if needed)

```bash
npm install
```

### Step 5: Update Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Or if using migrations:
npm run db:migrate:prod
```

### Step 6: Set Environment Variables

Add to your production `.env` file:

```bash
# Add these lines
CRON_SECRET=your-secure-random-production-secret-here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### Step 7: Rebuild Application

```bash
npm run build
```

### Step 8: Restart Application

```bash
# If using PM2
pm2 restart packattack

# Or if using systemd
sudo systemctl restart packattack
```

### Step 9: Start the Auto-Start Scheduler

```bash
# Using PM2 (recommended)
pm2 start ecosystem.battle-scheduler.config.cjs
pm2 save

# View status
pm2 status

# Check logs
pm2 logs battle-auto-start-scheduler
```

### Step 10: Verify Deployment

1. **Check application is running:**
   ```bash
   pm2 status
   curl https://yourdomain.com/api/health
   ```

2. **Check database schema:**
   ```bash
   # Connect to database and verify
   mysql -u username -p
   USE your_database;
   DESCRIBE Battle;
   # Should see fullAt field
   ```

3. **Test auto-start API:**
   ```bash
   curl -X POST https://yourdomain.com/api/battles/auto-start \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

4. **Check scheduler logs:**
   ```bash
   pm2 logs battle-auto-start-scheduler --lines 50
   ```

---

## 🔍 Verification Checklist

- [ ] Code pulled from GitHub
- [ ] Dependencies installed
- [ ] Database schema updated (`fullAt` field exists)
- [ ] Environment variables set (CRON_SECRET, NEXT_PUBLIC_APP_URL)
- [ ] Application rebuilt
- [ ] Application restarted
- [ ] Scheduler started with PM2
- [ ] Scheduler running (check `pm2 status`)
- [ ] No errors in logs
- [ ] API endpoint returns success
- [ ] UI shows countdown timer on full battles

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs packattack --lines 100

# Check for syntax errors
npm run typecheck

# Restart with fresh logs
pm2 restart packattack --update-env
pm2 flush
```

### Database Migration Fails

```bash
# Check database connection
npm run db:studio

# Try manual migration
npx prisma migrate deploy

# Or force push
npm run db:push --accept-data-loss
```

### Scheduler Not Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs battle-auto-start-scheduler

# Restart scheduler
pm2 restart battle-auto-start-scheduler

# Or delete and recreate
pm2 delete battle-auto-start-scheduler
pm2 start ecosystem.battle-scheduler.config.cjs
pm2 save
```

### Environment Variables Not Working

```bash
# Check if .env is loaded
cat .env | grep CRON_SECRET

# Restart with environment update
pm2 restart all --update-env

# Or set directly in PM2
pm2 set packattack:CRON_SECRET "your-secret"
```

---

## 📊 Monitoring

### Check Application Logs

```bash
pm2 logs packattack
pm2 logs battle-auto-start-scheduler
```

### View PM2 Dashboard

```bash
pm2 monit
```

### Check System Resources

```bash
htop
# or
top
```

### Database Queries

```sql
-- Check for full battles
SELECT id, status, fullAt, maxParticipants
FROM Battle
WHERE status = 'WAITING' AND fullAt IS NOT NULL;

-- Check battles that auto-started
SELECT 
  id,
  fullAt,
  startedAt,
  TIMESTAMPDIFF(MINUTE, fullAt, startedAt) as minutes_waited
FROM Battle
WHERE fullAt IS NOT NULL AND startedAt IS NOT NULL
ORDER BY startedAt DESC
LIMIT 10;
```

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Stop the scheduler
pm2 stop battle-auto-start-scheduler

# Revert to previous commit
git reset --hard HEAD~1

# Rebuild
npm run build

# Restart app
pm2 restart packattack
```

---

## 📱 Alternative Deployment Methods

### If Using Docker

```bash
docker pull your-registry/packattack:latest
docker-compose up -d --build
docker exec packattack npm run db:push
```

### If Using Vercel/Netlify

1. Push to GitHub (already done ✅)
2. Platform will auto-deploy
3. Add environment variables in platform dashboard
4. Set up external cron service (e.g., cron-job.org) to call:
   ```
   POST https://yourdomain.com/api/battles/auto-start
   Headers: Authorization: Bearer YOUR_CRON_SECRET
   ```

### If Using Platform-as-a-Service (Heroku, Railway, etc.)

1. Push to GitHub (already done ✅)
2. Platform auto-deploys from GitHub
3. Add environment variables in dashboard
4. Use platform's scheduler or add-on for cron jobs

---

## ✅ Deployment Complete!

Once all steps are done, your battle auto-start feature is live!

**Test it by:**
1. Creating a battle
2. Joining with all players
3. Watching the countdown timer
4. Waiting for auto-start (or testing with 1-minute timeout)

**Monitor with:**
```bash
pm2 logs battle-auto-start-scheduler --lines 100 --raw
```

---

**Deployed**: `[Pending - Follow steps above]`
**Status**: Ready for deployment
**Pushed to GitHub**: ✅ Yes (commit 938a411)
