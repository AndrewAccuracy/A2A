#!/usr/bin/env python3
"""
测试API连接脚本
用于验证前端和后端API的连接是否正常
"""

import requests
import json
import time

def test_server_api():
    """测试服务器API"""
    base_url = "http://localhost:9998"
    
    print("🔍 测试A2A服务器API连接...")
    
    try:
        # 测试根路径
        response = requests.get(f"{base_url}/")
        print(f"✅ 根路径测试: {response.status_code}")
        print(f"   响应: {response.json()}")
        
        # 测试状态接口
        response = requests.get(f"{base_url}/status")
        print(f"✅ 状态接口测试: {response.status_code}")
        print(f"   当前状态: {response.json()}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器API (端口9998)")
        print("   请确保运行: python server_wrapper.py")
        return False
    except Exception as e:
        print(f"❌ 服务器API测试失败: {e}")
        return False

def test_client_api():
    """测试客户端API"""
    base_url = "http://localhost:8889"
    
    print("\n🔍 测试A2A客户端API连接...")
    
    try:
        # 测试根路径
        response = requests.get(f"{base_url}/")
        print(f"✅ 根路径测试: {response.status_code}")
        print(f"   响应: {response.json()}")
        
        # 测试状态接口
        response = requests.get(f"{base_url}/status")
        print(f"✅ 状态接口测试: {response.status_code}")
        print(f"   当前状态: {response.json()}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到客户端API (端口8889)")
        print("   请确保运行: python client_wrapper.py")
        return False
    except Exception as e:
        print(f"❌ 客户端API测试失败: {e}")
        return False

def test_server_start_stop():
    """测试服务器启动和停止功能"""
    base_url = "http://localhost:9998"
    
    print("\n🔍 测试服务器启动/停止功能...")
    
    try:
        # 测试启动服务器
        config = {
            "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
            "stego_algorithm": "meteor",
            "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
            "decrypted_bits_path": "data/stego/decrypted_bits.txt",
            "session_id": "test-session-123",
            "server_url": "http://localhost:9999"
        }
        
        print("   尝试启动服务器...")
        response = requests.post(f"{base_url}/start", json=config)
        print(f"   启动响应: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ 服务器启动成功")
            
            # 等待一下
            time.sleep(2)
            
            # 检查状态
            status_response = requests.get(f"{base_url}/status")
            print(f"   当前状态: {status_response.json()}")
            
            # 测试停止服务器
            print("   尝试停止服务器...")
            stop_response = requests.post(f"{base_url}/stop")
            print(f"   停止响应: {stop_response.status_code}")
            
            if stop_response.status_code == 200:
                print("   ✅ 服务器停止成功")
            else:
                print(f"   ❌ 服务器停止失败: {stop_response.text}")
        else:
            print(f"   ❌ 服务器启动失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 服务器启动/停止测试失败: {e}")

def test_system_reset():
    """测试系统重置功能（模拟前端刷新按钮）"""
    print("\n🔍 测试系统重置功能...")
    
    try:
        # 1. 停止客户端通信
        print("   1. 停止客户端通信...")
        try:
            client_response = requests.post("http://localhost:8889/stop")
            print(f"      客户端停止响应: {client_response.status_code}")
        except Exception as e:
            print(f"      客户端停止失败: {e}")
        
        # 2. 重启服务器
        print("   2. 重启服务器...")
        try:
            # 先停止
            stop_response = requests.post("http://localhost:9998/stop")
            if stop_response.status_code == 200:
                print("      服务器已停止")
                time.sleep(2)  # 等待完全停止
                
                # 再启动
                config = {
                    "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
                    "stego_algorithm": "meteor",
                    "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
                    "decrypted_bits_path": "data/stego/decrypted_bits.txt",
                    "session_id": "reset-session-456",
                    "server_url": "http://localhost:9999"
                }
                start_response = requests.post("http://localhost:9998/start", json=config)
                print(f"      服务器重启响应: {start_response.status_code}")
            else:
                print("      服务器停止失败")
        except Exception as e:
            print(f"      服务器重启失败: {e}")
        
        # 3. 检查最终状态
        print("   3. 检查最终状态...")
        try:
            status_response = requests.get("http://localhost:9998/status")
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"      最终服务器状态: {status_data.get('status', 'unknown')}")
                print("   ✅ 系统重置测试完成")
            else:
                print("      ❌ 无法获取最终状态")
        except Exception as e:
            print(f"      状态检查失败: {e}")
            
    except Exception as e:
        print(f"❌ 系统重置测试失败: {e}")

if __name__ == "__main__":
    print("🚀 A2A API连接测试")
    print("=" * 50)
    
    server_ok = test_server_api()
    client_ok = test_client_api()
    
    if server_ok:
        test_server_start_stop()
        test_system_reset()
    
    print("\n" + "=" * 50)
    if server_ok and client_ok:
        print("🎉 所有API连接测试通过！")
        print("   前端现在应该能够正常启动和停止A2A服务器了。")
    else:
        print("⚠️  部分API连接失败，请检查后端服务是否正在运行。")
        print("\n启动命令:")
        if not server_ok:
            print("   python server_wrapper.py  # 在终端1中运行")
        if not client_ok:
            print("   python client_wrapper.py  # 在终端2中运行")
