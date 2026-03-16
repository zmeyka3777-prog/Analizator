// PM2 — менеджер процессов для production
module.exports = {
  apps: [
    {
      name: 'analizator',
      script: 'node_modules/.bin/tsx',
      args: 'server/index.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Авто-рестарт при падении
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      // Логи
      out_file: '/var/log/analizator/out.log',
      error_file: '/var/log/analizator/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Память — рестарт если больше 1GB
      max_memory_restart: '1G',
    },
  ],
};
