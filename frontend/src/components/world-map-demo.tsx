"use client";
import { WorldMap } from "@/components/ui/world-map";
import { motion } from "framer-motion";

export function WorldMapDemo() {
  
  // 定义所有城市节点
  const cities = [
    { lat: 64.2008, lng: -149.4937, name: "Alaska" },
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
    { lat: -15.7975, lng: -47.8919, name: "Brasília" },
    { lat: -34.6118, lng: -58.3960, name: "Buenos Aires" },
    { lat: 51.5074, lng: -0.1278, name: "London" },
    { lat: 48.8566, lng: 2.3522, name: "Paris" },
    { lat: 52.5200, lng: 13.4050, name: "Berlin" },
    { lat: 55.7558, lng: 37.6176, name: "Moscow" },
    { lat: 28.6139, lng: 77.209, name: "New Delhi" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    { lat: 43.1332, lng: 131.9113, name: "Vladivostok" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: -1.2921, lng: 36.8219, name: "Nairobi" },
    { lat: -26.2041, lng: 28.0473, name: "Johannesburg" },
    { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
    { lat: 38.7223, lng: -9.1393, name: "Lisbon" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney" },
  ];

  // 生成完全连通的网络 - 每个城市都连接到其他所有城市
  const generateFullyConnectedNetwork = () => {
    const connections = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        connections.push({
          start: { lat: cities[i].lat, lng: cities[i].lng },
          end: { lat: cities[j].lat, lng: cities[j].lng },
        });
      }
    }
    return connections;
  };

  const allConnections = generateFullyConnectedNetwork();

  return (
    <main className="relative flex flex-col min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 pt-20 pb-20 w-full">
        <div className="max-w-7xl mx-auto text-center px-4">
        <p className="font-bold text-xl md:text-4xl text-black dark:text-white mb-6">
          A2A{" "}
          <span className="text-gray-600 dark:text-gray-400">
            {"Covert".split("").map((word, idx) => (
              <motion.span
                key={idx}
                className="inline-block"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.04 }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </p>
        <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto py-4">
          Advanced Agent-to-Agent Communication System. Enabling secure, 
          decentralized AI agent interactions across global networks. 
          Perfect for distributed intelligence and covert operations.
        </p>
        </div>
        <WorldMap dots={allConnections} />
    </main>
  );
}