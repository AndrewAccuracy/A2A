"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function EvaluationResults() {
  const [evaluationResults, setEvaluationResults] = useState<string[]>([]);

  // 从localStorage读取评估结果
  useEffect(() => {
    const loadResults = () => {
      const stored = localStorage.getItem('evaluationResults');
      if (stored) {
        try {
          setEvaluationResults(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse evaluation results:', e);
        }
      }
    };

    loadResults();
    
    // 监听storage变化
    const handleStorageChange = () => {
      loadResults();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查更新（用于同窗口内的更新）
    const interval = setInterval(() => {
      loadResults();
    }, 1000);

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
            GPT可信度评估结果
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-400 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Real-time Credibility Assessment Results
          </motion.p>
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
              {evaluationResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 font-mono text-sm text-black dark:text-white"
                >
                  {result}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

