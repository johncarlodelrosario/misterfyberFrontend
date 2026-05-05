"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import {
  FiAward,
  FiUsers,
  FiGlobe,
  FiHeart,
  FiCheckCircle,
  FiZap,
  FiDollarSign,
  FiHeadphones,
  FiHome,
  FiCpu,
} from "react-icons/fi";

const values = [
  {
    icon: FiAward,
    title: "Excellence",
    description:
      "We strive for excellence in delivering fast, stable, and reliable internet services.",
  },
  {
    icon: FiUsers,
    title: "Customer First",
    description:
      "Our customers are at the heart of everything we do. We prioritize satisfaction and support.",
  },
  {
    icon: FiGlobe,
    title: "Innovation",
    description:
      "We continuously improve our technology to provide the best connectivity experience.",
  },
  {
    icon: FiHeart,
    title: "Integrity",
    description:
      "We operate with honesty, transparency, and commitment in every service we provide.",
  },
];

export default function AboutPage() {
  const [particles, setParticles] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Set window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Generate particles
    const newParticles = Array(20)
      .fill(0)
      .map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      }));
    setParticles(newParticles);

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Header />
      <main className="bg-[#080616] overflow-hidden">
        {/* Hero Section - Who We Are with Background Image */}
        <section
          className="relative text-white min-h-[500px] sm:min-h-[600px] md:min-h-[700px] flex items-center bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/aboutBanner.png')",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Animated background particles */}
          {windowSize.width > 0 && (
            <div className="absolute inset-0 overflow-hidden">
              {particles.map((particle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
                  initial={{
                    x: particle.x,
                    y: particle.y,
                  }}
                  animate={{
                    x: [
                      particle.x,
                      Math.random() * windowSize.width,
                      Math.random() * windowSize.width,
                      particle.x,
                    ],
                    y: [
                      particle.y,
                      Math.random() * windowSize.height,
                      Math.random() * windowSize.height,
                      particle.y,
                    ],
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
          )}

          <div className="container-custom max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div
              className="max-w-2xl"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                About Us
              </motion.h1>
              <div className="space-y-4 sm:space-y-5">
                <motion.p
                  className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-normal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  Misterfyber is a fast-growing internet service provider
                  powered by Fyberblizz Network Corporation. We are committed to
                  delivering reliable, high-speed, and stable internet
                  connectivity for homes and businesses.
                </motion.p>
                <motion.p
                  className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-normal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  We recognized that many residents in condominiums and
                  communities struggle with slow and inconsistent internet
                  service. In today's digital world, a strong connection is
                  essential for work, education, communication, and
                  entertainment.
                </motion.p>
                <motion.p
                  className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-normal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  Through Misterfyber, we provide dependable internet solutions
                  designed to make daily life easier.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#080616]">
          <div className="container-custom max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-6 sm:gap-8">
            <motion.div
              className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 md:p-10 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-5"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-blue-400 text-lg sm:text-xl font-bold">
                  🎯
                </span>
              </motion.div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Our Mission
              </h3>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                To provide reliable, affordable, and high-speed internet
                services that improve the quality of life of every customer.
              </p>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 md:p-10 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <motion.div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-5"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-blue-400 text-lg sm:text-xl font-bold">
                  👁️
                </span>
              </motion.div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Our Vision
              </h3>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                To become one of the most trusted internet service providers,
                known for innovation, customer satisfaction, and excellent
                connectivity solutions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#080616]">
          <div className="container-custom max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              className="text-center mb-10 sm:mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="inline-block bg-blue-500/20 text-blue-300 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold mb-4">
                Why Us
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">
                Why Choose Misterfyber?
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-2">
                Built to deliver speed, reliability, and value for every
                Filipino home and business.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  icon: FiZap,
                  title: "Fast & Stable",
                  desc: "Lightning-fast fiber connection with consistent performance.",
                },
                {
                  icon: FiDollarSign,
                  title: "Affordable Plans",
                  desc: "Budget-friendly packages for any need.",
                },
                {
                  icon: FiHeadphones,
                  title: "Responsive Support",
                  desc: "24/7 customer service you can count on.",
                },
                {
                  icon: FiHome,
                  title: "WFH Ready",
                  desc: "Reliable for work-from-home and online classes.",
                },
                {
                  icon: FiCpu,
                  title: "Custom Solutions",
                  desc: "Tailored for condominiums and communities.",
                },
                {
                  icon: FiCheckCircle,
                  title: "No Hidden Fees",
                  desc: "Transparent pricing with no surprises.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm p-5 sm:p-6 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:bg-white/10 transition-all duration-300"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <item.icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-3 sm:mb-4" />
                  </motion.div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#080616]">
          <div className="container-custom max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              className="text-center mb-10 sm:mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="inline-block bg-blue-500/20 text-blue-300 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold mb-4">
                Core Values
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                Our Values
              </h2>
              <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-2">
                The principles that guide everything we do at Misterfyber.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:bg-white/10 transition-all duration-300"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <motion.div
                    className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <value.icon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                  </motion.div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Commitment Statement */}
        <section className="py-12 sm:py-16 md:py-20 bg-[#080616]">
          <div className="container-custom max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="w-16 h-1 bg-blue-500 mx-auto mb-6 sm:mb-8 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                whileHover={{ width: 100 }}
                transition={{ duration: 0.3 }}
              />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
                Our Commitment
              </h2>
              <p className="text-gray-300 text-base sm:text-lg md:text-xl leading-relaxed px-2">
                At Misterfyber, powered by Fyberblizz Network Corporation, we
                are committed to connecting people to opportunities through
                better internet service. We believe every home and business
                deserves a connection they can rely on—one that empowers
                productivity, growth, and everyday life.
              </p>
            </motion.div>
          </div>
        </section>

        {/* CTA - with aboutFam.png as background */}
        <section
          className="relative text-white py-16 sm:py-20 md:py-24 lg:py-32 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/aboutFam.png')",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />

          <div className="container-custom max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.h2
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
                whileHover={{ scale: 1.05 }}
              >
                Ready to join our family?
              </motion.h2>
              <motion.p
                className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-100"
                whileHover={{ scale: 1.02 }}
              >
                Experience the difference with Misterfyber
              </motion.p>
              <motion.button
                className="bg-white text-blue-700 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl text-sm sm:text-base cursor-pointer"
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
                }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Today
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
