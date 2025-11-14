#!/bin/bash

# 停止后端服务的脚本

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

# 从PID文件读取进程ID
if [ -f ".pids_backend_only" ]; then
    log_info "从 .pids_backend_only 读取进程ID..."
    source .pids_backend_only
    
    if [ ! -z "$SERVER_PID" ]; then
        if kill -0 $SERVER_PID 2>/dev/null; then
            log_info "正在停止服务器 (PID: $SERVER_PID)"
            kill $SERVER_PID 2>/dev/null || true
        else
            log_warning "服务器进程 (PID: $SERVER_PID) 已不存在"
        fi
    fi
    
    if [ ! -z "$CLIENT1_PID" ]; then
        if kill -0 $CLIENT1_PID 2>/dev/null; then
            log_info "正在停止客户端1 (PID: $CLIENT1_PID)"
            kill $CLIENT1_PID 2>/dev/null || true
        else
            log_warning "客户端1进程 (PID: $CLIENT1_PID) 已不存在"
        fi
    fi
    
    if [ ! -z "$CLIENT2_PID" ]; then
        if kill -0 $CLIENT2_PID 2>/dev/null; then
            log_info "正在停止客户端2 (PID: $CLIENT2_PID)"
            kill $CLIENT2_PID 2>/dev/null || true
        else
            log_warning "客户端2进程 (PID: $CLIENT2_PID) 已不存在"
        fi
    fi
    
    rm -f .pids_backend_only
    log_success "所有服务已停止"
else
    log_warning "未找到 .pids_backend_only 文件，尝试通过端口停止服务..."
    
    # 尝试通过端口停止
    if lsof -Pi :9999 -sTCP:LISTEN -t >/dev/null 2>&1; then
        PID=$(lsof -Pi :9999 -sTCP:LISTEN -t)
        log_info "正在停止占用端口9999的进程 (PID: $PID)"
        kill $PID 2>/dev/null || true
        log_success "服务已停止"
    else
        log_warning "未找到运行中的服务"
    fi
fi

