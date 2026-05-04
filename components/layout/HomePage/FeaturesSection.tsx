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
      className="group relative bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow duration-500 border border-gray-700 overflow-hidden"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
      />
      <div className="relative z-10">
        <motion.div
          className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <feature.icon className="w-8 h-8 text-white" />
        </motion.div>
        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">
          {feature.title}
        </h3>
        <p className="text-gray-300 leading-relaxed">{feature.description}</p>
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
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          ref={headerRef}
          style={{
            y: headerY,
            opacity: headerOpacity,
          }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-white">
            Quality{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Internet Service
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We provide reliable internet connection with affordable plans and
            dedicated customer support
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
