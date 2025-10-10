from typing import Optional
from modules.math.math import Math


class PackageHead:
    """
    包头处理器，负责TDS、SN、F三个包头参数的编码和解码
    """
    
    def __init__(self):
        """初始化包头处理器"""
        self.TDS_BITS = 12  # TDS字段长度为12位
        self.SN_BITS = 6    # SN字段长度为6位
        self.F_BITS = 1     # F字段长度为1位
        self.CHECK_BITS = 4 # 校验位长度为4位
        self.MAX_TDS = (1 << self.TDS_BITS) - 1  # TDS最大值：4095
        self.MAX_SN = (1 << self.SN_BITS) - 1    # SN最大值：63
    def create_package_head(self, TDS:int , SN:int , is_final:bool)->str:
        """
        创建包头函数
        Args:
            TDS: 传输数据段数 (仅第一个包需要)
            SN: 数据段序号 (SN=0为第一个包，SN≠0为后续包)
            is_final: 是否是最后一个数据段
        Returns:
            str: 包头01字符串
        """
        if(TDS > self.MAX_TDS or SN > self.MAX_SN):
            raise ValueError("TDS or SN is out of range")
        F = 1 if is_final else 0
        
        if SN == 0:
            # 第一个包: TDS+SN+F
            package_head = f"{TDS:0{self.TDS_BITS}b}{SN:0{self.SN_BITS}b}{F:0{self.F_BITS}b}"
        else:
            # 后续包: SN+F
            package_head = f"{SN:0{self.SN_BITS}b}{F:0{self.F_BITS}b}"
        package_head += Math.calculate_crc4_binary(package_head)
        return package_head
    
    def parse_first_package(self, package_head: str) -> tuple[int, int ,bool, str]:
        """
        解析第一个包的包头
        Args:
            package_head: 包头01字符串
        Returns:
            tuple[int, int ,bool, str]: (TDS, SN, is_final, checkcode)
        """
        if len(package_head) <= self.TDS_BITS + self.SN_BITS + self.F_BITS:
            raise ValueError(f"第一个包包头长度应为{self.TDS_BITS + self.SN_BITS + self.F_BITS}位")
        
        # 解析TDS (前12位)
        TDS = int(package_head[:self.TDS_BITS], 2)
        
        # 解析SN (中间6位) - 第一个包SN应该为0
        SN = int(package_head[self.TDS_BITS:self.TDS_BITS + self.SN_BITS], 2)
        if SN != 0:
            raise ValueError("第一个包的SN必须为0")
        
        # 解析F (1位)
        F = int(package_head[self.TDS_BITS + self.SN_BITS:self.TDS_BITS + self.SN_BITS+1], 2)
        is_final = bool(F)

        # 解析校验码 (最后4位)
        checkcode = package_head[self.TDS_BITS + self.SN_BITS + self.F_BITS:]
        
        return TDS, SN, is_final, checkcode
    
    def parse_other_package(self, package_head: str) -> tuple[int, bool, str]:
        """
        解析其他包(非第一个包)的包头
        Args:
            package_head: 包头01字符串
        Returns:
            tuple[int, bool, str]: (SN, is_final, checkcode)    
        """
        if len(package_head) <= self.SN_BITS + self.F_BITS:
            raise ValueError(f"其他包包头长度应为{self.SN_BITS + self.F_BITS}位")
        
        # 解析SN (前6位) - 其他包SN应该不为0
        SN = int(package_head[:self.SN_BITS], 2)
        if SN == 0:
            raise ValueError("其他包的SN不能为0")
        
        # 解析F (1位)
        F = int(package_head[self.SN_BITS:self.SN_BITS+1], 2)
        is_final = bool(F)
        
        # 解析校验码 (最后4位)
        checkcode = package_head[self.SN_BITS + self.F_BITS:]
        
        return SN, is_final, checkcode
    
    

    
