"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiCreditCard,
  FiClipboard,
  FiActivity,
  FiTrendingUp,
  FiCalendar,
  FiMail,
  FiBell,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getEmailStatus,
  toggleEmail,
  getDashboardStats,
  getRecentActivities,
} from "@/services/admin";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApplications: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Fetch email status
  const fetchEmailStatus = async () => {
    try {
      const result = await getEmailStatus();
      setEmailEnabled(result.enabled);
    } catch (error) {
      console.error("Failed to fetch email status:", error);
      setEmailEnabled(true);
    }
  };

  // Toggle email sending
  const handleToggleEmail = async () => {
    setTogglingEmail(true);
    try {
      const newState = !emailEnabled;
      const result = await toggleEmail(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(
          `Email sending ${newState ? "enabled" : "disabled"} successfully`,
        );
      }
    } catch (error) {
      console.error("Failed to toggle email:", error);
      toast.error("Failed to toggle email settings");
    } finally {
      setTogglingEmail(false);
    }
  };

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const [dashboardStats, activities] = await Promise.all([
          getDashboardStats().catch(() => ({
            users: { total: 0 },
            applications: { pending: 0 },
            revenue: { total: 0, monthly: 0 },
          })),
          getRecentActivities().catch(() => []),
        ]);

        setStats({
          totalUsers: dashboardStats?.users?.total || 0,
          pendingApplications: dashboardStats?.applications?.pending || 0,
          totalPayments: dashboardStats?.revenue?.total || 0,
          monthlyRevenue: dashboardStats?.revenue?.monthly || 0,
        });

        setRecentActivities(activities || []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
    fetchEmailStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.firstName || user?.username}!
            </h1>
            <p className="text-blue-100 mt-1">
              Here's what's happening with your network today.
            </p>
          </div>

          {/* Email Toggle Button */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FiMail className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white">
                  Email Alerts
                </span>
              </div>
              <button
                onClick={handleToggleEmail}
                disabled={togglingEmail}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${emailEnabled ? "bg-green-500" : "bg-gray-400"}
                  ${togglingEmail ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${emailEnabled ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
              <span
                className={`text-xs ${emailEnabled ? "text-green-300" : "text-gray-300"}`}
              >
                {emailEnabled ? "ON" : "OFF"}
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              {emailEnabled
                ? "All email notifications will be sent"
                : "No emails will be sent to customers"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Applications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.pendingApplications.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiUserCheck className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₱{stats.totalPayments.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiCreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₱{stats.monthlyRevenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FiClipboard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <FiActivity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === "payment"
                        ? "bg-green-100"
                        : activity.type === "user"
                          ? "bg-blue-100"
                          : activity.type === "application"
                            ? "bg-yellow-100"
                            : "bg-gray-100"
                    }`}
                  >
                    <span className="text-sm">{activity.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent activity to display
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h3>
            <FiTrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <a
              href="/admin/applications"
              className="w-full block text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">Review Applications</p>
              <p className="text-sm text-gray-500">
                Check pending user applications
              </p>
            </a>
            <a
              href="/admin/users"
              className="w-full block text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">
                Add or remove user accounts
              </p>
            </a>
            <a
              href="/admin/billing"
              className="w-full block text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">View Billing</p>
              <p className="text-sm text-gray-500">
                Check pending payments and invoices
              </p>
            </a>
          </div>
        </div>
      </div>

      {/* Email Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Email Notification Status
          </h3>
          <FiBell className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {emailEnabled ? (
              <FiCheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <FiXCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                Email sending is currently{" "}
                {emailEnabled ? "ENABLED" : "DISABLED"}
              </p>
              <p className="text-sm text-gray-500">
                {emailEnabled
                  ? "All system emails will be sent to customers"
                  : "No emails will be sent. This is useful for testing or maintenance."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleEmail}
            disabled={togglingEmail}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              emailEnabled
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } ${togglingEmail ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {togglingEmail
              ? "Updating..."
              : emailEnabled
                ? "Disable Emails"
                : "Enable Emails"}
          </button>
        </div>
      </div>
    </div>
  );
}
