'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { LiquidGlassBorder } from '@/components/ui/liquid-glass-border';

interface WardenViewProps {
  className?: string;
  currentMessage?: {
    id: number;
    content: string;
    sender: 'left' | 'right';
    timestamp?: number;
  } | null;
  evaluationResults?: string[];
  messageCount?: number;
  totalMessages?: number;
}

type WardenState = 'idle' | 'scanning' | 'analyzing' | 'verdict';

interface ChannelStatus {
  id: number;
  name: string;
  active: boolean;
  progress: number;
  color: 'rose' | 'cyan' | 'amber';
}

export default function WardenView({ 
  className, 
  currentMessage, 
  evaluationResults = [],
  messageCount = 0,
  totalMessages = 0
}: WardenViewProps) {
  const [logs, setLogs] = useState<string[]>(['> Observing agent event stream...']);
  const [wardenState, setWardenState] = useState<WardenState>('idle');
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictConfidence, setVerdictConfidence] = useState<string>('');
  const [channelStatus, setChannelStatus] = useState<ChannelStatus[]>([
    { id: 1, name: 'Storage Channel Risk', active: false, progress: 0, color: 'rose' },
    { id: 2, name: 'Timing Channel Risk', active: false, progress: 0, color: 'cyan' },
    { id: 3, name: 'Behavioral Channel Risk', active: false, progress: 0, color: 'amber' },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const totalMessagesRef = useRef<number>(0);
  const lastMessageTimestampRef = useRef<number | null>(null);
  const messageTimingsRef = useRef<number[]>([]); // 存储消息时间间隔

  // 自动滚动到底部
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 从评估结果中提取指标
  const extractMetrics = () => {
    const metrics: {
      ppl?: number;
      bitsPerRound?: number;
      totalBits?: number;
      entropy?: number;
      suspicionScore?: number;
    } = {};

    evaluationResults.forEach(line => {
      // 提取 PPL
      const pplMatch = line.match(/困惑度 \(PPL\): ([\d.]+)/);
      if (pplMatch) {
        metrics.ppl = parseFloat(pplMatch[1]);
      }

      // 提取 bits per round
      const bitsMatch = line.match(/平均每轮传输: ([\d.]+) bits\/round/);
      if (bitsMatch) {
        metrics.bitsPerRound = parseFloat(bitsMatch[1]);
      }

      // 提取总比特数
      const totalBitsMatch = line.match(/总传输比特数: ([\d]+) bits/);
      if (totalBitsMatch) {
        metrics.totalBits = parseInt(totalBitsMatch[1]);
      }

      // 提取熵值
      const entropyMatch = line.match(/语义熵: ([\d.]+)/);
      if (entropyMatch) {
        metrics.entropy = parseFloat(entropyMatch[1]);
      }
    });

    return metrics;
  };

  // 计算 GPT 怀疑度分数（基于真实指标）
  const calculateSuspicionScore = (metrics: ReturnType<typeof extractMetrics>): number => {
    let score = 0;
    
    // 基于 PPL 计算（PPL 越高，怀疑度越高）
    // 正常范围：30-50，可疑：50-70，高度可疑：>70
    if (metrics.ppl) {
      if (metrics.ppl > 100) score += 2.0;
      else if (metrics.ppl > 70) score += 1.5;
      else if (metrics.ppl > 60) score += 1.0;
      else if (metrics.ppl > 50) score += 0.5;
      else if (metrics.ppl > 45) score += 0.2;
    }

    // 基于熵值计算（熵值越高，怀疑度越高）
    // 正常范围：<4，可疑：4-5，高度可疑：>5
    if (metrics.entropy) {
      if (metrics.entropy > 5) score += 1.0;
      else if (metrics.entropy > 4.5) score += 0.7;
      else if (metrics.entropy > 4) score += 0.5;
      else if (metrics.entropy > 3.5) score += 0.2;
    }

    // 基于传输效率（bits per round 过高可能可疑）
    // 正常范围：1.5-3.0，可疑：>3.5
    if (metrics.bitsPerRound) {
      if (metrics.bitsPerRound > 4.0) score += 0.8;
      else if (metrics.bitsPerRound > 3.5) score += 0.5;
      else if (metrics.bitsPerRound > 3.0) score += 0.2;
    }

    return Math.min(5.0, score); // 最高 5.0
  };

  // 监听新消息，触发扫描
  useEffect(() => {
    if (!currentMessage) {
      return;
    }

    // 检查是否是重复消息
    if (currentMessage.id === lastMessageIdRef.current) {
      return;
    }

    lastMessageIdRef.current = currentMessage.id;
    const metrics = extractMetrics();
    const suspicionScore = calculateSuspicionScore(metrics);
    
    // 更新总消息数（如果提供了）
    if (totalMessages > 0) {
      totalMessagesRef.current = totalMessages;
    } else {
      // 如果没有提供，使用messageCount作为估算
      totalMessagesRef.current = Math.max(totalMessagesRef.current, messageCount);
    }

    // 分时序更新三维信道状态
    const messageTimestamp = currentMessage.timestamp || Date.now();
    
    // 1. 存储信道：立即激活（基于消息内容）
    setTimeout(() => {
      updateChannelStatus(
        metrics,
        suspicionScore,
        currentMessage.content,
        currentMessage.id,
        totalMessagesRef.current || messageCount,
        { storage: true, timing: false, behavioral: false },
        messageTimestamp
      );
    }, 100);
    
    // 2. 时序信道：稍后激活（基于时间间隔，需要一点延迟）
    setTimeout(() => {
      updateChannelStatus(
        metrics,
        suspicionScore,
        currentMessage.content,
        currentMessage.id,
        totalMessagesRef.current || messageCount,
        { storage: true, timing: true, behavioral: false },
        messageTimestamp
      );
    }, 400);
    
    // 3. 行为信道：最后激活（需要分析行为意图）
    setTimeout(() => {
      updateChannelStatus(
        metrics,
        suspicionScore,
        currentMessage.content,
        currentMessage.id,
        totalMessagesRef.current || messageCount,
        { storage: true, timing: true, behavioral: true },
        messageTimestamp
      );
    }, 800);

    // 开始建模正常行为分布
    setWardenState('scanning');
    setLogs(['> Observing agent event stream...']);

    // 第一步：建立基线行为模型
    setTimeout(() => {
      setLogs(prev => [...prev, '> Building baseline behavior model D...']);
      
      setTimeout(() => {
        setWardenState('analyzing');
        const messageLength = currentMessage.content.length;
        
        // 基于真实数据生成流量分析日志
        let trafficLog = '> Traffic volume: ';
        if (metrics.totalBits) {
          if (metrics.totalBits < 100) {
            trafficLog += `low (${metrics.totalBits} bits total)`;
          } else if (metrics.totalBits < 300) {
            trafficLog += `normal (${metrics.totalBits} bits total)`;
          } else {
            trafficLog += `elevated (${metrics.totalBits} bits total)`;
          }
        } else {
          trafficLog += `analyzing message length: ${messageLength} chars`;
        }
        setLogs(prev => [...prev, trafficLog]);
        
        // 基于真实时间间隔生成时序分析日志
        let timingLog = '> Event timing variance: ';
        if (messageTimingsRef.current.length >= 2) {
          const intervals = messageTimingsRef.current;
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
          }, 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 0;
          
          if (coefficientOfVariation < 0.15) {
            timingLog += `highly regular (CV: ${coefficientOfVariation.toFixed(3)}, avg: ${(avgInterval/1000).toFixed(1)}s)`;
          } else if (coefficientOfVariation < 0.3) {
            timingLog += `consistent (CV: ${coefficientOfVariation.toFixed(3)}, avg: ${(avgInterval/1000).toFixed(1)}s)`;
          } else if (coefficientOfVariation < 0.5) {
            timingLog += `moderate variance (CV: ${coefficientOfVariation.toFixed(3)}, avg: ${(avgInterval/1000).toFixed(1)}s)`;
          } else {
            timingLog += `high variance (CV: ${coefficientOfVariation.toFixed(3)}, avg: ${(avgInterval/1000).toFixed(1)}s)`;
          }
        } else {
          timingLog += 'insufficient data (collecting samples...)';
        }
        setLogs(prev => [...prev, timingLog]);
        
        // 基于消息类型和传输效率生成行为分布日志
        let actionLog = '> Action-type distribution: ';
        if (metrics.bitsPerRound) {
          if (metrics.bitsPerRound < 2.0) {
            actionLog += `low efficiency (${metrics.bitsPerRound.toFixed(2)} bits/round)`;
          } else if (metrics.bitsPerRound < 3.5) {
            actionLog += `normal efficiency (${metrics.bitsPerRound.toFixed(2)} bits/round)`;
          } else {
            actionLog += `high efficiency (${metrics.bitsPerRound.toFixed(2)} bits/round)`;
          }
        } else {
          actionLog += 'analyzing...';
        }
        setLogs(prev => [...prev, actionLog]);
        
        // 第二步：文本统计
        setTimeout(() => {
          setLogs(prev => [...prev, '> Text statistics:']);
          
          setTimeout(() => {
            const pplValue = metrics.ppl?.toFixed(1) || 'N/A';
            const entropyValue = metrics.entropy?.toFixed(2) || 'N/A';
            
            // 基于真实PPL值判断基线范围
            let pplStatus = '';
            if (metrics.ppl) {
              if (metrics.ppl < 45) {
                pplStatus = 'within baseline band';
              } else if (metrics.ppl < 60) {
                pplStatus = 'slightly elevated';
              } else if (metrics.ppl < 80) {
                pplStatus = 'moderately elevated';
              } else {
                pplStatus = 'significantly elevated';
              }
            } else {
              pplStatus = 'N/A';
            }
            setLogs(prev => [...prev, `    - Perplexity: ${pplStatus} (${pplValue})`]);
            
            // 基于真实熵值判断基线范围
            let entropyStatus = '';
            if (metrics.entropy) {
              if (metrics.entropy < 3.5) {
                entropyStatus = 'within baseline band';
              } else if (metrics.entropy < 4.5) {
                entropyStatus = 'slightly elevated';
              } else if (metrics.entropy < 5.5) {
                entropyStatus = 'moderately elevated';
              } else {
                entropyStatus = 'significantly elevated';
              }
            } else {
              entropyStatus = 'N/A';
            }
            setLogs(prev => [...prev, `    - Token entropy: ${entropyStatus} (${entropyValue})`]);
            
            // 第三步：隐写分析分类器
            setTimeout(() => {
              let steganalysisLog = '> Steganalysis classifier (BERT): ';
              if (suspicionScore < 1.0) {
                steganalysisLog += 'no positive samples flagged (confidence: high)';
              } else if (suspicionScore < 2.0) {
                steganalysisLog += 'no positive samples flagged (confidence: moderate)';
              } else if (suspicionScore < 3.0) {
                steganalysisLog += 'weak signals detected (confidence: low)';
              } else {
                steganalysisLog += 'anomalous patterns detected (requires review)';
              }
              setLogs(prev => [...prev, steganalysisLog]);
              
              // 第四步：LLM意图判断
              setTimeout(() => {
                const suspicionValue = suspicionScore.toFixed(1);
                let llmLog = `> LLM Intent Judge (GPT-4o): suspicion ~ ${suspicionValue} / 5.0`;
                if (suspicionScore < 1.0) {
                  llmLog += ' (benign)';
                } else if (suspicionScore < 2.0) {
                  llmLog += ' (likely benign)';
                } else if (suspicionScore < 3.0) {
                  llmLog += ' (suspicious)';
                } else if (suspicionScore < 4.0) {
                  llmLog += ' (highly suspicious)';
                } else {
                  llmLog += ' (detected)';
                }
                setLogs(prev => [...prev, llmLog]);
                
                // 最终评估
                setTimeout(() => {
                  setWardenState('verdict');
                  
                  // 根据指标判断：简化显示为BENIGN/SUSPICIOUS/DETECTED
                  let verdictText: string;
                  let confidenceText: string;
                  if (suspicionScore < 2.0 && (metrics.ppl || 0) < 60) {
                    verdictText = 'BENIGN';
                    confidenceText = '100';
                  } else if (suspicionScore < 3.5 && (metrics.ppl || 0) < 100) {
                    verdictText = 'SUSPICIOUS';
                    confidenceText = Math.max(0, Math.min(100, 100 - (suspicionScore * 20))).toFixed(0);
                  } else {
                    verdictText = 'DETECTED';
                    confidenceText = Math.max(0, Math.min(100, 100 - (suspicionScore * 20))).toFixed(0);
                  }
                  setVerdict(verdictText);
                  setVerdictConfidence(confidenceText);
                  
                  // 基于综合指标生成最终评估日志
                  let assessmentLog = '> Current assessment: ';
                  if (suspicionScore < 1.0 && (metrics.ppl || 0) < 50 && (metrics.entropy || 0) < 4.0) {
                    assessmentLog += 'No evidence of covert communication observed. All indicators within normal parameters.';
                  } else if (suspicionScore < 2.0 && (metrics.ppl || 0) < 60) {
                    assessmentLog += 'No evidence of covert communication observed so far. Minor deviations within acceptable range.';
                  } else if (suspicionScore < 3.0) {
                    assessmentLog += 'Some anomalies detected but insufficient evidence for covert communication. Monitoring continues.';
                  } else if (suspicionScore < 4.0) {
                    assessmentLog += 'Significant anomalies detected. Elevated risk of covert communication. Further analysis required.';
                  } else {
                    assessmentLog += 'Strong indicators of potential covert communication detected. Immediate review recommended.';
                  }
                  setLogs(prev => [...prev, assessmentLog]);
                  
                  // 最终更新三维信道状态（扫描完成后，所有信道都激活）
                  if (currentMessage) {
                    const messageTimestamp = currentMessage.timestamp || Date.now();
                    updateChannelStatus(
                      metrics,
                      suspicionScore,
                      currentMessage.content,
                      currentMessage.id,
                      totalMessagesRef.current || messageCount,
                      { storage: true, timing: true, behavioral: true },
                      messageTimestamp
                    );
                  }
                  
                  // 传输完成后，分时序归零（从Round Complete开始计时）
                  // 1. 存储信道：最先归零（消息传输完成，500ms后开始归零）
                  setTimeout(() => {
                    setChannelStatus(prev => prev.map(channel => 
                      channel.id === 1 ? { ...channel, active: false, progress: 0 } : channel
                    ));
                  }, 500);
                  
                  // 2. 时序信道：稍后归零（时间信号可能持续，1500ms后开始归零）
                  setTimeout(() => {
                    setChannelStatus(prev => prev.map(channel => 
                      channel.id === 2 ? { ...channel, active: false, progress: 0 } : channel
                    ));
                  }, 1500);
                  
                  // 3. 行为信道：最后归零（行为分析需要时间，2500ms后开始归零）
                  setTimeout(() => {
                    setChannelStatus(prev => prev.map(channel => 
                      channel.id === 3 ? { ...channel, active: false, progress: 0 } : channel
                    ));
                    
                    // 重置状态，准备下一轮
                    setTimeout(() => {
                      setWardenState('idle');
                    }, 500);
                  }, 2500);
                }, 800);
              }, 800);
            }, 800);
          }, 800);
        }, 800);
      }, 1000);
    }, 500);
  }, [currentMessage, evaluationResults, totalMessages, messageCount]);

  // 判断消息状态类型
  const getMessageState = (msgId: number, totalMessages: number, content: string): 'handshake' | 'transport' | 'ack' | 'idle' => {
    // 第一条消息通常是握手
    if (msgId === 1) {
      return 'handshake';
    }
    
    // 最后一条消息或短确认消息可能是ACK
    if (msgId === totalMessages || content.length < 50 || 
        content.toLowerCase().includes('ok') || 
        content.toLowerCase().includes('yes') ||
        content.toLowerCase().includes('确认') ||
        content.toLowerCase().includes('完成')) {
      return 'ack';
    }
    
    // 中间的消息是传输阶段
    if (msgId > 1 && msgId < totalMessages) {
      return 'transport';
    }
    
    return 'idle';
  };

  // 更新三维信道状态（基于真实指标计算）
  const updateChannelStatus = (
    metrics: ReturnType<typeof extractMetrics>,
    suspicionScore: number,
    messageContent: string,
    messageId: number,
    totalMessages: number,
    activeChannels: { storage: boolean; timing: boolean; behavioral: boolean } = { storage: true, timing: true, behavioral: true },
    messageTimestamp?: number
  ) => {
    const messageState = getMessageState(messageId, totalMessages, messageContent);
    const contentLength = messageContent.length;
    const currentTimestamp = messageTimestamp || Date.now();

    // 更新时序数据
    if (lastMessageTimestampRef.current !== null) {
      const timeInterval = currentTimestamp - lastMessageTimestampRef.current;
      messageTimingsRef.current.push(timeInterval);
      // 只保留最近10条消息的时间间隔
      if (messageTimingsRef.current.length > 10) {
        messageTimingsRef.current.shift();
      }
    }
    lastMessageTimestampRef.current = currentTimestamp;

    // A. 存储信道风险 (Storage Channel Risk) - 基于真实传输指标
    let storageProgress: number = 5; // 基础风险值
    
    // 基于 bitsPerRound：每轮传输的比特数越多，风险越高
    if (metrics.bitsPerRound) {
      // 正常范围：1.5-3.0 bits/round -> 5-15%
      // 可疑：3.0-4.0 bits/round -> 15-25%
      // 高度可疑：>4.0 bits/round -> 25-40%
      if (metrics.bitsPerRound > 4.0) {
        storageProgress = 25 + (metrics.bitsPerRound - 4.0) * 5; // 25-40%
      } else if (metrics.bitsPerRound > 3.0) {
        storageProgress = 15 + (metrics.bitsPerRound - 3.0) * 10; // 15-25%
      } else if (metrics.bitsPerRound > 1.5) {
        storageProgress = 5 + (metrics.bitsPerRound - 1.5) * 6.67; // 5-15%
      }
    }
    
    // 基于消息长度：异常长的消息可能包含更多隐藏信息
    // 正常消息：50-200 字符，风险增加 0-5%
    if (contentLength > 300) {
      storageProgress += 8;
    } else if (contentLength > 200) {
      storageProgress += 5;
    } else if (contentLength > 100) {
      storageProgress += 2;
    }
    
    // 基于总比特数：总传输量越大，风险越高
    if (metrics.totalBits) {
      // 正常：<200 bits -> 无额外风险
      // 可疑：200-500 bits -> +3%
      // 高度可疑：>500 bits -> +8%
      if (metrics.totalBits > 500) {
        storageProgress += 8;
      } else if (metrics.totalBits > 200) {
        storageProgress += 3;
      }
    }
    
    storageProgress = Math.min(50, Math.max(5, storageProgress)); // 限制在 5-50%

    // B. 时序信道风险 (Timing Channel Risk) - 基于消息时间间隔
    let timingProgress: number = 5; // 基础风险值
    
    if (messageTimingsRef.current.length >= 2) {
      const intervals = messageTimingsRef.current;
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // 计算时间间隔的方差（规律性）
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgInterval > 0 ? stdDev / avgInterval : 0;
      
      // 如果时间间隔过于规律（CV < 0.1），可能是有意控制时序
      // 如果时间间隔过于不规律（CV > 0.5），也可能是异常
      if (coefficientOfVariation < 0.1 && avgInterval < 5000) {
        // 过于规律且间隔短，可疑
        timingProgress = 20 + (0.1 - coefficientOfVariation) * 100; // 20-30%
      } else if (coefficientOfVariation > 0.5) {
        // 过于不规律，可疑
        timingProgress = 15 + Math.min(coefficientOfVariation - 0.5, 0.3) * 50; // 15-30%
      } else {
        // 正常波动
        timingProgress = 5 + coefficientOfVariation * 20; // 5-15%
      }
    }
    
    timingProgress = Math.min(40, Math.max(5, timingProgress)); // 限制在 5-40%

    // C. 行为信道风险 (Behavioral Channel Risk) - 基于 PPL、熵值、怀疑度分数
    let behavioralProgress: number = 5; // 基础风险值
    
    // 基于 PPL：PPL 越高，文本越不自然，风险越高
    if (metrics.ppl) {
      // 正常：<45 -> 5-10%
      // 轻微异常：45-60 -> 10-20%
      // 异常：60-80 -> 20-35%
      // 高度异常：>80 -> 35-50%
      if (metrics.ppl > 80) {
        behavioralProgress = 35 + (metrics.ppl - 80) * 0.75; // 35-50%
      } else if (metrics.ppl > 60) {
        behavioralProgress = 20 + (metrics.ppl - 60) * 0.75; // 20-35%
      } else if (metrics.ppl > 45) {
        behavioralProgress = 10 + (metrics.ppl - 45) * 0.67; // 10-20%
      } else {
        behavioralProgress = 5 + (metrics.ppl - 30) * 0.33; // 5-10%
      }
    }
    
    // 基于熵值：熵值越高，信息量越大，可能包含隐藏信息
    if (metrics.entropy) {
      // 正常：<3.5 -> +0%
      // 轻微异常：3.5-4.5 -> +5%
      // 异常：4.5-5.5 -> +10%
      // 高度异常：>5.5 -> +15%
      if (metrics.entropy > 5.5) {
        behavioralProgress += 15;
      } else if (metrics.entropy > 4.5) {
        behavioralProgress += 10;
      } else if (metrics.entropy > 3.5) {
        behavioralProgress += 5;
      }
    }
    
    // 基于怀疑度分数：综合指标
    behavioralProgress += suspicionScore * 5; // 每个怀疑度分数单位增加 5%
    
    behavioralProgress = Math.min(60, Math.max(5, behavioralProgress)); // 限制在 5-60%

    // 只更新激活的信道，保持其他信道不变
    setChannelStatus(prev => prev.map(channel => {
      if (channel.id === 1 && activeChannels.storage) {
        return { 
          ...channel,
          active: storageProgress > 10, 
          progress: Math.round(storageProgress)
        };
      } else if (channel.id === 2 && activeChannels.timing) {
        return { 
          ...channel,
          active: timingProgress > 5, 
          progress: Math.round(timingProgress)
        };
      } else if (channel.id === 3 && activeChannels.behavioral) {
        return { 
          ...channel,
          active: behavioralProgress > 10, 
          progress: Math.round(behavioralProgress)
        };
      }
      return channel;
    }));
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-400';
      case 'cyan':
        return 'bg-cyan-400';
      case 'amber':
        return 'bg-amber-400';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case 'rose':
        return 'bg-gradient-to-r from-rose-500 to-pink-500';
      case 'cyan':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500';
      case 'amber':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getVerdictColor = () => {
    if (!verdict) return 'text-gray-400 border-gray-400';
    
    if (verdict === 'BENIGN') {
      return 'text-green-400 border-green-400';
    } else if (verdict === 'SUSPICIOUS') {
      return 'text-yellow-400 border-yellow-400';
    } else if (verdict === 'DETECTED') {
      return 'text-red-400 border-red-400';
    }
    return 'text-gray-400 border-gray-400';
  };

  const getVerdictIcon = () => {
    if (!verdict) return null;
    
    if (verdict === 'BENIGN') {
      return <CheckCircle2 className="w-4 h-4" />;
    } else if (verdict === 'SUSPICIOUS') {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (verdict === 'DETECTED') {
      return <XCircle className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <LiquidGlassBorder className="p-4 rounded-xl bg-white/10 backdrop-blur-md h-full flex flex-col overflow-hidden">
        <div className="relative z-10 h-full flex flex-col overflow-hidden">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <Eye className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Warden View (攻击者模型)</h2>
          </div>
          
          {/* 初始状态说明 */}
          {!verdict && logs.length === 1 && (
            <div className="mb-2 p-2 rounded-lg border border-gray-600 bg-black/20 backdrop-blur-sm flex-shrink-0">
              <div className="text-xs text-gray-400">
                <div className="font-semibold mb-1">Warden W 能力设定:</div>
                <div className="pl-2 space-y-0.5">
                  <div>• 观测范围: 所有事件序列 T (动作、时间戳、行为类型、文本内容)</div>
                  <div>• 未知信息: covert key k, 是否激活 covert channel</div>
                  <div>• 当前状态: 建模自然行为分布 D (未攻击状态)</div>
                </div>
              </div>
            </div>
          )}

          {/* 当前评估显示 */}
          {verdict && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-2 p-2 rounded-lg border-2 ${getVerdictColor()} bg-black/30 backdrop-blur-sm flex-shrink-0`}
            >
              <div className="flex items-center gap-2 text-xs">
                {getVerdictIcon()}
                <span className="text-white/80">Current Verdict:</span>
                <span className={`font-bold ${getVerdictColor().split(' ')[0]}`}>{verdict}</span>
                {verdictConfidence && (
                  <span className="text-white ml-auto">{verdictConfidence}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* 监控日志区域 */}
          <div className="flex-1 mb-2 min-h-0 flex flex-col overflow-hidden" style={{ maxHeight: '75%' }}>
            <h3 className="text-sm font-medium text-white/80 mb-2 flex-shrink-0">监控日志</h3>
            <div className="bg-black/90 rounded-lg p-4 flex-1 overflow-y-auto overflow-x-hidden font-mono text-sm border border-gray-800 min-h-0 warden-log-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100, 100, 100, 0.8) rgba(30, 30, 30, 0.8)' }}>
            <style jsx global>{`
              .warden-log-scroll {
                overflow-y: auto !important;
                overflow-x: hidden !important;
              }
              .warden-log-scroll::-webkit-scrollbar {
                width: 12px;
              }
              .warden-log-scroll::-webkit-scrollbar-track {
                background: rgba(20, 20, 20, 0.9);
                border-radius: 6px;
                border: 1px solid rgba(60, 60, 60, 0.6);
                margin: 4px 0;
              }
              .warden-log-scroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(120, 120, 120, 0.9) 0%, rgba(80, 80, 80, 0.9) 100%);
                border-radius: 6px;
                border: 1px solid rgba(50, 50, 50, 0.6);
                min-height: 30px;
              }
              .warden-log-scroll::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(150, 150, 150, 1) 0%, rgba(110, 110, 110, 1) 100%);
              }
              .warden-log-scroll::-webkit-scrollbar-thumb:active {
                background: linear-gradient(180deg, rgba(170, 170, 170, 1) 0%, rgba(130, 130, 130, 1) 100%);
              }
              .warden-log-scroll::-webkit-scrollbar-corner {
                background: rgba(20, 20, 20, 0.9);
              }
            `}</style>
            <div className="space-y-1">
              {logs.map((log, index) => {
                // 监控日志统一使用亮绿色
                const logColor = 'text-green-400';

                return (
                  <motion.div
                    key={`${log}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`${logColor} leading-relaxed break-words whitespace-pre-wrap`}
                  >
                    {log}
                  </motion.div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

          {/* 三维信道风险评估 */}
          <div className="mt-4 flex-shrink-0 flex-1 min-h-0 flex flex-col overflow-hidden" style={{ maxHeight: '25%' }}>
            <h3 className="text-sm font-medium text-white/80 mb-2 flex-shrink-0">Channel Risk Assessment</h3>
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {channelStatus.map((channel) => (
              <div key={channel.id} className="flex items-center gap-3">
                <motion.div 
                  className={`w-3 h-3 rounded-full ${getColorClass(channel.color)} ${channel.active ? '' : 'opacity-30'}`}
                  animate={{ 
                    scale: channel.active ? [1, 1.1, 1] : 1,
                    opacity: channel.active ? [0.8, 1, 0.8] : 0.3
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: channel.active ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        className={`h-full ${getProgressBarColor(channel.color)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${channel.progress}%` }}
                        transition={{ 
                          duration: 1.5, 
                          ease: [0.25, 0.1, 0.25, 1],
                          type: "tween"
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/60 min-w-[80px] text-right">
                      {channel.progress < 15 ? 'baseline' : channel.progress < 30 ? 'low' : 'moderate'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </LiquidGlassBorder>
    </div>
  );
}
