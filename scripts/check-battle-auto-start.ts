#!/usr/bin/env tsx
/**
 * Battle Auto-Start Checker
 * 
 * This script checks for battles that have been full for 30 minutes
 * and automatically starts them.
 * 
 * Usage:
 *   tsx scripts/check-battle-auto-start.ts
 * 
 * Can be run with:
 *   - Manual execution
 *   - Cron job (every minute)
 *   - PM2 with cron mode
 *   - Windows Task Scheduler
 */

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function checkAndStartBattles() {
  try {
    console.log('[AUTO-START] Checking for battles to auto-start...');
    
    const response = await fetch(`${API_BASE_URL}/api/battles/auto-start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('[AUTO-START] Check completed');
    console.log(`[AUTO-START] Processed: ${result.processed} battles`);
    
    if (result.results && result.results.length > 0) {
      console.log('[AUTO-START] Results:');
      result.results.forEach((r: any) => {
        console.log(`  - Battle ${r.battleId}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
      });
    }

    return result;
  } catch (error) {
    console.error('[AUTO-START] Error:', error);
    throw error;
  }
}

// Run the check
checkAndStartBattles()
  .then(() => {
    console.log('[AUTO-START] Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[AUTO-START] Failed:', error);
    process.exit(1);
  });
