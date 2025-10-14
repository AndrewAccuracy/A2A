# A2A隐蔽通信系统 - 使用说明

## 快速开始

### 1. 安装环境
```bash
# 给脚本执行权限
chmod +x install_conda.sh

# 运行安装脚本
./install_conda.sh
```

### 2. 启动系统
```bash
# 快速启动（推荐）
./quick_start.sh

# 或者使用完整启动
./start_system.sh
```

### 3. 访问系统
- 前端界面: http://localhost:3000
- 服务器API: http://localhost:9998
- 客户端API: http://localhost:8889

### 4. 停止系统
```bash
./stop_all.sh
```

## 系统要求

- Python 3.12+
- Node.js 18+
- Conda环境管理器
- 8GB+ 内存（推荐）

## 故障排除

### 环境问题
```bash
# 检查conda环境
conda env list

# 重新创建环境
conda env remove -n a2a-covert
./install_conda.sh
```

### 端口冲突
```bash
# 查看端口占用
lsof -i :3000
lsof -i :8889
lsof -i :9998

# 杀死占用进程
kill -9 <PID>
```

### 查看日志
```bash
# 查看所有日志
tail -f logs/*.log

# 查看特定服务日志
tail -f logs/server_wrapper.log
tail -f logs/client_wrapper.log
tail -f logs/frontend.log
```

## 文件说明

- `install_conda.sh` - 环境安装脚本
- `CONDA_INSTALL_GUIDE.md` - 详细安装指南
- `quick_start.sh` - 快速启动脚本
- `stop_all.sh` - 停止系统脚本
- `README.md` - 项目技术文档
