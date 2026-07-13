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

      // Filter out "Fiber Plan 999" - check multiple variations
      const filteredPlans = plansData.filter((plan: Plan) => {
        const isActive = plan.isActive !== false;
        const isNotFiber999 =
          plan.name !== "Fiber Plan 999" &&
          plan.name !== "Essential" &&
          plan.name !== "Fiber 999" &&
          !plan.name.includes("999") &&
          plan.price !== 999;
        return isActive && isNotFiber999;
      });

      console.log("Filtered plans:", filteredPlans); // For debugging
      setPlans(filteredPlans);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Unable to load plans. Please try again later.");
      setPlans([
        {
          _id: "2",
          name: "Fiber Plan 100",
          description: "Budget-friendly plan",
          price: 1399,
          speed: { download: 100, upload: 100 },
          features: ["100 Mbps Speed", "Standard WiFi Router", "Email Support"],
          duration: 30,
          mikrotikProfile: "standard",
          isActive: true,
        },
        {
          _id: "3",
          name: "Fiber Plan 150",
          description:
            "Perfect for families, 150Mbps unlimited fiber connection",
          price: 1699,
          speed: { download: 150, upload: 150 },
          features: [
            "150 Mbps Speed",
            "Unlimited Internet",
            "Free WiFi Router",
            "24/7 Technical Support",
            "No Data Cap",
          ],
          duration: 30,
          mikrotikProfile: "premium",
          isActive: true,
        },
        {
          _id: "4",
          name: "Fiber Plan 200",
          description: "For heavy users, 200Mbps unlimited fiber",
          price: 1899,
          speed: { download: 200, upload: 200 },
          features: [
            "200 Mbps Speed",
            "Unlimited Internet",
            "Free Mesh WiFi",
            "Priority Support",
            "Static IP Included",
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
      bg: "bg-blue-50",
      textColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      icon: FiShield,
      title: "Secure Connection",
      description: "Enterprise-grade security to protect your data",
      gradient: "from-purple-500 to-pink-500",
      bg: "bg-purple-50",
      textColor: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      icon: FiZap,
      title: "99.9% Uptime",
      description: "Reliable connection you can count on",
      gradient: "from-yellow-500 to-orange-500",
      bg: "bg-yellow-50",
      textColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
    },
    {
      icon: FiUsers,
      title: "24/7 Support",
      description: "Dedicated team ready to assist you",
      gradient: "from-green-500 to-emerald-500",
      bg: "bg-green-50",
      textColor: "text-green-600",
      iconBg: "bg-green-100",
    },
  ];

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 z-50 origin-left"
        style={{ scaleX }}
      />
      <div className="relative min-h-screen bg-gray-50">
        {/* Header - positioned absolutely to overlay on banner */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>

        {/* Full Width Hero Section with Image Background - IMAGE VISIBLE ONLY */}
        <section
          className="relative w-full min-h-[650px] md:min-h-[700px] flex items-start pt-32 md:pt-36 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/planPageImage/fam.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        >
          {/* NO OVERLAY - Image is fully visible with all its details */}
          {/* Gradient overlay removed for full image visibility */}

          {/* Minimal blur at bottom for text readability if needed - keeping it minimal */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50/40 via-gray-50/20 to-transparent" />

          {/* Content - positioned to not interfere with the image */}
          <div className="max-w-5xl mx-auto px-4 text-center relative z-10 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg mb-5"
            >
              Choose Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                Internet Plan
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-base md:text-lg text-white drop-shadow-lg max-w-2xl mx-auto"
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
              <div className="flex flex-col items-center justify-center py-20 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiLoader className="w-12 h-12 text-blue-600" />
                </motion.div>
                <p className="mt-4 text-gray-600">Loading our plans...</p>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-20 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700 text-lg mb-4">{error}</p>
                <button
                  onClick={fetchPlans}
                  className="mt-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan, idx) => {
                  const isPopular = plan.name === "Fiber Plan 150" || idx === 1;
                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      whileHover={{ y: -8 }}
                      className={`relative bg-white rounded-2xl transition-all duration-300 shadow-lg ${
                        isPopular
                          ? "border-2 border-blue-600 shadow-xl shadow-blue-200"
                          : "border border-gray-200 hover:shadow-xl hover:shadow-blue-100"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
                            <FiStar className="w-3 h-3" />
                            Most Popular
                          </div>
                        </div>
                      )}
                      <div className="p-7">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-5">
                          {plan.description}
                        </p>
                        <div className="mb-5">
                          <span className="text-4xl font-bold text-gray-900">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">
                            /month
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-blue-100">
                          <div className="flex justify-between items-center">
                            <div className="text-center flex-1">
                              <p className="text-xs text-gray-500 mb-1">
                                Download
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {plan.speed.download}{" "}
                                <span className="text-sm font-normal text-gray-500">
                                  Mbps
                                </span>
                              </p>
                            </div>
                            <div className="w-px h-10 bg-gray-200" />
                            <div className="text-center flex-1">
                              <p className="text-xs text-gray-500 mb-1">
                                Upload
                              </p>
                              <p className="text-lg font-bold text-gray-900">
                                {plan.speed.upload}{" "}
                                <span className="text-sm font-normal text-gray-500">
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
                              className="flex items-start gap-2.5 text-sm text-gray-700"
                            >
                              <FiCheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
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
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-300 hover:opacity-90"
                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200"
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
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Us?
                </span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
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
                  className={`text-center p-6 rounded-2xl ${feature.bg} border border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300`}
                >
                  <div
                    className={`inline-flex p-3 rounded-xl ${feature.iconBg} mb-4`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.textColor}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
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
