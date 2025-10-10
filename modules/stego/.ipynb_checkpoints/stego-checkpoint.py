import os
import random
import json
import math
import torch
from tqdm.autonotebook import tqdm
from .baselines.encode import ac_encoder, discop_encoder, DRBG
from .baselines.decode import ac_decoder, discop_decoder
from .artifacts_baselines.encode import encoder as artifacts_encoder
from .artifacts_baselines.decode import decoder as artifacts_decoder
from .artifacts_baselines.utils import DRBG as ArtifactsDRBG
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel
import config
from modules.logging.logging_mannager import LoggingMannager
provably_secure_alg = ['discop','discop_base']
discop_alg = ['discop','discop_base']
artifacts_alg = ['differential_based', 'binary_based', 'stability_based']

logger = LoggingMannager.get_logger(__name__)
def prompt_template(prompt_text, model, tokenizer, mode='generate', role='user'):
    """
    处理输入提示词，根据不同模式生成对应的token序列
    """
    if mode == 'generate':
        input_ids = tokenizer.encode(prompt_text, return_tensors="pt").to(model.device)
        return input_ids
    elif mode == 'chat':
        messages = [{"role": role, "content": prompt_text}]
        tokenized_chat = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to(model.device)
        return tokenized_chat
    else:
        raise ValueError("no such mode")


def calculate_entropy(prob):
    """计算概率分布的熵"""
    prob_np = prob.detach().cpu().numpy()
    prob_np = prob_np[prob_np > 0]  # 避免log(0)
    return -np.sum(prob_np * np.log2(prob_np))


def set_seed(seed):
    """设置随机种子"""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)


