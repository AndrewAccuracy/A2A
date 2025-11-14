import { AppleStyleDock } from "@/components/dock-demo";

export default function DockDemoPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 mb-4">
            Apple Style Dock 演示
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            悬停鼠标查看动画效果
          </p>
        </div>
      </div>
      <AppleStyleDock />
    </div>
  );
}

