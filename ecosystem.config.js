module.exports = {
  apps: [{
    name: 'packattack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/packattack/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/packattack/.pm2/logs/packattack-error.log',
    out_file: '/home/packattack/.pm2/logs/packattack-out.log',
    log_file: '/home/packattack/.pm2/logs/packattack-combined.log',
    time: true,
    kill_timeout: 5000,
    wait_ready: false,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