class Stego:
    """
    隐写术类，封装了文本隐写的加密和解密功能
    """
    
    def __init__(self):
        """
        初始化隐写术模型    
        """
        # 设置环境
        os.environ["CUDA_VISIBLE_DEVICES"] = '0'
        set_seed(config.ALGORITHM_CONFIG["seed"])
        # 加载配置
        self.model_configs = config.LLM_CONFIG
        self.sampling_configs = config.ALGORITHM_CONFIG
            
        # 提取算法配置
        self.alg = self.sampling_configs["algorithm"]
        self.kwargs = self.sampling_configs[self.alg]
        
        # 提取模型配置
        self.max_new_tokens = self.model_configs["max_new_tokens"]
        self.topk = self.model_configs["topk"]
        if self.topk == 0:
            self.topk = None  # 将在模型加载后设置
        self.prompt_mode = self.model_configs["prompt_template"]
        self.role = self.model_configs["role"]
        
        # 加载模型和分词器
        self._load_model()
        
        # 如果topk为0，设置为词汇表大小
        if self.topk is None:
            self.topk = self.tokenizer.vocab_size
            
        logger.info(f"隐写术模型初始化完成")
        logger.info(f"算法: {self.alg}")
        logger.info(f"模型: {self.model_configs['model_name_or_path']}")

        
    def _load_model(self):
        """加载语言模型和分词器"""
        model_name_or_path = self.model_configs['model_name_or_path']
        precision = self.model_configs.get("precision", "full")
        
        if precision == 'half':
            if "chatglm" in model_name_or_path:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path, trust_remote_code=True)
                self.model = AutoModel.from_pretrained(model_name_or_path, trust_remote_code=True).half().cuda()
            else:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
                self.model = AutoModelForCausalLM.from_pretrained(model_name_or_path).half().cuda()
        else:
            if "chatglm" in model_name_or_path:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path, trust_remote_code=True)
                self.model = AutoModel.from_pretrained(model_name_or_path, trust_remote_code=True).cuda()
            else:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
                self.model = AutoModelForCausalLM.from_pretrained(model_name_or_path).cuda()
                
        self.tokenizer.name = model_name_or_path
        self.model = self.model.eval()
        
    def _get_mask_generator(self):
        """获取掩码生成器（用于可证明安全的算法）"""
        if self.alg in provably_secure_alg:
            input_key = bytes.fromhex(self.kwargs["input_key"])
            sample_seed_prefix = bytes.fromhex(self.kwargs["sample_seed_prefix"])
            input_nonce = bytes.fromhex(self.kwargs["input_nonce"])
            return DRBG(input_key, sample_seed_prefix + input_nonce)
        elif self.alg in artifacts_alg:
            input_key = bytes.fromhex(self.kwargs["input_key"])
            sample_seed_prefix = bytes.fromhex(self.kwargs["sample_seed_prefix"])
            input_nonce = bytes.fromhex(self.kwargs["input_nonce"])
            return ArtifactsDRBG(input_key, sample_seed_prefix + input_nonce)
        return None
        
    def encrypt(self, bit_stream, prompt_text):
        """
        加密函数：将比特流嵌入到生成的文本中
        
        Args:
            bit_stream (str): 要嵌入的01字符串
            prompt_text (str): 上下文提示
            
        Returns:
            tuple: (隐写文本, 实际嵌入的比特数量, 生成的token ID序列)
        """
        mask_generator = self._get_mask_generator()
        original_bit_length = len(bit_stream)
        required_bits = self.max_new_tokens * math.log2(self.tokenizer.vocab_size)
        bit_index = 0
        if len(bit_stream[bit_index:]) <= required_bits:
            bit_stream_shuffle = np.random.randint(high=2, low=0, size=(1, 100000)).tolist()[0]
            random.shuffle(bit_stream_shuffle)
            bit_stream += "".join([str(b) for b in bit_stream_shuffle])

        with torch.no_grad():
            input_ids = prompt_template(prompt_text, self.model, self.tokenizer, 
                                      mode=self.prompt_mode, role=self.role)
            
            x = input_ids
            stega_sentence = []
            stega_bit = []
            total_bits_embedded = 0
            
            # AC算法的特殊初始化
            if self.alg.lower() in ["ac"]:
                max_val = 2 ** self.kwargs["precision"]
                cur_interval = [0, max_val]
                seed = 42
                
            past_key_values = None
            
            for i in tqdm(range(self.max_new_tokens), desc="生成隐写文本"):
                if self.tokenizer.eos_token_id in stega_sentence:
                    break
                    
                # 获取条件概率分布
                output = self.model(input_ids=x, past_key_values=past_key_values, use_cache=True)
                past_key_values = output.past_key_values
                log_prob = output.logits[:, -1, :]
                log_prob -= log_prob.max()
                prob = torch.exp(log_prob).reshape(-1)
                prob = prob / prob.sum()
                
                # logits预处理
                prob, indices = prob.sort(descending=True)
                mask = prob > 0
                prob = prob[mask]
                indices = indices[mask]
                prob = prob[:self.topk]
                indices = indices[:self.topk]
                prob = prob / prob.sum()
                
                # 根据算法进行编码
                if self.alg.lower() in ["ac"]:
                    seed += 1
                    cur_interval, prev, num_bits_encoded = ac_encoder(
                        prob, indices, bit_stream, bit_index, 
                        self.kwargs["precision"], cur_interval)
                elif self.alg.lower() in discop_alg:
                    prev, num_bits_encoded = discop_encoder(
                        self.alg, prob, indices, bit_stream, bit_index,
                        mask_generator, self.kwargs["precision"])
                elif self.alg.lower() in artifacts_alg:
                    prev, num_bits_encoded = artifacts_encoder(
                        self.alg, prob, indices, bit_stream, bit_index,
                        mask_generator, self.kwargs["precision"])
                else:
                    raise ValueError(f"不支持的算法: {self.alg}")
                    
                if int(prev) == self.tokenizer.eos_token_id:
                    break
                    
                stega_sentence.append(int(prev))
                x = prev.reshape(1, 1)
                stega_bit.append(bit_stream[bit_index:bit_index + num_bits_encoded])
                total_bits_embedded += num_bits_encoded
                bit_index += num_bits_encoded
                
        # 移除EOS token
        if self.tokenizer.eos_token_id in stega_sentence:
            stega_sentence.remove(self.tokenizer.eos_token_id)
            
        stega_text = self.tokenizer.decode(stega_sentence)
        actual_embedded_bits = min(total_bits_embedded, original_bit_length)
        logger.info(f"嵌入比特：{bit_stream[:actual_embedded_bits]}")
        return stega_text, actual_embedded_bits, stega_sentence
        
    def decrypt(self, stego_text, prompt_text, max_tokens=None):
        """
        解密函数：从隐写文本中提取比特流
        
        Args:
            stego_text (str): 隐写文本
            prompt_text (str): 生成时使用的上下文提示（必须与加密时一致）
            max_tokens (int): 最多解码的token数量，如果为None则使用初始化时的设置
            
        Returns:
            tuple: (提取出的完整比特串, 每个token对应提取的比特串列表, 解析出的token ID序列)
        """
        if max_tokens is None:
            max_tokens = self.max_new_tokens
            
        mask_generator = self._get_mask_generator()
        
        with torch.no_grad():
            input_ids = prompt_template(prompt_text, self.model, self.tokenizer,
                                      mode=self.prompt_mode, role=self.role)
            
            # AC算法的特殊初始化
            if self.alg.lower() in ["ac"]:
                max_val = 2 ** self.kwargs["precision"]
                cur_interval = [0, max_val]
                seed = 42
                
            full_bits = ""
            past_key_values = None
            tokens = []
            tokens_bits = []
            
            # 将提示和隐写文本连接
            full_ids = torch.cat((
                input_ids,
                self.tokenizer.encode(stego_text, add_special_tokens=False, return_tensors="pt").to(self.model.device)
            ), dim=1)
            
            # 遍历隐写文本的每个token
            for i in tqdm(range(len(input_ids[0]), min(len(full_ids[0]), max_tokens + len(input_ids[0]))),
                         desc="提取隐藏信息"):
                
                # 获取条件概率分布
                output = self.model(input_ids=input_ids, past_key_values=past_key_values, use_cache=True)
                log_prob, past_key_values = output.logits, output.past_key_values
                log_prob = log_prob[0, -1, :]
                log_prob -= log_prob.max()
                prob = torch.exp(log_prob).reshape(-1)
                prob = prob / prob.sum()
                
                # logits预处理
                prob, indices = prob.sort(descending=True)
                mask = prob > 0
                prob = prob[mask]
                indices = indices[mask]
                prob = prob[:self.topk]
                indices = indices[:self.topk]
                prob = prob / prob.sum()
                
                embed_id = full_ids[0][i].item()
                tokens.append(embed_id)
                
                try:
                    # 根据算法进行解码
                    if self.alg.lower() in ["ac"]:
                        cur_interval, extract_bits = ac_decoder(
                            prob, indices, embed_id, cur_interval, self.kwargs["precision"])
                    elif self.alg.lower() in discop_alg:
                        extract_bits = discop_decoder(
                            self.alg, prob, indices, embed_id, 
                            mask_generator, self.kwargs["precision"])
                    elif self.alg.lower() in artifacts_alg:
                        extract_bits = artifacts_decoder(
                            self.alg, prob, indices, embed_id, 
                            mask_generator, self.kwargs["precision"])
                    else:
                        raise ValueError(f"不支持的算法: {self.alg}")
                except:
                    extract_bits = ""
                    
                input_ids = full_ids[0][i].reshape(1, 1)
                full_bits += extract_bits
                tokens_bits.append(extract_bits)
                
        return full_bits, tokens_bits, tokens
    def generate_text(self, prompt_text):
        """
        不进行隐写，正常生成文本
        
        Args:
            prompt_text (str): 输入的提示文本
            
        Returns:
            tuple: (生成的文本, 生成的token ID序列)
        """
        with torch.no_grad():
            input_ids = prompt_template(prompt_text, self.model, self.tokenizer, 
                                      mode=self.prompt_mode, role=self.role)
            
            generated_tokens = []
            past_key_values = None
            x = input_ids
            
            for i in tqdm(range(self.max_new_tokens), desc="正常生成文本"):
                # 获取模型输出
                output = self.model(input_ids=x, past_key_values=past_key_values, use_cache=True)
                past_key_values = output.past_key_values
                logits = output.logits[:, -1, :]
                
                # 应用top-k采样
                if self.topk is not None and self.topk > 0:
                    # 获取top-k概率和对应的token indices
                    top_k_probs, top_k_indices = torch.topk(logits, k=min(self.topk, logits.size(-1)))
                    # 创建一个与logits同样大小的tensor，初始化为负无穷
                    filtered_logits = torch.full_like(logits, -float('inf'))
                    # 只保留top-k的logits值
                    filtered_logits.scatter_(1, top_k_indices, top_k_probs)
                    logits = filtered_logits
                
                # 转换为概率分布
                probs = torch.softmax(logits, dim=-1)
                
                # 从概率分布中采样
                next_token = torch.multinomial(probs, num_samples=1)
                
                # 检查是否生成了结束token
                if next_token.item() == self.tokenizer.eos_token_id:
                    break
                    
                generated_tokens.append(next_token.item())
                x = next_token.reshape(1, 1)
            
            # 解码生成的文本
            generated_text = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            logger.info(f"正常生成文本长度: {len(generated_text)}")
            logger.info(f"生成token数量: {len(generated_tokens)}")
            
            return generated_text, generated_tokens
        
    def get_config_info(self):
        """
        获取当前配置信息
        
        Returns:
            dict: 包含算法、模型、参数等配置信息
        """
        return {
            "algorithm": self.alg,
            "model_path": self.model_configs['model_name_or_path'],
            "max_new_tokens": self.max_new_tokens,
            "topk": self.topk,
            "prompt_mode": self.prompt_mode,
            "role": self.role,
            "algorithm_params": self.kwargs
        }


