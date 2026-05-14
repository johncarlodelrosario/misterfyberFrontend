"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllBillingCycles,
  getAllBills,
  getBillingSettings,
  updateBillingSettings,
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  approvePlanChange,
  rejectPlanChange,
  disconnectClient,
  reconnectClient,
  clearBillingCache,
  markBillAsPaid,
  getPendingProRatedBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
} from "@/services/billing";
import { getAllUsers, confirmPayment } from "@/services/admin";
import { getAllPayments } from "@/services/admin";
import {
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiX,
  FiSettings,
  FiUser,
  FiDollarSign,
  FiActivity,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiBell,
  FiBellOff,
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== CACHE KEYS ====================
const CACHE_KEYS = {
  BILLING_DATA: "misterfyber_billing_data",
  BILLING_TIMESTAMP: "misterfyber_billing_timestamp",
  BILLING_STATS: "misterfyber_billing_stats",
};

const CACHE_DURATION = 5 * 60 * 1000;

interface UserWithBalance {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string;
  status: string;
  planId?: {
    _id: string;
    name: string;
    price: number;
  };
  currentBalance: number;
  unpaidBills: any[];
  overdueBills: any[];
  billingCycle?: any;
}

const billingStorage = {
  setItem: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Failed to save billing data:", e);
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

export default function AdminBillingPage() {
  const [users, setUsers] = useState<UserWithBalance[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithBalance | null>(
    null,
  );
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [pendingProRated, setPendingProRated] = useState<any[]>([]);
  const [pendingActivations, setPendingActivations] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalType, setPendingModalType] = useState<
    "pro-rated" | "activation"
  >("pro-rated");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    usersWithBalanceCount: 0,
    overdueUsersCount: 0,
    activeCyclesCount: 0,
    pausedCyclesCount: 0,
    pendingProRatedCount: 0,
    pendingActivationsCount: 0,
  });
  const isMountedRef = useRef(true);
  const loadedRef = useRef(false);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!isMountedRef.current) return;
      if (loadedRef.current && !forceRefresh) return;

      if (forceRefresh) {
        setRefreshing(true);
        clearBillingCache();
      } else {
        setLoading(true);
      }

      try {
        // Check cache first
        if (!forceRefresh) {
          const cachedData = billingStorage.getItem(CACHE_KEYS.BILLING_DATA);
          const cachedTimestamp = billingStorage.getItem(
            CACHE_KEYS.BILLING_TIMESTAMP,
          );

          if (
            cachedData &&
            cachedTimestamp &&
            Date.now() - cachedTimestamp < CACHE_DURATION
          ) {
            setUsers(cachedData.users || []);
            setBillingCycles(cachedData.billingCycles || []);
            setBills(cachedData.bills || []);
            const cachedStats = billingStorage.getItem(
              CACHE_KEYS.BILLING_STATS,
            );
            if (cachedStats) setStats(cachedStats);
            setLoading(false);
            loadedRef.current = true;
            return;
          }
        }

        const [
          cyclesResult,
          billsResult,
          settingsResult,
          allUsersResult,
          paymentsResult,
        ] = await Promise.all([
          getAllBillingCycles({ limit: 100, forceRefresh }),
          getAllBills({ limit: 100, forceRefresh }),
          getBillingSettings(forceRefresh),
          getAllUsers({ limit: 100 }),
          getAllPayments({ limit: 100 }),
        ]);

        if (!isMountedRef.current) return;

        const cyclesData = cyclesResult?.data || [];
        const billsList = billsResult?.data || [];
        const settingsData = settingsResult?.data || null;
        const usersData = allUsersResult?.data || [];
        const paymentsData = paymentsResult?.data || [];

        setBillingCycles(cyclesData);
        setBills(billsList);
        if (settingsData) setSettings(settingsData);
        setAllPayments(paymentsData);

        const usersWithBalanceData: UserWithBalance[] = usersData.map(
          (user: any) => {
            const userBills = billsList.filter(
              (bill: any) =>
                bill.userId?._id === user._id && bill.status !== "paid",
            );
            const totalBalance = userBills.reduce(
              (sum: number, bill: any) => sum + (bill.total || 0),
              0,
            );
            const overdueBills = userBills.filter(
              (bill: any) =>
                bill.status === "overdue" ||
                new Date(bill.dueDate) < new Date(),
            );
            const userCycle = cyclesData.find(
              (cycle: any) => cycle.userId?._id === user._id,
            );

            return {
              ...user,
              currentBalance: totalBalance,
              unpaidBills: userBills,
              overdueBills,
              billingCycle: userCycle,
            };
          },
        );

        usersWithBalanceData.sort(
          (a, b) => b.currentBalance - a.currentBalance,
        );

        let totalBalanceSum = 0;
        let usersWithPositiveBalance = 0;
        let usersWithOverdue = 0;
        let activeCycles = 0;
        let pausedCycles = 0;

        for (const user of usersWithBalanceData) {
          totalBalanceSum += user.currentBalance;
          if (user.currentBalance > 0) usersWithPositiveBalance++;
          if (user.overdueBills.length > 0) usersWithOverdue++;
        }

        for (const cycle of cyclesData) {
          if (cycle.status === "active") activeCycles++;
          if (cycle.status === "paused") pausedCycles++;
        }

        const newStats = {
          totalUsers: usersWithBalanceData.length,
          totalBalance: totalBalanceSum,
          usersWithBalanceCount: usersWithPositiveBalance,
          overdueUsersCount: usersWithOverdue,
          activeCyclesCount: activeCycles,
          pausedCyclesCount: pausedCycles,
          pendingProRatedCount: pendingProRated.length,
          pendingActivationsCount: pendingActivations.length,
        };

        setUsers(usersWithBalanceData);
        setStats(newStats);

        billingStorage.setItem(CACHE_KEYS.BILLING_DATA, {
          users: usersWithBalanceData,
          billingCycles: cyclesData,
          bills: billsList,
        });
        billingStorage.setItem(CACHE_KEYS.BILLING_TIMESTAMP, Date.now());
        billingStorage.setItem(CACHE_KEYS.BILLING_STATS, newStats);

        // Load pending data in background
        const [proRatedResult, activationsResult] = await Promise.all([
          getPendingProRatedBills(),
          getPendingActivations(),
        ]);

        if (isMountedRef.current) {
          setPendingProRated(proRatedResult?.data || []);
          setPendingActivations(activationsResult?.data || []);
        }

        loadedRef.current = true;
      } catch (error) {
        console.error("Failed to load billing data:", error);
        if (isMountedRef.current) {
          toast.error("Failed to load billing data");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [pendingProRated.length, pendingActivations.length],
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleRefresh = () => {
    loadedRef.current = false;
    loadData(true);
  };

  const handleMarkBillAsPaid = async (bill: any, user: any) => {
    if (
      !confirm(
        `Mark invoice ${bill.invoiceNumber} as paid? This will update ${user.firstName}'s balance.`,
      )
    )
      return;

    try {
      await markBillAsPaid(bill._id, {
        referenceNumber: `ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin`,
      });

      toast.success(`✅ Invoice ${bill.invoiceNumber} marked as paid!`);
      toast.success(`📧 Payment confirmation email sent to ${user.email}`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    }
  };

  const handleStartBilling = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    try {
      await startBilling({
        userId: selectedUserId,
        startDate: startDate || undefined,
        customAmount: customAmount ? parseFloat(customAmount) : undefined,
        notes: billingNotes,
      });
      toast.success(
        "✅ Billing started successfully! User will receive an email with their pro-rated bill.",
      );
      setShowStartModal(false);
      setSelectedUserId("");
      setStartDate("");
      setCustomAmount("");
      setBillingNotes("");
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  const handlePauseBilling = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    try {
      await pauseBilling({
        userId: selectedUserId,
        reason: pauseReason || "Admin initiated pause",
        pauseUntilDate: pauseUntilDate || undefined,
      });
      toast.success(
        "⏸️ Billing paused successfully! User has been notified via email.",
      );
      setShowPauseModal(false);
      setSelectedUserId("");
      setPauseReason("");
      setPauseUntilDate("");
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    }
  };

  const handleResumeBilling = async (
    userId: string,
    userFirstName: string,
    userEmail: string,
  ) => {
    if (
      !confirm(
        `Resume billing for ${userFirstName}? This will reactivate their service.`,
      )
    )
      return;

    try {
      await resumeBilling({ userId });
      toast.success(
        `✅ Billing resumed for ${userFirstName}! User has been notified via email.`,
      );
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    }
  };

  const handleStopBilling = async (userId: string, userFirstName: string) => {
    if (
      !confirm(
        `Stop billing for ${userFirstName}? This will cancel their active billing cycle permanently.`,
      )
    )
      return;

    try {
      await stopBilling({ userId, reason: "Admin action" });
      toast.success(
        `⛔ Billing stopped for ${userFirstName}. User has been notified.`,
      );
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleConfirmProRatedPayment = async (
    userId: string,
    billId: string,
    userEmail: string,
  ) => {
    if (
      !confirm(
        `Confirm pro-rated payment for ${userEmail}? This will activate their service.`,
      )
    )
      return;

    try {
      await confirmProRatedPayment({
        userId,
        paymentDetails: { confirmedBy: "admin", confirmedAt: new Date() },
      });
      toast.success(
        `✅ Pro-rated payment confirmed! ${userEmail}'s service is now active.`,
      );
      toast.success(`📧 Activation email sent to ${userEmail}`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    }
  };

  const handleStartMonthlyBilling = async (
    userId: string,
    userEmail: string,
  ) => {
    if (
      !confirm(
        `Start monthly billing for ${userEmail}? This will generate their first monthly bill.`,
      )
    )
      return;

    try {
      await startMonthlyBilling({ userId });
      toast.success(
        `✅ Monthly billing started for ${userEmail}! First monthly bill generated.`,
      );
      toast.success(`📧 Invoice sent to ${userEmail}`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to start monthly billing",
      );
    }
  };

  const handleDisconnect = async (userId: string, userFirstName: string) => {
    const reason = prompt("Enter reason for disconnection:");
    if (reason === null) return;

    try {
      await disconnectClient({ userId, reason });
      toast.success(
        `🔌 ${userFirstName} disconnected. User has been notified via email.`,
      );
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    }
  };

  const handleReconnect = async (userId: string, userFirstName: string) => {
    try {
      await reconnectClient({ userId });
      toast.success(
        `🔌 ${userFirstName} reconnected. User has been notified via email.`,
      );
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateBillingSettings(settings);
      toast.success("✅ Billing settings updated successfully!");
      setShowSettingsModal(false);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update settings");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      suspended: "bg-red-100 text-red-800",
      pending_activation: "bg-purple-100 text-purple-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return "text-green-600";
    if (balance > 1000) return "text-red-600 font-bold";
    return "text-orange-600";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "has_balance")
      return matchesSearch && user.currentBalance > 0;
    if (statusFilter === "overdue")
      return matchesSearch && user.overdueBills.length > 0;
    if (statusFilter === "active")
      return matchesSearch && user.status === "active";
    if (statusFilter === "suspended")
      return matchesSearch && user.status === "suspended";
    if (statusFilter === "paused")
      return matchesSearch && user.billingCycle?.status === "paused";

    return matchesSearch;
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  const totalPendingCount = pendingProRated.length + pendingActivations.length;

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h1>
            <p className="text-gray-600">
              Manage customer balances, bills, and subscriptions
            </p>
          </div>
          <div className="flex gap-3">
            {totalPendingCount > 0 && (
              <button
                onClick={() => {
                  setPendingModalType("pro-rated");
                  setShowPendingModal(true);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
              >
                <FiBell className="w-4 h-4" />
                Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <FiSettings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalUsers}
              </p>
            </div>
            <FiUser className="w-8 h-8 text-blue-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{stats.totalBalance.toLocaleString()}
              </p>
            </div>
            <FiDollarSign className="w-8 h-8 text-red-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">With Balance</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.usersWithBalanceCount}
              </p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-orange-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.overdueUsersCount}
              </p>
            </div>
            <FiClock className="w-8 h-8 text-red-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Cycles</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeCyclesCount}
              </p>
            </div>
            <FiActivity className="w-8 h-8 text-green-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paused Cycles</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pausedCyclesCount}
              </p>
            </div>
            <FiPause className="w-8 h-8 text-yellow-100" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="has_balance">With Balance</option>
            <option value="overdue">Overdue</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unpaid
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">@{user.username}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.planId?.name || "No Plan"}
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-lg font-bold ${getBalanceColor(user.currentBalance)}`}
                      >
                        ₱{user.currentBalance.toLocaleString()}
                      </p>
                      {user.overdueBills.length > 0 && (
                        <p className="text-xs text-red-500">
                          {user.overdueBills.length} overdue
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.unpaidBills.length} bill(s)
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.billingCycle?.status || user.status)}`}
                      >
                        {user.billingCycle?.status === "paused"
                          ? "Paused"
                          : user.status}
                      </span>
                      {user.billingCycle?.pauseUntil && (
                        <p className="text-xs text-gray-400 mt-1">
                          Resume:{" "}
                          {new Date(
                            user.billingCycle.pauseUntil,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetailModal(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>

                        {user.billingCycle?.status === "paused" ? (
                          <button
                            onClick={() =>
                              handleResumeBilling(
                                user._id,
                                user.firstName,
                                user.email,
                              )
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Resume Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                        ) : !user.billingCycle ||
                          user.billingCycle?.status === "cancelled" ? (
                          <button
                            onClick={() => {
                              setSelectedUserId(user._id);
                              setShowStartModal(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Start Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                        ) : user.billingCycle?.status === "active" ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUserId(user._id);
                                setShowPauseModal(true);
                              }}
                              className="p-1 text-yellow-600 hover:text-yellow-800"
                              title="Pause Billing (Vacation)"
                            >
                              <FiPause className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleStopBilling(user._id, user.firstName)
                              }
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Stop Billing"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}

                        {user.status === "active" ? (
                          <button
                            onClick={() =>
                              handleDisconnect(user._id, user.firstName)
                            }
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Disconnect"
                          >
                            <FiWifiOff className="w-4 h-4" />
                          </button>
                        ) : user.status === "suspended" ? (
                          <button
                            onClick={() =>
                              handleReconnect(user._id, user.firstName)
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Reconnect"
                          >
                            <FiWifi className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Actions Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {pendingModalType === "pro-rated"
                    ? "Pending Pro-rated Payments"
                    : "Pending Activations"}
                </h2>
                <button
                  onClick={() => setShowPendingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {pendingModalType === "pro-rated" && (
                <div className="space-y-4">
                  {pendingProRated.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No pending pro-rated payments
                    </p>
                  ) : (
                    pendingProRated.map((item: any) => (
                      <div key={item._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {item.userId?.firstName} {item.userId?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.userId?.email}
                            </p>
                            <p className="text-sm">
                              Invoice: {item.invoiceNumber}
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              ₱{item.total?.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleConfirmProRatedPayment(
                                item.userId?._id,
                                item._id,
                                item.userId?.email,
                              )
                            }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                            Confirm Payment & Activate
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {pendingModalType === "activation" && (
                <div className="space-y-4">
                  {pendingActivations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No pending activations
                    </p>
                  ) : (
                    pendingActivations.map((item: any) => (
                      <div key={item._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {item.userId?.firstName} {item.userId?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.userId?.email}
                            </p>
                            <p className="text-sm">Plan: {item.planId?.name}</p>
                            <p className="text-sm">
                              Pro-rated paid: ₱
                              {item.currentProRatedAmount?.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleStartMonthlyBilling(
                                item.userId?._id,
                                item.userId?.email,
                              )
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <FiPlay className="w-4 h-4" />
                            Start Monthly Billing
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Outstanding Balance</p>
                    <p
                      className={`text-2xl font-bold ${getBalanceColor(selectedUser.currentBalance)}`}
                    >
                      ₱{selectedUser.currentBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unpaid Bills</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedUser.unpaidBills.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Overdue Bills</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedUser.overdueBills.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Billing Status</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedUser.billingCycle?.status || selectedUser.status)}`}
                    >
                      {selectedUser.billingCycle?.status === "paused"
                        ? "Paused"
                        : selectedUser.status}
                    </span>
                    {selectedUser.billingCycle?.pauseUntil && (
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-resume:{" "}
                        {new Date(
                          selectedUser.billingCycle.pauseUntil,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Unpaid Bills
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Invoice #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Period
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Due Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedUser.unpaidBills.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No unpaid bills
                        </td>
                      </tr>
                    ) : (
                      selectedUser.unpaidBills.map((bill) => (
                        <tr key={bill._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {bill.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {bill.billingPeriod
                              ? `${new Date(bill.billingPeriod.start).toLocaleDateString()} - ${new Date(bill.billingPeriod.end).toLocaleDateString()}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(bill.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ₱{bill.total?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() =>
                                handleMarkBillAsPaid(bill, selectedUser)
                              }
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1"
                            >
                              <FiCheckCircle className="w-3 h-3" />
                              Mark as Paid
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {selectedUser.billingCycle?.status === "paused" && (
                  <button
                    onClick={() =>
                      handleResumeBilling(
                        selectedUser._id,
                        selectedUser.firstName,
                        selectedUser.email,
                      )
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <FiPlay className="w-4 h-4" />
                    Resume Billing
                  </button>
                )}
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Billing Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Start Billing for{" "}
              {users.find((u) => u._id === selectedUserId)?.firstName}{" "}
              {users.find((u) => u._id === selectedUserId)?.lastName}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Amount (Optional)
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Leave empty for auto-calculation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="Add notes about this billing cycle..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowStartModal(false);
                    setSelectedUserId("");
                    setStartDate("");
                    setCustomAmount("");
                    setBillingNotes("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartBilling}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Start Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause Billing Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Pause Billing for{" "}
              {users.find((u) => u._id === selectedUserId)?.firstName}{" "}
              {users.find((u) => u._id === selectedUserId)?.lastName}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g., Vacation, Maintenance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto-resume Date (Optional)
                </label>
                <input
                  type="date"
                  value={pauseUntilDate}
                  onChange={(e) => setPauseUntilDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for manual resume only
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ When paused: No bills will be generated, service will be
                  disconnected, and user will be notified via email.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPauseModal(false);
                    setSelectedUserId("");
                    setPauseReason("");
                    setPauseUntilDate("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseBilling}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
                >
                  Pause Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Billing Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Days (comma separated)
                </label>
                <input
                  type="text"
                  value={settings.reminderDays?.join(", ")}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderDays: e.target.value
                        .split(",")
                        .map((n: string) => parseInt(n.trim())),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date Days After Period
                </label>
                <input
                  type="number"
                  value={settings.dueDateDaysAfterPeriod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dueDateDaysAfterPeriod: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace Period Days
                </label>
                <input
                  type="number"
                  value={settings.gracePeriodDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gracePeriodDays: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free Days (for pro-rated)
                </label>
                <input
                  type="number"
                  value={settings.freeDays || 1}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeDays: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoGenerateBills}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoGenerateBills: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Auto Generate Bills
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoSendReminders}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoSendReminders: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Auto Send Reminders
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoSuspendOnNonPayment}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoSuspendOnNonPayment: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  Auto Suspend on Non-Payment
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
