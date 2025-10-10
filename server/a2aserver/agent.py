#!/usr/bin/env python3
import gc
from datetime import datetime
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import config
from modules.checkcode.checkcode_mannager import CheckCodeMannager
from openai import AsyncOpenAI
import os
from modules.logging.logging_mannager import LoggingMannager
from a2a.server.agent_execution import RequestContext
from modules.timestamp.timestamp_mannager import TimestampMannager
from modules.math.math import Math
from modules.package_head.package_head_mannager import PackageHead
from modules.stego.stego import decrypt

logger = LoggingMannager.get_logger(__name__)
class ServerAgent:
    """
    使用OpenAI API生成回答
    支持与A2A协议集成
    """
    def __init__(self,stego_model_path,stego_algorithm,stego_key,decrypted_bits_path,session_id) -> None:
        self.stego_model_path = stego_model_path
        self.stego_algorithm = stego_algorithm
        self.stego_key = stego_key
        self.decrypted_bits_path = decrypted_bits_path
        self.session_id = session_id  # 添加session_id属性
        
        self.enable_stego = False
        self.TDS = 0
        self.SN = 0
        self.secret_message = ""
        self.package_head = PackageHead()
        self.checkcode_handler = CheckCodeMannager()
        
        # 模型懒加载
        self.stego_model = None
        self.stego_tokenizer = None
        self.is_loaded_stego_model = False

        # 初始化OpenAI客户端 - 使用最简配置避免proxies问题
        self.openai_client = None
        try:
            # 使用最简配置，避免proxies参数问题
            import os
            os.environ.pop('HTTP_PROXY', None)
            os.environ.pop('HTTPS_PROXY', None)
            os.environ.pop('http_proxy', None)
            os.environ.pop('https_proxy', None)
            
            self.openai_client = AsyncOpenAI(
                api_key=config.AGENT_MODEL_CONFIG["api_key"]
            )
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            # 如果失败，设置为None，后续会使用模拟响应
            self.openai_client = None
        
        # 存储会话历史
        self.conversation_history = {}
        
        logger.info(f"隐写模型路径: {self.stego_model_path}")
        logger.info(f"隐写算法: {self.stego_algorithm}")
        logger.info(f"会话ID: {self.session_id}")  # 添加session_id日志


    async def send_message_to_agent(self, query: str, user_id: str = "default_user") -> str:
        """
        调用OpenAI API处理查询
        
        Args:
            query: 用户问题
            user_id: 用户ID，用于区分不同用户的会话
            
        Returns:
            生成的回答
        """
        
        # 获取或初始化用户会话历史
        if user_id not in self.conversation_history:
            self.conversation_history[user_id] = []
        
        # 添加用户消息到历史记录
        self.conversation_history[user_id].append({
            "role": "user",
            "content": query
        })
        
        try:
            # 调用OpenAI API
            response = await self.openai_client.chat.completions.create(
                model=config.AGENT_MODEL_CONFIG["model"],
                messages=[
                    {"role": "system", "content": "answer the question simply and directly"},
                    *self.conversation_history[user_id]
                ]
            )
            
            assistant_response = response.choices[0].message.content
            
            # 添加回复到历史记录
            self.conversation_history[user_id].append({
                "role": "assistant", 
                "content": assistant_response
            })
            
            return assistant_response
            
        except Exception as e:
            logger.error(f"OpenAI API调用错误: {e}")
            return "抱歉，处理您的请求时出现了错误。"

    async def response_client_message(self, context: RequestContext, user_id: str = "default_user"):
        """
        处理客户端发送的消息
        Args:
            context: 请求上下文
            user_id: 用户ID
        Returns:
            大模型的回复,时间戳（当校验通过的时候）
        """
        if(not self.is_loaded_stego_model):
            self.load_stego_model()
        user_input = context.get_user_input()
        if(not self.enable_stego):
            if(TimestampMannager.is_valid_timestamp(context.message.metadata.get('sendTimestamp'),lambda x:Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('0'))):
                self.enable_stego = True
                self.SN = 0
                logger.info("隐写开启成功")
                answer = await self.send_message_to_agent(user_input, user_id=user_id)
                return answer,None
            else:
                logger.info("隐写开启失败")
                raise
        
        logger.info("隐写已开启，开始解密消息")
              
        chat_history = await self.get_chat_history(user_id)
        base_prompt = config.LLM_CONFIG["base_prompt"]
        decrypted_bits, _, _ = decrypt(self.stego_model,self.stego_tokenizer,self.stego_algorithm,user_input, base_prompt.format(conversation_history=chat_history))
        answer = await self.send_message_to_agent(user_input, user_id=user_id)      
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()
        
        logger.info(f"解密后的比特流: {decrypted_bits}")
        # 处理包头和数据包重组
        is_final = False
        if(self.SN == 0):
            head_lenth = 23
            self.TDS = int(decrypted_bits[:12], 2)            
            SN = int(decrypted_bits[12:18], 2)
            logger.info(f"期望SN: {self.SN}, 实际SN: {SN}")
            if SN != 0:
                logger.warning(f"第一个数据包的SN不为0，重置状态")
                # 重置状态并继续处理
                self.SN = SN
        else:
            head_lenth = 11
            SN = int(decrypted_bits[:6], 2)
            logger.info(f"期望SN: {self.SN}, 实际SN: {SN}")
            if SN != self.SN:
                logger.warning(f"数据包SN不匹配，期望: {self.SN}, 实际: {SN}")
                # 更新当前SN为实际接收到的SN
                self.SN = SN
        
        logger.info(f"head_lenth:{head_lenth}")
        head_bits = decrypted_bits[:head_lenth]
        
        is_final = bool(int(head_bits[-5:-4], 2))
        head_checkcode_receive = head_bits[-4:]
        # 除掉后四位计算
        head_checkcode_calculate = Math.calculate_crc4_binary(head_bits[:head_lenth-4])
        logger.info(f"head_checkcode_receive: {head_checkcode_receive}")
        logger.info(f"head_checkcode_calculate: {head_checkcode_calculate}")
        
        if head_checkcode_receive != head_checkcode_calculate:
            logger.error(f"头部校验码不匹配: 接收={head_checkcode_receive}, 计算={head_checkcode_calculate}")
            # 返回错误时间戳而不是崩溃
            timestamp = TimestampMannager.get_valid_timestamp(lambda x: Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('1'))
            logger.warning(f"校验失败,返回错误时间戳: {timestamp}")
            return timestamp if timestamp is not None else datetime.now().timestamp()
        self.SN += 1
        self.secret_message += decrypted_bits[head_lenth:]
        # 只有当接收到最后一个包（F=1）时才进行校验码验证
        timestamp = datetime.now().timestamp()
        if is_final:
            # 验证校验码
            checkcode_length = self.checkcode_handler.get_checkcode_length_from_tier(self.checkcode_handler.get_checkcode_tier_from_length(self.TDS))
            if len(self.secret_message) >= self.TDS + checkcode_length:
                # 分离密文和校验码
                received_message = self.secret_message[:self.TDS]
                received_checksum = self.secret_message[self.TDS:self.TDS + checkcode_length]
                is_pass,_ =self.checkcode_handler.verify_checkcode(received_message, received_checksum)
                if(is_pass):
                    logger.info("校验通过,返回特定时间戳")
                    timestamp = TimestampMannager.get_valid_timestamp(lambda x: Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('0'))
                    logger.info(f"寻找时间戳成功: {timestamp}") if timestamp is not None else logger.error("寻找时间戳失败")
                else:
                    logger.warning("校验未通过,返回特定时间戳")
                    timestamp = TimestampMannager.get_valid_timestamp(lambda x: Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('1'))
                    logger.info(f"寻找时间戳成功: {timestamp}") if timestamp is not None else logger.error("寻找时间戳失败")
            else:
                logger.warning(f"Message too short for checksum verification. Length: {len(self.secret_message)}, Expected: {self.TDS + checkcode_length}")
                logger.warning("校验未通过,返回特定时间戳")
                timestamp = TimestampMannager.get_valid_timestamp(lambda x: Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('1'))
                logger.info(f"寻找时间戳成功: {timestamp}") if timestamp is not None else logger.error("寻找时间戳失败")
            self.secret_message = self.secret_message[:self.TDS]
            with open(self.decrypted_bits_path, 'w') as f:
                f.write(self.secret_message)
            logger.info(f"本轮对话结束")
            await self.clear_all_user_data(user_id)
            self.enable_stego = False
            self.TDS = 0
            self.SN = 0
            self.secret_message = ""
        return answer,timestamp
            
    async def get_chat_history(self, user_id: str) -> str:
        """
        获取用户会话中的所有聊天记录并格式化为可读字符串
        
        Args:
            user_id: 用户ID
            
        Returns:
            格式化后的聊天记录字符串
        """
        try:
            # 从内存中的会话历史获取聊天记录
            if user_id not in self.conversation_history or not self.conversation_history[user_id]:
                return "暂无聊天记录"
            
            # 格式化聊天记录
            formatted_lines = []
            for message in self.conversation_history[user_id]:
                role = message["role"]
                content = message["content"].strip()
                
                if role == 'user':
                    formatted_lines.append(f"User: {content}")
                elif role == 'assistant':
                    formatted_lines.append(f"Expert: {content}")
                else:
                    formatted_lines.append(f"{role}: {content}")
            
            # 转换成字符串
            formatted_lines_str = ""
            for line in formatted_lines:
                formatted_lines_str += line + "\n"
            return formatted_lines_str
            
        except Exception as e:
            logger.error(f"Error getting formatted chat history for user {user_id}: {e}")
            return "获取聊天记录时发生错误"


    def load_stego_model(self):
        self.stego_model = AutoModelForCausalLM.from_pretrained(self.stego_model_path).half().cuda()
        self.stego_tokenizer = AutoTokenizer.from_pretrained(self.stego_model_path)
        if self.stego_tokenizer.pad_token is None:
            self.stego_tokenizer.pad_token = self.stego_tokenizer.eos_token
        self.is_loaded_stego_model = True
    
    async def clear_all_user_data(self, user_id: str) -> bool:
        """
        删除指定用户的数据

        Args:
            user_id: 用户ID
            
        Returns:
            bool: 删除是否成功
        """
        try:
            # 清空用户的会话历史
            if user_id in self.conversation_history:
                del self.conversation_history[user_id]
            return True
            
        except Exception as e:
            logger.error(f"删除用户 {user_id} 数据时发生错误: {e}")
            return False