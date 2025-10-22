"use client";

import React, { useState, useEffect } from "react";
import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button";
import { LiquidGlassBorder } from "@/components/ui/liquid-glass-border";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, RefreshCw, MessageSquare, Shield, Eye, Upload, FileText, Image } from "lucide-react";

export default function A2ACovertDemo() {
  const [serverStatus, setServerStatus] = useState<"offline" | "online">("offline");
  const [covertInfo, setCovertInfo] = useState("0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100");
  const [agentDialogue, setAgentDialogue] = useState<string[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [covertInfoFile, setCovertInfoFile] = useState<File | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 组件加载时检查服务器状态
  useEffect(() => {
    handleRefresh();
  }, []);

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
      // 可以添加用户友好的错误提示
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
      // 即使API调用失败，也更新UI状态
      setServerStatus("offline");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefresh = async () => {
    // 确认重置操作
    const confirmed = window.confirm(
      "确定要重置系统吗？\n\n这将执行以下操作：\n" +
      "• 停止所有正在进行的客户端通信\n" +
      "• 重启A2A服务器（如果正在运行）\n" +
      "• 清空所有对话历史和评估结果\n" +
      "• 重置所有文件上传状态\n" +
      "• 恢复默认配置\n\n" +
      "此操作不可撤销，确定继续吗？"
    );
    
    if (!confirmed) {
      return;
    }
    
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
      setAgentDialogue([]);
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
          setAgentDialogue(prev => [...prev, `✅ 问题文件已上传: ${file.name}`]);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传问题文件失败:", error);
        setAgentDialogue(prev => [...prev, `❌ 上传问题文件失败: ${error}`]);
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
          setAgentDialogue(prev => [...prev, `✅ 隐写文件已上传: ${file.name}`]);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传隐写文件失败:", error);
        setAgentDialogue(prev => [...prev, `❌ 上传隐写文件失败: ${error}`]);
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
          setAgentDialogue(prev => [...prev, `✅ 隐蔽信息文件已上传: ${file.name}`]);
        } else {
          throw new Error(`上传失败: ${response.status}`);
        }
      } catch (error) {
        console.error("上传隐蔽信息文件失败:", error);
        setAgentDialogue(prev => [...prev, `❌ 上传隐蔽信息文件失败: ${error}`]);
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

  const handleStartCovertCommunication = async () => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      // 清空之前的数据
      setAgentDialogue([]);
      setEvaluationResults([]);
      
      // 显示连接状态
      setAgentDialogue(["正在连接到A2A服务器..."]);
      
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
        setAgentDialogue([
          "✅ 隐蔽通信已启动",
          "正在建立与A2A服务器的连接...",
          "等待Agent对话开始..."
        ]);
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
      setAgentDialogue([
        "⚠️ 无法启动隐蔽通信",
        "请确保以下服务正在运行：",
        "• A2A服务器 (http://localhost:9999)"
      ]);
      
      setEvaluationResults([
        "⚠️ 评估服务不可用",
        "需要启动所有后端服务来获取真实评估结果"
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              A2A 隐蔽通信演示系统
            </h1>
            <p className="text-gray-700 dark:text-gray-300">
              Intelligent Agent-to-Agent Covert Communication Demonstration based on Agent-to-Agent Protocol
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Configuration */}
            <LiquidGlassBorder variant="default" className="p-6 bg-white/80 dark:bg-white/10 backdrop-blur-sm border-gray-200 dark:border-white/20">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  服务器配置
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">隐写模型路径</Label>
                    <Select defaultValue="llama-3.2-3b">
                      <SelectTrigger className="bg-white/80 dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llama-3.2-3b">Llama-3.2-3B-Instruct</SelectItem>
                        <SelectItem value="gpt-3.5">GPT-3.5-Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude-3-Sonnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">服务器隐写算法</Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="bg-white/80 dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meteor">Meteor (推荐)</SelectItem>
                        <SelectItem value="discop">Discop</SelectItem>
                        <SelectItem value="artifacts">Artifacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">密钥交换状态</Label>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-900 dark:text-white">已完成交换</span>
                    </div>
                  </div>


                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">A2A服务器状态</Label>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${serverStatus === "online" ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-gray-900 dark:text-white">
                        {serverStatus === "online" ? "在线" : "离线"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <LiquidButton 
                    onClick={handleStartServer}
                    className="flex-1"
                    size="lg"
                    disabled={isConnecting || serverStatus === "online"}
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="flex-shrink-0">
                      {isConnecting ? "启动中..." : "启动A2A服务器"}
                    </span>
                  </LiquidButton>
                  
                  <LiquidButton 
                    onClick={handleStopServer}
                    className="flex-1"
                    size="lg"
                    disabled={isConnecting || serverStatus === "offline"}
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="flex-shrink-0">
                      {isConnecting ? "停止中..." : "停止A2A服务器"}
                    </span>
                  </LiquidButton>
                  
                  <LiquidButton 
                    onClick={handleRefresh}
                    size="lg"
                    disabled={isConnecting}
                    title="重置系统：停止所有通信，重启服务器，清空对话历史"
                  >
                    <RefreshCw className={`w-4 h-4 flex-shrink-0 ${isConnecting ? 'animate-spin' : ''}`} />
                    <span className="ml-2 text-sm">
                      {isConnecting ? "重置中..." : "重置系统"}
                    </span>
                  </LiquidButton>
                </div>
              </div>
            </LiquidGlassBorder>

            {/* Client Configuration */}
            <LiquidGlassBorder variant="default" className="p-6 bg-white/80 dark:bg-white/10 backdrop-blur-sm border-gray-200 dark:border-white/20">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  客户端配置
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">隐蔽信息</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="covert-info-file"
                        accept=".txt,.md,.json"
                        onChange={handleCovertInfoFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="covert-info-file"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                      >
                        <span className="text-gray-900 dark:text-white text-sm">选择文件</span>
                      </label>
                      {covertInfoFile && (
                        <div className="flex items-center gap-2 text-green-400">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{covertInfoFile.name}</span>
                        </div>
                      )}
                    </div>
                    {covertInfoFile && (
                      <p className="text-xs text-gray-400 mt-1">
                        文件大小: {Math.round(covertInfoFile.size / 1024)}KB
                      </p>
                    )}
                  </div>

                  {/* 文件上传部分 */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">问题文件上传</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          id="question-file"
                          accept=".txt,.md,.json"
                          onChange={handleQuestionFileUpload}
                          className="hidden"
                        />
                      <label
                        htmlFor="question-file"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                      >
                        <span className="text-gray-900 dark:text-white text-sm">选择文件</span>
                      </label>
                        {questionFile && (
                          <div className="flex items-center gap-2 text-green-400">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{questionFile.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">客户端隐写算法</Label>
                    <Select defaultValue="meteor">
                      <SelectTrigger className="bg-white/80 dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meteor">Meteor (推荐)</SelectItem>
                        <SelectItem value="discop">Discop</SelectItem>
                        <SelectItem value="artifacts">Artifacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4">
                  <LiquidButton 
                    onClick={handleStartCovertCommunication}
                    className="w-full flex items-center justify-center"
                    size="lg"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 flex-shrink-0 animate-spin" />
                        <span className="flex-shrink-0">连接中...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="flex-shrink-0">启动隐蔽通信</span>
                      </>
                    )}
                  </LiquidButton>
                </div>
              </div>
            </LiquidGlassBorder>
          </div>

          {/* Agent Dialogue Window */}
          <LiquidGlassBorder variant="default" className="mt-6 p-6 bg-white/80 dark:bg-white/10 backdrop-blur-sm border-gray-200 dark:border-white/20">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Agent对话窗口
              </h2>
              
              <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-4 min-h-[200px] border border-gray-200 dark:border-white/10">
                {agentDialogue.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>等待Agent开始对话...</p>
                    <p className="text-sm mt-2">点击&apos;启动隐蔽通信&apos;按钮开始演示</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agentDialogue.map((message, index) => (
                      <div key={index} className="text-gray-900 dark:text-white font-mono text-sm">
                        {message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </LiquidGlassBorder>

          {/* GPT Credibility Assessment Results */}
          <LiquidGlassBorder variant="default" className="mt-6 p-6 bg-white/80 dark:bg-white/10 backdrop-blur-sm border-gray-200 dark:border-white/20">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                GPT可信度评估结果
              </h2>
              
              <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-4 min-h-[150px] border border-gray-200 dark:border-white/10">
                {evaluationResults.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>等待评估结果...</p>
                    <p className="text-sm mt-2">对话开始后将显示每轮的评估结果</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evaluationResults.map((result, index) => (
                      <div key={index} className="text-gray-900 dark:text-white font-mono text-sm">
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </LiquidGlassBorder>
        </div>
      </div>
    </AuroraBackground>
  );
}