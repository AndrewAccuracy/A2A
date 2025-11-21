#!/usr/bin/env python3
"""
分类评估结果文件到art和general目录
"""
import json
import os
import shutil
from pathlib import Path


def classify_evaluations(evaluation_dir: str = "data/evaluation"):
    """将评估结果文件按领域分类到art和general目录"""
    evaluation_path = Path(evaluation_dir)
    
    # 创建分类目录
    art_dir = evaluation_path / "art"
    general_dir = evaluation_path / "general"
    art_dir.mkdir(exist_ok=True)
    general_dir.mkdir(exist_ok=True)
    
    # 统计信息
    art_count = 0
    general_count = 0
    other_count = 0
    
    # 遍历所有评估结果文件
    for eval_file in evaluation_path.glob("evaluation_*.json.json"):
        try:
            with open(eval_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 获取question_domain
            question_domain = data.get('experiment_config', {}).get('question_domain', '')
            
            # 判断分类
            if 'art' in question_domain.lower():
                target_dir = art_dir
                art_count += 1
            elif 'general' in question_domain.lower():
                target_dir = general_dir
                general_count += 1
            else:
                # 如果无法从question_domain判断，尝试从conversation_info判断
                conversation_info = data.get('conversation_info', '')
                if '/art/' in conversation_info:
                    target_dir = art_dir
                    art_count += 1
                elif '/general/' in conversation_info:
                    target_dir = general_dir
                    general_count += 1
                else:
                    print(f"无法分类: {eval_file.name} (question_domain: {question_domain})")
                    other_count += 1
                    continue
            
            # 移动文件
            target_path = target_dir / eval_file.name
            shutil.move(str(eval_file), str(target_path))
            print(f"已移动: {eval_file.name} -> {target_dir.name}/")
            
        except Exception as e:
            print(f"处理文件 {eval_file.name} 时出错: {e}")
            other_count += 1
    
    # 打印统计信息
    print(f"\n分类完成:")
    print(f"  Art: {art_count} 个文件")
    print(f"  General: {general_count} 个文件")
    if other_count > 0:
        print(f"  无法分类: {other_count} 个文件")


if __name__ == "__main__":
    classify_evaluations()

