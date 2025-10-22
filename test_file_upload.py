#!/usr/bin/env python3
"""
测试文件上传功能
"""
import requests
import os
import tempfile

def test_file_upload():
    """测试文件上传API"""
    base_url = "http://localhost:9999"
    
    print("🧪 测试文件上传功能")
    print("=" * 40)
    
    # 测试1: 上传问题文件
    print("1. 测试上传问题文件...")
    question_content = "What is the history of artificial intelligence?"
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(question_content)
        question_file_path = f.name
    
    try:
        with open(question_file_path, 'rb') as f:
            files = {'file': ('test_question.txt', f, 'text/plain')}
            response = requests.post(f"{base_url}/upload/question", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 问题文件上传成功: {result['filename']}")
            print(f"   保存路径: {result['path']}")
            print(f"   文件大小: {result['size']} bytes")
        else:
            print(f"❌ 问题文件上传失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
    except Exception as e:
        print(f"❌ 上传问题文件时出错: {e}")
    finally:
        os.unlink(question_file_path)
    
    # 测试2: 上传隐蔽信息文件
    print("\n2. 测试上传隐蔽信息文件...")
    secret_content = "0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100"
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(secret_content)
        secret_file_path = f.name
    
    try:
        with open(secret_file_path, 'rb') as f:
            files = {'file': ('test_secret.txt', f, 'text/plain')}
            response = requests.post(f"{base_url}/upload/secret", files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 隐蔽信息文件上传成功: {result['filename']}")
            print(f"   保存路径: {result['path']}")
            print(f"   文件大小: {result['size']} bytes")
        else:
            print(f"❌ 隐蔽信息文件上传失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
    except Exception as e:
        print(f"❌ 上传隐蔽信息文件时出错: {e}")
    finally:
        os.unlink(secret_file_path)
    
    # 测试3: 保存隐蔽信息比特流
    print("\n3. 测试保存隐蔽信息比特流...")
    try:
        data = {
            "session_id": "test-session-123",
            "secret_bits": "1010101100110011"
        }
        response = requests.post(f"{base_url}/save_secret", json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 隐蔽信息保存成功")
            print(f"   保存路径: {result['path']}")
            print(f"   比特长度: {result['size']}")
        else:
            print(f"❌ 隐蔽信息保存失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
    except Exception as e:
        print(f"❌ 保存隐蔽信息时出错: {e}")
    
    # 测试4: 获取服务器状态
    print("\n4. 测试获取服务器状态...")
    try:
        response = requests.get(f"{base_url}/status")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 服务器状态获取成功")
            print(f"   状态: {result['status']}")
            print(f"   A2A服务器: {result['a2a_server']}")
            print(f"   文件上传: {result['file_upload']}")
        else:
            print(f"❌ 获取服务器状态失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 获取服务器状态时出错: {e}")
    
    # 测试5: 启动通信
    print("\n5. 测试启动隐蔽通信...")
    try:
        data = {
            "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
            "stego_algorithm": "meteor",
            "question_path": "data/question/test_question.txt",
            "question_index": 0,
            "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
            "secret_bit_path": "data/stego/test_secret.txt",
            "server_url": "http://localhost:9999",
            "session_id": "test-session-123"
        }
        response = requests.post(f"{base_url}/start", json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 隐蔽通信启动成功")
            print(f"   消息: {result['message']}")
            print(f"   状态: {result['status']}")
        else:
            print(f"❌ 隐蔽通信启动失败: {response.status_code}")
            print(f"   错误信息: {response.text}")
    except Exception as e:
        print(f"❌ 启动隐蔽通信时出错: {e}")
    
    print("\n" + "=" * 40)
    print("🎉 测试完成!")

if __name__ == "__main__":
    test_file_upload()
