#!/usr/bin/env python3
"""
完整系统检查脚本
验证前端和后端的所有API连接是否正常
"""

import requests
import time
import json
from typing import Dict, List, Tuple

class SystemChecker:
    def __init__(self):
        self.results = {
            "server_wrapper": {"status": "unknown", "endpoints": {}},
            "client_wrapper": {"status": "unknown", "endpoints": {}},
            "a2a_server": {"status": "unknown", "pid": None},
            "frontend": {"status": "unknown", "port": 3000}
        }
    
    def check_endpoint(self, url: str, method: str = "GET", data: dict = None) -> Tuple[bool, str, dict]:
        """检查单个API端点"""
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=5)
            else:
                return False, f"不支持的HTTP方法: {method}", {}
            
            if response.status_code == 200:
                return True, "成功", response.json()
            else:
                return False, f"HTTP {response.status_code}", response.text
                
        except requests.exceptions.ConnectionError:
            return False, "连接被拒绝", {}
        except requests.exceptions.Timeout:
            return False, "请求超时", {}
        except Exception as e:
            return False, f"错误: {str(e)}", {}
    
    def check_server_wrapper(self):
        """检查服务器包装器"""
        print("🔍 检查服务器包装器 (端口9998)...")
        base_url = "http://localhost:9998"
        
        endpoints = [
            ("/", "GET", None, "根路径"),
            ("/status", "GET", None, "状态检查"),
            ("/start", "POST", {
                "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
                "stego_algorithm": "meteor",
                "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
                "decrypted_bits_path": "data/stego/decrypted_bits.txt",
                "session_id": "test-session",
                "server_url": "http://localhost:9999"
            }, "启动服务器"),
            ("/stop", "POST", None, "停止服务器")
        ]
        
        all_ok = True
        for endpoint, method, data, description in endpoints:
            url = f"{base_url}{endpoint}"
            success, message, response_data = self.check_endpoint(url, method, data)
            
            self.results["server_wrapper"]["endpoints"][endpoint] = {
                "success": success,
                "message": message,
                "response": response_data
            }
            
            status_icon = "✅" if success else "❌"
            print(f"   {status_icon} {description}: {message}")
            
            if not success:
                all_ok = False
        
        self.results["server_wrapper"]["status"] = "运行中" if all_ok else "异常"
        return all_ok
    
    def check_client_wrapper(self):
        """检查客户端包装器"""
        print("\n🔍 检查客户端包装器 (端口8889)...")
        base_url = "http://localhost:8889"
        
        endpoints = [
            ("/", "GET", None, "根路径"),
            ("/status", "GET", None, "状态检查"),
            ("/save_secret", "POST", {
                "session_id": "test-session",
                "secret_bits": "0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100"
            }, "保存隐蔽信息"),
            ("/start", "POST", {
                "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
                "stego_algorithm": "meteor",
                "question_path": "data/question/general.txt",
                "question_index": 0,
                "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
                "secret_bit_path": "data/stego/secret_bits_test.txt",
                "server_url": "http://localhost:9999",
                "session_id": "test-session"
            }, "启动隐蔽通信"),
            ("/stop", "POST", None, "停止隐蔽通信")
        ]
        
        all_ok = True
        for endpoint, method, data, description in endpoints:
            url = f"{base_url}{endpoint}"
            success, message, response_data = self.check_endpoint(url, method, data)
            
            self.results["client_wrapper"]["endpoints"][endpoint] = {
                "success": success,
                "message": message,
                "response": response_data
            }
            
            status_icon = "✅" if success else "❌"
            print(f"   {status_icon} {description}: {message}")
            
            if not success:
                all_ok = False
        
        self.results["client_wrapper"]["status"] = "运行中" if all_ok else "异常"
        return all_ok
    
    def check_a2a_server(self):
        """检查A2A服务器状态"""
        print("\n🔍 检查A2A服务器状态...")
        
        # 通过服务器包装器检查A2A服务器状态
        success, message, data = self.check_endpoint("http://localhost:9998/status")
        
        if success and data:
            server_status = data.get("status", "unknown")
            server_pid = data.get("server_process")
            
            if server_status == "running":
                self.results["a2a_server"]["status"] = "运行中"
                self.results["a2a_server"]["pid"] = server_pid
                print(f"   ✅ A2A服务器运行中 (PID: {server_pid})")
                return True
            else:
                self.results["a2a_server"]["status"] = "已停止"
                print(f"   ⚠️  A2A服务器已停止")
                return False
        else:
            self.results["a2a_server"]["status"] = "无法检查"
            print(f"   ❌ 无法检查A2A服务器状态: {message}")
            return False
    
    def check_frontend(self):
        """检查前端服务"""
        print("\n🔍 检查前端服务 (端口3000)...")
        
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            if response.status_code == 200:
                self.results["frontend"]["status"] = "运行中"
                print("   ✅ 前端服务运行中")
                return True
            else:
                self.results["frontend"]["status"] = "异常"
                print(f"   ❌ 前端服务异常 (HTTP {response.status_code})")
                return False
        except Exception as e:
            self.results["frontend"]["status"] = "未运行"
            print(f"   ❌ 前端服务未运行: {e}")
            return False
    
    def generate_report(self):
        """生成检查报告"""
        print("\n" + "="*60)
        print("📊 系统检查报告")
        print("="*60)
        
        # 总体状态
        all_services = [
            self.results["server_wrapper"]["status"],
            self.results["client_wrapper"]["status"],
            self.results["a2a_server"]["status"],
            self.results["frontend"]["status"]
        ]
        
        running_count = sum(1 for status in all_services if status == "运行中")
        total_count = len(all_services)
        
        print(f"\n🎯 总体状态: {running_count}/{total_count} 服务运行中")
        
        # 详细状态
        print("\n📋 详细状态:")
        for service, info in self.results.items():
            status_icon = "✅" if info["status"] == "运行中" else "❌"
            print(f"   {status_icon} {service}: {info['status']}")
            if service == "a2a_server" and info.get("pid"):
                print(f"      PID: {info['pid']}")
        
        # 问题诊断
        print("\n🔧 问题诊断:")
        if self.results["server_wrapper"]["status"] != "运行中":
            print("   • 启动服务器包装器: python server_wrapper.py")
        
        if self.results["client_wrapper"]["status"] != "运行中":
            print("   • 启动客户端包装器: python client_wrapper.py")
        
        if self.results["a2a_server"]["status"] != "运行中":
            print("   • 通过前端界面启动A2A服务器")
        
        if self.results["frontend"]["status"] != "运行中":
            print("   • 启动前端: cd frontend && npm run dev")
        
        # 建议
        print("\n💡 建议:")
        if running_count == total_count:
            print("   🎉 所有服务运行正常！可以开始使用系统了。")
        elif running_count >= 2:
            print("   ⚠️  部分服务运行中，请检查未运行的服务。")
        else:
            print("   🚨 大部分服务未运行，请按照诊断建议启动服务。")
    
    def run_full_check(self):
        """运行完整检查"""
        print("🚀 A2A系统完整检查")
        print("="*60)
        
        # 检查各个组件
        server_wrapper_ok = self.check_server_wrapper()
        client_wrapper_ok = self.check_client_wrapper()
        a2a_server_ok = self.check_a2a_server()
        frontend_ok = self.check_frontend()
        
        # 生成报告
        self.generate_report()
        
        return all([server_wrapper_ok, client_wrapper_ok, a2a_server_ok, frontend_ok])

if __name__ == "__main__":
    checker = SystemChecker()
    success = checker.run_full_check()
    
    if success:
        print("\n🎉 系统检查完成，所有服务正常运行！")
        exit(0)
    else:
        print("\n⚠️  系统检查完成，发现一些问题需要解决。")
        exit(1)
