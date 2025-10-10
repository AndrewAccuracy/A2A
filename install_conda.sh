#!/bin/bash

# A2A隐蔽通信系统 Conda环境安装脚本
# 适用于已有conda的Linux系统

set -e  # 遇到错误立即退出

echo "=== A2A隐蔽通信系统 Conda环境安装脚本 ==="
echo "适用于已有conda的Linux系统"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查conda是否安装
check_conda() {
    log_info "检查conda环境..."
    
    if command -v conda &> /dev/null; then
        CONDA_VERSION=$(conda --version | cut -d' ' -f2)
        log_success "找到conda: $CONDA_VERSION"
        
        # 检查conda是否已初始化
        if conda info --envs &> /dev/null; then
            log_success "conda环境正常"
        else
            log_error "conda未正确初始化，请先运行: conda init"
            exit 1
        fi
    else
        log_error "未找到conda，请先安装conda或miniconda"
        log_info "安装miniconda:"
        log_info "  wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"
        log_info "  bash Miniconda3-latest-Linux-x86_64.sh"
        log_info "  source ~/.bashrc"
        exit 1
    fi
}

# 创建conda环境
create_conda_env() {
    log_step "创建conda环境..."
    
    ENV_NAME="a2a-covert"
    
    # 检查环境是否已存在
    if conda env list | grep -q "^$ENV_NAME "; then
        log_warning "conda环境 '$ENV_NAME' 已存在"
        read -p "是否要重新创建环境？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "删除现有环境..."
            conda env remove -n $ENV_NAME -y
        else
            log_info "使用现有环境"
            return 0
        fi
    fi
    
    # 创建新的conda环境
    log_info "创建conda环境: $ENV_NAME"
    conda create -n $ENV_NAME python=3.12 -y
    
    # 激活环境
    log_info "激活conda环境..."
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate $ENV_NAME
    
    log_success "conda环境创建完成"
}

# 安装conda依赖
install_conda_deps() {
    log_step "安装conda依赖..."
    
    # 激活环境
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate a2a-covert
    
    # 升级conda和pip
    log_info "升级conda和pip..."
    conda update conda -y
    conda install pip -y
    pip install --upgrade pip setuptools wheel
    
    # 安装基础依赖
    log_info "安装基础依赖..."
    pip install fastapi==0.104.1 uvicorn==0.24.0 websockets==12.0 pydantic==2.5.0 openai==1.3.7
    pip install httpx requests tqdm
    
    # 安装PyTorch (根据CUDA可用性选择版本)
    log_info "安装PyTorch..."
    if command -v nvidia-smi &> /dev/null; then
        log_info "检测到NVIDIA GPU，安装CUDA版本PyTorch..."
        conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia -y
    else
        log_info "未检测到NVIDIA GPU，安装CPU版本PyTorch..."
        conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
    fi
    
    # 安装机器学习依赖
    log_info "安装机器学习依赖..."
    conda install -c conda-forge transformers accelerate datasets tokenizers -y
    conda install -c conda-forge numpy scipy scikit-learn matplotlib seaborn -y
    conda install -c conda-forge cython -y  # 用于编译C++模块
    
    # 尝试安装A2A-SDK
    log_info "安装A2A-SDK..."
    if pip install a2a-sdk; then
        log_success "A2A-SDK安装成功"
    else
        log_warning "A2A-SDK安装失败，将在运行时使用本地模块"
    fi
    
    log_success "conda依赖安装完成"
}

# 编译C++模块
compile_cpp_modules() {
    log_step "编译C++模块..."
    
    # 激活环境
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate a2a-covert
    
    # 进入discop模块目录
    if [ -d "modules/stego/baselines" ]; then
        cd modules/stego/baselines
        
        # 编译discop模块
        log_info "编译discop模块..."
        if [ -f "setup.py" ]; then
            python setup.py build_ext --inplace
            
            # 检查编译结果
            if [ -f "discop.cpython-*.so" ]; then
                log_success "discop模块编译成功"
            else
                log_warning "discop模块编译可能失败，将在运行时使用fallback"
            fi
        else
            log_warning "未找到setup.py，跳过C++模块编译"
        fi
        
        cd - > /dev/null
    else
        log_warning "未找到baselines目录，跳过C++模块编译"
    fi
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录结构..."
    
    mkdir -p logs
    mkdir -p data/conversation
    mkdir -p data/question
    mkdir -p data/stego
    
    # 创建示例文件
    if [ ! -f "data/stego/secret_bits.txt" ]; then
        echo "01010101010101010101010101010101" > data/stego/secret_bits.txt
    fi
    
    if [ ! -f "data/question/general.txt" ]; then
        cat > data/question/general.txt << EOF
What is the capital of France?
How does photosynthesis work?
What are the benefits of renewable energy?
Explain the concept of artificial intelligence.
What is the history of the internet?
EOF
    fi
    
    if [ ! -f "data/question/art.txt" ]; then
        cat > data/question/art.txt << EOF
What is the significance of the Mona Lisa?
How did Impressionism change art?
What are the key elements of Renaissance art?
Explain the concept of abstract art.
What is the role of color in painting?
EOF
    fi
    
    if [ ! -f "data/question/philosophy.txt" ]; then
        cat > data/question/philosophy.txt << EOF
What is the meaning of life?
How do we define consciousness?
What is the nature of reality?
Explain the concept of free will.
What is the purpose of existence?
EOF
    fi
    
    log_success "目录结构创建完成"
}

