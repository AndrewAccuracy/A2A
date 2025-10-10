# A2A隐蔽通信系统 - Conda安装指南

## 快速开始

### 1. 运行conda安装脚本

```bash
# 给脚本执行权限
chmod +x install_conda.sh

# 运行conda安装脚本
./install_conda.sh
```

### 2. 启动系统

```bash
# 启动整个系统
./start_system.sh
```

### 3. 访问系统

在浏览器中打开：
```
http://localhost:3000/topology.html
```

## 手动操作步骤

如果自动脚本有问题，可以手动执行以下步骤：

### 1. 检查conda环境

```bash
# 检查conda是否安装
conda --version

# 查看可用环境
conda env list
```

### 2. 创建conda环境

```bash
# 创建Python 3.12环境
conda create -n a2a-covert python=3.12 -y

# 激活环境
conda activate a2a-covert
```

### 3. 安装依赖

```bash
# 激活环境
conda activate a2a-covert

# 升级pip
pip install --upgrade pip setuptools wheel

# 安装基础依赖
pip install fastapi==0.104.1 uvicorn==0.24.0 websockets==12.0 pydantic==2.5.0 openai==1.3.7
pip install httpx requests tqdm

# 安装PyTorch (根据是否有GPU选择)
# 如果有NVIDIA GPU:
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia -y

# 如果没有GPU:
conda install pytorch torchvision torchaudio cpuonly -c pytorch -y

# 安装机器学习依赖
conda install -c conda-forge transformers accelerate datasets tokenizers -y
conda install -c conda-forge numpy scipy scikit-learn matplotlib seaborn -y
conda install -c conda-forge cython -y

# 尝试安装A2A-SDK
pip install a2a-sdk
```

### 4. 编译C++模块

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
# 激活环境
conda activate a2a-covert

# 设置环境变量
export PYTHONPATH=$(pwd)
export CUDA_VISIBLE_DEVICES=0

# 启动服务器
python server_wrapper.py > logs/server_wrapper.log 2>&1 &

# 启动客户端
python client_wrapper.py > logs/client_wrapper.log 2>&1 &

# 启动前端
python -m http.server 3000 --bind 0.0.0.0 > logs/frontend.log 2>&1 &
```

## 常见问题解决

### 1. conda环境激活失败

**问题**: `conda activate` 命令不工作

**解决方案**:
```bash
# 初始化conda
conda init bash

# 重新加载shell
source ~/.bashrc

# 或者使用完整路径
source $(conda info --base)/etc/profile.d/conda.sh
conda activate a2a-covert
```

### 2. 找不到conda命令

**问题**: `conda: command not found`

**解决方案**:
```bash
# 检查conda安装路径
which conda

# 如果conda在PATH中，添加到.bashrc
echo 'export PATH="/path/to/conda/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 或者使用完整路径
/path/to/conda/bin/conda activate a2a-covert
```

### 3. Python包导入错误

**问题**: 导入包时出现错误

**解决方案**:
```bash
# 确保环境已激活
conda activate a2a-covert

# 检查Python路径
which python

# 重新安装有问题的包
pip install --force-reinstall package_name
```

### 4. CUDA相关错误

**问题**: CUDA不可用或版本不匹配

**解决方案**:
```bash
# 检查CUDA版本
nvidia-smi

# 重新安装匹配的PyTorch版本
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia -y

# 或者安装CPU版本
conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
```

## 环境管理

### 查看环境信息

```bash
# 查看所有环境
conda env list

# 查看当前环境信息
conda info

# 查看环境中的包
conda list
```

### 删除环境

```bash
# 删除环境
conda env remove -n a2a-covert

# 重新创建
conda create -n a2a-covert python=3.12 -y
```

### 导出/导入环境

```bash
# 导出环境配置
conda env export > environment.yml

# 从配置文件创建环境
conda env create -f environment.yml
```

## 停止系统

```bash
# 使用停止脚本
./stop_system.sh

# 或手动停止
pkill -f server_wrapper.py
pkill -f client_wrapper.py
pkill -f "python -m http.server"
```

## 日志查看

```bash
# 查看服务器日志
tail -f logs/server_wrapper.log

# 查看客户端日志
tail -f logs/client_wrapper.log

# 查看前端日志
tail -f logs/frontend.log
```

