"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LiquidGlassBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "subtle" | "strong"
}

const LiquidGlassBorder = React.forwardRef<HTMLDivElement, LiquidGlassBorderProps>(
  ({ className, children, variant = "default", ...props }, ref) => {
    const shadowVariants = {
      default: "shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]",
      subtle: "shadow-[0_0_4px_rgba(0,0,0,0.02),0_1px_4px_rgba(0,0,0,0.06),inset_2px_2px_0.3px_-2px_rgba(0,0,0,0.7),inset_-2px_-2px_0.3px_-2px_rgba(0,0,0,0.6),inset_0_0_4px_4px_rgba(0,0,0,0.08),0_0_8px_rgba(255,255,255,0.1)] dark:shadow-[0_0_6px_rgba(0,0,0,0.02),0_1px_4px_rgba(0,0,0,0.06),inset_2px_2px_0.3px_-2.5px_rgba(255,255,255,0.06),inset_-2px_-2px_0.3px_-2.5px_rgba(255,255,255,0.6),inset_0_0_4px_4px_rgba(255,255,255,0.08),0_0_8px_rgba(0,0,0,0.1)]",
      strong: "shadow-[0_0_8px_rgba(0,0,0,0.04),0_3px_8px_rgba(0,0,0,0.1),inset_4px_4px_0.7px_-4px_rgba(0,0,0,0.95),inset_-4px_-4px_0.7px_-4px_rgba(0,0,0,0.9),inset_2px_2px_1px_-1px_rgba(0,0,0,0.7),inset_-2px_-2px_1px_-1px_rgba(0,0,0,0.7),inset_0_0_8px_8px_rgba(0,0,0,0.15),inset_0_0_3px_3px_rgba(0,0,0,0.08),0_0_16px_rgba(255,255,255,0.2)] dark:shadow-[0_0_10px_rgba(0,0,0,0.04),0_3px_8px_rgba(0,0,0,0.1),inset_4px_4px_0.7px_-4.5px_rgba(255,255,255,0.12),inset_-4px_-4px_0.7px_-4.5px_rgba(255,255,255,0.9),inset_2px_2px_1px_-1px_rgba(255,255,255,0.7),inset_-2px_-2px_1px_-1px_rgba(255,255,255,0.7),inset_0_0_8px_8px_rgba(255,255,255,0.15),inset_0_0_3px_3px_rgba(255,255,255,0.08),0_0_16px_rgba(0,0,0,0.2)]"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        {/* Liquid Glass Border Effect */}
        <div className={cn(
          "absolute top-0 left-0 z-0 h-full w-full rounded-lg transition-all",
          shadowVariants[variant]
        )} />
        
        {/* Glass Filter Background */}
        <div
          className="absolute top-0 left-0 isolate -z-10 h-full w-full overflow-hidden rounded-lg"
          style={{ backdropFilter: 'url("#container-glass")' }}
        />

        {/* Content */}
        <div className="relative z-10 h-full">
          {children}
        </div>
        
        {/* Glass Filter SVG */}
        <GlassFilter />
      </div>
    )
  }
)
LiquidGlassBorder.displayName = "LiquidGlassBorder"

function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Generate turbulent noise for distortion */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />

          {/* Blur the turbulence pattern slightly */}
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />

          {/* Displace the source graphic with the noise */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />

          {/* Apply overall blur on the final result */}
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />

          {/* Output the result */}
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

export { LiquidGlassBorder }
