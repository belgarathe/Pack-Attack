module.exports = {
  apps: [{
    name: 'packattack',
    script: './node_modules/.bin/next',  // Direct next binary (faster)
    args: 'start',
    cwd: '/var/www/packattack/app',
    
    // Instance configuration
    instances: 1,
    exec_mode: 'fork',
    
    // Restart policy (OPTIMIZED)
    autorestart: true,
    max_restarts: 100,              // Increased from 15
    min_uptime: '10s',              // Reduced from 30s (faster recovery)
    restart_delay: 3000,            // Reduced from 5000ms
    exp_backoff_restart_delay: 500, // Increased from 100 (less aggressive)
    
    // Memory management
    max_memory_restart: '1G',       // Increased from 800M
    
    // Monitoring
    watch: false,
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=1024' // Set heap limit
    },
    
    // Logging
    error_file: '/var/log/packattack/pm2-error.log',
    out_file: '/var/log/packattack/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Timeouts
    kill_timeout: 3000,     // Reduced from 5000ms
    listen_timeout: 15000,  // Increased from 10000ms (more time to start)
    
    // Cron restart (daily cleanup)
    cron_restart: '0 4 * * *'
  }]
};
