'use client';

/**
 * 评估服务实时数据Hook
 * 
 * 数据来源说明：
 * - 当前所有数据均为模拟数据（Mock Data），用于演示
 * - 实际使用时需要连接到后端评估API获取真实数据
 * - 数据生成规则：
 *   - 传输容量：平均每轮传输 2.0-3.5 bits/round
 *   - 文本质量：PPL 30-50，ROUGE-1 0.6-0.8，BLEU 0.5-0.7
 *   - 词汇丰富度：TTR 0.6-0.8，Unigram熵 8-10
 *   - 通信轮数：每1-3秒增加一轮
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface RoundDataPoint {
  time: string;
  round: number; // 轮次
  bitsPerRound: number; // 每轮传输比特数（单位：bits/round）
  ppl: number; // 困惑度
  rouge1: number; // ROUGE-1 F1分数
  bleu: number; // BLEU分数
}

export interface LatestRound {
  id: string;
  round: number; // 轮次
  bitsPerRound: number; // 每轮传输比特数
  ppl: number; // 困惑度
  rouge1: number; // ROUGE-1 F1分数
  time: string; // 时间
}

// 生成随机传输容量数据
// 返回：2.0-3.5之间的随机数（单位：bits/round）
const generateRandomBitsPerRound = (): number => {
  return Math.random() * 1.5 + 2.0; // 2.0-3.5 bits/round
};

// 生成随机PPL数据
// 返回：30-50之间的随机数
const generateRandomPPL = (): number => {
  return Math.random() * 20 + 30; // 30-50
};

// 生成随机ROUGE-1数据
// 返回：0.6-0.8之间的随机数
const generateRandomROUGE1 = (): number => {
  return Math.random() * 0.2 + 0.6; // 0.6-0.8
};

// 生成随机BLEU数据
// 返回：0.5-0.7之间的随机数
const generateRandomBLEU = (): number => {
  return Math.random() * 0.2 + 0.5; // 0.5-0.7
};

export interface BitsPerRoundDataPoint {
  time: string;
  round: number;
  bitsPerRound: number; // 每轮传输比特数（单位：bits/round）
}

export interface PPLDataPoint {
  time: string;
  round: number;
  ppl: number; // 困惑度
}

export interface ROUGE1DataPoint {
  time: string;
  round: number;
  rouge1: number; // ROUGE-1 F1分数
}

export interface BLEUDataPoint {
  time: string;
  round: number;
  bleu: number; // BLEU分数
}

export const useRealtimeModelData = () => {
  const [bitsPerRoundData, setBitsPerRoundData] = useState<BitsPerRoundDataPoint[]>([]);
  const [pplData, setPplData] = useState<PPLDataPoint[]>([]);
  const [rouge1Data, setRouge1Data] = useState<ROUGE1DataPoint[]>([]);
  const [bleuData, setBleuData] = useState<BLEUDataPoint[]>([]);
  const [latestRounds, setLatestRounds] = useState<LatestRound[]>([]);
  
  const totalBitsRef = useRef(0);
  const totalRoundsRef = useRef(0);
  const bitsHistoryRef = useRef<number[]>([]); // 存储每轮传输比特数
  const pplHistoryRef = useRef<number[]>([]); // 存储每轮PPL
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback(() => {
    // 从 localStorage 获取开始交流的时间
    const startTimeStr = localStorage.getItem('covertCommunicationStartTime');
    
    // 如果开始时间不存在，返回当前时间（作为后备）
    if (!startTimeStr) {
      const now = new Date();
      return now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    
    const startTime = parseInt(startTimeStr, 10);
    
    // 计算从开始交流到现在的相对时间（毫秒）
    const now = Date.now();
    const elapsed = Math.max(0, now - startTime); // 确保不为负数
    
    // 转换为时:分:秒格式
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    // 格式化为 HH:MM:SS
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const addNewRound = useCallback(() => {
    const bitsPerRound = generateRandomBitsPerRound();
    const ppl = generateRandomPPL();
    const rouge1 = generateRandomROUGE1();
    const bleu = generateRandomBLEU();
    const currentTime = formatTime();
    
    totalBitsRef.current += bitsPerRound;
    totalRoundsRef.current += 1;
    bitsHistoryRef.current.push(bitsPerRound);
    pplHistoryRef.current.push(ppl);

    // 保持最近120轮数据
    if (bitsHistoryRef.current.length > 120) {
      bitsHistoryRef.current.shift();
      pplHistoryRef.current.shift();
    }

    // 计算平均值
    const avgBitsPerRound = bitsHistoryRef.current.length > 0
      ? bitsHistoryRef.current.reduce((sum, b) => sum + b, 0) / bitsHistoryRef.current.length
      : 0;
    
    const avgPPL = pplHistoryRef.current.length > 0
      ? pplHistoryRef.current.reduce((sum, p) => sum + p, 0) / pplHistoryRef.current.length
      : 0;

    // 添加到每轮传输比特数图表数据
    setBitsPerRoundData((prev) => {
      const newData = [...prev, { time: currentTime, round: totalRoundsRef.current, bitsPerRound: bitsPerRound }];
      return newData.slice(-120);
    });

    // 添加到PPL图表数据
    setPplData((prev) => {
      const newData = [...prev, { time: currentTime, round: totalRoundsRef.current, ppl: ppl }];
      return newData.slice(-120);
    });

    // 添加到ROUGE-1图表数据
    setRouge1Data((prev) => {
      const newData = [...prev, { time: currentTime, round: totalRoundsRef.current, rouge1: rouge1 }];
      return newData.slice(-120);
    });

    // 添加到BLEU图表数据
    setBleuData((prev) => {
      const newData = [...prev, { time: currentTime, round: totalRoundsRef.current, bleu: bleu }];
      return newData.slice(-120);
    });

    // 添加到最新轮次
    const newRound: LatestRound = {
      id: `round-${Date.now()}-${Math.random()}`,
      round: totalRoundsRef.current,
      bitsPerRound: bitsPerRound,
      ppl: ppl,
      rouge1: rouge1,
      time: currentTime,
    };

    setLatestRounds((prev) => {
      const updated = [newRound, ...prev];
      return updated.slice(0, 10);
    });
  }, [formatTime]);

  useEffect(() => {
    // 重置计数器，确保固定为5轮
    totalBitsRef.current = 0;
    totalRoundsRef.current = 0;
    bitsHistoryRef.current = [];
    pplHistoryRef.current = [];
    
    // 从 localStorage 获取开始交流的时间
    const startTimeStr = localStorage.getItem('covertCommunicationStartTime');
    const startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
    
    // 如果开始时间不存在，使用当前时间作为开始时间
    if (!startTimeStr) {
      localStorage.setItem('covertCommunicationStartTime', Date.now().toString());
    }
    
    // 初始化数据
    const initialData: RoundDataPoint[] = [];
    const now = Date.now();
    
    // 生成相对时间格式的函数
    const getRelativeTime = (elapsedMs: number) => {
      const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    // 固定生成5轮数据，不再动态添加
    for (let i = 4; i >= 0; i--) {
      // 计算相对时间（从开始交流算起）
      // 如果开始时间存在，使用相对时间；否则使用当前时间
      let timeStr: string;
      if (startTimeStr) {
        const elapsed = Math.max(0, now - startTime - (4 - i) * 1000); // 假设每1秒一轮
        timeStr = getRelativeTime(elapsed);
      } else {
        // 如果没有开始时间，使用当前时间作为后备
        const time = new Date(now - (4 - i) * 1000);
        timeStr = time.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
      const bitsPerRound = generateRandomBitsPerRound();
      const ppl = generateRandomPPL();
      const rouge1 = generateRandomROUGE1();
      const bleu = generateRandomBLEU();
      
      totalBitsRef.current += bitsPerRound;
      totalRoundsRef.current += 1;
      bitsHistoryRef.current.push(bitsPerRound);
      pplHistoryRef.current.push(ppl);
      
      initialData.push({ 
        time: timeStr, 
        round: totalRoundsRef.current,
        bitsPerRound: bitsPerRound,
        ppl: ppl,
        rouge1: rouge1,
        bleu: bleu
      });
    }

    // 初始化图表数据（固定5轮）
    setBitsPerRoundData(initialData.map(d => ({ time: d.time, round: d.round, bitsPerRound: d.bitsPerRound })));
    setPplData(initialData.map(d => ({ time: d.time, round: d.round, ppl: d.ppl })));
    setRouge1Data(initialData.map(d => ({ time: d.time, round: d.round, rouge1: d.rouge1 })));
    setBleuData(initialData.map(d => ({ time: d.time, round: d.round, bleu: d.bleu })));

    // 初始化最新轮次数据（固定5轮）
    const initialRounds: LatestRound[] = initialData.map((d, index) => ({
      id: `round-${index}`,
      round: d.round,
      bitsPerRound: d.bitsPerRound,
      ppl: d.ppl,
      rouge1: d.rouge1,
      time: d.time,
    }));
    setLatestRounds(initialRounds);

    // 不再动态生成新轮次，固定为5轮

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [addNewRound]);

  // 计算汇总指标
  // 固定为5轮，确保不会因为重复初始化而累加
  const totalBits = totalBitsRef.current;
  const totalRounds = Math.min(totalRoundsRef.current, 5); // 确保最多显示5轮
  const avgBitsPerRound = totalRounds > 0 ? totalBits / totalRounds : 0;
  const avgPPL = pplHistoryRef.current.length > 0
    ? pplHistoryRef.current.reduce((sum, p) => sum + p, 0) / pplHistoryRef.current.length
    : 0;
  const avgROUGE1 = rouge1Data.length > 0
    ? rouge1Data.reduce((sum, d) => sum + d.rouge1, 0) / rouge1Data.length
    : 0;
  const avgBLEU = bleuData.length > 0
    ? bleuData.reduce((sum, d) => sum + d.bleu, 0) / bleuData.length
    : 0;

  return {
    // 汇总指标
    totalBits,
    totalRounds,
    avgBitsPerRound,
    avgPPL,
    avgROUGE1,
    avgBLEU,
    // 图表数据
    bitsPerRoundData,
    pplData,
    rouge1Data,
    bleuData,
    // 最新轮次
    latestRounds,
  };
};
