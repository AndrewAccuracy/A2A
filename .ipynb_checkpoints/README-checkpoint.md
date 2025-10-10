# A2A Steganography Communication System


## 项目结构

```
a2a_stego_project_v4/
├── config.py                 # 系统配置文件
├── server/                   # 服务端代码
│   ├── main.py              # 服务端启动入口
│   └── a2aserver/           # 服务端核心模块
│       ├── agent.py         # Agent实现
│       └── agent_executor.py # Agent执行器
├── client/                   # 客户端代码
│   ├── main.py              # 客户端启动入口
│   └── a2aclient/           # 客户端核心模块
│       └── client.py        # 客户端实现
├── modules/                  # 核心功能模块
│   ├── checkcode/           # 校验码管理
│   ├── hash/                # 哈希函数
│   ├── logging/             # 日志管理
│   ├── package_head/        # 数据包头管理
│   ├── stego/               # 隐写核心算法
│   └── timestamp/           # 时间戳管理
└── data/                    # 数据目录
    ├── logs/                # 日志文件
    └── stego/               # 隐写相关文件
```

## 核心模块详解

### 1. checkcode/ - 校验码管理模块

**功能**: 提供多级校验码生成和验证机制，确保消息完整性

**核心组件**:
- `CheckCodeMannager`: 校验码管理器，支持四级校验体系
  - **一级 (1-64 bits)**: CRC-16校验 (16位)
  - **二级 (65-512 bits)**: 截断SHA-256校验 (64位)
  - **三级 (513-2048 bits)**: BLAKE2s-128校验 (128位)
  - **四级 (2049-4096 bits)**: 完整SHA-256校验 (256位)

**特点**: 根据消息长度自动选择合适的校验等级，平衡安全性和效率

### 2. hash/ - 哈希函数模块

**功能**: 提供多种哈希算法实现

**核心组件**:
- `HashFunctions`: 哈希函数工具类
  - `calculate_crc16_binary()`: CRC-16计算
  - `calculate_sha256_truncated_64_binary()`: 截断SHA-256计算
  - `calculate_blake2s_128_binary()`: BLAKE2s-128计算
  - `calculate_sha256_binary()`: 完整SHA-256计算
  - `string_to_binary()`: 字符串到二进制转换
  - `hex_to_binary()`: 十六进制到二进制转换

### 3. logging/ - 日志管理模块

**功能**: 统一的日志管理系统

**核心组件**:
- `LoggingMannager`: 日志管理器
  - 支持彩色控制台输出
  - 自动文件日志记录
  - 全局日志配置管理
- `ColoredFormatter`: 彩色日志格式化器

**特点**: 自动创建日志目录，支持同时输出到控制台和文件

### 4. package_head/ - 数据包头管理模块

**功能**: 处理数据包的头部信息，支持分包传输

**核心组件**:
- `PackageHead`: 包头处理器
  - **TDS** (12位): 传输数据段总数
  - **SN** (6位): 数据段序号 (0-63)
  - **F** (1位): 结束标志位

**包头格式**:
- **第一个包**: TDS(12) + SN(6) + F(1) = 19位
- **后续包**: SN(6) + F(1) = 7位

**特点**: 自动识别包类型，支持最大4095个数据段

### 5. stego/ - 隐写核心模块

**功能**: 隐写算法的核心实现

**核心组件**:
- `Stego`: 隐写主类
  - 支持多种隐写算法 (DISCOP, DISCOP_BASE, AC)
  - 集成大语言模型
  - 自动种子生成和管理
- `baselines/`: 基础算法实现
  - `encode.py`: 编码算法
  - `decode.py`: 解码算法
  - `utils.py`: 工具函数

**支持的算法**:
- **DISCOP**: 高精度离散采样算法
- **DISCOP_BASE**: 基础版本DISCOP算法
- **AC**: 算术编码算法

### 6. timestamp/ - 时间戳管理模块

**功能**: 基于密钥的时间戳验证机制

**核心组件**:
- `TimestampMannager`: 时间戳管理器
  - `get_valid_timestamp()`: 生成有效时间戳
  - `is_valid_timestamp()`: 验证时间戳有效性

**验证机制**: 使用密钥+时间戳的SHA-256哈希值末尾为'0'作为验证条件

## 配置文件说明 (config.py)

### 基础配置
```python
# 基础参数
TIMESTAMP_MAX_TRY = 6           # 时间戳最大尝试次数
STEGO_KEY = "what the fuck"     # 隐写密钥
CLIENT_LOG_PATH = "data/logs/client"  # 客户端日志路径
SERVER_LOG_PATH = "data/logs/server"  # 服务端日志路径
```

### 模型配置
```python
# Agent模型配置 (服务端回复用)
AGENT_MODEL_CONFIG = {
    "model": "gemini/gemini-2.0-flash"  # 支持 gemini/deepseek/openai
}

# 隐写模型配置 (隐写算法用)
LLM_CONFIG = {
    "model_name_or_path": "/root/autodl-tmp/Meta-Llama-3-8B-Instruct",
    "precision": "half",
    "max_new_tokens": 256,
    "base_prompt": "旅行专家对话模板..."
}
```

### 算法配置
```python
ALGORITHM_CONFIG = {
    "algorithm": "discop",  # 支持: discop, discop_base, ac
    "seed": 42,            # 随机种子
    "discop": {
        "precision": 52,    # 精度设置
        "input_key": "...", # 输入密钥
        "sample_seed_prefix": "73616d706c65",
        "input_nonce": "00000000000000000000000000000000"
    }
}
```

