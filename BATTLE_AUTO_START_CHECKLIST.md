# ✅ Battle Auto-Start Implementation Checklist

## 🎯 What Was Implemented

Your battle system now automatically starts battles after 30 minutes if all players have joined but haven't pressed start.

---

## 📋 Setup Checklist

### Step 1: Database Setup ⏳

- [ ] Run database migration:
  ```bash
  npm run db:generate
  npm run db:push
  ```

- [ ] Verify `fullAt` field was added to Battle table:
  ```sql
  DESCRIBE Battle;
  -- Should see: fullAt | DateTime | YES | | NULL
  ```

### Step 2: Environment Variables ⏳

- [ ] Add to your `.env` file:
  ```env
  CRON_SECRET=your-secure-random-key-here
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```

- [ ] Generate a strong secret:
  ```bash
  # Linux/Mac
  openssl rand -base64 32
  
  # PowerShell
  [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  ```

- [ ] For production, set `NEXT_PUBLIC_APP_URL` to your actual domain

### Step 3: Test the Setup ⏳

- [ ] Test the auto-start API manually:
  ```bash
  npm run check-auto-start
  ```

- [ ] Expected output:
  ```
  [AUTO-START] Checking for battles to auto-start...
  [AUTO-START] Check completed
  [AUTO-START] Processed: 0 battles
  [AUTO-START] Done
  ```

### Step 4: Choose Your Scheduler ⏳

Pick ONE of these options:

#### Option A: PM2 (Recommended for Production)

- [ ] Install PM2:
  ```bash
  npm install -g pm2
  ```

- [ ] Start the scheduler:
  ```bash
  pm2 start ecosystem.battle-scheduler.config.cjs
  ```

- [ ] Verify it's running:
  ```bash
  pm2 status
  pm2 logs battle-auto-start-scheduler --lines 20
  ```

- [ ] Save PM2 configuration:
  ```bash
  pm2 save
  ```

- [ ] Set PM2 to start on boot:
  ```bash
  pm2 startup
  # Follow the instructions it provides
  ```

#### Option B: System Cron Job (Linux/Mac)

- [ ] Open crontab:
  ```bash
  crontab -e
  ```

- [ ] Add this line:
  ```cron
  * * * * * cd /path/to/pack-attack && npm run check-auto-start >> /var/log/battle-auto-start.log 2>&1
  ```

- [ ] Verify cron is set:
  ```bash
  crontab -l
  ```

#### Option C: Windows Task Scheduler

- [ ] Open Task Scheduler
- [ ] Create new task:
  - **Name**: Battle Auto-Start Checker
  - **Trigger**: Every 1 minute, repeat indefinitely
  - **Action**: Start a program
    - **Program**: `node`
    - **Arguments**: `C:\PA\node_modules\.bin\tsx scripts\check-battle-auto-start.ts`
    - **Start in**: `C:\PA`
  - **Settings**: 
    - ✓ Run task as soon as possible after a scheduled start is missed
    - ✓ Stop task if it runs longer than 3 minutes

### Step 5: Test End-to-End ⏳

For quick testing, temporarily change the timeout to 1 minute:

- [ ] Edit `src/app/api/battles/auto-start/route.ts` line 21:
  ```typescript
  const thirtyMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
  ```

- [ ] Create a test battle

- [ ] Join with all required players

- [ ] Verify:
  - [ ] Battle shows as "full"
  - [ ] Countdown timer appears in UI
  - [ ] `fullAt` timestamp is set in database

- [ ] Wait 1 minute and run:
  ```bash
  npm run check-auto-start
  ```

- [ ] Verify:
  - [ ] Battle auto-started
  - [ ] Winner was determined
  - [ ] Battle status is FINISHED
  - [ ] Prizes were distributed

- [ ] **IMPORTANT**: Change the timeout back to 30 minutes:
  ```typescript
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  ```

### Step 6: Production Deployment ⏳

- [ ] Ensure environment variables are set on production server

- [ ] Run database migrations:
  ```bash
  npm run db:migrate:prod
  ```

