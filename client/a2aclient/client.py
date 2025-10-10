from datetime import datetime
import gc
import os
import httpx
import torch
import config
from modules.logging.logging_mannager import LoggingMannager
from typing import Any
from uuid import uuid4
import json
from a2a.client import A2ACardResolver, A2AClient
from a2a.types import MessageSendParams,SendMessageRequest
from modules.math.math import Math
from modules.timestamp.timestamp_mannager import TimestampMannager
from modules.package_head.package_head_mannager import PackageHead
from modules.checkcode.checkcode_mannager import CheckCodeMannager
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel
from modules.stego.stego import encrypt,generate_text
logger = LoggingMannager.get_logger(__name__)

class Client:
    def __init__(self, stego_model_path:str,stego_algorithm:str,question_path:str,question_index:int,stego_key:str,secret_bit_path:str,server_url:str,session_id:str):
        
        os.environ["CUDA_VISIBLE_DEVICES"] = '0'
        self.stego_model_path = stego_model_path
        self.stego_algorithm = stego_algorithm
        self.question_path = question_path
        self.question_index = question_index
        self.question = open(question_path,'r',encoding='utf-8').read().splitlines()[question_index]
        self.stego_key = stego_key
        self.secret_bits = open(secret_bit_path,'r',encoding='utf-8').read()
        self.TDS = len(self.secret_bits)
        self.LLM_CONFIG = config.LLM_CONFIG

        # 一些控制参数
        self.chat_history = ""
        self.enable_stego = False
        self.SN = 0
        self.package_head = PackageHead()
        self.checkcode_handler = CheckCodeMannager()

        # 保存服务器URL，延迟初始化客户端
        self.server_url = server_url
        self.httpx_client = None
        self.a2a_client = None

        # 需要保存的信息
        self.session_id = session_id
        self.conversation={
            "session_id":self.session_id,
            "sessionInfo":{
                "topic": question_path,
                "questionIndex":question_index,
                "steganographyAlgorithm":stego_algorithm,
                "clientModel":stego_model_path,
                "serverResponderModel":None,
                "keyId":stego_key,
                "initiationRule":"hash(key+ts) ends with '0'"
            },
            "secretMessage":{
                "originalData_base64":Math.binary_string_to_base64(self.secret_bits),
                "totalSizeBytes":len(self.secret_bits),
                "integrityHash_sha256":Math.binary_to_hex(Math.calculate_sha256_binary(self.secret_bits))
            },
            "rounds":[],
            "finalVerification":{
                "serverAckTimestamp":None,
                "verificationSignal":None,
                "status":None
            }
        }

        # 懒加载隐写模型,握手成功后加载
        self.is_loaded_stego_model = False
        self.stego_model = None
        self.stego_tokenizer = None

        logger.info(f"模型路径: {self.stego_model_path}")
        logger.info(f"隐写算法: {self.stego_algorithm}")
        logger.info(f"会话ID: {self.session_id}")


    async def initialize_client(self):
        """初始化A2A客户端"""
        try:
            self.httpx_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0), trust_env=False)
            resolver = A2ACardResolver(
                httpx_client=self.httpx_client,
                base_url=self.server_url,
            )
            # 获取Agent身份
            public_card = await resolver.get_agent_card()
            self.a2a_client = A2AClient(
                httpx_client=self.httpx_client, agent_card=public_card
            )
            self.conversation["sessionInfo"]["serverResponderModel"] = public_card.name
            logger.info(f"成功初始化A2A客户端")
            
        except Exception as e:
            logger.error(f"初始化A2A客户端失败: {e}")
            raise

    def load_stego_model(self):
        # 默认采用half精读加载
        self.stego_model = AutoModelForCausalLM.from_pretrained(self.stego_model_path).half().cuda()
        self.stego_tokenizer = AutoTokenizer.from_pretrained(self.stego_model_path)
        self.stego_model.eval()
        if self.stego_tokenizer.pad_token is None:
            self.stego_tokenizer.pad_token = self.stego_tokenizer.eos_token
        self.is_loaded_stego_model = True
        
    async def send_message(self, message_text: str, send_timestamp: float) -> dict[str, Any]:
        """
        发送消息,并且自动添加到聊天记录中
        Args:
            message_text: 消息内容
            send_timestamp: 发送时间戳
        Returns:
            dict[str, Any]: 返回的响应字典
        """
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
        # 添加用户消息到聊天记录
        self.chat_history += f"User: {message_text}\n"
        # 发送信息
        response = await self.a2a_client.send_message(SendMessageRequest(
            id=str(uuid4()), params=MessageSendParams(**send_message_payload)
        ))
        response_dict = response.model_dump(mode='json', exclude_none=True)
        
        # 检查响应是否包含错误
        if 'error' in response_dict:
            logger.error(f"服务器返回错误: {response_dict['error']}")
            # 如果是JSON-RPC错误，尝试返回一个默认响应以继续流程
            if response_dict['error'].get('code') == -32603:
                logger.warning("服务器内部错误，使用默认响应继续")
                response_dict = {
                    'result': {
                        'parts': [{'text': 'Hello, how can I help you today?'}]
                    }
                }
        
        # 根据正确格式提取助手的实际回复内容
        try:
            assistant_content = response_dict['result']['parts'][0].get('text', '')
            self.chat_history += f"Expert: {assistant_content.strip()}\n"
        except KeyError as e:
            logger.error(f"从服务器收到未知格式的响应: {response_dict}")
            logger.error(f"缺少字段: {e}")
            # 提供一个默认响应
            assistant_content = "Sorry, I encountered an error processing your request."
            self.chat_history += f"Expert: {assistant_content}\n"
            response_dict = {
                'result': {
                    'parts': [{'text': assistant_content}]
                }
            }
        return response_dict

    async def start_a2a_stego_chat(self):
        """
        开始隐写通信
        """
        # 初始化客户端（如果还未初始化）
        if self.a2a_client is None:
            await self.initialize_client()
            
        if(not self.is_loaded_stego_model):
            self.load_stego_model()
        if not await self._ensure_stego_enabled():
            return
        # 增加检验码
        checkcode, tier = self.checkcode_handler.create_checkcode(self.secret_bits)
        message_with_checkcode = self.secret_bits + checkcode
        logger.info(f"添加{tier}级校验码")
        # 实际处理的总长度（包括校验码）
        total_bits_with_checkcode = len(message_with_checkcode)
        processed_bits = 0
        while processed_bits < total_bits_with_checkcode:
            remaining_bits = total_bits_with_checkcode - processed_bits
            logger.info(f"剩余比特位数: {remaining_bits}")
            # 获取剩余的密文部分（包括校验码）
            remaining_message = message_with_checkcode[processed_bits:]
            # 创建包头
            is_final = False
            tds_value = self.TDS if self.SN == 0 else 0
            header = self.package_head.create_package_head(tds_value, self.SN, is_final)
            # 将包头与密文拼接
            message_with_header = header + remaining_message
            logger.info(f"处理第{self.SN+1}个包")
            prompt = self.LLM_CONFIG["base_prompt"].format(conversation_history=self.chat_history)
            encrypted_text, bits_encoded, _ = encrypt(
                model=self.stego_model,
                tokenizer=self.stego_tokenizer,
                algorithm=self.stego_algorithm,
                bit_stream=message_with_header, 
                prompt_text=prompt
            )
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            normal_text,_ = generate_text(
                model=self.stego_model,
                tokenizer=self.stego_tokenizer, 
                prompt_text=prompt
            )
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()

            # 计算实际编码的密文位数（减去包头长度）
            header_length = len(header)
            actual_message_bits = bits_encoded - header_length if bits_encoded > header_length else 0
            if actual_message_bits <= 0 and self.SN > 0:
                logger.warning(f"第{self.SN+1}个包没有嵌入比特位")
                break
            processed_bits += actual_message_bits
            # 检查是否是最后一个包
            if processed_bits >= total_bits_with_checkcode:
                is_final = True
                header = self.package_head.create_package_head(0, self.SN, is_final)
                final_message_chunk = message_with_checkcode[processed_bits-actual_message_bits if actual_message_bits > 0 else 0 : total_bits_with_checkcode]
                message_with_header = header + final_message_chunk
                encrypted_text, _, _ = encrypt(
                    model=self.stego_model,
                    tokenizer=self.stego_tokenizer,
                    algorithm=self.stego_algorithm,
                    bit_stream=message_with_header, 
                    prompt_text=prompt
                )
                logger.info(f"检测到最后一个包")
            # 发送消息并检查响应
            client_sendTimestamp = datetime.now().timestamp()
            response_dict = await self.send_message(encrypted_text, client_sendTimestamp)
            
            # 安全地获取metadata和sendTimestamp
            result = response_dict.get('result', {})
            metadata = result.get('metadata', {})
            server_sendTimestamp = metadata.get('sendTimestamp')
            
            logger.info(f"服务器响应metadata: {metadata}")
            if 'error' in metadata:
                logger.error(f"服务器处理错误: {metadata['error']}")
                raise Exception(f"服务器处理错误: {metadata['error']}")
            if(is_final):
                hash_condition = lambda x:Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('0')
                if(TimestampMannager.is_valid_timestamp(server_sendTimestamp,hash_condition)):
                    logger.info("服务端成功解密消息，通信结束。")
                    self.conversation["finalVerification"]["serverAckTimestamp"] = Math.timestamp_to_iso8601(server_sendTimestamp)
                    self.conversation["finalVerification"]["verificationSignal"] = "timestamp_used_by_server_for_ack"
                    self.conversation["finalVerification"]["status"] = "SUCCESS"
                    logger.info(f"传输效率: {self.TDS / self.SN:.2f} 比特/轮")
                    logger.info(f"轮次开销: {self.SN / self.TDS:.4f} 轮/比特")
                else:
                    logger.warning("服务端校验未通过，通信结束。")
                    self.conversation["finalVerification"]["serverAckTimestamp"] = Math.timestamp_to_iso8601(server_sendTimestamp)
                    self.conversation["finalVerification"]["verificationSignal"] = "timestamp_used_by_server_for_ack"
                    self.conversation["finalVerification"]["status"] = "FAIL"
                    logger.info(f"传输效率: {self.TDS / self.SN:.2f} 比特/轮")
                    logger.info(f"轮次开销: {self.SN / self.TDS:.4f} 轮/比特")
            # 需要保存的单轮次信息
            round={
                "roundNumber":self.SN+1,
                "clientTurn": {
                    "timestamp":Math.timestamp_to_iso8601(client_sendTimestamp),
                    "publicCarrierMessage":encrypted_text,
                    "normalMessage":normal_text,
                    "covertPacket":{
                    "header":{
                        "tds":tds_value,
                        "sn":self.SN,
                        "finFlag":is_final,
                        "checksum_hex":Math.binary_to_hex(header[-4:])
                        },
                    "payload_base64":Math.binary_string_to_base64(message_with_header[header_length:bits_encoded])
                    }
                },
                "serverTurn":{
                    "timestamp":Math.timestamp_to_iso8601(server_sendTimestamp),
                    "publicResponseMessage":response_dict['result']['parts'][0].get('text', '')
                }
            }
            self.conversation["rounds"].append(round)
            with open(f"data/conversation/conversation_{self.session_id}.json","w",encoding="utf-8") as f:
                json.dump(self.conversation,f)
            self.SN += 1
    async def start_baseline_stego_chat(self):
        """
        测试baseline的隐写通信
        """
        # 初始化客户端（如果还未初始化）
        if self.a2a_client is None:
            await self.initialize_client()
        if(not self.is_loaded_stego_model):
            self.load_stego_model()
        if not await self._ensure_stego_enabled():
            return
        prompt = self.LLM_CONFIG["base_prompt"].format(conversation_history=self.chat_history)
        encrypted_text, bits_encoded, _ = encrypt(
                model=self.stego_model,
                tokenizer=self.stego_tokenizer,
                algorithm=self.stego_algorithm,
                bit_stream=self.secret_bits, 
                prompt_text=prompt
            )
        client_sendTimestamp = datetime.now().timestamp()
        info={
            "algorithm":self.stego_algorithm,
            "topic":self.question_path,
            "questionIndex":self.question_index,
            "clientModel":self.stego_model_path,
            "bitsEncoded": bits_encoded,
            "encryptedText":encrypted_text,
        }
        with open(f"data/conversation/baseline_conversation_{self.session_id}.json","w",encoding="utf-8") as f:
            json.dump(info,f)
        
        
                    
    async def _ensure_stego_enabled(self):
        """确保隐写功能已启用"""
        if self.enable_stego:
            return True
        logger.info("隐写未开启, 尝试开启隐写")
        hash_condition = lambda x:Math.calculate_sha256_binary(self.stego_key+str(x)).endswith('0')
        timestamp = TimestampMannager.get_valid_timestamp(hash_condition)
        if timestamp:
            logger.info(f"隐写开启成功,时间戳: {timestamp}")
            self.SN = 0
            await self.send_message(self.question,timestamp)
            self.enable_stego = True
            return True
        return False
        
            

            
