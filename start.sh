#!/bin/bash
# Doc CMS 一键启动脚本（PM2 托管）
# 用法: ./start.sh          # 启动
#       ./start.sh restart  # 重启
#       ./start.sh stop     # 停止
#       ./start.sh logs     # 查看日志

set -e

ACTION="${1:-start}"

cd /root/web

case "$ACTION" in
  start)
    echo "📦 Building frontend..."
    cd frontend && npm run build
    cd /root/web

    echo "🚀 Starting Doc CMS with PM2 on port 80..."
    pm2 start ecosystem.config.cjs
    pm2 save

    echo ""
    echo "✅ Doc CMS is running!"
    echo "   http://localhost (port 80)"
    echo "   Admin password: admin123"
    echo ""
    echo "📋 Useful commands:"
    echo "   pm2 status          - 查看状态"
    echo "   pm2 logs doc-cms    - 查看日志"
    echo "   pm2 monit           - 监控面板"
    echo "   ./start.sh restart  - 重启"
    echo "   ./start.sh stop     - 停止"
    ;;

  restart)
    echo "🔄 Restarting Doc CMS..."
    cd frontend && npm run build
    pm2 restart ecosystem.config.cjs
    pm2 save
    echo "✅ Restarted"
    ;;

  stop)
    echo "🛑 Stopping Doc CMS..."
    pm2 stop doc-cms
    echo "✅ Stopped"
    ;;

  logs)
    pm2 logs doc-cms
    ;;

  *)
    echo "Usage: $0 {start|restart|stop|logs}"
    exit 1
    ;;
esac
