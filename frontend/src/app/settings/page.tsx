"use client";
import { Settings, Shield, Network, Lock, Globe, Zap, Eye } from "lucide-react";
import { LiquidGlassBorder } from "@/components/ui/liquid-glass-border";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const settingsCategories = [
    {
      title: "安全设置",
      icon: Shield,
      items: [
        { name: "加密级别", value: "AES-256", description: "当前使用AES-256加密" },
        { name: "认证方式", value: "双因子认证", description: "已启用双因子认证" },
        { name: "会话超时", value: "30分钟", description: "自动登出时间" }
      ]
    },
    {
      title: "网络设置",
      icon: Network,
      items: [
        { name: "节点数量", value: "18个", description: "全球部署节点数" },
        { name: "连接协议", value: "WebSocket", description: "实时通信协议" },
        { name: "延迟优化", value: "已启用", description: "自动选择最优路径" }
      ]
    },
    {
      title: "隐私设置",
      icon: Lock,
      items: [
        { name: "匿名模式", value: "已启用", description: "隐藏真实身份" },
        { name: "数据收集", value: "最小化", description: "仅收集必要数据" },
        { name: "日志保留", value: "7天", description: "系统日志保留时间" }
      ]
    },
    {
      title: "性能设置",
      icon: Zap,
      items: [
        { name: "并发连接", value: "1000", description: "最大并发连接数" },
        { name: "缓存策略", value: "智能缓存", description: "自动优化缓存" },
        { name: "带宽限制", value: "无限制", description: "当前无带宽限制" }
      ]
    }
  ];

  return (
    <AuroraBackground>
            <div className="relative z-10 pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-2xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            系统设置
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            配置和管理A2A Covert系统的各项参数
          </p>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {settingsCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <LiquidGlassBorder className="p-6 rounded-2xl h-full">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-4">
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {category.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.name}
                      className="flex justify-between items-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: categoryIndex * 0.1 + itemIndex * 0.05 }}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                          {item.value}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <LiquidButton className="w-full text-blue-600 dark:text-blue-400">
                    编辑设置
                  </LiquidButton>
                </div>
              </LiquidGlassBorder>
            </motion.div>
          ))}
        </div>

        {/* System Status */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <LiquidGlassBorder className="p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                系统状态
              </h2>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  运行正常
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  99.9%
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  系统可用性
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  18
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  活跃节点
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  &lt;50ms
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  平均延迟
                </div>
              </div>
            </div>
          </LiquidGlassBorder>
        </motion.div>
        </div>
      </div>
    </AuroraBackground>
  );
}
