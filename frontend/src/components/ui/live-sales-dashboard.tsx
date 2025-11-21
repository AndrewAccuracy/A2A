'use client';

import React, { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import HeroWave from '@/components/ui/dynamic-wave-canvas-background';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';

import { useRealtimeModelData, BitsPerRoundDataPoint, LatestRound, PPLDataPoint, ROUGE1DataPoint, BLEUDataPoint } from '@/hooks/useRealtimeSalesData';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { LiquidGlassBorder } from '@/components/ui/liquid-glass-border';

import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';

import { ScrollArea } from '@/components/ui/scroll-area';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

import { Brain, Repeat2, TrendingUp, Activity, BarChart, Clock, Zap } from 'lucide-react';

// Helper for bits formatting (格式化比特数)
// 单位：bits (无单位符号，直接显示数字)
const formatBits = (bits: number) => {
  return bits.toFixed(2);
};

// Helper for score formatting (格式化分数)
// 单位：0-1之间的分数
const formatScore = (score: number) => {
  return score.toFixed(3);
};

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
  valueClassName?: string;
}

const MetricCard: FC<MetricCardProps> = ({ title, value, unit = '', icon, description, valueClassName }) => {
  const formatValue = (val: number) => {
    // 对于比特数和轮数，直接显示整数
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(2)}K`;
    }
    // 对于小数（如平均每轮传输），保留2位小数
    if (val < 10 && val % 1 !== 0) {
      return val.toFixed(2);
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <LiquidGlassBorder className="flex-1 min-w-[250px] bg-white/10 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || 'text-white'}`}>
          {unit}{typeof value === 'number' ? formatValue(value) : '0'}
        </div>
        {description && <p className="text-xs text-white/80 mt-1">{description}</p>}
      </CardContent>
    </LiquidGlassBorder>
  );
};

interface RealtimeChartProps {
  data: BitsPerRoundDataPoint[] | PPLDataPoint[] | ROUGE1DataPoint[] | BLEUDataPoint[];
  title: string;
  dataKey: string;
  lineColor: string;
  tooltipFormatter?: (value: number) => string;
  legendName: string;
  xAxisKey?: string;
}

