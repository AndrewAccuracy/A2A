from datetime import datetime, timezone
import hashlib
import crcmod
import crcmod.predefined
import base64
class Math:
    def __init__(self):
        pass
    
    @staticmethod
    def timestamp_to_iso8601(timestamp: float) -> str:
        """
        将Unix时间戳转换为ISO 8601格式 (YYYY-MM-DDTHH:MM:SSZ)
        
        Args:
            timestamp: Unix时间戳 (float)
            
        Returns:
            ISO 8601格式的时间字符串
        """
        if timestamp is None:
            # 如果时间戳为None，返回当前时间
            return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    @staticmethod
    def iso8601_to_timestamp(iso_string: str) -> float:
        """
        将ISO 8601格式时间字符串转换为Unix时间戳
        
        Args:
            iso_string: ISO 8601格式的时间字符串
            
        Returns:
            Unix时间戳 (float)
        """
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        return dt.timestamp()
    
    @staticmethod
    def current_timestamp_iso8601() -> str:
        """
        获取当前时间的ISO 8601格式字符串
        
        Returns:
            当前时间的ISO 8601格式字符串
        """
        return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    @staticmethod
    def binary_string_to_base64(binary_str: str) -> str:
        """
        将01字符串转换为base64编码
        
        Args:
            binary_str: 01组成的字符串
            
        Returns:
            base64编码的字符串
        """
        # 确保二进制字符串长度是8的倍数（左侧补零）
        remainder = len(binary_str) % 8
        if remainder != 0:
            binary_str = '0' * (8 - remainder) + binary_str
        
        # 将二进制字符串转换为字节
        byte_data = bytearray()
        for i in range(0, len(binary_str), 8):
            byte_chunk = binary_str[i:i+8]
            byte_value = int(byte_chunk, 2)
            byte_data.append(byte_value)
        
        # 转换为base64
        base64_encoded = base64.b64encode(bytes(byte_data)).decode('utf-8')
        return base64_encoded
    
    @staticmethod
    def base64_to_binary_string(base64_str: str) -> str:
        """
        将base64字符串转换回01字符串
        
        Args:
            base64_str: base64编码的字符串
            
        Returns:
            01组成的二进制字符串
        """
        # 解码base64
        byte_data = base64.b64decode(base64_str.encode('utf-8'))
        
        # 转换为二进制字符串
        binary_str = ''.join(format(byte, '08b') for byte in byte_data)
        return binary_str

    @staticmethod
    def string_to_binary(message: str) -> str:
        """
        将任意字符串转换为二进制字符串（01格式）
        参数:
            message: 要转换的任意字符串
        返回:
            二进制字符串（01格式）
        """
        byte_data = message.encode('utf-8')
        return ''.join(format(byte, '08b') for byte in byte_data)

    @staticmethod
    def hex_to_binary(hex_string: str) -> str:
        """
        将十六进制字符串转换为二进制字符串（01格式）
        参数:
            hex_string: 十六进制字符串
        返回:
            二进制字符串（01格式）
        """
        return bin(int(hex_string, 16))[2:].zfill(len(hex_string) * 4)
    @staticmethod
    def calculate_crc4_binary(message: str) -> str:
        """
        计算任意字符串的CRC-4校验值并返回二进制字符串
        参数:
            message: 要计算校验值的任意字符串
        返回:
            CRC-4校验值的二进制字符串（4位）
        """
        # 将字符串转换为字节数据
        byte_data = message.encode('utf-8')
        
        # 手动实现CRC-4算法，使用多项式 x^4 + x + 1 (0x13)
        # 初始化CRC值为0
        crc = 0
        
        # 处理每个字节
        for b in byte_data:
            # 将字节与CRC的高4位进行异或
            crc ^= (b << 4) & 0xF0
            
            # 处理这个字节的8位
            for _ in range(8):
                # 如果最高位为1，则移位并与多项式异或
                if crc & 0x80:
                    crc = ((crc << 1) ^ 0x13) & 0xFF
                else:
                    crc = (crc << 1) & 0xFF
        
        # 取最终结果的高4位作为CRC-4值
        crc_value = (crc >> 4) & 0x0F
        
        # 转换为4位二进制字符串
        return format(crc_value, '04b')
    
    @staticmethod
    def calculate_crc16_binary(message: str) -> str:
        """
        计算任意字符串的CRC-16校验值并返回二进制字符串
        参数:
            message: 要计算校验值的任意字符串
        返回:
            CRC-16校验值的二进制字符串（16位）
        """
        # 将字符串转换为字节数据
        byte_data = message.encode('utf-8')
        
        # 使用预定义的CRC-16算法
        crc16_func = crcmod.predefined.mkPredefinedCrcFun('crc-16')
        crc_value = crc16_func(byte_data)
        
        # 转换为16位二进制字符串
        return format(crc_value, '016b')

    @staticmethod
    def calculate_sha256_truncated_64_binary(message: str) -> str:
        """
        计算任意字符串的SHA-256哈希值并返回前64位的二进制字符串
        参数:
            message: 要计算哈希的任意字符串
        返回:
            SHA-256哈希值的前64位二进制字符串
        """
        # 将字符串转换为字节数据
        byte_data = message.encode('utf-8')
        hex_hash = hashlib.sha256(byte_data).hexdigest()
        # 取前16个十六进制字符（64位）
        truncated_hex = hex_hash[:16]
        return Math.hex_to_binary(truncated_hex)

    @staticmethod
    def calculate_blake2s_128_binary(message: str) -> str:
        """
        计算任意字符串的BLAKE2s-128哈希值并返回二进制字符串
        参数:
            message: 要计算哈希的任意字符串
        返回:
            BLAKE2s-128哈希值的二进制字符串（128位）
        """
        # 将字符串转换为字节数据
        byte_data = message.encode('utf-8')
        hash_obj = hashlib.blake2s(byte_data, digest_size=16)  # 16字节 = 128位
        hex_hash = hash_obj.hexdigest()
        return Math.hex_to_binary(hex_hash)

    @staticmethod
    def calculate_sha256_binary(message: str) -> str:
        """
        计算任意字符串的完整SHA-256哈希值并返回二进制字符串
        参数:
            message: 要计算哈希的任意字符串
        返回:
            完整SHA-256哈希值的二进制字符串（256位）
        """
        # 将字符串转换为字节数据
        byte_data = message.encode('utf-8')
        hex_hash = hashlib.sha256(byte_data).hexdigest()
        return Math.hex_to_binary(hex_hash)
    
    @staticmethod
    def binary_to_hex(binary_str: str) -> str:
        """
        将01字符串转换为十六进制字符串
        
        Args:
            binary_str: 01组成的字符串，如 "0110100001100101"
            
        Returns:
            十六进制字符串，如 "6865"
        """
        # 确保二进制字符串长度是4的倍数（左侧补零）
        remainder = len(binary_str) % 4
        if remainder != 0:
            binary_str = '0' * (4 - remainder) + binary_str
        
        # 将二进制字符串转换为十六进制
        hex_result = ""
        for i in range(0, len(binary_str), 4):
            # 取4位二进制
            chunk = binary_str[i:i+4]
            # 转换为十进制再转为十六进制
            hex_digit = hex(int(chunk, 2))[2:]  # [2:]去掉'0x'前缀
            hex_result += hex_digit
        
        return hex_result.upper()  # 返回大写十六进制
    


