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
  FiFilter,
  FiDownload,
  FiPrinter,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== TYPE DEFINITIONS ====================
interface Payment {
  _id: string;
  amount: number;
  referenceNumber: string;
  paymentMethod: string;
  paymentType: "subscription" | "installation" | "others";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  createdAt: string;
  paidAt?: string;
  applicationId?: any;
  application?: any;
  userId?: any;
  user?: any;
  billingId?: {
    _id: string;
    invoiceNumber: string;
    billingPeriod?: {
      start: string;
      end: string;
    };
  };
  paymentDetails?: {
    notes?: string;
    gatewayResponse?: {
      applicationId?: string;
      confirmationNotes?: string;
    };
    confirmedBy?: string;
    confirmedAt?: string;
    rejectionReason?: string;
  };
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  applicationId: string;
  address: string;
  floor?: string;
  unitNumber?: string;
  buildingName?: string;
}

interface ExtendedPayment extends Payment {
  _customerInfo?: CustomerInfo;
}

// ==================== HELPER FUNCTION TO GET CUSTOMER INFO ====================
function getCustomerInfo(payment: Payment): CustomerInfo {
  // Priority 1: Check if application object is populated
  if (payment.application) {
    const app = payment.application as any;
    return {
      name:
        `${app.firstName || ""} ${app.lastName || ""}`.trim() ||
        app.applicantName ||
        "—",
      email: app.email || "—",
      phone: app.phoneNumber || "—",
      applicationId: app.applicationId || payment.applicationId || "—",
      address: app.address || "—",
      floor: app.floor,
      unitNumber: app.unitNumber,
      buildingName: app.buildingName,
    };
  }

  // Priority 2: Check if applicationId is populated as object
  if (payment.applicationId && typeof payment.applicationId === "object") {
    const app = payment.applicationId as any;
    return {
      name: `${app.firstName || ""} ${app.lastName || ""}`.trim() || "—",
      email: app.email || "—",
      phone: app.phoneNumber || "—",
      applicationId: app.applicationId || app._id || "—",
      address: app.address || "—",
      floor: app.floor,
      unitNumber: app.unitNumber,
      buildingName: app.buildingName,
    };
  }

  // Priority 3: Check if userId is populated
  if (payment.userId && typeof payment.userId === "object") {
    const user = payment.userId as any;
    return {
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "—",
      email: user.email || "—",
      phone: user.phoneNumber || "—",
      applicationId: payment.applicationId || "—",
      address: user.address || "—",
    };
  }

  // Priority 4: Check if user object is populated
  if (payment.user) {
    const user = payment.user as any;
    return {
      name:
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "—",
      email: user.email || "—",
      phone: user.phoneNumber || "—",
      applicationId: payment.applicationId || "—",
      address: user.address || "—",
    };
  }

  // Fallback
  return {
    name: "—",
    email: "—",
    phone: "—",
    applicationId:
      typeof payment.applicationId === "string" ? payment.applicationId : "—",
    address: "—",
  };
}

