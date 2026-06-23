"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight, FiArrowRight } from "react-icons/fi";

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
      mobileImage: "/SilkPortrait.png",
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
      mobileImage: "/breezePortrait.png",
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
      </div>

      {/* Navigation Arrows - Smaller on mobile */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-1.5 sm:p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
        aria-label="Previous banner"
      >
        <FiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-1.5 sm:p-2 md:p-3 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
        aria-label="Next banner"
      >
        <FiChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
      </button>

      {/* Dots Indicator with TEXT - Made bigger */}
      <div className="absolute bottom-20 sm:bottom-16 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 sm:gap-3 md:gap-4">
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
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-5 py-1 sm:py-1.5 md:py-2.5">
              {/* Dot indicator */}
              <div />
              {/* Text label - Made bigger */}
              <span
                className={`text-[10px] xs:text-xs sm:text-sm md:text-base font-medium transition-all duration-300 whitespace-nowrap ${
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

      {/* TEXT CONTENT - Smaller and higher on mobile with margins to avoid buttons */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-32 relative z-10 min-h-screen flex items-center">
        <div className="max-w-3xl mx-8 sm:mx-12 md:mx-16 lg:mx-20 xl:mx-24 mt-[-40px] sm:mt-[-60px] md:mt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Modern Title - Smaller on mobile */}
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 leading-tight text-white">
                {currentBanner.title}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">
                  {currentBanner.highlight}
                </span>
              </h1>

              {/* Modern Description - Smaller on mobile */}
              <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg mb-4 sm:mb-6 md:mb-8 text-white/90 leading-relaxed max-w-2xl font-light tracking-wide">
                {currentBanner.description}
              </p>

              {/* Modern Button Group - Smaller on mobile */}
              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
                <Link
                  href="/plans"
                  className="group relative overflow-hidden bg-white text-gray-900 px-4 sm:px-5 md:px-6 lg:px-8 py-1.5 sm:py-2.5 md:py-3 lg:py-3.5 rounded-full text-[10px] xs:text-xs sm:text-sm font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 inline-flex items-center gap-1.5 sm:gap-2 md:gap-3"
                >
                  <span className="relative z-10">Apply Now</span>
                  <FiArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform duration-300 text-[10px] xs:text-xs sm:text-sm md:text-base" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 group-hover:opacity-100 opacity-0 transition-opacity duration-300"></div>
                </Link>
                <Link
                  href="/about"
                  className="group border-2 border-white/30 backdrop-blur-sm px-4 sm:px-5 md:px-6 lg:px-8 py-1.5 sm:py-2.5 md:py-3 lg:py-3.5 rounded-full text-[10px] xs:text-xs sm:text-sm font-semibold hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-1.5 sm:gap-2 text-white hover:border-white/50"
                >
                  Learn More
                  <span className="group-hover:translate-x-1 transition-transform duration-300 text-[10px] xs:text-xs sm:text-sm">
                    →
                  </span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
