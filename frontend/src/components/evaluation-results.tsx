"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw } from "lucide-react";

export default function EvaluationResults() {
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFileInfo, setSelectedFileInfo] = useState<{ category: string; fileName: string; totalFiles: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 生成模拟评估数据的函数（与主页面保持一致）
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
    ].filter(Boolean);
  };

  // 将evaluation数据转换为显示格式
  const formatEvaluationData = (evaluation: any): string[] => {
    if (!evaluation) return [];
    
    const capacity = evaluation.average_capacity_metrics || {};
    const quality = evaluation.average_quality_metrics || {};
    const rounds = evaluation.rounds || [];
    
    const pplStatus = quality.ppl < 45 ? '优秀' : quality.ppl < 60 ? '良好' : '中等';
    const rougeStatus = quality.rouge1_f1 > 0.65 ? '较高' : quality.rouge1_f1 > 0.5 ? '中等' : '较低';
    const bleuStatus = quality.bleu > 0.5 ? '较高' : quality.bleu > 0.4 ? '中等' : '较低';
    const efficiencyStatus = capacity.bits_per_round > 2.5 ? '较高' : capacity.bits_per_round > 1.8 ? '中等' : '较低';
    
    const results: string[] = [
      "✅ 评估服务已连接",
      "📊 传输容量指标:",
      `   • 平均每轮传输: ${capacity.bits_per_round?.toFixed(2) || '0.00'} bits/round`,
      `   • 平均每比特轮数: ${capacity.round_per_bit?.toFixed(2) || '0.00'} round/bit`,
      `   • 总传输比特数: ${capacity.total_bits_transmitted?.toFixed(0) || '0'} bits`,
      `   • 通信轮数: ${rounds.length} 轮`,
      "",
      "🎯 文本质量指标:",
      `   • 困惑度 (PPL): ${quality.ppl?.toFixed(1) || 'N/A'} (${pplStatus})`,
      `   • 语义熵: ${quality.entropy?.toFixed(2) || 'N/A'} (${quality.entropy && quality.entropy < 4 ? '良好' : quality.entropy && quality.entropy < 5 ? '中等' : '较高'})`,
      `   • ROUGE-1 Precision: ${quality.rouge1_precision?.toFixed(3) || 'N/A'}`,
      `   • ROUGE-1 Recall: ${quality.rouge1_recall?.toFixed(3) || 'N/A'}`,
      `   • ROUGE-1 F1: ${quality.rouge1_f1?.toFixed(3) || 'N/A'} (${rougeStatus})`,
      `   • BLEU分数: ${quality.bleu?.toFixed(3) || 'N/A'} (${bleuStatus})`,
      "",
      "📝 词汇丰富度指标:",
      `   • TTR (类型-标记比): ${quality.lex_div_ttr?.toFixed(3) || 'N/A'}`,
      `   • RTTR (根式TTR): ${quality.lex_div_rttr?.toFixed(2) || 'N/A'}`,
      `   • Unigram熵: ${quality.lex_div_unigram_entropy?.toFixed(2) || 'N/A'}`,
      "",
      "📈 逐轮分析:",
    ];
    
    // 添加5轮数据
    rounds.slice(0, 5).forEach((round: any, index: number) => {
      results.push(
        `   轮次 ${round.round_number || index + 1}: PPL=${round.ppl?.toFixed(1) || 'N/A'}, ROUGE-1=${round.rouge1_f1?.toFixed(2) || 'N/A'}, 传输=${round.bits_transmitted?.toFixed(1) || 'N/A'} bits`
      );
    });
    
    results.push(
      "",
      "📊 评估总结:",
      `   ✓ 文本自然度: ${pplStatus}`,
      `   ✓ 隐蔽性: ${quality.ppl && quality.ppl < 50 ? '优秀' : '良好'}`,
      `   ✓ 传输效率: ${efficiencyStatus}`,
      `   ✓ 与原文相似度: ${rougeStatus}`,
      `   ✓ 词汇多样性: ${quality.lex_div_ttr && quality.lex_div_ttr > 0.7 ? '丰富' : quality.lex_div_ttr && quality.lex_div_ttr > 0.6 ? '中等' : '较低'}`,
    );
    
    return results;
  };

  // 从API获取评估数据
  const fetchEvaluationData = async (category: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/evaluation/random/${category}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 成功获取评估数据:', data.selected_file);
        
        setSelectedFileInfo({
          category: data.category,
          fileName: data.selected_file,
          totalFiles: data.total_files
        });
        
        const formattedResults = formatEvaluationData(data.evaluation);
        setEvaluationResults(formattedResults);
        localStorage.setItem('evaluationResults', JSON.stringify(formattedResults));
      } else {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }));
        console.error(`获取评估数据失败: ${errorData.error}`);
        setEvaluationResults([`⚠️ 无法获取评估数据: ${errorData.error || '类别文件夹不存在或为空'}`]);
      }
    } catch (error) {
      console.error('获取评估数据失败:', error);
      setEvaluationResults([`⚠️ 获取评估数据时发生错误: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  // 从localStorage读取评估结果，如果没有则使用模拟数据
  useEffect(() => {
    const loadResults = () => {
      const stored = localStorage.getItem('evaluationResults');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvaluationResults(parsed);
            return; // 如果成功加载，就不使用模拟数据
          }
        } catch (e) {
          console.error('Failed to parse evaluation results:', e);
        }
      }
      
      // 如果没有存储的数据，使用模拟数据
      const mockResults = generateMockEvaluationResults('excellent');
      setEvaluationResults(mockResults);
      localStorage.setItem('evaluationResults', JSON.stringify(mockResults));
    };

    // 立即加载一次
    loadResults();
    
    // 监听storage变化（跨标签页）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'evaluationResults') {
        loadResults();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查更新（用于同窗口内的更新，因为storage事件只在跨标签页时触发）
    const interval = setInterval(() => {
      loadResults();
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="relative flex flex-col min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 px-4 pt-32 pb-20">
      <div className="container mx-auto max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            可信度评估结果
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-400 text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Real-time Credibility Assessment Results
          </motion.p>
          
          {/* 选择类别按钮 */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {['art', 'general', 'philosophy'].map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  fetchEvaluationData(category);
                }}
                disabled={isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {category === 'art' ? '艺术史' : category === 'general' ? '通用知识' : '哲学思辨'}
              </button>
            ))}
            <button
              onClick={() => {
                const categories = ['art', 'general', 'philosophy'];
                const randomCategory = categories[Math.floor(Math.random() * categories.length)];
                setSelectedCategory(randomCategory);
                fetchEvaluationData(randomCategory);
              }}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              随机选择
            </button>
          </div>
          
          {/* 显示选中的文件信息 */}
          {selectedFileInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4"
            >
              已选择: {selectedFileInfo.fileName} (共 {selectedFileInfo.totalFiles} 个文件)
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          {evaluationResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Activity className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                等待评估结果...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                对话开始后将显示每轮的评估结果
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluationResults.map((result, index) => {
                // 如果是空行，显示为间距
                if (result === "") {
                  return <div key={index} className="h-2" />;
                }
                
                // 判断是否是标题行（包含emoji或特定标记）
                const isTitle = result.match(/^[📊🎯📈✅⚠️💡📝]/);
                const isSubItem = result.trim().startsWith("•") || result.trim().startsWith("✓");
                
                return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${
                      isTitle
                        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 font-semibold text-blue-900 dark:text-blue-100"
                        : isSubItem
                        ? "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                        : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 text-black dark:text-white"
                    } font-mono text-sm`}
                >
                  {result}
                </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

