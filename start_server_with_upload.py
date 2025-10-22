#!/usr/bin/env python3
"""
启动带文件上传功能的A2A服务器
"""
import sys
import os
import subprocess

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

def main():
    print("🚀 启动A2A服务器 (带文件上传功能)")
    print("=" * 50)
    
    # 检查必要的目录
    required_dirs = [
        "data/question",
        "data/stego", 
        "data/conversation"
    ]
    
    for dir_path in required_dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"✅ 确保目录存在: {dir_path}")
    
    # 启动服务器
    server_script = os.path.join(project_root, "server", "main_with_upload.py")
    
    print(f"\n📡 启动服务器: {server_script}")
    print("🌐 服务器地址: http://localhost:9999")
    print("📋 可用的API端点:")
    print("  POST /upload/question - 上传问题文件")
    print("  POST /upload/secret - 上传隐蔽信息文件")
    print("  POST /save_secret - 保存隐蔽信息比特流")
    print("  POST /start - 启动隐蔽通信")
    print("  POST /stop - 停止隐蔽通信")
    print("  GET /status - 获取服务器状态")
    print("\n按 Ctrl+C 停止服务器")
    print("=" * 50)
    
    try:
        subprocess.run([sys.executable, server_script], check=True)
    except KeyboardInterrupt:
        print("\n\n🛑 服务器已停止")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 启动服务器失败: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
