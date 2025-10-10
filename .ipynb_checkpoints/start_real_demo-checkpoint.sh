#!/bin/bash

echo "=== A2A隐蔽通信真实演示系统启动脚本 ==="
echo ""

# 激活环境
source /root/miniconda3/bin/activate A2A
if [ $? -ne 0 ]; then
    echo "❌ 激活A2A环境失败"
    exit 1
fi
echo "✅ A2A环境已激活"

# 进入项目目录
cd /root/autodl-tmp/autodl-code-wws-Copy1-Copy2-Copy3
echo "✅ 进入项目目录: $(pwd)"

# 创建日志目录
mkdir -p logs

echo ""
echo "正在启动各个组件..."

# 1. 启动A2A服务器包装器
echo "1. 启动A2A服务器包装器 (端口9998)..."
python server_wrapper.py > logs/server_wrapper.log 2>&1 &

SERVER_WRAPPER_PID=$!
echo "   服务器包装器PID: $SERVER_WRAPPER_PID"
sleep 3

# 2. 启动客户端包装器
echo "2. 启动客户端包装器 (端口8889)..."
python client_wrapper.py > logs/client_wrapper.log 2>&1 &
CLIENT_PID=$!
echo "   客户端包装器PID: $CLIENT_PID"
sleep 3

# 3. 启动前端HTTP服务器
echo "3. 启动前端服务器 (端口3000)..."
python3 -m http.server 3000 --bind 0.0.0.0 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端服务器PID: $FRONTEND_PID"
sleep 2

echo ""
echo "=== 服务状态检查 ==="

# 检查服务状态
check_service() {
    local port=$1
    local name=$2
    if lsof -i :$port >/dev/null 2>&1; then
        echo "✅ $name (端口$port): 运行中"
        return 0
    else
        echo "❌ $name (端口$port): 未运行"
        return 1
    fi
}

all_ok=true
check_service 9998 "A2A服务器包装器" || all_ok=false
check_service 8889 "客户端包装器" || all_ok=false  
check_service 3000 "前端服务器" || all_ok=false

echo ""
if [ "$all_ok" = true ]; then
    echo "🎉 所有服务启动成功！"
    echo ""
    echo "📝 使用方法："
    echo "   1. 打开浏览器访问以下地址之一："
    echo "      - 本地访问: http://localhost:3000/demo.html"
    echo "      - AutoDL外网访问: https://u448421-ab82-9649b894.bjc1.seetacloud.com:8443/demo.html"
    echo "   2. 检查服务器状态显示为'在线'"
    echo "   3. 配置隐蔽信息和参数(可使用默认值)"
    echo "   4. 点击'启动隐蔽通信'开始真实演示"
    echo ""
    echo "📊 进程ID记录:"
    echo "   A2A服务器包装器: $SERVER_WRAPPER_PID"
    echo "   客户端包装器: $CLIENT_PID"
    echo "   前端服务器: $FRONTEND_PID"
    echo ""
    echo "📁 日志文件位置:"
    echo "   服务器包装器日志: logs/server_wrapper.log"
    echo "   A2A服务器日志: logs/server.log (启动后生成)"
    echo "   客户端日志: logs/client_wrapper.log"
    echo "   前端日志: logs/frontend.log"
    echo ""
    echo "🛑 停止系统: ./stop_real_demo.sh"
else
    echo "❌ 部分服务启动失败，请检查日志文件"
    echo "📁 日志文件: logs/"
fi 