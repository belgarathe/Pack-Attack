# Battle Auto-Start Setup Guide

This guide explains how to set up automatic battle starting for battles where all players have joined but haven't pressed the start button within 30 minutes.

## Overview

When all players join a battle, the system now tracks the time (`fullAt` timestamp). If 30 minutes pass and the battle hasn't been started manually, it will be automatically started by the scheduler.

## Components

### 1. Database Migration

First, apply the database schema changes:

```bash
npm run db:push
```

Or if using migrations:

```bash
npm run db:migrate
```

This adds the `fullAt` field to the `Battle` model.

### 2. Environment Variables

Add these to your `.env` file:

```env
# Secret key for authenticating cron job requests
CRON_SECRET=your-secure-random-secret-key-here

# Your application URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important:** Use a strong, random secret for `CRON_SECRET` in production!

### 3. API Endpoint

The auto-start logic is available at:
- `POST /api/battles/auto-start`
- Requires `Authorization: Bearer <CRON_SECRET>` header

### 4. Running the Scheduler

You have several options to run the scheduler:

#### Option A: PM2 with Cron Mode (Recommended for Production)

```bash
# Install PM2 if you haven't already
npm install -g pm2

# Start the scheduler
pm2 start ecosystem.battle-scheduler.config.cjs

# Save the PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

#### Option B: Manual Cron Job (Linux/Mac)

1. Open crontab:
   ```bash
   crontab -e
   ```

2. Add this line to run every minute:
   ```cron
   * * * * * cd /path/to/pack-attack && npm run check-auto-start >> /var/log/battle-auto-start.log 2>&1
   ```

#### Option C: Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task:
   - **Trigger:** Run every 1 minute
   - **Action:** Start a program
     - Program: `node`
     - Arguments: `C:\path\to\node_modules\.bin\tsx scripts/check-battle-auto-start.ts`
     - Start in: `C:\path\to\pack-attack`
3. Set environment variables in the task

#### Option D: Manual Testing

Run manually to test:

```bash
npm run check-auto-start
```

## How It Works

### 1. Battle Creation Flow

1. User creates a battle
2. Other players join the battle
3. When the battle becomes full (reaches `maxParticipants`), the `fullAt` timestamp is set
4. Players can mark themselves as ready
5. Creator or admin can manually start the battle

### 2. Auto-Start Flow

1. Every minute, the scheduler checks for battles where:
   - Status is `WAITING`
   - `fullAt` timestamp is older than 30 minutes
   - Battle is full

2. For each qualifying battle:
   - All participants are automatically marked as ready
   - The battle is started using the same logic as manual start
   - Cards are drawn and distributed
   - Winner is determined
   - Battle status changes to `FINISHED`

## Testing

### 1. Create a Test Battle

```bash
# Create a battle with shorter timeout for testing
# You can temporarily modify the 30-minute check in the auto-start route
```

### 2. Monitor Logs

```bash
# If using PM2
pm2 logs battle-auto-start-scheduler

# Or check your log files
tail -f /var/log/battle-auto-start.log
```

### 3. Manual Test

```bash
# Run the checker manually
npm run check-auto-start

# Check the output for any battles processed
```

## Security Considerations

1. **Protect the API endpoint:**
   - The `/api/battles/auto-start` endpoint requires authentication
   - Use a strong `CRON_SECRET` in production
   - Keep this secret secure and don't commit it to version control

2. **Rate limiting:**
   - The endpoint can only be called with the correct secret
   - Consider adding additional rate limiting if needed

3. **Database transactions:**
   - All battle operations use database transactions for consistency
   - If an error occurs, the battle state won't be corrupted

## Monitoring

### Check Scheduler Status

```bash
# If using PM2
pm2 status battle-auto-start-scheduler
pm2 logs battle-auto-start-scheduler --lines 100
```

### View Recent Auto-Started Battles

You can query the database to see battles that were auto-started:

```sql
SELECT 
  id, 
  createdAt, 
  fullAt, 
  startedAt,
  TIMESTAMPDIFF(MINUTE, fullAt, startedAt) as minutes_waited
FROM Battle
WHERE 
  fullAt IS NOT NULL 
  AND startedAt IS NOT NULL
  AND TIMESTAMPDIFF(MINUTE, fullAt, startedAt) >= 29
ORDER BY startedAt DESC
LIMIT 20;
```

## Troubleshooting

### Scheduler Not Running

1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs battle-auto-start-scheduler`
3. Verify environment variables are set
4. Test manually: `npm run check-auto-start`

### Battles Not Auto-Starting

1. Verify the `fullAt` timestamp is set on full battles
2. Check the 30-minute threshold
3. Verify `CRON_SECRET` matches in both `.env` and scheduler
4. Check API endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/battles/auto-start \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Database Issues

1. Ensure database migrations are applied
2. Check that `fullAt` field exists in `Battle` table
3. Verify database connection in logs

## Configuration

### Adjust Auto-Start Timeout

To change the 30-minute timeout, edit:
- `src/app/api/battles/auto-start/route.ts`
- Change the line: `const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);`
- Example for 15 minutes: `const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);`

### Adjust Scheduler Frequency

To change how often the scheduler runs:

**PM2 (ecosystem.battle-scheduler.config.cjs):**
```javascript
cron_restart: '*/5 * * * *', // Every 5 minutes instead of every minute
```

**Cron job:**
```cron
*/5 * * * * cd /path/to/pack-attack && npm run check-auto-start
```

## Rollback

If you need to disable the auto-start feature:

1. Stop the scheduler:
   ```bash
   pm2 stop battle-auto-start-scheduler
   pm2 delete battle-auto-start-scheduler
   ```

2. The feature is passive - existing battles won't be affected
3. To remove the database field (optional):
   ```sql
   ALTER TABLE Battle DROP COLUMN fullAt;
   ```

## Support

For issues or questions, check:
- Application logs: `pm2 logs` or your log files
- Database: Check `Battle` table for `fullAt` timestamps
- API: Test the `/api/battles/auto-start` endpoint manually
