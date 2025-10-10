import secrets
import subprocess
import itertools
import time
import os
import signal
import asyncio
from datetime import datetime

# 三个领域
domain_list = ["data/question/general.txt"]
# 三个问题
question_index_list = [0]
# 两个隐写算法
stego_algorithm_list = ["discop"]#
# 两个模型
stego_model_list = ["/root/autodl-tmp/Llama-3.2-3B-Instruct"]#,"/root/autodl-tmp/Qwen2-7B-Instruct"]
# 两个密文，512和1024bits
secret_message_list = ["data/stego/secret_bits_512.txt"]

def run_experiment(domain, question_index, algorithm, model, secret_message, run_num):
    """运行单个实验配置"""
    print(f"开始第 {run_num} 次运行:")
    print(f"  领域: {os.path.basename(domain)}")
    print(f"  问题索引: {question_index}")
    print(f"  隐写算法: {algorithm}")
    print(f"  模型: {os.path.basename(model)}")
    print(f"  密文文件: {os.path.basename(secret_message)}")
    
    # 生成会话ID，包含运行次数
    session_id = f"experiment-{algorithm}-{model.split('/')[-1]}-{domain.split('/')[-1]}-{question_index}-{secret_message.split('/')[-1]}-{run_num}"
    
    # 启动服务器
    server_cmd = [
        "python", "server/main.py",
        "--stego_model_path", model,
        "--stego_algorithm", algorithm,
        "--decrypted_bits_path",f"data/stego/decrypted_bits_{session_id}.txt",
        "--session_id",session_id
    ]
    
    print("启动服务器...")
    server_process = subprocess.Popen(server_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # 等待服务器启动
    time.sleep(10)
    client_process = None
    try:
        # 运行客户端
        client_cmd = [
            "python", "client/main.py",
            "--stego_model_path", model,
            "--stego_algorithm", algorithm,
            "--question_path", domain,
            "--question_index", str(question_index),
            "--session_id", session_id,
            "--secret_bit_path", secret_message
        ]
        print("启动客户端...")
        # 检查服务器是否还在运行
        if server_process.poll() is not None:
            print("服务器已停止，跳过客户端执行")
            return False
            
        client_result = subprocess.run(client_cmd, capture_output=True, text=True)
        
        print("客户端已停止，准备停止服务器...")
        print("客户端输出:")
        print(client_result.stdout)
        if client_result.stderr:
            print("客户端错误:")
            print(client_result.stderr)
            
        # 记录实验结果
        success = client_result.returncode == 0
        
    
        return success
        
    except Exception as e:
        print(f"客户端执行出错: {e}，立即停止服务器...")
        return False
    finally:
        # 无论客户端如何停止，都立即停止服务器
        print("客户端已停止，正在终止服务器...")
        # 强制终止服务器进程
        if server_process.poll() is None:  # 如果服务器还在运行
            print("发送终止信号到服务器...")
            server_process.terminate()
            try:
                # 等待服务器关闭
                server_process.wait(timeout=3)
                print("服务器已关闭")
            except subprocess.TimeoutExpired:
                print("服务器未响应终止信号，强制杀死进程...")
                server_process.kill()
                server_process.wait()
                print("服务器已被强制终止")
        else:
            print("服务器已经停止")
        
        # 等待端口释放
        print("等待端口释放...")
        time.sleep(2)


def main():
    """主函数：遍历所有参数组合"""
    print("开始批量实验...")
    base_combinations = len(domain_list) * len(question_index_list) * len(stego_algorithm_list) * len(stego_model_list) * len(secret_message_list)
    runs_per_experiment = 3
    total_runs = base_combinations * runs_per_experiment
    print(f"参数组合数: {base_combinations}")
    print(f"每组运行次数: {runs_per_experiment}")
    print(f"总实验运行数: {total_runs}")
    
    experiment_count = 0
    successful_count = 0
    

    total_experiments = len(domain_list) * len(question_index_list) * len(stego_algorithm_list) * len(stego_model_list) * len(secret_message_list) * runs_per_experiment
    
    # 遍历所有参数组合
    for domain, question_index, algorithm, model, secret_message in itertools.product(
        domain_list, question_index_list, stego_algorithm_list, stego_model_list, secret_message_list
    ):
        print(f"\n{'='*60}")
        print(f"参数组合: {os.path.basename(domain)}-Q{question_index}-{algorithm}-{os.path.basename(model)}-{os.path.basename(secret_message)}")
        print(f"{'='*60}")
        
        # 每个参数组合运行3次
        for run_num in range(1, runs_per_experiment + 1):
            experiment_count += 1
            print(f"\n>>> 第 {run_num} 次运行 (总进度: {experiment_count}/{total_experiments})")
            
            try:
                success = run_experiment(domain, question_index, algorithm, model, secret_message, run_num)
                if success:
                    successful_count += 1
                    print(f"✓ 第 {run_num} 次运行成功完成")
                else:
                    print(f"✗ 第 {run_num} 次运行失败")
            except Exception as e:
                print(f"✗ 第 {run_num} 次运行执行异常: {e}")
                
    
    print(f"\n实验完成!")
    print(f"总实验数: {experiment_count}")
    print(f"成功实验数: {successful_count}")
    print(f"失败实验数: {experiment_count - successful_count}")
    

if __name__ == "__main__":
    main()







