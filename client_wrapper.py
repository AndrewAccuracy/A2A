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
from evaluation_service import SteganographyEvaluator

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
evaluator: Optional[SteganographyEvaluator] = None

# 初始化评估器
def init_evaluator():
    """初始化评估器"""
    global evaluator
    try:
        # 尝试从环境变量获取API密钥
        api_key = os.getenv('AIHUBMIX_API_KEY')
        if api_key:
            evaluator = SteganographyEvaluator(api_key=api_key)
            print("✅ 评估器初始化成功")
        else:
            print("⚠️ 未设置AIHUBMIX_API_KEY环境变量，评估功能将被禁用")
    except Exception as e:
        print(f"⚠️ 评估器初始化失败: {e}")
        evaluator = None

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
                
                # 存储当前轮次的比特数信息
                current_round_bits = {"bits_encoded": 0}
                
                async def send_message_with_broadcast(*args, **kwargs):
                    # 发送Agent A的消息
                    message_text = args[0] if args else kwargs.get('message_text', '')
                    client_timestamp = datetime.now().isoformat() + 'Z'
                    
                    broadcast_to_session(session_id, {
                        "type": "agent_message",
                        "sender": "agent-a",
                        "content": message_text,
                        "timestamp": datetime.now().timestamp()
                    })
                    
                    # 调用原始方法获取响应
                    result = await original_send_message(*args, **kwargs)
                    
                    # 广播Agent B的响应 - 从正确的位置提取响应内容
                    server_response = ""
                    server_timestamp = datetime.now().isoformat() + 'Z'
                    
                    try:
                        if 'result' in result and 'parts' in result['result']:
                            server_response = result['result']['parts'][0].get('text', '')
                            if server_response:
                                broadcast_to_session(session_id, {
                                    "type": "agent_message", 
                                    "sender": "agent-b",
                                    "content": server_response,
                                    "timestamp": datetime.now().timestamp()
                                })
                        else:
                            # 兼容其他可能的响应格式
                            if 'response' in result:
                                server_response = result['response']
                                broadcast_to_session(session_id, {
                                    "type": "agent_message", 
                                    "sender": "agent-b",
                                    "content": server_response,
                                    "timestamp": datetime.now().timestamp()
                                })
                    except Exception as e:
                        print(f"提取服务器响应时出错: {e}")
                        print(f"响应格式: {result}")
                    
                    # 如果评估器可用，进行评估
                    if evaluator and message_text and server_response:
                        try:
                            evaluation_result = evaluator.evaluate_message_pair(
                                message_text, server_response, 
                                client_timestamp, server_timestamp
                            )
                            
                            if evaluation_result:
                                # 获取当前轮次实际传输的比特数
                                actual_bits_transmitted = current_round_bits.get("bits_encoded", 1.5)
                                
                                # 广播评估结果，包含实际传输的比特数
                                broadcast_to_session(session_id, {
                                    "type": "evaluation_result",
                                    "client_message": message_text,
                                    "server_message": server_response,
                                    "evaluation": evaluation_result,
                                    "bits_transmitted": actual_bits_transmitted,
                                    "timestamp": datetime.now().timestamp()
                                })
                        except Exception as e:
                            print(f"评估消息时出错: {e}")
                    
                    return result
                
                # 替换客户端的send_message方法
                client.send_message = send_message_with_broadcast
                
                # 修改客户端的隐写通信方法，添加比特数回调
                original_start_a2a_stego_chat = client.start_a2a_stego_chat
                
                async def start_a2a_stego_chat_with_callback():
                    # 重写客户端的通信循环，添加比特数跟踪
                    from datetime import datetime
                    import gc
                    import torch
                    from modules.math.math import Math
                    from modules.timestamp.timestamp_mannager import TimestampMannager
                    from modules.stego.stego import encrypt, generate_text
                    
                    logger = client.logger if hasattr(client, 'logger') else None
                    
                    # 初始化客户端模型和HTTP客户端
                    await client.initialize_client()
                    
                    # 加载隐写模型
                    if not client.is_loaded_stego_model:
                        client.load_stego_model()
                    
                    # 确保隐写功能启用
                    if not await client._ensure_stego_enabled():
                        raise Exception("隐写功能启用失败")
                    
                    # 生成加密消息（添加校验码）
                    checkcode, tier = client.checkcode_handler.create_checkcode(client.secret_bits)
                    message_with_checkcode = client.secret_bits + checkcode
                    if logger:
                        logger.info(f"添加{tier}级校验码")
                    total_bits_with_checkcode = len(message_with_checkcode)
                    
                    processed_bits = 0
                    while processed_bits < total_bits_with_checkcode:
                        remaining_bits = total_bits_with_checkcode - processed_bits
                        if logger:
                            logger.info(f"剩余比特位数: {remaining_bits}")
                        
                        # 获取剩余的密文部分
                        remaining_message = message_with_checkcode[processed_bits:]
                        
                        # 创建包头
                        is_final = False
                        tds_value = client.TDS if client.SN == 0 else 0
                        header = client.package_head.create_package_head(tds_value, client.SN, is_final)
                        
                        # 将包头与密文拼接
                        message_with_header = header + remaining_message
                        if logger:
                            logger.info(f"处理第{client.SN+1}个包")
                        
                        prompt = client.LLM_CONFIG["base_prompt"].format(conversation_history=client.chat_history)
                        
                        # 进行隐写编码
                        encrypted_text, bits_encoded, _ = encrypt(
                            model=client.stego_model,
                            tokenizer=client.stego_tokenizer,
                            algorithm=client.stego_algorithm,
                            bit_stream=message_with_header, 
                            prompt_text=prompt
                        )
                        
                        # 更新当前轮次的比特数信息
                        header_length = len(header)
                        actual_message_bits = bits_encoded - header_length if bits_encoded > header_length else 0
                        current_round_bits["bits_encoded"] = actual_message_bits
                        
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()
                        
                        # 生成正常文本用于对比
                        normal_text, _ = generate_text(
                            model=client.stego_model,
                            tokenizer=client.stego_tokenizer, 
                            prompt_text=prompt
                        )
                        
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()
                        
                        # 检查编码结果
                        if actual_message_bits <= 0 and client.SN > 0:
                            if logger:
                                logger.warning(f"第{client.SN+1}个包没有嵌入比特位")
                            break
                            
                        processed_bits += actual_message_bits
                        
                        # 检查是否是最后一个包
                        if processed_bits >= total_bits_with_checkcode:
                            is_final = True
                            header = client.package_head.create_package_head(0, client.SN, is_final)
                            final_message_chunk = message_with_checkcode[processed_bits-actual_message_bits if actual_message_bits > 0 else 0 : total_bits_with_checkcode]
                            message_with_header = header + final_message_chunk
                            encrypted_text, _, _ = encrypt(
                                model=client.stego_model,
                                tokenizer=client.stego_tokenizer,
                                algorithm=client.stego_algorithm,
                                bit_stream=message_with_header, 
                                prompt_text=prompt
                            )
                            if logger:
                                logger.info(f"检测到最后一个包")
                        
                        # 发送消息并检查响应
                        client_sendTimestamp = datetime.now().timestamp()
                        response_dict = await client.send_message(encrypted_text, client_sendTimestamp)
                        
                        # 安全地获取metadata和sendTimestamp
                        result = response_dict.get('result', {})
                        metadata = result.get('metadata', {})
                        server_sendTimestamp = metadata.get('sendTimestamp')
                        
                        if logger:
                            logger.info(f"服务器响应metadata: {metadata}")
                        
                        if 'error' in metadata:
                            if logger:
                                logger.error(f"服务器处理错误: {metadata['error']}")
                            raise Exception(f"服务器处理错误: {metadata['error']}")
                        
                        # 最后一个包的验证逻辑
                        if is_final:
                            hash_condition = lambda x: Math.calculate_sha256_binary(client.stego_key + str(x)).endswith('0')
                            if TimestampMannager.is_valid_timestamp(server_sendTimestamp, hash_condition):
                                if logger:
                                    logger.info("服务端成功解密消息，通信结束。")
                                client.conversation["finalVerification"]["serverAckTimestamp"] = Math.timestamp_to_iso8601(server_sendTimestamp)
                                client.conversation["finalVerification"]["verificationSignal"] = "timestamp_used_by_server_for_ack"
                                client.conversation["finalVerification"]["status"] = "SUCCESS"
                                if logger:
                                    logger.info(f"传输效率: {client.TDS / (client.SN + 1):.2f} 比特/轮")
                                    logger.info(f"轮次开销: {(client.SN + 1) / client.TDS:.4f} 轮/比特")
                            else:
                                if logger:
                                    logger.warning("服务端校验未通过，通信结束。")
                                client.conversation["finalVerification"]["serverAckTimestamp"] = Math.timestamp_to_iso8601(server_sendTimestamp)
                                client.conversation["finalVerification"]["verificationSignal"] = "timestamp_used_by_server_for_ack"
                                client.conversation["finalVerification"]["status"] = "FAIL"
                                if logger:
                                    logger.info(f"传输效率: {client.TDS / (client.SN + 1):.2f} 比特/轮")
                                    logger.info(f"轮次开销: {(client.SN + 1) / client.TDS:.4f} 轮/比特")
                        
                        # 保存单轮次信息
                        round_info = {
                            "roundNumber": client.SN + 1,
                            "clientTurn": {
                                "timestamp": Math.timestamp_to_iso8601(client_sendTimestamp),
                                "publicCarrierMessage": encrypted_text,
                                "normalMessage": normal_text,
                                "covertPacket": {
                                    "header": {
                                        "tds": tds_value,
                                        "sn": client.SN,
                                        "finFlag": is_final,
                                        "checksum_hex": Math.binary_to_hex(header[-4:])
                                    },
                                    "payload_base64": Math.binary_string_to_base64(message_with_header[header_length:bits_encoded])
                                }
                            },
                            "serverTurn": {
                                "timestamp": Math.timestamp_to_iso8601(server_sendTimestamp),
                                "publicResponseMessage": response_dict['result']['parts'][0].get('text', '')
                            }
                        }
                        client.conversation["rounds"].append(round_info)
                        
                        # 保存对话记录
                        import json
                        import os
                        os.makedirs("data/conversation", exist_ok=True)
                        with open(f"data/conversation/conversation_{client.session_id}.json", "w", encoding="utf-8") as f:
                            json.dump(client.conversation, f)
                        
                        client.SN += 1
                    
                    # 发送完成信号
                    broadcast_to_session(session_id, {
                        "type": "system_message",
                        "message": "🎉 隐蔽通信完成！所有数据已成功传输。"
                    })
                
                # 替换客户端的隐写通信方法
                client.start_a2a_stego_chat = start_a2a_stego_chat_with_callback
                
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

