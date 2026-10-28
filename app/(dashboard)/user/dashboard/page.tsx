// app/(dashboard)/user/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserBillingCycle,
  getCurrentBill,
  getBillingHistory,
  getUserBillingSummary,
} from "@/services/billing";
import {
  FiWifi,
  FiClipboard,
  FiActivity,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiCalendar,
  FiDollarSign,
  FiCheckCircle,
} from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function UserDashboard() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<any>(null);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // 1. Fetch the billing summary which contains both cycle and current bill
      const summaryData = await getUserBillingSummary();

      // 2. Fetch recent billing history
      const historyData = await getBillingHistory({ page: 1, limit: 10 });

      console.log("✅ Dashboard Summary Data:", summaryData);
      console.log("✅ Billing History:", historyData);

      // 3. Safely extract the nested data
      // The API returns: { billingCycle: {...}, currentBill: {...} }
      if (summaryData) {
        setBillingCycle(summaryData.billingCycle || null);
        setCurrentBill(summaryData.currentBill || null);
      } else {
        // Fallback just in case summary is empty
        const cycleData = await getUserBillingCycle();
        const billData = await getCurrentBill();
        setBillingCycle(cycleData || null);
        setCurrentBill(billData || null);
      }

      // 4. Parse history
      setBillingHistory(historyData?.billingHistory || historyData?.data || []);
    } catch (error: any) {
      console.error("Failed to load dashboard:", error);
      toast.error(
        error.response?.data?.message || "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const needsFirstPayment =
    billingCycle?.proRatedPaid === false && currentBill?.isProRated === true;
  const isAfterCutoff = billingCycle?.isAfterCutoff || false;
  const hasOverdue = currentBill?.status === "overdue";

  const unpaidBills = billingHistory.filter(
    (bill: any) => bill.status !== "paid" && bill.status !== "cancelled",
  );

  const totalUnpaid = unpaidBills.reduce(
    (sum: number, bill: any) => sum + (bill.total || 0),
    0,
  );

  const getDaysUntilDue = (dueDate: string): number | null => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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

  // Get Plan Name and Speed safely
  const planName =
    billingCycle?.planId?.name || currentBill?.planId?.name || "No Plan";
  const planSpeed = billingCycle?.planId?.speed || currentBill?.planId?.speed;

  return (
    <UserLayout>
      <div>
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.firstName || user?.username || "User"}!
              </h1>
              <p className="text-gray-600">
                Here's what's happening with your account
              </p>
            </div>
            <button
              onClick={loadDashboard}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Pro-rated Payment Alert */}
        {needsFirstPayment && currentBill && currentBill.isProRated && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <FiAlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-purple-800">
                📋 Pro-rated Payment Required
              </p>
              <p className="text-sm text-purple-600">
                Your pro-rated payment of ₱
                {(currentBill.total || 0).toLocaleString()} is due on{" "}
                {currentBill.dueDate
                  ? new Date(currentBill.dueDate).toLocaleDateString()
                  : "N/A"}
                . Once paid, your service will be fully activated.
              </p>
            </div>
            <Link
              href="/user/billing"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex-shrink-0"
            >
              Pay Now
            </Link>
          </div>
        )}

        {/* Overdue Alert */}
        {hasOverdue && !needsFirstPayment && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <FiAlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">⚠️ Overdue Payment</p>
              <p className="text-sm text-red-600">
                You have an overdue bill. Please pay immediately to avoid
                service interruption.
              </p>
            </div>
            <Link
              href="/user/billing"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex-shrink-0"
            >
              Pay Now
            </Link>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Plan */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="text-xl font-bold text-gray-900">{planName}</p>
                {planSpeed && (
                  <p className="text-sm text-gray-500">
                    {planSpeed.download} Mbps / {planSpeed.upload} Mbps
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiWifi className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Current Bill */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Bill</p>
                <p className="text-xl font-bold text-gray-900">
                  ₱{(currentBill?.total || 0).toLocaleString()}
                </p>
                {currentBill?.dueDate && (
                  <p
                    className={`text-sm ${hasOverdue ? "text-red-500" : "text-yellow-500"}`}
                  >
                    Due: {new Date(currentBill.dueDate).toLocaleDateString()}
                  </p>
                )}
                {!currentBill && (
                  <p className="text-sm text-green-500">No pending bill</p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiClipboard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Unpaid */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Unpaid</p>
                <p className="text-xl font-bold text-gray-900">
                  ₱{totalUnpaid.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {unpaidBills.length} unpaid bill(s)
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Next Billing */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Next Billing</p>
                <p className="text-xl font-bold text-gray-900">
                  {billingCycle?.nextBillingDate
                    ? new Date(
                        billingCycle.nextBillingDate,
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
                {billingCycle?.monthlyRate && (
                  <p className="text-sm text-gray-500">
                    ₱{billingCycle.monthlyRate.toLocaleString()}/month
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Billing Cycle Information */}
        {billingCycle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiClock className="text-blue-600" /> Billing Cycle Information
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Billing Period</p>
                <p className="text-sm font-medium">
                  {billingCycle.billingStartDate
                    ? new Date(
                        billingCycle.billingStartDate,
                      ).toLocaleDateString()
                    : "-"}{" "}
                  -{" "}
                  {billingCycle.billingEndDate
                    ? new Date(billingCycle.billingEndDate).toLocaleDateString()
                    : "Ongoing"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Billing Date</p>
                <p className="text-sm font-medium">
                  {billingCycle.nextBillingDate
                    ? new Date(
                        billingCycle.nextBillingDate,
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Rate</p>
                <p className="text-sm font-medium">
                  ₱{(billingCycle.monthlyRate || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cycle Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    billingCycle.status === "active"
                      ? "bg-green-100 text-green-800"
                      : billingCycle.status === "pending_activation"
                        ? "bg-purple-100 text-purple-800"
                        : billingCycle.status === "disconnected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {billingCycle.status === "pending_activation"
                    ? "Awaiting First Payment"
                    : billingCycle.status === "disconnected"
                      ? "Disconnected"
                      : billingCycle.status || "Unknown"}
                </span>
              </div>
            </div>
            {isAfterCutoff && (
              <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  ℹ️ Your installation was after the cutoff date. Your first
                  bill is for next month's full monthly subscription.
                </p>
              </div>
            )}
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

        {/* Recent Bills */}
        {unpaidBills.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Pending Bills
              </h3>
              <Link
                href="/user/billing"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {unpaidBills.slice(0, 3).map((bill: any) => {
                const daysLeft = bill.dueDate
                  ? getDaysUntilDue(bill.dueDate)
                  : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;

                return (
                  <div
                    key={bill._id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {bill.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {bill.billingPeriod
                          ? `${new Date(bill.billingPeriod.start).toLocaleDateString()} - ${new Date(bill.billingPeriod.end).toLocaleDateString()}`
                          : "Monthly Subscription"}
                        {bill.isProRated && " (Pro-rated)"}
                      </p>
                      {bill.dueDate && (
                        <p
                          className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}
                        >
                          {isOverdue
                            ? `Overdue by ${Math.abs(daysLeft!)} day(s)`
                            : `Due in ${daysLeft} day(s)`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ₱{(bill.total || 0).toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-red-100 text-red-700"
                            : bill.status === "pending_confirmation"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isOverdue
                          ? "Overdue"
                          : bill.status === "pending_confirmation"
                            ? "Pending"
                            : "Unpaid"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Paid State */}
        {unpaidBills.length === 0 && !loading && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center mb-8">
            <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800">
              All Caught Up!
            </h3>
            <p className="text-green-600">
              You have no pending bills at the moment.
            </p>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
