module.exports = {
  apps: [
    {
      name: 'battle-auto-start-scheduler',
      script: 'tsx',
      args: 'scripts/check-battle-auto-start.ts',
      cron_restart: '* * * * *', // Run every minute
      autorestart: false, // Don't restart automatically (cron will handle it)
      watch: false,
      env: {
        NODE_ENV: 'production',
        CRON_SECRET: process.env.CRON_SECRET || 'your-secret-key',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    },
  ],
};
