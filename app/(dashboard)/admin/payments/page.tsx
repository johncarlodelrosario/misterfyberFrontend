// app/(dashboard)/admin/payments/page.tsx - COMPLETE WITH PRE-LOADING AND CACHING (FIXED)
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
  FiDollarSign,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== CACHE KEYS ====================
const CACHE_KEYS = {
  PAYMENTS_DATA: "misterfyber_payments_data",
  PAYMENTS_TIMESTAMP: "misterfyber_payments_timestamp",
  PAYMENTS_STATS: "misterfyber_payments_stats",
  PENDING_PAYMENTS: "misterfyber_pending_payments",
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Storage wrapper
const paymentsStorage = {
  setItem: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Failed to save payments data:", e);
    }
  },
  getItem: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    monthlyAmount: 0,
    monthlyCount: 0,
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Load from cache first
  const loadFromCache = useCallback(() => {
    try {
      const cachedPayments = paymentsStorage.getItem(CACHE_KEYS.PAYMENTS_DATA);
      const cachedTimestamp = paymentsStorage.getItem(
        CACHE_KEYS.PAYMENTS_TIMESTAMP,
      );
      const cachedStats = paymentsStorage.getItem(CACHE_KEYS.PAYMENTS_STATS);
      const cachedPending = paymentsStorage.getItem(
        CACHE_KEYS.PENDING_PAYMENTS,
      );

      if (
        cachedPayments &&
        cachedTimestamp &&
        Date.now() - cachedTimestamp < CACHE_DURATION
      ) {
        console.log("📦 Loading payments data from cache");
        setPayments(cachedPayments);
        if (cachedPending) setPendingPayments(cachedPending);
        if (cachedStats) setStats(cachedStats);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load from cache:", error);
      return false;
    }
  }, []);

  const loadPayments = useCallback(
    async (forceRefresh = false) => {
      // Try cache first if not force refresh
      if (!forceRefresh && loadFromCache()) {
        setLoading(false);
      }

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
          // FIXED: Removed forceRefresh from getAllPayments params since it's not supported
          const [allPaymentsResult, pendingResult] = await Promise.all([
            getAllPayments({
              page: currentPage,
              limit: 10,
              status: status || undefined,
            }),
            getPendingPayments().catch(() => ({ data: [] })),
          ]);

          if (!isMountedRef.current) return;

          const paymentsList = allPaymentsResult.data || [];
          const pendingList = pendingResult.data || [];

          setPayments(paymentsList);
          setTotalPages(allPaymentsResult.totalPages || 1);
          setPendingPayments(pendingList);

          if (allPaymentsResult.stats) {
            const newStats = {
              totalAmount: allPaymentsResult.stats.total || 0,
              totalCount: allPaymentsResult.stats.totalCount || 0,
              monthlyAmount: allPaymentsResult.stats.monthly || 0,
              monthlyCount: allPaymentsResult.stats.monthlyCount || 0,
            };
            setStats(newStats);

            // Save to cache
            paymentsStorage.setItem(CACHE_KEYS.PAYMENTS_DATA, paymentsList);
            paymentsStorage.setItem(CACHE_KEYS.PAYMENTS_TIMESTAMP, Date.now());
            paymentsStorage.setItem(CACHE_KEYS.PAYMENTS_STATS, newStats);
            paymentsStorage.setItem(CACHE_KEYS.PENDING_PAYMENTS, pendingList);
          }
        } catch (error: any) {
          console.error("Failed to load payments:", error);
          if (error.response?.status === 403) {
            toast.error("You don't have permission to view payments");
          } else if (!forceRefresh && !loadFromCache()) {
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
    [currentPage, status, loadFromCache],
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
        "Confirm this payment? This will mark the bill as paid and notify the user.",
      )
    )
      return;

    setConfirming(true);
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed! User has been notified via email.");
      loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;

    try {
      await rejectPayment(paymentId, reason);
      toast.success("Payment rejected");
      loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.userId?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      payment.userId?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      payment.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      payment.referenceNumber?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">View and confirm customer payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ₱{stats.totalAmount.toLocaleString()}
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
                ₱{stats.monthlyAmount.toLocaleString()}
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
                {pendingPayments.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-yellow-700">
                Please review and confirm these payments to update user accounts
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
              placeholder="Search by name, email, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
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
                  {pendingPayments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.userId?.firstName}{" "}
                            {payment.userId?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.userId?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payment.referenceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₱{payment.amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {payment.paymentDetails?.notes || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmPayment(payment._id)}
                            disabled={confirming}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                            Confirm
                          </button>
                          <button
                            onClick={() => handleRejectPayment(payment._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-1"
                          >
                            <FiXCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 p-6 border-b">
          All Payments
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.userId?.firstName} {payment.userId?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.userId?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.referenceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₱{payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="capitalize">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
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
                    ₱{selectedPayment.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Reference:</span>
                  <span className="text-gray-900">
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
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </span>
                </div>
                {selectedPayment.paidAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Paid Date:</span>
                    <span className="text-gray-900">
                      {new Date(selectedPayment.paidAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedPayment.paymentDetails?.notes && (
                  <div className="py-2">
                    <span className="text-gray-500">Notes:</span>
                    <p className="mt-1 text-sm bg-gray-100 p-2 rounded text-gray-700">
                      {selectedPayment.paymentDetails.notes}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                {selectedPayment.status === "pending" && (
                  <>
                    <button
                      onClick={() => {
                        handleConfirmPayment(selectedPayment._id);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Confirm Payment
                    </button>
                    <button
                      onClick={() => {
                        handleRejectPayment(selectedPayment._id);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                      <FiXCircle className="w-4 h-4" />
                      Reject
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
