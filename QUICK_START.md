# A2A隐蔽通信系统 - 快速启动指南

## 前提条件
- Linux系统
- 已安装conda或miniconda

## 快速启动步骤

### 1. 检查conda环境
```bash
# 检查conda是否安装
conda --version

# 查看可用环境
conda env list
```

### 2. 创建conda环境（如果不存在）
```bash
# 创建Python 3.12环境
conda create -n a2a-covert python=3.12 -y

# 激活环境
conda activate a2a-covert
```

### 3. 安装依赖
```bash
# 确保环境已激活
conda activate a2a-covert

# 升级pip
pip install --upgrade pip setuptools wheel

# 安装基础依赖
pip install fastapi==0.104.1 uvicorn==0.24.0 websockets==12.0 pydantic==2.5.0 openai==1.3.7
pip install httpx requests tqdm

# 安装PyTorch（根据是否有GPU选择）
# 有NVIDIA GPU:
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia -y

# 无GPU:
conda install pytorch torchvision torchaudio cpuonly -c pytorch -y

# 安装机器学习依赖
conda install -c conda-forge transformers accelerate datasets tokenizers -y
conda install -c conda-forge numpy scipy scikit-learn matplotlib seaborn -y
conda install -c conda-forge cython -y

# 尝试安装A2A-SDK
pip install a2a-sdk
```

### 4. 编译C++模块（可选）
```bash
# 进入baselines目录
cd modules/stego/baselines

# 编译discop模块
python setup.py build_ext --inplace

# 返回项目根目录
cd ../..
```

### 5. 创建必要目录
```bash
mkdir -p logs data/conversation data/question data/stego
```

### 6. 启动系统
```bash
# 给脚本执行权限
chmod +x start_system.sh stop_system.sh

# 启动系统
./start_system.sh
```

### 7. 访问系统
在浏览器中打开：
```
http://localhost:3000/topology.html
```

## 使用脚本自动化

### 方法1：使用快速修复脚本
```bash
# 给脚本执行权限
chmod +x quick_fix.sh

# 运行快速修复
./quick_fix.sh
```

### 方法2：使用激活脚本
```bash
# 激活环境
./activate.sh

# 然后启动系统
./start_system.sh
```

### 方法3：使用完整安装脚本
```bash
# 给脚本执行权限
chmod +x install_conda.sh

# 运行完整安装
./install_conda.sh
```

## 停止系统
```bash
# 停止系统
./stop_system.sh
```

## 检查系统状态
```bash
# 检查进程
ps aux | grep -E "(server_wrapper|client_wrapper|http.server)"

# 查看日志
tail -f logs/server_wrapper.log
tail -f logs/client_wrapper.log
tail -f logs/frontend.log
```

## 常见问题

### 1. conda环境激活失败
```bash
# 初始化conda
conda init bash
source ~/.bashrc

# 或者使用完整路径
source $(conda info --base)/etc/profile.d/conda.sh
conda activate a2a-covert
```

### 2. Python包导入错误
```bash
# 确保环境已激活
conda activate a2a-covert

# 检查Python路径
which python

# 重新安装有问题的包
pip install --force-reinstall package_name
```

### 3. 端口被占用
```bash
# 查看端口占用
netstat -tlnp | grep -E "(3000|8889|9998)"

# 杀死占用端口的进程
sudo kill -9 PID
```

## 环境管理

### 查看环境信息
```bash
# 查看当前环境
echo $CONDA_DEFAULT_ENV

# 查看所有环境
conda env list

# 查看环境中的包
conda list
```

### 删除环境
```bash
# 停止系统
./stop_system.sh

# 删除环境
conda env remove -n a2a-covert

# 重新创建
conda create -n a2a-covert python=3.12 -y
```

