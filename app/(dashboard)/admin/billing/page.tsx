// app/(dashboard)/admin/billing/page.tsx - COMPLETE WORKING FILE WITH CACHING
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
  getBillingStats,
} from "@/services/billing";
import { getAllUsers, confirmPayment } from "@/services/admin";
import { getAllPayments } from "@/services/admin";
import {
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiCheck,
  FiX,
  FiSettings,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiActivity,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiDatabase,
} from "react-icons/fi";
import toast from "react-hot-toast";

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
    usersWithBalance: 0,
    overdueUsers: 0,
    activeCycles: 0,
  });
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
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
          billingStats,
        ] = await Promise.allSettled([
          getAllBillingCycles({ limit: 100, forceRefresh }),
          getAllBills({ limit: 100, forceRefresh }),
          getBillingSettings(forceRefresh),
          getAllUsers({ limit: 100 }),
          getAllPayments({ limit: 100 }),
          getBillingStats(forceRefresh),
        ]);

        const cyclesData = cyclesResult.status === 'fulfilled' ? cyclesResult.value : { data: [] };
        const billsData = billsResult.status === 'fulfilled' ? billsResult.value : { data: [] };
        const settingsData = settingsResult.status === 'fulfilled' ? settingsResult.value : { data: null };
        const allUsersData = allUsersResult.status === 'fulfilled' ? allUsersResult.value : { data: [] };
        const paymentsData = paymentsResult.status === 'fulfilled' ? paymentsResult.value : { data: [] };
        const billingStatsData = billingStats.status === 'fulfilled' ? billingStats.value : null;

        setBillingCycles(cyclesData.data || []);
        setBills(billsData.data || []);
        setSettings(settingsData.data);
        setAllPayments(paymentsData.data || []);

        // Process users with balance in a more efficient way
        const billsList = billsData.data || [];
        const cyclesList = cyclesData.data || [];
        
        const usersWithBalance = (allUsersData.data || []).map((user: any) => {
          // Filter bills for this user efficiently
          const userBills = billsList.filter(
            (bill: any) => bill.userId?._id === user._id && bill.status !== "paid",
          );

          const totalBalance = userBills.reduce(
            (sum: number, bill: any) => sum + (bill.total || 0),
            0,
          );

          const overdueBills = userBills.filter(
            (bill: any) =>
              bill.status === "overdue" || new Date(bill.dueDate) < new Date(),
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
        usersWithBalance.sort(
          (a: UserWithBalance, b: UserWithBalance) =>
            b.currentBalance - a.currentBalance,
        );
        
        setUsers(usersWithBalance);

        // Update stats
        setStats({
          totalUsers: usersWithBalance.length,
          totalBalance: usersWithBalance.reduce((sum, u) => sum + u.currentBalance, 0),
          usersWithBalance: usersWithBalance.filter((u) => u.currentBalance > 0).length,
          overdueUsers: usersWithBalance.filter((u) => u.overdueBills.length > 0).length,
          activeCycles: cyclesList.filter((c) => c.status === "active").length,
        });

        if (billingStatsData) {
          // Optionally use billing stats from API
        }
      } catch (error) {
        console.error("Failed to load billing data:", error);
        toast.error("Failed to load billing data");
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = loadPromise;
    return loadPromise;
  }, []);

  useEffect(() => {
    loadData();
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
        loadData(true); // Force refresh after payment
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

  const getBillStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      sent: "bg-blue-100 text-blue-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      draft: "bg-yellow-100 text-yellow-800",
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

  if (loading) {
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
              onClick={() => setShowStartModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FiPlay className="w-4 h-4" />
              Start Billing
            </button>
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
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
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
                {stats.usersWithBalance}
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
                {stats.overdueUsers}
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
                {stats.activeCycles}
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
                        {user.billingCycle?.status === "active" && (
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
                            className="p-1 text-yellow-600 hover:text-yellow