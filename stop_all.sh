#!/bin/bash

echo "=== 停止A2A隐蔽通信系统 ==="

# 读取PID文件并停止进程
if [ -f ".server_pid" ]; then
    SERVER_PID=$(cat .server_pid)
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "停止服务器包装器 (PID: $SERVER_PID)..."
        kill $SERVER_PID
        sleep 2
        if kill -0 $SERVER_PID 2>/dev/null; then
            echo "强制停止服务器包装器..."
            kill -9 $SERVER_PID
        fi
    fi
    rm -f .server_pid
fi

if [ -f ".client_pid" ]; then
    CLIENT_PID=$(cat .client_pid)
    if kill -0 $CLIENT_PID 2>/dev/null; then
        echo "停止客户端包装器 (PID: $CLIENT_PID)..."
        kill $CLIENT_PID
        sleep 2
        if kill -0 $CLIENT_PID 2>/dev/null; then
            echo "强制停止客户端包装器..."
            kill -9 $CLIENT_PID
        fi
    fi
    rm -f .client_pid
fi

if [ -f ".frontend_pid" ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "停止前端服务器 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        sleep 2
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "强制停止前端服务器..."
            kill -9 $FRONTEND_PID
        fi
    fi
    rm -f .frontend_pid
fi

# 清理所有相关进程
echo "清理所有相关进程..."
pkill -f "server_wrapper.py" 2>/dev/null || true
pkill -f "client_wrapper.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "python.*server/main.py" 2>/dev/null || true

# 等待端口释放
sleep 2

echo "✅ 所有服务已停止"
echo "清理完成！"
