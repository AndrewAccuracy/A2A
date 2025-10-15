"use client";

import React, { useState } from "react";
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

  const handleStartServer = () => {
    setServerStatus("online");
  };

  const handleStopServer = () => {
    setServerStatus("offline");
  };

  const handleRefresh = () => {
    // Refresh logic here
  };

  const handleQuestionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setQuestionFile(file);
      console.log("问题文件已上传:", file.name);
    }
  };

  const handleStegoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStegoFile(file);
      console.log("隐写文件已上传:", file.name);
    }
  };

  const handleCovertInfoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCovertInfoFile(file);
      // 读取文件内容并设置到covertInfo状态中
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCovertInfo(content);
        console.log("隐蔽信息文件已上传:", file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleStartCovertCommunication = () => {
    setAgentDialogue([
      "Agent A: 你好，今天天气不错。",
      "Agent B: 是的，很适合散步。",
      "Agent A: 我听说公园里有很多花。",
      "Agent B: 确实，春天到了。"
    ]);
    
    setEvaluationResults([
      "第1轮: 可信度 85% - 正常对话",
      "第2轮: 可信度 78% - 轻微异常",
      "第3轮: 可信度 92% - 正常对话",
      "第4轮: 可信度 88% - 正常对话"
    ]);
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
                  >
                    <Play className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="flex-shrink-0">启动A2A服务器</span>
                  </LiquidButton>
                  
                  <LiquidButton 
                    onClick={handleStopServer}
                    className="flex-1"
                    size="lg"
                  >
                    <Square className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="flex-shrink-0">停止A2A服务器</span>
                  </LiquidButton>
                  
                  <LiquidButton 
                    onClick={handleRefresh}
                    size="lg"
                  >
                    <RefreshCw className="w-4 h-4 flex-shrink-0" />
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
                  >
                    <MessageSquare className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="flex-shrink-0">启动隐蔽通信</span>
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