"use client";

import { useRef, useEffect, useState } from "react";
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
    color: "from-blue-400 to-cyan-400",
    bgColor: "bg-blue-50/50",
    borderColor: "border-blue-200/50",
    glowColor: "shadow-blue-500/20",
    direction: "left",
  },
  {
    value: "", // Will be filled with stats.speed
    label: "Max Speed",
    icon: FiCpu,
    color: "from-purple-400 to-pink-400",
    bgColor: "bg-purple-50/50",
    borderColor: "border-purple-200/50",
    glowColor: "shadow-purple-500/20",
    direction: "right",
  },
  {
    value: "", // Will be filled with stats.uptime
    label: "Uptime Guarantee",
    icon: FiClock,
    color: "from-yellow-400 to-orange-400",
    bgColor: "bg-yellow-50/50",
    borderColor: "border-yellow-200/50",
    glowColor: "shadow-yellow-500/20",
    direction: "left",
  },
  {
    value: "12/7",
    label: "Support Available",
    icon: FiHeadphones,
    color: "from-green-400 to-emerald-400",
    bgColor: "bg-green-50/50",
    borderColor: "border-green-200/50",
    glowColor: "shadow-green-500/20",
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const isLeft = stat.direction === "left";

  let displayValue = stat.value;
  if (stat.label === "Max Speed") {
    displayValue = `${speed} Mbps`;
  } else if (stat.label === "Uptime Guarantee") {
    displayValue = `${uptime}%`;
  }

  // Only apply transforms on client
  const x = useTransform(
    scrollYProgress,
    [0, 0.15, 0.4, 0.7],
    isLeft ? [-150, -30, 0, 0] : [150, 30, 0, 0],
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.35, 0.6],
    [0, 0.4, 1, 1],
  );

  const scale = useTransform(
    scrollYProgress,
    [0, 0.15, 0.4, 0.7],
    [0.85, 0.95, 1, 1],
  );

  const rotate = useTransform(
    scrollYProgress,
    [0, 0.2, 0.5, 0.8],
    isLeft ? [-5, -1, 0, 0] : [5, 1, 0, 0],
  );

  const Icon = stat.icon;

  return (
    <motion.div
      ref={cardRef}
      style={
        isMounted
          ? {
              x,
              opacity,
              scale,
              rotate,
            }
          : {}
      }
      whileHover={{
        scale: 1.08,
        y: -8,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }}
      suppressHydrationWarning
      className={`relative group ${stat.bgColor} backdrop-blur-sm rounded-2xl p-6 border ${stat.borderColor} 
                 shadow-xl hover:shadow-2xl transition-all duration-500
                 hover:border-transparent hover:ring-2 hover:ring-opacity-50`}
    >
      {/* Glow Effect */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${stat.color} rounded-2xl opacity-0 
                      group-hover:opacity-30 blur-xl transition-all duration-500 ${stat.glowColor}`}
      />

      {/* Animated Background Gradient */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-all duration-500`}
        initial={false}
        whileHover={{ opacity: 0.15 }}
      />

      <div className="relative z-10 text-center">
        {/* Icon with Rotating Ring */}
        <motion.div
          className="mb-4 flex items-center justify-center"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="relative">
            <div
              className={`absolute inset-0 bg-gradient-to-r ${stat.color} rounded-full blur-md opacity-50 
                            group-hover:opacity-100 transition-all duration-300`}
              style={{ transform: "scale(1.5)" }}
            />
            <div
              className={`relative p-3 rounded-full bg-white shadow-lg border ${stat.borderColor}`}
            >
              <Icon
                className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          className={`font-bold mb-2 ${
            stat.label === "" ? "text-lg md:text-xl" : "text-3xl md:text-4xl"
          } bg-gradient-to-r ${stat.color} bg-clip-text text-transparent tracking-tight`}
          suppressHydrationWarning
        >
          {displayValue}
        </motion.div>

        {stat.label && (
          <div className="text-gray-600 font-medium text-sm uppercase tracking-wider opacity-75 group-hover:opacity-100 transition-opacity">
            {stat.label}
          </div>
        )}

        {/* Decorative Line */}
        <motion.div
          className={`h-0.5 w-0 group-hover:w-full bg-gradient-to-r ${stat.color} mx-auto mt-3 rounded-full transition-all duration-500`}
          initial={{ width: 0 }}
          whileHover={{ width: "100%" }}
        />
      </div>
    </motion.div>
  );
}

export default function StatsSection({ stats }: StatsSectionProps) {
  const headerRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Generate particles only on client to avoid hydration mismatch
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      duration: number;
      delay: number;
    }>
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 10,
      })),
    );
  }, []);

  // If not mounted, render static version
  if (!isMounted) {
    return (
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
              Our{" "}
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
                Statistics
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Numbers that speak for themselves — built for speed, reliability,
              and scale.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className={`relative group ${stat.bgColor} backdrop-blur-sm rounded-2xl p-6 border ${stat.borderColor} 
                           shadow-xl`}
              >
                <div className="relative z-10 text-center">
                  <div className="mb-4 flex items-center justify-center">
                    <div className="relative">
                      <div
                        className={`relative p-3 rounded-full bg-white shadow-lg border ${stat.borderColor}`}
                      >
                        <stat.icon
                          className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-bold mb-2 ${
                      stat.label === ""
                        ? "text-lg md:text-xl"
                        : "text-3xl md:text-4xl"
                    } bg-gradient-to-r ${stat.color} bg-clip-text text-transparent tracking-tight`}
                  >
                    {stat.label === "Max Speed"
                      ? `${stats.speed} Mbps`
                      : stat.label === "Uptime Guarantee"
                        ? `${stats.uptime}%`
                        : stat.value}
                  </div>
                  {stat.label && (
                    <div className="text-gray-600 font-medium text-sm uppercase tracking-wider">
                      {stat.label}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Futuristic Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      {/* Animated Particles - Only render on client */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
            suppressHydrationWarning
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Modern Header with Badge */}
        <motion.div
          ref={headerRef}
          style={{
            y: headerY,
            opacity: headerOpacity,
          }}
          className="text-center mb-16"
          suppressHydrationWarning
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Our{" "}
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
              Statistics
            </span>
          </h2>

          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Numbers that speak for themselves — built for speed, reliability,
            and scale.
          </p>
        </motion.div>

        {/* Stats Grid with Modern Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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

      <style jsx>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </section>
  );
}
