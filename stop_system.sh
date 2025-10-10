#!/bin/bash

echo "=== 停止A2A隐蔽通信系统 ==="

# 读取PID并停止进程
if [ -f .server_pid ]; then
    SERVER_PID=$(cat .server_pid)
    if kill -0 $SERVER_PID 2>/dev/null; then
        kill $SERVER_PID
        echo "服务器包装器已停止"
    fi
    rm .server_pid
fi

if [ -f .client_pid ]; then
    CLIENT_PID=$(cat .client_pid)
    if kill -0 $CLIENT_PID 2>/dev/null; then
        kill $CLIENT_PID
        echo "客户端包装器已停止"
    fi
    rm .client_pid
fi

if [ -f .frontend_pid ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "前端服务器已停止"
    fi
    rm .frontend_pid
fi

echo "系统已停止"

