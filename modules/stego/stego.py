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
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoModel
import config
from modules.logging.logging_mannager import LoggingMannager
from .meteor.meteor import Meteor_encoder,Meteor_decoder

meteor = ["meteor"]
discop_alg = ['discop','discop_base']
artifacts_alg = ['differential_based', 'binary_based', 'stability_based']

logger = LoggingMannager.get_logger(__name__)

def prompt_template(prompt_text, model, tokenizer, mode='chat', role='user'):
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

def _get_mask_generator(kwargs:dict):
    """获取掩码生成器（用于可证明安全的算法）"""
    input_key = bytes.fromhex(kwargs["input_key"])
    sample_seed_prefix = bytes.fromhex(kwargs["sample_seed_prefix"])
    input_nonce = bytes.fromhex(kwargs["input_nonce"])
    return DRBG(input_key, sample_seed_prefix + input_nonce)
    
def encrypt(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,algorithm:str,bit_stream:str, prompt_text:str):
    """
    加密函数：将比特流嵌入到生成的文本中
    
    Args:
        bit_stream (str): 要嵌入的01字符串
        prompt_text (str): 上下文提示
        
    Returns:
        tuple: (隐写文本, 实际嵌入的比特数量, 生成的token ID序列)
    """
    set_seed(config.ALGORITHM_CONFIG["seed"])
    algorithm_kwargs = config.ALGORITHM_CONFIG[algorithm]
    LLM_CONFIG = config.LLM_CONFIG
    max_new_tokens = LLM_CONFIG["max_new_tokens"]
    topk = LLM_CONFIG["topk"]

    mask_generator = _get_mask_generator(algorithm_kwargs)
    original_bit_length = len(bit_stream)
    required_bits = max_new_tokens * math.log2(tokenizer.vocab_size)
    bit_index = 0
    if len(bit_stream[bit_index:]) <= required_bits:
        bit_stream_shuffle = np.random.randint(high=2, low=0, size=(1, 100000)).tolist()[0]
        random.shuffle(bit_stream_shuffle)
        bit_stream += "".join([str(b) for b in bit_stream_shuffle])

    with torch.no_grad():
        input_ids = prompt_template(prompt_text, model, tokenizer, 
                                    mode=LLM_CONFIG["prompt_template"], role=LLM_CONFIG["role"])
        x = input_ids
        stega_sentence = []
        stega_bit = []
        total_bits_embedded = 0
        
        # AC算法的特殊初始化
        if algorithm.lower() in ["ac"]:
            max_val = 2 ** algorithm_kwargs["precision"]
            cur_interval = [0, max_val]
           
            
        past_key_values = None
        
        for i in tqdm(range(max_new_tokens), desc="生成隐写文本"):
            if tokenizer.eos_token_id in stega_sentence:
                break
                
            # 获取条件概率分布
            output = model(input_ids=x, past_key_values=past_key_values, use_cache=True)
            past_key_values = output.past_key_values
            log_prob = output.logits[:, -1, :].clone()  # 使用clone避免引用
            log_prob -= log_prob.max()
            prob = torch.exp(log_prob).reshape(-1)
            prob = prob / prob.sum()
            
            # 清理output以释放显存
            del output
            del log_prob
            
            # logits预处理
            prob, indices = prob.sort(descending=True)
            mask = prob > 0
            prob = prob[mask]
            indices = indices[mask]
            prob = prob[:topk]
            indices = indices[:topk]
            prob = prob / prob.sum()
            
            # 根据算法进行编码
            if algorithm.lower() in ["ac"]:
                cur_interval, prev, num_bits_encoded = ac_encoder(
                    prob, indices, bit_stream, bit_index, 
                    cur_interval,algorithm_kwargs["precision"])
            elif algorithm.lower() in discop_alg:
                prev, num_bits_encoded = discop_encoder(
                    algorithm, prob, indices, bit_stream, bit_index,
                    mask_generator, algorithm_kwargs["precision"])
            elif algorithm.lower() in artifacts_alg:
                prev, num_bits_encoded = artifacts_encoder(
                    algorithm, prob, indices, bit_stream, bit_index,
                    mask_generator, algorithm_kwargs["precision"])
            elif algorithm.lower() in meteor:
                prev, num_bits_encoded = Meteor_encoder(
                    prob, indices, bit_stream, bit_index,
                    mask_generator, algorithm_kwargs["precision"])
            else:
                raise ValueError(f"不支持的算法: {algorithm}")
                
            if int(prev) == tokenizer.eos_token_id:
                break
                
            stega_sentence.append(int(prev))
            x = prev.reshape(1, 1)
            stega_bit.append(bit_stream[bit_index:bit_index + num_bits_encoded])
            total_bits_embedded += num_bits_encoded
            bit_index += num_bits_encoded
            
            # 清理临时tensor
            del prob, indices, mask, prev
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            
    # 移除EOS token
    if tokenizer.eos_token_id in stega_sentence:
        stega_sentence.remove(tokenizer.eos_token_id)
        
    stega_text = tokenizer.decode(stega_sentence)
    actual_embedded_bits = min(total_bits_embedded, original_bit_length)
    logger.info(f"嵌入比特：{bit_stream[:actual_embedded_bits]}")
    
    return stega_text, actual_embedded_bits, stega_sentence
    
