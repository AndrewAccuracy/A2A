#!/bin/bash

# 清理多余的.sh文件脚本

echo "=== 清理多余的.sh文件 ==="
echo ""

# 定义要保留的核心文件
KEEP_FILES=(
    "start_system.sh"           # 系统启动脚本
    "stop_system.sh"            # 系统停止脚本
    "install_conda.sh"          # conda安装脚本
    "install_linux.sh"          # Linux安装脚本
    "install_all.sh"            # 通用安装脚本
    "demo_install.sh"           # 演示安装脚本
    "setup_evaluation.sh"       # 评估设置脚本
    "start_real_demo.sh"        # 真实演示启动脚本
    "stop_real_demo.sh"         # 真实演示停止脚本
    "test_install.sh"           # 安装测试脚本
    "diagnose_system.sh"        # 系统诊断脚本
)

echo "要保留的核心文件:"
for file in "${KEEP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (不存在)"
    fi
done

echo ""
echo "要删除的多余文件:"

# 获取所有.sh文件
ALL_SH_FILES=($(ls *.sh 2>/dev/null))

# 找出要删除的文件
TO_DELETE=()
for file in "${ALL_SH_FILES[@]}"; do
    keep_file=false
    for keep in "${KEEP_FILES[@]}"; do
        if [ "$file" = "$keep" ]; then
            keep_file=true
            break
        fi
    done
    
    if [ "$keep_file" = false ]; then
        TO_DELETE+=("$file")
        echo "🗑️  $file"
    fi
done

echo ""
echo "确认删除这些文件吗？(y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "开始删除..."
    
    for file in "${TO_DELETE[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "✅ 已删除: $file"
        fi
    done
    
    echo ""
    echo "=== 清理完成 ==="
    echo ""
    echo "剩余的核心文件:"
    ls -la *.sh
else
    echo "取消删除操作"
fi
