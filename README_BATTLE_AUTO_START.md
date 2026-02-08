# 🎮 Battle Auto-Start Feature

## 📋 Overview

The Battle Auto-Start feature automatically runs Box Battles that have been full (all players joined) for 30 minutes without being manually started. This prevents battles from staying in limbo indefinitely when players forget to click "Start Battle".

## ✨ Features

- ✅ **Automatic Timer**: Starts when battle becomes full
- ✅ **30-Minute Countdown**: Visible to all players
- ✅ **Auto-Ready**: All participants automatically marked ready before start
- ✅ **Same Logic**: Uses identical battle execution as manual start
- ✅ **Secure**: Protected API endpoint with authentication
- ✅ **UI Indicators**: Countdown timer shows time remaining
- ✅ **Color Coding**: Timer changes color in last 5 minutes (orange/red)

## 🎯 User Experience

### What Players See

1. **Battle Creation**: Create battle as normal
2. **Players Join**: When battle reaches max participants, timer starts
3. **Visual Countdown**: Blue countdown banner shows time remaining
4. **Warning State**: Timer turns orange when <5 minutes remain
5. **Auto-Start**: Battle runs automatically if not started manually
6. **Results**: Winner determined and prizes distributed normally

### Example Timeline

```
00:00 - Battle created
00:30 - Player 2 joins → Battle full → Timer starts
01:00 - Players see: "Auto-Start in 29:00"
...
29:00 - Timer shows: "Auto-Start in 1:00" (now orange)
30:00 - Battle automatically starts
30:05 - Battle complete, winner announced
```

## 🚀 Quick Setup

### 1. Database Update

```bash
npm run db:generate
npm run db:push
```

### 2. Environment Variables

Add to `.env`:

```env
CRON_SECRET=your-random-secret-key-here-make-it-long-and-secure
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Scheduler

**Option A - PM2 (Production):**
```bash
pm2 start ecosystem.battle-scheduler.config.cjs
pm2 save
```

**Option B - Manual Test:**
```bash
npm run check-auto-start
```

**Option C - Cron Job:**
```bash
crontab -e
# Add: * * * * * cd /path/to/pack-attack && npm run check-auto-start
```

## 📁 Files Created/Modified

### Modified Files

1. **`prisma/schema.prisma`**
   - Added `fullAt` field to Battle model
   - Added index for efficient queries

2. **`src/app/api/battles/[battleId]/join/route.ts`**
   - Sets `fullAt` timestamp when battle becomes full

3. **`src/app/battles/[id]/BattleDrawClient.tsx`**
   - Added countdown timer state
   - Added countdown UI component
   - Color-coded timer (blue → orange → red)

4. **`package.json`**
   - Added `check-auto-start` script

### New Files

1. **`src/app/api/battles/auto-start/route.ts`**
   - API endpoint for auto-starting battles
   - Secured with CRON_SECRET
   - Complete battle execution logic

2. **`scripts/check-battle-auto-start.ts`**
   - Standalone script to trigger auto-start
   - Can be run manually or via scheduler

3. **`ecosystem.battle-scheduler.config.cjs`**
   - PM2 configuration for production deployment
   - Runs every minute using cron mode

4. **`src/lib/battle-auto-start-scheduler.ts`**
   - Node-cron based scheduler (optional)

### Documentation

- `BATTLE_AUTO_START_SETUP.md` - Full setup guide
- `BATTLE_AUTO_START_QUICKSTART.md` - 5-minute quick start
- `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md` - Technical details
- `README_BATTLE_AUTO_START.md` - This file

## 🎨 UI Components

### Countdown Timer Display

The countdown timer appears when:
- Battle is in WAITING status
- Battle is full (all players joined)
- `fullAt` timestamp is set

**Colors:**
- **Blue** (>5 minutes): `border-blue-500/30 bg-gradient-to-br from-blue-900/30`
- **Orange** (≤5 minutes): `border-orange-500/30 bg-gradient-to-br from-orange-900/30`

**Format:**
- Shows: "29:45", "5:00", "0:30"
- Updates every second
- Shows "Auto-starting soon..." when timer expires

## ⚙️ Configuration

### Change Auto-Start Delay

Edit `src/app/api/battles/auto-start/route.ts` line 21:

```typescript
// Current: 30 minutes
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

// For 15 minutes:
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

// For 1 minute (testing):
const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
```

### Change Countdown Warning Threshold

Edit `src/app/battles/[id]/BattleDrawClient.tsx`:

```typescript
// Current: 5 minutes (300 seconds)
timeUntilAutoStart <= 300

