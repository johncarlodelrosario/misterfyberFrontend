// app/(dashboard)/admin/payments/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllPayments,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
} from "@/services/admin";
import {
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiClock,
  FiClipboard,
  FiX,
  FiUser,
  FiFileText,
  FiInfo,
  FiMail,
  FiPhone,
  FiHash,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== TYPE DEFINITIONS ====================
interface Payment {
  _id: string;
  amount: number;
  referenceNumber: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  applicationId?: any;
  application?: any;
  applicationData?: any;
  userId?: any;
  user?: any;
  billingId?: {
    invoiceNumber: string;
  };
  paymentDetails?: {
    notes?: string;
    gatewayResponse?: {
      applicationId?: string;
      confirmationNotes?: string;
    };
  };
  readableApplicationId?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  applicationId: string;
  address: string;
}

interface PaymentGroup {
  customerInfo: CustomerInfo;
  payments: Payment[];
  totalAmount: number;
  latestPaymentDate: string;
  earliestPaymentDate: string;
}

// ==================== HELPER FUNCTION TO GET CUSTOMER INFO ====================
function getCustomerInfo(payment: Payment): CustomerInfo {
  // Priority 1: Check if application object is populated (from backend fix)
  if (payment.application) {
    const app = payment.application;
    return {
      name:
        app.applicantName ||
        `${app.firstName || ""} ${app.lastName || ""}`.trim() ||
        "—",
      email: app.email || "—",
      phone: app.phoneNumber || "—",
      applicationId: app.applicationId || payment.applicationId || "—",
      address: app.address || "—",
    };
  }

  // Priority 2: Check if applicationData is populated (alternative field)
  if (payment.applicationData) {
    const app = payment.applicationData;
    return {
      name:
        app.applicantName ||
        `${app.firstName || ""} ${app.lastName || ""}`.trim() ||
        "—",
      email: app.email || "—",
      phone: app.phoneNumber || "—",
      applicationId: app.applicationId || payment.applicationId || "—",
      address: app.address || "—",
    };
  }

  // Priority 3: Check if applicationId is populated as object (from populate)
  if (payment.applicationId && typeof payment.applicationId === "object") {
    const app = payment.applicationId;
    return {
      name: `${app.firstName || ""} ${app.lastName || ""}`.trim() || "—",
      email: app.email || "—",
      phone: app.phoneNumber || "—",
      applicationId: app.applicationId || app._id || "—",
      address: app.address || "—",
    };
  }

  // Priority 4: Check if userId is populated
  if (payment.userId && typeof payment.userId === "object") {
    const user = payment.userId;
    return {
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "—",
      email: user.email || "—",
      phone: user.phoneNumber || "—",
      applicationId: payment.applicationId || "—",
      address: "—",
    };
  }

  // Priority 5: Check if user object is populated
  if (payment.user) {
    const user = payment.user;
    return {
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "—",
      email: user.email || "—",
      phone: user.phoneNumber || "—",
      applicationId: payment.applicationId || "—",
      address: "—",
    };
  }

  // Priority 6: Check paymentDetails for applicationId
  if (payment.paymentDetails?.gatewayResponse?.applicationId) {
    return {
      name: "—",
      email: "—",
      phone: "—",
      applicationId: payment.paymentDetails.gatewayResponse.applicationId,
      address: "—",
    };
  }

  // Priority 7: Check readableApplicationId
  if (payment.readableApplicationId) {
    return {
      name: "—",
      email: "—",
      phone: "—",
      applicationId: payment.readableApplicationId,
      address: "—",
    };
  }

  // Fallback: use raw applicationId string
  return {
    name: "—",
    email: "—",
    phone: "—",
    applicationId:
      typeof payment.applicationId === "string"
        ? payment.applicationId
        : payment.applicationId?._id || "—",
    address: "—",
  };
}

// ==================== HELPER FUNCTION TO GROUP PAYMENTS BY CUSTOMER ====================
function groupPaymentsByCustomer(payments: Payment[]): PaymentGroup[] {
  const grouped = new Map<string, PaymentGroup>();

  payments.forEach((payment) => {
    const customerInfo = getCustomerInfo(payment);
    const customerKey =
      customerInfo.applicationId ||
      customerInfo.email ||
      payment.userId?._id ||
      payment.userId ||
      "unknown";

    if (!grouped.has(customerKey)) {
      grouped.set(customerKey, {
        customerInfo,
        payments: [],
        totalAmount: 0,
        latestPaymentDate: payment.createdAt,
        earliestPaymentDate: payment.createdAt,
      });
    }

    const group = grouped.get(customerKey)!;
    group.payments.push(payment);
    group.totalAmount += payment.amount || 0;

    if (new Date(payment.createdAt) > new Date(group.latestPaymentDate)) {
      group.latestPaymentDate = payment.createdAt;
    }
    if (new Date(payment.createdAt) < new Date(group.earliestPaymentDate)) {
      group.earliestPaymentDate = payment.createdAt;
    }
  });

  return Array.from(grouped.values());
}

// ==================== MAIN COMPONENT ====================
export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    monthlyAmount: 0,
    monthlyCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    completedAmount: 0,
    completedCount: 0,
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Load payments from API
  const loadPayments = useCallback(
    async (forceRefresh = false) => {
      if (loadPromiseRef.current && !forceRefresh) {
        return loadPromiseRef.current;
      }

      const loadPromise = (async () => {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const [allPaymentsResult, pendingResult] = await Promise.all([
            getAllPayments({
              page: currentPage,
              limit: 10,
              status: status || undefined,
              forceRefresh: forceRefresh,
            }),
            getPendingPayments(forceRefresh).catch(() => ({ data: [] })),
          ]);

          if (!isMountedRef.current) return;

          const paymentsList = allPaymentsResult.data || [];
          const pendingList = pendingResult.data || [];

          setPayments(paymentsList);
          setTotalPages(allPaymentsResult.totalPages || 1);
          setPendingPayments(pendingList);

          if (allPaymentsResult.stats) {
            // Calculate additional stats from the payments list
            const totalCompleted = paymentsList
              .filter((p: Payment) => p.status === "completed")
              .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
            const totalPendingAmount = paymentsList
              .filter((p: Payment) => p.status === "pending")
              .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
            const pendingCount = paymentsList.filter(
              (p: Payment) => p.status === "pending",
            ).length;
            const completedCount = paymentsList.filter(
              (p: Payment) => p.status === "completed",
            ).length;

            setStats({
              totalAmount: allPaymentsResult.stats.total || 0,
              totalCount: allPaymentsResult.stats.totalCount || 0,
              monthlyAmount: allPaymentsResult.stats.monthly || 0,
              monthlyCount: allPaymentsResult.stats.monthlyCount || 0,
              pendingAmount: totalPendingAmount,
              pendingCount: pendingCount,
              completedAmount: totalCompleted,
              completedCount: completedCount,
            });
          }
        } catch (error: any) {
          console.error("Failed to load payments:", error);
          if (error.response?.status === 403) {
            toast.error("You don't have permission to view payments");
          } else if (!forceRefresh) {
            toast.error("Failed to load payments");
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
            setRefreshing(false);
          }
          loadPromiseRef.current = null;
        }
      })();

      loadPromiseRef.current = loadPromise;
      return loadPromise;
    },
    [currentPage, status],
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadPayments();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadPayments]);

  const handleRefresh = () => {
    loadPayments(true);
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (
      !confirm(
        "Confirm this payment? This will:\n✓ Mark the bill as paid\n✓ Update customer's balance\n✓ Send confirmation email to customer\n✓ Reactivate service if suspended",
      )
    )
      return;

    setConfirming(true);
    try {
      await confirmPayment(paymentId);
      toast.success(
        "✅ Payment confirmed! Customer has been notified via email.",
      );
      loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Failed to confirm payment";
      toast.error(errorMsg);
      console.error("Confirm payment error:", error);
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt(
      "Enter reason for rejection (this will be sent to the customer):",
    );
    if (reason === null) return;

    if (reason.trim() === "") {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setRejecting(true);
    try {
      await rejectPayment(paymentId, reason);
      toast.success("❌ Payment rejected. Customer has been notified.");
      loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Failed to reject payment";
      toast.error(errorMsg);
      console.error("Reject payment error:", error);
    } finally {
      setRejecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "manual":
        return "💵";
      case "gcash":
        return "📱";
      case "maya":
        return "💳";
      case "paymongo":
        return "🏦";
      case "dragonpay":
        return "🐉";
      default:
        return "💵";
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter and group payments based on search
  const filteredAndGroupedPayments: PaymentGroup[] = (() => {
    const filtered = payments.filter((payment: Payment) => {
      const customerInfo = getCustomerInfo(payment);
      const searchLower = search.toLowerCase();

      return (
        customerInfo.name.toLowerCase().includes(searchLower) ||
        customerInfo.email.toLowerCase().includes(searchLower) ||
        customerInfo.applicationId.toLowerCase().includes(searchLower) ||
        payment.referenceNumber?.toLowerCase().includes(searchLower) ||
        payment.billingId?.invoiceNumber?.toLowerCase().includes(searchLower)
      );
    });

    return groupPaymentsByCustomer(filtered);
  })();

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">
          View, confirm, and manage customer payments
        </p>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-3">
            {stats.totalCount} total transactions
          </p>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">
                Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {formatCurrency(stats.monthlyAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            {stats.monthlyCount} payments this month
          </p>
        </div>

        {/* Pending Payments Card */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-5 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center">
              <FiClock className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
          <p className="text-xs text-yellow-600 mt-3">
            {stats.pendingCount} pending confirmations
          </p>
        </div>

        {/* Completed Payments Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Completed</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">
                {formatCurrency(stats.completedAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-purple-700" />
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-3">
            {stats.completedCount} successful payments
          </p>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <FiAlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800 text-lg">
                {pendingPayments.length} Pending Payment
                {pendingPayments.length !== 1 ? "s" : ""} Need Confirmation
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Please review and confirm these payments to update customer
                accounts. Confirmed payments will automatically mark bills as
                paid and send email notifications.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition flex items-center gap-2 font-medium"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, application ID, or reference number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50 font-medium"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiClock className="w-5 h-5 text-yellow-600" />
            Pending Confirmation
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer / Application
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment: Payment) => {
                    const customerInfo = getCustomerInfo(payment);
                    return (
                      <tr
                        key={payment._id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                              <FiUser className="w-4 h-4 text-gray-400" />
                              {customerInfo.name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <FiMail className="w-3 h-3" />
                              {customerInfo.email}
                            </p>
                            {customerInfo.phone !== "—" && (
                              <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                <FiPhone className="w-3 h-3" />
                                {customerInfo.phone}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                              <FiHash className="w-3 h-3" />
                              App ID: {customerInfo.applicationId}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {payment.referenceNumber}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium">
                            <span>
                              {getPaymentMethodIcon(payment.paymentMethod)}
                            </span>
                            <span className="capitalize">
                              {payment.paymentMethod}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {payment.paymentDetails?.notes || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              disabled={confirming}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50 font-medium"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              disabled={rejecting}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1 disabled:opacity-50 font-medium"
                            >
                              <FiXCircle className="w-4 h-4" />
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition"
                              title="View Details"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All Payments Table - Grouped by Customer - FIXED ALIGNMENT */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <FiClipboard className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              All Payments
            </h2>
            <span className="text-sm text-gray-500 ml-2">
              (Grouped by customer - {filteredAndGroupedPayments.length}{" "}
              customers)
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[280px]">
                  Customer Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px]">
                  Payment Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Payment Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndGroupedPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FiInfo className="w-8 h-8 text-gray-300" />
                      <p>No payments found</p>
                      <p className="text-xs text-gray-400">
                        Try adjusting your search or filter
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndGroupedPayments.map(
                  (group: PaymentGroup, index: number) => {
                    const isExpanded =
                      expandedCustomer === group.customerInfo.applicationId;
                    const hasMultiplePayments = group.payments.length > 1;

                    return (
                      <tbody key={index} className="divide-y divide-gray-200">
                        {/* Customer Summary Row */}
                        <tr className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 align-top">
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                <FiUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span>{group.customerInfo.name}</span>
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <FiMail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {group.customerInfo.email}
                                </span>
                              </p>
                              {group.customerInfo.phone !== "—" && (
                                <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                  <FiPhone className="w-3 h-3 flex-shrink-0" />
                                  <span>{group.customerInfo.phone}</span>
                                </p>
                              )}
                              <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                <FiHash className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  App ID: {group.customerInfo.applicationId}
                                </span>
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div>
                              {hasMultiplePayments ? (
                                <>
                                  <p className="text-sm text-gray-600">
                                    {group.payments.length} payment records
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1 font-medium">
                                    Click "Show Details" to view
                                  </p>
                                </>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-mono text-gray-900 break-all">
                                    Ref: {group.payments[0].referenceNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Method:{" "}
                                    <span className="capitalize font-medium">
                                      {group.payments[0].paymentMethod}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Status:{" "}
                                    <span
                                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(group.payments[0].status)}`}
                                    >
                                      {group.payments[0].status}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(group.totalAmount)}
                              </p>
                              {hasMultiplePayments && (
                                <p className="text-xs text-gray-400 mt-1">
                                  (Total of {group.payments.length})
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {group.payments.length} payment
                              {group.payments.length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="text-sm text-gray-600">
                              <div>{formatDate(group.earliestPaymentDate)}</div>
                              {group.payments.length > 1 && (
                                <>
                                  <div className="text-xs text-gray-400 my-0.5">
                                    to
                                  </div>
                                  <div>
                                    {formatDate(group.latestPaymentDate)}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top whitespace-nowrap">
                            <div className="flex gap-3">
                              {hasMultiplePayments && (
                                <button
                                  onClick={() =>
                                    setExpandedCustomer(
                                      isExpanded
                                        ? null
                                        : group.customerInfo.applicationId,
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 transition text-sm font-medium"
                                >
                                  {isExpanded ? "Hide Details" : "Show Details"}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setSelectedPayment(group.payments[0])
                                }
                                className="text-gray-600 hover:text-gray-900 transition text-sm flex items-center gap-1"
                                title="View Latest Payment"
                              >
                                <FiEye className="w-4 h-4" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && hasMultiplePayments && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="border-l-4 border-blue-400 pl-4">
                                <p className="font-semibold text-gray-900 mb-3">
                                  All Payment Records:
                                </p>
                                <div className="space-y-3">
                                  {group.payments.map((payment: Payment) => (
                                    <div
                                      key={payment._id}
                                      className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Date
                                          </p>
                                          <p className="text-sm">
                                            {formatDate(payment.createdAt)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Reference
                                          </p>
                                          <p className="text-sm font-mono break-all">
                                            {payment.referenceNumber}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Amount
                                          </p>
                                          <p className="text-sm font-semibold text-green-600">
                                            {formatCurrency(payment.amount)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Status
                                          </p>
                                          <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${getStatusColor(payment.status)}`}
                                          >
                                            {payment.status}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Method
                                          </p>
                                          <p className="text-sm capitalize">
                                            {payment.paymentMethod}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 font-medium">
                                            Invoice
                                          </p>
                                          <p className="text-sm font-mono">
                                            {payment.billingId?.invoiceNumber ||
                                              "-"}
                                          </p>
                                        </div>
                                        <div className="lg:col-span-2">
                                          <button
                                            onClick={() =>
                                              setSelectedPayment(payment)
                                            }
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                          >
                                            View Full Details
                                            <FiEye className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              <FiChevronLeft />
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiClipboard className="w-5 h-5 text-gray-500" />
                  Payment Details
                </h2>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Reference:</span>
                  <span className="font-mono text-gray-900 text-sm">
                    {selectedPayment.referenceNumber}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Method:</span>
                  <span className="capitalize text-gray-900">
                    {selectedPayment.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-900">
                    {formatDate(selectedPayment.createdAt)}
                  </span>
                </div>
                {selectedPayment.paidAt && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Paid Date:</span>
                    <span className="text-gray-900">
                      {formatDate(selectedPayment.paidAt)}
                    </span>
                  </div>
                )}
                {selectedPayment.billingId && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Invoice:</span>
                    <span className="font-mono text-gray-900">
                      {selectedPayment.billingId.invoiceNumber}
                    </span>
                  </div>
                )}

                {/* Customer Information Section */}
                <div className="py-2">
                  <span className="text-gray-500 font-semibold block mb-2">
                    Customer Information:
                  </span>
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    {(() => {
                      const customerInfo = getCustomerInfo(selectedPayment);
                      return (
                        <>
                          <div className="flex items-start gap-2">
                            <FiUser className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Name</p>
                              <p className="font-medium text-gray-900">
                                {customerInfo.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FiMail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="text-gray-900 break-all">
                                {customerInfo.email}
                              </p>
                            </div>
                          </div>
                          {customerInfo.phone !== "—" && (
                            <div className="flex items-start gap-2">
                              <FiPhone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="text-gray-900">
                                  {customerInfo.phone}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <FiHash className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Application ID
                              </p>
                              <p className="font-mono text-gray-900 break-all">
                                {customerInfo.applicationId}
                              </p>
                            </div>
                          </div>
                          {customerInfo.address !== "—" && (
                            <div className="flex items-start gap-2">
                              <FiFileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-500">Address</p>
                                <p className="text-gray-900">
                                  {customerInfo.address}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {selectedPayment.paymentDetails?.notes && (
                  <div className="py-2">
                    <span className="text-gray-500">Notes:</span>
                    <p className="mt-1 text-sm bg-gray-100 p-2 rounded text-gray-700">
                      {selectedPayment.paymentDetails.notes}
                    </p>
                  </div>
                )}
                {selectedPayment.paymentDetails?.gatewayResponse
                  ?.confirmationNotes && (
                  <div className="py-2">
                    <span className="text-gray-500">Admin Notes:</span>
                    <p className="mt-1 text-sm bg-blue-50 p-2 rounded text-blue-700">
                      {
                        selectedPayment.paymentDetails.gatewayResponse
                          .confirmationNotes
                      }
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                {selectedPayment.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleConfirmPayment(selectedPayment._id)}
                      disabled={confirming}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      {confirming ? "Processing..." : "Confirm Payment"}
                    </button>
                    <button
                      onClick={() => handleRejectPayment(selectedPayment._id)}
                      disabled={rejecting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                    >
                      <FiXCircle className="w-4 h-4" />
                      {rejecting ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