### 文件路径配置
```python
# 隐写相关文件路径
STEGO_SECRET_MESSAGE_PATH = "data/stego/secret_bits.txt"      # 待发送的秘密消息
STEGO_DECRYPT_MESSAGE_PATH = "data/stego/decrypted_bits.txt"  # 解密后的消息
```

## 使用方法

### 环境准备

1. **创建API密钥文件** (.env)
```bash
# 根据使用的模型选择相应的API Key
GEMINI_API_KEY=your_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

2. **准备秘密消息文件**
```bash
# 创建待传输的秘密消息 (二进制格式)
echo "1010101100110011" > data/stego/secret_bits.txt
```

### 启动系统

1. **启动服务端**
```bash
python server/main.py
```
服务端将在 `Config.SERVER_URL` 启动，等待客户端连接。

2. **启动客户端**
```bash
python client/main.py
```
客户端将自动连接服务端并开始隐写通信。

### 通信流程

1. **握手阶段**: 客户端发送特殊时间戳验证身份
2. **隐写传输**: 客户端将秘密消息分包并通过对话传输
3. **消息重组**: 服务端接收并重组完整消息
4. **校验验证**: 服务端验证消息完整性
5. **确认回复**: 服务端通过特殊时间戳确认接收成功

## 日志说明

系统会自动生成详细的日志文件：
- **客户端日志**: `data/logs/client/client_YYYYMMDD_HHMMSS.log`
- **服务端日志**: `data/logs/server/server_YYYYMMDD_HHMMSS.log`

日志包含完整的通信过程、加密解密状态、错误信息等，便于调试和监控。

## AgentStego 问题使用指南

AgentStego 现在支持从不同领域的问题库中选择握手问题，而不是使用硬编码的问题。

### 支持的问题领域

#### 1. Philosophy (哲学思辨)
- **文件**: `data/question/philosophy.txt`
- **问题列表**:
  - 问题 0: 关于存在主义哲学中萨特和加缪对"自由"和"荒谬"概念的观点比较
  - 问题 1: 关于功利主义和义务论伦理学理论，以及边沁和康德的核心论点
  - 问题 2: 关于社会契约论，比较霍布斯、洛克和卢梭的理论差异

#### 2. Art (艺术史)
- **文件**: `data/question/art.txt`  
- **问题列表**:
  - 问题 0: 关于日本主义对欧洲印象派画家的影响
  - 问题 1: 关于包豪斯运动的核心设计理念和代表作品
  - 问题 2: 关于从文艺复兴到巴洛克艺术的风格演变

#### 3. General Knowledge (通用知识)
- **文件**: `data/question/general.txt`
- **问题列表**:
  - 问题 0: 关于个人电脑(PC)的历史发展
  - 问题 1: 关于DNA双螺旋结构的发现过程
  - 问题 2: 关于2008年全球金融危机的成因和影响

### 使用方法

#### 基本用法
```bash
# 使用默认设置（通用知识领域，第0个问题）
python client/main.py

# 指定领域
python client/main.py --domain philosophy
python client/main.py --domain art
python client/main.py --domain general

# 指定领域和问题编号
python client/main.py --domain philosophy --question 0
python client/main.py -d art -q 1
python client/main.py -d general -q 2
```

#### 命令行参数
- `--domain, -d`: 选择问题领域
  - `philosophy`: 哲学思辨
  - `art`: 艺术史
  - `general`: 通用知识
- `--question, -q`: 选择问题编号（从0开始）

#### 示例
```bash
# 使用哲学领域的第0个问题（存在主义）
python client/main.py -d philosophy -q 0

# 使用哲学领域的第1个问题（伦理学）
python client/main.py -d philosophy -q 1

# 使用哲学领域的第2个问题（政治哲学）
python client/main.py -d philosophy -q 2

# 使用艺术领域的第1个问题（包豪斯）
python client/main.py -d art -q 1

# 使用通用知识领域的第1个问题（DNA发现）
python client/main.py -d general -q 1
```

### 问题详细内容

#### Philosophy (哲学思辨)
- **问题 0**: 存在主义哲学比较
- **问题 1**: 伦理学理论对比（功利主义 vs 义务论）
- **问题 2**: 社会契约论比较（霍布斯、洛克、卢梭）

#### Art (艺术史)
- **问题 0**: 日本主义对印象派的影响
- **问题 1**: 包豪斯运动设计理念
- **问题 2**: 文艺复兴到巴洛克的风格演变

#### General Knowledge (通用知识)
- **问题 0**: PC发展历史
- **问题 1**: DNA双螺旋发现过程
- **问题 2**: 2008年金融危机分析

### 扩展问题库

您可以通过编辑 `data/question/` 目录下的文件来添加更多问题：

1. 在对应领域的文件中添加新问题（每行一个）
2. 使用 `--question` 参数选择不同的问题编号

每个领域目前包含3个精心设计的问题，涵盖了不同深度和角度的讨论主题。

## 一些建议
1. 如果想要增加隐写算法，只需要创建一个类，并且暴露出以下两个函数：

   ~~~python
   def encrypt(self, bit_stream, prompt_text):
           """
           加密函数：将比特流嵌入到生成的文本中
           
           Args:
               bit_stream (str): 要嵌入的01字符串
               prompt_text (str): 上下文提示
               
           Returns:
               tuple: (隐写文本, 实际嵌入的比特数量, 生成的token ID序列)
           """
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
   ~~~

   然后修改client/a2aclient/client.py中的：

   ~~~python
   self.stego_model=Stego()# 修改成你创建的类
   ~~~

   以及server/a2aserver/agent.py中的：

   ~~~python
   self.stego_model=Stego()# 修改成你创建的类
   ~~~

2. 尽可能不要使用deepseek！不是因为有BUG，而是回复真的很慢，用Gemini回复速度可以快2倍
