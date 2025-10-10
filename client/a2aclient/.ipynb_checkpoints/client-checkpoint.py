import httpx
import config
from modules.logging.logging_mannager import LoggingMannager
from typing import Any
from uuid import uuid4
from a2a.client import A2ACardResolver, A2AClient
from a2a.types import MessageSendParams,SendMessageRequest
from modules.stego.stego import Stego
from modules.hash.hash_functions import HashFunctions
from modules.timestamp.timestamp_mannager import TimestampMannager
from modules.package_head.package_head_mannager import PackageHead
from modules.checkcode.checkcode_mannager import CheckCodeMannager
from modules.evaluation.evaluation import Evaluation
logger = LoggingMannager.get_logger(__name__)

class Client:
    def __init__(self, server_url: str):
        self.server_url = server_url
        self.httpx_client = None
        self.a2a_client = None
        self.chat_history = ""
        self.enable_stego = False
        self.stego_model=Stego()
        self.SN = 0
        self.package_head = PackageHead()
        self.checkcode_handler = CheckCodeMannager()
        self.evaluation = Evaluation(config.EVALUATION_MODEL_CONFIG["model_name_or_path"],device="cuda")
        
    async def initialize(self):
        """异步初始化客户端"""
        # 增加超时时间到120秒，避免AI模型响应慢导致超时 
        self.httpx_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0))
        resolver = A2ACardResolver(
            httpx_client=self.httpx_client,
            base_url=self.server_url,
        )
        try:
            _public_card = await resolver.get_agent_card()
            self.a2a_client = A2AClient(
                httpx_client=self.httpx_client, agent_card=_public_card
            )
            logger.info('成功使用AgentCard初始化A2A客户端')
        except Exception as e:
            logger.error(
                f'初始化A2A客户端失败: {e}', exc_info=True
            )
            raise

    async def send_message(self, message_text: str,send_timestamp:float) -> dict[str, Any]:
        """
        发送消息,并且自动添加到聊天记录中
        Args:
            message_text: 消息内容
            send_timestamp: 发送时间戳
        Returns:
            dict[str, Any]: 返回的响应字典
        """
        if not self.a2a_client:
            raise RuntimeError("客户端未初始化. 请先调用initialize()")
        send_message_payload: dict[str, Any] = {
            'message': {
                'role': 'user',
                'parts': [
                    {'kind': 'text', 'text': message_text}
                ],
                'messageId': uuid4().hex,
                'metadata': {
                    'sendTimestamp': send_timestamp  # 将发送时间戳放入metadata中
                },
            },
        }
        request = SendMessageRequest(
            id=str(uuid4()), params=MessageSendParams(**send_message_payload)
        )
        # 添加用户消息到聊天记录
        self.chat_history += f"User: {message_text}\n"
        response = await self.a2a_client.send_message(request)
        # 根据正确格式提取助手的实际回复内容
        assistant_content = ""
        response_dict = response.model_dump(mode='json', exclude_none=True)
        assistant_content = response_dict['result']['parts'][0]['text']
        # 添加助手回复到聊天记录，格式与服务端一致
        self.chat_history += f"Expert: {assistant_content.strip()}\n"
        
        return response_dict

    async def close(self):
        """关闭客户端连接"""
        if self.httpx_client:
            await self.httpx_client.aclose()
    
    async def start_stego_chat(self,secret_message:str,stego_model_base_prompt:str,stego_key:str,base_question:str):
        """
        开始隐写通信
        Args:
            base_prompt: 基础提示词
        """
        # 如果隐写没有开启，则尝试开启隐写，相当于握手
        if(not self.enable_stego):
            logger.info("隐写未开启, 尝试开启隐写")
            timestamp = TimestampMannager.get_valid_timestamp(lambda x:HashFunctions.calculate_sha256_binary(stego_key+str(x)).endswith('0'))
            if timestamp:
                logger.info(f"隐写开启成功,时间戳: {timestamp}")
                self.SN = 0
                await self.send_message(base_question,timestamp)
            else:
                logger.error("隐写开启失败")
                return
        logger.info("开始加密消息")
        # 增加检验码
        checkcode, tier = self.checkcode_handler.create_checkcode(secret_message)

        message_with_checkcode = secret_message + checkcode
        logger.info(f"添加{tier}级校验码")
        # TDS记录原始密文长度（不包括校验码）
        total_bits = len(secret_message)
        # 实际处理的总长度（包括校验码）
        actual_total_bits = len(message_with_checkcode)
        processed_bits = 0
        
        while processed_bits < actual_total_bits:
            remaining_bits = actual_total_bits - processed_bits
            logger.info(f"剩余比特位数: {remaining_bits}")
            # 获取剩余的密文部分（包括校验码）
            remaining_message = message_with_checkcode[processed_bits:]
            # 创建包头
            is_final = False
            header = ""
            
            if self.SN == 0:
                # 第一个包，使用TDS+SN+F格式
                header = self.package_head.create_package_head(total_bits, self.SN, is_final)
            else:
                # 后续包，使用SN+F格式
                header = self.package_head.create_package_head(0, self.SN, is_final)

            # 将包头与密文拼接
            message_with_header = header + remaining_message
            logger.info(f"处理第{self.SN}个包")
            # 加密拼接后的消息
            encrypted_text, bits_encoded, token_sequence = self.stego_model.encrypt(
                bit_stream=message_with_header, 
                prompt_text=stego_model_base_prompt.format(conversation_history=self.chat_history)
            )
            
            # 计算实际编码的密文位数（减去包头长度）
            header_length = len(header)
            if bits_encoded > header_length:
                actual_message_bits = bits_encoded - header_length
            else:
                actual_message_bits = 0
            
            logger.info(f"隐写后的文本: {encrypted_text}")
            logger.info(f"有效嵌入比特位数: {actual_message_bits},总嵌入比特位数: {bits_encoded}")
            logger.info(f"文本困惑度: {self.evaluation.calculate_ppl(encrypted_text)}")
            logger.info(f"文本语义熵: {self.evaluation.calculate_semantic_entropy(encrypted_text)}")
            logger.info(f"文本ROUGE-1: {self.evaluation.calculate_rouge1(secret_message,encrypted_text)}")
            logger.info(f"文本BLEU: {self.evaluation.calculate_bleu(secret_message,encrypted_text)}")

            if actual_message_bits <= 0:
                logger.warning("没有嵌入比特位, 结束")
                break
                
            processed_bits += actual_message_bits
            
            # 检查是否是最后一个包
            if processed_bits >= actual_total_bits:
                is_final = True
                # 重新生成最后一个包的包头
                header = self.package_head.create_package_head(0, self.SN, is_final)
                message_with_header = header + message_with_checkcode[processed_bits-actual_message_bits:processed_bits]
                encrypted_text, _, _ = self.stego_model.encrypt(
                    bit_stream=message_with_header, 
                    prompt_text=stego_model_base_prompt.format(conversation_history=self.chat_history)
                )
                logger.info(f" (F=1): {header}")
            
            # 把加密后的文本发送给服务器
            self.SN += 1
            response = await self.send_message(encrypted_text, timestamp)
            sendTimestamp=response['result']['metadata']['sendTimestamp']
            if(sendTimestamp is not None and TimestampMannager.is_valid_timestamp(sendTimestamp,lambda x:HashFunctions.calculate_sha256_binary(stego_key+str(x)).endswith('0'))):
                logger.info(f"服务端成功解密消息")
                logger.info(f"每轮交互可嵌入的平均比特数{total_bits/self.SN}")
                logger.info(f"传输单位有效比特信息所需的交互轮次{self.SN/total_bits}")
                return
            elif(sendTimestamp is not None and TimestampMannager.is_valid_timestamp(sendTimestamp,lambda x:HashFunctions.calculate_sha256_binary(stego_key+str(x)).endswith('1'))):
                logger.warning("服务端校验未通过")
                return
            
            
