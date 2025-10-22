#!/bin/bash

# A2A Covert 停止所有服务脚本
# 用于停止所有正在运行的服务

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

# 杀死占用端口的进程
kill_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ ! -z "$pid" ]; then
        log_info "正在停止 $service_name (端口 $port, PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
        log_success "$service_name 已停止"
    else
        log_info "$service_name (端口 $port) 未运行"
    fi
}

# 从PID文件停止服务
stop_from_pids() {
    if [ -f ".pids" ]; then
        log_info "从PID文件停止服务..."
        source .pids
        
        if [ ! -z "$SERVER_PID" ]; then
            log_info "停止服务端 (PID: $SERVER_PID)"
            kill $SERVER_PID 2>/dev/null || true
        fi
        
        if [ ! -z "$FRONTEND_PID" ]; then
            log_info "停止前端 (PID: $FRONTEND_PID)"
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        
        rm -f .pids
        log_success "PID文件已清理"
    else
        log_warning "未找到PID文件，使用端口检测方式停止服务"
    fi
}

# 停止所有相关服务
stop_all_services() {
    log_info "正在停止所有A2A Covert服务..."
    
    # 停止前端 (端口 3000)
    kill_port 3000 "前端开发服务器"
    
    # 停止后端 (端口 9999)
    kill_port 9999 "A2A服务端"
    
    # 停止评估服务 (端口 8000)
    kill_port 8000 "评估服务"
    
    # 停止其他可能的Python进程
    log_info "检查并停止相关Python进程..."
    pkill -f "server/main.py" 2>/dev/null || true
    pkill -f "server/main_with_upload.py" 2>/dev/null || true
    pkill -f "client/main.py" 2>/dev/null || true
    pkill -f "evaluation/main.py" 2>/dev/null || true
    
    # 停止Node.js进程
    log_info "检查并停止相关Node.js进程..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    log_success "所有服务已停止"
}

# 清理临时文件
cleanup_files() {
    log_info "清理临时文件..."
    
    # 清理PID文件
    rm -f .pids
    
    # 清理日志文件（可选）
    if [ "$1" = "--clean-logs" ]; then
        log_info "清理日志文件..."
        rm -f logs/*.log 2>/dev/null || true
        rm -f data/logs/client/*.log 2>/dev/null || true
        rm -f data/logs/server/*.log 2>/dev/null || true
        log_success "日志文件已清理"
    fi
    
    # 清理Python缓存
    log_info "清理Python缓存..."
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    log_success "清理完成"
}

# 显示服务状态
show_status() {
    log_info "检查服务状态..."
    
    local frontend_running=false
    local backend_running=false
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        frontend_running=true
    fi
    
    if lsof -Pi :9999 -sTCP:LISTEN -t >/dev/null 2>&1; then
        backend_running=true
    fi
    
    echo ""
    echo -e "${BLUE}=== 服务状态 ===${NC}"
    if [ "$frontend_running" = true ]; then
        echo -e "前端 (端口 3000): ${RED}运行中${NC}"
    else
        echo -e "前端 (端口 3000): ${GREEN}已停止${NC}"
    fi
    
    if [ "$backend_running" = true ]; then
        echo -e "后端 (端口 9999): ${RED}运行中${NC}"
    else
        echo -e "后端 (端口 9999): ${GREEN}已停止${NC}"
    fi
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    A2A Covert 停止服务脚本"
    echo "=========================================="
    echo -e "${NC}"
    
    # 检查参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --clean-logs    停止服务并清理日志文件"
        echo "  --status        显示服务状态"
        echo "  --help, -h      显示此帮助信息"
        echo ""
        echo "示例:"
        echo "  $0                # 停止所有服务"
        echo "  $0 --clean-logs   # 停止服务并清理日志"
        echo "  $0 --status       # 显示服务状态"
        exit 0
    fi
    
    if [ "$1" = "--status" ]; then
        show_status
        exit 0
    fi
    
    # 停止服务
    stop_from_pids
    stop_all_services
    
    # 清理文件
    cleanup_files "$1"
    
    # 显示最终状态
    show_status
    
    log_success "所有操作完成！"
}

# 运行主函数
main "$@"
