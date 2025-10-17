#!/usr/bin/env python3
"""
A2A系统重置功能演示脚本
展示前端重置按钮的完整功能
"""

import requests
import time
import json

def demo_system_reset():
    """演示系统重置功能"""
    print("🔄 A2A系统重置功能演示")
    print("=" * 60)
    
    # 检查API服务状态
    print("1. 检查API服务状态...")
    try:
        server_status = requests.get("http://localhost:9998/status")
        client_status = requests.get("http://localhost:8889/status")
        
        print(f"   服务器API: {'✅ 运行中' if server_status.status_code == 200 else '❌ 未运行'}")
        print(f"   客户端API: {'✅ 运行中' if client_status.status_code == 200 else '❌ 未运行'}")
        
        if server_status.status_code == 200:
            server_data = server_status.json()
            print(f"   当前服务器状态: {server_data.get('status', 'unknown')}")
        
        if client_status.status_code == 200:
            client_data = client_status.json()
            print(f"   活跃客户端数量: {client_data.get('active_clients', 0)}")
            
    except Exception as e:
        print(f"   ❌ API检查失败: {e}")
        return
    
    print("\n2. 模拟前端重置操作...")
    print("   (这相当于点击前端的'重置系统'按钮)")
    
    # 模拟前端重置流程
    reset_steps = [
        ("停止客户端通信", "http://localhost:8889/stop", "POST"),
        ("停止A2A服务器", "http://localhost:9998/stop", "POST"),
        ("等待服务完全停止", None, "WAIT"),
        ("重新启动A2A服务器", "http://localhost:9998/start", "POST"),
        ("检查最终状态", "http://localhost:9998/status", "GET")
    ]
    
    for i, (step_name, url, method) in enumerate(reset_steps, 1):
        print(f"   {i}. {step_name}...")
        
        if method == "WAIT":
            time.sleep(2)
            print("      ✅ 等待完成")
            continue
            
        try:
            if method == "POST":
                if "start" in url:
                    # 启动服务器需要配置参数
                    config = {
                        "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
                        "stego_algorithm": "meteor",
                        "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
                        "decrypted_bits_path": "data/stego/decrypted_bits.txt",
                        "session_id": "demo-reset-session",
                        "server_url": "http://localhost:9999"
                    }
                    response = requests.post(url, json=config)
                else:
                    response = requests.post(url)
                    
            elif method == "GET":
                response = requests.get(url)
            
            if response.status_code == 200:
                print(f"      ✅ 成功 (状态码: {response.status_code})")
                if method == "GET":
                    data = response.json()
                    print(f"         状态: {data.get('status', 'unknown')}")
            else:
                print(f"      ⚠️  响应异常 (状态码: {response.status_code})")
                
        except Exception as e:
            print(f"      ❌ 操作失败: {e}")
    
    print("\n3. 重置完成后的状态检查...")
    try:
        final_status = requests.get("http://localhost:9998/status")
        if final_status.status_code == 200:
            data = final_status.json()
            print(f"   最终服务器状态: {data.get('status', 'unknown')}")
            print(f"   服务器PID: {data.get('server_process', 'N/A')}")
            print(f"   启动时间: {data.get('start_time', 'N/A')}")
        else:
            print("   ❌ 无法获取最终状态")
    except Exception as e:
        print(f"   ❌ 状态检查失败: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 系统重置演示完成！")
    print("\n前端重置功能说明:")
    print("• 点击'重置系统'按钮会执行上述所有步骤")
    print("• 操作前会显示确认对话框")
    print("• 会清空所有对话历史和文件上传状态")
    print("• 重置操作不可撤销")
    print("\n使用建议:")
    print("• 在开始新的隐蔽通信会话前使用重置功能")
    print("• 当系统出现异常状态时使用重置功能")
    print("• 重置后需要重新配置所有参数")

def show_frontend_usage():
    """显示前端使用方法"""
    print("\n📱 前端使用方法:")
    print("1. 打开浏览器访问 http://localhost:3000")
    print("2. 在A2A服务器配置区域找到三个按钮:")
    print("   • 🟢 启动A2A服务器 - 启动服务器进程")
    print("   • 🔴 停止A2A服务器 - 停止服务器进程") 
    print("   • 🔄 重置系统 - 完整系统重置")
    print("3. 点击'重置系统'按钮")
    print("4. 在确认对话框中点击'确定'")
    print("5. 等待重置完成（按钮会显示'重置中...'）")
    print("6. 重置完成后可以开始新的会话")

if __name__ == "__main__":
    demo_system_reset()
    show_frontend_usage()