@app.get("/evaluation/status")
async def get_evaluation_status():
    """获取评估器状态"""
    global evaluator
    return {
        "available": evaluator is not None,
        "api_configured": os.getenv('AIHUBMIX_API_KEY') is not None
    }

def broadcast_to_session(session_id: str, message: Dict[str, Any]):
    """向指定会话的WebSocket连接广播消息"""
    if session_id in websocket_connections:
        websocket = websocket_connections[session_id]
        try:
            # 由于这个函数可能在不同线程中调用，我们需要安全地发送消息
            import asyncio
            import concurrent.futures
            
            # 获取当前事件循环或创建新的
            try:
                loop = asyncio.get_running_loop()
                # 如果有运行中的循环，使用call_soon_threadsafe
                def send_message():
                    future = asyncio.create_task(websocket.send_json(message))
                    return future
                loop.call_soon_threadsafe(send_message)
            except RuntimeError:
                # 没有运行中的循环，创建新的
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(websocket.send_json(message))
                loop.close()
        except Exception as e:
            print(f"WebSocket发送失败: {e}")
            # 清理失效的连接
            if session_id in websocket_connections:
                del websocket_connections[session_id]

if __name__ == "__main__":
    print("启动A2A客户端API服务器...")
    # 初始化评估器
    init_evaluator()
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8889, 
        log_level="info",
        reload=False
    ) 