import sys
import os
import argparse
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from dotenv import load_dotenv
from urllib.parse import urlparse
from A2A_Covert.a2a.server.apps import A2AStarletteApplication
from A2A_Covert.a2a.server.request_handlers import DefaultRequestHandler
from A2A_Covert.a2a.server.tasks import InMemoryTaskStore
from A2A_Covert.a2a.types import AgentCapabilities,AgentCard,AgentSkill
from A2A_Covert.server.a2aserver.agent_executor import ServerAgentExecutor
from A2A_Covert.modules.logging.logging_mannager import LoggingMannager

LoggingMannager.configure_global()
logger = LoggingMannager.get_logger(__name__)
load_dotenv()

def prase_args():
    parser = argparse.ArgumentParser(description='AgentStego 服务器 (带文件上传功能)')

    parser.add_argument('--stego_model_path','-smp',
    choices=['/root/autodl-tmp/Llama-3.2-3B-Instruct','/root/autodl-tmp/Qwen2-7B-Instruct'],
    default='/root/autodl-tmp/Llama-3.2-3B-Instruct',
    help='选择不同隐写模型路径')

    parser.add_argument('--stego_algorithm','-sa',
    choices=['discop','discop_base','ac','differential_based','binary_based','stability_based','meteor'],
    default='meteor',
    help='选择不同隐写算法')

    parser.add_argument('--stego_key','-sk',
    default='7b9ec09254aa4a7589e4d0cfd80d46cc',
    help='选择隐写密钥')

    parser.add_argument('--decrypted_bits_path','-dbp',
    default='data/stego/decrypted_bits.txt',
    help='选择隐写解密路径')

    parser.add_argument('--session_id','-sid',
    default='covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126',
    help='选择会话ID')

    parser.add_argument('--server_url','-su',
    default='http://0.0.0.0:9999',
    help='选择服务器地址')

    return parser.parse_args()

# 创建FastAPI应用
app = FastAPI(title="A2A Steganography Server", version="1.0.0")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量存储A2A服务器实例
a2a_server = None
a2a_app = None

@app.on_event("startup")
async def startup_event():
    """启动时初始化A2A服务器"""
    global a2a_server, a2a_app
    logger.info("正在初始化A2A服务器...")
    
    # 这里可以添加A2A服务器的初始化逻辑
    # 由于a2a模块缺失，暂时跳过A2A服务器初始化
    logger.warning("A2A模块缺失，跳过A2A服务器初始化")

@app.post("/upload/question")
async def upload_question_file(file: UploadFile = File(...)):
    """上传问题文件"""
    try:
        # 确保目录存在
        question_dir = Path("data/question")
        question_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存文件
        file_path = question_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"问题文件已上传: {file_path}")
        return JSONResponse({
            "message": "问题文件上传成功",
            "filename": file.filename,
            "path": str(file_path),
            "size": file_path.stat().st_size
        })
    except Exception as e:
        logger.error(f"上传问题文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@app.post("/upload/secret")
async def upload_secret_file(file: UploadFile = File(...)):
    """上传隐蔽信息文件"""
    try:
        # 确保目录存在
        stego_dir = Path("data/stego")
        stego_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存文件
        file_path = stego_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"隐蔽信息文件已上传: {file_path}")
        return JSONResponse({
            "message": "隐蔽信息文件上传成功",
            "filename": file.filename,
            "path": str(file_path),
            "size": file_path.stat().st_size
        })
    except Exception as e:
        logger.error(f"上传隐蔽信息文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")

@app.post("/save_secret")
async def save_secret_bits(data: dict):
    """保存隐蔽信息比特流"""
    try:
        session_id = data.get("session_id")
        secret_bits = data.get("secret_bits")
        
        if not session_id or not secret_bits:
            raise HTTPException(status_code=400, detail="缺少必要参数")
        
        # 确保目录存在
        stego_dir = Path("data/stego")
        stego_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存到文件
        file_path = stego_dir / f"secret_bits_{session_id}.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(secret_bits)
        
        logger.info(f"隐蔽信息已保存: {file_path}")
        return JSONResponse({
            "message": "隐蔽信息保存成功",
            "path": str(file_path),
            "size": len(secret_bits)
        })
    except Exception as e:
        logger.error(f"保存隐蔽信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

@app.post("/start")
async def start_communication(data: dict):
    """启动隐蔽通信"""
    try:
        logger.info("收到启动隐蔽通信请求")
        logger.info(f"参数: {data}")
        
        # 这里应该启动A2A客户端
        # 由于a2a模块缺失，暂时返回模拟响应
        return JSONResponse({
            "message": "隐蔽通信启动成功",
            "status": "running",
            "session_id": data.get("session_id"),
            "note": "A2A模块缺失，这是模拟响应"
        })
    except Exception as e:
        logger.error(f"启动隐蔽通信失败: {e}")
        raise HTTPException(status_code=500, detail=f"启动失败: {str(e)}")

@app.post("/stop")
async def stop_communication():
    """停止隐蔽通信"""
    try:
        logger.info("收到停止隐蔽通信请求")
        
        # 这里应该停止A2A客户端
        # 由于a2a模块缺失，暂时返回模拟响应
        return JSONResponse({
            "message": "隐蔽通信已停止",
            "status": "stopped"
        })
    except Exception as e:
        logger.error(f"停止隐蔽通信失败: {e}")
        raise HTTPException(status_code=500, detail=f"停止失败: {str(e)}")

@app.get("/status")
async def get_status():
    """获取服务器状态"""
    try:
        return JSONResponse({
            "status": "online",
            "a2a_server": "unavailable (missing a2a module)",
            "file_upload": "available",
            "message": "文件上传功能可用，A2A通信功能需要安装a2a模块"
        })
    except Exception as e:
        logger.error(f"获取状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取状态失败: {str(e)}")

@app.get("/")
async def root():
    """根路径"""
    return JSONResponse({
        "message": "A2A Steganography Server",
        "version": "1.0.0",
        "endpoints": {
            "upload_question": "POST /upload/question",
            "upload_secret": "POST /upload/secret", 
            "save_secret": "POST /save_secret",
            "start": "POST /start",
            "stop": "POST /stop",
            "status": "GET /status"
        }
    })

if __name__ == "__main__":
    args = prase_args()
    
    # 确保必要的目录存在
    Path("data/question").mkdir(parents=True, exist_ok=True)
    Path("data/stego").mkdir(parents=True, exist_ok=True)
    Path("data/conversation").mkdir(parents=True, exist_ok=True)
    
    parsed_url = urlparse(args.server_url)
    host = parsed_url.hostname
    port = parsed_url.port
    
    logger.info(f"启动服务器: {host}:{port}")
    logger.info("可用的API端点:")
    logger.info("  POST /upload/question - 上传问题文件")
    logger.info("  POST /upload/secret - 上传隐蔽信息文件")
    logger.info("  POST /save_secret - 保存隐蔽信息比特流")
    logger.info("  POST /start - 启动隐蔽通信")
    logger.info("  POST /stop - 停止隐蔽通信")
    logger.info("  GET /status - 获取服务器状态")
    
    uvicorn.run(app, host=host, port=port, log_level="info")
