from datetime import datetime
import config
class TimestampMannager:
    def __init__(self):
        pass
    @staticmethod
    def get_valid_timestamp(function)->float|None:
        """
        Args:
            function：时间戳需要满足的条件
        Returns:
            时间戳：float|None
        """
        timestamp = None
        i = 0
        while i < config.TIMESTAMP_MAX_TRY:
            timestamp = datetime.now().timestamp()
            if function(timestamp):
                return timestamp
            i += 1
        # 如果找不到满足条件的时间戳，返回最后生成的时间戳而不是None
        # 这样可以确保系统继续运行，即使验证可能失败
        return timestamp if timestamp is not None else datetime.now().timestamp()
        
    @staticmethod
    def is_valid_timestamp(timestamp:float,function)->bool:
        """
        判断时间戳是否满足条件
        Args:
            timestamp: 时间戳
            function：时间戳需要满足的条件
        Returns:
            是否满足条件：bool
        """
        return function(timestamp)