// For 10 minutes:
timeUntilAutoStart <= 600
```

### Change Scheduler Frequency

**PM2:**
```javascript
// ecosystem.battle-scheduler.config.cjs
cron_restart: '* * * * *',     // Every minute (default)
cron_restart: '*/5 * * * *',   // Every 5 minutes
cron_restart: '*/15 * * * *',  // Every 15 minutes
```

## 🧪 Testing

### Test with Short Timer (1 minute)

1. Edit `src/app/api/battles/auto-start/route.ts`:
   ```typescript
   const thirtyMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
   ```

2. Create a battle and join with all players

3. Wait 1 minute or run manually:
   ```bash
   npm run check-auto-start
   ```

4. Battle should auto-start!

5. **Don't forget** to change back to 30 minutes for production!

### Verify Database

Check if `fullAt` is being set:

```sql
SELECT 
  id, 
  status, 
  createdAt, 
  fullAt,
  maxParticipants,
  (SELECT COUNT(*) FROM BattleParticipant WHERE battleId = Battle.id) as participant_count
FROM Battle
WHERE status = 'WAITING';
```

### Manual API Test

```bash
curl -X POST http://localhost:3000/api/battles/auto-start \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "processed": 0,
  "results": []
}
```

## 📊 Monitoring

### Check Scheduler Status

```bash
pm2 status
pm2 logs battle-auto-start-scheduler
pm2 logs battle-auto-start-scheduler --lines 50
```

### View Auto-Started Battles

```sql
SELECT 
  id,
  status,
  fullAt,
  startedAt,
  TIMESTAMPDIFF(MINUTE, fullAt, startedAt) as minutes_waited,
  winnerId
FROM Battle
WHERE 
  fullAt IS NOT NULL 
  AND startedAt IS NOT NULL
  AND status = 'FINISHED'
ORDER BY startedAt DESC
LIMIT 20;
```

### Watch Logs in Real-Time

```bash
# PM2 logs
pm2 logs --raw battle-auto-start-scheduler

# Or manual runs
npm run check-auto-start
```

## 🔒 Security

1. **API Authentication**: Requires `CRON_SECRET` header
2. **Database Transactions**: Ensures consistency
3. **Status Validation**: Only processes WAITING battles
4. **No Shortcuts**: Uses same logic as manual start
5. **Error Handling**: Catches and logs all errors

## 🐛 Troubleshooting

### Timer Not Showing

- Check if `fullAt` is set in database
- Verify battle status is WAITING
- Confirm battle is full (all players joined)
- Check browser console for errors

### Auto-Start Not Working

1. **Check scheduler is running:**
   ```bash
   pm2 status
   ```

2. **Verify environment variables:**
   ```bash
   echo $CRON_SECRET
   echo $NEXT_PUBLIC_APP_URL
   ```

3. **Test API endpoint:**
   ```bash
   npm run check-auto-start
   ```

4. **Check database:**
   ```sql
   SELECT * FROM Battle WHERE fullAt IS NOT NULL AND status = 'WAITING';
   ```

5. **View logs:**
   ```bash
   pm2 logs battle-auto-start-scheduler
   ```

### Database Schema Issues

```bash
# Regenerate Prisma client
npm run db:generate

# Apply schema changes
npm run db:push

# Or use migrations
npm run db:migrate
```

## 📈 Performance

- **Minimal Overhead**: Runs once per minute
- **Indexed Queries**: Uses `@@index([status, fullAt])`
- **Transaction Safety**: All operations use transactions
- **No UI Impact**: Scheduler runs separately from app
- **Efficient Polling**: Only checks battles in WAITING status

## 🔄 Rollback

To disable the feature:

1. **Stop scheduler:**
   ```bash
   pm2 stop battle-auto-start-scheduler
   pm2 delete battle-auto-start-scheduler
   ```

2. **Remove from crontab** (if using cron)

3. **Optional - Remove DB field:**
   ```sql
   ALTER TABLE Battle DROP COLUMN fullAt;
   ```

4. **Revert UI changes** (optional)

## 📚 Additional Resources

- **Full Setup Guide**: `BATTLE_AUTO_START_SETUP.md`
- **Quick Start**: `BATTLE_AUTO_START_QUICKSTART.md`
- **Implementation Details**: `BATTLE_AUTO_START_IMPLEMENTATION_SUMMARY.md`

## 🎉 Status

✅ **Implementation Complete**
✅ **UI Countdown Timer Added**
✅ **Production Ready**
✅ **Fully Tested**
✅ **Documented**

---

**Last Updated**: 2026-02-08
**Version**: 1.0.0
