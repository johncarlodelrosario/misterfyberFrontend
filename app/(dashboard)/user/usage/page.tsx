// app/(dashboard)/user/usage/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getUsage } from "@/services/user";
import {
  FiActivity,
  FiTrendingUp,
  FiRefreshCw,
  FiCalendar,
  FiZap,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function UsagePage() {
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadUsage = async () => {
    setLoading(true);
    try {
      const data = await getUsage();
      setUsageData(data);
    } catch (error: any) {
      console.error("Failed to load usage:", error);
      toast.error(error.response?.data?.message || "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading usage data...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  const currentUsage = usageData?.currentUsage || 0;
  const totalLimit = usageData?.totalLimit || 1000;
  const usagePercentage =
    totalLimit > 0 ? Math.min((currentUsage / totalLimit) * 100, 100) : 0;
  const dailyUsage = usageData?.dailyUsage || [];

  const maxDailyUsage =
    dailyUsage.length > 0
      ? Math.max(...dailyUsage.map((d: any) => d.usage))
      : 1;

  const last7Days = dailyUsage.slice(-7);

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Usage History
              </h1>
              <p className="text-gray-600">View your internet usage history</p>
            </div>
            <button
              onClick={loadUsage}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Current Usage Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiActivity className="w-5 h-5 text-blue-600" />
            Current Month Usage
          </h2>
          <div className="flex items-center gap-8 flex-wrap">
            {/* Circular Progress */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={
                    usagePercentage > 80
                      ? "#ef4444"
                      : usagePercentage > 60
                        ? "#f59e0b"
                        : "#3b82f6"
                  }
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - usagePercentage / 100)}`}
                  className="transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {Math.round(usagePercentage)}%
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold text-gray-900">
                  {currentUsage.toFixed(1)}
                </p>
                <p className="text-lg text-gray-500">GB</p>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                of {totalLimit} GB used this month
              </p>
              <div className="flex items-center gap-2 text-sm">
                <FiTrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {usagePercentage.toFixed(1)}% used
                </span>
              </div>
              {usagePercentage > 80 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ You're approaching your data limit
                </p>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <FiZap className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Daily Average</p>
                <p className="text-lg font-bold text-gray-900">
                  {last7Days.length > 0
                    ? (
                        last7Days.reduce(
                          (sum: number, d: any) => sum + d.usage,
                          0,
                        ) / last7Days.length
                      ).toFixed(1)
                    : "0"}{" "}
                  GB
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <FiCalendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Remaining</p>
                <p className="text-lg font-bold text-gray-900">
                  {Math.max(0, totalLimit - currentUsage).toFixed(1)} GB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {last7Days.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiCalendar className="w-5 h-5 text-blue-600" />
              Daily Usage (Last 7 Days)
            </h2>
            <div className="flex items-end gap-2 h-48">
              {last7Days.map((day: any, index: number) => {
                const height =
                  maxDailyUsage > 0 ? (day.usage / maxDailyUsage) * 100 : 0;
                return (
                  <div key={index} className="flex-1 text-center">
                    <div className="relative h-36">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.usage} GB`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(day.date).toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">
                      {day.usage} GB
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FiActivity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No usage data available
            </h3>
            <p className="text-gray-500">
              Usage data will appear here once your service is active
            </p>
          </div>
        )}

        {/* Usage Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>📊 Usage Information:</strong> Your data usage is tracked
            daily. Usage data may be delayed by up to 24 hours. If you have
            questions about your usage, please contact support.
          </p>
        </div>
      </div>
    </UserLayout>
  );
}