def decrypt(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,algorithm:str,stego_text:str, prompt_text:str):
    """
    解密函数：从隐写文本中提取比特流
    
    Args:
        stego_text (str): 隐写文本
        prompt_text (str): 生成时使用的上下文提示（必须与加密时一致）
        max_tokens (int): 最多解码的token数量，如果为None则使用初始化时的设置
        
    Returns:
        tuple: (提取出的完整比特串, 每个token对应提取的比特串列表, 解析出的token ID序列)
    """
    set_seed(config.ALGORITHM_CONFIG["seed"])
    algorithm_kwargs = config.ALGORITHM_CONFIG[algorithm]
    LLM_CONFIG = config.LLM_CONFIG
    max_tokens = LLM_CONFIG["max_new_tokens"]
    topk = LLM_CONFIG["topk"]
    
        
    mask_generator = _get_mask_generator(algorithm_kwargs)
    
    with torch.no_grad():
        input_ids = prompt_template(prompt_text, model, tokenizer,
                                    mode=LLM_CONFIG["prompt_template"], role=LLM_CONFIG["role"])
        
        # AC算法的特殊初始化
        if algorithm.lower() in ["ac"]:
            max_val = 2 ** algorithm_kwargs["precision"]
            cur_interval = [0, max_val]
            
        full_bits = ""
        past_key_values = None
        tokens = []
        tokens_bits = []
        
        # 将提示和隐写文本连接
        full_ids = torch.cat((
            input_ids,
            tokenizer.encode(stego_text, add_special_tokens=False, return_tensors="pt").to(model.device)
        ), dim=1)
        
        # 遍历隐写文本的每个token
        for i in tqdm(range(len(input_ids[0]), min(len(full_ids[0]), max_tokens + len(input_ids[0]))),
                        desc="提取隐藏信息"):
            
            # 获取条件概率分布
            output = model(input_ids=input_ids, past_key_values=past_key_values, use_cache=True)
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
            prob = prob[:topk]
            indices = indices[:topk]
            prob = prob / prob.sum()
            
            embed_id = full_ids[0][i].item()
            tokens.append(embed_id)
            
            try:
                # 根据算法进行解码
                if algorithm.lower() in ["ac"]:
                    cur_interval, extract_bits = ac_decoder(
                        prob, indices, embed_id, cur_interval, algorithm_kwargs["precision"])
                elif algorithm.lower() in discop_alg:
                    extract_bits = discop_decoder(
                        algorithm, prob, indices, embed_id, 
                        mask_generator, algorithm_kwargs["precision"])
                elif algorithm.lower() in artifacts_alg:
                    extract_bits = artifacts_decoder(
                        algorithm, prob, indices, embed_id, 
                        mask_generator, algorithm_kwargs["precision"])
                elif algorithm.lower() in meteor:
                    extract_bits = Meteor_decoder(
                        prob, indices, embed_id, 
                        mask_generator, algorithm_kwargs["precision"])
                else:
                    raise ValueError(f"不支持的算法: {algorithm}")
            except:
                extract_bits = ""
                
            input_ids = full_ids[0][i].reshape(1, 1)
            full_bits += extract_bits
            tokens_bits.append(extract_bits)
            
    return full_bits, tokens_bits, tokens
