"use client";
import { motion } from "framer-motion";
import { LiquidGlassBorder } from "@/components/ui/liquid-glass-border";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { 
  Shield, 
  Network, 
  Lock, 
  Globe, 
  Zap, 
  Eye
} from "lucide-react";

export function StartPage() {

  const features = [
    {
      icon: Shield,
      title: "安全通信",
      description: "端到端加密保护，确保通信安全"
    },
    {
      icon: Network,
      title: "分布式网络",
      description: "全球节点部署，无单点故障"
    },
    {
      icon: Lock,
      title: "隐私保护",
      description: "匿名化处理，保护用户隐私"
    },
    {
      icon: Globe,
      title: "全球覆盖",
      description: "支持全球范围内的智能体通信"
    },
    {
      icon: Zap,
      title: "高性能",
      description: "毫秒级响应，支持大规模并发"
    },
    {
      icon: Eye,
      title: "隐蔽操作",
      description: "隐秘模式，支持特殊任务执行"
    }
  ];

  return (
    <AuroraBackground>
            <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-20">
        {/* Main Content */}
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo and Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-transparent rounded-full mb-6">
              <Network className="w-12 h-12 text-black dark:text-white" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-black dark:text-white mb-4">
              A2A Covert
            </h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-black dark:text-white mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              智能体间隐蔽通信系统
            </motion.p>
            
            <motion.p 
              className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Advanced Agent-to-Agent Communication System
            </motion.p>
          </motion.div>

          {/* Description */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <LiquidGlassBorder className="p-8 rounded-2xl">
              <p className="text-lg text-black dark:text-white leading-relaxed">
                一个革命性的分布式智能体通信平台，专为安全、隐蔽的AI智能体交互而设计。
                支持全球范围内的安全通信，确保隐私保护和高效协作。
              </p>
            </LiquidGlassBorder>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
              >
                <LiquidGlassBorder className="p-6 rounded-xl h-full hover:scale-105 transition-transform duration-300">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-transparent rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-black dark:text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </LiquidGlassBorder>
              </motion.div>
            ))}
          </motion.div>

          {/* Footer */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 A2A Covert System. All rights reserved.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}