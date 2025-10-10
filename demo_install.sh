#!/bin/bash

# A2A隐蔽通信系统 - 安装演示脚本
# 展示如何使用一键安装脚本

echo "=== A2A隐蔽通信系统 - 安装演示 ==="
echo ""
echo "这个演示将展示如何使用一键安装脚本"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 安装步骤:${NC}"
echo "1. 运行一键安装脚本"
echo "2. 等待安装完成"
echo "3. 启动系统"
echo "4. 访问Web界面"
echo ""

echo -e "${YELLOW}🚀 开始安装...${NC}"
echo ""

# 运行安装脚本
./install_all.sh

echo ""
echo -e "${GREEN}✅ 安装完成！${NC}"
echo ""
echo -e "${BLUE}📝 下一步操作:${NC}"
echo "1. 启动系统: ./start_system.sh"
echo "2. 访问界面: http://localhost:3000/topology.html"
echo "3. 停止系统: ./stop_system.sh"
echo ""
echo -e "${YELLOW}💡 提示: 查看 README_INSTALL.md 获取详细使用说明${NC}"

