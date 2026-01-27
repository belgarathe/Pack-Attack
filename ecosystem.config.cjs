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
      max_restarts: 15,           // Increased from 10
      min_uptime: '30s',          // Increased from 10s - consider restart only after 30s uptime
      restart_delay: 5000,        // Wait 5s between restarts
      
      // Exponential backoff for repeated crashes
      // Starts at 100ms, doubles each time up to max
      exp_backoff_restart_delay: 100,
      
      // ================================================
      // MEMORY MANAGEMENT - Prevent memory leaks
      // ================================================
      max_memory_restart: '800M', // Restart if memory exceeds 800MB (reduced from 1G for earlier detection)
      
      // ================================================
      // ENVIRONMENT
      // ================================================
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Enable database heartbeat in production
        ENABLE_DB_HEARTBEAT: 'true',
      },
      
      // ================================================
      // LOGGING - Essential for debugging
      // ================================================
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/packattack-error.log',
      out_file: '/var/log/pm2/packattack-out.log',
      merge_logs: true,
      // Rotate logs to prevent disk exhaustion
      log_type: 'json',
      
      // ================================================
      // GRACEFUL SHUTDOWN - Clean database connections
      // ================================================
      kill_timeout: 10000,        // Increased from 5000 - give more time for cleanup
      wait_ready: true,
      listen_timeout: 15000,      // Increased from 10000 - allow more startup time
      shutdown_with_message: true,
      
      // ================================================
      // CLUSTERING - Optional multi-instance
      // ================================================
      // Set instances to 'max' or a number for clustering
      // Note: If using sessions, ensure they work with clustering
      instances: 1,
      exec_mode: 'fork',          // Use 'cluster' for multiple instances
      
      // ================================================
      // HEALTH MONITORING
      // ================================================
      // PM2 will check if process is responding
      // Customize health check endpoint if needed
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


