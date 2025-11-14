#!/bin/bash

# SSH 隧道脚本 - 用于访问云服务器上的前端服务
# 使用本地 3001 端口（避免与本地 3000 端口冲突）

LOCAL_PORT=3001
REMOTE_PORT=3000

echo "正在建立 SSH 隧道..."
echo "本地端口: $LOCAL_PORT"
echo "远程端口: $REMOTE_PORT"
echo "前端服务将通过 http://localhost:$LOCAL_PORT 访问"
echo ""
echo "按 Ctrl+C 停止隧道"
echo ""

sshpass -p 'FQoS0bjoUJ4J' ssh -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} -p 34756 root@connect.bjc1.seetacloud.com -N
