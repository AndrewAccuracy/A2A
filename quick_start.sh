#!/bin/bash

echo "=== A2A隐蔽通信系统 - 快速启动 ==="

# 检查conda环境
if ! command -v conda &> /dev/null; then
    echo "❌ 错误: 未找到conda命令"
    echo "请先安装并配置conda环境"
    exit 1
fi

# 激活conda环境
echo "🔄 激活conda环境..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate a2a-covert

if [ "$CONDA_DEFAULT_ENV" != "a2a-covert" ]; then
    echo "❌ 错误: conda环境激活失败"
    echo "请确保a2a-covert环境存在"
    exit 1
fi

echo "✅ conda环境已激活: $CONDA_DEFAULT_ENV"

# 设置环境变量
export PYTHONPATH=$(pwd)
export CUDA_VISIBLE_DEVICES=0

# 创建必要目录
mkdir -p logs data/stego data/conversation

# 清理旧进程
echo "🧹 清理旧进程..."
pkill -f "server_wrapper.py" 2>/dev/null || true
pkill -f "client_wrapper.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# 启动后端服务
echo "🚀 启动后端服务..."
python server_wrapper.py > logs/server_wrapper.log 2>&1 &
SERVER_PID=$!

# 等待后端启动
sleep 3

# 启动客户端服务
echo "🚀 启动客户端服务..."
if [ -z "$AIHUBMIX_API_KEY" ]; then
    export AIHUBMIX_API_KEY="dummy_key_for_testing"
    echo "⚠️ 使用测试API密钥"
fi

python client_wrapper.py > logs/client_wrapper.log 2>&1 &
CLIENT_PID=$!

# 等待客户端启动
sleep 3

# 启动前端服务
echo "🚀 启动前端服务..."
cd frontend

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    echo "⏳ 这可能需要几分钟时间，请耐心等待..."
    # 设置npm镜像源加速
    npm config set registry https://registry.npmmirror.com
    # 使用超时命令，最多等待10分钟
    timeout 600 npm install --verbose
    if [ $? -ne 0 ]; then
        echo "❌ npm install 失败，尝试清理后重新安装..."
        rm -rf node_modules package-lock.json
        npm install --verbose
    fi
fi

# 启动Next.js开发服务器
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

# 等待所有服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态检查:"
echo "=================="

# 检查服务器包装器
if curl -s http://localhost:9998/status > /dev/null; then
    echo "✅ 服务器包装器: 运行中 (端口 9998)"
else
    echo "❌ 服务器包装器: 启动失败"
fi

# 检查客户端包装器
if curl -s http://localhost:8889/status > /dev/null; then
    echo "✅ 客户端包装器: 运行中 (端口 8889)"
else
    echo "❌ 客户端包装器: 启动失败"
fi

# 检查前端服务器
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服务器: 运行中 (端口 3000)"
else
    echo "❌ 前端服务器: 启动失败"
fi

# 保存PID
echo $SERVER_PID > .server_pid
echo $CLIENT_PID > .client_pid
echo $FRONTEND_PID > .frontend_pid

echo ""
echo "🎉 启动完成！"
echo "=============="
echo "🌐 前端界面: http://localhost:3000"
echo "🔧 服务器API: http://localhost:9998"
echo "🔧 客户端API: http://localhost:8889"
echo ""
echo "🛑 停止系统: ./stop_all.sh"
echo "📝 查看日志: tail -f logs/*.log"
echo ""

# 自动打开浏览器（可选）
if command -v open &> /dev/null; then
    echo "🌐 正在打开浏览器..."
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    echo "🌐 正在打开浏览器..."
    xdg-open http://localhost:3000
fi

echo "按 Ctrl+C 退出日志监控"
echo "================================"

# 监控日志
tail -f logs/server_wrapper.log logs/client_wrapper.log logs/frontend.log
