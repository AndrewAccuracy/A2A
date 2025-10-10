# 随机生成512个和1024个bit到data/stego/secret_bits_512.txt
import random
import os

def generate_random_bits(num_bits):
    """生成指定数量的随机二进制位"""
    return ''.join(random.choice('01') for _ in range(num_bits))

def save_bits_to_file(bits, filepath):
    """将二进制位保存到文件"""
    # 确保目录存在
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(bits)
    
    print(f"已生成 {len(bits)} 位随机二进制数据到: {filepath}")

def main():
    """主函数：生成512位和1024位随机数据"""
    print("开始生成随机二进制数据...")
    
    # 生成512位随机二进制数据
    bits_512 = generate_random_bits(512)
    save_bits_to_file(bits_512, "data/stego/secret_bits_512.txt")
    
    # 生成1024位随机二进制数据
    bits_1024 = generate_random_bits(1024)
    save_bits_to_file(bits_1024, "data/stego/secret_bits_1024.txt")
    
    print("所有随机二进制数据生成完成！")
    
    # 显示生成的数据预览
    print(f"\n512位数据预览 (前50位): {bits_512[:50]}...")
    print(f"1024位数据预览 (前50位): {bits_1024[:50]}...")

if __name__ == "__main__":
    main()

