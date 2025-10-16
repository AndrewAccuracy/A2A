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
            [--aurora:linear-gradient(135deg,rgba(59,130,246,0.6)_0%,rgba(139,92,246,0.6)_25%,rgba(59,130,246,0.6)_50%,rgba(168,85,247,0.6)_75%,rgba(59,130,246,0.6)_100%)]
            [background-image:var(--aurora)]
            [background-size:200%_200%]
            [background-position:50%_50%]
            animate-aurora
            pointer-events-none
            absolute -inset-[20px] opacity-80 will-change-transform`,

              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_100%_0%,black_20%,var(--transparent)_60%)]`
            )}
          ></div>
          <div
            className={cn(
              `
            [--aurora2:linear-gradient(45deg,rgba(168,85,247,0.4)_0%,rgba(59,130,246,0.4)_25%,rgba(139,92,246,0.4)_50%,rgba(59,130,246,0.4)_75%,rgba(168,85,247,0.4)_100%)]
            [background-image:var(--aurora2)]
            [background-size:150%_150%]
            [background-position:0%_0%]
            animate-aurora
            pointer-events-none
            absolute -inset-[20px] opacity-60 will-change-transform
            [animation-direction:reverse]
            [animation-duration:45s]`,

              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_0%_100%,black_20%,var(--transparent)_60%)]`
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};