const RealtimeChart: FC<RealtimeChartProps> = React.memo(({ data, title, dataKey, lineColor, tooltipFormatter, legendName, xAxisKey = 'time'}) => {
  // Memoize the chart data and filter to show only last 2 minutes of data
  const chartData = useMemo(() => {
    const validData = data || [];
    if (validData.length === 0) return [];
    
    // Get current time and calculate 2 minutes ago
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    // Filter data to show only last 2 minutes
    const filteredData = validData.filter(point => {
      if (!point.time) return false;
      
      // Parse the time string (assuming format like "HH:MM:SS")
      const timeParts = point.time.split(':');
      if (timeParts.length !== 3) return true; // Keep if we can't parse
      
      const pointTime = new Date();
      pointTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2]));
      
      return pointTime >= twoMinutesAgo;
    });
    
    // If no data in last 2 minutes, show last 10 points to ensure something is visible
    return filteredData.length > 0 ? filteredData : validData.slice(-10);
  }, [data]);
  
  // Create a stable key for the LineChart to prevent complete re-mounting
  const chartKey = useMemo(() => `chart-${title}-${dataKey}`, [title, dataKey]);
  // Theme-aware colors
  const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const colors = {
    grid: '#ffffff20', // 半透明白色网格
    axis: '#ffffff', // 白色坐标轴文字
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#ffffff',
    legend: '#ffffff', // 白色图例文字
    cursor: lineColor === '#3b82f6' || lineColor.includes('primary') ? '#3b82f6' : '#8b5cf6'
  };
  return (
    <LiquidGlassBorder className="w-full bg-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart className="h-5 w-5 text-white" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={chartKey}
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} strokeOpacity={0.5} />
              <XAxis 
                dataKey={xAxisKey}
                stroke={colors.axis}
                fontSize={12}
                interval="preserveStartEnd"
                tick={{ fontSize: 10, fill: colors.axis }}
                tickFormatter={(tick) => {
                  if (xAxisKey === 'time' && typeof tick === 'string' && tick.includes(':')) {
                    const parts = tick.split(':');
                    return parts.length >= 3 ? `${parts[1]}:${parts[2]}` : tick;
                  }
                  return tick;
                }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                stroke={colors.axis}
                fontSize={12}
                tick={{ fill: colors.axis }}
                tickFormatter={tooltipFormatter || ((value) => value.toString())}
              />
              <RechartsTooltip 
                cursor={{ stroke: colors.cursor, strokeWidth: 1 }}
                contentStyle={{ 
                  backgroundColor: colors.tooltipBg,
                  borderColor: colors.tooltipBorder,
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                itemStyle={{ color: colors.tooltipText }}
                labelStyle={{ color: colors.legend }}
                formatter={tooltipFormatter ? (value: any) => {
                  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                  return [tooltipFormatter(numValue), legendName];
                } : undefined}
              />
              <Legend wrapperStyle={{ color: colors.legend, paddingTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={lineColor} 
                strokeWidth={2} 
                dot={false} 
                name={legendName}
                connectNulls={false}
                isAnimationActive={chartData.length <= 1} // Only animate on first render
                animationBegin={0}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
            </div>
          </CardContent>
        </LiquidGlassBorder>
      );
});

export const SalesDashboard: FC = () => {
  const {
    totalBits,
    totalRounds,
    avgBitsPerRound,
    avgPPL,
    avgROUGE1,
    avgBLEU,
    bitsPerRoundData,
    pplData,
    rouge1Data,
    bleuData,
    latestRounds,
  } = useRealtimeModelData();

  // Ensure data is valid and has the correct structure
  const safeBitsPerRoundData = Array.isArray(bitsPerRoundData) ? bitsPerRoundData : [];
  const safePplData = Array.isArray(pplData) ? pplData : [];
  const safeRouge1Data = Array.isArray(rouge1Data) ? rouge1Data : [];
  const safeBleuData = Array.isArray(bleuData) ? bleuData : [];
  const safeLatestRounds = Array.isArray(latestRounds) ? latestRounds : [];

  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard-container');
    if (!element) return;

    // 获取按钮容器（为了在截图时隐藏它）
    const buttonContainer = document.getElementById('export-button-container');

    try {
      // 1. 截图前临时隐藏按钮
      if (buttonContainer) buttonContainer.style.display = 'none';

      // 2. 使用 html-to-image 直接生成图片数据 (支持所有现代 CSS)
      const dataUrl = await toPng(element, {
        backgroundColor: '#020617', // 保持深色背景
        cacheBust: true,            // 避免图片缓存问题
      });

      // 3. 恢复按钮显示
      if (buttonContainer) buttonContainer.style.display = 'block';

      // 4. 生成 PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 宽度
      const pageHeight = 297; // A4 高度
      
      // 创建一个临时 Image 对象来获取截图的真实尺寸
      const img = new Image();
      img.src = dataUrl;
      
      img.onload = () => {
        const imgHeight = (img.height * imgWidth) / img.width;
        let heightLeft = imgHeight;
        let position = 0;

        // 第一页
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // 如果内容很长，自动分页
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('实时可信评估结果.pdf');
      };

    } catch (error) {
      console.error('Export failed:', error);
      // 出错也要确保按钮恢复显示
      if (buttonContainer) buttonContainer.style.display = 'block';
    }
  };

  return (
    <div id="dashboard-container" className="min-h-screen w-full text-white p-4 md:p-8 flex flex-col gap-8 md:gap-12 relative overflow-hidden bg-[#020617]">
      {/* Dynamic Wave Background */}
      <div className="absolute inset-0 z-0">
        <HeroWave />
      </div>
      <div className="absolute top-6 right-8 z-50">
        <Button 
          onClick={handleExportPDF}
          variant="outline" 
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 gap-2"
        >
          <Download className="w-4 h-4" />
          可信评估结果
        </Button>
      </div>
      <div className="relative z-10">
      {/* Title with Animation */}
      <motion.div
        className="text-center mb-8 md:mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.h1 
          className="text-3xl md:text-4xl font-extrabold text-center tracking-tight lg:text-5xl text-white drop-shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          可信度评估结果
        </motion.h1>
        <motion.p 
          className="text-center text-md md:text-lg text-white/90 mb-4 drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Real-time Credibility Assessment Results
        </motion.p>
      </motion.div>
      

      {/* Metrics Section with Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 md:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <MetricCard
            title="当前轮的传输token量" // [修改标题]
            value={latestRounds[0]?.bitsPerRound || 0} // [修改取值] 取最新一轮的 bitsPerRound
            unit=""
            icon={<Brain className="h-4 w-4 text-white" />}
            description="当前通信轮次传输比特数"
            valueClassName="text-[#10b981]"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          <MetricCard
            title="通信轮数"
            value={totalRounds || 0}
            icon={<Repeat2 className="h-4 w-4 text-white" />}
            description="总通信轮数"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <MetricCard
            title="平均每轮传输"
            value={avgBitsPerRound || 0}
            unit=""
            icon={<TrendingUp className="h-4 w-4 text-white" />}
            description="平均每轮传输比特数"
            valueClassName="text-[#60a5fa]"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
        >
          <MetricCard
            title="总传输token量"
            value={totalBits || 0}
            unit=""
            icon={<Activity className="h-4 w-4 text-white" />}
            description="累计传输的总比特数"
            valueClassName="text-white"
          />
        </motion.div>
      </div>

      {/* Charts Section - Four Charts (2x2 Grid, Full Width) with Animation */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8 md:mb-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.3 }}
        >
          <RealtimeChart
            data={safeBitsPerRoundData}
            title="传输容量趋势（每轮传输比特数）"
            dataKey="bitsPerRound"
            lineColor="#10b981"
            tooltipFormatter={(value) => `${formatBits(value)} bits/round`}
            legendName="每轮传输比特数"
            xAxisKey="round"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <RealtimeChart
            data={safePplData}
            title="文本质量趋势（困惑度PPL）"
            dataKey="ppl"
            lineColor="#6366f1"
            tooltipFormatter={(value) => `PPL: ${value.toFixed(1)}`}
            legendName="困惑度"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.3 }}
        >
          <RealtimeChart
            data={safeRouge1Data}
            title="文本质量趋势（ROUGE-1 F1）"
            dataKey="rouge1"
            lineColor="#3b82f6"
            tooltipFormatter={(value) => `ROUGE-1: ${formatScore(value)}`}
            legendName="ROUGE-1 F1分数"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <RealtimeChart
            data={safeBleuData}
            title="文本质量趋势（BLEU分数）"
            dataKey="bleu"
            lineColor="#8b5cf6"
            tooltipFormatter={(value) => `BLEU: ${formatScore(value)}`}
            legendName="BLEU分数"
          />
        </motion.div>
      </motion.div>

      {/* Latest Rounds - Compact Horizontal Scroll (Moved to Bottom) with Animation */}
      {safeLatestRounds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.75 }}
        >
          <LiquidGlassBorder className="w-full bg-white/10 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-white" /> 逐轮分析
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="overflow-x-auto">
              <div className="flex gap-2 px-4 pb-2" style={{ width: 'max-content', minWidth: '100%' }}>
                {safeLatestRounds.map((round) => (
                  <div
                    key={round.id}
                    className="flex-shrink-0 w-[280px] p-3 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-white">轮次 {round.round}</span>
                      <Badge variant="outline" className="text-xs text-white border-white/30 bg-transparent">{formatBits(round.bitsPerRound)} bits</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>PPL: {round.ppl.toFixed(1)}</span>
                      <span>ROUGE-1: {formatScore(round.rouge1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </LiquidGlassBorder>
        </motion.div>
      )}
      </div>
    </div>
  );
};

