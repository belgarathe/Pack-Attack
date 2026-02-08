# Battle Auto-Start Quick Start

## What This Does

When all players join a battle but don't start it within 30 minutes, the system will automatically start the battle and run it to completion.

## Quick Setup (5 minutes)

### 1. Install Dependencies (Optional - for node-cron scheduler)

```bash
npm install node-cron @types/node-cron
```

### 2. Update Database Schema

```bash
npm run db:push
```

This adds the `fullAt` field to track when battles become full.

### 3. Set Environment Variables

Add to your `.env` file:

```env
# Use a strong random secret!
CRON_SECRET=your-secure-random-secret-key-here

# Your application URL (production or localhost)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start the Auto-Start Checker

Choose one method:

#### Method A: Quick Test (Manual)
```bash
npm run check-auto-start
```

#### Method B: PM2 (Production - Recommended)
```bash
pm2 start ecosystem.battle-scheduler.config.cjs
pm2 save
```

#### Method C: System Cron Job
```bash
# Edit crontab
crontab -e

# Add this line (runs every minute)
* * * * * cd /path/to/pack-attack && npm run check-auto-start >> /var/log/battle-auto-start.log 2>&1
```

## Verification

### Test the Feature

1. **Create a test battle** with 2 players
2. **Join with all players** (battle becomes full)
3. **Wait or manually trigger**: `npm run check-auto-start`
4. **Check logs** for auto-start activity

### Check It's Working

```bash
# If using PM2
pm2 logs battle-auto-start-scheduler

# Or run manually to see immediate output
npm run check-auto-start
```

You should see output like:
```
[AUTO-START] Checking for battles to auto-start...
[AUTO-START] Check completed
[AUTO-START] Processed: 0 battles
```

## For Testing (Reduce Wait Time)

To test with shorter wait time, edit `src/app/api/battles/auto-start/route.ts`:

```typescript
// Change from 30 minutes to 1 minute for testing
const thirtyMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);
```

**Remember to change it back to 30 minutes for production!**

## Files Changed

- ✅ `prisma/schema.prisma` - Added `fullAt` field to Battle model
- ✅ `src/app/api/battles/[battleId]/join/route.ts` - Sets `fullAt` when battle becomes full
- ✅ `src/app/api/battles/auto-start/route.ts` - Auto-start logic
- ✅ `scripts/check-battle-auto-start.ts` - Scheduler script
- ✅ `ecosystem.battle-scheduler.config.cjs` - PM2 configuration
- ✅ `package.json` - Added `check-auto-start` script

## Troubleshooting

### "Unauthorized" Error
- Check that `CRON_SECRET` in `.env` matches what the scheduler uses
- Verify the environment variable is loaded

### Battles Not Auto-Starting
1. Check if `fullAt` is being set:
   ```sql
   SELECT id, fullAt, status FROM Battle WHERE status = 'WAITING';
   ```
2. Run manually: `npm run check-auto-start`
3. Check the time threshold (30 minutes by default)

### Database Schema Issues
```bash
# Regenerate Prisma client
npm run db:generate

# Push schema changes
npm run db:push
```

## Need Help?

See the full documentation: `BATTLE_AUTO_START_SETUP.md`