# 配置环境变量
setup_environment() {
    log_step "配置环境变量..."
    
    # 创建环境配置文件
    cat > .env << EOF
# A2A隐蔽通信系统环境配置
PYTHONPATH=$(pwd)
CUDA_VISIBLE_DEVICES=0

# OpenAI API配置 (请替换为您的API密钥)
OPENAI_API_KEY=sk-G7Do2jeYNXQ29jSDEfFcAfF9891f4a2eAcD965C0A65fB6Da

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=9998
CLIENT_PORT=8889
FRONTEND_PORT=3000

# 日志配置
LOG_LEVEL=INFO
LOG_DIR=$(pwd)/logs
EOF
    
    log_success "环境配置文件创建完成"
}

# 创建启动脚本
create_startup_scripts() {
    log_step "创建启动脚本..."
    
    # 创建启动脚本
    cat > start_system.sh << 'EOF'
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

echo "启动客户端包装器..."
python client_wrapper.py > logs/client_wrapper.log 2>&1 &
CLIENT_PID=$!

echo "启动前端服务器..."
python -m http.server 3000 --bind 0.0.0.0 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

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
EOF

    # 创建停止脚本
    cat > stop_system.sh << 'EOF'
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
EOF

    # 创建conda环境激活脚本
    cat > activate_env.sh << 'EOF'
#!/bin/bash

echo "=== 激活A2A隐蔽通信系统环境 ==="

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

# 设置环境变量
export PYTHONPATH=$(pwd)
export CUDA_VISIBLE_DEVICES=0

echo "环境已激活！"
echo "Conda环境: $CONDA_DEFAULT_ENV"
echo "Python路径: $(which python)"
echo "Python版本: $(python --version)"
echo ""
echo "现在可以运行:"
echo "  python server_wrapper.py  # 启动服务器"
echo "  python client_wrapper.py  # 启动客户端"
echo "  python -m http.server 3000  # 启动前端"
echo "  ./start_system.sh  # 启动整个系统"
EOF

    # 设置执行权限
    chmod +x start_system.sh stop_system.sh activate_env.sh
    
    log_success "启动脚本创建完成"
}

# 验证安装
verify_installation() {
    log_step "验证安装..."
    
    # 激活环境
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate a2a-covert
    
    # 检查Python版本
    log_info "检查Python版本..."
    python --version
    
    # 检查关键包
    log_info "检查关键包..."
    python -c "import torch; print(f'PyTorch版本: {torch.__version__}')"
    python -c "import transformers; print(f'Transformers版本: {transformers.__version__}')"
    python -c "import fastapi; print(f'FastAPI版本: {fastapi.__version__}')"
    
    # 检查A2A-SDK
    log_info "检查A2A-SDK..."
    python -c "import a2a; print('A2A-SDK导入成功')" || log_warning "A2A-SDK导入失败，请检查安装"
    
    # 检查CUDA可用性
    if command -v nvidia-smi &> /dev/null; then
        log_info "检查CUDA可用性..."
        python -c "import torch; print(f'CUDA可用: {torch.cuda.is_available()}')"
    fi
    
    log_success "安装验证完成"
}

# 显示使用说明
show_usage() {
    echo ""
    echo "=== 安装完成！ ==="
    echo ""
    echo -e "${CYAN}📁 项目目录:${NC} $(pwd)"
    echo -e "${CYAN}🐍 Conda环境:${NC} a2a-covert"
    echo ""
    echo -e "${GREEN}🚀 启动系统:${NC}"
    echo "   ./start_system.sh"
    echo ""
    echo -e "${RED}🛑 停止系统:${NC}"
    echo "   ./stop_system.sh"
    echo ""
    echo -e "${BLUE}🌐 访问地址:${NC}"
    echo "   http://localhost:3000/topology.html"
    echo ""
    echo -e "${PURPLE}🔧 手动激活环境:${NC}"
    echo "   source activate_env.sh"
    echo "   或者: conda activate a2a-covert"
    echo ""
    echo -e "${YELLOW}📝 重要说明:${NC}"
    echo "   1. 请确保在config.py中配置正确的API密钥"
    echo "   2. 首次运行需要下载预训练模型，请确保网络连接"
    echo "   3. 如果使用GPU，请确保CUDA驱动正确安装"
    echo "   4. 查看日志文件: logs/ 目录"
    echo ""
    echo -e "${CYAN}📊 管理conda环境:${NC}"
    echo "   查看环境: conda env list"
    echo "   激活环境: conda activate a2a-covert"
    echo "   删除环境: conda env remove -n a2a-covert"
    echo ""
}

# 主函数
main() {
    echo -e "${PURPLE}开始安装A2A隐蔽通信系统 (Conda版本)...${NC}"
    echo ""
    
    check_conda
    create_conda_env
    install_conda_deps
    compile_cpp_modules
    create_directories
    setup_environment
    create_startup_scripts
    verify_installation
    show_usage
    
    log_success "A2A隐蔽通信系统安装完成！"
}

# 运行主函数
main "$@"
