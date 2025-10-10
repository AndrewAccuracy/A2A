#!/bin/bash

# A2A隐蔽通信演示系统停止脚本

echo "=== 停止A2A隐蔽通信演示系统 ==="

# 停止前端
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "停止前端服务器 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    rm -f logs/frontend.pid
fi

# 停止客户端API
if [ -f "logs/client_api.pid" ]; then
    CLIENT_API_PID=$(cat logs/client_api.pid)
    if ps -p $CLIENT_API_PID > /dev/null; then
        echo "停止客户端API (PID: $CLIENT_API_PID)..."
        kill $CLIENT_API_PID
    fi
    rm -f logs/client_api.pid
fi

# 停止服务器端
if [ -f "logs/server.pid" ]; then
    SERVER_PID=$(cat logs/server.pid)
    if ps -p $SERVER_PID > /dev/null; then
        echo "停止服务器端 (PID: $SERVER_PID)..."
        kill $SERVER_PID
    fi
    rm -f logs/server.pid
fi

# 额外清理：杀死可能遗留的进程
echo "清理遗留进程..."
pkill -f "python3 main.py"
pkill -f "python3 client_wrapper.py"
pkill -f "npm start"
pkill -f "react-scripts start"

echo "✅ 所有服务已停止" 