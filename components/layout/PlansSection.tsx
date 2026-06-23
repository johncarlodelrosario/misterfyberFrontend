"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FiWifi,
  FiShield,
  FiZap,
  FiUsers,
  FiAward,
  FiHeadphones,
  FiCpu,
  FiClock,
  FiGlobe,
  FiStar,
  FiThumbsUp,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";

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
  const [stats, setStats] = useState({ users: 0, speed: 0, uptime: 0 });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    setStats({ users: 128, speed: 200, uptime: 99.5 });
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/plans`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let plansData = [];
      if (data.data && Array.isArray(data.data)) {
        plansData = data.data;
      } else if (Array.isArray(data)) {
        plansData = data;
      } else if (data.plans && Array.isArray(data.plans)) {
        plansData = data.plans;
      } else {
        plansData = [];
      }

      const activePlans = plansData.filter(
        (plan: Plan) => plan.isActive !== false,
      );
      setPlans(activePlans);

      if (activePlans.length === 0) {
        setError("No active plans available at the moment.");
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Unable to load plans. Please try again later.");
      setPlans([
        {
          _id: "1",
          name: "Essential",
          description: "Perfect for light browsing and daily use",
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
          description: "Great for families, streaming & work from home",
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
            "Advanced Security Suite",
            "24/7 Premium Support",
            "Free Installation",
            "Free Mesh Router",
            "Static IP Address",
          ],
          duration: 30,
          mikrotikProfile: "premium",
          isActive: true,
        },
        {
          _id: "4",
          name: "Business",
          description: "For growing businesses with multiple users",
          price: 2999,
          speed: { download: 500, upload: 250 },
          features: [
            "500 Mbps Speed",
            "Unlimited Data",
            "Business Security Suite",
            "24/7 Priority Support",
            "Free Installation",
            "Free Mesh Router",
            "Static IP Address",
            "Dedicated Account Manager",
          ],
          duration: 30,
          mikrotikProfile: "business",
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

  const getPlanCardStyle = (index: number, isPopular: boolean) => {
    if (isPopular) {
      return "border-accent-400 shadow-xl shadow-accent-500/10";
    }
    const styles = [
      "border-blue-100 shadow-md hover:border-blue-200",
      "border-purple-100 shadow-md hover:border-purple-200",
      "border-emerald-100 shadow-md hover:border-emerald-200",
      "border-amber-100 shadow-md hover:border-amber-200",
    ];
    return styles[index % styles.length];
  };

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 z-50 origin-left"
        style={{ scaleX }}
      />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
        {/* Hero Section - Plans Header */}
        <section className="relative pt-20 pb-8 md:pt-32 md:pb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-50/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 right-10 w-48 h-48 md:w-64 md:h-64 bg-accent-100 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-10 left-10 w-48 h-48 md:w-64 md:h-64 bg-primary-100 rounded-full blur-3xl opacity-30" />

          <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 mb-4 shadow-sm border border-gray-100"
            >
              <FiZap className="w-3 h-3 text-accent-500" />
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-600">
                Flexible Plans
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-2xl md:text-4xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-2 md:mb-4"
            >
              Choose Your{" "}
              <span className="bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
                Internet Plan
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-sm md:text-lg text-gray-500 max-w-2xl mx-auto px-2"
            >
              Select the perfect plan that fits your lifestyle. No hidden fees,
              no surprises.
            </motion.p>
          </div>
        </section>

        {/* Plans Grid Section */}
        <section className="relative pb-16 md:pb-32">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
            {/* Loading State */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 md:py-20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <FiLoader className="w-8 h-8 md:w-10 md:h-10 text-accent-500" />
                </motion.div>
                <p className="mt-3 text-sm md:text-base text-gray-500">
                  Loading our plans...
                </p>
              </motion.div>
            )}

            {/* Error State */}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 md:py-20 text-center"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-50 flex items-center justify-center mb-3 md:mb-4">
                  <FiAlertCircle className="w-7 h-7 md:w-8 md:h-8 text-red-400" />
                </div>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 px-4">
                  {error}
                </p>
                <button
                  onClick={fetchPlans}
                  className="px-5 py-2 md:px-6 md:py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 text-sm md:text-base"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Plans Grid - 2 columns on mobile (2 rows = 4 cards), 3 on desktop */}
            {!loading && !error && plans.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6"
              >
                {plans.slice(0, 4).map((plan, index) => {
                  const isPopular = plan.name === "Professional" || index === 1;
                  const cardStyle = getPlanCardStyle(index, isPopular);

                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={{ y: -2 }}
                      className={`relative bg-white rounded-xl md:rounded-2xl transition-all duration-300 border ${cardStyle} overflow-hidden`}
                    >
                      {/* Popular Badge - Adjusted for mobile */}
                      {isPopular && (
                        <div className="absolute top-0 right-0">
                          <div className="bg-gradient-to-r from-accent-500 to-accent-600 text-white text-[8px] md:text-xs font-semibold px-2 py-0.5 md:px-4 md:py-1.5 rounded-bl-lg md:rounded-bl-xl shadow-md">
                            Most Popular
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 sm:p-3 md:p-5 lg:p-7">
                        {/* Plan Name - Smaller on mobile */}
                        <div className="mb-1.5 md:mb-4">
                          <h3 className="text-xs sm:text-sm md:text-xl font-bold text-gray-900 mb-0.5 md:mb-1">
                            {plan.name}
                          </h3>
                          <p className="text-[8px] sm:text-[10px] md:text-sm text-gray-500 line-clamp-1 md:line-clamp-2">
                            {plan.description}
                          </p>
                        </div>

                        {/* Price - Smaller on mobile */}
                        <div className="mb-1.5 md:mb-5">
                          <span className="text-sm sm:text-base md:text-3xl lg:text-4xl font-bold text-gray-900">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-[8px] sm:text-[10px] md:text-sm text-gray-500 ml-0.5 md:ml-1">
                            /mo
                          </span>
                        </div>

                        {/* Speed Card - Compact on mobile */}
                        <div className="bg-gray-50 rounded-lg p-1 sm:p-1.5 md:p-3 mb-1.5 md:mb-5">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 text-center">
                              <p className="text-[6px] sm:text-[8px] md:text-xs text-gray-500">
                                Download
                              </p>
                              <p className="text-[10px] sm:text-xs md:text-base font-semibold text-gray-900">
                                {plan.speed.download}
                              </p>
                            </div>
                            <div className="w-px h-4 sm:h-6 md:h-8 bg-gray-200" />
                            <div className="flex-1 text-center">
                              <p className="text-[6px] sm:text-[8px] md:text-xs text-gray-500">
                                Upload
                              </p>
                              <p className="text-[10px] sm:text-xs md:text-base font-semibold text-gray-900">
                                {plan.speed.upload}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Features - Simplified on mobile */}
                        <ul className="space-y-0.5 sm:space-y-1 md:space-y-2.5 mb-1.5 md:mb-6">
                          {plan.features.slice(0, 2).map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-0.5 sm:gap-1 md:gap-2"
                            >
                              <FiCheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-4 md:h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                              <span className="text-[7px] sm:text-[9px] md:text-sm text-gray-600 line-clamp-1">
                                {feature}
                              </span>
                            </li>
                          ))}
                          {plan.features.length > 2 && (
                            <li className="text-[6px] sm:text-[8px] md:text-xs text-gray-400 ml-2 sm:ml-3 md:ml-6">
                              +{plan.features.length - 2} more
                            </li>
                          )}
                        </ul>

                        {/* CTA Button - Smaller on mobile */}
                        <Link
                          href={`/apply?plan=${plan._id}`}
                          className={`flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 w-full py-1 sm:py-1.5 md:py-2.5 rounded-lg md:rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-xs md:text-base ${
                            isPopular
                              ? "bg-gradient-to-r from-primary-700 to-accent-600 text-white hover:shadow-md hover:opacity-90"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                        >
                          <span>Get Started</span>
                          <FiArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Show remaining plans on desktop (if more than 4) */}
            {!loading && !error && plans.length > 4 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="hidden lg:grid grid-cols-3 gap-6 mt-6"
              >
                {plans.slice(4).map((plan, index) => {
                  const isPopular = false;
                  const cardStyle = getPlanCardStyle(index + 4, isPopular);

                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + 4) * 0.1, duration: 0.5 }}
                      whileHover={{ y: -2 }}
                      className={`relative bg-white rounded-2xl transition-all duration-300 border ${cardStyle} overflow-hidden`}
                    >
                      <div className="p-5 lg:p-7">
                        <div className="mb-4">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {plan.description}
                          </p>
                        </div>

                        <div className="mb-5">
                          <span className="text-3xl lg:text-4xl font-bold text-gray-900">
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            /mo
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 mb-5">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 text-center">
                              <p className="text-xs text-gray-500">Download</p>
                              <p className="font-semibold text-gray-900">
                                {plan.speed.download} Mbps
                              </p>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div className="flex-1 text-center">
                              <p className="text-xs text-gray-500">Upload</p>
                              <p className="font-semibold text-gray-900">
                                {plan.speed.upload} Mbps
                              </p>
                            </div>
                          </div>
                        </div>

                        <ul className="space-y-2.5 mb-6">
                          {plan.features.slice(0, 4).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <FiCheckCircle className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {feature}
                              </span>
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-xs text-gray-400 ml-6">
                              +{plan.features.length - 4} more features
                            </li>
                          )}
                        </ul>

                        <Link
                          href={`/apply?plan=${plan._id}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium transition-all duration-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                        >
                          <span>Get Started</span>
                          <FiArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* No Plans Message */}
            {!loading && !error && plans.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 md:py-20"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <FiWifi className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
                </div>
                <p className="text-sm md:text-base text-gray-500">
                  No plans available at the moment.
                </p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">
                  Please check back later.
                </p>
              </motion.div>
            )}

            {/* Custom Plan Note */}
            {!loading && !error && plans.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center mt-6 md:mt-10 pt-4 border-t border-gray-100"
              >
                <p className="text-xs sm:text-sm md:text-base text-gray-500">
                  Need a custom plan for your business?{" "}
                  <Link
                    href="/contact"
                    className="text-accent-600 font-medium hover:underline"
                  >
                    Contact our sales team
                  </Link>
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Banner - Responsive */}
        <section className="relative py-10 md:py-16">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-800 to-accent-900" />
          <div className="absolute inset-0 bg-black/20" />

          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 md:px-4 md:py-1.5 mb-3 md:mb-5">
                <FiAward className="w-3 h-3 md:w-3.5 md:h-3.5 text-accent-300" />
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-white">
                  Limited Offer
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 px-2">
                Ready to Upgrade Your Internet?
              </h2>

              <p className="text-primary-100 text-sm sm:text-base max-w-md mx-auto mb-4 md:mb-6 px-2">
                Get up to 3 months free when you sign up for any annual plan
              </p>

              <Link
                href="/apply"
                className="inline-flex items-center gap-2 bg-white text-primary-700 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:shadow-lg group text-sm sm:text-base"
              >
                <span>Apply Now</span>
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}