if __name__ == "__main__":
    test_string = "Hello World!"
    
    print(f"CRC-16: {len(Math.calculate_crc16_binary(test_string))}")
    print(f"SHA-256 Truncated 64-bit: {len(Math.calculate_sha256_truncated_64_binary(test_string))}")
    print(f"BLAKE2s-128: {len(Math.calculate_blake2s_128_binary(test_string))}")
    print(f"SHA-256 Full: {len(Math.calculate_sha256_binary(test_string))}")
    print(f"CRC-4: {len(Math.calculate_crc4_binary(test_string))}")
    
    # 测试新添加的二进制转十六进制功能
    print("\n=== 二进制转十六进制测试 ===")
    binary_test = "0110100001100101011011000110110001101111"  # "hello"的二进制
    hex_result = Math.binary_to_hex(binary_test)
    print(f"二进制: {binary_test}")
    print(f"十六进制: {hex_result}")
    
    # 反向测试
    binary_back = Math.hex_to_binary(hex_result)
    print(f"转回二进制: {binary_back}")
    print(f"验证正确: {binary_test.ljust(len(binary_back), '0') == binary_back}")
    
    # 测试CRC-4功能
    print("\n=== CRC-4测试 ===")
    test_strings = ["Hello", "World", "Hello World!", "1234567890"]
    for test in test_strings:
        crc4 = Math.calculate_crc4_binary(test)
        print(f"字符串: '{test}' 的CRC-4值: {crc4} (十六进制: {Math.binary_to_hex(crc4)})")