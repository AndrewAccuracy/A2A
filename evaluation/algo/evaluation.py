
import gc
from hashlib import algorithms_available
import json
import torch
from transformers import AutoModelForCausalLM, AutoModel, AutoTokenizer
import torch.nn.functional as F
import nltk
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from collections import Counter
import numpy as np

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from typing import Dict, List, Optional
import os
from datetime import datetime


def calculate_ppl(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,text:str):
    """
    计算给定文本的困惑度（PPL）。
    Args:
        model:AutoModelForCausalLM: 评估模型
        tokenizer:AutoTokenizer: 评估模型分词器
        text:str: 需要计算困惑度的文本。
        
    Returns:
        float: 困惑度分数。分数越低表示文本越自然。
    """
    with torch.no_grad():
        # 对文本进行分词处理
        tokenizer_output = tokenizer(text, return_tensors="pt", add_special_tokens=False)
        encoded_text = tokenizer_output["input_ids"][0].to(model.device)
        del tokenizer_output  # 立即清理tokenizer输出
        
        # 设置损失函数（交叉熵损失）
        criterion = torch.nn.CrossEntropyLoss()
        
        # 获取模型预测结果
        model_input = torch.unsqueeze(encoded_text, 0)
        model_output = model(model_input, return_dict=True)
        logits = model_output.logits[0].clone()  # 使用clone避免引用
        
        # 立即清理模型输出和输入
        del model_output, model_input
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        # 计算损失和困惑度
        # 我们预测下一个token，所以比较logits[:-1]与encoded_text[1:]
        logits_slice = logits[:-1]
        target_slice = encoded_text[1:]
        loss = criterion(logits_slice, target_slice)
        ppl = torch.exp(loss)  # 困惑度是损失的指数
        # 保存结果
        result = ppl.item()
        return result
def calculate_semantic_entropy(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,text:str):
    """
    计算给定文本的语义熵。
    Args:
        model:AutoModelForCausalLM: 评估模型
        tokenizer:AutoTokenizer: 评估模型分词器
        text:str: 需要计算语义熵的文本。
        
    Returns:
        float: 语义熵分数。分数越高表示语义不确定性越大。
    """
    with torch.no_grad():
        # 对文本进行分词处理
        tokenizer_output = tokenizer(text, return_tensors="pt", add_special_tokens=False)
        encoded_text = tokenizer_output["input_ids"][0].to(model.device)
        # 获取模型预测结果
        model_input = torch.unsqueeze(encoded_text, 0)
        model_output = model(model_input, return_dict=True)
        logits = model_output.logits[0].clone()  # 使用clone避免引用
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        # 将logits转换为概率分布
        logits_slice = logits[:-1]  # 对除最后一个位置外的所有位置
        probabilities = F.softmax(logits_slice, dim=-1)
        log_probs = torch.log(probabilities + 1e-10)  # 添加小常数避免log(0)
        entropy_per_position = -torch.sum(probabilities * log_probs, dim=-1)
        # 计算平均语义熵
        semantic_entropy = torch.mean(entropy_per_position)
        # 保存结果
        result = semantic_entropy.item()
        return result


def calculate_rouge1(reference, candidate):
    """
    计算ROUGE-1分数。
    
    ROUGE-1是基于单个词（unigram）匹配的评估指标，用于衡量候选文本与参考文本的相似度。
    分数范围从0到1，1表示完全匹配。
    
    参数：
        reference (str): 参考文本（通常是原始文本）。
        candidate (str): 候选文本（通常是生成或加水印的文本）。
        
    返回：
        dict: 包含ROUGE-1的精确率(precision)、召回率(recall)和F1值。
    """
    # 确保nltk已下载必要的资源
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab')
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
        
    # 对文本进行分词
    reference_tokens = nltk.word_tokenize(reference.lower())
    candidate_tokens = nltk.word_tokenize(candidate.lower())
    
    # 计算unigrams
    reference_unigrams = Counter(reference_tokens)
    candidate_unigrams = Counter(candidate_tokens)
    
    # 计算共同出现的unigrams
    common_unigrams = reference_unigrams & candidate_unigrams
    common_count = sum(common_unigrams.values())
    
    # 计算精确率、召回率和F1值
    candidate_total = sum(candidate_unigrams.values())
    reference_total = sum(reference_unigrams.values())
    precision = common_count / max(candidate_total, 1)
    recall = common_count / max(reference_total, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-10)
    
    # 保存结果
    result = {
        'precision': precision,
        'recall': recall,
        'f1': f1
    }
    
    return result

