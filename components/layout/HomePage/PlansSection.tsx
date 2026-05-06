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
      <section
        className="py-12 md:py-20"
        style={{ backgroundColor: "#080616" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-12 md:py-20 bg-[#080616]/80 backdrop-blur-sm rounded-2xl border border-blue-900/30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FiLoader className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
            </motion.div>
            <p className="mt-4 text-blue-200/70 text-sm md:text-base">
              Loading our plans...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="py-12 md:py-20"
        style={{ backgroundColor: "#080616" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12 md:py-20 bg-[#080616]/80 backdrop-blur-sm rounded-2xl border border-blue-900/30">
            <FiAlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-400 mx-auto mb-4" />
            <p className="text-blue-200/70 text-base md:text-lg mb-4 px-4">
              {error}
            </p>
            <button
              onClick={fetchPlans}
              className="mt-2 px-5 md:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition"
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
    <section
      className="py-12 md:py-20 relative overflow-hidden"
      style={{ backgroundColor: "#080616" }}
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Internet Plan
            </span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-blue-200/60 max-w-2xl mx-auto px-4">
            Select the perfect plan that fits your lifestyle. No hidden fees, no
            contracts, just pure internet bliss.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1;
            return (
              <motion.div
                key={plan._id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className={`relative bg-[#080616]/80 backdrop-blur-sm rounded-2xl transition-all duration-300 ${
                  isPopular
                    ? "border-2 border-blue-500/70 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30"
                    : "border border-blue-500/30 shadow-lg hover:shadow-xl hover:border-blue-500/50"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] md:text-xs font-bold px-3 md:px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
                      <FiStar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                <div className="p-4 md:p-7">
                  <h3 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-[11px] md:text-sm text-blue-200/60 mb-3 md:mb-5">
                    {plan.description}
                  </p>
                  <div className="mb-3 md:mb-5">
                    <span className="text-2xl md:text-4xl font-bold text-white">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-blue-200/50 text-xs md:text-sm ml-1">
                      /month
                    </span>
                  </div>
                  <div className="bg-[#080616]/80 rounded-xl p-2 md:p-4 mb-4 md:mb-6 border border-blue-900/50">
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <p className="text-[10px] md:text-xs text-blue-200/50 mb-1">
                          Download
                        </p>
                        <p className="text-sm md:text-lg font-bold text-white">
                          {plan.speed.download}{" "}
                          <span className="text-[10px] md:text-sm font-normal text-blue-200/50">
                            Mbps
                          </span>
                        </p>
                      </div>
                      <div className="w-px h-6 md:h-10 bg-blue-900/50" />
                      <div className="text-center flex-1">
                        <p className="text-[10px] md:text-xs text-blue-200/50 mb-1">
                          Upload
                        </p>
                        <p className="text-sm md:text-lg font-bold text-white">
                          {plan.speed.upload}{" "}
                          <span className="text-[10px] md:text-sm font-normal text-blue-200/50">
                            Mbps
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 md:space-y-3 mb-4 md:mb-8">
                    {plan.features.slice(0, 5).map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 + i * 0.05 }}
                        viewport={{ once: true }}
                        className="flex items-start gap-1.5 md:gap-2 text-[11px] md:text-sm text-blue-200/70"
                      >
                        <FiCheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <a
                    href={`/apply?plan=${plan._id}`}
                    className={`block w-full text-center py-2 md:py-3 rounded-xl font-semibold transition-all duration-300 text-xs md:text-base ${
                      isPopular
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:opacity-90"
                        : "bg-blue-900/50 text-blue-200 hover:bg-blue-900/70"
                    }`}
                  >
                    Get Started
                    <FiArrowRight className="inline ml-1.5 md:ml-2 w-3 h-3 md:w-4 md:h-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
