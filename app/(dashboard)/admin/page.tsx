"use client";

import { useState, useEffect } from "react";
import {
  FiDownload,
  FiFileText,
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiPrinter,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiBell,
  FiXCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getAllPayments,
  getAllUsers,
  getAllBills,
  getDashboardStats,
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
} from "@/services/admin";
import * as XLSX from "xlsx";

export default function AdminReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reportType, setReportType] = useState<
    "payments" | "users" | "bills" | "revenue"
  >("payments");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
    pendingApplications: 0,
  });

  useEffect(() => {
    fetchStats();
    fetchEmailStatus();
  }, []);

  const fetchStats = async () => {
    try {
      const dashboardStats = await getDashboardStats();
      setStats({
        totalUsers: dashboardStats?.users?.total || 0,
        totalPayments: dashboardStats?.revenue?.total || 0,
        monthlyRevenue: dashboardStats?.revenue?.monthly || 0,
        pendingApplications: dashboardStats?.applications?.pending || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats({
        totalUsers: 0,
        totalPayments: 0,
        monthlyRevenue: 0,
        pendingApplications: 0,
      });
    }
  };

  const fetchEmailStatus = async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      setEmailEnabled(result.data?.customerEmailAlertsEnabled ?? true);
    } catch (error) {
      console.error("Failed to fetch email status:", error);
      setEmailEnabled(true);
    }
  };

  const handleToggleEmail = async () => {
    setTogglingEmail(true);
    try {
      const newState = !emailEnabled;
      const result = await toggleCustomerEmailAlerts(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(
          `Customer email alerts ${newState ? "enabled" : "disabled"} successfully`,
        );
      } else {
        toast.error(result.message || "Failed to toggle email settings");
      }
    } catch (error) {
      console.error("Failed to toggle email:", error);
      toast.error("Failed to toggle email settings");
    } finally {
      setTogglingEmail(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const generatePaymentsReport = async () => {
    setGenerating("payments");
    try {
      const result = await getAllPayments({
        forceRefresh: true,
        limit: 10000,
      });

      let payments = result.data || [];

      payments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return paymentDate >= start && paymentDate <= end;
      });

      const reportData = payments.map((payment: any) => ({
        "Payment ID": payment._id,
        "Invoice Number": payment.invoiceNumber || payment.billingId || "N/A",
        Amount: payment.amount,
        Status: payment.status?.toUpperCase() || "UNKNOWN",
        "Payment Method": payment.paymentMethod || "N/A",
        "Payment Type": payment.paymentType || "subscription",
        "Reference Number": payment.referenceNumber || "N/A",
        "Paid At": payment.paidAt ? formatDate(payment.paidAt) : "Not paid",
        "Created At": formatDate(payment.createdAt),
        "User ID":
          typeof payment.userId === "object"
            ? payment.userId?._id
            : payment.userId,
        "User Name":
          typeof payment.userId === "object"
            ? `${payment.userId?.firstName || ""} ${payment.userId?.lastName || ""}`.trim() ||
              payment.userId?.username ||
              "N/A"
            : "N/A",
        "User Email":
          typeof payment.userId === "object"
            ? payment.userId?.email || "N/A"
            : "N/A",
      }));

      const totalAmount = payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0,
      );
      const completedPayments = payments.filter(
        (p: any) => p.status === "completed",
      ).length;
      const pendingPayments = payments.filter(
        (p: any) => p.status === "pending",
      ).length;
      const failedPayments = payments.filter(
        (p: any) => p.status === "failed",
      ).length;

      const summary = [
        ["PAYMENTS REPORT SUMMARY"],
        ["Generated:", new Date().toLocaleString()],
        [
          "Date Range:",
          `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["Total Payments Count:", payments.length],
        ["Total Amount:", formatCurrency(totalAmount)],
        ["Completed Payments:", completedPayments],
        ["Pending Payments:", pendingPayments],
        ["Failed Payments:", failedPayments],
        [""],
        [
          "AVERAGE PAYMENT VALUE:",
          formatCurrency(
            payments.length > 0 ? totalAmount / payments.length : 0,
          ),
        ],
      ];

      const finalData = [
        ...summary,
        [],
        Object.keys(reportData[0] || {}),
        ...reportData.map(Object.values),
      ];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payments Report");
      XLSX.writeFile(
        wb,
        `payments_report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );
      toast.success("Payments report generated successfully");
    } catch (error) {
      console.error("Error generating payments report:", error);
      toast.error("Failed to generate payments report");
    } finally {
      setGenerating(null);
    }
  };

  const generateUsersReport = async () => {
    setGenerating("users");
    try {
      const result = await getAllUsers({ forceRefresh: true, limit: 10000 });
      let users = result.data || [];

      users = users.filter((user: any) => {
        const userDate = new Date(user.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return userDate >= start && userDate <= end;
      });

      const reportData = users.map((user: any) => ({
        "User ID": user._id,
        Username: user.username || "N/A",
        Email: user.email || "N/A",
        "First Name": user.firstName || "N/A",
        "Last Name": user.lastName || "N/A",
        "Phone Number": user.phoneNumber || "N/A",
        Role: user.role?.toUpperCase() || "USER",
        Status: user.status?.toUpperCase() || "UNKNOWN",
        Plan: user.planId?.name || "No Plan",
        Address:
          `${user.barangay || ""}, ${user.city || ""}, ${user.province || ""}`.trim() ||
          "N/A",
        "Created At": formatDate(user.createdAt),
        "Last Login": user.lastLogin ? formatDate(user.lastLogin) : "Never",
      }));

      const totalActive = users.filter(
        (u: any) => u.status === "active",
      ).length;
      const totalInactive = users.filter(
        (u: any) => u.status === "inactive",
      ).length;
      const totalSuspended = users.filter(
        (u: any) => u.status === "suspended",
      ).length;

      const summary = [
        ["USER REPORT SUMMARY"],
        ["Generated:", new Date().toLocaleString()],
        [
          "Date Range:",
          `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["Total Users:", users.length],
        ["Active Users:", totalActive],
        ["Inactive Users:", totalInactive],
        ["Suspended Users:", totalSuspended],
      ];

      const finalData = [
        ...summary,
        [],
        Object.keys(reportData[0] || {}),
        ...reportData.map(Object.values),
      ];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users Report");
      XLSX.writeFile(
        wb,
        `users_report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );
      toast.success("Users report generated successfully");
    } catch (error) {
      console.error("Error generating users report:", error);
      toast.error("Failed to generate users report");
    } finally {
      setGenerating(null);
    }
  };

  const generateBillsReport = async () => {
    setGenerating("bills");
    try {
      const result = await getAllBills({ forceRefresh: true, limit: 10000 });
      let bills = result.data || [];

      bills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return billDate >= start && billDate <= end;
      });

      const reportData = bills.map((bill: any) => ({
        "Bill ID": bill._id,
        "Invoice Number": bill.invoiceNumber || "N/A",
        Subtotal: bill.subtotal || 0,
        Tax: bill.tax || 0,
        Discount: bill.discount || 0,
        Total: bill.total || 0,
        Status: bill.status?.toUpperCase() || "UNKNOWN",
        "Due Date": bill.dueDate ? formatDate(bill.dueDate) : "N/A",
        "Created At": formatDate(bill.createdAt),
      }));

      const totalAmount = bills.reduce(
        (sum: number, b: any) => sum + (b.total || 0),
        0,
      );
      const paidBills = bills.filter((b: any) => b.status === "paid").length;

      const summary = [
        ["BILLS REPORT SUMMARY"],
        ["Generated:", new Date().toLocaleString()],
        [
          "Date Range:",
          `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["Total Bills:", bills.length],
        ["Total Amount:", formatCurrency(totalAmount)],
        ["Paid Bills:", paidBills],
      ];

      const finalData = [
        ...summary,
        [],
        Object.keys(reportData[0] || {}),
        ...reportData.map(Object.values),
      ];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bills Report");
      XLSX.writeFile(
        wb,
        `bills_report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );
      toast.success("Bills report generated successfully");
    } catch (error) {
      console.error("Error generating bills report:", error);
      toast.error("Failed to generate bills report");
    } finally {
      setGenerating(null);
    }
  };

  const generateRevenueReport = async () => {
    setGenerating("revenue");
    try {
      const [paymentsResult, billsResult] = await Promise.all([
        getAllPayments({ forceRefresh: true, limit: 10000 }),
        getAllBills({ forceRefresh: true, limit: 10000 }),
      ]);

      let payments = paymentsResult.data || [];
      let bills = billsResult.data || [];

      payments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return paymentDate >= start && paymentDate <= end;
      });

      bills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return billDate >= start && billDate <= end;
      });

      const totalBills = bills.reduce(
        (sum: number, b: any) => sum + (b.total || 0),
        0,
      );
      const totalPayments = payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0,
      );
      const completedPayments = payments
        .filter((p: any) => p.status === "completed")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const summary = [
        ["REVENUE REPORT SUMMARY"],
        ["Generated:", new Date().toLocaleString()],
        [
          "Date Range:",
          `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["Total Bills Generated:", formatCurrency(totalBills)],
        ["Total Payments Received:", formatCurrency(totalPayments)],
        ["Confirmed/Completed Revenue:", formatCurrency(completedPayments)],
        [
          "Outstanding Balance:",
          formatCurrency(totalBills - completedPayments),
        ],
        [""],
        [
          "Overall Collection Rate:",
          `${totalBills > 0 ? ((completedPayments / totalBills) * 100).toFixed(2) : 0}%`,
        ],
      ];

      const finalData = [...summary];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Revenue Report");
      XLSX.writeFile(
        wb,
        `revenue_report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );
      toast.success("Revenue report generated successfully");
    } catch (error) {
      console.error("Error generating revenue report:", error);
      toast.error("Failed to generate revenue report");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateReport = () => {
    switch (reportType) {
      case "payments":
        generatePaymentsReport();
        break;
      case "users":
        generateUsersReport();
        break;
      case "bills":
        generateBillsReport();
        break;
      case "revenue":
        generateRevenueReport();
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Email Toggle */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-blue-100 mt-1">
              Generate and download financial and operational reports
            </p>
          </div>
          <div className="flex gap-3">
            {/* Email Toggle Button */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FiMail className="w-5 h-5 text-white" />
                  <span className="text-sm font-medium text-white">
                    Customer Email Alerts
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
                  {emailEnabled ? "Sending ON" : "Sending OFF"}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-[200px]">
                {emailEnabled
                  ? "Customers will receive email notifications"
                  : "Customer emails are DISABLED. Admin emails still work."}
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
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
              <p className="text-gray-500 text-sm">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalPayments)}
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
                {formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Apps</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.pendingApplications}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Generator Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiDownload className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Generate Report
            </h2>
            <p className="text-sm text-gray-500">
              Select report type and date range to generate Excel report
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setReportType("payments")}
                className={`px-4 py-3 rounded-lg border text-left transition-all ${
                  reportType === "payments"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FiCreditCard className="w-5 h-5 mb-2" />
                <p className="font-medium">Payments Report</p>
                <p className="text-xs text-gray-500">
                  All payment transactions
                </p>
              </button>
              <button
                onClick={() => setReportType("users")}
                className={`px-4 py-3 rounded-lg border text-left transition-all ${
                  reportType === "users"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FiUsers className="w-5 h-5 mb-2" />
                <p className="font-medium">Users Report</p>
                <p className="text-xs text-gray-500">All user accounts</p>
              </button>
              <button
                onClick={() => setReportType("bills")}
                className={`px-4 py-3 rounded-lg border text-left transition-all ${
                  reportType === "bills"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FiFileText className="w-5 h-5 mb-2" />
                <p className="font-medium">Bills Report</p>
                <p className="text-xs text-gray-500">All invoices and bills</p>
              </button>
              <button
                onClick={() => setReportType("revenue")}
                className={`px-4 py-3 rounded-lg border text-left transition-all ${
                  reportType === "revenue"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FiTrendingUp className="w-5 h-5 mb-2" />
                <p className="font-medium">Revenue Report</p>
                <p className="text-xs text-gray-500">Financial summary</p>
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions and Generate Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  );
                  setDateRange({
                    startDate: firstDay.toISOString().split("T")[0],
                    endDate: today.toISOString().split("T")[0],
                  });
                }}
                className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1,
                  );
                  const lastDay = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0,
                  );
                  setDateRange({
                    startDate: firstDay.toISOString().split("T")[0],
                    endDate: lastDay.toISOString().split("T")[0],
                  });
                }}
                className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left"
              >
                Last Month
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generating !== null}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  generating !== null
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {generating === reportType ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FiDownload className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What's Included */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-500" />
            What's Included in the Report
          </h3>
          <div className="space-y-3">
            {reportType === "payments" && (
              <>
                <p className="text-gray-600">
                  • Complete payment transaction list
                </p>
                <p className="text-gray-600">
                  • Payment status (Completed, Pending, Failed)
                </p>
                <p className="text-gray-600">
                  • Payment methods and reference numbers
                </p>
                <p className="text-gray-600">
                  • User information for each payment
                </p>
                <p className="text-gray-600">• Summary statistics and totals</p>
              </>
            )}
            {reportType === "users" && (
              <>
                <p className="text-gray-600">• Complete user account list</p>
                <p className="text-gray-600">• User roles and status</p>
                <p className="text-gray-600">
                  • Contact information (email, phone)
                </p>
                <p className="text-gray-600">• Plan subscription details</p>
                <p className="text-gray-600">
                  • Account creation and last login dates
                </p>
              </>
            )}
            {reportType === "bills" && (
              <>
                <p className="text-gray-600">• Complete bill/invoice list</p>
                <p className="text-gray-600">
                  • Bill status (Paid, Unpaid, Overdue)
                </p>
                <p className="text-gray-600">
                  • Breakdown of subtotal, tax, discount, total
                </p>
                <p className="text-gray-600">• Due dates and billing periods</p>
                <p className="text-gray-600">• Collection rate calculation</p>
              </>
            )}
            {reportType === "revenue" && (
              <>
                <p className="text-gray-600">• Overall revenue summary</p>
                <p className="text-gray-600">• Monthly revenue breakdown</p>
                <p className="text-gray-600">
                  • Bills generated vs payments received
                </p>
                <p className="text-gray-600">• Collection rate analysis</p>
                <p className="text-gray-600">• Outstanding balance tracking</p>
              </>
            )}
          </div>
        </div>

        {/* Export Format Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiAlertCircle className="w-5 h-5 text-blue-500" />
            Export Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">File Format</span>
              <span className="font-medium text-gray-900">
                Microsoft Excel (.xlsx)
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Compatible With</span>
              <span className="font-medium text-gray-900">
                Excel, Google Sheets, LibreOffice
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Includes Summary</span>
              <span className="font-medium text-green-600">Yes</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Auto-download</span>
              <span className="font-medium text-green-600">Yes</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Reports include data from the selected date
              range. For larger datasets, the report may take a few seconds to
              generate.
            </p>
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
                Customer email sending is currently{" "}
                {emailEnabled ? "ENABLED" : "DISABLED"}
              </p>
              <p className="text-sm text-gray-500">
                {emailEnabled
                  ? "Customers will receive all email notifications (invoices, reminders, approvals)"
                  : "Customers will NOT receive any emails. Admin notifications are still sent."}
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
            {togglingEmail ? (
              <>
                <FiLoader className="w-4 h-4 inline animate-spin mr-2" />
                Updating...
              </>
            ) : emailEnabled ? (
              "Disable Customer Emails"
            ) : (
              "Enable Customer Emails"
            )}
          </button>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>⚠️ Important:</strong> When disabled, customers will not
            receive:
          </p>
          <ul className="text-sm text-yellow-600 mt-2 list-disc list-inside">
            <li>Welcome emails after registration</li>
            <li>Invoice and billing notifications</li>
            <li>Payment confirmations</li>
            <li>Application approval/rejection emails</li>
            <li>Payment reminders and overdue notices</li>
          </ul>
          <p className="text-sm text-yellow-700 mt-2">
            Admin email notifications are always sent regardless of this
            setting.
          </p>
        </div>
      </div>
    </div>
  );
}
