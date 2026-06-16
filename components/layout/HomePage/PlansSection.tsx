// app/components/PlansSection.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
  FiArrowRight,
  FiStar,
  FiWifi,
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiZap,
} from "react-icons/fi";
import { getPlans, Plan } from "@/services/plan";

export default function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPlans();
      const activePlans = data.filter((plan: Plan) => plan.isActive !== false);
      setPlans(activePlans.slice(0, 3));
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Unable to load plans. Please try again later.");
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

  if (loading) {
    return (
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20 md:py-28 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-100">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <FiLoader className="w-14 h-14 md:w-20 md:h-20 text-blue-600" />
            </motion.div>
            <p className="mt-6 text-slate-500 text-sm md:text-base font-medium">
              Loading our plans...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20 md:py-28 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-100">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <FiAlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500" />
            </div>
            <p className="text-slate-600 text-base md:text-lg mb-6 px-4 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={fetchPlans}
              className="px-8 md:px-10 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-50/20 to-purple-50/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-200/50 to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-14 md:mb-20"
        >
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100/50 text-blue-600 px-5 py-2.5 rounded-full mb-5 shadow-sm">
            <FiZap className="w-4 h-4" />
            <span className="text-xs md:text-sm font-semibold tracking-wide">
              Premium Internet Plans
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-5 leading-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto px-4 leading-relaxed">
            Select the ideal plan that matches your lifestyle. Enjoy
            lightning-fast internet with no hidden fees, no contracts, and
            unlimited possibilities.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 items-stretch">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1;
            return (
              <motion.div
                key={plan._id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.12,
                  duration: 0.6,
                  type: "spring",
                  stiffness: 100,
                }}
                viewport={{ once: true }}
                whileHover={{ y: -16, transition: { duration: 0.2 } }}
                className={`relative group ${
                  isPopular ? "md:-mt-6 md:mb-6 z-10" : "z-0"
                }`}
              >
                <div
                  className={`relative bg-white rounded-3xl overflow-hidden transition-all duration-500 h-full flex flex-col ${
                    isPopular
                      ? "shadow-2xl shadow-blue-200/50 ring-2 ring-blue-500 hover:shadow-3xl hover:ring-blue-600 scale-100 hover:scale-[1.02]"
                      : "shadow-lg hover:shadow-2xl ring-1 ring-slate-200 hover:ring-blue-400"
                  }`}
                >
                  {/* Popular plan gradient background - keeping it white with subtle overlay */}
                  {isPopular && (
                    <>
                      <div className="absolute inset-0 bg-white"></div>
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    </>
                  )}

                  {/* Popular badge - Enhanced */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-auto">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-md opacity-70"></div>
                        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-[11px] md:text-xs font-bold px-5 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse-slow">
                          <FiStar className="w-3.5 h-3.5 fill-current" />
                          Most Popular
                          <FiStar className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-7 md:p-9 flex-1 flex flex-col bg-white rounded-3xl">
                    {/* Header with plan info */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <h3
                          className={`text-2xl md:text-3xl font-bold mb-1.5 text-slate-900`}
                        >
                          {plan.name}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {plan.description}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ml-4 ${
                          isPopular
                            ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-200/50"
                            : "bg-gradient-to-br from-slate-100 to-slate-200"
                        }`}
                      >
                        <FiWifi
                          className={`w-6 h-6 md:w-7 md:h-7 ${
                            isPopular ? "text-white" : "text-blue-600"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span
                        className={`text-4xl md:text-6xl font-bold text-slate-900`}
                      >
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-slate-400 text-sm ml-1.5 font-medium">
                        /month
                      </span>
                    </div>

                    {/* Speed indicators */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div
                        className={`rounded-2xl p-3.5 text-center transition-all duration-300 ${
                          isPopular
                            ? "bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100/50"
                            : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs text-slate-400 font-medium mb-1">
                          Download Speed
                        </p>
                        <p
                          className={`text-lg md:text-xl font-bold ${
                            isPopular ? "text-blue-600" : "text-slate-900"
                          }`}
                        >
                          {plan.speed.download}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            Mbps
                          </span>
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl p-3.5 text-center transition-all duration-300 ${
                          isPopular
                            ? "bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100/50"
                            : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-xs text-slate-400 font-medium mb-1">
                          Upload Speed
                        </p>
                        <p
                          className={`text-lg md:text-xl font-bold ${
                            isPopular ? "text-purple-600" : "text-slate-900"
                          }`}
                        >
                          {plan.speed.upload}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            Mbps
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-7 flex-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3.5">
                        Key Features
                      </p>
                      <ul className="space-y-3">
                        {plan.features.slice(0, 5).map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 + i * 0.07 }}
                            viewport={{ once: true }}
                            className="flex items-start gap-3 text-sm text-slate-600"
                          >
                            <FiCheckCircle
                              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                isPopular ? "text-blue-600" : "text-slate-400"
                              }`}
                            />
                            <span className="leading-relaxed">{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <a
                      href={`/apply?plan=${plan._id}`}
                      className={`block w-full text-center py-4 rounded-2xl font-semibold transition-all duration-300 text-sm group/btn ${
                        isPopular
                          ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                      )}
                      <span className="relative flex items-center justify-center gap-2">
                        Get Started
                        <FiArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </a>

                    {/* Popular plan extra tag */}
                    {isPopular && (
                      <div className="mt-3 text-center">
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                          ⚡ Best value for money
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enhanced Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-4 justify-center p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                No Contracts
              </p>
              <p className="text-xs text-slate-500">
                Cancel anytime, hassle-free
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
              <FiTrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                99.9% Uptime
              </p>
              <p className="text-xs text-slate-500">
                Reliable connection guaranteed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                24/7 Support
              </p>
              <p className="text-xs text-slate-500">
                Dedicated team, always ready
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