def calculate_bleu(reference, candidate, weights=(0.25, 0.25, 0.25, 0.25)):
    """
    计算BLEU分数。

    参数：
        reference (str): 参考文本（通常是原始文本）。
        candidate (str): 候选文本（通常是生成或加水印的文本）。
        weights (tuple): n-gram权重，默认为(0.25, 0.25, 0.25, 0.25)，表示BLEU-4。
        
    返回：
        float: BLEU分数。
    """
    # 确保nltk已下载必要的资源
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab')
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
        
    # 对文本进行分词
    reference_tokens = nltk.word_tokenize(reference.lower())
    candidate_tokens = nltk.word_tokenize(candidate.lower())
    
    # 使用平滑函数避免零精确率
    smoothing = SmoothingFunction().method1
    
    # 计算BLEU分数
    bleu_score = sentence_bleu(
        [reference_tokens],  # 参考文本列表（可以有多个参考）
        candidate_tokens,    # 候选文本
        weights=weights,     # n-gram权重
        smoothing_function=smoothing  # 平滑函数
    )
    # 保存结果
    result = bleu_score
    return result

def calculate_lexical_diversity(text):
    """
    计算给定文本的词汇丰富度，不依赖参考文本。

    参数:
        text (str): 需要评估的文本。
        
    返回:
        dict: 包含多种词汇丰富度指标的字典。
    """
    try:
        # 确保nltk的分词器可用
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')

    # 将文本分词
    tokens = nltk.word_tokenize(text.lower())
    
    # 过滤掉非字母的token，例如标点符号
    words = [word for word in tokens if word.isalpha()]
    
    if not words:
        # 清理临时变量
        del tokens, words
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        gc.collect()
        return {
            'ttr': 0,
            'rttr': 0,
            'unigram_entropy': 0
        }

    total_tokens = len(words)
    unique_words = set(words)
    unique_tokens = len(unique_words)

    # 1. 计算 TTR (Type-Token Ratio)
    ttr = unique_tokens / total_tokens if total_tokens > 0 else 0

    # 2. 计算 RTTR (Root TTR)
    rttr = unique_tokens / np.sqrt(total_tokens) if total_tokens > 0 else 0

    # 3. 计算 Unigram Entropy
    counts = Counter(words)
    probabilities = [count / total_tokens for count in counts.values()]
    entropy = -np.sum([p * np.log2(p) for p in probabilities if p > 0])
    
    # 保存结果
    result = {
        'ttr': ttr,
        'rttr': rttr,
        'unigram_entropy': entropy
    }
    return result