def generate_text(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,prompt_text:str):
    """
    不进行隐写，正常生成文本
    
    Args:
        model (AutoModelForCausalLM): 模型
        tokenizer (AutoTokenizer): 分词器
        prompt_text (str): 输入的提示文本
        
    Returns:
        tuple: (生成的文本, 生成的token ID序列)
    """
    set_seed(config.ALGORITHM_CONFIG["seed"])
    LLM_CONFIG = config.LLM_CONFIG
    max_new_tokens = LLM_CONFIG["max_new_tokens"]
    topk = LLM_CONFIG["topk"]
    with torch.no_grad():
        input_ids = prompt_template(prompt_text, model, tokenizer, 
                                    mode=LLM_CONFIG["prompt_template"], role=LLM_CONFIG["role"])
        
        generated_tokens = []
        past_key_values = None
        x = input_ids
        for i in tqdm(range(max_new_tokens), desc="正常生成文本"):
            # 获取模型输出
            output = model(input_ids=x, past_key_values=past_key_values, use_cache=True)
            past_key_values = output.past_key_values
            logits = output.logits[:, -1, :]
            
            # 应用top-k采样
            if topk is not None and topk > 0:
                # 获取top-k概率和对应的token indices
                top_k_probs, top_k_indices = torch.topk(logits, k=min(topk, logits.size(-1)))
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
            if next_token.item() == tokenizer.eos_token_id:
                break
                
            generated_tokens.append(next_token.item())
            x = next_token.reshape(1, 1)
        
        # 解码生成的文本
        generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
        
        logger.info(f"正常生成文本长度: {len(generated_text)}")
        logger.info(f"生成token数量: {len(generated_tokens)}")
        
        return generated_text, generated_tokens
        



if __name__ == "__main__":
    # 测试隐写算法
    print("开始测试隐写算法...")
    
    # 测试配置
    test_model_path = "/root/autodl-fs/Llama-3.2-3B-Instruct"  # 使用轻量级模型进行测试
    test_algorithm = "ac"  # 使用AC算法进行测试
    test_bit_stream = "01001010000000000000110011010101110100011101011100100001011000111110100101101010110"  # 测试比特流
    test_prompt = "这是一个测试提示，用于验证隐写算法的功能。"
    
    try:
        # 加载测试模型
        print(f"正在加载模型: {test_model_path}")
        tokenizer = AutoTokenizer.from_pretrained(test_model_path)
        model = AutoModelForCausalLM.from_pretrained(test_model_path).to("cuda")
        
        # 设置padding token（如果没有的话）
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            
        print("模型加载成功!")
        
        # 测试加密功能
        print(f"\n测试加密功能...")
        print(f"输入比特流: {test_bit_stream}")
        print(f"输入提示: {test_prompt}")
        
        encrypted_text, bits_encoded, token_sequence = encrypt(
            model=model,
            tokenizer=tokenizer,
            algorithm=test_algorithm,
            bit_stream=test_bit_stream,
            prompt_text=test_prompt
        )
        
        print(f"加密成功!")
        print(f"生成的隐写文本: {encrypted_text}")
        print(f"嵌入的比特数: {bits_encoded}")
        print(f"生成的token序列长度: {len(token_sequence)}")
        
        # 测试解密功能
        print(f"\n测试解密功能...")
        decrypted_bits, token_bits, decoded_tokens = decrypt(
            model=model,
            tokenizer=tokenizer,
            algorithm=test_algorithm,
            stego_text=encrypted_text,
            prompt_text=test_prompt
        )
        
        print(f"解密成功!")
        print(f"提取的比特流: {decrypted_bits[:bits_encoded]}")
        print(f"原始比特流: {test_bit_stream[:bits_encoded]}")
        
        # 验证结果
        original_bits = test_bit_stream[:bits_encoded]
        extracted_bits = decrypted_bits[:bits_encoded]
        
        if original_bits == extracted_bits:
            print("✅ 测试通过: 提取的比特流与原始比特流一致!")
        else:
            print("❌ 测试失败: 提取的比特流与原始比特流不一致")
            print(f"差异位置: {[i for i in range(min(len(original_bits), len(extracted_bits))) if i < len(original_bits) and i < len(extracted_bits) and original_bits[i] != extracted_bits[i]]}")
        
        # 测试正常文本生成
        print(f"\n测试正常文本生成...")
        normal_text, normal_tokens = generate_text(
            model=model,
            tokenizer=tokenizer,
            prompt_text=test_prompt
        )
        
        print(f"正常生成文本: {normal_text}")
        print(f"正常生成token数量: {len(normal_tokens)}")
        
        print("\n所有测试完成!")
        
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {str(e)}")
        print("请检查:")
        print("1. 是否正确安装了transformers库")
        print("2. 是否有足够的内存/显存")
        print("3. 是否有网络连接下载模型")
        print("4. config.py中的配置是否正确")
        
        # 打印详细错误信息
        import traceback
        traceback.print_exc()
    