module.exports = {
  apps: [
    {
      name: 'discord-music-bot',
      script: 'index.js',
      node_args: '--expose-gc',
      max_memory_restart: '1G',
      restart_delay: 3000,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
