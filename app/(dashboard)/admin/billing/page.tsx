"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllBillingCycles,
  getAllBills,
  getBillingSettings,
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  clearBillingCache,
  markBillAsPaid,
  getPendingProRatedBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  getBillingSummaryAdmin,
} from "@/services/billing";
import {
  getAllUsers,
  createManualCustomer,
  getCustomersWithoutAccounts,
  startBillingForApplication,
} from "@/services/admin";
import { getAllPayments } from "@/services/admin";
import {
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiX,
  FiSettings,
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
  FiBell,
  FiCalendar,
  FiInfo,
  FiUserPlus,
  FiHome,
  FiMail,
  FiSend,
} from "react-icons/fi";
import toast from "react-hot-toast";

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

interface Building {
  _id: string;
  buildingName: string;
  streetAddress: string;
  city: string;
  isActive: boolean;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
  speed: { download: number; upload: number };
}

function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
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
  const [showManualCustomerModal, setShowManualCustomerModal] = useState(false);
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

  // Email Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailUser, setEmailUser] = useState<UserWithBalance | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailType, setEmailType] = useState("custom");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Manual Customer Form State
  const [manualCustomerForm, setManualCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    buildingId: "",
    buildingName: "",
    floor: "",
    unitNumber: "",
    planId: "",
    idType: "Valid ID",
    idNumber: "",
    startBillingImmediately: true,
    installationDate: "",
    notes: "",
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [customersWithoutAccounts, setCustomersWithoutAccounts] = useState<
    any[]
  >([]);
  const [showExistingCustomersModal, setShowExistingCustomersModal] =
    useState(false);

  const [billingFlowSettings, setBillingFlowSettings] = useState({
    proRatedDueDay: 25,
    monthlyDueDay: 5,
    billingCutoffDay: 24,
    enableAutoBilling: true,
    sendInvoiceOnInstall: true,
    requireAdminActivation: false,
    freeDays: 0,
    gracePeriodDays: 5,
    reminderDays: [7, 3, 1],
  });

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

  // Load plans for manual customer form
  const loadPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error("Failed to load plans:", error);
    }
  };

  // Load buildings for manual customer form
  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const response = await fetch("/api/buildings/active");
      const data = await response.json();
      console.log("Buildings loaded:", data.data);
      setBuildings(data.data || []);
    } catch (error) {
      console.error("Failed to load buildings:", error);
    } finally {
      setLoadingBuildings(false);
    }
  };

  // Handle building selection - auto-fill building name
  const handleBuildingChange = (buildingId: string) => {
    const selectedBuilding = buildings.find((b) => b._id === buildingId);
    if (selectedBuilding) {
      setManualCustomerForm({
        ...manualCustomerForm,
        buildingId: buildingId,
        buildingName: selectedBuilding.buildingName,
      });
    } else {
      setManualCustomerForm({
        ...manualCustomerForm,
        buildingId: buildingId,
        buildingName: "",
      });
    }
  };

  const loadBillingFlowSettings = async () => {
    try {
      const response = await getBillingSettingsAdmin();
      const settingsData = response?.data || response;
      if (settingsData) {
        setBillingFlowSettings({
          proRatedDueDay: settingsData.proRatedDueDay || 25,
          monthlyDueDay: settingsData.monthlyDueDay || 5,
          billingCutoffDay: settingsData.billingCutoffDay || 24,
          enableAutoBilling: settingsData.enableAutoBilling !== false,
          sendInvoiceOnInstall: settingsData.sendInvoiceOnInstall !== false,
          requireAdminActivation: settingsData.requireAdminActivation || false,
          freeDays: 0,
          gracePeriodDays: settingsData.gracePeriodDays || 5,
          reminderDays: settingsData.reminderDays || [7, 3, 1],
        });
      }
    } catch (error) {
      console.error("Failed to load billing flow settings:", error);
    }
  };

  const saveBillingFlowSettings = async () => {
    try {
      await updateBillingSettingsAdmin({ ...billingFlowSettings, freeDays: 0 });
      toast.success("✅ Billing flow settings saved successfully!");
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    }
  };

  // Handle sending manual email
  const handleSendManualEmail = async () => {
    if (!emailUser) return;

    if (!emailSubject.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    if (!emailMessage.trim()) {
      toast.error("Please enter an email message");
      return;
    }

    setSendingEmail(true);

    try {
      const response = await fetch("/api/email/send-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: emailUser._id,
          emailType: emailType,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`📧 Email sent successfully to ${emailUser.email}`);
        setShowEmailModal(false);
        setEmailUser(null);
        setEmailSubject("");
        setEmailMessage("");
        setEmailType("custom");
      } else {
        toast.error(data.message || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Open email modal with pre-filled template
  const openEmailModal = (user: UserWithBalance, templateType: string) => {
    setEmailUser(user);
    setEmailType(templateType);

    switch (templateType) {
      case "invoice":
        setEmailSubject(`Invoice Reminder - MisterFyber`);
        setEmailMessage(
          `Dear ${user.firstName},\n\nThis is a friendly reminder that you have an outstanding balance of ₱${user.currentBalance.toLocaleString()}.\n\nPlease log in to your account to view and pay your invoice.\n\nThank you for your prompt payment.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "payment_confirmation":
        setEmailSubject(`Payment Confirmation - MisterFyber`);
        setEmailMessage(
          `Dear ${user.firstName},\n\nThank you for your payment! Your account has been credited.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "disconnection":
        setEmailSubject(
          `Important: Service Disconnection Notice - MisterFyber`,
        );
        setEmailMessage(
          `Dear ${user.firstName},\n\nThis is to notify you that your internet service has been disconnected due to non-payment.\n\nTo restore your service, please settle your outstanding balance of ₱${user.currentBalance.toLocaleString()}.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "welcome":
        setEmailSubject(`Welcome to MisterFyber!`);
        setEmailMessage(
          `Dear ${user.firstName},\n\nWelcome to MisterFyber! We're excited to have you as our customer.\n\nYour account has been successfully set up. You can now log in to your account to manage your subscription.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      default:
        setEmailSubject(`Message from MisterFyber`);
        setEmailMessage(`Dear ${user.firstName},\n\n`);
    }

    setShowEmailModal(true);
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    if (loadedRef.current && !forceRefresh) return;

    if (forceRefresh) {
      setRefreshing(true);
      clearBillingCache();
    } else {
      setLoading(true);
    }

    try {
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
          const cachedStats = billingStorage.getItem(CACHE_KEYS.BILLING_STATS);
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
        summaryResult,
        customersWithoutAccountsResult,
      ] = await Promise.all([
        getAllBillingCycles({ limit: 100, forceRefresh }),
        getAllBills({ limit: 100, forceRefresh }),
        getBillingSettings(forceRefresh),
        getAllUsers({ limit: 100 }),
        getAllPayments({ limit: 100 }),
        getBillingSummaryAdmin().catch(() => ({ data: {} })),
        getCustomersWithoutAccounts().catch(() => ({ data: [] })),
      ]);

      if (!isMountedRef.current) return;

      const cyclesData = cyclesResult?.data || [];
      const billsList = billsResult?.data || [];
      const settingsData = settingsResult?.data || null;
      const usersData = allUsersResult?.data || [];
      const paymentsData = paymentsResult?.data || [];
      const summaryData = summaryResult?.data || {};
      const customersWithoutAccountsData =
        customersWithoutAccountsResult?.data || [];

      setBillingCycles(cyclesData);
      setBills(billsList);
      if (settingsData) setSettings(settingsData);
      setAllPayments(paymentsData);
      setCustomersWithoutAccounts(customersWithoutAccountsData);

      if (summaryData) {
        setStats((prev) => ({
          ...prev,
          activeCyclesCount:
            summaryData.activeSubscriptions || prev.activeCyclesCount,
          pausedCyclesCount:
            summaryData.pausedSubscriptions || prev.pausedCyclesCount,
          pendingProRatedCount:
            summaryData.pendingProRated || prev.pendingProRatedCount,
          pendingActivationsCount:
            summaryData.pendingActivations || prev.pendingActivationsCount,
          overdueUsersCount:
            summaryData.overdueAccounts || prev.overdueUsersCount,
          totalBalance: summaryData.totalOutstanding || prev.totalBalance,
        }));
      }

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
              bill.status === "overdue" || new Date(bill.dueDate) < new Date(),
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

      usersWithBalanceData.sort((a, b) => b.currentBalance - a.currentBalance);

      let totalBalanceSum = 0,
        usersWithPositiveBalance = 0,
        usersWithOverdue = 0;
      let activeCycles = 0,
        pausedCycles = 0;

      for (const user of usersWithBalanceData) {
        totalBalanceSum += user.currentBalance;
        if (user.currentBalance > 0) usersWithPositiveBalance++;
        if (user.overdueBills.length > 0) usersWithOverdue++;
      }
      for (const cycle of cyclesData) {
        if (cycle.status === "active") activeCycles++;
        if (cycle.status === "paused") pausedCycles++;
      }

      const [proRatedResult, activationsResult] = await Promise.all([
        getPendingProRatedBills(),
        getPendingActivations(),
      ]);

      const newStats = {
        totalUsers: usersWithBalanceData.length,
        totalBalance: totalBalanceSum,
        usersWithBalanceCount: usersWithPositiveBalance,
        overdueUsersCount: usersWithOverdue,
        activeCyclesCount: activeCycles,
        pausedCyclesCount: pausedCycles,
        pendingProRatedCount: proRatedResult?.data?.length || 0,
        pendingActivationsCount: activationsResult?.data?.length || 0,
      };

      setUsers(usersWithBalanceData);
      setStats(newStats);
      setPendingProRated(proRatedResult?.data || []);
      setPendingActivations(activationsResult?.data || []);

      billingStorage.setItem(CACHE_KEYS.BILLING_DATA, {
        users: usersWithBalanceData,
        billingCycles: cyclesData,
        bills: billsList,
      });
      billingStorage.setItem(CACHE_KEYS.BILLING_TIMESTAMP, Date.now());
      billingStorage.setItem(CACHE_KEYS.BILLING_STATS, newStats);

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
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    loadBillingFlowSettings();
    loadPlans();
    loadBuildings();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleRefresh = () => {
    loadedRef.current = false;
    loadData(true);
  };

  const handleManualCustomerSubmit = async () => {
    if (
      !manualCustomerForm.firstName ||
      !manualCustomerForm.lastName ||
      !manualCustomerForm.email ||
      !manualCustomerForm.phoneNumber
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!manualCustomerForm.planId) {
      toast.error("Please select a plan");
      return;
    }

    try {
      const result = await createManualCustomer({
        ...manualCustomerForm,
        startBillingImmediately: manualCustomerForm.startBillingImmediately,
      });

      toast.success(result.message || "Customer created successfully!");
      setShowManualCustomerModal(false);
      setManualCustomerForm({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        buildingId: "",
        buildingName: "",
        floor: "",
        unitNumber: "",
        planId: "",
        idType: "Valid ID",
        idNumber: "",
        startBillingImmediately: true,
        installationDate: "",
        notes: "",
      });
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    }
  };

  // ==================== FIXED: START BILLING FOR APPLICATION - USES AUTHENTICATED API ====================
  const handleStartBillingForApplication = async (
    applicationId: string,
    userEmail: string,
    customerName: string,
  ) => {
    if (
      !confirm(
        `Start billing for ${customerName} (${applicationId})?\n\nAn invoice will be generated and sent to ${userEmail}.`,
      )
    ) {
      return;
    }

    try {
      toast.loading("Starting billing...", { id: "start-billing-app" });

      // Use the authenticated API function, NOT direct fetch
      const result = await startBillingForApplication(applicationId, {});

      toast.dismiss("start-billing-app");

      if (result.success) {
        toast.success(
          `✅ Billing started for ${customerName}! Invoice sent to ${userEmail}`,
        );
        // Refresh the data
        loadedRef.current = false;
        loadData(true);
        // Close the modal if open
        setShowExistingCustomersModal(false);
      } else {
        toast.error(result.message || "Failed to start billing");
      }
    } catch (error: any) {
      toast.dismiss("start-billing-app");
      console.error("Start billing error:", error);

      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to start billing";
      toast.error(errorMsg);

      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      }
    }
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
      const response = await startBilling({
        userId: selectedUserId,
        startDate: startDate || undefined,
        customAmount: customAmount ? parseFloat(customAmount) : undefined,
        notes: billingNotes,
      });

      const data = response.data;
      if (data.isAfterCutoff) {
        toast.success(
          `✅ Installation after cutoff. Combined bill of ₱${(data.proRatedAmount + data.monthlyRate).toFixed(2)} generated!`,
        );
      } else {
        toast.success(
          `✅ Pro-rated amount of ₱${data.proRatedAmount.toFixed(2)} generated!`,
        );
      }
      toast.success(`📧 Invoice sent to customer`);

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
      toast.success("⏸️ Billing paused successfully!");
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

  const handleResumeBilling = async (userId: string, userFirstName: string) => {
    if (!confirm(`Resume billing for ${userFirstName}?`)) return;
    try {
      await resumeBilling({ userId });
      toast.success(`✅ Billing resumed for ${userFirstName}!`);
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
      toast.success(`⛔ Billing stopped for ${userFirstName}.`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
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
    if (!confirm(`Start monthly billing for ${userEmail}?`)) return;
    try {
      await startMonthlyBilling({ userId });
      toast.success(`✅ Monthly billing started for ${userEmail}!`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to start monthly billing",
      );
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

  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    customersWithoutAccounts.length;

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
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowManualCustomerModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FiUserPlus className="w-4 h-4" /> Add Customer
            </button>
            {customersWithoutAccounts.length > 0 && (
              <button
                onClick={() => setShowExistingCustomersModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <FiUser className="w-4 h-4" /> Existing (
                {customersWithoutAccounts.length})
              </button>
            )}
            {totalPendingCount > 0 && (
              <button
                onClick={() => {
                  setPendingModalType("pro-rated");
                  setShowPendingModal(true);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
              >
                <FiBell className="w-4 h-4" /> Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <FiSettings className="w-4 h-4" /> Settings
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
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
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
            <FiClipboard className="w-8 h-8 text-red-100" />
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
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pro-rated Due</p>
              <p className="text-2xl font-bold text-purple-600">
                {billingFlowSettings.proRatedDueDay}
              </p>
              <p className="text-xs text-gray-400">Day of month</p>
            </div>
            <FiCalendar className="w-8 h-8 text-purple-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cutoff Day</p>
              <p className="text-2xl font-bold text-indigo-600">
                {billingFlowSettings.billingCutoffDay}
              </p>
              <p className="text-xs text-gray-400">After = next month</p>
            </div>
            <FiCalendar className="w-8 h-8 text-indigo-100" />
          </div>
        </div>
      </div>

      {/* Billing Flow Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <FiInfo className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              📋 Current Billing Flow Settings:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-blue-700">
              <div>
                • Install Day 1-{billingFlowSettings.billingCutoffDay}:
                Pro-rated bill due on {billingFlowSettings.proRatedDueDay}th of
                current month
              </div>
              <div>
                • Install Day {billingFlowSettings.billingCutoffDay + 1}-31:
                Combined bill (pro-rated + next month) due on{" "}
                {billingFlowSettings.monthlyDueDay}th
              </div>
              <div>
                • {billingFlowSettings.gracePeriodDays} day(s) grace period
                before suspension
              </div>
            </div>
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
                          onClick={() => openEmailModal(user, "custom")}
                          className="p-1 text-purple-600 hover:text-purple-800"
                          title="Send Email"
                        >
                          <FiMail className="w-4 h-4" />
                        </button>
                        {user.billingCycle?.status === "paused" ? (
                          <button
                            onClick={() =>
                              handleResumeBilling(user._id, user.firstName)
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMAIL MODAL */}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openEmailModal(emailUser, "invoice")}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Invoice Reminder
                  </button>
                  <button
                    onClick={() =>
                      openEmailModal(emailUser, "payment_confirmation")
                    }
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    Payment Confirmation
                  </button>
                  <button
                    onClick={() => openEmailModal(emailUser, "disconnection")}
                    className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  >
                    Disconnection Notice
                  </button>
                  <button
                    onClick={() => openEmailModal(emailUser, "welcome")}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    Welcome Email
                  </button>
                  <button
                    onClick={() => openEmailModal(emailUser, "custom")}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Custom Message
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email subject"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Enter your email message here..."
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  📧 This email will be sent to {emailUser.email}. The email
                  will include your signature automatically.
                </p>
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
                  onClick={handleSendManualEmail}
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

      {/* MANUAL CUSTOMER MODAL */}
      {showManualCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Add New Customer
              </h2>
              <button
                onClick={() => setShowManualCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={manualCustomerForm.firstName}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={manualCustomerForm.lastName}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={manualCustomerForm.email}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={manualCustomerForm.phoneNumber}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiHome className="inline mr-1 w-4 h-4" /> Building (Optional)
                </label>
                <select
                  value={manualCustomerForm.buildingId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={loadingBuildings}
                >
                  <option value="">-- Select Building (Optional) --</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.buildingName} - {building.streetAddress},{" "}
                      {building.city}
                    </option>
                  ))}
                </select>
                {loadingBuildings && (
                  <p className="text-xs text-gray-400 mt-1">
                    Loading buildings...
                  </p>
                )}
                {buildings.length === 0 && !loadingBuildings && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No buildings found. You can still proceed without selecting
                    a building.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Name
                </label>
                <input
                  type="text"
                  value={manualCustomerForm.buildingName}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      buildingName: e.target.value,
                    })
                  }
                  placeholder="Enter building name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Auto-filled when you select a building above, or type manually
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor/Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 5th Floor"
                    value={manualCustomerForm.floor}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        floor: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 501"
                    value={manualCustomerForm.unitNumber}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        unitNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan *
                </label>
                <select
                  value={manualCustomerForm.planId}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      planId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a plan</option>
                  {plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} - ₱{plan.price?.toLocaleString()}/month (
                      {plan.speed?.download} Mbps)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Type
                </label>
                <select
                  value={manualCustomerForm.idType}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      idType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option>Valid ID</option>
                  <option>Driver's License</option>
                  <option>Passport</option>
                  <option>National ID</option>
                  <option>Postal ID</option>
                  <option>UMID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={manualCustomerForm.idNumber}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      idNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={manualCustomerForm.startBillingImmediately}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        startBillingImmediately: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Start billing immediately after creation
                  </span>
                </label>
              </div>

              {manualCustomerForm.startBillingImmediately && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installation Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={manualCustomerForm.installationDate}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        installationDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualCustomerForm.notes}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowManualCustomerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualCustomerSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Create Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Customers Without Accounts Modal - FIXED BUTTON */}
      {showExistingCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Customers Without Accounts
              </h2>
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {customersWithoutAccounts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No customers without accounts
                </p>
              ) : (
                customersWithoutAccounts.map((customer) => (
                  <div
                    key={customer._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.phoneNumber}
                        </p>
                        <p className="text-xs text-gray-400">
                          Application ID: {customer.applicationId}
                        </p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          Plan: {customer.planId?.name || "N/A"} - ₱
                          {customer.planId?.price?.toLocaleString() || 0}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleStartBillingForApplication(
                            customer.applicationId,
                            customer.email,
                            `${customer.firstName} ${customer.lastName}`,
                          )
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <FiPlay className="w-4 h-4" /> Start Billing
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Billing Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiSettings className="text-gray-500" /> Basic Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grace Period (Days)
                    </label>
                    <input
                      type="number"
                      value={billingFlowSettings.gracePeriodDays}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          gracePeriodDays: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiCalendar className="text-blue-500" /> Billing Flow Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pro-rated Due Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={billingFlowSettings.proRatedDueDay}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          proRatedDueDay: parseInt(e.target.value) || 25,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Due Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={billingFlowSettings.monthlyDueDay}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          monthlyDueDay: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Cutoff Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={billingFlowSettings.billingCutoffDay}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          billingCutoffDay: parseInt(e.target.value) || 24,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>📌 How it works:</strong>
                    <br />• Install on Day 1-
                    {billingFlowSettings.billingCutoffDay}: Pro-rated bill from
                    install date to end of month, due on{" "}
                    {billingFlowSettings.proRatedDueDay}th
                    <br />• Install on Day{" "}
                    {billingFlowSettings.billingCutoffDay + 1}-31: Combined bill
                    (pro-rated for remaining days + next month's full bill), due
                    on {billingFlowSettings.monthlyDueDay}th of next month
                  </p>
                </div>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={billingFlowSettings.enableAutoBilling}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          enableAutoBilling: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Enable Automatic Billing Generation
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={billingFlowSettings.sendInvoiceOnInstall}
                      onChange={(e) =>
                        setBillingFlowSettings({
                          ...billingFlowSettings,
                          sendInvoiceOnInstall: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Send Invoice Email Immediately on Installation
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBillingFlowSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Save All Settings
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
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Billing will be calculated based on the installation date and
                current billing flow settings.
              </p>
            </div>
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
                  Notes
                </label>
                <textarea
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
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
              Pause Billing
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
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
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ When paused: No bills will be generated, service will be
                  disconnected.
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
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {selectedUser.overdueBills.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedUser.billingCycle?.status || selectedUser.status)}`}
                  >
                    {selectedUser.billingCycle?.status === "paused"
                      ? "Paused"
                      : selectedUser.status}
                  </span>
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
                <tbody>
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
                            ? `${formatDateFixed(bill.billingPeriod.start)} - ${formatDateFixed(bill.billingPeriod.end)}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDateFixed(bill.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₱{bill.total?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              handleMarkBillAsPaid(bill, selectedUser)
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
            <div className="flex justify-end gap-3">
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
