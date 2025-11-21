#!/bin/bash

# 运行后端和两个客户端进行交互的脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查虚拟环境
if [ ! -d "a2a-covert" ]; then
    log_error "未找到Python虚拟环境，请先运行 setup_env.sh 或 start_all.sh"
    exit 1
fi

# 激活虚拟环境
source a2a-covert/bin/activate

# 获取虚拟环境的 Python 路径
VENV_PYTHON=$(which python)
if [ -z "$VENV_PYTHON" ]; then
    VENV_PYTHON="$PWD/a2a-covert/bin/python"
fi
log_info "使用Python: $VENV_PYTHON"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 $port 已被占用"
        return 1
    fi
    return 0
}

# 杀死占用端口的进程
kill_port() {
    local port=$1
    local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
        log_info "正在杀死占用端口 $port 的进程 (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# 清理函数
cleanup() {
    log_info "正在清理..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$CLIENT1_PID" ]; then
        kill $CLIENT1_PID 2>/dev/null || true
    fi
    if [ ! -z "$CLIENT2_PID" ]; then
        kill $CLIENT2_PID 2>/dev/null || true
    fi
    rm -f .pids_backend_only
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 启动服务器
start_server() {
    log_info "启动A2A服务端 (端口 9999)..."
    if ! check_port 9999; then
        kill_port 9999
    fi
    
    # 启动服务端
    $VENV_PYTHON server/main.py \
        --server_url http://0.0.0.0:9999 \
        --stego_algorithm meteor \
        --stego_key 7b9ec09254aa4a7589e4d0cfd80d46cc \
        --session_id covert-session-server \
        --stego_model_path /root/autodl-fs/Llama-3.2-3B-Instruct \
        > logs/server_backend.log 2>&1 &
    
    SERVER_PID=$!
    log_success "服务端已启动 (PID: $SERVER_PID)"
    sleep 3  # 等待服务器启动
}

# 启动客户端1
start_client1() {
    log_info "启动客户端1..."
    
    # 生成唯一的session_id
    SESSION_ID1="covert-session-client1-$(date +%s)"
    
    $VENV_PYTHON client/main.py \
        --server_url http://localhost:9999 \
        --stego_algorithm meteor \
        --stego_key 7b9ec09254aa4a7589e4d0cfd80d46cc \
        --session_id $SESSION_ID1 \
        --stego_model_path /root/autodl-fs/Llama-3.2-3B-Instruct \
        --question_path data/question/general.txt \
        --question_index 0 \
        --secret_bit_path data/stego/secret_bits_512.txt \
        > logs/client1_backend.log 2>&1 &
    
    CLIENT1_PID=$!
    log_success "客户端1已启动 (PID: $CLIENT1_PID, Session: $SESSION_ID1)"
}

# 启动客户端2
start_client2() {
    log_info "启动客户端2..."
    
    # 生成唯一的session_id
    SESSION_ID2="covert-session-client2-$(date +%s)"
    
    $VENV_PYTHON client/main.py \
        --server_url http://localhost:9999 \
        --stego_algorithm meteor \
        --stego_key 7b9ec09254aa4a7589e4d0cfd80d46cc \
        --session_id $SESSION_ID2 \
        --stego_model_path /root/autodl-fs/Llama-3.2-3B-Instruct \
        --question_path data/question/general.txt \
        --question_index 1 \
        --secret_bit_path data/stego/secret_bits_512.txt \
        > logs/client2_backend.log 2>&1 &
    
    CLIENT2_PID=$!
    log_success "客户端2已启动 (PID: $CLIENT2_PID, Session: $SESSION_ID2)"
}

# 保存PID
save_pids() {
    echo "SERVER_PID=$SERVER_PID" > .pids_backend_only
    echo "CLIENT1_PID=$CLIENT1_PID" >> .pids_backend_only
    echo "CLIENT2_PID=$CLIENT2_PID" >> .pids_backend_only
    log_info "进程ID已保存到 .pids_backend_only 文件"
}

# 显示状态
show_status() {
    echo ""
    log_success "=== 后端服务启动完成 ==="
    echo ""
    echo -e "${GREEN}服务器:${NC} http://localhost:9999"
    echo -e "${GREEN}客户端1日志:${NC} logs/client1_backend.log"
    echo -e "${GREEN}客户端2日志:${NC} logs/client2_backend.log"
    echo -e "${GREEN}服务器日志:${NC} logs/server_backend.log"
    echo ""
    echo -e "${YELLOW}使用 'bash stop_backend_only.sh' 停止所有服务${NC}"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    后端双客户端交互启动脚本"
    echo "=========================================="
    echo -e "${NC}"
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动服务
    start_server
    start_client1
    sleep 2  # 等待客户端1初始化
    start_client2
    
    # 保存PID
    save_pids
    
    # 显示状态
    show_status
    
    # 保持脚本运行
    log_info "按 Ctrl+C 停止所有服务"
    wait
}

# 运行主函数
main "$@"

