"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FiWifi,
  FiShield,
  FiZap,
  FiUsers,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
  FiArrowRight,
  FiAward,
  FiTrendingUp,
  FiClock,
  FiStar,
  FiThumbsUp,
} from "react-icons/fi";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  speed: {
    download: number;
    upload: number;
  };
  features: string[];
  duration: number;
  mikrotikProfile: string;
  isActive: boolean;
}

export default function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const ctaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Track mouse position for liquid glass effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ctaRef.current) {
        const rect = ctaRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/plans`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let plansData = [];
      if (data.data && Array.isArray(data.data)) plansData = data.data;
      else if (Array.isArray(data)) plansData = data;
      else if (data.plans && Array.isArray(data.plans)) plansData = data.plans;
      else plansData = [];

      const activePlans = plansData.filter(
        (plan: Plan) => plan.isActive !== false,
      );
      setPlans(activePlans);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Unable to load plans. Please try again later.");
      setPlans([
        {
          _id: "1",
          name: "Essential",
          description: "Perfect for light browsing & daily tasks",
          price: 999,
          speed: { download: 50, upload: 25 },
          features: [
            "50 Mbps Speed",
            "Unlimited Data",
            "Basic Security",
            "12/7 Support",
          ],
          duration: 30,
          mikrotikProfile: "basic",
          isActive: true,
        },
        {
          _id: "2",
          name: "Professional",
          description: "Great for families & work from home",
          price: 1499,
          speed: { download: 150, upload: 75 },
          features: [
            "150 Mbps Speed",
            "Unlimited Data",
            "Enhanced Security",
            "Priority Support",
            "Free Installation",
            "Free WiFi Router",
          ],
          duration: 30,
          mikrotikProfile: "standard",
          isActive: true,
        },
        {
          _id: "3",
          name: "Ultimate",
          description: "For heavy users, gamers & businesses",
          price: 1999,
          speed: { download: 300, upload: 150 },
          features: [
            "300 Mbps Speed",
            "Unlimited Data",
            "Advanced Security",
            "24/7 Premium Support",
            "Free Installation",
            "Free Mesh Router",
          ],
          duration: 30,
          mikrotikProfile: "premium",
          isActive: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Features highlight section data
  const features = [
    {
      icon: FiWifi,
      title: "Fiber Optic Technology",
      description: "Lightning-fast fiber connection with low latency",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: FiShield,
      title: "Secure Connection",
      description: "Enterprise-grade security to protect your data",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: FiZap,
      title: "99.9% Uptime",
      description: "Reliable connection you can count on",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: FiUsers,
      title: "24/7 Support",
      description: "Dedicated team ready to assist you",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  // Testimonials data
  const testimonials = [
    {
      name: "Maria Santos",
      role: "Business Owner",
      content:
        "The Professional plan is perfect for my small business. No downtime and speed is consistent!",
      rating: 5,
    },
    {
      name: "John Dela Cruz",
      role: "Gamer",
      content:
        "Ultimate plan gives me low ping in games. Best ISP I've tried so far!",
      rating: 5,
    },
    {
      name: "Sarah Reyes",
      role: "Remote Worker",
      content:
        "Reliable connection for video calls. Customer support is very responsive.",
      rating: 5,
    },
  ];

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 z-50 origin-left"
        style={{ scaleX }}
      />
      <div className="relative min-h-screen bg-gray-900">
        {/* Header - positioned absolutely to overlay on banner */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>

        {/* Full Width Hero Section with Image Background */}
        <section
          className="relative w-full min-h-[650px] md:min-h-[700px] flex items-start pt-32 md:pt-36 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/planPageImage/fam.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        >
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-black/30 to-emerald-900/40" />

          {/* Smooth blur overlay at the bottom of banner - multiple layers for smoother transition */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent backdrop-blur-lg" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent backdrop-blur-md" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent backdrop-blur-sm" />

          {/* Content - pushed up to allow space for cards */}
          <div className="max-w-5xl mx-auto px-4 text-center relative z-10 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5"
            >
              Choose Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Internet Plan
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto"
            >
              Select the perfect plan that fits your lifestyle. No hidden fees,
              no contracts, just pure internet bliss.
            </motion.p>
          </div>
        </section>

        {/* Plans Section - Overlapping the banner with increased overlap */}
        <section className="relative z-10 px-4 pb-20 -mt-48 md:-mt-56">
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiLoader className="w-12 h-12 text-emerald-500" />
                </motion.div>
                <p className="mt-4 text-gray-400">Loading our plans...</p>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-20 bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700">
                <FiAlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-4">{error}</p>
                <button
                  onClick={fetchPlans}
                  className="mt-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan, idx) => {
                  const isPopular = plan.name === "Professional" || idx === 1;
                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      whileHover={{ y: -8 }}
                      className={`relative bg-gray-800 rounded-2xl transition-all duration-300 ${
                        isPopular
                          ? "border-2 border-emerald-500 shadow-xl shadow-emerald-500/20"
                          : "border border-gray-700 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
                            <FiStar className="w-3 h-3" />
                            Most Popular
                          </div>
                        </div>
                      )}
                      <div className="p-7">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-5">
                          {plan.description}
                        </p>
                        <div className="mb-5">
                          <span className="text-4xl font-bold text-white">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-gray-400 text-sm ml-1">
                            /month
                          </span>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-700">
                          <div className="flex justify-between items-center">
                            <div className="text-center flex-1">
                              <p className="text-xs text-gray-400 mb-1">
                                Download
                              </p>
                              <p className="text-lg font-bold text-white">
                                {plan.speed.download}{" "}
                                <span className="text-sm font-normal text-gray-400">
                                  Mbps
                                </span>
                              </p>
                            </div>
                            <div className="w-px h-10 bg-gray-700" />
                            <div className="text-center flex-1">
                              <p className="text-xs text-gray-400 mb-1">
                                Upload
                              </p>
                              <p className="text-lg font-bold text-white">
                                {plan.speed.upload}{" "}
                                <span className="text-sm font-normal text-gray-400">
                                  Mbps
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <ul className="space-y-3 mb-8">
                          {plan.features.slice(0, 5).map((feature, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 + i * 0.05 }}
                              className="flex items-start gap-2.5 text-sm text-gray-300"
                            >
                              <FiCheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </motion.li>
                          ))}
                        </ul>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            href={`/apply?plan=${plan._id}`}
                            className={`block text-center py-3 rounded-xl font-semibold transition-all duration-300 ${
                              isPopular
                                ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-lg hover:opacity-90"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                            }`}
                          >
                            Get Started
                            <FiArrowRight className="inline ml-2 w-4 h-4" />
                          </Link>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Features Highlight Section */}
        <section className="py-20 bg-gray-900">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Why Choose{" "}
                <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  Us?
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Experience the difference with our premium fiber internet
                service
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="text-center p-6 rounded-2xl bg-gray-800 border border-gray-700 hover:shadow-lg transition-all duration-300"
                >
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
