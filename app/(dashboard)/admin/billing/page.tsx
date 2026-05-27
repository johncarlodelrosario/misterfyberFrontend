// app/(dashboard)/admin/billing/page.tsx - COMPLETE FIXED VERSION WITH APPLICATION ID PRIORITY (NO EMAIL)
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllBillingCycles,
  getAllBills,
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
} from "@/services/admin";
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
  FiHash,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface CustomerWithBilling {
  // Primary identifier - Application ID
  applicationId: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
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
  hasUserAccount: boolean;
  userId?: string;
  billingStarted: boolean;
  billingCycleId?: string;
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

export default function AdminBillingPage() {
  const [customers, setCustomers] = useState<CustomerWithBilling[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithBilling | null>(null);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showManualCustomerModal, setShowManualCustomerModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingProRated, setPendingProRated] = useState<any[]>([]);
  const [pendingActivations, setPendingActivations] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalType, setPendingModalType] = useState<
    "pro-rated" | "activation"
  >("pro-rated");

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
    totalCustomers: 0,
    totalBalance: 0,
    customersWithBalanceCount: 0,
    overdueCustomersCount: 0,
    activeCyclesCount: 0,
    pausedCyclesCount: 0,
    pendingProRatedCount: 0,
    pendingActivationsCount: 0,
    customersWithoutAccountsCount: 0,
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
      setBuildings(data.data || []);
    } catch (error) {
      console.error("Failed to load buildings:", error);
    } finally {
      setLoadingBuildings(false);
    }
  };

  // Load all applications (including those without user accounts)
  const loadAllApplications = async () => {
    try {
      const response = await fetch("/api/applications?limit=1000");
      const data = await response.json();
      const allApps = data.data || [];
      console.log(`📋 Loaded ${allApps.length} total applications`);
      return allApps;
    } catch (error) {
      console.error("Failed to load applications:", error);
      return [];
    }
  };

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

  // MAIN LOAD DATA FUNCTION - Prioritizes Application ID
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
      console.log("🔄 Loading billing data by Application ID...");

      const [
        cyclesResult,
        billsResult,
        allUsersResult,
        summaryResult,
        customersWithoutAccountsResult,
        proRatedResult,
        activationsResult,
        allApplicationsResult,
      ] = await Promise.all([
        getAllBillingCycles({ limit: 1000, forceRefresh }),
        getAllBills({ limit: 1000, forceRefresh }),
        getAllUsers({ limit: 1000 }),
        getBillingSummaryAdmin().catch(() => ({ data: {} })),
        getCustomersWithoutAccounts().catch(() => ({ data: [] })),
        getPendingProRatedBills().catch(() => ({ data: [] })),
        getPendingActivations().catch(() => ({ data: [] })),
        loadAllApplications(),
      ]);

      if (!isMountedRef.current) return;

      const cyclesData = cyclesResult?.data || [];
      const billsList = billsResult?.data || [];
      const usersData = allUsersResult?.data || [];
      const summaryData = summaryResult?.data || {};
      const customersWithoutAccountsData =
        customersWithoutAccountsResult?.data || [];
      const proRatedData = proRatedResult?.data || [];
      const activationsData = activationsResult?.data || [];
      const applicationsData = allApplicationsResult || [];

      console.log(
        `📊 Data loaded: ${cyclesData.length} cycles, ${billsList.length} bills, ${usersData.length} users, ${applicationsData.length} applications`,
      );

      setBillingCycles(cyclesData);
      setBills(billsList);
      setPendingProRated(proRatedData);
      setPendingActivations(activationsData);
      setCustomersWithoutAccounts(customersWithoutAccountsData);
      setApplications(applicationsData);

      // Build a map of user accounts by email/applicationId for quick lookup
      const userByEmail = new Map();
      const userByApplicationId = new Map();

      for (const user of usersData) {
        if (user.email) userByEmail.set(user.email.toLowerCase(), user);
        if (user.applicationId)
          userByApplicationId.set(user.applicationId, user);
      }

      // Create a map of bills by userId and by applicationId
      const billsByUserId = new Map();
      const billsByApplicationId = new Map();

      for (const bill of billsList) {
        // Group by userId if exists
        if (bill.userId?._id) {
          if (!billsByUserId.has(bill.userId._id))
            billsByUserId.set(bill.userId._id, []);
          billsByUserId.get(bill.userId._id).push(bill);
        }
        // Group by applicationId if exists
        if (bill.applicationId) {
          if (!billsByApplicationId.has(bill.applicationId))
            billsByApplicationId.set(bill.applicationId, []);
          billsByApplicationId.get(bill.applicationId).push(bill);
        }
      }

      // Create a map of cycles by userId and by applicationId
      const cyclesByUserId = new Map();
      const cyclesByApplicationId = new Map();

      for (const cycle of cyclesData) {
        if (cycle.userId?._id) {
          cyclesByUserId.set(cycle.userId._id, cycle);
        }
        if (cycle.applicationId) {
          cyclesByApplicationId.set(cycle.applicationId.toString(), cycle);
        }
      }

      // Build customer list - PRIORITIZE APPLICATIONS (customers without accounts)
      const customerMap = new Map<string, CustomerWithBilling>();

      // First, add all applications (approved applications that may or may not have billing)
      for (const app of applicationsData) {
        if (app.status === "approved" || app.status === "pending") {
          const appId = app.applicationId;
          const userAccount =
            userByEmail.get(app.email?.toLowerCase()) ||
            userByApplicationId.get(appId);
          const userBills = userAccount
            ? billsByUserId.get(userAccount._id) || []
            : billsByApplicationId.get(app._id) || [];
          const userCycle = userAccount
            ? cyclesByUserId.get(userAccount._id)
            : cyclesByApplicationId.get(app._id);

          const totalBalance = userBills.reduce(
            (sum: number, bill: any) => sum + (bill.total || 0),
            0,
          );
          const overdueBills = userBills.filter(
            (bill: any) =>
              bill.status === "overdue" ||
              (bill.status === "sent" && new Date(bill.dueDate) < new Date()),
          );

          customerMap.set(appId, {
            applicationId: appId,
            _id: app._id,
            firstName: app.firstName,
            lastName: app.lastName,
            email: app.email,
            phoneNumber: app.phoneNumber,
            status: app.billingStarted
              ? userCycle?.status || "active"
              : "pending_activation",
            planId: app.planId,
            currentBalance: totalBalance,
            unpaidBills: userBills,
            overdueBills: overdueBills,
            billingCycle: userCycle,
            hasUserAccount: !!userAccount,
            userId: userAccount?._id,
            billingStarted: app.billingStarted || false,
            billingCycleId: app.billingCycleId,
          });
        }
      }

      // Then, add any users that don't have associated applications (legacy users)
      for (const user of usersData) {
        const found = Array.from(customerMap.values()).some(
          (c) => c.email === user.email,
        );
        if (!found) {
          const userBills = billsByUserId.get(user._id) || [];
          const totalBalance = userBills.reduce(
            (sum: number, bill: any) => sum + (bill.total || 0),
            0,
          );
          const overdueBills = userBills.filter(
            (bill: any) =>
              bill.status === "overdue" ||
              (bill.status === "sent" && new Date(bill.dueDate) < new Date()),
          );
          const userCycle = cyclesByUserId.get(user._id);

          customerMap.set(user._id, {
            applicationId: `USER-${user._id.slice(-8)}`,
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: user.status,
            planId: user.planId,
            currentBalance: totalBalance,
            unpaidBills: userBills,
            overdueBills: overdueBills,
            billingCycle: userCycle,
            hasUserAccount: true,
            userId: user._id,
            billingStarted: !!userCycle,
            billingCycleId: userCycle?._id,
          });
        }
      }

      // Convert map to array and sort
      let customersList = Array.from(customerMap.values());
      customersList.sort((a, b) => b.currentBalance - a.currentBalance);

      // Calculate statistics
      let totalBalanceSum = 0;
      let customersWithPositiveBalance = 0;
      let customersWithOverdue = 0;
      let activeCycles = 0;
      let pausedCycles = 0;

      for (const customer of customersList) {
        totalBalanceSum += customer.currentBalance;
        if (customer.currentBalance > 0) customersWithPositiveBalance++;
        if (customer.overdueBills.length > 0) customersWithOverdue++;
        if (customer.billingCycle?.status === "active") activeCycles++;
        if (customer.billingCycle?.status === "paused") pausedCycles++;
      }

      const newStats = {
        totalCustomers: customersList.length,
        totalBalance: totalBalanceSum,
        customersWithBalanceCount: customersWithPositiveBalance,
        overdueCustomersCount: customersWithOverdue,
        activeCyclesCount: activeCycles,
        pausedCyclesCount: pausedCycles,
        pendingProRatedCount: proRatedData.length,
        pendingActivationsCount: activationsData.length,
        customersWithoutAccountsCount: customersWithoutAccountsData.length,
      };

      setCustomers(customersList);
      setStats(newStats);

      console.log(
        `✅ Stats calculated: Total customers: ${customersList.length}, Total balance: ₱${totalBalanceSum.toLocaleString()}`,
      );
      console.log(
        `📋 Customers without accounts: ${customersWithoutAccountsData.length}`,
      );

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

  const handleStartBillingForApplication = async (
    applicationId: string,
    customerEmail: string,
    customerName: string,
  ) => {
    if (
      !confirm(
        `Start billing for ${customerName} (Application ID: ${applicationId})?\n\nAn invoice will be generated and sent to ${customerEmail}.`,
      )
    ) {
      return;
    }

    try {
      toast.loading("Starting billing...", { id: "start-billing-app" });
      const response = await fetch(
        `/api/applications/${applicationId}/start-billing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const result = await response.json();
      toast.dismiss("start-billing-app");

      if (result.success) {
        toast.success(
          `✅ Billing started for ${customerName}! Invoice sent to ${customerEmail}`,
        );
        loadedRef.current = false;
        loadData(true);
        setShowExistingCustomersModal(false);
      } else {
        toast.error(result.message || "Failed to start billing");
      }
    } catch (error: any) {
      toast.dismiss("start-billing-app");
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  const handleMarkBillAsPaid = async (
    bill: any,
    customer: CustomerWithBilling,
  ) => {
    if (
      !confirm(
        `Mark invoice ${bill.invoiceNumber} as paid? This will update ${customer.firstName}'s balance.`,
      )
    )
      return;
    try {
      await markBillAsPaid(bill._id, {
        referenceNumber: `ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin`,
      });
      toast.success(`✅ Invoice ${bill.invoiceNumber} marked as paid!`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    }
  };

  const handleStartBilling = async () => {
    if (!selectedApplicationId && !selectedCustomerId) {
      toast.error("Please select a customer by Application ID");
      return;
    }
    try {
      const payload: any = {};
      if (selectedApplicationId) {
        payload.applicationId = selectedApplicationId;
      } else if (selectedCustomerId) {
        payload.userId = selectedCustomerId;
      }
      payload.startDate = startDate || undefined;
      payload.customAmount = customAmount
        ? parseFloat(customAmount)
        : undefined;
      payload.notes = billingNotes;

      const response = await startBilling(payload);
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
      setSelectedCustomerId("");
      setSelectedApplicationId("");
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
    if (!selectedCustomerId && !selectedApplicationId) {
      toast.error("Please select a customer");
      return;
    }
    try {
      await pauseBilling({
        userId: selectedCustomerId,
        reason: pauseReason || "Admin initiated pause",
        pauseUntilDate: pauseUntilDate || undefined,
      });
      toast.success("⏸️ Billing paused successfully!");
      setShowPauseModal(false);
      setSelectedCustomerId("");
      setSelectedApplicationId("");
      setPauseReason("");
      setPauseUntilDate("");
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    }
  };

  const handleResumeBilling = async (
    customerId: string,
    customerName: string,
  ) => {
    if (!confirm(`Resume billing for ${customerName}?`)) return;
    try {
      await resumeBilling({ userId: customerId });
      toast.success(`✅ Billing resumed for ${customerName}!`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    }
  };

  const handleStopBilling = async (
    customerId: string,
    customerName: string,
  ) => {
    if (
      !confirm(
        `Stop billing for ${customerName}? This will cancel their active billing cycle permanently.`,
      )
    )
      return;
    try {
      await stopBilling({ userId: customerId, reason: "Admin action" });
      toast.success(`⛔ Billing stopped for ${customerName}.`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleDisconnect = async (customerId: string, customerName: string) => {
    const reason = prompt("Enter reason for disconnection:");
    if (reason === null) return;
    try {
      await disconnectClient({ userId: customerId, reason });
      toast.success(`🔌 ${customerName} disconnected.`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    }
  };

  const handleReconnect = async (customerId: string, customerName: string) => {
    try {
      await reconnectClient({ userId: customerId });
      toast.success(`🔌 ${customerName} reconnected.`);
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    }
  };

  const handleConfirmProRatedPayment = async (
    customerId: string,
    billId: string,
    customerEmail: string,
  ) => {
    if (
      !confirm(
        `Confirm pro-rated payment for ${customerEmail}? This will activate their service.`,
      )
    )
      return;
    try {
      await confirmProRatedPayment({
        userId: customerId,
        paymentDetails: { confirmedBy: "admin", confirmedAt: new Date() },
      });
      toast.success(
        `✅ Pro-rated payment confirmed! ${customerEmail}'s service is now active.`,
      );
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    }
  };

  const handleStartMonthlyBilling = async (
    customerId: string,
    customerEmail: string,
  ) => {
    if (!confirm(`Start monthly billing for ${customerEmail}?`)) return;
    try {
      await startMonthlyBilling({ userId: customerId });
      toast.success(`✅ Monthly billing started for ${customerEmail}!`);
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
      pending: "bg-yellow-100 text-yellow-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return "text-green-600";
    if (balance > 1000) return "text-red-600 font-bold";
    return "text-orange-600";
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.applicationId
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "has_balance")
      return matchesSearch && customer.currentBalance > 0;
    if (statusFilter === "overdue")
      return matchesSearch && customer.overdueBills.length > 0;
    if (statusFilter === "active")
      return matchesSearch && customer.status === "active";
    if (statusFilter === "suspended")
      return matchesSearch && customer.status === "suspended";
    if (statusFilter === "paused")
      return matchesSearch && customer.billingCycle?.status === "paused";
    if (statusFilter === "no_account")
      return matchesSearch && !customer.hasUserAccount;
    return matchesSearch;
  });

  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    customersWithoutAccounts.length;

  if (loading && customers.length === 0) {
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
              Manage customer balances, bills, and subscriptions by Application
              ID
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
                <FiUser className="w-4 h-4" /> Pending (
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
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalCustomers}
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
                {stats.customersWithBalanceCount}
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
                {stats.overdueCustomersCount}
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
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">No Account</p>
              <p className="text-2xl font-bold text-pink-600">
                {stats.customersWithoutAccountsCount}
              </p>
              <p className="text-xs text-gray-400">Need billing start</p>
            </div>
            <FiHash className="w-8 h-8 text-pink-100" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 text-xs text-blue-700">
              <div>
                • Install Day 1-{billingFlowSettings.billingCutoffDay}:
                Pro-rated bill due on {billingFlowSettings.proRatedDueDay}th
              </div>
              <div>
                • Install Day {billingFlowSettings.billingCutoffDay + 1}-31:
                Combined bill (pro-rated + next month)
              </div>
              <div>
                • {billingFlowSettings.gracePeriodDays} day(s) grace period
                before suspension
              </div>
              <div>
                • Primary ID: <strong>Application ID</strong> (user account
                optional)
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
              placeholder="Search by Application ID, name, email..."
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
            <option value="no_account">No Account Yet</option>
          </select>
        </div>
      </div>

      {/* Customers Table - Prioritizes Application ID */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Application ID
                </th>
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
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.applicationId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiHash className="w-4 h-4 text-gray-400" />
                        <code className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {customer.applicationId}
                        </code>
                      </div>
                      {!customer.hasUserAccount && (
                        <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                          No account
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <p className="text-xs text-gray-400">
                        {customer.phoneNumber}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.planId?.name || "No Plan"}
                      {customer.planId?.price && (
                        <p className="text-xs text-gray-500">
                          ₱{customer.planId.price.toLocaleString()}/mo
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`text-lg font-bold ${getBalanceColor(customer.currentBalance)}`}
                      >
                        ₱{customer.currentBalance.toLocaleString()}
                      </p>
                      {customer.overdueBills.length > 0 && (
                        <p className="text-xs text-red-500">
                          {customer.overdueBills.length} overdue
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {customer.unpaidBills.length} bill(s)
                      {customer.unpaidBills.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {customer.unpaidBills
                            .map((b) => b.invoiceNumber)
                            .join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(customer.billingCycle?.status || customer.status)}`}
                      >
                        {customer.billingCycle?.status === "paused"
                          ? "Paused"
                          : customer.status}
                      </span>
                      {customer.billingCycle?.proRatedPaid === false && (
                        <p className="text-xs text-purple-600 mt-1">
                          Awaiting payment
                        </p>
                      )}
                      {customer.billingStarted && !customer.hasUserAccount && (
                        <p className="text-xs text-green-600 mt-1">
                          Billing started
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerDetailModal(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        {!customer.billingStarted ? (
                          <button
                            onClick={() =>
                              handleStartBillingForApplication(
                                customer.applicationId,
                                customer.email,
                                `${customer.firstName} ${customer.lastName}`,
                              )
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Start Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                        ) : customer.billingCycle?.status === "paused" ? (
                          <button
                            onClick={() =>
                              handleResumeBilling(
                                customer.userId!,
                                customer.firstName,
                              )
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Resume Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                          </button>
                        ) : customer.billingCycle?.status === "active" ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCustomerId(customer.userId!);
                                setSelectedApplicationId(
                                  customer.applicationId,
                                );
                                setShowPauseModal(true);
                              }}
                              className="p-1 text-yellow-600 hover:text-yellow-800"
                              title="Pause Billing"
                            >
                              <FiPause className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleStopBilling(
                                  customer.userId!,
                                  customer.firstName,
                                )
                              }
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Stop Billing"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                        {customer.status === "active" ? (
                          <button
                            onClick={() =>
                              handleDisconnect(
                                customer.userId!,
                                customer.firstName,
                              )
                            }
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Disconnect"
                          >
                            <FiWifiOff className="w-4 h-4" />
                          </button>
                        ) : customer.status === "suspended" ? (
                          <button
                            onClick={() =>
                              handleReconnect(
                                customer.userId!,
                                customer.firstName,
                              )
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

      {/* Pending Modals */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
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
            <div className="space-y-3">
              {pendingModalType === "pro-rated" &&
                pendingProRated.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No pending pro-rated payments
                  </p>
                )}
              {pendingModalType === "activation" &&
                pendingActivations.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No pending activations
                  </p>
                )}
              {pendingModalType === "pro-rated" &&
                pendingProRated.map((bill) => (
                  <div key={bill._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {bill.userId?.firstName} {bill.userId?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {bill.userId?.email}
                        </p>
                        <p className="text-sm">Invoice: {bill.invoiceNumber}</p>
                        <p className="text-sm">
                          Amount: ₱{bill.total?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Due: {formatDateFixed(bill.dueDate)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleConfirmProRatedPayment(
                            bill.userId?._id,
                            bill._id,
                            bill.userId?.email,
                          )
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Confirm Payment & Activate
                      </button>
                    </div>
                  </div>
                ))}
              {pendingModalType === "activation" &&
                pendingActivations.map((cycle) => (
                  <div key={cycle._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {cycle.userId?.firstName} {cycle.userId?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {cycle.userId?.email}
                        </p>
                        <p className="text-sm">Plan: {cycle.planId?.name}</p>
                        <p className="text-sm">
                          Monthly Rate: ₱{cycle.monthlyRate?.toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600">
                          Pro-rated paid:{" "}
                          {cycle.proRatedPaidAt
                            ? formatDateFixed(cycle.proRatedPaidAt)
                            : "N/A"}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleStartMonthlyBilling(
                            cycle.userId?._id,
                            cycle.userId?.email,
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Start Monthly Billing
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPendingModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Customers Without Accounts Modal */}
      {showExistingCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Customers Without Accounts (Approved Applications)
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
                        <p className="text-xs font-mono text-blue-600">
                          Application ID: {customer.applicationId}
                        </p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          Plan: {customer.planId?.name || "N/A"} - ₱
                          {customer.planId?.price?.toLocaleString() || 0}
                        </p>
                        {customer.billingStarted && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Billing already started - Invoice sent to email
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          handleStartBillingForApplication(
                            customer.applicationId,
                            customer.email,
                            `${customer.firstName} ${customer.lastName}`,
                          )
                        }
                        disabled={customer.billingStarted}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          customer.billingStarted
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        } text-white`}
                      >
                        <FiPlay className="w-4 h-4" />
                        {customer.billingStarted
                          ? "Billing Started"
                          : "Start Billing"}
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

      {/* Start Billing Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Start Billing
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  Billing will be associated with the Application ID. Customer
                  can register later using their Application ID.
                </p>
              </div>
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
                    setSelectedCustomerId("");
                    setSelectedApplicationId("");
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

      {/* User Detail Modal */}
      {showCustomerDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h2>
                <p className="text-gray-500">{selectedCustomer.email}</p>
                <p className="text-sm font-mono text-blue-600 mt-1">
                  Application ID: {selectedCustomer.applicationId}
                </p>
                {!selectedCustomer.hasUserAccount && (
                  <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    No user account created yet
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCustomerDetailModal(false)}
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
                    className={`text-2xl font-bold ${getBalanceColor(selectedCustomer.currentBalance)}`}
                  >
                    ₱{selectedCustomer.currentBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unpaid Bills</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedCustomer.unpaidBills.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {selectedCustomer.overdueBills.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedCustomer.billingCycle?.status || selectedCustomer.status)}`}
                  >
                    {selectedCustomer.billingCycle?.status === "paused"
                      ? "Paused"
                      : selectedCustomer.status}
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
                  {selectedCustomer.unpaidBills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No unpaid bills
                      </td>
                    </tr>
                  ) : (
                    selectedCustomer.unpaidBills.map((bill) => (
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
                              handleMarkBillAsPaid(bill, selectedCustomer)
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
                onClick={() => setShowCustomerDetailModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
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
                    setSelectedCustomerId("");
                    setSelectedApplicationId("");
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
                      {plan.name} - ₱{plan.price?.toLocaleString()}/month
                    </option>
                  ))}
                </select>
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
    </div>
  );
}
