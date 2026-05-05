"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/layout/Hero";
import {
  StatsSection,
  FeaturesSection,
  PlansSection,
  JoinFamilySection,
} from "./index"; // or from "." since it's in the same folder

export default function HomePageWrapper() {
  const [stats, setStats] = useState({ users: 0, speed: 0, uptime: 0 });
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    setStats({ users: 128, speed: 200, uptime: 99.5 });
  }, []);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 z-50 origin-left"
        style={{ scaleX }}
      />
      <Header />
      <main className="overflow-hidden">
        <Hero stats={stats} />
        <PlansSection />
        <FeaturesSection />
        <StatsSection stats={stats} />
        <JoinFamilySection />
      </main>
      <Footer />
    </>
  );
}
