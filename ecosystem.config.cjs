module.exports = {
  apps: [{
    name: 'doc-cms',
    script: 'server/index.js',
    cwd: '/root/web',
    env: {
      NODE_ENV: 'production',
      PORT: 80,
    },
    max_restarts: 10,
    restart_delay: 3000,
    max_memory_restart: '500M',
    error_file: '/root/web/logs/pm2-error.log',
    out_file: '/root/web/logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
