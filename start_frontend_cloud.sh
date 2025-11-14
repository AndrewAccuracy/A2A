#!/bin/bash

# 云服务器前端启动脚本
# 此脚本用于在云服务器上启动前端开发服务器

cd "$(dirname "$0")/frontend" || exit 1

echo "正在启动前端服务器（云服务器模式）..."
echo "服务器将监听 0.0.0.0:3000"
echo "请确保云服务器的防火墙已开放 3000 端口"
echo ""

npm run dev:cloud

