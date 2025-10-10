#!/usr/bin/env python3
"""
客户端包装器
为现有的隐蔽通信客户端提供HTTP API接口，供前端调用
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import threading

# 添加项目根目录到Python路径
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from client.a2aclient.client import Client

app = FastAPI(title="A2A Client API", description="隐蔽通信客户端API接口")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量
active_clients: Dict[str, Dict[str, Any]] = {}
websocket_connections: Dict[str, WebSocket] = {}

class ClientConfig(BaseModel):
    """客户端配置模型"""
    stego_model_path: str
    stego_algorithm: str
    question_path: str
    question_index: int
    stego_key: str
    secret_bit_path: Optional[str] = "data/stego/secret_bits_frontend.txt"
    server_url: str
    session_id: str

class SecretMessage(BaseModel):
    """隐蔽信息模型"""
    session_id: str
    secret_bits: str

@app.get("/")
async def root():
    """根路径"""
    return {"message": "A2A Client API Server", "status": "running"}

@app.get("/status")
async def get_status():
    """获取客户端状态"""
    return {
        "active_clients": len(active_clients),
        "websocket_connections": len(websocket_connections),
        "clients": {sid: info["status"] for sid, info in active_clients.items()}
    }

@app.post("/save_secret")
async def save_secret_message(message: SecretMessage):
    """保存隐蔽信息到文件"""
    try:
        # 确保目录存在
        secret_dir = "data/stego"
        if not os.path.exists(secret_dir):
            os.makedirs(secret_dir, exist_ok=True)
        
        # 保存隐蔽信息
        file_path = f"{secret_dir}/secret_bits_{message.session_id}.txt"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(message.secret_bits)
        
        return {"success": True, "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存隐蔽信息失败: {str(e)}")

@app.post("/start")
async def start_communication(config: ClientConfig):
    """启动隐蔽通信"""
    session_id = config.session_id
    
    if session_id in active_clients:
        raise HTTPException(status_code=400, detail="该会话已在进行中")
    
    try:
        # 创建客户端实例
        client = Client(
            stego_model_path=config.stego_model_path,
            stego_algorithm=config.stego_algorithm,
            question_path=config.question_path,
            question_index=config.question_index,
            stego_key=config.stego_key,
            secret_bit_path=f"data/stego/secret_bits_{session_id}.txt",
            server_url=config.server_url,
            session_id=session_id
        )
        
        # 保存客户端状态
        active_clients[session_id] = {
            "client": client,
            "status": "initializing",
            "start_time": datetime.now(),
            "config": config.dict()
        }
        
        # 在后台线程中运行客户端 - 直接调用你现有的客户端
        def run_client():
            try:
                # 使用新的事件循环
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # 发送开始信号
                broadcast_to_session(session_id, {
                    "type": "system_message",
                    "message": "开始A2A隐蔽通信...",
                    "timestamp": datetime.now().timestamp()
                })
                
                active_clients[session_id]["status"] = "handshake"
                
                # 修改客户端，添加回调来实时广播消息
                original_send_message = client.send_message
                
                async def send_message_with_broadcast(*args, **kwargs):
                    # 发送Agent A的消息
                    message_text = args[0] if args else kwargs.get('message_text', '')
                    broadcast_to_session(session_id, {
                        "type": "agent_message",
                        "sender": "agent-a",
                        "content": message_text,
                        "timestamp": datetime.now().timestamp()
                    })
                    
                    # 调用原始方法获取响应
                    result = await original_send_message(*args, **kwargs)
                    
                    # 广播Agent B的响应
                    if 'response' in result:
                        broadcast_to_session(session_id, {
                            "type": "agent_message", 
                            "sender": "agent-b",
                            "content": result['response'],
                            "timestamp": datetime.now().timestamp()
                        })
                    
                    return result
                
                # 替换客户端的send_message方法
                client.send_message = send_message_with_broadcast
                
                # 直接调用你现有的客户端方法
                loop.run_until_complete(client.start_a2a_stego_chat())
                
                # 发送完成信号
                active_clients[session_id]["status"] = "completed"
                broadcast_to_session(session_id, {
                    "type": "system_message",
                    "message": "✅ 隐蔽通信完成！",
                    "timestamp": datetime.now().timestamp(),
                    "stats": {
                        "total_packets": getattr(client, 'SN', 0),
                        "total_bits": getattr(client, 'TDS', 0),
                        "efficiency": getattr(client, 'TDS', 0) / getattr(client, 'SN', 1) if getattr(client, 'SN', 0) > 0 else 0
                    }
                })
                
            except Exception as e:
                print(f"客户端运行错误: {e}")
                import traceback
                traceback.print_exc()
                active_clients[session_id]["status"] = "error"
                broadcast_to_session(session_id, {
                    "type": "system_message",
                    "message": f"❌ 通信错误: {str(e)}",
                    "timestamp": datetime.now().timestamp()
                })
            finally:
                # 清理
                if session_id in active_clients:
                    del active_clients[session_id]
        
        # 启动后台线程
        client_thread = threading.Thread(target=run_client, daemon=True)
        client_thread.start()
        
        return {"success": True, "session_id": session_id, "message": "客户端启动成功"}
        
    except Exception as e:
        # 清理失败的客户端
        if session_id in active_clients:
            del active_clients[session_id]
        raise HTTPException(status_code=500, detail=f"启动客户端失败: {str(e)}")

@app.post("/stop")
async def stop_communication(session_id: Optional[str] = None):
    """停止隐蔽通信"""
    if session_id:
        if session_id in active_clients:
            del active_clients[session_id]
            broadcast_to_session(session_id, {"type": "stopped"})
            return {"success": True, "message": f"会话 {session_id} 已停止"}
        else:
            raise HTTPException(status_code=404, detail="会话不存在")
    else:
        # 停止所有客户端
        stopped_sessions = list(active_clients.keys())
        active_clients.clear()
        
        for sid in stopped_sessions:
            broadcast_to_session(sid, {"type": "stopped"})
        
        return {"success": True, "message": f"已停止 {len(stopped_sessions)} 个会话"}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket连接端点"""
    await websocket.accept()
    websocket_connections[session_id] = websocket
    
    try:
        # 发送连接确认
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "session_id": session_id
        })
        
        # 保持连接
        while True:
            # 接收心跳或其他消息
            try:
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        # 清理连接
        if session_id in websocket_connections:
            del websocket_connections[session_id]

@app.get("/questions/{file_path:path}")
async def get_questions(file_path: str):
    """获取问题文件内容"""
    try:
        if not file_path.startswith("data/question/"):
            raise HTTPException(status_code=400, detail="无效的文件路径")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="问题文件不存在")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            questions = f.read().strip().split('\n')
        
        return {
            "file_path": file_path,
            "questions": questions,
            "count": len(questions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取问题文件失败: {str(e)}")

def broadcast_to_session(session_id: str, message: Dict[str, Any]):
    """向指定会话的WebSocket连接广播消息"""
    if session_id in websocket_connections:
        websocket = websocket_connections[session_id]
        try:
            # 由于这个函数可能在不同线程中调用，我们需要安全地发送消息
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(websocket.send_json(message))
        except Exception as e:
            print(f"WebSocket发送失败: {e}")
            # 清理失效的连接
            if session_id in websocket_connections:
                del websocket_connections[session_id]

if __name__ == "__main__":
    print("启动A2A客户端API服务器...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8889, 
        log_level="info",
        reload=False
    ) 