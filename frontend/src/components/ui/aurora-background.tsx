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
          "relative flex flex-col min-h-screen items-center justify-start bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              `
            [--aurora:linear-gradient(135deg,rgba(59,130,246,0.1)_0%,rgba(139,92,246,0.1)_25%,rgba(59,130,246,0.1)_50%,rgba(168,85,247,0.1)_75%,rgba(59,130,246,0.1)_100%)]
            [background-image:var(--aurora)]
            [background-size:400%_400%]
            [background-position:50%_50%]
            animate-aurora
            pointer-events-none
            absolute -inset-[10px] opacity-30 will-change-transform`,

              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
