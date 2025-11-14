"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  target?: string;
}

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface FloatingSidebarProps {
  items: NavItem[];
  className?: string;
}

// Glass Effect Wrapper Component
const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  className = "",
  style = {},
  href,
  target = "_blank",
}) => {
  const glassStyle = {
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
    transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    ...style,
  };

  const content = (
    <div
      className={`relative flex font-semibold overflow-hidden text-black cursor-pointer group ${className}`}
      style={glassStyle}
    >
      {/* Glass Layers - Enhanced glassmorphism */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-inherit rounded-3xl"
        style={{
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        }}
      />
      {/* Glass highlight layer */}
      <div
        className="absolute inset-0 z-10 rounded-inherit rounded-3xl"
        style={{ 
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)",
          transition: "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Glass border effect */}
      <div
        className="absolute inset-0 z-20 rounded-inherit rounded-3xl overflow-hidden"
        style={{
          boxShadow:
            "inset 0 1px 2px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)",
          transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 z-[15] rounded-inherit rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-30 transform transition-transform duration-300 ease-out group-hover:scale-[1.03]">{children}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
};

// SVG Filter Component
const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }}>
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="200"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
);

// Floating Sidebar Component
export function FloatingSidebar({ items, className }: FloatingSidebarProps) {
  const pathname = usePathname();

  // 根据当前路径确定活动标签
  const getActiveTab = () => {
    const currentItem = items.find(item => item.url === pathname);
    return currentItem ? currentItem.name : items[0].name;
  };

  return (
    <div className={cn("fixed z-50", className)}>
      <GlassFilter />
      
      {/* 三个独立的小组件 */}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = getActiveTab() === item.name;

          return (
            <GlassEffect
              key={item.name}
              href={item.url}
              className={cn(
                "rounded-3xl px-4 py-3",
                isActive && "bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20"
              )}
            >
              <div className="flex items-center justify-center">
                <div className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  "bg-white/20 dark:bg-black/20",
                  "backdrop-blur-sm",
                  "border border-white/30 dark:border-white/10",
                  "group-hover:bg-white/30 dark:group-hover:bg-white/15",
                  isActive && "bg-white/30 dark:bg-white/25 shadow-lg"
                )}>
                  <Icon 
                    size={20} 
                    className={cn(
                      "text-gray-700 dark:text-gray-300 transition-colors duration-300",
                      "group-hover:text-blue-600 dark:group-hover:text-blue-400",
                      isActive && "text-blue-600 dark:text-blue-400"
                    )}
                  />
                </div>
              </div>
            </GlassEffect>
          );
        })}
      </div>
    </div>
  );
}
