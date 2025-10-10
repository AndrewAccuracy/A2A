# A2A隐蔽通信系统 - 脚本使用说明

## 核心脚本

### 系统启动和停止
- **`start_system.sh`** - 启动整个A2A隐蔽通信系统
- **`stop_system.sh`** - 停止整个A2A隐蔽通信系统

### 安装脚本
- **`install_conda.sh`** - 使用conda环境安装（推荐）
- **`install_linux.sh`** - Linux系统专用安装脚本
- **`install_all.sh`** - 通用安装脚本
- **`install_a2a_sdk.sh`** - A2A-SDK专用安装脚本

### 演示和测试
- **`demo_install.sh`** - 演示安装脚本
- **`start_real_demo.sh`** - 启动真实演示
- **`stop_real_demo.sh`** - 停止真实演示
- **`test_install.sh`** - 测试安装是否成功

### 配置和诊断
- **`setup_evaluation.sh`** - 设置评估功能
- **`diagnose_system.sh`** - 系统诊断脚本

## 快速开始

### 1. 安装系统
```bash
# 推荐：使用conda安装
./install_conda.sh

# 或者：使用Linux专用安装
./install_linux.sh

# 或者：使用通用安装
./install_all.sh
```

### 2. 启动系统
```bash
./start_system.sh
```

### 3. 访问系统
在浏览器中打开：http://localhost:3000/topology.html

### 4. 停止系统
```bash
./stop_system.sh
```

## 故障排除

### 如果系统启动失败
```bash
# 运行系统诊断
./diagnose_system.sh

# 测试安装
./test_install.sh
```

### 如果需要重新安装
```bash
# 停止系统
./stop_system.sh

# 重新安装
./install_conda.sh

# 重新启动
./start_system.sh
```

## 环境要求

- Linux系统（推荐Ubuntu 20.04+）
- Python 3.8+
- Conda或Miniconda
- 至少4GB内存
- 网络连接（用于下载依赖）

## 注意事项

1. 首次运行需要下载预训练模型，请确保网络连接稳定
2. 如果使用GPU，请确保CUDA驱动正确安装
3. 查看日志文件：`logs/` 目录
4. 配置API密钥：编辑 `config.py` 文件
