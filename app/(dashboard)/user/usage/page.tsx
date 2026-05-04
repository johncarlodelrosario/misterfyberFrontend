"use client";

import { useState, useEffect } from "react";
import { getUsage } from "@/services/user";
import { FiActivity, FiTrendingUp, FiRefreshCw } from "react-icons/fi";
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

  const usagePercentage = usageData?.totalLimit
    ? (usageData.currentUsage / usageData.totalLimit) * 100
    : 0;

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Usage History
              </h1>
              <p className="text-gray-600">View your internet usage history</p>
            </div>
            <button
              onClick={loadUsage}
              className="text-blue-600 hover:text-blue-700"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Current Month Usage
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative w-32 h-32">
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
                  stroke="#3b82f6"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - usagePercentage / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {Math.round(usagePercentage)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {usageData?.currentUsage || 0} GB
              </p>
              <p className="text-sm text-gray-500">
                of {usageData?.totalLimit || 1000} GB used
              </p>
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                <FiTrendingUp className="w-4 h-4" />
                {(
                  ((usageData?.currentUsage || 0) /
                    (usageData?.totalLimit || 1000)) *
                  100
                ).toFixed(1)}
                % used this month
              </p>
            </div>
          </div>
        </div>

        {/* Daily Usage Chart */}
        {usageData?.dailyUsage && usageData.dailyUsage.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Usage (Last 7 Days)
            </h2>
            <div className="flex items-end gap-2 h-48">
              {usageData.dailyUsage.slice(-7).map((day: any, index: number) => {
                const maxUsage = Math.max(
                  ...usageData.dailyUsage.map((d: any) => d.usage),
                );
                const height = (day.usage / maxUsage) * 100;
                return (
                  <div key={index} className="flex-1 text-center">
                    <div className="relative h-40">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all duration-500"
                        style={{ height: `${height}%` }}
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
        )}
      </div>
    </UserLayout>
  );
}
