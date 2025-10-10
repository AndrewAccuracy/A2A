#!/bin/bash

echo "=== A2A系统诊断工具 ==="
echo ""

# 检查端口占用情况
echo "🔍 检查端口占用情况:"
ports=(3000 8889 9998 9999)
for port in "${ports[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "  端口 $port: ✅ 被占用"
        lsof -i :$port | grep LISTEN | while read line; do
            echo "    $line"
        done
    else
        echo "  端口 $port: ❌ 空闲"
    fi
done

echo ""
echo "🔍 检查相关进程:"

# 检查Python进程
echo "  Python相关进程:"
ps aux | grep python | grep -E "(server_wrapper|client_wrapper|http.server)" | grep -v grep | while read line; do
    echo "    $line"
done

echo ""
echo "🔍 检查服务状态:"

# 检查包装器状态
check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" >/dev/null 2>&1; then
        echo "  $name: ✅ 响应正常"
    else
        echo "  $name: ❌ 无响应"
    fi
}

check_service "http://localhost:9998/status" "A2A服务器包装器"
check_service "http://localhost:8889/status" "客户端包装器"
check_service "http://localhost:3000" "前端服务器"

echo ""
echo "🔍 检查日志文件:"
log_files=("logs/server_wrapper.log" "logs/server.log" "logs/client_wrapper.log" "logs/frontend.log")
for log_file in "${log_files[@]}"; do
    if [ -f "$log_file" ]; then
        size=$(du -h "$log_file" | cut -f1)
        echo "  $log_file: ✅ 存在 (大小: $size)"
        echo "    最后几行:"
        tail -n 3 "$log_file" | sed 's/^/      /'
    else
        echo "  $log_file: ❌ 不存在"
    fi
done

echo ""
echo "🛠️  常用修复命令:"
echo "  清理所有相关进程: pkill -f 'python.*wrapper'"
echo "  清理端口9999: lsof -ti:9999 | xargs kill"
echo "  重启整个系统: ./stop_real_demo.sh && ./start_real_demo.sh"
echo "  查看实时日志: tail -f logs/server_wrapper.log" 