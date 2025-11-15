import argparse
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from transformers import AutoModelForCausalLM, AutoTokenizer
from algo.evaluation import parse_conversation

def parse_args():
    parser = argparse.ArgumentParser(description='AgentStego 评估端')

    parser.add_argument('--evaluation_model','-em',
    default='/root/autodl-fs/Meta-Llama-3-8B-Instruct', 
    help='选择评估模型路径')

    parser.add_argument('--evaluation_conversation','-ec',
    default='data/conversation/conversation_covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126.json',
    help='选择评估对话路径')

    parser.add_argument('--evaluation_precision','-ep',
    default='half',
    help='选择评估精度')

    parser.add_argument('--result_path','-rp',
    default='data/evaluation/',
    help='选择评估结果保存路径')

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.evaluation_precision == 'half':
        model = AutoModelForCausalLM.from_pretrained(args.evaluation_model).half().cuda()
        tokenizer = AutoTokenizer.from_pretrained(args.evaluation_model)
    else:
        model = AutoModelForCausalLM.from_pretrained(args.evaluation_model).cuda()
        tokenizer = AutoTokenizer.from_pretrained(args.evaluation_model)

    parse_conversation(model,tokenizer,args.evaluation_conversation,args.result_path)