def parse_conversation(model:AutoModelForCausalLM,tokenizer:AutoTokenizer,conversation_path:str,result_path:str):
    with open(conversation_path, 'r', encoding='utf-8') as file:
        conversation = json.load(file)
    result = {
        "conversation_info":conversation_path,
        "experiment_config":{
            "steganography_algorithm":conversation['sessionInfo']['steganographyAlgorithm'],
            "question_domain":conversation['sessionInfo']['topic'],
            "question_index":conversation['sessionInfo']['questionIndex']
        },
        "average_capacity_metrics":{
            "bits_per_round":0,  # 将动态计算
            "round_per_bit":0,   # 将动态计算
            "total_bits_transmitted":0,  # 实际传输的总比特数
            "bits_per_round_list":[]     # 每轮传输的比特数列表
        },
        "rounds":[
        ],
        "average_quality_metrics":None
    }
    print(f"解析对话：{conversation_path}")
    print("实验配置")
    print(f"    隐写算法：{conversation['sessionInfo']['steganographyAlgorithm']}")
    print(f"    对话领域：{conversation['sessionInfo']['topic']}")
    print(f"    问题编号：{conversation['sessionInfo']['questionIndex']}")
    print("平均传输效率指标:")
    print(f"    平均每轮可嵌入比特数(bits/round):{result['average_capacity_metrics']['bits_per_round']}")
    print(f"    平均每比特可嵌入轮数(round/bit):{result['average_capacity_metrics']['round_per_bit']}")
    print("逐轮文本质量分析:")
    ppl_list = []
    entropy_list = []
    rouge1_list = []
    bleu_list = []
    lex_div_list = []
    bits_per_round_list = []
    rounds = conversation['rounds']
    
    # 验证轮数：固定为5轮
    EXPECTED_ROUNDS = 5
    if len(rounds) != EXPECTED_ROUNDS:
        print(f"    警告: 对话轮数为 {len(rounds)}，期望为 {EXPECTED_ROUNDS} 轮")
        if len(rounds) > EXPECTED_ROUNDS:
            print(f"    将只处理前 {EXPECTED_ROUNDS} 轮数据")
            rounds = rounds[:EXPECTED_ROUNDS]
        elif len(rounds) < EXPECTED_ROUNDS:
            print(f"    数据不完整，只有 {len(rounds)} 轮")
    
    for round in rounds:
        stego_text = round['clientTurn']['publicCarrierMessage']
        cover_text = round['clientTurn']['normalMessage']
        
        # 计算实际传输的比特数（从payload中获取）
        try:
            import base64
            payload_base64 = round['clientTurn']['covertPacket']['payload_base64']
            payload_bits = base64.b64decode(payload_base64).decode('utf-8')
            bits_transmitted = len(payload_bits)
        except (KeyError, Exception) as e:
            # 如果无法获取payload，使用估算值
            bits_transmitted = 1.5  # 默认估算值
            print(f"    警告: 无法获取第{round['roundNumber']}轮的payload数据，使用估算值: {e}")
        
        bits_per_round_list.append(bits_transmitted)
        
        ppl = calculate_ppl(model,tokenizer,stego_text)
        entropy = calculate_semantic_entropy(model,tokenizer,stego_text)
        rouge1 = calculate_rouge1(cover_text,stego_text)
        bleu = calculate_bleu(cover_text,stego_text)
        lex_div = calculate_lexical_diversity(stego_text)
        print(f"    轮次：{round['roundNumber']}")
        print(f"        传输比特数:{bits_transmitted}")
        print(f"        困惑度:{ppl}")
        print(f"        语义熵:{entropy}")
        print(f"        ROUGE-1(Precision):{rouge1['precision']}")
        print(f"        ROUGE-1(Recall):{rouge1['recall']}")
        print(f"        ROUGE-1(F1):{rouge1['f1']}")
        print(f"        BLEU:{bleu}")
        print(f"        词汇丰富度(TTR):{lex_div['ttr']}")
        print(f"        词汇丰富度(RTTR):{lex_div['rttr']}")
        print(f"        词汇丰富度(Unigram Entropy):{lex_div['unigram_entropy']}")
        result['rounds'].append({
            "round_number":round['roundNumber'],
            "bits_transmitted":bits_transmitted,
            "ppl":ppl,
            "entropy":entropy,
            "rouge1_precision":rouge1['precision'],
            "rouge1_recall":rouge1['recall'],
            "rouge1_f1":rouge1['f1'],
            "bleu":bleu,
            "lex_div_ttr":lex_div['ttr'],
            "lex_div_rttr":lex_div['rttr'],
            "lex_div_unigram_entropy":lex_div['unigram_entropy']
        })
        ppl_list.append(ppl)
        entropy_list.append(entropy)
        rouge1_list.append(rouge1)
        bleu_list.append(bleu)
        lex_div_list.append(lex_div)

    # 更新传输容量指标
    total_bits_transmitted = sum(bits_per_round_list)
    avg_bits_per_round = np.mean(bits_per_round_list) if bits_per_round_list else 0
    avg_round_per_bit = 1.0 / avg_bits_per_round if avg_bits_per_round > 0 else 0
    
    result['average_capacity_metrics']['bits_per_round'] = avg_bits_per_round
    result['average_capacity_metrics']['round_per_bit'] = avg_round_per_bit
    result['average_capacity_metrics']['total_bits_transmitted'] = total_bits_transmitted
    result['average_capacity_metrics']['bits_per_round_list'] = bits_per_round_list
    
    print("更新后的传输效率指标:")
    print(f"    实际平均每轮可嵌入比特数(bits/round):{avg_bits_per_round:.3f}")
    print(f"    实际平均每比特可嵌入轮数(round/bit):{avg_round_per_bit:.3f}")
    print(f"    实际总传输比特数:{total_bits_transmitted:.1f}")
    
    print("平均文本质量指标:")
    print(f"    平均困惑度:{np.mean(ppl_list)}")
    print(f"    平均语义熵:{np.mean(entropy_list)}")
    print(f"    平均ROUGE-1(Precision):{np.mean([rouge1['precision'] for rouge1 in rouge1_list])}")
    print(f"    平均ROUGE-1(Recall):{np.mean([rouge1['recall'] for rouge1 in rouge1_list])}")
    print(f"    平均ROUGE-1(F1):{np.mean([rouge1['f1'] for rouge1 in rouge1_list])}")
    print(f"    平均BLEU:{np.mean(bleu_list)}")
    print(f"    平均词汇丰富度(TTR):{np.mean([lex_div['ttr'] for lex_div in lex_div_list])}")
    print(f"    平均词汇丰富度(RTTR):{np.mean([lex_div['rttr'] for lex_div in lex_div_list])}")
    print(f"    平均词汇丰富度(Unigram Entropy):{np.mean([lex_div['unigram_entropy'] for lex_div in lex_div_list])}")
    result['average_quality_metrics'] = {
        "ppl":np.mean(ppl_list),
        "entropy":np.mean(entropy_list),
        "rouge1_precision":np.mean([rouge1['precision'] for rouge1 in rouge1_list]),
        "rouge1_recall":np.mean([rouge1['recall'] for rouge1 in rouge1_list]),
        "rouge1_f1":np.mean([rouge1['f1'] for rouge1 in rouge1_list]),
        "bleu":np.mean(bleu_list),
        "lex_div_ttr":np.mean([lex_div['ttr'] for lex_div in lex_div_list]),
        "lex_div_rttr":np.mean([lex_div['rttr'] for lex_div in lex_div_list]),
        "lex_div_unigram_entropy":np.mean([lex_div['unigram_entropy'] for lex_div in lex_div_list])
    }
    result_file_name = f"{result_path}/evaluation_{conversation_path.split('/')[-1]}.json"
    with open(result_file_name,'w',encoding='utf-8') as file:
        json.dump(result,file)
    print(f"结果已保存到：{result_file_name}")


