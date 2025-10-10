#!/bin/bash

# A2A隐蔽通信演示系统启动脚本

echo "=== A2A隐蔽通信演示系统 ==="
echo "正在启动各个组件..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3 未安装"
    exit 1
fi

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 启动服务器端 (端口9999)
echo "1. 启动A2A服务器端..."
cd server
python3 main.py > ../logs/server.log 2>&1 &
SERVER_PID=$!
echo "   服务器PID: $SERVER_PID"
cd ..

# 等待服务器启动
sleep 3

# 启动客户端API包装器 (端口8888)
echo "2. 启动客户端API包装器..."
python3 client_wrapper.py > logs/client_api.log 2>&1 &
CLIENT_API_PID=$!
echo "   客户端API PID: $CLIENT_API_PID"

# 等待客户端API启动
sleep 3

# 启动前端开发服务器 (端口3000)
echo "3. 启动前端开发服务器..."
cd frontend

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "   正在安装前端依赖..."
    npm install
fi

# 启动前端
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端PID: $FRONTEND_PID"
cd ..

# 保存PID到文件
echo $SERVER_PID > logs/server.pid
echo $CLIENT_API_PID > logs/client_api.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "=== 启动完成 ==="
echo "服务器端:       http://localhost:9999"
echo "客户端API:      http://localhost:8888"
echo "前端界面:       http://localhost:3000"
echo ""
echo "查看日志:"
echo "  服务器端:     tail -f logs/server.log"
echo "  客户端API:    tail -f logs/client_api.log"
echo "  前端:         tail -f logs/frontend.log"
echo ""
echo "停止服务:       ./stop_demo.sh"
echo ""
echo "等待前端启动完成 (约30秒)..."

# 等待前端启动
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ 前端启动成功!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "🚀 演示系统已启动，请打开浏览器访问: http://localhost:3000" 