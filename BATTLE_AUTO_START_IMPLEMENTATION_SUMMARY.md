# Battle Auto-Start Implementation Summary

## Overview

I've successfully implemented an automatic battle start system for Box Battles. When all players join a battle, if they don't manually start it within 30 minutes, the system will automatically run the battle to completion.

## What Was Implemented

### 1. Database Schema Changes

**File:** `prisma/schema.prisma`

- Added `fullAt` field to the `Battle` model to track when a battle becomes full
- Added index `@@index([status, fullAt])` for efficient queries

```prisma
model Battle {
  // ... existing fields
  fullAt            DateTime?           // Timestamp when battle became full
  
  // ... existing indexes
  @@index([status, fullAt])        // Auto-start queries
}
```

### 2. Join Route Enhancement

**File:** `src/app/api/battles/[battleId]/join/route.ts`

- Modified to set the `fullAt` timestamp when the battle reaches max participants
- Tracks the exact moment when auto-start timer should begin

### 3. Auto-Start API Endpoint

**File:** `src/app/api/battles/auto-start/route.ts`

Created a new API endpoint that:
- Finds all battles that have been full for 30+ minutes
- Automatically marks all participants as ready
- Executes the battle (draws cards, determines winner)
- Distributes prizes
- Secured with `CRON_SECRET` authentication

### 4. Scheduler Script

**File:** `scripts/check-battle-auto-start.ts`

- Standalone script that calls the auto-start API
- Can be run manually or via scheduler
- Includes logging and error handling

### 5. PM2 Configuration

**File:** `ecosystem.battle-scheduler.config.cjs`

- PM2 ecosystem config for production deployment
- Configured to run every minute using cron mode
- Includes environment variable setup

### 6. Package.json Update

Added npm script:
```json
"check-auto-start": "tsx scripts/check-battle-auto-start.ts"
```

### 7. Documentation

Created three documentation files:
- `BATTLE_AUTO_START_SETUP.md` - Comprehensive setup guide
- `BATTLE_AUTO_START_QUICKSTART.md` - Quick 5-minute setup
- `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md` - This file

### 8. Additional Files

**File:** `src/lib/battle-auto-start-scheduler.ts`
- Node-cron based scheduler (requires `node-cron` package)
- Alternative to PM2 cron mode

## How It Works

### Normal Flow (Manual Start)

1. User creates a battle
2. Players join the battle
3. When full, `fullAt` is set
4. Players mark themselves ready
5. Creator/admin clicks "Start Battle"
6. Battle runs immediately

### Auto-Start Flow (30 Minutes)

1. User creates a battle
2. Players join the battle
3. When full, `fullAt` is set to current timestamp
4. Players wait but don't click "Start"
5. **After 30 minutes:** Scheduler detects battle
6. All participants auto-marked as ready
7. Battle runs automatically
8. Winner determined and prizes distributed

## Next Steps for You

### 1. Apply Database Changes

```bash
cd C:\PA
npm run db:generate
npm run db:push
```

### 2. Set Environment Variables

Add to your `.env` file:

```env
CRON_SECRET=generate-a-secure-random-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Use a strong random secret for `CRON_SECRET`!

### 3. Optional: Install node-cron (if using the scheduler)

```bash
npm install node-cron @types/node-cron
```

### 4. Test the Implementation

#### Quick Manual Test:

```bash
npm run check-auto-start
```

You should see:
```
[AUTO-START] Checking for battles to auto-start...
[AUTO-START] Check completed
[AUTO-START] Processed: 0 battles
[AUTO-START] Done
```

#### For Testing with Shorter Wait Time:

Edit `src/app/api/battles/auto-start/route.ts` line 21:

```typescript
// Change from 30 minutes to 1 minute for testing
const thirtyMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
```

Then:
1. Create a battle
2. Join with all required players
3. Wait 1 minute
4. Run: `npm run check-auto-start`
5. Battle should auto-start!

**Remember to change it back to 30 minutes for production!**

### 5. Deploy the Scheduler

Choose your preferred method:

#### Option A: PM2 (Recommended for Production)

```bash
pm2 start ecosystem.battle-scheduler.config.cjs
pm2 save
pm2 startup  # To run on system boot
```

#### Option B: System Cron Job (Linux/Mac)

```bash
crontab -e
```

Add:
```
* * * * * cd /path/to/pack-attack && npm run check-auto-start >> /var/log/battle-auto-start.log 2>&1
```

#### Option C: Windows Task Scheduler

Create a scheduled task that runs `npm run check-auto-start` every minute.

## Configuration Options

### Change Auto-Start Timeout

Edit `src/app/api/battles/auto-start/route.ts`:

```typescript
// Default: 30 minutes
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

// For 15 minutes:
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

// For 1 hour:
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
```

### Change Scheduler Frequency

Default: Every 1 minute

**PM2 (`ecosystem.battle-scheduler.config.cjs`):**
```javascript
cron_restart: '*/5 * * * *', // Every 5 minutes
```

**Cron:**
```cron
*/5 * * * * cd /path/to/pack-attack && npm run check-auto-start
```

## Security Features

✅ API endpoint requires authentication via `CRON_SECRET`
✅ Only processes battles in WAITING status
✅ Uses database transactions for consistency
✅ Same battle logic as manual start (no shortcuts)
✅ Proper error handling and logging

## Testing Checklist

- [ ] Database schema updated (`npm run db:push`)
- [ ] Environment variables set in `.env`
- [ ] Can run `npm run check-auto-start` successfully
- [ ] Created test battle with 2 players
- [ ] Both players joined (battle full)
- [ ] `fullAt` timestamp is set in database
- [ ] After timeout, battle auto-starts
- [ ] Winner is determined correctly
- [ ] Prizes are distributed
- [ ] Battle status is FINISHED

## Monitoring

### Check Scheduler Status

```bash
pm2 status
pm2 logs battle-auto-start-scheduler
```

### View Auto-Started Battles

```sql
SELECT 
  id, 
  status,
  fullAt,
  startedAt,
  DATEDIFF(MINUTE, fullAt, startedAt) as minutes_waited
FROM Battle
WHERE fullAt IS NOT NULL
ORDER BY startedAt DESC
LIMIT 10;
```

## Rollback Plan

If you need to disable this feature:

1. Stop scheduler: `pm2 stop battle-auto-start-scheduler`
2. Feature is passive - won't affect existing battles
3. To remove DB field: Run migration to drop `fullAt` column

## Files Summary

### Modified Files
1. `prisma/schema.prisma` - Added fullAt field
2. `src/app/api/battles/[battleId]/join/route.ts` - Sets fullAt timestamp
3. `package.json` - Added check-auto-start script

### New Files
1. `src/app/api/battles/auto-start/route.ts` - Auto-start API endpoint
2. `scripts/check-battle-auto-start.ts` - Scheduler script
3. `ecosystem.battle-scheduler.config.cjs` - PM2 config
4. `src/lib/battle-auto-start-scheduler.ts` - Node-cron scheduler
5. `BATTLE_AUTO_START_SETUP.md` - Full documentation
6. `BATTLE_AUTO_START_QUICKSTART.md` - Quick setup guide
7. `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md` - This file

## Support

For questions or issues:
1. Check the logs (`pm2 logs` or manual run output)
2. Verify environment variables are set
3. Test the API endpoint directly
4. Check database for `fullAt` timestamps
5. Review the full documentation in `BATTLE_AUTO_START_SETUP.md`

---

**Status:** ✅ Implementation Complete
**Ready for Testing:** Yes
**Production Ready:** Yes (after testing)
