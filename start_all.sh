#!/bin/bash

# A2A Covert 快速启动脚本
# 用于同时启动前端和所有后端服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装 $1"
        exit 1
    fi
}

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

# 检查Python虚拟环境
check_venv() {
    if [ ! -d "a2a-covert" ]; then
        log_warning "未找到Python虚拟环境，正在创建..."
        python3 -m venv a2a-covert
        log_success "虚拟环境创建完成"
    fi
    
    log_info "激活虚拟环境..."
    source a2a-covert/bin/activate
    
    # 检查依赖
    if [ ! -f "a2a-covert/pyvenv.cfg" ]; then
        log_warning "虚拟环境可能有问题，重新创建..."
        rm -rf a2a-covert
        python3 -m venv a2a-covert
        source a2a-covert/bin/activate
    fi
    
    log_info "安装Python依赖..."
    pip install -r requirements.txt
    log_success "Python依赖安装完成"
}

# 检查Node.js环境
check_node() {
    if [ ! -d "frontend/node_modules" ]; then
        log_warning "未找到前端依赖，正在安装..."
        cd frontend
        npm install
        cd ..
        log_success "前端依赖安装完成"
    fi
}

# 检查环境变量文件
check_env() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning "未找到 .env 文件，正在从 .env.example 创建..."
            cp .env.example .env
            log_warning "请编辑 .env 文件，添加你的API密钥"
        else
            log_error "未找到 .env 或 .env.example 文件"
            exit 1
        fi
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    mkdir -p data/logs/client
    mkdir -p data/logs/server
    mkdir -p data/conversation
    mkdir -p data/stego
    mkdir -p data/question
    mkdir -p data/evaluation
    log_success "目录创建完成"
}

# 启动服务端
start_server() {
    log_info "启动A2A服务端 (端口 9999)..."
    if ! check_port 9999; then
        kill_port 9999
    fi
    
    # 启动服务端（带文件上传功能）
    python server/main_with_upload.py \
        --server_url http://0.0.0.0:9999 \
        --stego_algorithm meteor \
        --stego_key 7b9ec09254aa4a7589e4d0cfd80d46cc \
        --session_id covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126 &
    
    SERVER_PID=$!
    log_success "服务端已启动 (PID: $SERVER_PID)"
}

# 启动前端
start_frontend() {
    log_info "启动前端开发服务器 (端口 3000)..."
    if ! check_port 3000; then
        kill_port 3000
    fi
    
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    log_success "前端已启动 (PID: $FRONTEND_PID)"
}

# 启动评估服务（可选）
start_evaluation() {
    log_info "启动评估服务 (端口 8000)..."
    if ! check_port 8000; then
        kill_port 8000
    fi
    
    # 这里可以添加评估服务的启动命令
    # 目前评估服务是命令行工具，不需要持续运行
    log_info "评估服务准备就绪（命令行模式）"
}

# 保存PID到文件
save_pids() {
    echo "SERVER_PID=$SERVER_PID" > .pids
    echo "FRONTEND_PID=$FRONTEND_PID" >> .pids
    log_info "进程ID已保存到 .pids 文件"
}

# 显示服务状态
show_status() {
    log_info "等待服务启动..."
    sleep 3
    
    echo ""
    log_success "=== 服务启动完成 ==="
    echo ""
    echo -e "${GREEN}前端界面:${NC} http://localhost:3000"
    echo -e "${GREEN}后端API:${NC} http://localhost:9999"
    echo -e "${GREEN}API文档:${NC} http://localhost:9999/docs"
    echo ""
    echo -e "${BLUE}可用的API端点:${NC}"
    echo "  POST /upload/question - 上传问题文件"
    echo "  POST /upload/secret - 上传隐蔽信息文件"
    echo "  POST /save_secret - 保存隐蔽信息比特流"
    echo "  POST /start - 启动隐蔽通信"
    echo "  POST /stop - 停止隐蔽通信"
    echo "  GET /status - 获取服务器状态"
    echo ""
    echo -e "${YELLOW}使用 'bash stop_all.sh' 停止所有服务${NC}"
    echo ""
}

# 清理函数
cleanup() {
    log_info "正在清理..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    rm -f .pids
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    A2A Covert 快速启动脚本"
    echo "=========================================="
    echo -e "${NC}"
    
    # 检查必要的命令
    log_info "检查系统环境..."
    check_command python3
    check_command node
    check_command npm
    check_command lsof
    
    # 检查环境
    check_env
    create_directories
    
    # 检查并设置环境
    check_venv
    check_node
    
    # 启动服务
    start_server
    start_frontend
    start_evaluation
    
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
