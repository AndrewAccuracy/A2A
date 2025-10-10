#!/bin/bash

echo "=== 启动A2A隐蔽通信系统 ==="

# 获取conda路径
CONDA_BASE=$(conda info --base 2>/dev/null)
if [ -z "$CONDA_BASE" ]; then
    echo "错误: 无法找到conda安装路径"
    echo "请确保conda已正确安装并初始化"
    exit 1
fi

# 激活conda环境
echo "激活conda环境..."
source "$CONDA_BASE/etc/profile.d/conda.sh"
conda activate a2a-covert

# 检查环境是否激活成功
if [ "$CONDA_DEFAULT_ENV" != "a2a-covert" ]; then
    echo "错误: conda环境激活失败"
    echo "请检查环境名称是否正确: a2a-covert"
    echo "可用环境列表:"
    conda env list
    exit 1
fi

echo "conda环境已激活: $CONDA_DEFAULT_ENV"

# 设置环境变量
export PYTHONPATH=$(pwd)
export CUDA_VISIBLE_DEVICES=0

# 创建日志目录
mkdir -p logs

echo "启动服务器包装器..."
python server_wrapper.py > logs/server_wrapper.log 2>&1 &
SERVER_PID=$!

# 等待服务器包装器启动
echo "等待服务器包装器启动..."
sleep 5

# 检查服务器包装器是否启动成功
if ! curl -s http://localhost:9998/status > /dev/null; then
    echo "错误: 服务器包装器启动失败"
    exit 1
fi

echo "启动客户端包装器..."
# 设置临时API密钥（如果未设置）
if [ -z "$AIHUBMIX_API_KEY" ]; then
    export AIHUBMIX_API_KEY="dummy_key_for_testing"
    echo "⚠️ 设置临时API密钥用于测试"
fi

python client_wrapper.py > logs/client_wrapper.log 2>&1 &
CLIENT_PID=$!

# 等待客户端包装器启动
echo "等待客户端包装器启动..."
sleep 5

# 检查客户端包装器是否启动成功
if ! curl -s http://localhost:8889/evaluation/status > /dev/null; then
    echo "❌ 客户端包装器启动失败，尝试修复..."
    
    # 检查日志中的错误
    echo "客户端包装器错误日志:"
    tail -10 logs/client_wrapper.log
    
    # 尝试重新启动
    echo "尝试重新启动客户端包装器..."
    pkill -f client_wrapper.py 2>/dev/null || true
    sleep 2
    
    python client_wrapper.py > logs/client_wrapper.log 2>&1 &
    CLIENT_PID=$!
    sleep 5
    
    # 再次检查
    if ! curl -s http://localhost:8889/evaluation/status > /dev/null; then
        echo "❌ 客户端包装器仍然启动失败"
        echo "请运行 ./debug_client.sh 进行详细诊断"
        echo "或运行 ./fix_client.sh 尝试修复"
        # 不退出，继续启动其他服务
    else
        echo "✅ 客户端包装器修复成功"
    fi
else
    echo "✅ 客户端包装器启动成功"
fi

echo "启动前端服务器..."
python -m http.server 3000 --bind 0.0.0.0 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# 等待前端服务器启动
echo "等待前端服务器启动..."
sleep 2

# 自动启动A2A服务器
echo "自动启动A2A服务器..."
curl -X POST "http://localhost:9998/start" \
  -H "Content-Type: application/json" \
  -d '{
    "stego_model_path": "modules/stego/artifacts_baselines",
    "stego_algorithm": "uni_stego",
    "stego_key": "a2a_covert_key_2024",
    "decrypted_bits_path": "data/stego/secret_bits.txt",
    "session_id": "demo_session_001",
    "server_url": "ws://localhost:9999"
  }' > logs/server_start.log 2>&1

# 检查A2A服务器是否启动成功
sleep 3
if curl -s http://localhost:9998/status | grep -q "running"; then
    echo "✅ A2A服务器启动成功"
else
    echo "⚠️ A2A服务器启动可能有问题，请检查日志"
fi

echo ""
echo "系统启动完成！"
echo "服务器包装器 PID: $SERVER_PID"
echo "客户端包装器 PID: $CLIENT_PID"
echo "前端服务器 PID: $FRONTEND_PID"
echo ""
echo "访问地址: http://localhost:3000/topology.html"
echo "停止系统: ./stop_system.sh"

# 保存PID到文件
echo $SERVER_PID > .server_pid
echo $CLIENT_PID > .client_pid
echo $FRONTEND_PID > .frontend_pid
