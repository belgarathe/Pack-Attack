/**
 * Level Reward Scheduler
 *
 * Runs a cron job on the 1st of each month at midnight that pays out
 * deferred level-up coins to all users who hit the monthly cap.
 */

import cron from 'node-cron';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function startLevelRewardScheduler() {
  console.log('[LEVEL-SCHEDULER] Starting level reward scheduler...');

  // Run at midnight on the 1st of each month
  cron.schedule('0 0 1 * *', async () => {
    try {
      console.log('[LEVEL-SCHEDULER] Running monthly level reward payout...');

      const response = await fetch(`${API_BASE_URL}/api/internal/level-rewards/payout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(
        `[LEVEL-SCHEDULER] Payout complete: ${result.usersProcessed} users, ${result.totalCoinsPaid} coins`
      );
    } catch (error) {
      console.error('[LEVEL-SCHEDULER] Error running payout:', error);
    }
  });

  console.log('[LEVEL-SCHEDULER] Level reward scheduler is running (1st of each month at midnight)');
}

// If running this file directly (for standalone scheduler process)
if (require.main === module) {
  console.log('Starting standalone level reward scheduler...');
  startLevelRewardScheduler();
  console.log('Scheduler is now running. Press Ctrl+C to stop.');
}
