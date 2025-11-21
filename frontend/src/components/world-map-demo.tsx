"use client";
import { WorldMap } from "@/components/ui/world-map";
import { motion } from "framer-motion";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";

export function WorldMapDemo() {
  
const cities = [
    // North America (18)
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
    { lat: 41.8781, lng: -87.6298, name: "Chicago" },
    { lat: 29.7604, lng: -95.3698, name: "Houston" },
    { lat: 19.4326, lng: -99.1332, name: "Mexico City" },
    { lat: 45.4215, lng: -75.6972, name: "Ottawa" },
    { lat: 43.6532, lng: -79.3832, name: "Toronto" },
    { lat: 45.5017, lng: -73.5673, name: "Montreal" },
    { lat: 49.2827, lng: -123.1207, name: "Vancouver" },
    { lat: 47.6062, lng: -122.3321, name: "Seattle" },
    { lat: 25.7617, lng: -80.1918, name: "Miami" },
    { lat: 32.7767, lng: -96.7970, name: "Dallas" },
    { lat: 23.1136, lng: -82.3666, name: "Havana" },
    { lat: 8.9824, lng: -79.5199, name: "Panama City" },
    { lat: 61.2181, lng: -149.9003, name: "Anchorage" }, // 替换了 "Alaska"
    { lat: 64.1466, lng: -21.9426, name: "Reykjavik, Iceland" },
    { lat: 64.1717, lng: -51.7216, name: "Nuuk, Greenland" },
    { lat: 21.3069, lng: -157.8583, name: "Honolulu, Hawaii" },
    { lat: 62.4540, lng: -114.3718, name: "Yellowknife, Canada" },
    { lat: 63.7467, lng: -68.5170, name: "Iqaluit, Canada" },

    // South America (10)
    { lat: -15.7975, lng: -47.8919, name: "Brasília" },
    { lat: -34.6118, lng: -58.3960, name: "Buenos Aires" },
    { lat: -12.0464, lng: -77.0428, name: "Lima" },
    { lat: -22.9068, lng: -43.1729, name: "Rio de Janeiro" },
    { lat: 4.7110, lng: -74.0721, name: "Bogota" },
    { lat: -33.4489, lng: -70.6693, name: "Santiago" },
    { lat: 10.4806, lng: -66.9036, name: "Caracas" },
    { lat: -0.1807, lng: -78.4678, name: "Quito" },
    { lat: -16.4897, lng: -68.1193, name: "La Paz, Bolivia" },
    { lat: -54.8019, lng: -68.3030, name: "Ushuaia, Argentina" },
    { lat: -53.1638, lng: -70.9171, name: "Punta Arenas, Chile" },
    { lat: -45.8647, lng: -67.4965, name: "Comodoro Rivadavia, Argentina" },

    // Europe (24)
    { lat: 51.5074, lng: -0.1278, name: "London" },
    { lat: 48.8566, lng: 2.3522, name: "Paris" },
    { lat: 52.5200, lng: 13.4050, name: "Berlin" },
    { lat: 55.7558, lng: 37.6176, name: "Moscow" },
    { lat: 38.7223, lng: -9.1393, name: "Lisbon" },
    { lat: 40.4168, lng: -3.7038, name: "Madrid" },
    { lat: 41.9028, lng: 12.4964, name: "Rome" },
    { lat: 41.0082, lng: 28.9784, name: "Istanbul" },
    { lat: 50.4501, lng: 30.5234, name: "Kyiv" },
    { lat: 59.3293, lng: 18.0686, name: "Stockholm" },
    { lat: 59.9139, lng: 10.7522, name: "Oslo" },
    { lat: 52.2297, lng: 21.0122, name: "Warsaw" },
    { lat: 37.9838, lng: 23.7275, name: "Athens" },
    { lat: 52.3676, lng: 4.9041, name: "Amsterdam" },
    { lat: 60.1699, lng: 24.9384, name: "Helsinki" },
    { lat: 48.1486, lng: 17.1077, name: "Bratislava" },
    { lat: 48.2082, lng: 16.3738, name: "Vienna" },
    { lat: 50.0755, lng: 14.4378, name: "Prague" },
    { lat: 47.4979, lng: 19.0402, name: "Budapest" },
    { lat: 44.4268, lng: 26.1025, name: "Bucharest" },
    { lat: 59.9311, lng: 30.3609, name: "Saint Petersburg" },
    { lat: 55.0084, lng: 82.9357, name: "Novosibirsk" },
    { lat: 56.8389, lng: 60.6057, name: "Yekaterinburg" },
    { lat: 55.7961, lng: 49.1060, name: "Kazan" },

    // Africa (13)
    { lat: -1.2921, lng: 36.8219, name: "Nairobi" },
    { lat: -26.2041, lng: 28.0473, name: "Johannesburg" },
    { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
    { lat: 30.0444, lng: 31.2357, name: "Cairo" },
    { lat: 6.5244, lng: 3.3792, name: "Lagos" },
    { lat: 33.5731, lng: -7.5898, name: "Casablanca" },
    { lat: 14.7167, lng: -17.4677, name: "Dakar" },
    { lat: 5.6037, lng: -0.1870, name: "Accra" },
    { lat: 36.7783, lng: 3.0588, name: "Algiers" },
    { lat: -4.4419, lng: 15.2663, name: "Kinshasa" },
    { lat: 9.0084, lng: 38.7575, name: "Addis Ababa" },
    { lat: -8.8383, lng: 13.2344, name: "Luanda" },
    { lat: -18.8792, lng: 47.5079, name: "Antananarivo, Madagascar" },
    { lat: -24.6282, lng: 25.9231, name: "Gaborone, Botswana" },
    { lat: -22.5609, lng: 17.0658, name: "Windhoek, Namibia" },

    // Asia (27)
    { lat: 28.6139, lng: 77.209, name: "New Delhi" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    { lat: 43.1332, lng: 131.9113, name: "Vladivostok" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: 39.9042, lng: 116.4074, name: "Beijing" },
    { lat: 31.2304, lng: 121.4737, name: "Shanghai" },
    { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
    { lat: 37.5665, lng: 126.9780, name: "Seoul" },
    { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
    { lat: -6.2088, lng: 106.8456, name: "Jakarta" },
    { lat: 13.7563, lng: 100.5018, name: "Bangkok" },
    { lat: 10.8231, lng: 106.6297, name: "Ho Chi Minh City" },
    { lat: 21.0285, lng: 105.8542, name: "Hanoi" },
    { lat: 25.2048, lng: 55.2708, name: "Dubai" },
    { lat: 24.7136, lng: 46.6753, name: "Riyadh" },
    { lat: 35.7152, lng: 51.4043, name: "Tehran" },
    { lat: 24.8607, lng: 67.0011, name: "Karachi" },
    { lat: 14.5995, lng: 120.9842, name: "Manila" },
    { lat: 3.1390, lng: 101.6869, name: "Kuala Lumpur" },
    { lat: 32.0853, lng: 34.7818, name: "Tel Aviv" },
    { lat: 33.3152, lng: 44.3661, name: "Baghdad" },
    { lat: 23.8103, lng: 90.4125, name: "Dhaka" },
    { lat: 43.2220, lng: 76.8512, name: "Almaty, Kazakhstan" },
    { lat: 41.2995, lng: 69.2401, name: "Tashkent, Uzbekistan" },
    { lat: 47.9187, lng: 106.9175, name: "Ulaanbaatar, Mongolia" },
    { lat: 56.1304, lng: 101.6859, name: "Krasnoyarsk" },
    { lat: 52.2896, lng: 104.2845, name: "Irkutsk" },
    { lat: 62.0280, lng: 129.7320, name: "Yakutsk, Russia" },
    { lat: 53.0100, lng: 158.6475, name: "Petropavlovsk-Kamchatsky, Russia" },
    

    // Oceania (7)
    { lat: -33.8688, lng: 151.2093, name: "Sydney" },
    { lat: -37.8136, lng: 144.9631, name: "Melbourne" },
    { lat: -36.8485, lng: 174.7633, name: "Auckland" },
    { lat: -41.2865, lng: 174.7762, name: "Wellington" },
    { lat: -31.9505, lng: 115.8605, name: "Perth" },
    { lat: -18.1416, lng: 178.4419, name: "Suva, Fiji" },
    { lat: -17.5360, lng: -149.5699, name: "Papeete, French Polynesia" },
    { lat: -34.9285, lng: 138.6007, name: "Adelaide, Australia" },
    { lat: -42.8821, lng: 147.3272, name: "Hobart, Australia" },
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

  const generateRandomNetwork = (maxConnections = 200) => {
    const connections = [];
    if (cities.length < 2) return [];

    const seededRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };

    // 使用固定种子确保每次加载时随机连接是相同的
    // 避免服务器和客户端渲染不一致
    const random = seededRandom(42); 

    for (let i = 0; i < maxConnections; i++) {
      const idx1 = Math.floor(random() * cities.length);
      let idx2 = Math.floor(random() * cities.length);

      // 确保两个节点不相同
      while (idx1 === idx2) {
        idx2 = Math.floor(random() * cities.length);
      }

      connections.push({
        start: { lat: cities[idx1].lat, lng: cities[idx1].lng },
        end: { lat: cities[idx2].lat, lng: cities[idx2].lng },
      });
    }
    return connections;
  };

  //const allConnections = generateFullyConnectedNetwork();
  const allConnections = generateRandomNetwork(200); // 生成200条随机连接

  return (
    <main className="relative flex flex-col min-h-screen items-center justify-center text-white pt-20 pb-20 w-full overflow-hidden">
      {/* Dynamic Wave Background */}
      <div className="absolute inset-0 z-0">
        <HeroWave />
      </div>
        <motion.div 
          className="max-w-7xl mx-auto text-center px-4 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
        <motion.p 
          className="font-bold text-xl md:text-4xl text-white mb-6 drop-shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          A2A{" "}
          <span className="text-white/90">
            {"Covert".split("").map((word, idx) => (
              <motion.span
                key={idx}
                className="inline-block"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 + idx * 0.04 }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </motion.p>
        <motion.div
          className="text-sm md:text-lg text-white/80 max-w-2xl mx-auto py-4 drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="flex justify-center items-center gap-x-10 px-4 font-medium whitespace-nowrap">
            <span>智能体通信</span>
            <span>安全</span>
            <span>去中心化</span>
            <span>分布式智能</span>
            <span>隐蔽操作</span>
          </div>
          </motion.div>
        </motion.div>
        <motion.div 
          className="relative z-10 w-full flex justify-center items-center mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          <div className="w-full max-w-[1600px]">
            <WorldMap dots={allConnections} />
          </div>
        </motion.div>
    </main>
  );
}