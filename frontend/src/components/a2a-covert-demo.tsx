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

export default function A2ACovertDemo() {
  const [serverStatus, setServerStatus] = useState<"offline" | "online">("offline");
  const [covertInfo, setCovertInfo] = useState("0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100");
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [covertInfoFile, setCovertInfoFile] = useState<File | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [keyExchangeStatus, setKeyExchangeStatus] = useState<"completed" | "pending">("completed");
  const [isSimulating, setIsSimulating] = useState(false);

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
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderColor: '#e5e7eb',
      showBorder: true,
      nameColor: '#4b5563'
    },
    rightChat: {
      backgroundColor: '#eff6ff',
      textColor: '#1f2937',
      borderColor: '#bfdbfe',
      showBorder: true,
      nameColor: '#3b82f6'
    }
  };

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

  // 组件加载时检查服务器状态
  useEffect(() => {
    handleRefresh();
  }, []);

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
          stego_model_path: '/root/autodl-tmp/Llama-3.2-3B-Instruct',
          stego_algorithm: 'meteor',
          stego_key: '7b9ec09254aa4a7589e4d0cfd80d46cc',
          decrypted_bits_path: 'data/stego/decrypted_bits.txt',
          session_id: 'covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126',
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
                stego_model_path: '/root/autodl-tmp/Llama-3.2-3B-Instruct',
                stego_algorithm: 'meteor',
                stego_key: '7b9ec09254aa4a7589e4d0cfd80d46cc',
                decrypted_bits_path: 'data/stego/decrypted_bits.txt',
                session_id: 'covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126',
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
      
      // 3. 清空对话历史和评估结果
      setChatConfig(null);
      setEvaluationResults([]);
      
      // 4. 重置文件上传状态
      setQuestionFile(null);
      setStegoFile(null);
      setCovertInfoFile(null);
      
      // 5. 重置隐蔽信息到默认值
      setCovertInfo("0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100");
      
      // 6. 检查最终状态
      const statusResponse = await fetch('http://localhost:9999/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setServerStatus(data.status === "running" ? "online" : "offline");
        console.log("系统已刷新，服务器状态:", data.status);
      } else {
        setServerStatus("offline");
      }
      
    } catch (error) {
      console.error("刷新系统失败:", error);
      setServerStatus("offline");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuestionFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setQuestionFile(file);
      
      try {
        // 上传文件到服务器
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:9999/upload/question', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("问题文件上传成功:", result);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传问题文件失败:", error);
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

  // 模拟对话函数 - 创建聊天配置
  const simulateDialogue = () => {
    setIsSimulating(true);
    setEvaluationResults([]);
    
    const messages = createMockMessages();
    const config: ChatConfig = {
      leftPerson: {
        name: "Agent A",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
      },
      rightPerson: {
        name: "Agent B",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
      },
      messages
    };
    
    setChatConfig(config);
    setIsSimulating(false); // 组件会自动处理消息显示
  };

  const handleStartCovertCommunication = async () => {
    if (isConnecting || isSimulating) return;
    
    // 调试模式：使用模拟对话
    const DEBUG_MODE = true; // 设置为 false 来使用真实API
    
    if (DEBUG_MODE) {
      simulateDialogue();
      return;
    }
    
    try {
      setIsConnecting(true);
      // 清空之前的数据
      setChatConfig(null);
      setEvaluationResults([]);
      
      // 显示连接状态 - 创建初始消息配置
      const initialConfig: ChatConfig = {
        leftPerson: {
          name: "Agent A",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
        },
        rightPerson: {
          name: "Agent B",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
        },
        messages: [{
          id: 1,
          sender: 'left',
          type: 'text',
          content: '正在连接到A2A服务器...',
          loader: { enabled: false }
        }]
      };
      setChatConfig(initialConfig);
      
      // 处理文件路径
      let questionPath = 'data/question/general.txt';
      let secretBitPath = 'data/stego/secret_bits_frontend.txt';
      
      // 如果有上传的问题文件，使用上传的文件名
      if (questionFile) {
        questionPath = `data/question/${questionFile.name}`;
        console.log("使用上传的问题文件:", questionPath);
      }
      
      // 如果有上传的隐蔽信息文件，使用上传的文件名
      if (covertInfoFile) {
        secretBitPath = `data/stego/${covertInfoFile.name}`;
        console.log("使用上传的隐蔽信息文件:", secretBitPath);
      } else {
        // 如果没有上传文件，保存当前输入的隐蔽信息
        const saveSecretResponse = await fetch('http://localhost:9999/save_secret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: 'covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126',
            secret_bits: covertInfo
          })
        });
        
        if (!saveSecretResponse.ok) {
          throw new Error("保存隐蔽信息失败");
        }
        
        const saveResult = await saveSecretResponse.json();
        secretBitPath = saveResult.path;
        console.log("隐蔽信息已保存到:", secretBitPath);
      }
      
      // 启动隐蔽通信
      const response = await fetch('http://localhost:9999/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stego_model_path: '/root/autodl-tmp/Llama-3.2-3B-Instruct',
          stego_algorithm: 'meteor',
          question_path: questionPath,
          question_index: 0,
          stego_key: '7b9ec09254aa4a7589e4d0cfd80d46cc',
          secret_bit_path: secretBitPath,
          server_url: 'http://localhost:9999',
          session_id: 'covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const successConfig: ChatConfig = {
          leftPerson: {
            name: "Agent A",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
          },
          rightPerson: {
            name: "Agent B",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
          },
          messages: [
            {
              id: 1,
              sender: 'left',
              type: 'text',
              content: '✅ 隐蔽通信已启动',
              loader: { enabled: false }
            },
            {
              id: 2,
              sender: 'left',
              type: 'text',
              content: '正在建立与A2A服务器的连接...',
              loader: { enabled: false }
            },
            {
              id: 3,
              sender: 'left',
              type: 'text',
              content: '等待Agent对话开始...',
              loader: { enabled: false }
            }
          ]
        };
        setChatConfig(successConfig);
        setEvaluationResults([
          "✅ 评估服务已连接",
          "开始监控通信质量..."
        ]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error("启动隐蔽通信失败:", error);
      
      // 如果后端服务不可用，显示提示信息
      const errorConfig: ChatConfig = {
        leftPerson: {
          name: "Agent A",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
        },
        rightPerson: {
          name: "Agent B",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
        },
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
    <main className="relative flex min-h-screen bg-zinc-50 dark:bg-zinc-900 text-slate-950">
      <div className="flex w-full">
        {/* Left Sidebar - Configuration Panels */}
        <motion.div 
          className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-950 p-4 overflow-y-auto"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4">
            {/* Server Configuration Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <LiquidGlassBorder className="p-4 rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-black dark:text-white" />
                    <div>
                      <h2 className="text-sm font-semibold text-black dark:text-white">服务器配置</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">配置A2A服务器参数和状态</p>
                    </div>
                  </div>
                  {/* Model Path */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-black dark:text-white flex items-center gap-1.5">
                      <Settings className="w-3 h-3" />
                      隐写模型路径
                    </Label>
                    <Select defaultValue="llama-3.2-3b">
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-800 border-gray-300 dark:border-gray-700 text-black dark:text-white">
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
                    <Label className="text-xs font-medium text-black dark:text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      服务器隐写算法
                    </Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-800 border-gray-300 dark:border-gray-700 text-black dark:text-white">
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
                      <Label className="text-xs text-gray-600 dark:text-gray-400">密钥交换状态</Label>
                      <div className="flex items-center gap-1.5">
                        {keyExchangeStatus === "completed" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-black dark:text-white">已完成交换</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                            <span className="text-xs font-medium text-black dark:text-white">交换中...</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">A2A服务器状态</Label>
                      <div className="flex items-center gap-1.5">
                        {serverStatus === "online" ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-black dark:text-white">在线</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-xs font-medium text-black dark:text-white">离线</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-1.5 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <LiquidButton
                      onClick={handleStartServer}
                      size="sm"
                      className="flex-1 h-7"
                      disabled={isConnecting || serverStatus === "online"}
                      title="Start A2A Server"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
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
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                    </LiquidButton>
                    
                    <LiquidButton
                      onClick={handleRefresh}
                      size="sm"
                      className="flex-1 h-7"
                      disabled={isConnecting}
                      title="Reset System"
                    >
                      <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                    </LiquidButton>
                  </div>
                </div>
              </LiquidGlassBorder>
            </motion.div>

            {/* Client Configuration Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <LiquidGlassBorder className="p-4 rounded-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-black dark:text-white" />
                    <div>
                      <h2 className="text-sm font-semibold text-black dark:text-white">客户端配置</h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">配置隐蔽通信参数</p>
                    </div>
                  </div>
                  {/* Covert Information File Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-black dark:text-white flex items-center gap-1.5">
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
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-xs"
                      >
                        <Upload className="w-3 h-3" />
                        <span className="font-medium text-black dark:text-white">选择文件</span>
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
                    <Label className="text-xs font-medium text-black dark:text-white flex items-center gap-1.5">
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
                        className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-xs"
                      >
                        <Upload className="w-3 h-3" />
                        <span className="font-medium text-black dark:text-white">选择文件</span>
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
                    <Label className="text-xs font-medium text-black dark:text-white flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      客户端隐写算法
                    </Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-800 border-gray-300 dark:border-gray-700 text-black dark:text-white">
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
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                    <LiquidButton
                      onClick={handleStartCovertCommunication}
                      className="w-full h-8 text-xs"
                      disabled={isConnecting || isSimulating}
                      title="Start Covert Communication"
                    >
                      {isConnecting || isSimulating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                    </LiquidButton>
                  </div>
                </div>
              </LiquidGlassBorder>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Content Area - Agent Dialogue Window */}
        <motion.div
          className="flex-1 flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <LiquidGlassBorder className="m-4 p-6 rounded-2xl flex-1 flex flex-col">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-black dark:text-white">Agent对话窗口</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Agent之间的对话内容</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md">
                  <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">调试模式</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-950/50 rounded-lg flex-1 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {!chatConfig ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                      等待Agent开始对话...
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      点击&apos;启动隐蔽通信&apos;按钮开始演示
                    </p>
                  </div>
                ) : (
                  <div className="h-full w-full [&>div]:h-full [&>div]:w-full">
                    <ChatComponent 
                      config={chatConfig} 
                      uiConfig={{
                        ...uiConfig,
                        containerWidth: undefined,
                        containerHeight: undefined,
                        backgroundColor: 'transparent'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </LiquidGlassBorder>
        </motion.div>
      </div>
    </main>
  );
}

