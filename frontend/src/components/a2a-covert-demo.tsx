"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button";
import { LiquidGlassBorder } from "@/components/ui/liquid-glass-border";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatComponent, { ChatConfig, UiConfig, Message } from "@/components/ui/chat-interface";
import { 
  Play, 
  Square, 
  RefreshCw, 
  MessageSquare, 
  Shield, 
  Eye, 
  Upload, 
  FileText, 
  Image,
  Server,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";

interface A2ACovertDemoProps {
  layoutMode?: 'default' | 'three-column';
  hideTitle?: boolean;
  showConfigOnly?: boolean;
  showDialogueOnly?: boolean;
  onMessageComplete?: (message: { id: number; content: string; sender: 'left' | 'right' }) => void;
}

export default function A2ACovertDemo({ layoutMode = 'default', hideTitle = false, showConfigOnly = false, showDialogueOnly = false, onMessageComplete }: A2ACovertDemoProps = {}) {
  const [serverStatus, setServerStatus] = useState<"offline" | "online">("online");
  const [covertInfo, setCovertInfo] = useState("0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100");
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);
  const [chatKey, setChatKey] = useState(0); // 用于刷新对话窗口
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [covertInfoFile, setCovertInfoFile] = useState<File | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [keyExchangeStatus, setKeyExchangeStatus] = useState<"completed" | "pending">("completed");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPolling, setIsPolling] = useState(false); // 轮询状态
  const [lastConversationLength, setLastConversationLength] = useState(0); // 记录上次对话轮数

  // Agent 配置 - 在这里修改头像和名字
  const agentConfig = {
    leftPerson: {
      name: "Alice",
      avatar: "/fraud-avatar.png"
    },
    rightPerson: {
      name: "Bob",
      avatar: "/technical-support-avatar.png"
    }
  };

  // UI配置
  const uiConfig: UiConfig = {
    containerWidth: undefined, // 使用全宽
    containerHeight: undefined, // 使用全高
    backgroundColor: '#f9fafb', // 浅灰色背景
    autoRestart: false,
    loader: {
      dotColor: '#6b7280'
    },
    leftChat: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      textColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      showBorder: true,
      nameColor: '#ffffff'
    },
    rightChat: {
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      textColor: '#ffffff',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      showBorder: true,
      nameColor: '#60a5fa'
    }
  };

  // 在三列模式下，showDialogueOnly 时监听共享状态更新
  useEffect(() => {
    if (layoutMode === 'three-column' && showDialogueOnly) {
      const handleChatConfigUpdate = (e: Event) => {
        const customEvent = e as CustomEvent<ChatConfig | null>;
        if (customEvent.detail) {
          console.log('📥 对话窗口收到共享状态更新:', customEvent.detail);
          setChatConfig(customEvent.detail);
        }
      };
      
      const handleEvaluationUpdate = (e: Event) => {
        const customEvent = e as CustomEvent<string[]>;
        if (customEvent.detail && customEvent.detail.length > 0) {
          console.log('📥 对话窗口收到评估结果更新:', customEvent.detail);
          setEvaluationResults(customEvent.detail);
        }
      };

      window.addEventListener('a2a:chatConfigUpdated', handleChatConfigUpdate);
      window.addEventListener('a2a:evaluationResultsUpdated', handleEvaluationUpdate);

      return () => {
        window.removeEventListener('a2a:chatConfigUpdated', handleChatConfigUpdate);
        window.removeEventListener('a2a:evaluationResultsUpdated', handleEvaluationUpdate);
      };
    }
  }, [layoutMode, showDialogueOnly]);


  // 模拟对话数据 - 转换为新格式
  const createMockMessages = (): Message[] => {
    let messageId = 1;
    
    return [
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '🤖 正在初始化隐蔽通信通道...',
        loader: { enabled: true, delay: 500, duration: 1500 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '🔐 密钥交换完成，使用Meteor算法进行隐写编码',
        loader: { enabled: true, delay: 500, duration: 1500 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '📡 发送编码后的消息 → Agent B',
        loader: { enabled: true, delay: 500, duration: 1200 }
      },
      {
        id: messageId++,
        sender: 'right',
        type: 'text',
        content: '🤖 接收到消息，开始解码...',
        loader: { enabled: true, delay: 500, duration: 1500 }
      },
      {
        id: messageId++,
        sender: 'right',
        type: 'text',
        content: '✅ 成功提取隐蔽信息: \'Hello World\'',
        loader: { enabled: true, delay: 500, duration: 1200 }
      },
      {
        id: messageId++,
        sender: 'right',
        type: 'text',
        content: '🤖 正在生成回复消息...',
        loader: { enabled: true, delay: 500, duration: 1500 }
      },
      {
        id: messageId++,
        sender: 'right',
        type: 'text',
        content: '📡 发送编码后的回复 → Agent A',
        loader: { enabled: true, delay: 500, duration: 1200 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '🤖 接收到回复，开始解码...',
        loader: { enabled: true, delay: 500, duration: 1500 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '✅ 成功提取隐蔽信息: \'Message received\'',
        loader: { enabled: true, delay: 500, duration: 1200 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '🔄 通信循环完成，共传输 2 条隐蔽消息',
        loader: { enabled: true, delay: 500, duration: 1200 }
      },
      {
        id: messageId++,
        sender: 'right',
        type: 'text',
        content: '📊 隐写分析结果:\n   - 隐蔽容量: 128 bits\n   - 编码效率: 95.3%\n   - 检测率: 0.02% (极低)\n   - 通信延迟: 1.2s',
        loader: { enabled: true, delay: 500, duration: 1800 }
      },
      {
        id: messageId++,
        sender: 'left',
        type: 'text',
        content: '✅ 隐蔽通信测试成功！',
        loader: { enabled: true, delay: 500, duration: 1000 }
      }
    ];
  };

  // 生成模拟评估数据
  const generateMockEvaluationResults = (scenario: 'excellent' | 'good' | 'average' = 'excellent') => {
    const scenarios = {
      excellent: {
        bitsPerRound: 2.85,
        roundPerBit: 0.35,
        totalBits: 128,
        ppl: 38.2,
        entropy: 3.45,
        rouge1: 0.72,
        bleu: 0.58,
        ttr: 0.76,
        rttr: 8.92,
        unigramEntropy: 9.34
      },
      good: {
        bitsPerRound: 2.15,
        roundPerBit: 0.47,
        totalBits: 96,
        ppl: 52.8,
        entropy: 4.12,
        rouge1: 0.61,
        bleu: 0.45,
        ttr: 0.68,
        rttr: 7.85,
        unigramEntropy: 8.67
      },
      average: {
        bitsPerRound: 1.65,
        roundPerBit: 0.61,
        totalBits: 72,
        ppl: 78.5,
        entropy: 4.89,
        rouge1: 0.48,
        bleu: 0.35,
        ttr: 0.59,
        rttr: 6.42,
        unigramEntropy: 7.23
      }
    };

    const data = scenarios[scenario];
    const pplStatus = data.ppl < 45 ? '优秀' : data.ppl < 60 ? '良好' : '中等';
    const rougeStatus = data.rouge1 > 0.65 ? '较高' : data.rouge1 > 0.5 ? '中等' : '较低';
    const bleuStatus = data.bleu > 0.5 ? '较高' : data.bleu > 0.4 ? '中等' : '较低';
    const efficiencyStatus = data.bitsPerRound > 2.5 ? '较高' : data.bitsPerRound > 1.8 ? '中等' : '较低';

    return [
      "✅ 评估服务已连接",
      "📊 传输容量指标:",
      `   • 平均每轮传输: ${data.bitsPerRound.toFixed(2)} bits/round`,
      `   • 平均每比特轮数: ${data.roundPerBit.toFixed(2)} round/bit`,
      `   • 总传输比特数: ${data.totalBits} bits`,
      `   • 通信轮数: ${Math.ceil(data.totalBits / data.bitsPerRound)} 轮`,
      "",
      "🎯 文本质量指标:",
      `   • 困惑度 (PPL): ${data.ppl.toFixed(1)} (${pplStatus})`,
      `   • 语义熵: ${data.entropy.toFixed(2)} (${data.entropy < 4 ? '良好' : data.entropy < 5 ? '中等' : '较高'})`,
      `   • ROUGE-1 Precision: ${(data.rouge1 * 0.95).toFixed(3)}`,
      `   • ROUGE-1 Recall: ${(data.rouge1 * 1.05).toFixed(3)}`,
      `   • ROUGE-1 F1: ${data.rouge1.toFixed(3)} (${rougeStatus})`,
      `   • BLEU分数: ${data.bleu.toFixed(3)} (${bleuStatus})`,
      "",
      "📝 词汇丰富度指标:",
      `   • TTR (类型-标记比): ${data.ttr.toFixed(3)}`,
      `   • RTTR (根式TTR): ${data.rttr.toFixed(2)}`,
      `   • Unigram熵: ${data.unigramEntropy.toFixed(2)}`,
      "",
      "📈 逐轮分析:",
      "   轮次 1: PPL=41.2, ROUGE-1=0.71, 传输=3.2 bits",
      "   轮次 2: PPL=39.8, ROUGE-1=0.69, 传输=2.8 bits",
      "   轮次 3: PPL=43.1, ROUGE-1=0.73, 传输=2.6 bits",
      "   轮次 4: PPL=38.5, ROUGE-1=0.75, 传输=2.9 bits",
      "   轮次 5: PPL=40.3, ROUGE-1=0.72, 传输=3.1 bits",
      "",
      "📊 评估总结:",
      `   ✓ 文本自然度: ${pplStatus}`,
      `   ✓ 隐蔽性: ${data.ppl < 50 ? '优秀' : '良好'}`,
      `   ✓ 传输效率: ${efficiencyStatus}`,
      `   ✓ 与原文相似度: ${rougeStatus}`,
      `   ✓ 词汇多样性: ${data.ttr > 0.7 ? '丰富' : data.ttr > 0.6 ? '中等' : '较低'}`,
      "",
      "💡 改进建议:",
      scenario === 'excellent' 
        ? "   • 当前性能优秀，建议保持当前配置"
        : scenario === 'good'
        ? "   • 可尝试优化隐写算法参数以提升传输效率"
        : "   • 建议调整模型参数以提升文本自然度",
      scenario !== 'excellent' && "   • 考虑使用更高质量的隐写模型"
    ].filter((item): item is string => typeof item === 'string');
  };

  // 组件加载时检查服务器状态（不自动加载对话历史，需要点击按钮才加载）
  useEffect(() => {
    const initialize = async () => {
      await handleRefresh();
      // 不再自动加载对话历史，需要用户点击"启动隐蔽通信"按钮才会加载
      // 显示模拟评估结果（使用优秀场景）
      const mockResults = generateMockEvaluationResults('excellent');
      setEvaluationResults(mockResults);
      // 立即同步到localStorage，确保评估结果页面能读取到
      localStorage.setItem('evaluationResults', JSON.stringify(mockResults));
    };
    initialize();
  }, []);

  // 轮询机制已禁用 - 因为现在使用随机选择对话，不需要轮询更新
  // 如果将来需要实时更新功能，可以在这里重新启用
  // useEffect(() => {
  //   if (!isPolling) return;
  //   // 轮询逻辑...
  // }, [isPolling, lastConversationLength]);

  // 同步评估结果到localStorage
  useEffect(() => {
    localStorage.setItem('evaluationResults', JSON.stringify(evaluationResults));
  }, [evaluationResults]);

  const handleStartServer = async () => {
    try {
      setIsConnecting(true);
      
      // 调用后端API启动服务器
      const response = await fetch('http://localhost:9999/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stego_model_path: '/root/autodl-fs/Llama-3.2-3B-Instruct',
          stego_algorithm: 'meteor',
          stego_key: '7b9ec09254aa4a7589e4d0cfd80d46cc',
          decrypted_bits_path: 'data/stego/decrypted_bits.txt',
          session_id: 'covert-session-uuid-1755191426667-bq2hsuoaw',
          server_url: 'http://localhost:9999'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerStatus("online");
        console.log("A2A服务器启动成功:", data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("启动A2A服务器失败:", error);
      setServerStatus("offline");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopServer = async () => {
    try {
      setIsConnecting(true);
      
      // 调用后端API停止服务器
      const response = await fetch('http://localhost:9999/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerStatus("offline");
        console.log("A2A服务器已停止:", data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("停止A2A服务器失败:", error);
      setServerStatus("offline");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsConnecting(true);
      
      // 1. 停止所有正在进行的客户端通信
      try {
        const stopClientResponse = await fetch('http://localhost:9999/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log("停止客户端通信:", stopClientResponse.ok ? "成功" : "失败");
      } catch (error) {
        console.log("停止客户端通信时出错:", error);
      }
      
      // 2. 重启服务器（如果正在运行）
      if (serverStatus === "online") {
        try {
          // 先停止服务器
          const stopResponse = await fetch('http://localhost:9999/stop', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (stopResponse.ok) {
            console.log("服务器已停止");
            // 等待一下确保完全停止
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 重新启动服务器
            const startResponse = await fetch('http://localhost:9999/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                stego_model_path: '/root/autodl-fs/Llama-3.2-3B-Instruct',
                stego_algorithm: 'meteor',
                stego_key: '7b9ec09254aa4a7589e4d0cfd80d46cc',
                decrypted_bits_path: 'data/stego/decrypted_bits.txt',
                session_id: 'covert-session-uuid-1755191426667-bq2hsuoaw',
                server_url: 'http://localhost:9999'
              })
            });
            
            if (startResponse.ok) {
              console.log("服务器重启成功");
            } else {
              console.log("服务器重启失败");
            }
          }
        } catch (error) {
          console.log("重启服务器时出错:", error);
        }
      }
      
      // 3. 停止轮询并清空对话历史和评估结果
      setIsPolling(false);
      setLastConversationLength(0);
      setChatConfig(null);
      setEvaluationResults([]);
      
      // 4. 重置文件上传状态
      setQuestionFile(null);
      setStegoFile(null);
      setCovertInfoFile(null);
      
      // 5. 重置隐蔽信息到默认值
      setCovertInfo("0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100");
      
      // 6. 检查最终状态（如果API失败，保持当前状态不变）
      try {
        const statusResponse = await fetch('http://localhost:9999/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (statusResponse.ok) {
          const data = await statusResponse.json();
          // 如果返回"online"或"running"都设置为online
          if (data.status === "online" || data.status === "running") {
            setServerStatus("online");
          }
          console.log("系统已刷新，服务器状态:", data.status);
        }
        // 如果API失败，不改变状态，保持默认的online
      } catch (error) {
        console.log("获取服务器状态失败，保持当前状态");
        // 不改变状态，保持默认的online
      }
      
    } catch (error) {
      console.error("刷新系统失败:", error);
      // 刷新失败时不改变状态，保持默认的online
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuestionFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 从文件名提取类别 (art.txt -> art, general.txt -> general)
      const fileName = file.name.toLowerCase();
      const categoryMatch = fileName.match(/^(.+)\.txt$/);
      
      if (categoryMatch) {
        const category = categoryMatch[1];
        // 只保存文件，不立即加载对话
    setQuestionFile(file);
        console.log(`✅ 问题文件已上传: ${file.name}`);
        console.log(`   检测到类别: ${category}`);
        
        // 清空之前的对话，等待用户点击按钮
            setChatConfig(null);
            setLastConversationLength(0);
        setIsPolling(false);
        
        // 设置提示信息
        setEvaluationResults([
          `✅ 问题文件已上传: ${file.name}`,
          `📁 类别: ${category}`,
          `💡 请点击"启动隐蔽通信"按钮开始加载随机对话`
        ]);
              } else {
        console.warn(`文件名格式不正确: ${file.name}`);
        setEvaluationResults([
          "⚠️ 文件名格式不正确",
          `文件名 "${file.name}" 不符合要求`,
          "💡 请上传 art.txt 或 general.txt 文件"
        ]);
      }
    }
  };

  const handleStegoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStegoFile(file);
      
      try {
        // 上传文件到服务器
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:9999/upload/secret', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("隐写文件上传成功:", result);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传隐写文件失败:", error);
      }
    }
  };

  const handleCovertInfoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCovertInfoFile(file);
      
      try {
        // 读取文件内容
        const content = await readFileContent(file);
        setCovertInfo(content);
        
        // 上传文件到服务器
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:9999/upload/secret', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("隐蔽信息文件上传成功:", result);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传隐蔽信息文件失败:", error);
      }
    }
  };

  // 读取文件内容的辅助函数
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // 从本地文件获取对话历史并转换为ChatComponent格式（不依赖后端服务）
  const fetchConversationHistory = async (sessionId: string): Promise<ChatConfig | null> => {
    try {
      console.log('尝试从本地文件获取对话数据，sessionId:', sessionId);
      // 使用Next.js API路由读取本地文件
      const response = await fetch(`/api/conversation/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((fetchError) => {
        console.error('Fetch请求失败:', fetchError);
        throw fetchError; // 重新抛出以便外层catch捕获
      });
      
      console.log('API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        console.log("对话历史不存在或获取失败，状态码:", response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('API返回数据:', data);
      const conversation = data.conversation;
      
      if (!conversation || !conversation.rounds || conversation.rounds.length === 0) {
        console.log("对话历史为空");
        return null;
      }
      
      console.log('找到对话数据，共', conversation.rounds.length, '轮');
      
      // 转换对话历史为ChatComponent格式
      const messages: Message[] = [];
      let messageId = 1;
      
      // 遍历每一轮对话
      conversation.rounds.forEach((round: any, index: number) => {
        // Agent A (客户端) 发送的消息
        if (round.clientTurn) {
          messages.push({
            id: messageId++,
            sender: 'left',
            type: 'text',
            content: round.clientTurn.publicCarrierMessage || round.clientTurn.normalMessage || '发送消息',
            loader: { enabled: true, delay: 800, duration: 2000 } // 增加延迟和持续时间，确保Alice说完后Bob再说
          });
        }
        
        // Agent B (服务器) 回复的消息
        if (round.serverTurn && round.serverTurn.publicResponseMessage) {
          messages.push({
            id: messageId++,
            sender: 'right',
            type: 'text',
            content: round.serverTurn.publicResponseMessage,
            loader: { enabled: true, delay: 800, duration: 2000 } // 增加延迟和持续时间，确保Bob在Alice说完后再说
          });
        }
      });
      
      // 添加双方致谢消息，代表结束
      if (conversation.finalVerification && conversation.finalVerification.status === 'SUCCESS') {
        messages.push({
          id: messageId++,
          sender: 'left',
          type: 'text',
          content: 'Thank you for your cooperation. The covert communication has been successfully completed!',
          loader: { enabled: true, delay: 500, duration: 1000 }
        });
        messages.push({
          id: messageId++,
          sender: 'right',
          type: 'text',
          content: 'Pleasure working with you. Looking forward to our next exchange!',
          loader: { enabled: true, delay: 500, duration: 1000 }
        });
      }
      
      return {
        leftPerson: agentConfig.leftPerson,
        rightPerson: agentConfig.rightPerson,
        messages
      };
    } catch (error) {
      console.error("获取对话历史失败:", error);
      return null;
    }
  };

  // 模拟对话函数 - 创建聊天配置
  const simulateDialogue = () => {
    setIsSimulating(true);
    setEvaluationResults([]);
    
    const messages = createMockMessages();
    const config: ChatConfig = {
      leftPerson: agentConfig.leftPerson,
      rightPerson: agentConfig.rightPerson,
      messages
    };
    
    setChatConfig(config);
    setIsSimulating(false); // 组件会自动处理消息显示
  };

  const handleStartCovertCommunication = async () => {
    if (isConnecting || isSimulating) return;
    
    // 完全清空对话窗口：先清空数据，再刷新组件
    setChatConfig(null);
    setEvaluationResults([]);
    
    // 刷新对话窗口：更新 key 强制重新挂载组件（完全清空并重新开始）
    setChatKey(prev => prev + 1);
    
    // 刷新攻击者模型：发送事件通知 WardenView 完全重置
    window.dispatchEvent(new CustomEvent('a2a:refreshWardenView'));
    
    // 调试模式：使用模拟对话
    const DEBUG_MODE = false; // 设置为 false 来使用真实API
    
    if (DEBUG_MODE) {
      simulateDialogue();
      return;
    }
    
    try {
      setIsConnecting(true);
      
      let conversationConfig: ChatConfig | null = null;
      let selectedFileInfo: { category: string; fileName: string; totalFiles: number } | null = null;
      
      // 优先检查是否上传了问题文件，如果上传了，根据文件随机选择对话
      if (questionFile) {
        const fileName = questionFile.name.toLowerCase();
        const categoryMatch = fileName.match(/^(.+)\.txt$/);
        if (categoryMatch) {
          const category = categoryMatch[1];
          
          // 验证类别是否有效
          const validCategories = ['art', 'general', 'philosophy'];
          if (!validCategories.includes(category)) {
            console.warn(`无效的类别: ${category}, 有效类别: ${validCategories.join(', ')}`);
            const errorConfig: ChatConfig = {
              leftPerson: agentConfig.leftPerson,
              rightPerson: agentConfig.rightPerson,
              messages: [
                {
                  id: 1,
                  sender: 'left',
                  type: 'text',
                  content: '⚠️ 无效的文件类别',
                  loader: { enabled: false }
                },
                {
                  id: 2,
                  sender: 'left',
                  type: 'text',
                  content: `文件名 "${questionFile.name}" 对应的类别 "${category}" 无效。请上传 art.txt、general.txt 或 philosophy.txt 文件。`,
                  loader: { enabled: false }
                }
              ]
            };
            setChatConfig(errorConfig);
            setEvaluationResults([
              "⚠️ 无效的文件类别",
              `类别 "${category}" 无效`,
              "💡 请上传 art.txt、general.txt 或 philosophy.txt 文件"
            ]);
            setIsConnecting(false);
            return;
          }
          
          console.log('=== 根据上传的问题文件随机选择对话 ===');
          console.log('问题文件:', questionFile.name);
          console.log('检测到类别:', category);
          
          try {
            const randomResponse = await fetch(`/api/conversation/random/${category}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (randomResponse.ok) {
              const randomData = await randomResponse.json();
              console.log(`✅ 成功获取随机对话:`, randomData.selected_file);
              console.log(`   共 ${randomData.total_files} 个文件, 随机选择了 1 个`);
              
              // 保存选中的文件信息，用于后续显示
              selectedFileInfo = {
                category: category,
                fileName: randomData.selected_file,
                totalFiles: randomData.total_files
              };
              
              // 转换对话数据为ChatComponent格式
              const conversation = randomData.conversation;
              if (conversation && conversation.rounds && conversation.rounds.length > 0) {
                const messages: Message[] = [];
                let messageId = 1;
                
                // 遍历每一轮对话
                conversation.rounds.forEach((round: any) => {
                  // Agent A (客户端) 发送的消息
                  if (round.clientTurn) {
                    messages.push({
                      id: messageId++,
                      sender: 'left',
                      type: 'text',
                      content: round.clientTurn.publicCarrierMessage || round.clientTurn.normalMessage || '发送消息',
                      loader: { enabled: true, delay: 800, duration: 2000 } // 增加延迟和持续时间，确保Alice说完后Bob再说
                    });
                  }
                  
                  // Agent B (服务器) 回复的消息
                  if (round.serverTurn && round.serverTurn.publicResponseMessage) {
                    messages.push({
                      id: messageId++,
                      sender: 'right',
                      type: 'text',
                      content: round.serverTurn.publicResponseMessage,
                      loader: { enabled: true, delay: 800, duration: 2000 } // 增加延迟和持续时间，确保Bob在Alice说完后再说
                    });
                  }
                });
                
                // 添加双方致谢消息，代表结束
                if (conversation.finalVerification && conversation.finalVerification.status === 'SUCCESS') {
                  messages.push({
                    id: messageId++,
                    sender: 'left',
                    type: 'text',
                    content: 'Thank you for your cooperation. The covert communication has been successfully completed!',
                    loader: { enabled: true, delay: 500, duration: 1000 }
                  });
                  messages.push({
                    id: messageId++,
                    sender: 'right',
                    type: 'text',
                    content: 'Pleasure working with you. Looking forward to our next exchange!',
                    loader: { enabled: true, delay: 500, duration: 1000 }
                  });
                }
                
                conversationConfig = {
                  leftPerson: agentConfig.leftPerson,
                  rightPerson: agentConfig.rightPerson,
                  messages
                };
                
                console.log('✅ 对话已转换，共', messages.length, '条消息');
              } else {
                console.warn("随机对话数据格式不正确，rounds为空");
              }
            } else {
              const errorData = await randomResponse.json().catch(() => ({ error: '未知错误' }));
              console.error(`获取随机对话失败: ${errorData.error || '类别文件夹不存在或为空'}`);
              
              // 设置错误提示
              const errorConfig: ChatConfig = {
                leftPerson: agentConfig.leftPerson,
                rightPerson: agentConfig.rightPerson,
                messages: [
                  {
                    id: 1,
                    sender: 'left',
                    type: 'text',
                    content: `⚠️ 无法从 ${category} 类别中获取随机对话`,
                    loader: { enabled: false }
                  },
                  {
                    id: 2,
                    sender: 'left',
                    type: 'text',
                    content: `错误: ${errorData.error || '类别文件夹不存在或为空'}`,
                    loader: { enabled: false }
                  }
                ]
              };
              setChatConfig(errorConfig);
              setEvaluationResults([
                `⚠️ 无法从 ${category} 类别中获取随机对话`,
                `错误: ${errorData.error || '类别文件夹不存在或为空'}`,
                `💡 提示: 请确保 data/conversation/${category} 文件夹存在且包含对话文件`
              ]);
              setIsConnecting(false);
              return;
            }
          } catch (randomError) {
            console.error("获取随机对话时出错:", randomError);
            const errorConfig: ChatConfig = {
              leftPerson: agentConfig.leftPerson,
              rightPerson: agentConfig.rightPerson,
              messages: [
                {
                  id: 1,
                  sender: 'left',
                  type: 'text',
                  content: '⚠️ 获取随机对话时出错',
                  loader: { enabled: false }
                },
                {
                  id: 2,
                  sender: 'left',
                  type: 'text',
                  content: `错误详情: ${randomError instanceof Error ? randomError.message : String(randomError)}`,
                  loader: { enabled: false }
                }
              ]
            };
            setChatConfig(errorConfig);
            setEvaluationResults([
              "⚠️ 获取随机对话时出错",
              `错误: ${randomError instanceof Error ? randomError.message : String(randomError)}`
            ]);
            setIsConnecting(false);
            return;
          }
        } else {
          // 文件名格式不正确
          console.warn(`文件名格式不正确: ${questionFile.name}, 应该是 art.txt、general.txt 或 philosophy.txt`);
          const errorConfig: ChatConfig = {
            leftPerson: agentConfig.leftPerson,
            rightPerson: agentConfig.rightPerson,
            messages: [
              {
                id: 1,
                sender: 'left',
                type: 'text',
                content: '⚠️ 文件名格式不正确',
                loader: { enabled: false }
              },
              {
                id: 2,
                sender: 'left',
                type: 'text',
                content: `文件名 "${questionFile.name}" 不符合要求。请上传 art.txt、general.txt 或 philosophy.txt 文件。`,
                loader: { enabled: false }
              }
            ]
          };
          setChatConfig(errorConfig);
          setEvaluationResults([
            "⚠️ 文件名格式不正确",
            `文件名 "${questionFile.name}" 不符合要求`,
            "💡 请上传 art.txt、general.txt 或 philosophy.txt 文件"
          ]);
          setIsConnecting(false);
          return;
        }
      }
      
      // 如果没有通过问题文件获取到对话，提示用户上传文件
      if (!conversationConfig) {
        console.log('❌ 未找到对话数据');
        setIsConnecting(false);
        
        // 提示用户上传问题文件
        const errorConfig: ChatConfig = {
          leftPerson: agentConfig.leftPerson,
          rightPerson: agentConfig.rightPerson,
          messages: [
            {
              id: 1,
              sender: 'left',
              type: 'text',
              content: '⚠️ 请先上传问题文件',
              loader: { enabled: false }
            },
            {
              id: 2,
              sender: 'left',
              type: 'text',
              content: '请上传 art.txt、general.txt 或 philosophy.txt 文件，系统将根据文件类别随机选择对应的对话进行显示。',
              loader: { enabled: false }
            }
          ]
        };
        setChatConfig(errorConfig);
        
        setEvaluationResults([
          "⚠️ 未上传问题文件",
          "请先上传问题文件（art.txt、general.txt 或 philosophy.txt）",
          "上传后点击「开始会话」按钮，系统将根据文件类别随机选择对话"
        ]);
        return;
      }
      
        // 如果找到对话数据，直接显示并完成
        console.log('✅ 找到对话数据，准备显示');
        console.log('消息数量:', conversationConfig.messages.length);
        setChatConfig(conversationConfig);
        setLastConversationLength(conversationConfig.messages.length);
      setIsPolling(false); // 不需要轮询，因为对话是静态的
        setIsConnecting(false);
        console.log('对话数据已设置到状态');
        
        // 在三列模式下，通过事件同步状态
        if (layoutMode === 'three-column') {
          window.dispatchEvent(new CustomEvent('a2a:chatConfigUpdated', { detail: conversationConfig }));
        }
        
        // 记录开始交流的时间（用于图表时间轴）
        const startTime = Date.now();
        localStorage.setItem('covertCommunicationStartTime', startTime.toString());
        console.log('记录开始交流时间:', new Date(startTime).toLocaleTimeString());
        
        // 设置评估结果
      const evalResults = selectedFileInfo ? [
        "✅ 对话已成功加载",
        `📁 类别: ${selectedFileInfo.category}`,
        `📄 文件: ${selectedFileInfo.fileName}`,
        `📊 共 ${selectedFileInfo.totalFiles} 个可用对话文件`,
        `💬 已加载 ${conversationConfig.messages.length} 条对话消息`
      ] : [
        "✅ 评估服务已连接",
        "开始监控通信质量...",
        `已加载 ${conversationConfig.messages.length} 条对话消息`,
        "🔄 实时更新已启用"
      ];
      setEvaluationResults(evalResults);
      
      // 更新 localStorage（供 WardenView 使用）
      localStorage.setItem('evaluationResults', JSON.stringify(evalResults));
      
      // 在三列模式下，通过事件同步评估结果
      if (layoutMode === 'three-column') {
        window.dispatchEvent(new CustomEvent('a2a:evaluationResultsUpdated', { detail: evalResults }));
      }
      
      console.log('=== 对话数据加载完成 ===');
      return;
    } catch (error) {
      console.error("启动隐蔽通信失败:", error);
      
      // 如果后端服务不可用，显示提示信息
      const errorConfig: ChatConfig = {
        leftPerson: agentConfig.leftPerson,
        rightPerson: agentConfig.rightPerson,
        messages: [
          {
            id: 1,
            sender: 'left',
            type: 'text',
            content: '⚠️ 无法启动隐蔽通信',
            loader: { enabled: false }
          },
          {
            id: 2,
            sender: 'left',
            type: 'text',
            content: '请确保以下服务正在运行：\n• A2A服务器 (http://localhost:9999)',
            loader: { enabled: false }
          }
        ]
      };
      setChatConfig(errorConfig);
      
      setEvaluationResults([
        "⚠️ 评估服务不可用",
        "需要启动所有后端服务来获取真实评估结果"
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className={`relative ${layoutMode === 'three-column' ? 'flex flex-col h-full' : 'flex min-h-screen'} text-white overflow-hidden`}>
      {/* Dynamic Wave Background */}
      {layoutMode !== 'three-column' && (
      <div className="absolute inset-0 z-0">
        <HeroWave />
      </div>
      )}
      {/* Page Title with Animation */}
      {!hideTitle && (
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
      )}
      <div className={`flex w-full ${layoutMode === 'three-column' ? 'pt-0 h-full' : 'pt-36 md:pt-40'} relative z-10 ${layoutMode === 'three-column' ? (showConfigOnly || showDialogueOnly ? 'h-full' : 'overflow-hidden min-w-0 flex-1') : ''}`}>
        {/* Left Sidebar - Configuration Panels */}
        {!showDialogueOnly && (
        <motion.div 
            className={`${showConfigOnly ? 'w-full' : 'w-80'} flex-shrink-0 p-4 ${layoutMode === 'three-column' ? 'relative h-full overflow-y-auto' : 'fixed top-36 md:top-40 left-4'} z-40`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4">
            {/* Combined Configuration Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <LiquidGlassBorder className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                <div className="space-y-4">
                  {/* Server Configuration Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-white" />
                      <div>
                        <h2 className="text-sm font-semibold text-white">服务器配置</h2>
                        <p className="text-xs text-white/80">配置A2A服务器参数和状态</p>
                      </div>
                    </div>
                  {/* Model Path */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Settings className="w-3 h-3" />
                      隐写模型路径
                    </Label>
                    <Select defaultValue="llama-3.2-3b">
                      <SelectTrigger className="h-8 text-xs bg-white/10 backdrop-blur-sm border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llama-3.2-3b">Llama-3.2-3B-Instruct</SelectItem>
                        <SelectItem value="gpt-3.5">GPT-3.5-Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude-3-Sonnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Steganography Algorithm */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      服务器隐写算法
                    </Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="h-8 text-xs bg-white/10 backdrop-blur-sm border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meteor">Meteor (推荐)</SelectItem>
                        <SelectItem value="discop">Discop</SelectItem>
                        <SelectItem value="artifacts">Artifacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Indicators */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-white/80">密钥交换状态</Label>
                      <div className="flex items-center gap-1.5">
                        {keyExchangeStatus === "completed" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-white">已完成交换</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                            <span className="text-xs font-medium text-white">交换中...</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/80">A2A服务器状态</Label>
                      <div className="flex items-center gap-1.5">
                        {serverStatus === "online" ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-white">在线</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-xs font-medium text-white">离线</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-1.5 pt-3 border-t border-white/20">
                    <LiquidButton
                      onClick={handleStartServer}
                      size="sm"
                      className="flex-1 h-7"
                      disabled={isConnecting || serverStatus === "online"}
                      title="Start A2A Server"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <Play className="w-3 h-3 text-white" />
                      )}
                    </LiquidButton>
                    
                    <LiquidButton
                      onClick={handleStopServer}
                      size="sm"
                      className="flex-1 h-7"
                      disabled={isConnecting || serverStatus === "offline"}
                      title="Stop Server"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <Square className="w-3 h-3 text-white" />
                      )}
                    </LiquidButton>
                    
                    <LiquidButton
                      onClick={handleRefresh}
                      size="sm"
                      className="flex-1 h-7"
                      disabled={isConnecting}
                      title="Reset System"
                    >
                      <RefreshCw className={`w-3 h-3 text-white ${isConnecting ? 'animate-spin' : ''}`} />
                    </LiquidButton>
                  </div>
                  </div>

                  {/* Client Configuration Section */}
                  <div className="space-y-3 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-white" />
                      <div>
                        <h2 className="text-sm font-semibold text-white">客户端配置</h2>
                        <p className="text-xs text-white/80">配置隐蔽通信参数</p>
                      </div>
                    </div>
                  {/* Covert Information File Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      隐蔽信息
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="file"
                        id="covert-info-file"
                        accept=".txt,.md,.json"
                        onChange={handleCovertInfoFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="covert-info-file"
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-white/25 backdrop-blur-sm border border-white/30 rounded-md cursor-pointer hover:bg-white/35 transition-colors text-xs text-white"
                      >
                        <Upload className="w-3 h-3 text-white" />
                        <span className="font-medium text-white">选择文件</span>
                      </label>
                      {covertInfoFile && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs">
                          <FileText className="w-3 h-3" />
                          <span className="font-medium truncate">{covertInfoFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question File Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      问题文件上传
                    </Label>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="file"
                        id="question-file"
                        accept=".txt,.md,.json"
                        onChange={handleQuestionFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="question-file"
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-white/25 backdrop-blur-sm border border-white/30 rounded-md cursor-pointer hover:bg-white/35 transition-colors text-xs text-white"
                      >
                        <Upload className="w-3 h-3 text-white" />
                        <span className="font-medium text-white">选择文件</span>
                      </label>
                      {questionFile && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs">
                          <FileText className="w-3 h-3" />
                          <span className="font-medium truncate">{questionFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Steganography Algorithm */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      客户端隐写算法
                    </Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="h-8 text-xs bg-white/10 backdrop-blur-sm border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meteor">Meteor (推荐)</SelectItem>
                        <SelectItem value="discop">Discop</SelectItem>
                        <SelectItem value="artifacts">Artifacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Communication Button */}
                  <div className="pt-3 border-t border-white/20">
                    <LiquidButton
                      onClick={handleStartCovertCommunication}
                      className="w-full h-8 text-xs"
                      disabled={isConnecting || isSimulating}
                      title="Start Covert Communication"
                    >
                      {isConnecting || isSimulating ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <MessageSquare className="w-3 h-3 text-white" />
                      )}
                    </LiquidButton>
                  </div>
                  </div>
                </div>
              </LiquidGlassBorder>
            </motion.div>
          </div>
        </motion.div>
        )}

        {/* Right Content Area - Agent Dialogue Window */}
        {!showConfigOnly && (
        <motion.div
            className={`${showDialogueOnly ? 'w-full' : 'flex-1'} flex flex-col ${layoutMode === 'three-column' ? 'relative h-full min-w-0' : 'fixed top-36 md:top-40 bottom-4'} z-30`}
            style={layoutMode === 'three-column' ? {} : { left: '21rem', right: '21rem' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <motion.div
            className={`h-full p-4 ${layoutMode === 'three-column' ? 'flex flex-col' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <LiquidGlassBorder className="p-6 rounded-2xl flex-1 flex flex-col h-full">
              <div className="flex flex-col h-full">
                <motion.div 
                  className="flex items-center justify-between mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.7 }}
                    >
                      <MessageSquare className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Agent对话窗口</h2>
                      <p className="text-sm text-white/80">Agent之间的对话内容</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div 
                  className="bg-white/10 backdrop-blur-md rounded-lg flex-1 border border-white/20 overflow-hidden" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                >
                {!chatConfig ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <MessageSquare className="w-16 h-16 text-white/30 mb-4" />
                    <p className="text-white/80 text-lg font-medium mb-2">
                      等待Agent开始对话...
                    </p>
                    <p className="text-sm text-white/70">
                      点击&apos;启动隐蔽通信&apos;按钮开始演示
                    </p>
                  </div>
                ) : (
                  <div className="h-full w-full [&>div]:h-full [&>div]:w-full">
                    <ChatComponent 
                      key={chatKey}
                      config={chatConfig} 
                      uiConfig={{
                        ...uiConfig,
                        containerWidth: undefined,
                        containerHeight: undefined,
                        backgroundColor: 'transparent'
                      }}
                      onMessageComplete={onMessageComplete}
                    />
                  </div>
                )}
                </motion.div>
              </div>
            </LiquidGlassBorder>
          </motion.div>
        </motion.div>
        )}
      </div>
    </main>
  );
}

