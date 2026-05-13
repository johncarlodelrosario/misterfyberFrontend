"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDashboardStats, getRecentActivities } from "@/services/admin";
import { getAllApplications } from "@/services/admin";
import { getAllPayments } from "@/services/admin";
import { getPlans } from "@/services/plan";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import StatsCard from "@/components/admin/StatsCard";
import {
  FiUsers,
  FiDollarSign,
  FiActivity,
  FiTrendingUp,
  FiRefreshCw,
  FiUserCheck,
  FiCreditCard,
  FiPackage,
} from "react-icons/fi";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function AdminDashboard() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  // Use optimized queries with caching
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useOptimizedQuery({
    queryFn: getDashboardStats,
    cacheKey: "dashboard-stats",
    staleTime: 60000, // Refresh every minute
  });

  const { data: activities, isLoading: activitiesLoading } = useOptimizedQuery({
    queryFn: getRecentActivities,
    cacheKey: "recent-activities",
    staleTime: 120000, // Refresh every 2 minutes
  });

  const { data: applications, refetch: refetchApps } = useOptimizedQuery({
    queryFn: () => getAllApplications(),
    cacheKey: "applications",
    staleTime: 30000,
  });

  const { data: payments, refetch: refetchPayments } = useOptimizedQuery({
    queryFn: () => getAllPayments({ limit: 5 }),
    cacheKey: "recent-payments",
    staleTime: 60000,
  });

  const { data: plans, isLoading: plansLoading } = useOptimizedQuery({
    queryFn: getPlans,
    cacheKey: "plans",
    staleTime: 300000, // 5 minutes - plans don't change often
  });

  useEffect(() => {
    if (applications?.data) {
      const pending = applications.data.filter(
        (app: any) => app.status === "pending",
      );
      setPendingApplications(pending.length);
    }
    if (payments?.data) {
      setRecentPayments(payments.data.slice(0, 5));
    }
  }, [applications, payments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchApps(), refetchPayments()]);
    setRefreshing(false);
  };

  const revenueChartData = {
    labels: stats?.revenue?.monthlyLabels || [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Revenue (₱)",
        data: stats?.revenue?.monthlyData || Array(12).fill(0),
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const userGrowthChartData = {
    labels: stats?.users?.growthLabels || Array(12).fill(""),
    datasets: [
      {
        label: "New Users",
        data: stats?.users?.growthData || Array(12).fill(0),
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderRadius: 8,
      },
    ],
  };

  const planDistributionData = {
    labels: plans?.map((p: any) => p.name) || [],
    datasets: [
      {
        data: plans?.map((p: any) => p.userCount || 0) || [],
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.users?.total?.toLocaleString() || 0}
          icon={FiUsers}
          color="primary"
        />
        <StatsCard
          title="Total Revenue"
          value={`₱${stats?.revenue?.total?.toLocaleString() || 0}`}
          icon={FiDollarSign}
          color="green"
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats?.users?.active?.toLocaleString() || 0}
          icon={FiActivity}
          color="blue"
        />
        <StatsCard
          title="Pending Applications"
          value={pendingApplications}
          icon={FiUserCheck}
          color="yellow"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="h-80">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">User Growth</h3>
          <div className="h-80">
            <Bar data={userGrowthChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {activities?.slice(0, 5).map((activity: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b"
              >
                <div>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-gray-500">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Plan Distribution</h3>
          <div className="h-64">
            {planDistributionData.labels.length > 0 ? (
              <Doughnut data={planDistributionData} options={chartOptions} />
            ) : (
              <p className="text-gray-500 text-center">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No recent payments
                  </td>
                </tr>
              ) : (
                recentPayments.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {payment.userId?.firstName} {payment.userId?.lastName}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold">
                      ₱{payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${payment.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
