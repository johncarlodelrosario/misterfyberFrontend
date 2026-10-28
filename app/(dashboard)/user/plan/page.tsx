// app/(dashboard)/user/plan/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getPlans } from "@/services/plan";
import { getUserProfile, requestPlanChange } from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import {
  FiWifi,
  FiCheck,
  FiZap,
  FiArrowUp,
  FiArrowDown,
  FiPhone,
  FiMail,
  FiX,
  FiRefreshCw,
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
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, userProfile] = await Promise.all([
        getPlans(),
        getUserProfile(),
      ]);

      const activePlans = plansData.filter((p) => p.isActive);
      setPlans(activePlans);

      if (userProfile.planId) {
        const planId =
          typeof userProfile.planId === "string"
            ? userProfile.planId
            : userProfile.planId._id;
        const current = plansData.find((p) => p._id === planId);
        setCurrentPlan(current || null);
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPlanChange = async () => {
    if (!selectedPlan) return;

    setSubmitting(true);
    try {
      await requestPlanChange(selectedPlan._id, requestMessage.trim());
      toast.success(
        "Plan change request submitted successfully! Our team will contact you soon.",
      );
      setShowRequestModal(false);
      setRequestMessage("");
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentPlan) return false;
    return currentPlan._id === planId;
  };

  const isUpgrade = (plan: Plan) => {
    return plan.price > (currentPlan?.price || 0);
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Plan</h1>
              <p className="text-gray-600">
                View and manage your internet plan
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
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
            {currentPlan.features && currentPlan.features.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex flex-wrap gap-3">
                  {currentPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-sm">
                      <FiCheck className="w-4 h-4 text-green-300" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Current Plan State */}
        {!currentPlan && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <FiWifi className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800">
              No Active Plan
            </h3>
            <p className="text-yellow-600">
              You don't have an active plan yet. Please contact support to get
              started.
            </p>
          </div>
        )}

        {/* Available Plans */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan._id);
            const upgrade = isUpgrade(plan);

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
                      {plan.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex-shrink-0">
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

                  {plan.features && plan.features.length > 0 && (
                    <div className="space-y-2 mb-6">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <p className="text-xs text-gray-400">
                          +{plan.features.length - 4} more features
                        </p>
                      )}
                    </div>
                  )}

                  {!isCurrent && (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowRequestModal(true);
                        }}
                        className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                          upgrade
                            ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {upgrade ? (
                          <>
                            <FiArrowUp className="w-4 h-4" /> Upgrade Plan
                          </>
                        ) : (
                          <>
                            <FiArrowDown className="w-4 h-4" /> Downgrade Plan
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowRequestModal(true);
                        }}
                        className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm"
                      >
                        Request Plan Change
                      </button>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="text-center py-2 text-sm text-green-600 bg-green-50 rounded-lg">
                      <FiCheck className="w-4 h-4 inline mr-1" />
                      You are currently on this plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Plans Available */}
        {plans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FiWifi className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Plans Available
            </h3>
            <p className="text-gray-500">
              There are currently no active plans. Please check back later.
            </p>
          </div>
        )}

        {/* Request Modal */}
        {showRequestModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Request Plan Change
                </h2>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedPlan(null);
                    setRequestMessage("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                You are requesting to change to{" "}
                <strong>{selectedPlan.name}</strong> (₱
                {selectedPlan.price.toLocaleString()}/month)
              </p>

              {currentPlan && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Current Plan:</span>
                    <span className="font-medium">{currentPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">New Plan:</span>
                    <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Price Difference:</span>
                    <span
                      className={`font-medium ${
                        isUpgrade(selectedPlan)
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {isUpgrade(selectedPlan) ? "+" : ""}₱
                      {(
                        selectedPlan.price - (currentPlan?.price || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

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
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedPlan(null);
                    setRequestMessage("");
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPlanChange}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
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
