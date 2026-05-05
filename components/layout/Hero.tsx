"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface HeroProps {
  stats: {
    users: number;
    speed: number;
    uptime: number;
  };
}

interface Banner {
  id: number;
  title: string;
  highlight: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  desktopImage: string;
  mobileImage: string;
  dotLabel: string;
}

export default function Hero({ stats }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const banners: Banner[] = [
    {
      id: 1,
      title: "Premium · Silk Residences",
      highlight: "Seamless Connectivity at Silk Residence",
      description:
        "Premium fiber internet woven into every corner of Silk Residence. Stream, work, and play without interruption.",
      ctaText: "View Plans",
      ctaLink: "/plans",
      desktopImage: "/homeBanner/SilkResidences.png",
      mobileImage: "/homeBanner/SilkResidences.png",
      dotLabel: "Silk Residences",
    },
    {
      id: 2,
      title: "Lightning Fast Internet at",
      highlight: "Fountain Breeze",
      description:
        "Experience fiber-optic speeds in your Fountain Breeze residence. Stay connected with ultra-low latency and unmatched reliability.",
      ctaText: "View Plans",
      ctaLink: "/plans",
      desktopImage: "/homeBanner/FountainBreeze.png",
      mobileImage: "/homeBanner/FountainBreeze.png",
      dotLabel: "Fountain Breeze",
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + banners.length) % banners.length,
    );
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const currentBanner = banners[currentIndex];

  return (
    <section className="relative overflow-hidden min-h-screen">
      {/* DESKTOP BACKGROUND - WITH FIXED ATTACHMENT */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat hidden md:block"
        style={{
          backgroundImage: `url('${currentBanner.desktopImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        {/* Bottom gradient dim to #080616 */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#080616] via-[#080616]/80 to-transparent"></div>
      </div>

      {/* MOBILE BACKGROUND - WITH FIXED ATTACHMENT */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat md:hidden"
        style={{
          backgroundImage: `url('${currentBanner.mobileImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        {/* Bottom gradient dim to #080616 for mobile */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#080616] via-[#080616]/80 to-transparent"></div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
        aria-label="Previous banner"
      >
        <FiChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
        aria-label="Next banner"
      >
        <FiChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Dots Indicator na may TEXT sa mismong button */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 md:gap-3">
        {banners.map((banner, index) => (
          <motion.button
            key={index}
            onClick={() => goToSlide(index)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`transition-all duration-300 rounded-full overflow-hidden ${
              currentIndex === index
                ? "bg-white/20 backdrop-blur-md border border-white/30"
                : "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20"
            }`}
            aria-label={`Go to slide ${banner.dotLabel}`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 px-1 md:px-3 py-1 md:py-1.5">
              {/* Dot indicator */}
              <div />
              {/* Text label */}
              <span
                className={`text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  currentIndex === index
                    ? "text-white opacity-100"
                    : "text-white/70 hover:text-white/90"
                }`}
              >
                {banner.dotLabel}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* TEXT CONTENT ONLY - with animation */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative z-10 min-h-screen flex items-center">
        <div className="max-w-3xl ml-8 md:ml-16 lg:ml-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 mb-5 border border-white/20">
                <span className="text-white text-xs font-medium">
                  Trusted Fiber Provider
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-white">
                {currentBanner.title}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  {currentBanner.highlight}
                </span>
              </h1>

              <p className="text-sm md:text-base lg:text-lg mb-6 text-white/90 leading-relaxed max-w-2xl">
                {currentBanner.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/plans"
                  className="group border-2 border-white/30 backdrop-blur-sm px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center gap-2 text-white"
                >
                  Apply Now
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
