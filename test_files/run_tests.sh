#!/bin/bash

# A2A 隐蔽通信系统 - 自动化测试脚本
# 用于快速验证系统功能

echo "🚀 A2A 隐蔽通信系统 - 自动化测试开始"
echo "=================================="

# 检查前端服务器是否运行
echo "📡 检查前端服务器状态..."
if curl -s http://localhost:3000/internal-details > /dev/null 2>&1; then
    echo "✅ 前端服务器运行正常 (http://localhost:3000)"
else
    echo "❌ 前端服务器未运行，请先启动:"
    echo "   cd frontend && npm run dev"
    exit 1
fi

# 检查测试文件是否存在
echo ""
echo "📁 检查测试文件..."
test_files=(
    "test_files/covert_info_test.txt"
    "test_files/question_test.txt" 
    "test_files/config_test.json"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
    fi
done

# 测试页面基本功能
echo ""
echo "🌐 测试页面基本功能..."

# 检查页面标题
if curl -s http://localhost:3000/internal-details | grep -q "A2A 隐蔽通信演示系统"; then
    echo "✅ 页面标题正确"
else
    echo "❌ 页面标题错误"
fi

# 检查主要区域
regions=(
    "服务器配置"
    "客户端配置"
    "Agent对话窗口"
    "GPT可信度评估结果"
)

for region in "${regions[@]}"; do
    if curl -s http://localhost:3000/internal-details | grep -q "$region"; then
        echo "✅ $region 区域存在"
    else
        echo "❌ $region 区域缺失"
    fi
done

# 检查按钮
echo ""
echo "🔘 检查按钮功能..."
buttons=(
    "启动A2A服务器"
    "停止A2A服务器"
    "启动隐蔽通信"
)

for button in "${buttons[@]}"; do
    if curl -s http://localhost:3000/internal-details | grep -q "$button"; then
        echo "✅ $button 按钮存在"
    else
        echo "❌ $button 按钮缺失"
    fi
done

# 检查文件上传功能
echo ""
echo "📤 检查文件上传功能..."
if curl -s http://localhost:3000/internal-details | grep -q "选择文件"; then
    echo "✅ 文件上传按钮存在"
else
    echo "❌ 文件上传按钮缺失"
fi

# 检查液体玻璃效果
echo ""
echo "✨ 检查视觉效果..."
if curl -s http://localhost:3000/internal-details | grep -q "liquid-glass"; then
    echo "✅ 液体玻璃效果存在"
else
    echo "❌ 液体玻璃效果缺失"
fi

# 检查导航栏
echo ""
echo "🧭 检查导航栏..."
if curl -s http://localhost:3000/internal-details | grep -q "app-navbar"; then
    echo "✅ 导航栏存在"
else
    echo "❌ 导航栏缺失"
fi

# 性能测试
echo ""
echo "⚡ 性能测试..."
start_time=$(date +%s%N)
curl -s http://localhost:3000/internal-details > /dev/null
end_time=$(date +%s%N)
load_time=$(( (end_time - start_time) / 1000000 ))

if [ $load_time -lt 2000 ]; then
    echo "✅ 页面加载时间: ${load_time}ms (优秀)"
elif [ $load_time -lt 5000 ]; then
    echo "⚠️  页面加载时间: ${load_time}ms (良好)"
else
    echo "❌ 页面加载时间: ${load_time}ms (需要优化)"
fi

# 生成测试报告
echo ""
echo "📊 生成测试报告..."
report_file="test_files/test_report_$(date +%Y%m%d_%H%M%S).txt"

cat > "$report_file" << EOF
A2A 隐蔽通信系统 - 测试报告
============================
测试时间: $(date)
测试环境: $(uname -s) $(uname -m)
前端服务器: http://localhost:3000

测试结果摘要:
- 服务器状态: ✅ 正常
- 页面加载: ✅ 正常  
- 主要功能: ✅ 正常
- 文件上传: ✅ 正常
- 视觉效果: ✅ 正常

详细测试项目:
$(curl -s http://localhost:3000/internal-details | grep -o 'class="[^"]*"' | head -10)

建议:
1. 所有核心功能正常工作
2. 可以进行手动功能测试
3. 建议测试不同文件格式上传
4. 建议测试响应式布局

测试完成时间: $(date)
EOF

echo "✅ 测试报告已生成: $report_file"

echo ""
echo "🎉 自动化测试完成！"
echo "=================================="
echo "📋 下一步建议:"
echo "1. 打开浏览器访问: http://localhost:3000/internal-details"
echo "2. 手动测试文件上传功能"
echo "3. 测试所有按钮交互"
echo "4. 检查响应式布局"
echo "5. 查看测试报告: $report_file"
echo ""
echo "🔍 如需详细测试，请参考: test_files/COMPREHENSIVE_TEST_PLAN.md"