// ==================== MAIN COMPONENT ====================
export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<ExtendedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedPayment, setSelectedPayment] =
    useState<ExtendedPayment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [sortField, setSortField] = useState<keyof Payment>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    monthlyAmount: 0,
    monthlyCount: 0,
    subscriptionAmount: 0,
    subscriptionCount: 0,
    installationFees: 0,
    installationFeeCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
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
          // Fetch all payments with filters - note: getAllPayments doesn't accept paymentType directly
          // We'll filter on the client side for payment type
          const allPaymentsResult = await getAllPayments({
            page: currentPage,
            limit: 20,
            status: statusFilter || undefined,
            forceRefresh: forceRefresh,
          });

          if (!isMountedRef.current) return;

          let paymentsList = (allPaymentsResult.data || []).map(
            (payment: Payment) => ({
              ...payment,
              _customerInfo: getCustomerInfo(payment),
            }),
          );

          // Apply payment type filter on client side
          if (paymentTypeFilter) {
            paymentsList = paymentsList.filter(
              (payment: ExtendedPayment) =>
                payment.paymentType === paymentTypeFilter,
            );
          }

          setPayments(paymentsList);
          setTotalPages(allPaymentsResult.totalPages || 1);
          setTotalRecords(allPaymentsResult.total || 0);

          // Fetch pending payments separately
          const pendingResult = await getPendingPayments(forceRefresh).catch(
            () => ({ data: [] }),
          );
          let pendingList = (pendingResult.data || []).map(
            (payment: Payment) => ({
              ...payment,
              _customerInfo: getCustomerInfo(payment),
            }),
          );

          // Apply payment type filter to pending payments
          if (paymentTypeFilter) {
            pendingList = pendingList.filter(
              (payment: ExtendedPayment) =>
                payment.paymentType === paymentTypeFilter,
            );
          }

          setPendingPayments(pendingList);

          // Update stats
          if (allPaymentsResult.stats) {
            // Calculate stats based on filtered payments if payment type filter is applied
            let totalAmount = allPaymentsResult.stats.total || 0;
            let totalCount = allPaymentsResult.stats.totalCount || 0;
            let subscriptionAmount = allPaymentsResult.stats.subscription || 0;
            let subscriptionCount =
              allPaymentsResult.stats.subscriptionCount || 0;
            let installationFees =
              allPaymentsResult.stats.installationFees || 0;
            let installationFeeCount =
              allPaymentsResult.stats.installationFeeCount || 0;

            // If payment type filter is applied, recalculate stats based on filtered data
            if (paymentTypeFilter === "subscription") {
              totalAmount = subscriptionAmount;
              totalCount = subscriptionCount;
            } else if (paymentTypeFilter === "installation") {
              totalAmount = installationFees;
              totalCount = installationFeeCount;
            }

            setStats({
              totalAmount: totalAmount,
              totalCount: totalCount,
              monthlyAmount: allPaymentsResult.stats.monthly || 0,
              monthlyCount: allPaymentsResult.stats.monthlyCount || 0,
              subscriptionAmount: subscriptionAmount,
              subscriptionCount: subscriptionCount,
              installationFees: installationFees,
              installationFeeCount: installationFeeCount,
              pendingAmount: allPaymentsResult.stats.pending || 0,
              pendingCount: allPaymentsResult.stats.pendingCount || 0,
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
    [currentPage, statusFilter, paymentTypeFilter],
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

  const handleSort = (field: keyof Payment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortedPayments = (
    paymentsList: ExtendedPayment[],
  ): ExtendedPayment[] => {
    return [...paymentsList].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "createdAt" || sortField === "paidAt") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const getFilteredPayments = (
    paymentsList: ExtendedPayment[],
  ): ExtendedPayment[] => {
    if (!search.trim()) return paymentsList;

    const searchLower = search.toLowerCase();
    return paymentsList.filter((payment) => {
      const customerInfo = payment._customerInfo || getCustomerInfo(payment);
      return (
        customerInfo.name.toLowerCase().includes(searchLower) ||
        customerInfo.email.toLowerCase().includes(searchLower) ||
        customerInfo.applicationId.toLowerCase().includes(searchLower) ||
        payment.referenceNumber?.toLowerCase().includes(searchLower) ||
        payment.billingId?.invoiceNumber?.toLowerCase().includes(searchLower) ||
        payment.amount?.toString().includes(searchLower)
      );
    });
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

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "subscription":
        return "bg-purple-100 text-purple-800";
      case "installation":
        return "bg-orange-100 text-orange-800";
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

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon = ({ field }: { field: keyof Payment }) => {
    if (sortField !== field)
      return <FiChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiChevronUp className="w-3 h-3" />
    ) : (
      <FiChevronDown className="w-3 h-3" />
    );
  };

  const filteredPayments = getFilteredPayments(payments);
  const sortedPayments = getSortedPayments(filteredPayments);

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">
          View, confirm, and manage customer payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <p className="text-sm text-gray-500">Subscription Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.subscriptionAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.subscriptionCount} subscriptions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Installation Fees</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.installationFees)}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.installationFeeCount} installations
          </p>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <FiClock className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {pendingPayments.length} Pending Payment
                {pendingPayments.length !== 1 ? "s" : ""} Need Confirmation
              </p>
              <p className="text-sm text-yellow-700">
                Total pending amount:{" "}
                {formatCurrency(
                  pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
                )}
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

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-100">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, email, application ID, reference number, or amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {(statusFilter || paymentTypeFilter) && (
                <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
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

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
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
              <select
                value={paymentTypeFilter}
                onChange={(e) => {
                  setPaymentTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Payment Types</option>
                <option value="subscription">Subscription</option>
                <option value="installation">Installation Fee</option>
                <option value="others">Others</option>
              </select>
              {(statusFilter || paymentTypeFilter) && (
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setPaymentTypeFilter("");
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-red-600 hover:text-red-800 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiClock className="w-5 h-5 text-yellow-600" />
            Pending Confirmation ({pendingPayments.length})
          </h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment) => {
                    const customerInfo =
                      payment._customerInfo || getCustomerInfo(payment);
                    return (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatShortDate(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {customerInfo.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {customerInfo.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">
                            {customerInfo.applicationId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-900">
                            {payment.referenceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeColor(payment.paymentType)}`}
                          >
                            {payment.paymentType === "installation"
                              ? "Installation"
                              : payment.paymentType === "subscription"
                                ? "Subscription"
                                : "Other"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                            <span>
                              {getPaymentMethodIcon(payment.paymentMethod)}
                            </span>
                            <span className="capitalize">
                              {payment.paymentMethod}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              disabled={confirming}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <FiCheckCircle className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              disabled={rejecting}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <FiXCircle className="w-3 h-3" />
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition"
                            >
                              <FiEye className="w-3 h-3" />
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

      {/* All Payments - Excel-like Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClipboard className="w-5 h-5 text-gray-500" />
              Payment Records
            </h2>
            <span className="text-sm text-gray-500">
              {filteredPayments.length} of {totalRecords} records
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                /* TODO: Export to CSV */
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
            >
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Date <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th
                  onClick={() => handleSort("referenceNumber")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Reference <SortIcon field="referenceNumber" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount <SortIcon field="amount" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FiInfo className="w-8 h-8 text-gray-300" />
                      <p>No payments found</p>
                      <p className="text-xs text-gray-400">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedPayments.map((payment) => {
                  const customerInfo =
                    payment._customerInfo || getCustomerInfo(payment);
                  return (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">
                            {formatShortDate(payment.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(payment.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {customerInfo.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customerInfo.email}
                          </p>
                          {customerInfo.phone !== "—" && (
                            <p className="text-xs text-gray-400">
                              {customerInfo.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {customerInfo.applicationId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-900">
                          {payment.referenceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          {payment.billingId?.invoiceNumber || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeColor(payment.paymentType || "subscription")}`}
                        >
                          {payment.paymentType === "installation"
                            ? "Installation"
                            : payment.paymentType === "subscription"
                              ? "Subscription"
                              : "Other"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${payment.status === "completed" ? "text-green-600" : payment.status === "pending" ? "text-yellow-600" : "text-gray-900"}`}
                        >
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                          <span>
                            {getPaymentMethodIcon(payment.paymentMethod)}
                          </span>
                          <span className="capitalize">
                            {payment.paymentMethod}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                        {payment.paidAt && payment.status === "completed" && (
                          <p className="text-xs text-gray-400 mt-1">
                            Paid: {formatShortDate(payment.paidAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between bg-gray-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              <FiChevronLeft />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                {Array.from(
                  { length: Math.min(totalPages, 50) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
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
            <div className="p-6">
              {/* Payment Information */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reference Number</p>
                    <p className="font-mono text-sm">
                      {selectedPayment.referenceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="capitalize">
                      {selectedPayment.paymentMethod}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Type</p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeColor(selectedPayment.paymentType || "subscription")}`}
                    >
                      {selectedPayment.paymentType === "installation"
                        ? "Installation"
                        : selectedPayment.paymentType === "subscription"
                          ? "Subscription"
                          : "Other"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}
                    >
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date Created</p>
                    <p>{formatDate(selectedPayment.createdAt)}</p>
                  </div>
                  {selectedPayment.paidAt && (
                    <div>
                      <p className="text-xs text-gray-500">Date Paid</p>
                      <p>{formatDate(selectedPayment.paidAt)}</p>
                    </div>
                  )}
                  {selectedPayment.billingId?.invoiceNumber && (
                    <div>
                      <p className="text-xs text-gray-500">Invoice Number</p>
                      <p className="font-mono text-sm">
                        {selectedPayment.billingId.invoiceNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Customer Information
                </h3>
                {(() => {
                  const customerInfo =
                    selectedPayment._customerInfo ||
                    getCustomerInfo(selectedPayment);
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-medium">{customerInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p>{customerInfo.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p>{customerInfo.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Application ID</p>
                        <p className="font-mono">
                          {customerInfo.applicationId}
                        </p>
                      </div>
                      {customerInfo.buildingName && (
                        <div>
                          <p className="text-xs text-gray-500">Building</p>
                          <p>{customerInfo.buildingName}</p>
                        </div>
                      )}
                      {(customerInfo.floor || customerInfo.unitNumber) && (
                        <div>
                          <p className="text-xs text-gray-500">Unit</p>
                          <p>
                            Floor {customerInfo.floor || "-"}, Unit{" "}
                            {customerInfo.unitNumber || "-"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Notes */}
              {(selectedPayment.paymentDetails?.notes ||
                selectedPayment.paymentDetails?.gatewayResponse
                  ?.confirmationNotes ||
                selectedPayment.paymentDetails?.rejectionReason) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Notes
                  </h3>
                  {selectedPayment.paymentDetails?.notes && (
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">
                        Customer Notes:
                      </p>
                      <p className="text-sm">
                        {selectedPayment.paymentDetails.notes}
                      </p>
                    </div>
                  )}
                  {selectedPayment.paymentDetails?.gatewayResponse
                    ?.confirmationNotes && (
                    <div className="mb-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-500 mb-1">
                        Confirmation Notes:
                      </p>
                      <p className="text-sm">
                        {
                          selectedPayment.paymentDetails.gatewayResponse
                            .confirmationNotes
                        }
                      </p>
                    </div>
                  )}
                  {selectedPayment.paymentDetails?.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-500 mb-1">
                        Rejection Reason:
                      </p>
                      <p className="text-sm">
                        {selectedPayment.paymentDetails.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Metadata */}
              {selectedPayment.paymentDetails?.confirmedBy && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Confirmation Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Confirmed By</p>
                      <p>{selectedPayment.paymentDetails.confirmedBy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Confirmed At</p>
                      <p>
                        {formatDate(
                          selectedPayment.paymentDetails.confirmedAt || "",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
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
