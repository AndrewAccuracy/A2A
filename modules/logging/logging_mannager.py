import logging
import colorlog
import os

color={
    "INFO":"green",
    "WARNING":"yellow",
    "ERROR":"red"
}

class CustomFilter(logging.Filter):
    """自定义过滤器，过滤掉HTTP请求和第三方库的日志"""
    
    def filter(self, record):
        # 要过滤掉的logger名称模式
        filtered_loggers = [
            'urllib3',
            'requests',
            'httpx',
            'aiohttp',
            'fastapi',
            'uvicorn',
            'werkzeug',
            'tornado',
            'flask',
            'django',
            'gunicorn',
            'waitress',
            'hypercorn',
            'transformers',  # 过滤transformers库的日志
            'torch',         # 过滤pytorch的日志
            'datasets',      # 过滤datasets库的日志
            'tokenizers',    # 过滤tokenizers库的日志
        ]
        
        # 检查logger名称是否包含要过滤的模式
        for filtered in filtered_loggers:
            if filtered in record.name.lower():
                return False
        
        # 过滤包含特定关键词的消息
        message = record.getMessage().lower()
        filtered_messages = [
            'http',
            'request',
            'response',
            'get',
            'post',
            'put',
            'delete',
            'status code',
            'connection',
            'socket',
            '200',
            '404',
            '500',
            'LiteLLM'
        ]
        
        for filtered_msg in filtered_messages:
            if filtered_msg in message:
                return False
        
        return True

class LoggingMannager:
    @staticmethod
    def configure_global():
        """
        全局配置日志系统，所有logger继承此配置。
        """
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        root_logger.handlers.clear()
         # 设置第三方库的日志级别为WARNING或更高，减少噪音

        logging.getLogger('requests').setLevel(logging.WARNING)
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('google').setLevel(logging.WARNING)
        logging.getLogger('LiteLLM').setLevel(logging.WARNING)

        # 控制台handler（彩色）
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # 添加自定义过滤器
        ch.addFilter(CustomFilter())
        
        ch.setFormatter(colorlog.ColoredFormatter(
            "%(log_color)s%(levelname)s%(reset)s - %(name)s - %(message)s",
            log_colors=color
        ))
        root_logger.addHandler(ch)
        

    @staticmethod
    def get_logger(logger_name: str) -> logging.Logger:
        """
        获取logger，不再添加handler，继承全局配置。
        """
        return logging.getLogger(logger_name)

