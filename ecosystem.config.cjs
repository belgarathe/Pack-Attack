module.exports = {
  apps: [
    {
      name: 'packattack',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/packattack/app',
      
      // ================================================
      // RESTART SETTINGS - Critical for stability
      // ================================================
      autorestart: true,
      max_restarts: 20,           // Allow more restarts before giving up
      min_uptime: '60s',          // Consider healthy only after 60s uptime
      restart_delay: 3000,        // Wait 3s between restarts
      
      // Exponential backoff for repeated crashes
      exp_backoff_restart_delay: 200,
      
      // ================================================
      // SCHEDULED RESTART - Prevent memory buildup
      // ================================================
      // Restart daily at 4:00 AM UTC to clear any accumulated memory
      cron_restart: '0 4 * * *',
      
      // ================================================
      // MEMORY MANAGEMENT - Aggressive leak prevention
      // ================================================
      max_memory_restart: '600M', // Restart early at 600MB to prevent runaway growth
      
      // ================================================
      // ENVIRONMENT
      // ================================================
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Enable database heartbeat in production
        ENABLE_DB_HEARTBEAT: 'true',
        // Limit Node.js memory to prevent runaway processes
        NODE_OPTIONS: '--max-old-space-size=512',
      },
      
      // ================================================
      // LOGGING - Essential for debugging
      // ================================================
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/packattack-error.log',
      out_file: '/var/log/pm2/packattack-out.log',
      merge_logs: true,
      log_type: 'json',
      
      // ================================================
      // GRACEFUL SHUTDOWN - Clean database connections
      // ================================================
      kill_timeout: 15000,        // Give 15s for cleanup
      wait_ready: true,
      listen_timeout: 20000,      // Allow 20s startup time
      shutdown_with_message: true,
      
      // ================================================
      // PROCESS MONITORING
      // ================================================
      instances: 1,
      exec_mode: 'fork',
      
      // Watch for hanging processes
      // If process doesn't respond to PM2 for 30s, restart
      // Note: This requires PM2 Plus for full functionality
    },
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'root',
      host: '82.165.66.236',
      ref: 'origin/main',
      repo: 'git@github.com:user/pack-attack.git',
      path: '/var/www/packattack',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npx prisma db push && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
};


