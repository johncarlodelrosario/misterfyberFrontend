"use client";

import { useState, useEffect } from "react";
import { getPlans } from "@/services/plan";
import {
  getUserProfile,
  changeUserPlan,
  requestPlanChange,
} from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import {
  FiWifi,
  FiCheck,
  FiZap,
  FiArrowUp,
  FiArrowDown,
  FiPhone,
  FiMail,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  speed: {
    download: number;
    upload: number;
  };
  features: string[];
  isActive: boolean;
}

export default function PlanPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, userProfile] = await Promise.all([
        getPlans(),
        getUserProfile(),
      ]);
      setPlans(plansData.filter((p) => p.isActive));
      if (userProfile.planId) {
        const current = plansData.find((p) => p._id === userProfile.planId);
        setCurrentPlan(current || null);
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    setChangingPlan(planId);
    try {
      await changeUserPlan(planId);
      toast.success("Plan changed successfully!");
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change plan");
    } finally {
      setChangingPlan(null);
    }
  };

  const handleRequestPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      await requestPlanChange(selectedPlan._id, requestMessage);
      toast.success(
        "Plan change request submitted successfully! Our team will contact you soon.",
      );
      setShowRequestModal(false);
      setRequestMessage("");
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentPlan?._id === planId;
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading plans...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Plan</h1>
          <p className="text-gray-600">View and manage your internet plan</p>
        </div>

        {/* Current Plan Card */}
        {currentPlan && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Current Plan</p>
                <h2 className="text-2xl font-bold">{currentPlan.name}</h2>
                <p className="text-blue-100 mt-1">
                  ₱{currentPlan.price.toLocaleString()}/month
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <FiZap className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm">
                    {currentPlan.speed.download} Mbps /{" "}
                    {currentPlan.speed.upload} Mbps
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan._id);

            return (
              <div
                key={plan._id}
                className={`bg-white rounded-xl shadow-sm border transition-all ${
                  isCurrent
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {plan.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="text-center py-4 border-y border-gray-100 mb-4">
                    <div className="text-3xl font-bold text-gray-900">
                      ₱{plan.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">per month</div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <FiZap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">
                        {plan.speed.download} Mbps / {plan.speed.upload} Mbps
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <FiCheck className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-xs text-gray-400">
                        +{plan.features.length - 4} more features
                      </p>
                    )}
                  </div>

                  {!isCurrent && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleChangePlan(plan._id)}
                        disabled={changingPlan === plan._id}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {changingPlan === plan._id ? (
                          <>Processing...</>
                        ) : (
                          <>
                            {plan.price > (currentPlan?.price || 0) ? (
                              <>
                                <FiArrowUp className="w-4 h-4" /> Upgrade Now
                              </>
                            ) : (
                              <>
                                <FiArrowDown className="w-4 h-4" /> Downgrade
                                Now
                              </>
                            )}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowRequestModal(true);
                        }}
                        className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        Request via Support
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Request Modal */}
        {showRequestModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Request Plan Change
              </h2>
              <p className="text-gray-600 mb-4">
                You are requesting to change to{" "}
                <strong>{selectedPlan.name}</strong> (₱
                {selectedPlan.price.toLocaleString()}/month)
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us why you want to change your plan or any special requests..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRequestPlanChange}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedPlan(null);
                    setRequestMessage("");
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Our support team will review your request and contact you
                  within 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Support Contact */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">
            Need help choosing a plan?
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Our support team is here to help you find the perfect plan for your
            needs.
          </p>
          <div className="flex gap-4">
            <a
              href="tel:+63212345678"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FiPhone className="w-4 h-4" />
              <span>Call Support</span>
            </a>
            <a
              href="mailto:support@misterfyber.com"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FiMail className="w-4 h-4" />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
