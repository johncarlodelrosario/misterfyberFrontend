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
// This function handles both populated application object and applicationId (string)
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
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Load payments from API
  const loadPayments = useCallback(
    async (forceRefresh = false) => {
      // Prevent duplicate loads
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
          // Fetch both all payments and pending payments in parallel
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
            setStats({
              totalAmount: allPaymentsResult.stats.total || 0,
              totalCount: allPaymentsResult.stats.totalCount || 0,
              monthlyAmount: allPaymentsResult.stats.monthly || 0,
              monthlyCount: allPaymentsResult.stats.monthlyCount || 0,
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
    return `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    // First filter individual payments
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

    // Then group by customer
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">
          View, confirm, and manage customer payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.totalCount} transactions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthlyAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.monthlyCount} this month
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingPayments.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Awaiting confirmation</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">All time</p>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FiClock className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {pendingPayments.length} Pending Payment
                {pendingPayments.length !== 1 ? "s" : ""} Need Confirmation
              </p>
              <p className="text-sm text-yellow-700">
                Please review and confirm these payments to update customer
                accounts. Confirmed payments will automatically mark bills as
                paid and send email notifications.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition flex items-center gap-2"
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
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, application ID, or reference number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
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
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer / Application
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment: Payment) => {
                    const customerInfo = getCustomerInfo(payment);
                    return (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">
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
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
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
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              disabled={confirming}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              disabled={rejecting}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <FiXCircle className="w-4 h-4" />
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition"
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

      {/* All Payments Table - Grouped by Customer */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 p-6 border-b flex items-center gap-2">
          <FiClipboard className="w-5 h-5 text-gray-500" />
          All Payments
          <span className="text-sm text-gray-400 ml-2">
            (Grouped by customer - {filteredAndGroupedPayments.length}{" "}
            customers)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                <FiUser className="w-4 h-4 text-gray-400" />
                                {group.customerInfo.name}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <FiMail className="w-3 h-3" />
                                {group.customerInfo.email}
                              </p>
                              {group.customerInfo.phone !== "—" && (
                                <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                  <FiPhone className="w-3 h-3" />
                                  {group.customerInfo.phone}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                <FiHash className="w-3 h-3" />
                                App ID: {group.customerInfo.applicationId}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              {hasMultiplePayments ? (
                                <>
                                  <p className="text-sm text-gray-600">
                                    {group.payments.length} payment records
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    Click expand to view details
                                  </p>
                                </>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-sm font-mono text-gray-900">
                                    Ref: {group.payments[0].referenceNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Method:{" "}
                                    <span className="capitalize">
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
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(group.totalAmount)}
                              </p>
                              {hasMultiplePayments && (
                                <p className="text-xs text-gray-400">
                                  (Total of {group.payments.length} payments)
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {group.payments.length} payment
                              {group.payments.length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600">
                              {formatDate(group.earliestPaymentDate)}
                              {group.payments.length > 1 && (
                                <>
                                  <br />
                                  <span className="text-xs text-gray-400">
                                    to
                                  </span>
                                  <br />
                                  {formatDate(group.latestPaymentDate)}
                                </>
                              )}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {hasMultiplePayments && (
                                <button
                                  onClick={() =>
                                    setExpandedCustomer(
                                      isExpanded
                                        ? null
                                        : group.customerInfo.applicationId,
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 transition text-sm flex items-center gap-1"
                                >
                                  {isExpanded ? "Hide Details" : "Show Details"}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setSelectedPayment(group.payments[0])
                                }
                                className="text-gray-600 hover:text-gray-800 transition text-sm flex items-center gap-1"
                                title="View Latest Payment"
                              >
                                <FiEye className="w-4 h-4" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row (shows all payments for this customer) */}
                        {isExpanded && hasMultiplePayments && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="border-l-4 border-blue-400 pl-4">
                                <p className="font-semibold text-gray-900 mb-3">
                                  All Payment Records:
                                </p>
                                <div className="space-y-3">
                                  {group.payments.map(
                                    (payment: Payment, idx: number) => (
                                      <div
                                        key={payment._id}
                                        className="bg-white rounded-lg p-3 border border-gray-200"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Date
                                            </p>
                                            <p className="text-sm font-medium">
                                              {formatDate(payment.createdAt)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Reference
                                            </p>
                                            <p className="text-sm font-mono">
                                              {payment.referenceNumber}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Amount
                                            </p>
                                            <p className="text-sm font-semibold text-green-600">
                                              {formatCurrency(payment.amount)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Status
                                            </p>
                                            <span
                                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}
                                            >
                                              {payment.status}
                                            </span>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Method
                                            </p>
                                            <p className="text-sm capitalize">
                                              {payment.paymentMethod}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-gray-500">
                                              Invoice
                                            </p>
                                            <p className="text-sm">
                                              {payment.billingId
                                                ?.invoiceNumber || "-"}
                                            </p>
                                          </div>
                                          <div className="md:col-span-2">
                                            <button
                                              onClick={() =>
                                                setSelectedPayment(payment)
                                              }
                                              className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                              View Full Details →
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                  )}
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
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronLeft />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiClipboard className="w-5 h-5" />
                  Payment Details
                </h2>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Reference:</span>
                  <span className="font-mono text-gray-900">
                    {selectedPayment.referenceNumber}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Method:</span>
                  <span className="capitalize text-gray-900">
                    {selectedPayment.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-900">
                    {formatDate(selectedPayment.createdAt)}
                  </span>
                </div>
                {selectedPayment.paidAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Paid Date:</span>
                    <span className="text-gray-900">
                      {formatDate(selectedPayment.paidAt)}
                    </span>
                  </div>
                )}
                {selectedPayment.billingId && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Invoice:</span>
                    <span className="font-mono text-gray-900">
                      {selectedPayment.billingId.invoiceNumber}
                    </span>
                  </div>
                )}

                {/* Customer Information Section */}
                <div className="py-2 border-b">
                  <span className="text-gray-500 font-semibold">
                    Customer Information:
                  </span>
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const customerInfo = getCustomerInfo(selectedPayment);
                      return (
                        <>
                          <div className="flex items-start gap-2">
                            <FiUser className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Name</p>
                              <p className="font-medium text-gray-900">
                                {customerInfo.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <FiMail className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="text-gray-900">
                                {customerInfo.email}
                              </p>
                            </div>
                          </div>
                          {customerInfo.phone !== "—" && (
                            <div className="flex items-start gap-2">
                              <FiPhone className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="text-gray-900">
                                  {customerInfo.phone}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <FiHash className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">
                                Application ID
                              </p>
                              <p className="font-mono text-gray-900">
                                {customerInfo.applicationId}
                              </p>
                            </div>
                          </div>
                          {customerInfo.address !== "—" && (
                            <div className="flex items-start gap-2">
                              <FiFileText className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-500">Address</p>
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
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      {confirming ? "Processing..." : "Confirm Payment"}
                    </button>
                    <button
                      onClick={() => handleRejectPayment(selectedPayment._id)}
                      disabled={rejecting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiXCircle className="w-4 h-4" />
                      {rejecting ? "Processing..." : "Reject"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
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
