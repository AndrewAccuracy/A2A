import sys
import os
import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities,AgentCard,AgentSkill
from a2aserver.agent_executor import ServerAgentExecutor
from modules.logging.logging_mannager import LoggingMannager
import config


log_filename = f"server_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
log_path = os.path.join(config.SERVER_LOG_PATH, log_filename)
LoggingMannager.configure_global(log_file=log_path)
logger = LoggingMannager.get_logger(__name__)
load_dotenv()

def main():
    """
    启动Agent服务器的main函数,该服务器定义了一个Agent，这个Agent使用Gemini模型回答问题
    """
    skill = AgentSkill(
        id='QA_Gemini Agent',
        name='QA_Gemini Agent',
        description='Answers questions using Gemini.',
        tags=['QA']
    )
    
    # 创建Agent Card，定义代理的元数据
    public_agent_card = AgentCard(
        name='QA_Gemini Agent',
        description='Answers questions using Gemini.',
        url=config.SERVER_URL,
        version='1.0.0',
        defaultInputModes=['text'],
        defaultOutputModes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill]
    )
    request_handler = DefaultRequestHandler(
        agent_executor=ServerAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=request_handler
    )

    uvicorn.run(server.build(), host='0.0.0.0', port=9999)
    
if __name__ == "__main__":
    main()
    