if __name__ == "__main__":
    # 使用示例 - 测试新的Artifacts算法
    print("=== Artifacts Framework隐写算法测试 ===")
    
    # 测试所有三种Artifacts算法
    algorithms = ['differential_based', 'binary_based', 'stability_based']
    
    for alg in algorithms:
        print(f"\n测试算法: {alg}")
        try:
            # 临时修改config来测试不同算法
            original_alg = config.ALGORITHM_CONFIG["algorithm"]
            config.ALGORITHM_CONFIG["algorithm"] = alg
            
            stego = Stego()
            
            # 加密示例
            bit_stream = "1101010010111101111011001010110101"
            prompt = "Tell me something about cryptography"
            
            print("=== 加密测试 ===")
            stego_text, bits_embedded, token_ids = stego.encrypt(bit_stream, prompt)
            print(f"原始比特流: {bit_stream}")
            print(f"嵌入比特数: {bits_embedded}")
            print(f"隐写文本长度: {len(stego_text)}")
            print(f"Token数量: {len(token_ids)}")
            
            # 解密示例
            print("=== 解密测试 ===")
            extracted_bits, token_bits, extracted_tokens = stego.decrypt(stego_text, prompt)
            print(f"提取的比特流: {extracted_bits}")
            print(f"提取的比特数: {len(extracted_bits)}")
            
            # 验证
            print("=== 验证结果 ===")
            original_truncated = bit_stream[:len(extracted_bits)]
            match_result = original_truncated == extracted_bits
            print(f"比特流匹配: {match_result}")
            print(f"Token匹配: {token_ids == extracted_tokens}")
            print(f"算法 {alg} 测试 {'成功' if match_result else '失败'}")
            
            # 恢复原始配置
            config.ALGORITHM_CONFIG["algorithm"] = original_alg
            
        except Exception as e:
            print(f"算法 {alg} 测试失败: {str(e)}")
            # 恢复原始配置
            config.ALGORITHM_CONFIG["algorithm"] = original_alg
            continue
    
    print("\n=== 所有测试完成 ===")
    
    # 额外测试：对比原有算法和新算法
    print("\n=== 对比测试 ===")
    try:
        # 测试原有算法
        config.ALGORITHM_CONFIG["algorithm"] = "discop"
        stego_original = Stego()
        bit_stream = "110101001011110111"
        prompt = "Hello world"
        
        stego_text_orig, bits_orig, _ = stego_original.encrypt(bit_stream, prompt)
        extracted_orig, _, _ = stego_original.decrypt(stego_text_orig, prompt)
        
        print(f"原有算法(discop) - 嵌入: {bits_orig}位, 提取: {len(extracted_orig)}位")
        
        # 测试新算法
        config.ALGORITHM_CONFIG["algorithm"] = "differential_based"
        stego_new = Stego()
        stego_text_new, bits_new, _ = stego_new.encrypt(bit_stream, prompt)
        extracted_new, _, _ = stego_new.decrypt(stego_text_new, prompt)
        
        print(f"新算法(differential_based) - 嵌入: {bits_new}位, 提取: {len(extracted_new)}位")
        
        print("Artifacts Framework算法集成成功！")
        
    except Exception as e:
        print(f"对比测试失败: {str(e)}") 