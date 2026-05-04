"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDashboardStats, getRecentActivities } from "@/services/admin";
import { getAllApplications } from "@/services/admin";
import { getAllPayments } from "@/services/admin";
import { getPlans } from "@/services/plan";
import StatsCard from "@/components/admin/StatsCard";
import {
  FiUsers,
  FiDollarSign,
  FiActivity,
  FiAlertCircle,
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
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [
        statsData,
        activitiesData,
        applicationsData,
        paymentsData,
        plansData,
      ] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(),
        getAllApplications(),
        getAllPayments({ limit: 5 }),
        getPlans(),
      ]);

      setStats(statsData);
      setRecentActivities(activitiesData || []);

      // Process applications
      if (applicationsData?.data) {
        const pending = applicationsData.data.filter(
          (app: any) => app.status === "pending",
        );
        setPendingApplications(pending.length);
      }

      // Process recent payments
      if (paymentsData?.data) {
        setRecentPayments(paymentsData.data.slice(0, 5));
      }

      // Process plans
      if (plansData) {
        setPlans(plansData);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Dynamic chart data based on real stats
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
        data: stats?.revenue?.monthlyData || [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgb(99, 102, 241)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const userGrowthChartData = {
    labels: stats?.users?.growthLabels || [
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
        label: "New Users",
        data: stats?.users?.growthData || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const planDistributionData = {
    labels: plans.map((p: any) => p.name) || [],
    datasets: [
      {
        data: plans.map((p: any) => p.userCount || 0) || [],
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
    },
  };

  return (
    <div>
      {/* Header with Refresh */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <FiRefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.users?.total?.toLocaleString() || 0}
          icon={FiUsers}
          color="primary"
          change={stats?.users?.growth}
        />
        <StatsCard
          title="Total Revenue"
          value={`₱${stats?.revenue?.total?.toLocaleString() || 0}`}
          icon={FiDollarSign}
          color="green"
          change={stats?.revenue?.growth}
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats?.users?.active?.toLocaleString() || 0}
          icon={FiActivity}
          color="blue"
          change={stats?.users?.activeGrowth}
        />
        <StatsCard
          title="Pending Applications"
          value={pendingApplications}
          icon={FiUserCheck}
          color="yellow"
          change={null}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ₱{stats?.revenue?.monthlyTotal?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ↑ {stats?.revenue?.monthlyGrowth || 0}% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">New Users (This Month)</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.users?.newThisMonth?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ↑ {stats?.users?.monthlyGrowth || 0}% growth
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                Available subscriptions
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Trend
            </h3>
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <FiTrendingUp className="w-3 h-3" />
              <span>+{stats?.revenue?.monthlyGrowth || 12}%</span>
            </div>
          </div>
          <div className="h-80">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <FiTrendingUp className="w-3 h-3" />
              <span>+{stats?.users?.monthlyGrowth || 18}%</span>
            </div>
          </div>
          <div className="h-80">
            <Bar data={userGrowthChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Plan Distribution
          </h3>
          <div className="h-64">
            {planDistributionData.labels.length > 0 ? (
              <Doughnut data={planDistributionData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No plan data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activities
          </h3>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent activities
              </p>
            ) : (
              recentActivities.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === "payment"
                          ? "bg-green-100"
                          : activity.type === "user"
                            ? "bg-blue-100"
                            : activity.type === "application"
                              ? "bg-yellow-100"
                              : "bg-gray-100"
                      }`}
                    >
                      {activity.type === "payment" ? (
                        <FiCreditCard className="w-5 h-5 text-green-600" />
                      ) : activity.type === "user" ? (
                        <FiUsers className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FiUserCheck className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Payments
          </h3>
          <button
            onClick={() => router.push("/admin/payments")}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
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
            <tbody className="divide-y divide-gray-200">
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
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {payment.userId?.firstName} {payment.userId?.lastName}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      ₱{payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
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

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-6 mt-8">
        <button
          onClick={() => router.push("/admin/applications")}
          className="card p-4 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiUserCheck className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Applications</h3>
          </div>
          <p className="text-sm text-gray-500">Review pending applications</p>
          {pendingApplications > 0 && (
            <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              {pendingApplications} pending
            </span>
          )}
        </button>

        <button
          onClick={() => router.push("/admin/payments")}
          className="card p-4 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiCreditCard className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Payments</h3>
          </div>
          <p className="text-sm text-gray-500">Manage transactions</p>
        </button>

        <button
          onClick={() => router.push("/admin/users")}
          className="card p-4 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Users</h3>
          </div>
          <p className="text-sm text-gray-500">Manage user accounts</p>
        </button>

        <button
          onClick={() => router.push("/admin/plans")}
          className="card p-4 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiPackage className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Plans</h3>
          </div>
          <p className="text-sm text-gray-500">Manage service plans</p>
        </button>
      </div>
    </div>
  );
}
