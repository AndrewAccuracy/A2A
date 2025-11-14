"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";
import Image from "next/image";
import { useTheme } from "next-themes";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
}

export function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const map = new DottedMap({ height: 100, grid: "diagonal" });

  const { theme } = useTheme();

  // 浅彩色调色板
  const lightColors = [
    "#ff9a9e", // 浅粉色
    "#a8edea", // 浅青色
    "#d299c2", // 浅紫色
    "#fad0c4", // 浅橙色
    "#a1c4fd", // 浅蓝色
    "#ffecd2", // 浅黄色
    "#c3cfe2", // 浅灰蓝
    "#f093fb", // 浅紫粉
    "#4facfe", // 浅天蓝
    "#43e97b", // 浅绿色
    "#ffb3ba", // 浅珊瑚色
    "#bae1ff", // 浅薄荷蓝
    "#ffdfba", // 浅桃色
    "#baffc9", // 浅薄荷绿
    "#ffffba", // 浅柠檬黄
  ];

  // 创建随机化的连线顺序 - 使用固定的种子避免hydration不匹配
  const shuffledDots = React.useMemo(() => {
    const shuffled = [...dots];
    // 使用固定的种子来确保服务端和客户端的一致性
    let seed = 42; // 固定种子
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [dots]);

  const svgMap = map.getSVG({
    radius: 0.22,
    color: "#FFFFFF80", // 改为亮色（半透明白色）
    shape: "circle",
    backgroundColor: "transparent", // 改为透明背景
  });

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto aspect-[2/1] relative font-sans scale-110">
      <Image
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full pointer-events-none select-none"
        alt="world map"
        height="495"
        width="1056"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-none select-none"
      >
        {shuffledDots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          const currentColor = theme === "dark" ? "#ffffff" : lightColors[i % lightColors.length];
          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke={currentColor}
                strokeWidth="1"
                initial={{
                  pathLength: 0,
                  opacity: 1,
                }}
                animate={{
                  pathLength: [0, 1, 1, 0],
                  opacity: [1, 1, 1, 0],
                }}
                transition={{
                  duration: 6,
                  delay: 2.0 + 0.5 * i, // 延迟2秒后开始连线动画
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                key={`connect-${i}`}
              />
            </g>
          );
        })}


        {shuffledDots.map((dot, i) => {
          const currentColor = theme === "dark" ? "#ffffff" : lightColors[i % lightColors.length];
          return (
            <g key={`points-group-${i}`}>
              <motion.g 
                key={`start-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2.0 + i * 0.05 }}
              >
                <circle
                  cx={projectPoint(dot.start.lat, dot.start.lng).x}
                  cy={projectPoint(dot.start.lat, dot.start.lng).y}
                  r="3"
                  fill={currentColor}
                  stroke="white"
                  strokeWidth="1"
                />
                <circle
                  cx={projectPoint(dot.start.lat, dot.start.lng).x}
                  cy={projectPoint(dot.start.lat, dot.start.lng).y}
                  r="3"
                  fill={currentColor}
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    from="3"
                    to="12"
                    dur="2s"
                    begin={`${2.0 + i * 0.05}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.3"
                    to="0"
                    dur="2s"
                    begin={`${2.0 + i * 0.05}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </motion.g>
              <motion.g 
                key={`end-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2.0 + i * 0.05 }}
              >
                <circle
                  cx={projectPoint(dot.end.lat, dot.end.lng).x}
                  cy={projectPoint(dot.end.lat, dot.end.lng).y}
                  r="3"
                  fill={currentColor}
                  stroke="white"
                  strokeWidth="1"
                />
                <circle
                  cx={projectPoint(dot.end.lat, dot.end.lng).x}
                  cy={projectPoint(dot.end.lat, dot.end.lng).y}
                  r="3"
                  fill={currentColor}
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    from="3"
                    to="12"
                    dur="2s"
                    begin={`${2.0 + i * 0.05}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.3"
                    to="0"
                    dur="2s"
                    begin={`${2.0 + i * 0.05}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </motion.g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}