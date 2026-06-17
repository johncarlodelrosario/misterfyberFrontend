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
      <div className="relative min-h-screen bg-gray-50">
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
          {/* Light overlay for text contrast */}
          <div className="absolute inset-0 bg-white/80" />

          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 via-white/50 to-emerald-100/60" />

          {/* Smooth blur overlay at the bottom of banner */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent backdrop-blur-lg" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent backdrop-blur-md" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 via-gray-50/70 to-transparent backdrop-blur-sm" />

          {/* Content - pushed up to allow space for cards */}
          <div className="max-w-5xl mx-auto px-4 text-center relative z-10 w-full">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5"
            >
              Choose Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Internet Plan
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto"
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
                  const isPopular = plan.name === "Professional" || idx === 1;
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

        {/* Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Our{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Customers Say
                </span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Real stories from real people who love our service
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 p-6 rounded-2xl border border-gray-200 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300"
                >
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className="w-4 h-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-emerald-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-blue-50 mb-8 max-w-2xl mx-auto">
                Join thousands of satisfied customers and experience the best
                internet service today.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/apply"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-white/30 transition-all duration-300"
                >
                  Apply Now
                  <FiArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
