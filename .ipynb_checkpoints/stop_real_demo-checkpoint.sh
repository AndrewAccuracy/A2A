#!/bin/bash

echo "=== 停止A2A隐蔽通信演示系统 ==="

# 查找并停止各个服务
echo "正在查找并停止相关进程..."

# 停止A2A服务器 (端口9999)
echo "1. 停止A2A服务器..."
SERVER_PIDS=$(lsof -ti :9999)
if [ ! -z "$SERVER_PIDS" ]; then
    echo "   找到进程: $SERVER_PIDS"
    kill -9 $SERVER_PIDS
    echo "   ✅ A2A服务器已停止"
else
    echo "   ℹ️  A2A服务器未运行"
fi

# 停止客户端包装器 (端口8889)
echo "2. 停止客户端包装器..."
CLIENT_PIDS=$(lsof -ti :8889)
if [ ! -z "$CLIENT_PIDS" ]; then
    echo "   找到进程: $CLIENT_PIDS"
    kill -9 $CLIENT_PIDS
    echo "   ✅ 客户端包装器已停止"
else
    echo "   ℹ️  客户端包装器未运行"
fi

# 停止前端服务器 (端口3000)
echo "3. 停止前端服务器..."
FRONTEND_PIDS=$(lsof -ti :3000)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "   找到进程: $FRONTEND_PIDS"
    kill -9 $FRONTEND_PIDS
    echo "   ✅ 前端服务器已停止"
else
    echo "   ℹ️  前端服务器未运行"
fi

# 等待进程完全停止
sleep 2

echo ""
echo "=== 验证停止状态 ==="

# 检查端口是否释放
check_port_free() {
    local port=$1
    local name=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️  $name (端口$port): 仍在运行"
        return 1
    else
        echo "✅ $name (端口$port): 已停止"
        return 0
    fi
}

all_stopped=true
check_port_free 9999 "A2A服务器" || all_stopped=false
check_port_free 8889 "客户端包装器" || all_stopped=false
check_port_free 3000 "前端服务器" || all_stopped=false

echo ""
if [ "$all_stopped" = true ]; then
    echo "🎉 所有服务已成功停止！"
else
    echo "⚠️  部分服务可能仍在运行，请手动检查"
fi

echo ""
echo "📁 日志文件保留在 logs/ 目录中，可用于调试"
echo "🚀 重新启动: ./start_real_demo.sh" 