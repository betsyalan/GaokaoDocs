#!/bin/bash
# Doc CMS 一键启动脚本（PM2 托管）
# 用法: ./start.sh              # 启动
#       ./start.sh restart      # 重启
#       ./start.sh stop         # 停止
#       ./start.sh logs         # 查看日志
#
# 首次使用前请设置管理员密码：
#   export ADMIN_PASSWORD=你的密码
#   ./start.sh

set -e

ACTION="${1:-start}"
cd /root/web

# 检查密码是否设置
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "⚠️  请先设置管理员密码："
  echo "  export ADMIN_PASSWORD=你的密码"
  echo "  或者直接运行："
  echo "  ADMIN_PASSWORD=你的密码 ./start.sh"
  exit 1
fi

case "$ACTION" in
  start)
    echo "📦 Building frontend..."
    cd frontend && npm run build
    cd /root/web

    echo "🚀 Starting GaokaoDocs with PM2 on port 80..."
    ADMIN_PASSWORD="$ADMIN_PASSWORD" pm2 start ecosystem.config.cjs
    pm2 save

    echo ""
    echo "✅ GaokaoDocs is running!"
    echo "   http://localhost"
    echo ""
    echo "📋 Commands:"
    echo "   pm2 status          - status"
    echo "   pm2 logs doc-cms    - logs"
    echo "   pm2 monit           - monitor"
    echo "   ./start.sh restart  - restart"
    echo "   ./start.sh stop     - stop"
    ;;

  restart)
    echo "🔄 Restarting..."
    cd frontend && npm run build
    ADMIN_PASSWORD="$ADMIN_PASSWORD" pm2 restart ecosystem.config.cjs --update-env
    pm2 save
    echo "✅ Restarted"
    ;;

  stop)
    echo "🛑 Stopping..."
    pm2 stop doc-cms
    echo "✅ Stopped"
    ;;

  logs)
    pm2 logs doc-cms
    ;;

  *)
    echo "Usage: $0 {start|restart|stop|logs}"
    echo ""
    echo "  export ADMIN_PASSWORD=your_password"
    echo "  $0 start"
    exit 1
    ;;
esac
