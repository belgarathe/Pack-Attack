module.exports = {
  apps: [
    {
      name: 'packattack',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/packattack/app',
      
      // ================================================
      // RESTART SETTINGS - Prevent cascade failure loops
      // ================================================
      autorestart: true,
      max_restarts: 10,           // Limit restarts within time window
      min_uptime: '30s',          // Consider stable after 30s (faster recovery)
      restart_delay: 5000,        // Wait 5s between restarts (prevents rapid cycling)
      
      // Exponential backoff: starts at 100ms, doubles each time, caps at 15s
      // This prevents rapid restart loops that can cause 400+ restarts
      exp_backoff_restart_delay: 100,
      
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
        // Increase HTTP timeout for slow external services
        HTTP_TIMEOUT: '30000',
        // Disable unnecessary telemetry that may cause network errors
        NEXT_TELEMETRY_DISABLED: '1',
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
      
      // ================================================
      // STABILITY PROTECTION
      // ================================================
      // Stop restarting if app fails to stay up for min_uptime
      // within the max_restarts limit (prevents infinite loops)
      stop_exit_codes: [0],       // Only stop auto-restart on clean exit
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


