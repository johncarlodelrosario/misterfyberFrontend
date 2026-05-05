"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FiUsers, FiCpu, FiClock, FiHeadphones } from "react-icons/fi";

interface StatsSectionProps {
  stats: {
    users: number;
    speed: number;
    uptime: number;
  };
}

const statsData = [
  {
    value: "Happy Customers Are Our Priority",
    label: "",
    icon: FiUsers,
    color: "from-blue-500 to-cyan-500",
    direction: "left",
  },
  {
    value: "", // Will be filled with stats.speed
    label: "Max Speed",
    icon: FiCpu,
    color: "from-purple-500 to-pink-500",
    direction: "right",
  },
  {
    value: "", // Will be filled with stats.uptime
    label: "Uptime Guarantee",
    icon: FiClock,
    color: "from-yellow-500 to-orange-500",
    direction: "left",
  },
  {
    value: "12/7",
    label: "Support Available",
    icon: FiHeadphones,
    color: "from-green-500 to-emerald-500",
    direction: "right",
  },
];

function StatCard({
  stat,
  speed,
  uptime,
}: {
  stat: (typeof statsData)[0];
  speed: number;
  uptime: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll animation - magsisimula nang maaga
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const isLeft = stat.direction === "left";

  // Determine actual value
  let displayValue = stat.value;
  if (stat.label === "Max Speed") {
    displayValue = `${speed} Mbps`;
  } else if (stat.label === "Uptime Guarantee") {
    displayValue = `${uptime}%`;
  }

  // Animation values - maagang mag-show up
  const x = useTransform(
    scrollYProgress,
    [0, 0.15, 0.4, 0.7],
    isLeft ? [-100, -30, 0, 0] : [100, 30, 0, 0],
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.35, 0.6],
    [0, 0.4, 1, 1],
  );

  const scale = useTransform(
    scrollYProgress,
    [0, 0.15, 0.4, 0.7],
    [0.9, 0.95, 1, 1],
  );

  const rotate = useTransform(
    scrollYProgress,
    [0, 0.2, 0.5, 0.8],
    isLeft ? [-3, -1, 0, 0] : [3, 1, 0, 0],
  );

  return (
    <motion.div
      ref={cardRef}
      style={{
        x,
        opacity,
        scale,
        rotate,
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="text-center group"
    >
      <motion.div
        className="mb-4 inline-flex p-4 bg-gray-800/80 backdrop-blur-sm rounded-2xl group-hover:shadow-xl transition-all duration-300 border border-blue-500/30 group-hover:border-blue-500/60"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
      >
        <stat.icon className="w-8 h-8 text-cyan-400" />
      </motion.div>
      <motion.div
        className={`font-bold mb-2 ${
          stat.label === "" ? "text-xl md:text-2xl" : "text-4xl"
        } bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
      >
        {displayValue}
      </motion.div>
      {stat.label && (
        <div className="text-gray-400 font-medium">{stat.label}</div>
      )}
    </motion.div>
  );
}

export default function StatsSection({ stats }: StatsSectionProps) {
  const headerRef = useRef(null);

  // Header animation - sumusunod sa scroll
  const { scrollYProgress: headerScroll } = useScroll({
    target: headerRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(
    headerScroll,
    [0, 0.1, 0.4, 0.7],
    [30, 0, 0, -5],
  );
  const headerOpacity = useTransform(
    headerScroll,
    [0, 0.08, 0.3, 0.6],
    [0, 0.6, 1, 1],
  );

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ backgroundColor: "#080616" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Optional Header - maaaring gusto mong maglagay ng title */}
        <motion.div
          ref={headerRef}
          style={{
            y: headerY,
            opacity: headerOpacity,
          }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Our{" "}
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Statistics
            </span>
          </h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
            Numbers that speak for themselves
          </p>
        </motion.div>

        {/* Stats Grid - alternating left and right */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statsData.map((stat, index) => (
            <StatCard
              key={index}
              stat={stat}
              speed={stats.speed}
              uptime={stats.uptime}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
