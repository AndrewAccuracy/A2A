#!/bin/bash

# A2A Covert 环境检查和设置脚本
# 用于检查系统环境、安装依赖和配置项目

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

# 检查操作系统
check_os() {
    log_info "检查操作系统..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
        log_success "检测到 macOS 系统"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="Linux"
        log_success "检测到 Linux 系统"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
}

# 检查必要的命令
check_commands() {
    log_info "检查必要的命令..."
    
    local commands=("python3" "pip3" "node" "npm" "git")
    local missing_commands=()
    
    for cmd in "${commands[@]}"; do
        if command -v $cmd &> /dev/null; then
            log_success "$cmd 已安装"
        else
            log_error "$cmd 未安装"
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_error "缺少必要的命令: ${missing_commands[*]}"
        log_info "请先安装缺少的命令后再运行此脚本"
        exit 1
    fi
}

# 检查Python版本
check_python_version() {
    log_info "检查Python版本..."
    local python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
    local major_version=$(echo $python_version | cut -d'.' -f1)
    local minor_version=$(echo $python_version | cut -d'.' -f2)
    
    if [ "$major_version" -ge 3 ] && [ "$minor_version" -ge 8 ]; then
        log_success "Python版本: $python_version (满足要求 >= 3.8)"
    else
        log_error "Python版本过低: $python_version (需要 >= 3.8)"
        exit 1
    fi
}

# 检查Node.js版本
check_node_version() {
    log_info "检查Node.js版本..."
    local node_version=$(node --version 2>&1 | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$major_version" -ge 16 ]; then
        log_success "Node.js版本: v$node_version (满足要求 >= 16)"
    else
        log_error "Node.js版本过低: v$node_version (需要 >= 16)"
        exit 1
    fi
}

# 创建Python虚拟环境
setup_python_env() {
    log_info "设置Python虚拟环境..."
    
    if [ -d "a2a-covert" ]; then
        log_warning "虚拟环境已存在，是否重新创建? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log_info "删除现有虚拟环境..."
            rm -rf a2a-covert
        else
            log_info "使用现有虚拟环境"
            return
        fi
    fi
    
    log_info "创建Python虚拟环境..."
    python3 -m venv a2a-covert
    
    log_info "激活虚拟环境..."
    source a2a-covert/bin/activate
    
    log_info "升级pip..."
    pip install --upgrade pip
    
    log_info "安装Python依赖..."
    pip install -r requirements.txt
    
    log_success "Python环境设置完成"
}

# 设置前端环境
setup_frontend_env() {
    log_info "设置前端环境..."
    
    if [ ! -d "frontend" ]; then
        log_error "未找到frontend目录"
        exit 1
    fi
    
    cd frontend
    
    if [ -d "node_modules" ]; then
        log_warning "前端依赖已存在，是否重新安装? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log_info "删除现有依赖..."
            rm -rf node_modules package-lock.json
        else
            log_info "使用现有依赖"
            cd ..
            return
        fi
    fi
    
    log_info "安装前端依赖..."
    npm install
    
    cd ..
    log_success "前端环境设置完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local directories=(
        "data/logs/client"
        "data/logs/server"
        "data/conversation"
        "data/stego"
        "data/question"
        "data/evaluation"
        "logs"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_success "创建目录: $dir"
        else
            log_info "目录已存在: $dir"
        fi
    done
}

# 设置环境变量文件
setup_env_file() {
    log_info "设置环境变量文件..."
    
    if [ -f ".env" ]; then
        log_warning ".env 文件已存在，是否覆盖? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "保持现有 .env 文件"
            return
        fi
    fi
    
    if [ -f ".env.example" ]; then
        log_info "从 .env.example 创建 .env 文件..."
        cp .env.example .env
        log_success ".env 文件已创建"
        log_warning "请编辑 .env 文件，添加你的API密钥"
    else
        log_info "创建默认 .env 文件..."
        cat > .env << EOF
# A2A Covert 环境变量配置
# 请根据使用的模型添加相应的API密钥

# Gemini API Key (推荐)
GEMINI_API_KEY=your_gemini_api_key_here

# DeepSeek API Key
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# 隐写密钥
STEGO_KEY=7b9ec09254aa4a7589e4d0cfd80d46cc

# 服务器配置
SERVER_URL=http://localhost:9999
FRONTEND_URL=http://localhost:3000

# 日志级别
LOG_LEVEL=INFO
EOF
        log_success "默认 .env 文件已创建"
        log_warning "请编辑 .env 文件，添加你的API密钥"
    fi
}

# 检查GPU支持
check_gpu_support() {
    log_info "检查GPU支持..."
    
    if command -v nvidia-smi &> /dev/null; then
        log_success "检测到NVIDIA GPU"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
    elif command -v rocm-smi &> /dev/null; then
        log_success "检测到AMD GPU (ROCm)"
        rocm-smi --showproductname
    else
        log_warning "未检测到GPU，将使用CPU模式"
        log_info "如需GPU加速，请安装相应的GPU驱动和CUDA/ROCm"
    fi
}

# 验证安装
verify_installation() {
    log_info "验证安装..."
    
    # 检查Python包
    log_info "检查Python包..."
    source a2a-covert/bin/activate
    python3 -c "import torch, transformers, fastapi, uvicorn; print('Python包检查通过')"
    
    # 检查Node.js包
    log_info "检查Node.js包..."
    cd frontend
    npm list --depth=0 > /dev/null
    cd ..
    
    log_success "安装验证通过"
}

# 显示使用说明
show_usage() {
    echo ""
    log_success "=== 环境设置完成 ==="
    echo ""
    echo -e "${BLUE}下一步操作:${NC}"
    echo "1. 编辑 .env 文件，添加你的API密钥"
    echo "2. 运行 'bash start_all.sh' 启动所有服务"
    echo "3. 访问 http://localhost:3000 使用前端界面"
    echo ""
    echo -e "${BLUE}常用命令:${NC}"
    echo "  bash start_all.sh          # 启动所有服务"
    echo "  bash stop_all.sh           # 停止所有服务"
    echo "  bash stop_all.sh --status  # 查看服务状态"
    echo ""
    echo -e "${BLUE}手动启动服务:${NC}"
    echo "  # 启动后端"
    echo "  source a2a-covert/bin/activate"
    echo "  python server/main_with_upload.py"
    echo ""
    echo "  # 启动前端"
    echo "  cd frontend && npm run dev"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    A2A Covert 环境设置脚本"
    echo "=========================================="
    echo -e "${NC}"
    
    # 检查参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --skip-python     跳过Python环境设置"
        echo "  --skip-frontend   跳过前端环境设置"
        echo "  --skip-env        跳过环境变量文件设置"
        echo "  --help, -h        显示此帮助信息"
        echo ""
        echo "示例:"
        echo "  $0                # 完整环境设置"
        echo "  $0 --skip-python # 跳过Python环境设置"
        exit 0
    fi
    
    # 环境检查
    check_os
    check_commands
    check_python_version
    check_node_version
    check_gpu_support
    
    # 环境设置
    create_directories
    
    if [ "$1" != "--skip-python" ]; then
        setup_python_env
    fi
    
    if [ "$1" != "--skip-frontend" ]; then
        setup_frontend_env
    fi
    
    if [ "$1" != "--skip-env" ]; then
        setup_env_file
    fi
    
    # 验证安装
    verify_installation
    
    # 显示使用说明
    show_usage
    
    log_success "环境设置完成！"
}

# 运行主函数
main "$@"
