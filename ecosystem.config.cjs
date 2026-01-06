module.exports = {
  apps: [
    {
      name: 'packattack',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/packattack/app',
      
      // Restart settings for high availability
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      
      // Memory management
      max_memory_restart: '1G',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/packattack-error.log',
      out_file: '/var/log/pm2/packattack-out.log',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Watch for crashes and restart
      exp_backoff_restart_delay: 100,
      
      // Cluster mode for multi-core (optional, set to 1 for single instance)
      instances: 1,
      exec_mode: 'fork',
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

