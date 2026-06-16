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
  FiZap,
  FiShield,
  FiAward,
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
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FiLoader className="w-12 h-12 text-blue-600" />
            </motion.div>
            <p className="mt-4 text-gray-500">Loading plans...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-16">
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPlans}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
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
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your <span className="text-blue-600">Perfect Plan</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Select the ideal plan that fits your needs. High-speed internet with
            no hidden fees.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1;
            return (
              <motion.div
                key={plan._id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className={`relative ${isPopular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                <div
                  className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col ${
                    isPopular
                      ? "shadow-2xl ring-2 ring-blue-600"
                      : "shadow-lg hover:shadow-xl ring-1 ring-gray-200"
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    {/* Plan Name & Icon */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {plan.description}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-4 ${
                          isPopular ? "bg-blue-600" : "bg-gray-100"
                        }`}
                      >
                        <FiWifi
                          className={`w-6 h-6 ${
                            isPopular ? "text-white" : "text-blue-600"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">/month</span>
                    </div>

                    {/* Speed */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Download</p>
                        <p className="text-lg font-bold text-gray-900">
                          {plan.speed.download}
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            Mbps
                          </span>
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Upload</p>
                        <p className="text-lg font-bold text-gray-900">
                          {plan.speed.upload}
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            Mbps
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-8 flex-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Features
                      </p>
                      <ul className="space-y-2.5">
                        {plan.features.slice(0, 5).map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 + i * 0.05 }}
                            viewport={{ once: true }}
                            className="flex items-start gap-3 text-sm text-gray-600"
                          >
                            <FiCheckCircle
                              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                isPopular ? "text-blue-600" : "text-gray-400"
                              }`}
                            />
                            <span>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <a
                      href={`/apply?plan=${plan._id}`}
                      className={`block w-full text-center py-3.5 rounded-xl font-semibold transition-all duration-300 text-sm ${
                        isPopular
                          ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Get Started
                      <FiArrowRight className="inline ml-2 w-4 h-4" />
                    </a>

                    {isPopular && (
                      <p className="text-xs text-center text-blue-600 mt-3 font-medium">
                        ⚡ Best value for money
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
