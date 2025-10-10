#!/usr/bin/env python3
"""
服务器包装器
为A2A服务器提供HTTP API接口，支持动态参数配置
"""

import asyncio
import json
import sys
import os
import signal
import subprocess
import time
import atexit
import psutil  # 需要安装: pip install psutil
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import threading
import logging

# 添加项目根目录到Python路径
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

app = FastAPI(title="A2A Server API", description="A2A服务器动态配置API接口")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量
active_server: Optional[Dict[str, Any]] = None
server_process: Optional[subprocess.Popen] = None

# WebSocket连接管理
active_connections: Dict[str, List[WebSocket]] = {}

def broadcast_to_session(session_id: str, message: dict):
    """向指定会话的所有WebSocket连接广播消息"""
    if session_id in active_connections:
        disconnected_connections = []
        for connection in active_connections[session_id]:
            try:
                asyncio.create_task(connection.send_text(json.dumps(message)))
            except Exception as e:
                print(f"广播消息失败: {e}")
                disconnected_connections.append(connection)
        
        # 清理断开的连接
        for conn in disconnected_connections:
            active_connections[session_id].remove(conn)

class ServerConfig(BaseModel):
    """服务器配置模型"""
    stego_model_path: str
    stego_algorithm: str
    stego_key: str
    decrypted_bits_path: str
    session_id: str
    server_url: str = "http://localhost:9999"

@app.get("/")
async def root():
    """根路径"""
    return {"message": "A2A Server API", "status": "running"}

@app.get("/status")
async def get_server_status():
    """获取服务器状态"""
    global active_server, server_process
    
    if active_server is None:
        return {
            "status": "stopped",
            "server_process": None,
            "config": None
        }
    
    # 检查进程是否还在运行
    if server_process and server_process.poll() is None:
        status = "running"
    else:
        status = "stopped"
        active_server = None
        server_process = None
    
    return {
        "status": status,
        "server_process": server_process.pid if server_process else None,
        "config": active_server.get("config") if active_server else None,
        "start_time": active_server.get("start_time") if active_server else None
    }

def kill_process_on_port(port):
    """杀死占用指定端口的进程"""
    try:
        # 使用psutil查找占用端口的进程
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                try:
                    process = psutil.Process(conn.pid)
                    print(f"发现占用端口{port}的进程: PID={conn.pid}, 名称={process.name()}")
                    process.terminate()  # 优雅终止
                    try:
                        process.wait(timeout=5)  # 等待进程结束
                    except psutil.TimeoutExpired:
                        process.kill()  # 强制杀死
                    print(f"已清理占用端口{port}的进程: PID={conn.pid}")
                    return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
    except Exception as e:
        print(f"清理端口{port}时出错: {e}")
    return False

@app.post("/start")
async def start_server(config: ServerConfig):
    """启动A2A服务器"""
    global active_server, server_process
    
    if server_process:
        raise HTTPException(status_code=400, detail="服务器已在运行中")
    
    # 检查并清理可能的孤立进程
    server_port = int(config.server_url.split(':')[-1]) if config.server_url else 9999
    if kill_process_on_port(server_port):
        time.sleep(2)  # 等待端口释放
    
    try:
        # 确保数据目录存在
        os.makedirs("data/stego", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        
        # 构建启动命令
        cmd = [
            "python", "server/main.py",
            "--stego_model_path", config.stego_model_path,
            "--stego_algorithm", config.stego_algorithm,
            "--stego_key", config.stego_key,
            "--decrypted_bits_path", config.decrypted_bits_path,
            "--session_id", config.session_id,
            "--server_url", config.server_url
        ]
        
        # 启动服务器进程
        server_process = subprocess.Popen(
            cmd,
            stdout=open("logs/server.log", "w"),
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid  # 创建新的进程组
        )
        
        # 等待一下确保服务器启动
        time.sleep(3)
        
        # 检查进程是否成功启动
        if server_process.poll() is not None:
            raise Exception("服务器进程启动失败")
        
        # 保存服务器状态
        active_server = {
            "config": config.dict(),
            "start_time": datetime.now().isoformat(),
            "pid": server_process.pid
        }
        
        return {
            "success": True,
            "message": "A2A服务器启动成功",
            "pid": server_process.pid,
            "config": config.dict()
        }
        
    except Exception as e:
        # 清理失败的进程
        if server_process:
            try:
                os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
            except:
                pass
            server_process = None
        active_server = None
        raise HTTPException(status_code=500, detail=f"启动服务器失败: {str(e)}")

@app.post("/stop")
async def stop_server():
    """停止A2A服务器"""
    global active_server, server_process
    
    if not server_process:
        raise HTTPException(status_code=400, detail="没有运行中的服务器")
    
    try:
        # 终止进程组（包括子进程）
        os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
        
        # 等待进程结束
        try:
            server_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            # 强制杀死
            os.killpg(os.getpgid(server_process.pid), signal.SIGKILL)
            server_process.wait()
        
        # 清理状态
        active_server = None
        server_process = None
        
        return {"success": True, "message": "服务器已停止"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"停止服务器失败: {str(e)}")

@app.post("/restart")
async def restart_server(config: Optional[ServerConfig] = None):
    """重启A2A服务器"""
    # 先停止现有服务器
    if server_process:
        await stop_server()
    
    # 等待一下确保完全停止
    time.sleep(2)
    
    # 使用新配置或当前配置启动
    if config is None and active_server:
        config = ServerConfig(**active_server["config"])
    elif config is None:
        config = ServerConfig()  # 使用默认配置
    
    return await start_server(config)

@app.get("/logs")
async def get_server_logs(lines: int = 50):
    """获取服务器日志"""
    try:
        log_file = "logs/server.log"
        if not os.path.exists(log_file):
            return {"logs": [], "message": "日志文件不存在"}
        
        with open(log_file, 'r', encoding='utf-8') as f:
            log_lines = f.readlines()
        
        # 返回最后N行
        recent_logs = log_lines[-lines:] if len(log_lines) > lines else log_lines
        
        return {
            "logs": [line.strip() for line in recent_logs],
            "total_lines": len(log_lines),
            "returned_lines": len(recent_logs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取日志失败: {str(e)}")

# 优雅关闭处理
def cleanup_on_exit():
    """程序退出时清理资源"""
    global server_process
    if server_process:
        try:
            os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
            server_process.wait(timeout=5)
        except:
            try:
                os.killpg(os.getpgid(server_process.pid), signal.SIGKILL)
            except:
                pass

# WebSocket端点
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket端点用于实时通信"""
    await websocket.accept()
    
    # 添加连接到会话
    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(websocket)
    
    try:
        # 发送欢迎消息
        await websocket.send_text(json.dumps({
            "type": "system_message",
            "message": "服务器WebSocket连接已建立",
            "timestamp": datetime.now().timestamp()
        }))
        
        # 保持连接
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        # 移除连接
        if session_id in active_connections:
            active_connections[session_id].remove(websocket)
            if not active_connections[session_id]:
                del active_connections[session_id]
    except Exception as e:
        print(f"WebSocket错误: {e}")
        # 移除连接
        if session_id in active_connections and websocket in active_connections[session_id]:
            active_connections[session_id].remove(websocket)
            if not active_connections[session_id]:
                del active_connections[session_id]

# 注册退出处理
atexit.register(cleanup_on_exit)

if __name__ == "__main__":
    print("启动A2A服务器API...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=9998,  # 使用9998端口，避免与实际服务器冲突
        log_level="info",
        reload=False
    ) 