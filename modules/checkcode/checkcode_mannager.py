from typing import Tuple
from modules.logging.logging_mannager import LoggingMannager
from modules.math.math import Math
logger=LoggingMannager.get_logger(__name__)
class CheckCodeMannager:
    def __init__(self):
        """初始化校验处理器"""
        # 校验等级定义
        self.TIER_1_MAX = 64     # 一级：1-64 bits
        self.TIER_2_MAX = 512    # 二级：65-512 bit
        self.TIER_3_MAX = 2048   # 三级：513-2048 bit
        self.TIER_4_MAX = 4096   # 四级：2049-4096 bit
        
        # 校验码长度（以位为单位）
        self.CHECKSUM_BITS = {
            1: 16,   # CRC-16
            2: 64,   # 截断SHA-256
            3: 128,  # BLAKE2s-128
            4: 256   # SHA-256
        }
    
    
    def create_checkcode(self, message: str) -> Tuple[str, int]:
        """
        为消息生成校验码
        
        Args:
            message: 原始消息（01字符串）
        Returns:
            tuple: (校验码的二进制字符串, 校验等级)
        """
        message_length = len(message)
        tier = self.get_checkcode_tier_from_length(message_length)
        
        logger.info(f"消息长度: {message_length} 字节，使用校验等级 {tier}")
        
        if tier == 1:
            # 一级：CRC-16
            checksum_bits = Math.calculate_crc16_binary(message)
            logger.info(f"CRC-16校验码: ({checksum_bits})")
            
        elif tier == 2:
            # 二级：截断SHA-256 (前64位)
            checksum_bits = Math.calculate_sha256_truncated_64_binary(message)
            logger.info(f"截断SHA-256校验码: ({checksum_bits})")
            
        elif tier == 3:
            # 三级：BLAKE2s-128 (128位)
            checksum_bits = Math.calculate_blake2s_128_binary(message)
            logger.info(f"BLAKE2s-128校验码: ({checksum_bits})")
            
        elif tier == 4:
            # 四级：完整SHA-256 (256位)
            checksum_bits = Math.calculate_sha256_binary(message)
            logger.info(f"SHA-256校验码: ({checksum_bits})")
        
        return checksum_bits, tier
    def verify_checkcode(self, message: str, received_checksum: str) -> Tuple[bool, int]:
        """
        验证校验码
        
        Args:
            message: 接收到的消息（01字符串）
            received_checksum: 接收到的校验码（二进制字符串）
            
        Returns:
            tuple: (校验是否通过, 校验等级)
        """
        # 重新计算校验码
        expected_checksum, tier = self.create_checkcode(message)
        
        # 比较校验码
        is_valid = expected_checksum == received_checksum
        
        if not is_valid:
            logger.warning("校验未通过")
            logger.warning(f"期望校验码: {expected_checksum}")
            logger.warning(f"接收校验码: {received_checksum}")
        
        return is_valid, tier
    def get_checkcode_length_from_tier(self, tier: int) -> int:
        """
        根据校验等级获取校验码长度
        Args:
            tier: 校验等级
        Returns:
            校验码长度（位）
        """
        return self.CHECKSUM_BITS[tier]
    def get_checkcode_tier_from_length(self, message_length: int) -> int:
        """
        根据消息长度确定校验等级
        Args:
            message_length: 消息长度（bit）
            
        Returns:
            校验等级 (1-4)
        """
        if message_length <= self.TIER_1_MAX:
            return 1
        elif message_length <= self.TIER_2_MAX:
            return 2
        elif message_length <= self.TIER_3_MAX:
            return 3
        elif message_length <= self.TIER_4_MAX:
            return 4
        else:
            raise ValueError(f"消息长度 {message_length} 字节超过最大支持的 {self.TIER_4_MAX} 字节")