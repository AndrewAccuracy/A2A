import { LiquidGlassBorder } from "@/components/ui/liquid-glass-border";
import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button";

export default function LiquidGlassDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Liquid Glass 效果演示
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Subtle Variant */}
          <LiquidGlassBorder variant="subtle" className="p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-white mb-4">Subtle 效果</h2>
            <p className="text-gray-300 mb-4">
              轻微的液体玻璃效果，适合内容展示
            </p>
            <LiquidButton size="sm">测试按钮</LiquidButton>
          </LiquidGlassBorder>

          {/* Default Variant */}
          <LiquidGlassBorder variant="default" className="p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-white mb-4">Default 效果</h2>
            <p className="text-gray-300 mb-4">
              标准的液体玻璃效果，平衡的视觉冲击
            </p>
            <MetalButton variant="primary" size="sm">测试按钮</MetalButton>
          </LiquidGlassBorder>

          {/* Strong Variant */}
          <LiquidGlassBorder variant="strong" className="p-6 bg-white/5">
            <h2 className="text-xl font-semibold text-white mb-4">Strong 效果</h2>
            <p className="text-gray-300 mb-4">
              强烈的液体玻璃效果，突出的视觉表现
            </p>
            <MetalButton variant="gold" size="sm">测试按钮</MetalButton>
          </LiquidGlassBorder>
        </div>

        {/* Large Example */}
        <LiquidGlassBorder variant="default" className="p-8 bg-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">A2A 隐蔽通信演示系统</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">服务器配置</h3>
              <p className="text-gray-300">
                配置隐写模型路径、算法和密钥等参数
              </p>
              <MetalButton variant="success" className="w-full">
                启动服务器
              </MetalButton>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">客户端配置</h3>
              <p className="text-gray-300">
                设置隐蔽信息和客户端算法
              </p>
              <LiquidButton className="w-full">
                启动隐蔽通信
              </LiquidButton>
            </div>
          </div>
        </LiquidGlassBorder>
      </div>
    </div>
  );
}
