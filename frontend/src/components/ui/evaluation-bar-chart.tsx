'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  BarChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  LinearYAxisTickLabel,
  BarSeries,
  Bar,
  GridlineSeries,
  Gridline,
  ChartDataTypes,
} from 'reaviz';
import { TrendingUp, TrendingDown, Activity, Zap, FileText, BarChart3 } from 'lucide-react';

// Type definitions
interface GroupedBarChartDataPoint {
  key: string;
  data: Array<{ key: string; data: number | null | undefined }>;
}

interface LegendItem {
  name: string;
  color: string;
}

interface TimePeriodOption {
  value: string;
  label: string;
}

interface EvaluationStat {
  id: string;
  title: string;
  count: number;
  countFrom?: number;
  comparisonText: string;
  percentage: number;
  TrendIcon: React.FC<{ strokeColor: string }>;
  trendColor: string;
  trendBgColor: string;
}

interface DetailedMetric {
  id: string;
  Icon: React.FC<{ className?: string; fill?: string }>;
  label: string;
  tooltip: string;
  value: string;
  TrendIcon: React.FC<{ baseColor: string; strokeColor: string; className?: string }>;
  trendBaseColor: string;
  trendStrokeColor: string;
  delay: number;
  iconFillColor?: string;
}

// SVG Icon Components
const DetailedTrendUpIcon: React.FC<{ baseColor: string; strokeColor: string; className?: string }> = ({ baseColor, strokeColor, className }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="14" fill={baseColor} fillOpacity="0.4" />
    <path d="M9.50134 12.6111L14.0013 8.16663M14.0013 8.16663L18.5013 12.6111M14.0013 8.16663L14.0013 19.8333" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const DetailedTrendDownIcon: React.FC<{ baseColor: string; strokeColor: string; className?: string }> = ({ baseColor, strokeColor, className }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="14" fill={baseColor} fillOpacity="0.4" />
    <path d="M18.4987 15.3889L13.9987 19.8334M13.9987 19.8334L9.49866 15.3889M13.9987 19.8334V8.16671" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const SummaryUpArrowIcon: React.FC<{ strokeColor: string }> = ({ strokeColor }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
    <path d="M5.50134 9.11119L10.0013 4.66675M10.0013 4.66675L14.5013 9.11119M10.0013 4.66675L10.0013 16.3334" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const SummaryDownArrowIcon: React.FC<{ strokeColor: string }> = ({ strokeColor }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
    <path d="M14.4987 11.8888L9.99866 16.3333M9.99866 16.3333L5.49866 11.8888M9.99866 16.3333V4.66658" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

// Data and Constants - 使用更鲜明的颜色提高对比度
const LEGEND_ITEMS: LegendItem[] = [
  { name: '传输容量', color: '#8B5CF6' }, // 更深的紫色
  { name: '文本质量', color: '#06B6D4' }, // 更亮的青色
  { name: '词汇丰富度', color: '#A855F7' }, // 更鲜明的紫色
  { name: '逐轮分析', color: '#6366F1' }, // 更亮的蓝紫色
];

const BAR_CHART_COLOR_SCHEME = ['#8B5CF6', '#06B6D4', '#A855F7', '#6366F1'];

const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: 'last-7-days', label: '最近 7 天' },
  { value: 'last-30-days', label: '最近 30 天' },
  { value: 'last-90-days', label: '最近 90 天' },
];

// 生成评估数据的函数
const generateEvaluationChartData = (): GroupedBarChartDataPoint[] => {
  return [
    {
      key: '传输容量',
      data: [
        { key: '传输容量', data: 2.85 },
        { key: '文本质量', data: 0 },
        { key: '词汇丰富度', data: 0 },
        { key: '逐轮分析', data: 0 },
      ],
    },
    {
      key: '文本质量',
      data: [
        { key: '传输容量', data: 0 },
        { key: '文本质量', data: 0.72 },
        { key: '词汇丰富度', data: 0 },
        { key: '逐轮分析', data: 0 },
      ],
    },
    {
      key: '词汇丰富度',
      data: [
        { key: '传输容量', data: 0 },
        { key: '文本质量', data: 0 },
        { key: '词汇丰富度', data: 0.76 },
        { key: '逐轮分析', data: 0 },
      ],
    },
    {
      key: '逐轮分析',
      data: [
        { key: '传输容量', data: 0 },
        { key: '文本质量', data: 0 },
        { key: '词汇丰富度', data: 0 },
        { key: '逐轮分析', data: 3.2 },
      ],
    },
  ];
};

// 更好的数据格式：按轮次显示各项指标（归一化到0-100范围以便比较）
const generateRoundBasedChartData = (): GroupedBarChartDataPoint[] => {
  return [
    {
      key: '轮次 1',
      data: [
        { key: '传输容量', data: 64 }, // 3.2 bits -> 64 (归一化)
        { key: '文本质量', data: 71 }, // 0.71 -> 71
        { key: '词汇丰富度', data: 74 }, // 0.74 -> 74
        { key: '逐轮分析', data: 82 }, // 41.2 PPL -> 82 (反向，越低越好)
      ],
    },
    {
      key: '轮次 2',
      data: [
        { key: '传输容量', data: 56 }, // 2.8 bits -> 56
        { key: '文本质量', data: 69 }, // 0.69 -> 69
        { key: '词汇丰富度', data: 72 }, // 0.72 -> 72
        { key: '逐轮分析', data: 80 }, // 39.8 PPL -> 80
      ],
    },
    {
      key: '轮次 3',
      data: [
        { key: '传输容量', data: 52 }, // 2.6 bits -> 52
        { key: '文本质量', data: 73 }, // 0.73 -> 73
        { key: '词汇丰富度', data: 75 }, // 0.75 -> 75
        { key: '逐轮分析', data: 86 }, // 43.1 PPL -> 86
      ],
    },
    {
      key: '轮次 4',
      data: [
        { key: '传输容量', data: 58 }, // 2.9 bits -> 58
        { key: '文本质量', data: 75 }, // 0.75 -> 75
        { key: '词汇丰富度', data: 77 }, // 0.77 -> 77
        { key: '逐轮分析', data: 77 }, // 38.5 PPL -> 77
      ],
    },
  ];
};

const validateGroupedBarChartData = (data: GroupedBarChartDataPoint[]): ChartDataTypes[] => {
  return data.map(category => ({
    ...category,
    data: category.data.map(seriesItem => ({
      ...seriesItem,
      data: (typeof seriesItem.data !== 'number' || isNaN(seriesItem.data)) ? 0 : seriesItem.data,
    })),
  }));
};

const validatedChartData = validateGroupedBarChartData(generateRoundBasedChartData());

const EVALUATION_STATS_DATA: EvaluationStat[] = [
  {
    id: 'capacity',
    title: '传输容量',
    count: 128,
    countFrom: 0,
    comparisonText: '相比上次评估增加 12 bits',
    percentage: 12,
    TrendIcon: SummaryUpArrowIcon,
    trendColor: 'text-[#9152EE]',
    trendBgColor: 'bg-[rgb(145,82,238)]/40',
  },
  {
    id: 'quality',
    title: '文本质量',
    count: 72,
    countFrom: 0,
    comparisonText: '相比上次评估提升 4%',
    percentage: 4,
    TrendIcon: SummaryDownArrowIcon,
    trendColor: 'text-[#40E5D1]',
    trendBgColor: 'bg-[rgb(64,229,209)]/40',
  },
];

const DETAILED_METRICS_DATA: DetailedMetric[] = [
  {
    id: 'ppl',
    Icon: Activity,
    label: '困惑度 (PPL)',
    tooltip: '困惑度 - 数值越低表示文本越自然',
    value: '38.2',
    TrendIcon: DetailedTrendDownIcon,
    trendBaseColor: '#40E5D1',
    trendStrokeColor: '#40E5D1',
    delay: 0,
    iconFillColor: '#40E5D1',
  },
  {
    id: 'rouge',
    Icon: BarChart3,
    label: 'ROUGE-1 F1',
    tooltip: 'ROUGE-1 F1 - 衡量与原文的词汇重叠度',
    value: '0.72',
    TrendIcon: DetailedTrendUpIcon,
    trendBaseColor: '#9152EE',
    trendStrokeColor: '#9152EE',
    delay: 0.05,
    iconFillColor: '#9152EE',
  },
  {
    id: 'ttr',
    Icon: FileText,
    label: '词汇丰富度 (TTR)',
    tooltip: '词汇丰富度 - 类型-标记比率',
    value: '0.76',
    TrendIcon: DetailedTrendUpIcon,
    trendBaseColor: '#DAC5F9',
    trendStrokeColor: '#DAC5F9',
    delay: 0.1,
    iconFillColor: '#DAC5F9',
  },
];

const EvaluationBarChart: React.FC = () => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>(TIME_PERIOD_OPTIONS[0].value);

  return (
    <>
      <style jsx global>{`
        :root {
          --reaviz-tick-fill: #4B5563;
          --reaviz-gridline-stroke: #D1D5DB;
          --reaviz-x-axis-label-fill: #1F2937; 
        }
        .dark {
          --reaviz-tick-fill: #9CA3AF; 
          --reaviz-gridline-stroke: rgba(156, 163, 175, 0.4);
          --reaviz-x-axis-label-fill: #F3F4F6;
        }
      `}</style>
      <div className="flex flex-col justify-between pt-4 pb-4 bg-white dark:bg-black rounded-3xl shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16),39px_78px_50px_rgba(0,0,0,0.20),55px_110px_86px_rgba(0,0,0,0.26)] w-full max-w-2xl min-h-[714px] overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-7 pt-6 pb-8">
          <h3 className="text-3xl text-left font-bold text-gray-900 dark:text-white transition-colors duration-300">
            评估指标报告
          </h3>
          <select
            value={selectedTimePeriod}
            onChange={(e) => setSelectedTimePeriod(e.target.value)}
            className="bg-gray-100 dark:bg-[#262631] text-gray-800 dark:text-white p-3 pt-2 pb-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
            aria-label="选择时间周期"
          >
            {TIME_PERIOD_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 w-full pl-8 pr-8 mb-6">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.name} className="flex gap-2.5 items-center">
              <div className="w-5 h-5 rounded-sm shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors duration-300">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="reaviz-chart-container h-[360px] px-6 mb-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
          <BarChart
            height={360}
            id="evaluation-bar-chart"
            data={validatedChartData}
            yAxis={
              <LinearYAxis
                axisLine={null}
                tickSeries={
                  <LinearYAxisTickSeries 
                    line={null} 
                    label={<LinearYAxisTickLabel fill="var(--reaviz-tick-fill)" />}
                    tickSize={10} 
                  />
                }
              />
            }
            xAxis={
              <LinearXAxis
                type="category"
                tickSeries={
                  <LinearXAxisTickSeries
                    label={
                      <LinearXAxisTickLabel
                        padding={10}
                        rotation={-45}
                        format={text => typeof text === 'string' ? text : ''}
                        fill="var(--reaviz-x-axis-label-fill)"
                      />
                    }
                    tickSize={10}
                  />
                }
              />
            }
            series={
              <BarSeries
                type="grouped"
                layout="vertical"
                bar={<Bar width={24} glow={{ blur: 12, opacity: 0.4 }} gradient={null} />}
                colorScheme={BAR_CHART_COLOR_SCHEME}
                groupPadding={100}
              />
            }
            gridlines={<GridlineSeries line={<Gridline strokeColor="var(--reaviz-gridline-stroke)" strokeWidth={1.5} />} />}
          />
        </div>

        {/* Summary Stats */}
        <div className="flex flex-col sm:flex-row w-full pl-8 pr-8 justify-between pb-2 pt-8 gap-4 sm:gap-8">
          {EVALUATION_STATS_DATA.map(stat => (
            <div key={stat.id} className="flex flex-col gap-2 w-full sm:w-1/2">
              <span className="text-xl text-gray-800 dark:text-gray-200 transition-colors duration-300">{stat.title}</span>
              <div className="flex items-center gap-2">
                <CountUp
                  className="font-mono text-4xl font-semibold text-gray-900 dark:text-white transition-colors duration-300"
                  start={stat.countFrom || 0}
                  end={stat.count}
                  duration={2.5}
                />
                <div className={`flex ${stat.trendBgColor} p-1 pl-2 pr-2 items-center rounded-full ${stat.trendColor}`}>
                  <stat.TrendIcon strokeColor={stat.trendColor === 'text-[#9152EE]' ? '#9152EE' : '#40E5D1'} />
                  {stat.percentage}%
                </div>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
                {stat.comparisonText}
              </span>
            </div>
          ))}
        </div>

        {/* Detailed Metrics List */}
        <div className="flex flex-col pl-8 pr-8 font-mono divide-y divide-gray-200 dark:divide-[#262631] transition-colors duration-300 mt-4">
          {DETAILED_METRICS_DATA.map((metric) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: metric.delay }}
              className="flex w-full py-4 items-center gap-2"
            >
              <div className="flex flex-row gap-2 items-center text-base w-1/2 text-gray-500 dark:text-gray-400 transition-colors duration-300">
                <metric.Icon className="w-5 h-5" style={{ fill: metric.iconFillColor }} />
                <span className="truncate" title={metric.tooltip}>
                  {metric.label}
                </span>
              </div>
              <div className="flex gap-2 w-1/2 justify-end items-center">
                <span className="font-semibold text-xl text-gray-900 dark:text-white transition-colors duration-300">{metric.value}</span>
                <metric.TrendIcon baseColor={metric.trendBaseColor} strokeColor={metric.trendStrokeColor} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default EvaluationBarChart;

