// app/components/FeaturesSection.tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { FiWifi, FiShield, FiZap, FiUsers } from "react-icons/fi";

const features = [
  {
    icon: FiWifi,
    title: "Fiber Optic Technology",
    description:
      "High-speed fiber optic connection for smooth browsing and streaming with low latency",
    gradient: "from-blue-600 to-cyan-500",
    direction: "left",
  },
  {
    icon: FiShield,
    title: "Secure Connection",
    description:
      "Basic security features to protect your online activities and keep your data safe",
    gradient: "from-purple-600 to-pink-500",
    direction: "right",
  },
  {
    icon: FiZap,
    title: "99.5% Uptime Guarantee",
    description:
      "Reliable connection with minimal downtime for uninterrupted browsing experience",
    gradient: "from-amber-500 to-orange-500",
    direction: "left",
  },
  {
    icon: FiUsers,
    title: "Friendly Support",
    description:
      "Dedicated customer support team ready to assist you with your concerns",
    gradient: "from-emerald-500 to-teal-500",
    direction: "right",
  },
];

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const isLeft = feature.direction === "left";

  const x = useTransform(
    scrollYProgress,
    [0, 0.15, 0.4, 0.7],
    isLeft ? [-120, -40, 0, 0] : [120, 40, 0, 0],
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
    isLeft ? [-4, -1, 0, 0] : [4, 1, 0, 0],
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
      whileHover={{
        y: -10,
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      className="group relative bg-white rounded-2xl p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200 hover:border-blue-500/60 overflow-hidden"
    >
      {/* Blue glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />

      <div
        className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
      />
      <div className="relative z-10">
        <motion.div
          className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-3 md:mb-6 shadow-lg`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </motion.div>
        <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-gray-900 group-hover:text-cyan-600 transition-colors">
          {feature.title}
        </h3>
        <p className="text-xs md:text-base text-gray-600 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const headerRef = useRef(null);

  const { scrollYProgress: headerScroll } = useScroll({
    target: headerRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(
    headerScroll,
    [0, 0.1, 0.4, 0.7],
    [40, 0, 0, -5],
  );
  const headerOpacity = useTransform(
    headerScroll,
    [0, 0.08, 0.3, 0.6],
    [0, 0.6, 1, 1],
  );

  return (
    <section
      className="py-12 md:py-24 relative overflow-hidden"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          ref={headerRef}
          style={{
            y: headerY,
            opacity: headerOpacity,
          }}
          className="text-center mb-8 md:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-gray-900">
            Quality{" "}
            <span className="bg-black bg-clip-text text-transparent">
              Internet Service
            </span>
          </h2>
          <p className="text-sm md:text-base lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            We provide reliable internet connection with affordable plans and
            dedicated customer support
          </p>
        </motion.div>

        {/* 4 cards visible on mobile - grid with wrap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