- [ ] Deploy the updated code

- [ ] Start the scheduler on production:
  ```bash
  pm2 start ecosystem.battle-scheduler.config.cjs
  pm2 save
  ```

- [ ] Monitor for 24 hours:
  ```bash
  pm2 logs battle-auto-start-scheduler
  ```

---

## 🎨 UI Features Checklist

Visual features that were added:

- [x] Countdown timer appears when battle is full
- [x] Timer shows time remaining in MM:SS format
- [x] Timer is blue when >5 minutes remain
- [x] Timer turns orange when ≤5 minutes remain
- [x] Timer updates every second
- [x] Shows "Auto-starting soon..." when expired
- [x] Responsive design for mobile/desktop

---

## 🔍 Verification Checklist

### Database Verification

- [ ] Check if `fullAt` field exists:
  ```sql
  SHOW COLUMNS FROM Battle LIKE 'fullAt';
  ```

- [ ] Check for full battles:
  ```sql
  SELECT id, status, fullAt, maxParticipants
  FROM Battle
  WHERE status = 'WAITING' AND fullAt IS NOT NULL;
  ```

### Scheduler Verification

- [ ] Scheduler is running (PM2 or cron)
- [ ] No errors in logs
- [ ] Runs every minute
- [ ] Can access the API endpoint

### UI Verification

- [ ] Countdown timer displays correctly
- [ ] Timer updates in real-time
- [ ] Colors change appropriately
- [ ] Mobile responsive

---

## 📁 Files Created Summary

### Modified (4 files)
- ✅ `prisma/schema.prisma` - Added fullAt field
- ✅ `src/app/api/battles/[battleId]/join/route.ts` - Sets fullAt
- ✅ `src/app/battles/[id]/BattleDrawClient.tsx` - Added countdown UI
- ✅ `package.json` - Added check-auto-start script

### Created (8 files)
- ✅ `src/app/api/battles/auto-start/route.ts` - Auto-start API
- ✅ `scripts/check-battle-auto-start.ts` - Scheduler script
- ✅ `ecosystem.battle-scheduler.config.cjs` - PM2 config
- ✅ `src/lib/battle-auto-start-scheduler.ts` - Node-cron scheduler
- ✅ `BATTLE_AUTO_START_SETUP.md` - Full guide
- ✅ `BATTLE_AUTO_START_QUICKSTART.md` - Quick start
- ✅ `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md` - Technical details
- ✅ `README_BATTLE_AUTO_START.md` - Main readme
- ✅ `BATTLE_AUTO_START_CHECKLIST.md` - This file

---

## 🚨 Common Issues

### ❌ "npm run check-auto-start" fails

**Solution**: Ensure you're in the project directory and dependencies are installed
```bash
cd C:\PA
npm install
```

### ❌ API returns 401 Unauthorized

**Solution**: Check `CRON_SECRET` matches in `.env` and script
```bash
# View your secret
cat .env | grep CRON_SECRET
```

### ❌ Countdown timer not showing

**Solution**: 
1. Check if battle is full
2. Verify `fullAt` is set in database
3. Check browser console for errors
4. Refresh the page

### ❌ Battles not auto-starting

**Solution**:
1. Check scheduler is running: `pm2 status`
2. Check logs: `pm2 logs battle-auto-start-scheduler`
3. Test manually: `npm run check-auto-start`
4. Verify time threshold (30 minutes)

---

## 📞 Support Resources

- **Full Documentation**: `BATTLE_AUTO_START_SETUP.md`
- **Quick Start**: `BATTLE_AUTO_START_QUICKSTART.md`
- **Technical Details**: `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md`
- **Main README**: `README_BATTLE_AUTO_START.md`

---

## 🎉 Completion Status

Once all checkboxes above are checked, your battle auto-start feature is fully operational!

**Current Status**: ⏳ Awaiting Setup

**Next Step**: Start with "Step 1: Database Setup"

---

**Last Updated**: 2026-02-08
**Implementation Version**: 1.0.0
