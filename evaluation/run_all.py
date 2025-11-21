import argparse
import glob
import os
import sys
from typing import List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from transformers import AutoModelForCausalLM, AutoTokenizer

from algo.evaluation import parse_conversation


def collect_conversations(conversation_glob: str) -> List[str]:
    files = glob.glob(conversation_glob, recursive=True)
    filtered = []
    for path in files:
        if not os.path.isfile(path):
            continue
        if not path.lower().endswith(".json"):
            continue
        if "-checkpoint" in os.path.basename(path):
            continue
        filtered.append(path)
    return sorted(filtered)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Batch evaluation runner for AgentStego conversations"
    )
    parser.add_argument(
        "--evaluation_model",
        "-em",
        default="/root/autodl-fs/Meta-Llama-3-8B-Instruct",
        help="Path to the evaluation model",
    )
    parser.add_argument(
        "--conversation_glob",
        "-cg",
        default="data/conversation/**/*.json",
        help="Glob pattern used to discover conversation JSON files",
    )
    parser.add_argument(
        "--evaluation_precision",
        "-ep",
        default="half",
        choices=["half", "full"],
        help="Precision to load the evaluation model",
    )
    parser.add_argument(
        "--result_path",
        "-rp",
        default="data/evaluation/",
        help="Directory to store evaluation outputs",
    )
    parser.add_argument(
        "--skip_existing",
        action="store_true",
        help="Skip conversations whose evaluation file already exists",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-evaluation of all conversations, overwriting existing results",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    conversations = collect_conversations(args.conversation_glob)
    if not conversations:
        print(f"No conversation files found with glob '{args.conversation_glob}'.")
        return

    print(f"Found {len(conversations)} conversation files. Loading model...")

    model = AutoModelForCausalLM.from_pretrained(args.evaluation_model)
    if args.evaluation_precision == "half":
        model = model.half()
    model = model.cuda()
    tokenizer = AutoTokenizer.from_pretrained(args.evaluation_model)

    os.makedirs(args.result_path, exist_ok=True)

    for idx, conversation_path in enumerate(conversations, 1):
        result_file = os.path.join(
            args.result_path,
            f"evaluation_{os.path.basename(conversation_path)}.json",
        )
        if args.skip_existing and not args.force and os.path.exists(result_file):
            print(f"[{idx}/{len(conversations)}] Skipping {conversation_path} (exists)")
            continue

        print(f"[{idx}/{len(conversations)}] Evaluating {conversation_path}")
        try:
            parse_conversation(model, tokenizer, conversation_path, args.result_path)
        except Exception as exc:  # pylint: disable=broad-except
            print(f"Failed to evaluate {conversation_path}: {exc}")
        else:
            print(f"Saved -> {result_file}")


if __name__ == "__main__":
    main()

