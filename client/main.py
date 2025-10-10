import sys
import os
import argparse
import asyncio
from dotenv import load_dotenv
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from a2aclient.client import Client
from modules.logging.logging_mannager import LoggingMannager


LoggingMannager.configure_global()
logger = LoggingMannager.get_logger(__name__)
load_dotenv()

def prase_args():
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='AgentStego 客户端')

    parser.add_argument('--stego_model_path','-smp',
    choices=['/root/autodl-tmp/Llama-3.2-3B-Instruct','/root/autodl-tmp/Qwen2-7B-Instruct'],
    default='/root/autodl-tmp/Llama-3.2-3B-Instruct',
    help='选择不同隐写模型路径')

    parser.add_argument('--stego_algorithm','-sa',
    choices=['discop','discop_base','ac','differential_based','binary_based','stability_based','meteor'],
    default='meteor',
    help='选择不同隐写算法')

    parser.add_argument('--question_path','-qp',
    default='data/question/general.txt',
    help='选择握手提示词路径')

    parser.add_argument('--question_index','-qi',
    type=int,default=0,help='选择握手提示词编号')

    parser.add_argument('--stego_key','-sk',
    default='7b9ec09254aa4a7589e4d0cfd80d46cc',
    help='选择隐写密钥')

    parser.add_argument('--session_id','-sid',
    default='covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126',
    help='选择会话ID')

    parser.add_argument('--secret_bit_path','-sbp',
    default='data/stego/secret_bits_512.txt',
    help='选择隐写密文路径')

    parser.add_argument('--server_url','-su',
    default='http://localhost:9999',
    help='选择服务器地址')

    return parser.parse_args()
        

async def main():
    args = prase_args()
    client = Client(args.stego_model_path,
                    args.stego_algorithm,
                    args.question_path,
                    args.question_index,
                    args.stego_key,
                    args.secret_bit_path,
                    args.server_url,
                    args.session_id)
    await client.start_a2a_stego_chat()
    #await client.start_baseline_stego_chat()

if __name__ == '__main__':
    asyncio.run(main())
    

    
    
