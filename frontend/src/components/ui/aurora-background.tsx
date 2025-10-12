"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex flex-col h-[100vh] items-center justify-center text-black dark:text-white transition-bg",
          // 透明背景，让全局的金属光泽背景显示
          "bg-transparent",
          className
        )}
        {...props}
      >
        {/* 极光效果只在一小部分区域显示 */}
        <div className="absolute top-20 right-20 w-96 h-64 overflow-hidden rounded-2xl">
          <div
            className={cn(
              "absolute -inset-[10px] opacity-60 will-change-transform pointer-events-none",
              "bg-gradient-to-r from-blue-500 via-indigo-300 via-blue-300 via-violet-200 to-blue-400",
              "dark:bg-gradient-to-r dark:from-blue-500 dark:via-indigo-300 dark:via-blue-300 dark:via-violet-200 dark:to-blue-400",
              "bg-[length:300%_200%] bg-[position:50%_50%]",
              "filter blur-[15px] invert dark:invert-0",
              "animate-aurora",
              showRadialGradient && "mask-image-[radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"
            )}
            style={{
              backgroundImage: `
                repeating-linear-gradient(100deg, white 0%, white 7%, transparent 10%, transparent 12%, white 16%),
                repeating-linear-gradient(100deg, #3b82f6 10%, #a5b4fc 15%, #93c5fd 20%, #ddd6fe 25%, #60a5fa 30%)
              `,
              backgroundSize: '300%, 200%',
              backgroundPosition: '50% 50%, 50% 50%',
            }}
          />
        </div>
        {children}
      </div>
    </main>
  );
};
