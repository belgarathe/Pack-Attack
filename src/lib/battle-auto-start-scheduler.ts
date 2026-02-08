/**
 * Battle Auto-Start Scheduler
 * 
 * This module runs a cron job that checks for battles that have been full
 * for 30 minutes and automatically starts them.
 * 
 * It runs every minute and calls the /api/battles/auto-start endpoint.
 */

import cron from 'node-cron';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function startBattleAutoStartScheduler() {
  console.log('[SCHEDULER] Starting battle auto-start scheduler...');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('[SCHEDULER] Running auto-start check...');
      
      const response = await fetch(`${API_BASE_URL}/api/battles/auto-start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.processed > 0) {
        console.log(`[SCHEDULER] Processed ${result.processed} battles`);
        console.log('[SCHEDULER] Results:', result.results);
      }
    } catch (error) {
      console.error('[SCHEDULER] Error running auto-start:', error);
    }
  });

  console.log('[SCHEDULER] Battle auto-start scheduler is running (every minute)');
}

// If running this file directly (for standalone scheduler process)
if (require.main === module) {
  console.log('Starting standalone battle auto-start scheduler...');
  startBattleAutoStartScheduler();
  console.log('Scheduler is now running. Press Ctrl+C to stop.');
}
