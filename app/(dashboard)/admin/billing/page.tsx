// app/(dashboard)/admin/billing/page.tsx - COMPLETE WITH PRE-LOADING AND CACHING
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllBillingCycles,
  getAllBills,
  getBillingSettings,
  updateBillingSettings,
  startBilling,
  stopBilling,
  approvePlanChange,
  rejectPlanChange,
  disconnectClient,
  reconnectClient,
  clearBillingCache,
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
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== CACHE KEYS ====================
const CACHE_KEYS = {
  BILLING_DATA: "misterfyber_billing_data",
  BILLING_TIMESTAMP: "misterfyber_billing_timestamp",
  BILLING_STATS: "misterfyber_billing_stats",
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

// Storage wrapper
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
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    usersWithBalanceCount: 0,
    overdueUsersCount: 0,
    activeCyclesCount: 0,
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Load from cache first
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = billingStorage.getItem(CACHE_KEYS.BILLING_DATA);
      const cachedTimestamp = billingStorage.getItem(
        CACHE_KEYS.BILLING_TIMESTAMP,
      );
      const cachedStats = billingStorage.getItem(CACHE_KEYS.BILLING_STATS);

      if (
        cachedData &&
        cachedTimestamp &&
        Date.now() - cachedTimestamp < CACHE_DURATION
      ) {
        console.log("📦 Loading billing data from cache");
        setUsers(cachedData.users || []);
        setBillingCycles(cachedData.billingCycles || []);
        setBills(cachedData.bills || []);
        if (cachedStats) {
          setStats(cachedStats);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load from cache:", error);
      return false;
    }
  }, []);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      // Try cache first if not force refresh
      if (!forceRefresh && loadFromCache()) {
        setLoading(false);
      }

      // Prevent duplicate simultaneous loads
      if (loadPromiseRef.current && !forceRefresh) {
        return loadPromiseRef.current;
      }

      const loadPromise = (async () => {
        if (forceRefresh) {
          setRefreshing(true);
          clearBillingCache();
        } else {
          setLoading(true);
        }

        try {
          // Use Promise.allSettled to prevent one failure from blocking others
          const [
            cyclesResult,
            billsResult,
            settingsResult,
            allUsersResult,
            paymentsResult,
          ] = await Promise.allSettled([
            getAllBillingCycles({ limit: 100, forceRefresh }),
            getAllBills({ limit: 100, forceRefresh }),
            getBillingSettings(forceRefresh),
            getAllUsers({ limit: 100 }),
            getAllPayments({ limit: 100 }),
          ]);

          if (!isMountedRef.current) return;

          const cyclesData =
            cyclesResult.status === "fulfilled"
              ? cyclesResult.value
              : { data: [] };
          const billsData =
            billsResult.status === "fulfilled"
              ? billsResult.value
              : { data: [] };
          const settingsData =
            settingsResult.status === "fulfilled"
              ? settingsResult.value
              : { data: null };
          const allUsersData =
            allUsersResult.status === "fulfilled"
              ? allUsersResult.value
              : { data: [] };
          const paymentsData =
            paymentsResult.status === "fulfilled"
              ? paymentsResult.value
              : { data: [] };

          setBillingCycles(cyclesData.data || []);
          setBills(billsData.data || []);
          if (settingsData.data) {
            setSettings(settingsData.data);
          }
          setAllPayments(paymentsData.data || []);

          // Process users with balance in a more efficient way
          const billsList = billsData.data || [];
          const cyclesList = cyclesData.data || [];

          const usersWithBalanceData: UserWithBalance[] = (
            allUsersData.data || []
          ).map((user: any) => {
            // Filter bills for this user efficiently
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

            const userCycle = cyclesList.find(
              (cycle: any) => cycle.userId?._id === user._id,
            );

            return {
              ...user,
              currentBalance: totalBalance,
              unpaidBills: userBills,
              overdueBills,
              billingCycle: userCycle,
            };
          });

          // Sort in JavaScript instead of relying on backend
          usersWithBalanceData.sort(
            (a: UserWithBalance, b: UserWithBalance) =>
              b.currentBalance - a.currentBalance,
          );

          if (isMountedRef.current) {
            setUsers(usersWithBalanceData);

            // Calculate stats
            let totalBalanceSum = 0;
            let usersWithPositiveBalance = 0;
            let usersWithOverdue = 0;

            for (let i = 0; i < usersWithBalanceData.length; i++) {
              const user = usersWithBalanceData[i];
              totalBalanceSum = totalBalanceSum + user.currentBalance;
              if (user.currentBalance > 0) {
                usersWithPositiveBalance++;
              }
              if (user.overdueBills.length > 0) {
                usersWithOverdue++;
              }
            }

            let activeCycles = 0;
            for (let i = 0; i < cyclesList.length; i++) {
              if (cyclesList[i].status === "active") {
                activeCycles++;
              }
            }

            const newStats = {
              totalUsers: usersWithBalanceData.length,
              totalBalance: totalBalanceSum,
              usersWithBalanceCount: usersWithPositiveBalance,
              overdueUsersCount: usersWithOverdue,
              activeCyclesCount: activeCycles,
            };

            setStats(newStats);

            // Save to cache
            billingStorage.setItem(CACHE_KEYS.BILLING_DATA, {
              users: usersWithBalanceData,
              billingCycles: cyclesList,
              bills: billsList,
              timestamp: Date.now(),
            });
            billingStorage.setItem(CACHE_KEYS.BILLING_TIMESTAMP, Date.now());
            billingStorage.setItem(CACHE_KEYS.BILLING_STATS, newStats);
          }
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
          loadPromiseRef.current = null;
        }
      })();

      loadPromiseRef.current = loadPromise;
      return loadPromise;
    },
    [loadFromCache],
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
  };

  const handleMarkBillAsPaid = async (bill: any) => {
    if (
      !confirm(
        `Mark invoice ${bill.invoiceNumber} as paid? This will update the user's balance.`,
      )
    )
      return;

    try {
      const payment = allPayments.find((p) => p.billingId?._id === bill._id);

      if (payment) {
        await confirmPayment(payment._id);
        toast.success(`Invoice ${bill.invoiceNumber} marked as paid!`);
        loadData(true);
      } else {
        toast.error(
          "No payment record found for this bill. Please ask user to submit payment first.",
        );
      }
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
      toast.success("Billing started successfully");
      setShowStartModal(false);
      setSelectedUserId("");
      setStartDate("");
      setCustomAmount("");
      setBillingNotes("");
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  // Open start billing modal for a specific user
  const handleOpenStartModal = (user: UserWithBalance) => {
    setSelectedUserId(user._id);
    setStartDate("");
    setCustomAmount("");
    setBillingNotes("");
    setShowStartModal(true);
  };

  const handleStopBilling = async (userId: string) => {
    if (
      !confirm(
        "Stop billing for this user? This will cancel their active billing cycle.",
      )
    )
      return;

    try {
      await stopBilling({ userId, reason: "Admin action" });
      toast.success("Billing stopped");
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleApprovePlanChange = async (userId: string) => {
    try {
      await approvePlanChange({ userId });
      toast.success("Plan change approved");
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to approve plan change",
      );
    }
  };

  const handleRejectPlanChange = async (userId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;

    try {
      await rejectPlanChange({ userId, rejectionReason: reason });
      toast.success("Plan change rejected");
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reject plan change",
      );
    }
  };

  const handleDisconnect = async (userId: string) => {
    const reason = prompt("Enter reason for disconnection:");
    if (reason === null) return;

    try {
      await disconnectClient({ userId, reason });
      toast.success("Client disconnected");
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    }
  };

  const handleReconnect = async (userId: string) => {
    try {
      await reconnectClient({ userId });
      toast.success("Client reconnected");
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
      toast.success("Billing settings updated");
      setShowSettingsModal(false);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
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
                        {/* Start Billing button - only show if no active billing cycle */}
                        {!user.billingCycle ||
                        user.billingCycle?.status !== "active" ? (
                          <button
                            onClick={() => handleOpenStartModal(user)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Start Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStopBilling(user._id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Stop Billing"
                          >
                            <FiPause className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === "active" ? (
                          <button
                            onClick={() => handleDisconnect(user._id)}
                            className="p-1 text-yellow-600 hover:text-yellow-800"
                            title="Disconnect"
                          >
                            <FiWifiOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReconnect(user._id)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Reconnect"
                          >
                            <FiWifi className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <div className="grid grid-cols-3 gap-4">
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
                              onClick={() => handleMarkBillAsPaid(bill)}
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

              <div className="mt-6 flex justify-end">
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

      {/* Start Billing Modal - Per Customer */}
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
                  Billing Cycle Day
                </label>
                <input
                  type="number"
                  value={settings.billingCycleDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      billingCycleDay: parseInt(e.target.value),
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
