// app/(dashboard)/admin/billing/page.tsx - COMPLETE WORKING VERSION
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import {
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiX,
  FiUser,
  FiClipboard,
  FiActivity,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiMail,
  FiSend,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface User {
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
}

interface Bill {
  _id: string;
  invoiceNumber: string;
  userId:
    | User
    | { _id: string; firstName: string; lastName: string; email: string };
  total: number;
  status: string;
  dueDate: string;
  isProRated: boolean;
  billingPeriod: { start: string; end: string };
}

interface BillingCycle {
  _id: string;
  userId: User | { _id: string; firstName: string; lastName: string };
  status: string;
  monthlyRate: number;
  nextBillingDate: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminBillingPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailUser, setEmailUser] = useState<User | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    activeCycles: 0,
    pausedCycles: 0,
  });

  const getUserBalance = (userId: string): number => {
    const userBills = bills.filter((b) => {
      const billUserId =
        typeof b.userId === "object" ? b.userId?._id : b.userId;
      return billUserId === userId && b.status !== "paid";
    });
    return userBills.reduce((sum, b) => sum + (b.total || 0), 0);
  };

  const getUserUnpaidBills = (userId: string): Bill[] => {
    return bills.filter((b) => {
      const billUserId =
        typeof b.userId === "object" ? b.userId?._id : b.userId;
      return billUserId === userId && b.status !== "paid";
    });
  };

  const getUserOverdueBills = (userId: string): Bill[] => {
    return bills.filter((b) => {
      const billUserId =
        typeof b.userId === "object" ? b.userId?._id : b.userId;
      return billUserId === userId && b.status === "overdue";
    });
  };

  const getUserBillingCycle = (userId: string): BillingCycle | undefined => {
    return billingCycles.find((c) => {
      const cycleUserId =
        typeof c.userId === "object" ? c.userId?._id : c.userId;
      return cycleUserId === userId;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🔄 Loading billing data...");

      const [usersRes, billsRes, cyclesRes] = await Promise.all([
        api.get("/admin/users?limit=100"),
        api.get("/billing/all-bills?limit=100"),
        api.get("/billing/cycles?limit=100"),
      ]);

      const usersList = usersRes.data?.data || [];
      const billsList = billsRes.data?.data || [];
      const cyclesList = cyclesRes.data?.data || [];

      console.log("✅ Data loaded:", {
        users: usersList.length,
        bills: billsList.length,
        cycles: cyclesList.length,
      });

      setUsers(usersList);
      setBills(billsList);
      setBillingCycles(cyclesList);

      const unpaidBills = billsList.filter((b: Bill) => b.status !== "paid");
      const totalOutstanding = unpaidBills.reduce(
        (sum: number, b: Bill) => sum + (b.total || 0),
        0,
      );
      const overdueCount = billsList.filter(
        (b: Bill) => b.status === "overdue",
      ).length;
      const activeCycles = cyclesList.filter(
        (c: BillingCycle) => c.status === "active",
      ).length;
      const pausedCycles = cyclesList.filter(
        (c: BillingCycle) => c.status === "paused",
      ).length;

      setStats({
        totalUsers: usersList.length,
        totalOutstanding,
        overdueCount,
        activeCycles,
        pausedCycles,
      });
    } catch (error: any) {
      console.error("Failed to load data:", error);
      toast.error(
        error.response?.data?.message || "Failed to load billing data",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartBilling = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    try {
      const response = await api.post("/billing/start", {
        userId: selectedUserId,
        startDate: startDate || undefined,
      });

      toast.success(response.data?.message || "Billing started successfully!");
      setShowStartModal(false);
      setSelectedUserId("");
      setStartDate("");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  const handlePauseBilling = async (userId: string, userName: string) => {
    if (!confirm(`Pause billing for ${userName}?`)) return;
    try {
      await api.post("/billing/pause", { userId, reason: "Admin action" });
      toast.success(`Billing paused for ${userName}`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    }
  };

  const handleResumeBilling = async (userId: string, userName: string) => {
    if (!confirm(`Resume billing for ${userName}?`)) return;
    try {
      await api.post("/billing/resume", { userId });
      toast.success(`Billing resumed for ${userName}`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    }
  };

  const handleStopBilling = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Stop billing for ${userName}? This will cancel their subscription.`,
      )
    )
      return;
    try {
      await api.post("/billing/stop", { userId, reason: "Admin action" });
      toast.success(`Billing stopped for ${userName}`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleMarkBillAsPaid = async (
    billId: string,
    invoiceNumber: string,
    userEmail: string,
  ) => {
    if (!confirm(`Mark invoice ${invoiceNumber} as paid?`)) return;
    try {
      await api.put(`/billing/mark-paid/${billId}`, {
        referenceNumber: `ADMIN-${Date.now()}`,
        notes: "Manually marked as paid by admin",
      });
      toast.success(`✅ Invoice ${invoiceNumber} marked as paid!`);
      loadData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    }
  };

  const handleDisconnect = async (userId: string, userName: string) => {
    const reason = prompt("Enter reason for disconnection:");
    if (reason === null) return;
    try {
      await api.post("/billing/disconnect", { userId, reason });
      toast.success(`${userName} disconnected`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to disconnect");
    }
  };

  const handleReconnect = async (userId: string, userName: string) => {
    try {
      await api.post("/billing/reconnect", { userId });
      toast.success(`${userName} reconnected`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reconnect");
    }
  };

  const handleSendEmail = async () => {
    if (!emailUser) return;
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please enter subject and message");
      return;
    }

    setSendingEmail(true);
    try {
      await api.post("/email/send-manual", {
        userId: emailUser._id,
        subject: emailSubject,
        message: emailMessage,
      });
      toast.success(`Email sent to ${emailUser.email}`);
      setShowEmailModal(false);
      setEmailUser(null);
      setEmailSubject("");
      setEmailMessage("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
      pending_activation: "bg-purple-100 text-purple-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "has_balance")
      return matchesSearch && getUserBalance(user._id) > 0;
    if (statusFilter === "overdue")
      return matchesSearch && getUserOverdueBills(user._id).length > 0;
    if (statusFilter === "active")
      return matchesSearch && user.status === "active";
    if (statusFilter === "suspended")
      return matchesSearch && user.status === "suspended";
    if (statusFilter === "paused")
      return (
        matchesSearch && getUserBillingCycle(user._id)?.status === "paused"
      );
    return matchesSearch;
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
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
              <p className="text-sm text-gray-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                ₱{stats.totalOutstanding.toLocaleString()}
              </p>
            </div>
            <FiClipboard className="w-8 h-8 text-red-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue Bills</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.overdueCount}
              </p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-orange-100" />
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
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paused Cycles</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pausedCycles}
              </p>
            </div>
            <FiPause className="w-8 h-8 text-yellow-100" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
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
                filteredUsers.map((user) => {
                  const balance = getUserBalance(user._id);
                  const unpaidCount = getUserUnpaidBills(user._id).length;
                  const overdueCount = getUserOverdueBills(user._id).length;
                  const userCycle = getUserBillingCycle(user._id);
                  const displayStatus =
                    userCycle?.status === "paused" ? "paused" : user.status;

                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          @{user.username}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.planId?.name || "No Plan"}
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className={`text-lg font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          ₱{balance.toLocaleString()}
                        </p>
                        {overdueCount > 0 && (
                          <p className="text-xs text-red-500">
                            {overdueCount} overdue
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {unpaidCount} bill(s)
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(displayStatus)}`}
                        >
                          {displayStatus === "paused" ? "Paused" : user.status}
                        </span>
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
                          <button
                            onClick={() => {
                              setEmailUser(user);
                              setShowEmailModal(true);
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800"
                            title="Send Email"
                          >
                            <FiMail className="w-4 h-4" />
                          </button>
                          {userCycle?.status === "paused" ? (
                            <button
                              onClick={() =>
                                handleResumeBilling(user._id, user.firstName)
                              }
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Resume Billing"
                            >
                              <FiPlay className="w-4 h-4" />
                            </button>
                          ) : !userCycle ? (
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
                          ) : userCycle?.status === "active" ? (
                            <>
                              <button
                                onClick={() =>
                                  handlePauseBilling(user._id, user.firstName)
                                }
                                className="p-1 text-yellow-600 hover:text-yellow-800"
                                title="Pause Billing"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && emailUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Send Email to
                </h2>
                <p className="text-gray-600">
                  {emailUser.firstName} {emailUser.lastName} ({emailUser.email})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      Send Email
                    </>
                  )}
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
              Start Billing
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Installation Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowStartModal(false);
                    setSelectedUserId("");
                    setStartDate("");
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

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
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
                  <p className="text-sm text-gray-500">Balance</p>
                  <p
                    className={`text-2xl font-bold ${getUserBalance(selectedUser._id) > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    ₱{getUserBalance(selectedUser._id).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unpaid Bills</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {getUserUnpaidBills(selectedUser._id).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {getUserOverdueBills(selectedUser._id).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedUser.status)}`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Unpaid Bills
            </h3>
            <div className="overflow-x-auto">
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
                <tbody>
                  {getUserUnpaidBills(selectedUser._id).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No unpaid bills
                      </td>
                    </tr>
                  ) : (
                    getUserUnpaidBills(selectedUser._id).map((bill) => (
                      <tr key={bill._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {bill.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {bill.billingPeriod
                            ? `${formatDate(bill.billingPeriod.start)} - ${formatDate(bill.billingPeriod.end)}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(bill.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₱{bill.total?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              handleMarkBillAsPaid(
                                bill._id,
                                bill.invoiceNumber,
                                selectedUser.email,
                              )
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
                          >
                            <FiCheckCircle className="w-3 h-3" /> Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
