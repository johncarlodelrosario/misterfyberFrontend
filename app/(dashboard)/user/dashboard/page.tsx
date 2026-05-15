// app/(dashboard)/user/page.tsx - User dashboard
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserDashboard,
  getUserBillingCycle,
  getCurrentBill,
} from "@/services/user";
import {
  FiWifi,
  FiClipboard,
  FiActivity,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiCalendar,
} from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function UserDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<any>(null);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [data, cycleData, billData] = await Promise.all([
        getUserDashboard(),
        getUserBillingCycle(),
        getCurrentBill(),
      ]);
      setDashboardData(data);
      setBillingCycle(cycleData);
      setCurrentBill(billData);
    } catch (error: any) {
      console.error("Failed to load dashboard:", error);
      toast.error(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || user?.username || "User"}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your account
          </p>
        </div>

        {/* Billing Cycle Alert */}
        {billingCycle?.hasOverdue && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <FiAlertCircle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">⚠️ Overdue Payment</p>
              <p className="text-sm text-red-600">
                You have {billingCycle.overdueCount} overdue bill(s). Please pay
                immediately to avoid service interruption.
              </p>
            </div>
            <Link
              href="/user/billing"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Pay Now
            </Link>
          </div>
        )}

        {billingCycle?.billingCycle?.pendingPlanChange?.status ===
          "pending" && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <FiClock className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                ⏳ Plan Change Pending
              </p>
              <p className="text-sm text-yellow-600">
                Your request to change to{" "}
                {billingCycle.billingCycle.pendingPlanChange.newPlanId?.name} is
                awaiting admin approval.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="text-xl font-bold text-gray-900">
                  {dashboardData?.plan?.name || "No Plan"}
                </p>
                {dashboardData?.plan?.speed && (
                  <p className="text-sm text-gray-500">
                    {dashboardData.plan.speed.download} Mbps /{" "}
                    {dashboardData.plan.speed.upload} Mbps
                  </p>
                )}
              </div>
              <FiWifi className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Bill</p>
                <p className="text-xl font-bold text-gray-900">
                  ₱
                  {(
                    currentBill?.total ||
                    dashboardData?.currentBill?.total ||
                    0
                  ).toLocaleString()}
                </p>
                {(currentBill?.dueDate ||
                  dashboardData?.currentBill?.dueDate) && (
                  <p
                    className={`text-sm ${new Date(currentBill?.dueDate || dashboardData?.currentBill?.dueDate) < new Date() ? "text-red-500" : "text-yellow-500"}`}
                  >
                    Due:{" "}
                    {new Date(
                      currentBill?.dueDate ||
                        dashboardData?.currentBill?.dueDate,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              <FiClipboard className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Data Usage</p>
                <p className="text-xl font-bold text-gray-900">
                  {dashboardData?.usage || "0"} GB
                </p>
                <p className="text-sm text-gray-500">of unlimited</p>
              </div>
              <FiActivity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Next Billing</p>
                <p className="text-xl font-bold text-gray-900">
                  {billingCycle?.billingCycle?.nextBillingDate
                    ? new Date(
                        billingCycle.billingCycle.nextBillingDate,
                      ).toLocaleDateString()
                    : dashboardData?.nextBillingDate
                      ? new Date(
                          dashboardData.nextBillingDate,
                        ).toLocaleDateString()
                      : "N/A"}
                </p>
                {billingCycle?.billingCycle?.monthlyRate && (
                  <p className="text-sm text-gray-500">
                    ₱{billingCycle.billingCycle.monthlyRate.toLocaleString()}
                    /month
                  </p>
                )}
              </div>
              <FiCalendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Billing Cycle Info Card */}
        {billingCycle?.billingCycle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiClock className="text-blue-600" /> Billing Cycle Information
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Billing Period</p>
                <p className="text-sm font-medium">
                  {new Date(
                    billingCycle.billingCycle.billingStartDate,
                  ).toLocaleDateString()}{" "}
                  -
                  {billingCycle.billingCycle.billingEndDate
                    ? new Date(
                        billingCycle.billingCycle.billingEndDate,
                      ).toLocaleDateString()
                    : "Ongoing"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Billing Date</p>
                <p className="text-sm font-medium">
                  {new Date(
                    billingCycle.billingCycle.nextBillingDate,
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Rate</p>
                <p className="text-sm font-medium">
                  ₱{billingCycle.billingCycle.monthlyRate?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cycle Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    billingCycle.billingCycle.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {billingCycle.billingCycle.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link
            href="/user/billing"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition text-center group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <FiClipboard className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-1 text-gray-900">Pay Bill</h3>
            <p className="text-sm text-gray-500">
              Pay your current bill online
            </p>
          </Link>
          <Link
            href="/user/plan"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition text-center group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <FiWifi className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-1 text-gray-900">Change Plan</h3>
            <p className="text-sm text-gray-500">
              Upgrade or downgrade your plan
            </p>
          </Link>
          <Link
            href="/user/usage"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition text-center group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <FiActivity className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-1 text-gray-900">View Usage</h3>
            <p className="text-sm text-gray-500">Check your data consumption</p>
          </Link>
          <Link
            href="/user/tickets"
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition text-center group"
          >
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
              <FiAlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold mb-1 text-gray-900">Get Support</h3>
            <p className="text-sm text-gray-500">Contact customer support</p>
          </Link>
        </div>

        {/* Recent Activity */}
        {dashboardData?.recentActivities &&
          dashboardData.recentActivities.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <button
                  onClick={loadDashboard}
                  className="text-blue-600 hover:text-blue-700 transition"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {dashboardData.recentActivities
                  .slice(0, 5)
                  .map((activity: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {activity.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                      {activity.amount && (
                        <span
                          className={`text-sm font-semibold ${
                            activity.type === "payment"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          ₱{activity.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>
    </UserLayout>
  );
}
