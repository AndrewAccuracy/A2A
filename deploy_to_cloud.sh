#!/bin/bash

# 部署脚本：将本地修改的文件同步到云服务器
# 使用方法: ./deploy_to_cloud.sh

SSH_HOST="root@connect.bjc1.seetacloud.com"
SSH_PORT="34756"
SSH_PASSWORD="FQoS0bjoUJ4J"
REMOTE_BASE_DIR="/root/A2A_Covert"

# 检查是否安装了sshpass
if ! command -v sshpass &> /dev/null; then
    echo "错误: 需要安装 sshpass"
    echo "macOS: brew install sshpass"
    echo "Linux: sudo apt-get install sshpass 或 sudo yum install sshpass"
    exit 1
fi

echo "=========================================="
echo "开始部署到云服务器"
echo "服务器: $SSH_HOST:$SSH_PORT"
echo "远程目录: $REMOTE_BASE_DIR"
echo "=========================================="
echo ""

# 需要同步的文件列表（根据git status中的修改文件）
FILES=(
    "frontend/src/app/api/conversation/[sessionId]/route.ts"
    "frontend/src/app/api/conversation/random/[category]/route.ts"
    "frontend/src/app/api/evaluation/[sessionId]/route.ts"
    "frontend/src/app/api/evaluation/random/[category]/route.ts"
    "server/main_with_upload.py"
)

# 同步每个文件
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "正在同步: $file"
        # 创建远程目录（如果不存在）
        remote_dir=$(dirname "$REMOTE_BASE_DIR/$file")
        sshpass -p "$SSH_PASSWORD" ssh -p $SSH_PORT -o StrictHostKeyChecking=no $SSH_HOST "mkdir -p $remote_dir"
        
        # 复制文件
        sshpass -p "$SSH_PASSWORD" scp -P $SSH_PORT -o StrictHostKeyChecking=no "$file" "$SSH_HOST:$REMOTE_BASE_DIR/$file"
        
        if [ $? -eq 0 ]; then
            echo "✓ $file 同步成功"
        else
            echo "✗ $file 同步失败"
        fi
        echo ""
    else
        echo "警告: 文件不存在: $file"
    fi
done

echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "提示: 如果需要重启服务，请SSH连接到服务器后执行："
echo "  ssh -p $SSH_PORT $SSH_HOST"
echo "  cd $REMOTE_BASE_DIR"
echo "  # 重启前端: cd frontend && npm run dev:cloud"
echo "  # 重启后端: python server/main_with_upload.py"

