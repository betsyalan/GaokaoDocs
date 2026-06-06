module.exports = {
  apps: [{
    name: 'doc-cms',
    script: 'server/index.js',
    cwd: '/root/web',
    // 默认环境变量（密码通过环境变量 ADMIN_PASSWORD 传入，勿硬编码）
    env: {
      NODE_ENV: 'production',
      PORT: 80,
    },
    // 出错自动重启
    max_restarts: 10,
    restart_delay: 3000,
    // 内存超过 500M 自动重启
    max_memory_restart: '500M',
    // 日志配置
    error_file: '/root/web/logs/pm2-error.log',
    out_file: '/root/web/logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
