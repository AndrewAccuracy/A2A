import sys
import os
import argparse
import uvicorn
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
from urllib.parse import urlparse
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities,AgentCard,AgentSkill
from a2aserver.agent_executor import ServerAgentExecutor
from modules.logging.logging_mannager import LoggingMannager

LoggingMannager.configure_global()
logger = LoggingMannager.get_logger(__name__)
load_dotenv()

def prase_args():
    parser = argparse.ArgumentParser(description='AgentStego 服务器')

    parser.add_argument('--stego_model_path','-smp',
    choices=['/root/autodl-fs/Llama-3.2-3B-Instruct','/root/autodl-fs/Qwen2-7B-Instruct','/root/autodl-fs/Qwen2.5-7B-Instruct'],
    default='/root/autodl-fs/Llama-3.2-3B-Instruct',
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
    
if __name__ == "__main__":
    args = prase_args()

    """
    启动Agent服务器的main函数,该服务器定义了一个Agent，这个Agent使用Gemini模型回答问题
    """
    skill = AgentSkill(
        id='QA_Gemini Agent',
        name='QA_Gemini Agent',
        description='a Gemini Agent that can answer questions',
        tags=['QA']
    )
    
    # 创建Agent Card，定义代理的元数据
    public_agent_card = AgentCard(
        name='QA_Gemini Agent',
        description='Answers questions using Gemini.',
        url=args.server_url,
        version='1.0.0',
        defaultInputModes=['text'],
        defaultOutputModes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill]
    )
    request_handler = DefaultRequestHandler(
        agent_executor=ServerAgentExecutor(args.stego_model_path,args.stego_algorithm,args.stego_key,args.decrypted_bits_path,args.session_id),
        task_store=InMemoryTaskStore(),
    )
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler
    )
    parsed_url = urlparse(args.server_url)
    host = parsed_url.hostname
    port = parsed_url.port
    uvicorn.run(server.build(), host=host, port=port, log_level="warning")
    
