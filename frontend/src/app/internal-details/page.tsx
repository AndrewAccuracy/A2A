'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroWave from '@/components/ui/dynamic-wave-canvas-background';
import WardenView from '@/components/warden-view';
import A2ACovertDemo from '@/components/a2a-covert-demo';

export default function InternalDetailsPage() {
  const [currentMessage, setCurrentMessage] = useState<{
    id: number;
    content: string;
    sender: 'left' | 'right';
    timestamp?: number;
  } | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [wardenKey, setWardenKey] = useState(0); // 用于刷新攻击者模型

  // 监听 localStorage 中的评估结果变化
  useEffect(() => {
    const checkEvaluationResults = () => {
      const stored = localStorage.getItem('evaluationResults');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvaluationResults(parsed);
          }
        } catch (e) {
          console.error('Failed to parse evaluation results:', e);
        }
      }
    };

    // 立即检查一次
    checkEvaluationResults();

    // 定期检查更新
    const interval = setInterval(checkEvaluationResults, 500);

    // 监听 storage 事件（跨标签页）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'evaluationResults') {
        checkEvaluationResults();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 监听共享状态更新（从配置面板同步到页面状态）
    const handleEvaluationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && customEvent.detail.length > 0) {
        setEvaluationResults(customEvent.detail);
      }
    };

    // 监听聊天配置更新，获取总消息数
    const handleChatConfigUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && customEvent.detail.messages) {
        setTotalMessages(customEvent.detail.messages.length);
      }
    };

    // 监听刷新攻击者模型事件 - 完全清空并重新开始
    const handleRefreshWardenView = () => {
      // 先清空所有状态
      setCurrentMessage(null);
      setMessageCount(0);
      setEvaluationResults([]);
      // 然后更新 key 强制重新挂载组件（完全清空并重新开始）
      setWardenKey(prev => prev + 1);
    };

    window.addEventListener('a2a:evaluationResultsUpdated', handleEvaluationUpdate);
    window.addEventListener('a2a:chatConfigUpdated', handleChatConfigUpdate);
    window.addEventListener('a2a:refreshWardenView', handleRefreshWardenView);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('a2a:evaluationResultsUpdated', handleEvaluationUpdate);
      window.removeEventListener('a2a:chatConfigUpdated', handleChatConfigUpdate);
      window.removeEventListener('a2a:refreshWardenView', handleRefreshWardenView);
    };
  }, []);

  // 处理消息完成的回调
  const handleMessageComplete = React.useCallback((message: { id: number; content: string; sender: 'left' | 'right' }) => {
    setCurrentMessage({
      id: message.id,
      content: message.content,
      sender: message.sender,
      timestamp: Date.now()
    });
    setMessageCount(prev => prev + 1);
  }, []);

  return (
    <main className="relative flex min-h-screen text-white overflow-hidden">
      {/* Dynamic Wave Background */}
      <div className="absolute inset-0 z-0">
        <HeroWave />
      </div>
      
      {/* Page Title */}
      <motion.div 
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 
          className="text-3xl md:text-4xl font-extrabold text-center tracking-tight lg:text-5xl text-white drop-shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          A2A Covert - 智能体隐蔽通信
        </motion.h1>
        <motion.p 
          className="text-center text-md md:text-lg text-white/90 mt-1 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          A2A Covert - Agent Covert Communication
        </motion.p>
      </motion.div>

      {/* Three Column Layout Container */}
      <div className="flex w-full pt-24 md:pt-28 relative z-10 gap-3 px-3" style={{ height: 'calc(100vh - 6rem)' }}>
        {/* Left Column: Server Configuration - 较窄，约 300px */}
        <div className="w-[300px] flex-shrink-0" style={{ height: '100%' }}>
          <A2ACovertDemo layoutMode="three-column" hideTitle={true} showConfigOnly={true} />
        </div>
        
        {/* Middle Column: Agent Dialogue Window - 占据剩余空间 */}
        <div className="flex-1 min-w-0" style={{ height: '100%' }}>
          <A2ACovertDemo 
            layoutMode="three-column" 
            hideTitle={true} 
            showDialogueOnly={true}
            onMessageComplete={handleMessageComplete}
          />
        </div>
        
        {/* Right Column: Warden View - 较窄，约 300px */}
        <motion.div
          className="w-[300px] flex-shrink-0"
          style={{ height: '100%' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <WardenView 
            key={wardenKey}
            className="h-full"
            currentMessage={currentMessage}
            evaluationResults={evaluationResults}
            messageCount={messageCount}
            totalMessages={totalMessages}
          />
        </motion.div>
      </div>
    </main>
  );
}