class EvaluationVisualizer:
    """
    评估指标可视化类
    用于展示和分析隐写文本的各种质量指标
    """
    
    def __init__(self, style='seaborn-v0_8', figsize=(12, 8)):
        """
        初始化可视化器
        
        Args:
            style: matplotlib样式
            figsize: 图表大小
        """
        plt.style.use('default')  # 使用默认样式，避免seaborn版本问题
        sns.set_palette("husl")
        self.figsize = figsize
        self.colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    
    def plot_quality_metrics(self, evaluation_data: Dict, save_path: Optional[str] = None):
        """
        绘制文本质量指标图表
        
        Args:
            evaluation_data: 评估数据字典
            save_path: 保存路径，如果为None则显示图表
        """
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('隐写文本质量指标分析', fontsize=16, fontweight='bold')
        
        rounds_data = evaluation_data['rounds']
        round_numbers = [r['round_number'] for r in rounds_data]
        
        # 1. 困惑度 (PPL)
        ppls = [r['ppl'] for r in rounds_data]
        axes[0, 0].plot(round_numbers, ppls, marker='o', linewidth=2, markersize=6, color=self.colors[0])
        axes[0, 0].set_title('困惑度 (PPL)', fontweight='bold')
        axes[0, 0].set_xlabel('轮次')
        axes[0, 0].set_ylabel('PPL值')
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].axhline(y=np.mean(ppls), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(ppls):.2f}')
        axes[0, 0].legend()
        
        # 2. 语义熵
        entropies = [r['entropy'] for r in rounds_data]
        axes[0, 1].plot(round_numbers, entropies, marker='s', linewidth=2, markersize=6, color=self.colors[1])
        axes[0, 1].set_title('语义熵', fontweight='bold')
        axes[0, 1].set_xlabel('轮次')
        axes[0, 1].set_ylabel('熵值')
        axes[0, 1].grid(True, alpha=0.3)
        axes[0, 1].axhline(y=np.mean(entropies), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(entropies):.2f}')
        axes[0, 1].legend()
        
        # 3. ROUGE-1 F1分数
        rouge1_f1s = [r['rouge1_f1'] for r in rounds_data]
        axes[0, 2].plot(round_numbers, rouge1_f1s, marker='^', linewidth=2, markersize=6, color=self.colors[2])
        axes[0, 2].set_title('ROUGE-1 F1分数', fontweight='bold')
        axes[0, 2].set_xlabel('轮次')
        axes[0, 2].set_ylabel('F1分数')
        axes[0, 2].grid(True, alpha=0.3)
        axes[0, 2].axhline(y=np.mean(rouge1_f1s), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(rouge1_f1s):.3f}')
        axes[0, 2].legend()
        
        # 4. BLEU分数
        bleus = [r['bleu'] for r in rounds_data]
        axes[1, 0].plot(round_numbers, bleus, marker='d', linewidth=2, markersize=6, color=self.colors[3])
        axes[1, 0].set_title('BLEU分数', fontweight='bold')
        axes[1, 0].set_xlabel('轮次')
        axes[1, 0].set_ylabel('BLEU分数')
        axes[1, 0].grid(True, alpha=0.3)
        axes[1, 0].axhline(y=np.mean(bleus), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(bleus):.3f}')
        axes[1, 0].legend()
        
        # 5. 词汇丰富度 (TTR)
        ttrs = [r['lex_div_ttr'] for r in rounds_data]
        axes[1, 1].plot(round_numbers, ttrs, marker='p', linewidth=2, markersize=6, color=self.colors[4])
        axes[1, 1].set_title('词汇丰富度 (TTR)', fontweight='bold')
        axes[1, 1].set_xlabel('轮次')
        axes[1, 1].set_ylabel('TTR值')
        axes[1, 1].grid(True, alpha=0.3)
        axes[1, 1].axhline(y=np.mean(ttrs), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(ttrs):.3f}')
        axes[1, 1].legend()
        
        # 6. Unigram熵
        unigram_entropies = [r['lex_div_unigram_entropy'] for r in rounds_data]
        axes[1, 2].plot(round_numbers, unigram_entropies, marker='h', linewidth=2, markersize=6, color=self.colors[5])
        axes[1, 2].set_title('Unigram熵', fontweight='bold')
        axes[1, 2].set_xlabel('轮次')
        axes[1, 2].set_ylabel('熵值')
        axes[1, 2].grid(True, alpha=0.3)
        axes[1, 2].axhline(y=np.mean(unigram_entropies), color='red', linestyle='--', alpha=0.7, label=f'平均值: {np.mean(unigram_entropies):.2f}')
        axes[1, 2].legend()
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"质量指标图表已保存到: {save_path}")
        else:
            plt.show()
        
        plt.close()
    
    def plot_capacity_analysis(self, evaluation_data: Dict, save_path: Optional[str] = None):
        """
        绘制传输容量分析图表
        
        Args:
            evaluation_data: 评估数据字典
            save_path: 保存路径
        """
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        fig.suptitle('隐写传输容量分析', fontsize=16, fontweight='bold')
        
        capacity_metrics = evaluation_data['average_capacity_metrics']
        
        # 1. 容量指标柱状图
        metrics = ['每轮比特数', '每比特轮数']
        values = [capacity_metrics['bits_per_round'], capacity_metrics['round_per_bit']]
        
        bars = axes[0].bar(metrics, values, color=[self.colors[0], self.colors[1]], alpha=0.7, edgecolor='black')
        axes[0].set_title('传输效率指标', fontweight='bold')
        axes[0].set_ylabel('数值')
        axes[0].grid(True, alpha=0.3, axis='y')
        
        # 在柱状图上添加数值标签
        for bar, value in zip(bars, values):
            axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(values)*0.01,
                        f'{value:.3f}', ha='center', va='bottom', fontweight='bold')
        
        # 2. 轮次与累积比特数关系
        rounds_data = evaluation_data['rounds']
        round_numbers = [r['round_number'] for r in rounds_data]
        cumulative_bits = [i * capacity_metrics['bits_per_round'] for i in range(1, len(round_numbers) + 1)]
        
        axes[1].plot(round_numbers, cumulative_bits, marker='o', linewidth=2, markersize=6, color=self.colors[2])
        axes[1].set_title('累积传输比特数', fontweight='bold')
        axes[1].set_xlabel('轮次')
        axes[1].set_ylabel('累积比特数')
        axes[1].grid(True, alpha=0.3)
        
        # 添加趋势线
        z = np.polyfit(round_numbers, cumulative_bits, 1)
        p = np.poly1d(z)
        axes[1].plot(round_numbers, p(round_numbers), "--", alpha=0.7, color='red', 
                    label=f'趋势线 (斜率: {z[0]:.2f})')
        axes[1].legend()
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"容量分析图表已保存到: {save_path}")
        else:
            plt.show()
        
        plt.close()
    
    def plot_correlation_heatmap(self, evaluation_data: Dict, save_path: Optional[str] = None):
        """
        绘制指标相关性热力图
        
        Args:
            evaluation_data: 评估数据字典
            save_path: 保存路径
        """
        rounds_data = evaluation_data['rounds']
        
        # 构建数据矩阵
        metrics_data = {
            '困惑度': [r['ppl'] for r in rounds_data],
            '语义熵': [r['entropy'] for r in rounds_data],
            'ROUGE-1 F1': [r['rouge1_f1'] for r in rounds_data],
            'BLEU': [r['bleu'] for r in rounds_data],
            'TTR': [r['lex_div_ttr'] for r in rounds_data],
            'RTTR': [r['lex_div_rttr'] for r in rounds_data],
            'Unigram熵': [r['lex_div_unigram_entropy'] for r in rounds_data]
        }
        
        df = pd.DataFrame(metrics_data)
        correlation_matrix = df.corr()
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0,
                   square=True, linewidths=0.5, cbar_kws={"shrink": .8})
        plt.title('评估指标相关性热力图', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"相关性热力图已保存到: {save_path}")
        else:
            plt.show()
        
        plt.close()
    
    def generate_comprehensive_report(self, evaluation_data: Dict, output_dir: str):
        """
        生成综合评估报告
        
        Args:
            evaluation_data: 评估数据字典
            output_dir: 输出目录
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成各种图表
        quality_plot_path = os.path.join(output_dir, "quality_metrics.png")
        capacity_plot_path = os.path.join(output_dir, "capacity_analysis.png")
        correlation_plot_path = os.path.join(output_dir, "correlation_heatmap.png")
        
        self.plot_quality_metrics(evaluation_data, quality_plot_path)
        self.plot_capacity_analysis(evaluation_data, capacity_plot_path)
        self.plot_correlation_heatmap(evaluation_data, correlation_plot_path)
        
        # 生成HTML报告
        html_report_path = os.path.join(output_dir, "evaluation_report.html")
        self._generate_html_report(evaluation_data, html_report_path)
        
        # 生成Markdown报告
        md_report_path = os.path.join(output_dir, "evaluation_report.md")
        self._generate_markdown_report(evaluation_data, md_report_path)
        
        print(f"综合评估报告已生成到: {output_dir}")
        print(f"- HTML报告: {html_report_path}")
        print(f"- Markdown报告: {md_report_path}")
        print(f"- 图表文件: {quality_plot_path}, {capacity_plot_path}, {correlation_plot_path}")
    
    def _generate_html_report(self, evaluation_data: Dict, output_path: str):
        """生成HTML格式的评估报告"""
        config = evaluation_data['experiment_config']
        capacity = evaluation_data['average_capacity_metrics']
        quality = evaluation_data['average_quality_metrics']
        
        html_content = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A2A隐写通信评估报告</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1, h2, h3 {{ color: #2c3e50; }}
        h1 {{ border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        .metric-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }}
        .metric-value {{
            font-size: 1.5em;
            font-weight: bold;
            color: #2c3e50;
        }}
        .metric-label {{
            color: #666;
            font-size: 0.9em;
        }}
        .config-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        .config-table th, .config-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        .config-table th {{
            background: #f8f9fa;
            font-weight: bold;
        }}
        .chart-container {{
            text-align: center;
            margin: 30px 0;
        }}
        .chart-container img {{
            max-width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .timestamp {{
            color: #666;
            font-style: italic;
            text-align: right;
            margin-top: 30px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 A2A隐写通信评估报告</h1>
        
        <h2>📋 实验配置</h2>
        <table class="config-table">
            <tr><th>隐写算法</th><td>{config['steganography_algorithm']}</td></tr>
            <tr><th>对话领域</th><td>{config['question_domain']}</td></tr>
            <tr><th>问题编号</th><td>{config['question_index']}</td></tr>
            <tr><th>总轮数</th><td>{len(evaluation_data['rounds'])}</td></tr>
        </table>
        
        <h2>📊 传输容量指标</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">{capacity['bits_per_round']:.3f}</div>
                <div class="metric-label">平均每轮传输比特数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{capacity['round_per_bit']:.3f}</div>
                <div class="metric-label">平均每比特所需轮数</div>
            </div>
        </div>
        
        <h2>🎯 文本质量指标</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">{quality['ppl']:.2f}</div>
                <div class="metric-label">平均困惑度 (PPL)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{quality['entropy']:.3f}</div>
                <div class="metric-label">平均语义熵</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{quality['rouge1_f1']:.3f}</div>
                <div class="metric-label">平均ROUGE-1 F1</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{quality['bleu']:.3f}</div>
                <div class="metric-label">平均BLEU分数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{quality['lex_div_ttr']:.3f}</div>
                <div class="metric-label">平均词汇丰富度 (TTR)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">{quality['lex_div_unigram_entropy']:.2f}</div>
                <div class="metric-label">平均Unigram熵</div>
            </div>
        </div>
        
        <h2>📈 可视化分析</h2>
        <div class="chart-container">
            <h3>文本质量指标趋势</h3>
            <img src="quality_metrics.png" alt="质量指标图表">
        </div>
        
        <div class="chart-container">
            <h3>传输容量分析</h3>
            <img src="capacity_analysis.png" alt="容量分析图表">
        </div>
        
        <div class="chart-container">
            <h3>指标相关性分析</h3>
            <img src="correlation_heatmap.png" alt="相关性热力图">
        </div>
        
        <div class="timestamp">
            报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </div>
</body>
</html>
        """
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def _generate_markdown_report(self, evaluation_data: Dict, output_path: str):
        """生成Markdown格式的评估报告"""
        config = evaluation_data['experiment_config']
        capacity = evaluation_data['average_capacity_metrics']
        quality = evaluation_data['average_quality_metrics']
        
        md_content = f"""# 🔒 A2A隐写通信评估报告

## 📋 实验配置

| 配置项 | 值 |
|--------|-----|
| 隐写算法 | {config['steganography_algorithm']} |
| 对话领域 | {config['question_domain']} |
| 问题编号 | {config['question_index']} |
| 总轮数 | {len(evaluation_data['rounds'])} |

## 📊 传输容量指标

- **平均每轮传输比特数**: {capacity['bits_per_round']:.3f}
- **平均每比特所需轮数**: {capacity['round_per_bit']:.3f}

## 🎯 文本质量指标

### 自然度指标
- **平均困惑度 (PPL)**: {quality['ppl']:.2f}
  - 数值越低表示文本越自然
- **平均语义熵**: {quality['entropy']:.3f}
  - 数值适中表示语义确定性较好

### 相似度指标
- **平均ROUGE-1 F1**: {quality['rouge1_f1']:.3f}
  - 衡量与原文的词汇重叠度
- **平均BLEU分数**: {quality['bleu']:.3f}
  - 衡量与原文的n-gram相似度

### 词汇丰富度指标
- **平均TTR**: {quality['lex_div_ttr']:.3f}
  - 类型-标记比率，衡量词汇多样性
- **平均RTTR**: {quality['lex_div_rttr']:.3f}
  - 根式TTR，标准化的词汇多样性
- **平均Unigram熵**: {quality['lex_div_unigram_entropy']:.2f}
  - 词汇分布的信息熵

## 📈 可视化分析

### 文本质量指标趋势
![质量指标图表](quality_metrics.png)

### 传输容量分析
![容量分析图表](capacity_analysis.png)

### 指标相关性分析
![相关性热力图](correlation_heatmap.png)

## 📝 评估总结

### 优势分析
- 困惑度: {'较低，文本自然度好' if quality['ppl'] < 50 else '中等' if quality['ppl'] < 100 else '较高，需要改进'}
- ROUGE-1 F1: {'较高，与原文相似度好' if quality['rouge1_f1'] > 0.5 else '中等' if quality['rouge1_f1'] > 0.3 else '较低，需要改进'}
- 传输效率: {'较高' if capacity['bits_per_round'] > 1 else '中等' if capacity['bits_per_round'] > 0.5 else '较低'}

### 改进建议
1. 如果困惑度过高，建议优化隐写算法或调整参数
2. 如果相似度过低，建议增强文本生成的上下文一致性
3. 如果传输效率较低，建议优化编码策略

---
*报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)


def visualize_evaluation_results(evaluation_json_path: str, output_dir: str = None):
    """
    可视化评估结果的便捷函数
    
    Args:
        evaluation_json_path: 评估结果JSON文件路径
        output_dir: 输出目录，如果为None则使用JSON文件所在目录
    """
    # 读取评估数据
    with open(evaluation_json_path, 'r', encoding='utf-8') as f:
        evaluation_data = json.load(f)
    
    # 设置输出目录
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(evaluation_json_path), 'visualization')
    
    # 创建可视化器并生成报告
    visualizer = EvaluationVisualizer()
    visualizer.generate_comprehensive_report(evaluation_data, output_dir)
    
    return output_dir


def batch_visualize_evaluations(evaluation_dir: str, output_base_dir: str = None):
    """
    批量可视化多个评估结果
    
    Args:
        evaluation_dir: 包含评估JSON文件的目录
        output_base_dir: 输出基础目录
    """
    if output_base_dir is None:
        output_base_dir = os.path.join(evaluation_dir, 'batch_visualization')
    
    json_files = [f for f in os.listdir(evaluation_dir) if f.endswith('.json') and f.startswith('evaluation_')]
    
    print(f"发现 {len(json_files)} 个评估文件")
    
    for json_file in json_files:
        print(f"处理文件: {json_file}")
        json_path = os.path.join(evaluation_dir, json_file)
        output_dir = os.path.join(output_base_dir, json_file.replace('.json', ''))
        
        try:
            visualize_evaluation_results(json_path, output_dir)
            print(f"✅ 已完成: {json_file}")
        except Exception as e:
            print(f"❌ 处理失败 {json_file}: {e}")
    
    print(f"批量可视化完成，结果保存在: {output_base_dir}")


# 使用示例
if __name__ == "__main__":
    # 示例：可视化单个评估结果
    # visualize_evaluation_results("path/to/evaluation_result.json")
    
    # 示例：批量可视化
    # batch_visualize_evaluations("path/to/evaluation_results_dir")
    
    pass





