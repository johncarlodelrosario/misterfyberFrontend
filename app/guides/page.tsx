"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FiBookOpen,
  FiSearch,
  FiArrowRight,
  FiDownload,
  FiVideo,
  FiFileText,
  FiSettings,
  FiShield,
  FiWifi,
  FiZap,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiChevronRight,
} from "react-icons/fi";
import Link from "next/link";

const guideCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: FiZap,
    color: "from-blue-500 to-cyan-500",
    description: "Learn the basics of your internet service",
    guides: [
      {
        title: "How to Set Up Your WiFi Router",
        duration: "5 min read",
        level: "Beginner",
        type: "Guide",
      },
      {
        title: "Understanding Your Internet Plan",
        duration: "3 min read",
        level: "Beginner",
        type: "Guide",
      },
      {
        title: "First Time Connection Setup",
        duration: "10 min read",
        level: "Beginner",
        type: "Video",
      },
    ],
  },
  {
    id: "account-management",
    title: "Account Management",
    icon: FiUsers,
    color: "from-purple-500 to-pink-500",
    description: "Manage your account and billing",
    guides: [
      {
        title: "How to Pay Your Bill Online",
        duration: "4 min read",
        level: "Intermediate",
        type: "Guide",
      },
      {
        title: "Updating Your Account Information",
        duration: "3 min read",
        level: "Beginner",
        type: "Guide",
      },
      {
        title: "Understanding Your Billing Statement",
        duration: "6 min read",
        level: "Intermediate",
        type: "Guide",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: FiSettings,
    color: "from-yellow-500 to-orange-500",
    description: "Fix common issues quickly",
    guides: [
      {
        title: "Slow Internet Speed? Here's What to Do",
        duration: "7 min read",
        level: "Intermediate",
        type: "Guide",
      },
      {
        title: "How to Reset Your Router",
        duration: "2 min read",
        level: "Beginner",
        type: "Video",
      },
      {
        title: "Fixing Connection Drops",
        duration: "8 min read",
        level: "Advanced",
        type: "Guide",
      },
    ],
  },
  {
    id: "security",
    title: "Security & Privacy",
    icon: FiShield,
    color: "from-green-500 to-emerald-500",
    description: "Keep your network safe",
    guides: [
      {
        title: "How to Change Your WiFi Password",
        duration: "3 min read",
        level: "Beginner",
        type: "Guide",
      },
      {
        title: "Setting Up Guest WiFi Network",
        duration: "5 min read",
        level: "Intermediate",
        type: "Guide",
      },
      {
        title: "Parental Controls Setup Guide",
        duration: "10 min read",
        level: "Intermediate",
        type: "Video",
      },
    ],
  },
];

const featuredGuides = [
  {
    title: "Complete Fiber Internet Setup Guide",
    description: "Step-by-step guide to get your fiber internet up and running",
    duration: "15 min read",
    level: "Beginner",
    image: "/guides/fiber-setup.jpg",
  },
  {
    title: "Maximize Your WiFi Speed",
    description: "Tips and tricks to get the fastest possible internet speed",
    duration: "8 min read",
    level: "Intermediate",
    image: "/guides/wifi-speed.jpg",
  },
  {
    title: "Home Network Security Guide",
    description: "Protect your family from online threats",
    duration: "12 min read",
    level: "Advanced",
    image: "/guides/security.jpg",
  },
];

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 z-50 origin-left"
        style={{ scaleX }}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-800">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/20 rounded-full filter blur-3xl animate-pulse delay-1000" />

          <div className="container-custom text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6"
            >
              <FiBookOpen className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold uppercase text-white tracking-wider">
                User Guides
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            >
              How-to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-200">
                Guides & Tutorials
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xl text-blue-100 max-w-2xl mx-auto"
            >
              Step-by-step guides to help you get the most out of your internet
              service
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="max-w-2xl mx-auto mt-8"
            >
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for guides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 shadow-lg focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-400"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Guides */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Featured{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Guides
                </span>
              </h2>
              <p className="text-gray-500">
                Most popular guides to help you get started
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {featuredGuides.map((guide, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="h-48 bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center">
                    <FiBookOpen className="w-16 h-16 text-white/30" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {guide.level}
                      </span>
                      <span className="text-xs text-gray-400">
                        {guide.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {guide.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                      {guide.description}
                    </p>
                    <Link
                      href="#"
                      className="inline-flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all"
                    >
                      Read Guide
                      <FiArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Guide Categories */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Browse by{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Category
                </span>
              </h2>
              <p className="text-gray-500">Find guides organized by topic</p>
            </motion.div>

            <div className="space-y-8">
              {guideCategories.map((category, idx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${category.color}`}
                      >
                        <category.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {category.title}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {category.guides.map((guide, guideIdx) => (
                      <div
                        key={guideIdx}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {guide.type === "Video" ? (
                                <FiVideo className="w-4 h-4 text-red-500" />
                              ) : (
                                <FiFileText className="w-4 h-4 text-blue-500" />
                              )}
                              <span className="text-xs font-medium text-gray-500">
                                {guide.type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {guide.duration}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                {guide.level}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900">
                              {guide.title}
                            </h4>
                          </div>
                          <Link
                            href="#"
                            className="inline-flex items-center gap-1 text-blue-600 hover:gap-2 transition-all text-sm font-medium"
                          >
                            Read Guide
                            <FiChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Tips */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Quick{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Tips
                </span>
              </h2>
              <p className="text-gray-500">
                Helpful tips to improve your internet experience
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  icon: FiWifi,
                  title: "Router Placement",
                  tip: "Place router in central location for best coverage",
                },
                {
                  icon: FiZap,
                  title: "Speed Test",
                  tip: "Test your speed regularly to ensure you're getting what you pay for",
                },
                {
                  icon: FiShield,
                  title: "Update Password",
                  tip: "Change your WiFi password every 3 months for security",
                },
                {
                  icon: FiClock,
                  title: "Restart Router",
                  tip: "Restart your router monthly to maintain optimal performance",
                },
              ].map((tip, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                >
                  <div className="inline-flex p-3 rounded-xl bg-blue-100 mb-4">
                    <tip.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-gray-500">{tip.tip}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
