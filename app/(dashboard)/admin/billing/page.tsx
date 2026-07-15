"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  deleteBillingCycle,
  clearBillingCache,
  markBillAsPaid,
  markInstallationBillAsPaid,
  getPendingProRatedBills,
  getPendingInstallationBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  startBillingForApplication,
  initializeBackdatedBilling,
  recoverMissingBills,
  getUnpaidBillsReport,
} from "@/services/billing";
import {
  getPendingPayments,
  confirmPayment,
  rejectPayment,
} from "@/services/payment";
import {
  getAllUsers,
  createManualCustomer,
  getCustomersWithoutAccounts,
  getAllApplications,
} from "@/services/admin";
import {
  FiX,
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiSettings,
  FiUser,
  FiActivity,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiEye,
  FiClock,
  FiSearch,
  FiBell,
  FiCalendar,
  FiUserPlus,
  FiMail,
  FiFileText,
  FiTrash2,
  FiCalendar as FiCalendarIcon,
  FiHome,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUp,
  FiArrowDown,
  FiInfo,
  FiCheckCircle,
  FiPrinter,
  FiMoreVertical,
} from "react-icons/fi";
import toast from "react-hot-toast";
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";
import BillingTable from "@/components/admin/billingTable";

// ==================== TYPES ====================
interface CustomerItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phoneNumber: string;
  status: string;
  type: "user" | "application";
  planName: string;
  planPrice: number;
  currentBalance: number;
  unpaidBills: any[];
  overdueBills: any[];
  billingCycle?: any;
  applicationId?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
  building?: {
    _id?: string;
    buildingName: string;
    streetAddress?: string;
    city?: string;
  } | null;
  unitNumber?: string;
  floor?: string;
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

type SortField = "name" | "plan" | "balance" | "status" | "installationFee";
type SortDirection = "asc" | "desc";

// ==================== GLOBAL CACHE ====================
let globalCache: any = null;
let globalCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (reduced from 10)

// ==================== HELPERS ====================
function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function formatBillingPeriod(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "-";
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
}

function getBuildingDisplay(customer: CustomerItem): string {
  if (customer.building) {
    if (
      typeof customer.building === "object" &&
      customer.building.buildingName
    ) {
      return customer.building.buildingName;
    }
    if (typeof customer.building === "string") {
      return customer.building;
    }
  }
  return "-";
}

// ==================== MAIN PAGE COMPONENT ====================
export default function AdminBillingPage() {
  // ==================== STATE ====================
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [buildingsList, setBuildingsList] = useState<Building[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(
    null,
  );
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showManualCustomerModal, setShowManualCustomerModal] = useState(false);
  const [showBackdatedModal, setShowBackdatedModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [includeInstallationFee, setIncludeInstallationFee] = useState(true);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingProRated, setPendingProRated] = useState<any[]>([]);
  const [pendingInstallationBills, setPendingInstallationBills] = useState<
    any[]
  >([]);
  const [pendingActivations, setPendingActivations] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalType, setPendingModalType] = useState<
    "pro-rated" | "activation" | "payments" | "installation"
  >("pro-rated");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<CustomerItem | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailType, setEmailType] = useState("custom");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [billingSettings, setBillingSettingsState] = useState<any>(null);
  const [showBillingReportsModal, setShowBillingReportsModal] = useState(false);
  const [unpaidBillsReport, setUnpaidBillsReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [backdatedForm, setBackdatedForm] = useState({
    applicationId: "",
    serviceStartDate: "",
    customPlanName: "",
    monthlyRate: "",
    skipFirstBill: false,
    notes: "",
    includeInstallationFee: true,
  });
  const [backdatedLoading, setBackdatedLoading] = useState(false);
  const [selectedBackdatedCustomer, setSelectedBackdatedCustomer] =
    useState<any>(null);

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
    includeInstallationFee: true,
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [customersWithoutAccounts, setCustomersWithoutAccounts] = useState<
    any[]
  >([]);
  const [showExistingCustomersModal, setShowExistingCustomersModal] =
    useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(
    null,
  );

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
    installationFee: 1500,
    installationFeeDueDays: 7,
    autoSendReminders: true,
    autoSuspendOnNonPayment: true,
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
    pendingPaymentsCount: 0,
    pendingInstallationBillsCount: 0,
    applicationsWithoutBilling: 0,
    totalInstallationFeesDue: 0,
    installationFeesPaidCount: 0,
  });

  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);
  const dataLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== LOAD PLANS & BUILDINGS ====================
  const loadPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      const data = await response.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error("Failed to load plans:", error);
    }
  };

  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const response = await fetch("/api/buildings/active");
      const data = await response.json();
      setBuildings(data.data || []);
      setBuildingsList(data.data || []);
    } catch (error) {
      console.error("Failed to load buildings:", error);
    } finally {
      setLoadingBuildings(false);
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
          freeDays: settingsData.freeDays || 0,
          gracePeriodDays: settingsData.gracePeriodDays || 5,
          reminderDays: settingsData.reminderDays || [7, 3, 1],
          installationFee: settingsData.installationFee || 1500,
          installationFeeDueDays: settingsData.installationFeeDueDays || 7,
          autoSendReminders: settingsData.autoSendReminders !== false,
          autoSuspendOnNonPayment:
            settingsData.autoSuspendOnNonPayment !== false,
        });
        setBillingSettingsState(settingsData);
      }
    } catch (error) {
      console.error("Failed to load billing flow settings:", error);
    }
  };

  const saveBillingFlowSettings = async () => {
    try {
      await updateBillingSettingsAdmin({ ...billingFlowSettings });
      toast.success("✅ Billing flow settings saved successfully!");
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    }
  };

  // ==================== HANDLE BACKDATED BILLING ====================
  const handleBackdatedBilling = async () => {
    if (!backdatedForm.applicationId) {
      toast.error("Please select a customer");
      return;
    }
    if (!backdatedForm.serviceStartDate) {
      toast.error("Please enter the service start date");
      return;
    }
    if (!backdatedForm.customPlanName && !backdatedForm.monthlyRate) {
      toast.error("Please enter either a plan name or monthly rate");
      return;
    }

    setBackdatedLoading(true);
    try {
      const result = await initializeBackdatedBilling({
        applicationId: backdatedForm.applicationId,
        serviceStartDate: backdatedForm.serviceStartDate,
        customPlanName: backdatedForm.customPlanName || undefined,
        monthlyRate: backdatedForm.monthlyRate
          ? parseFloat(backdatedForm.monthlyRate)
          : undefined,
        skipFirstBill: backdatedForm.skipFirstBill,
        notes: backdatedForm.notes,
        includeInstallationFee: backdatedForm.includeInstallationFee,
      });

      if (result.success) {
        toast.success(result.message);
        setShowBackdatedModal(false);
        setBackdatedForm({
          applicationId: "",
          serviceStartDate: "",
          customPlanName: "",
          monthlyRate: "",
          skipFirstBill: false,
          notes: "",
          includeInstallationFee: true,
        });
        setSelectedBackdatedCustomer(null);
        globalCache = null;
        globalCacheTimestamp = 0;
        await loadData(true);
      } else {
        toast.error(result.message || "Failed to initialize backdated billing");
      }
    } catch (error: any) {
      console.error("Backdated billing error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to initialize backdated billing",
      );
    } finally {
      setBackdatedLoading(false);
    }
  };

  // ==================== HANDLE RECOVER MISSING BILLS ====================
  const handleRecoverMissingBills = async (customer: CustomerItem) => {
    if (!customer.applicationId && customer.type !== "application") {
      toast.error("Only application customers can recover missing bills");
      return;
    }

    const startFromDate = prompt(
      "Enter start date for recovery (YYYY-MM-DD) or leave empty to auto-detect:",
      "",
    );

    try {
      toast.loading("Recovering missing bills...", { id: "recover-bills" });
      const result = await recoverMissingBills({
        applicationId: customer.applicationId!,
        startFromDate: startFromDate || undefined,
      });
      toast.dismiss("recover-bills");

      if (result.success) {
        toast.success(result.message);
        globalCache = null;
        globalCacheTimestamp = 0;
        await loadData(true);
      } else {
        toast.error(result.message || "Failed to recover missing bills");
      }
    } catch (error: any) {
      toast.dismiss("recover-bills");
      toast.error(
        error.response?.data?.message || "Failed to recover missing bills",
      );
    }
  };

  // ==================== HANDLE DELETE BILLING CYCLE ====================
  const handleDeleteBillingCycle = async (customer: CustomerItem) => {
    if (!customer.billingCycle?._id) {
      toast.error("No billing cycle found to delete");
      return;
    }

    if (
      !confirm(
        `⚠️ Are you sure you want to delete the billing cycle for ${customer.firstName} ${customer.lastName}?\n\nThis action cannot be undone and will remove all billing records for this customer.`,
      )
    ) {
      return;
    }

    try {
      const result = await deleteBillingCycle({
        billingCycleId: customer.billingCycle._id,
        applicationId: customer.applicationId,
      });

      if (result.success) {
        toast.success(
          `✅ Billing cycle deleted for ${customer.firstName} ${customer.lastName}`,
        );
        globalCache = null;
        globalCacheTimestamp = 0;
        await loadData(true);
      } else {
        toast.error(result.message || "Failed to delete billing cycle");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    }
  };

  // ==================== HANDLE EMAIL ====================
  const handleSendManualEmail = async () => {
    if (!emailCustomer) return;
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
          email: emailCustomer.email,
          emailType: emailType,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`📧 Email sent successfully to ${emailCustomer.email}`);
        setShowEmailModal(false);
        setEmailCustomer(null);
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

  const openEmailModal = (customer: CustomerItem, templateType: string) => {
    setEmailCustomer(customer);
    setEmailType(templateType);

    switch (templateType) {
      case "invoice":
        setEmailSubject(`Invoice Reminder - MisterFyber`);
        setEmailMessage(
          `Dear ${customer.firstName},\n\nThis is a friendly reminder that you have an outstanding balance of ₱${customer.currentBalance.toLocaleString()}.\n\nPlease log in to your account to view and pay your invoice.\n\nThank you for your prompt payment.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "payment_confirmation":
        setEmailSubject(`Payment Confirmation - MisterFyber`);
        setEmailMessage(
          `Dear ${customer.firstName},\n\nThank you for your payment! Your account has been credited.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "disconnection":
        setEmailSubject(
          `Important: Service Disconnection Notice - MisterFyber`,
        );
        setEmailMessage(
          `Dear ${customer.firstName},\n\nThis is to notify you that your internet service has been disconnected due to non-payment.\n\nTo restore your service, please settle your outstanding balance of ₱${customer.currentBalance.toLocaleString()}.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      case "welcome":
        setEmailSubject(`Welcome to MisterFyber!`);
        setEmailMessage(
          `Dear ${customer.firstName},\n\nWelcome to MisterFyber! We're excited to have you as our customer.\n\nYour account has been successfully set up. You can now log in to your account to manage your subscription.\n\nBest regards,\nMisterFyber Team`,
        );
        break;
      default:
        setEmailSubject(`Message from MisterFyber`);
        setEmailMessage(`Dear ${customer.firstName},\n\n`);
    }
    setShowEmailModal(true);
  };

  // ==================== HANDLE BILLING ACTIONS ====================
  const handlePauseBillingForApplication = async (customer: CustomerItem) => {
    const reason = prompt("Enter reason for pausing:");
    if (reason === null) return;

    try {
      await pauseBilling({
        applicationId: customer.applicationId,
        reason: reason || "Admin initiated pause",
      });
      toast.success(
        `⏸️ Billing paused for ${customer.firstName} ${customer.lastName}!`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    }
  };

  const handleResumeBillingForApplication = async (customer: CustomerItem) => {
    if (
      !confirm(`Resume billing for ${customer.firstName} ${customer.lastName}?`)
    )
      return;

    try {
      await resumeBilling({ applicationId: customer.applicationId });
      toast.success(
        `✅ Billing resumed for ${customer.firstName} ${customer.lastName}!`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    }
  };

  const handleDisconnectApplication = async (customer: CustomerItem) => {
    const reason = prompt("Enter reason for disconnection:");
    if (reason === null) return;

    if (
      !confirm(
        `⚠️ Disconnect ${customer.firstName} ${customer.lastName} from the network?`,
      )
    )
      return;

    try {
      await disconnectClient({ applicationId: customer.applicationId, reason });
      toast.success(
        `🔌 ${customer.firstName} ${customer.lastName} disconnected.`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to disconnect");
    }
  };

  const handleReconnectApplication = async (customer: CustomerItem) => {
    if (
      !confirm(
        `Reconnect ${customer.firstName} ${customer.lastName} to the network?`,
      )
    )
      return;

    try {
      await reconnectClient({ applicationId: customer.applicationId });
      toast.success(
        `🔌 ${customer.firstName} ${customer.lastName} reconnected.`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reconnect");
    }
  };

  const handleStopBillingForApplication = async (customer: CustomerItem) => {
    if (
      !confirm(
        `Stop billing for ${customer.firstName} ${customer.lastName}? This will cancel the subscription.`,
      )
    )
      return;

    try {
      await stopBilling({
        applicationId: customer.applicationId,
        reason: "Admin action",
      });
      toast.success(
        `⛔ Billing stopped for ${customer.firstName} ${customer.lastName}.`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleMarkInstallationBillAsPaid = async (
    bill: any,
    customer: CustomerItem,
  ) => {
    if (!confirm(`Mark installation invoice ${bill.invoiceNumber} as paid?`))
      return;
    try {
      await markInstallationBillAsPaid(bill._id, {
        referenceNumber: `INST-ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
      });
      toast.success(
        `✅ Installation invoice ${bill.invoiceNumber} marked as paid!`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      await loadData(true);
    } catch (error: any) {
      console.error("Mark installation bill as paid error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as paid",
      );
    }
  };

  // ==================== LOAD DATA ====================
  const loadData = useCallback(
    async (forceRefresh = false) => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        console.log("⏳ Load already in progress, skipping...");
        return;
      }

      // If data is already loaded and not forcing refresh, use cached data
      if (dataLoadedRef.current && !forceRefresh) {
        console.log("📦 Data already loaded, using existing state");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check global cache
      const now = Date.now();
      if (!forceRefresh && globalCache) {
        if (now - globalCacheTimestamp < CACHE_TTL) {
          const cached = globalCache;
          setCustomers(cached.customers);
          setBillingCycles(cached.billingCycles);
          setBills(cached.bills);
          setPendingPayments(cached.pendingPayments);
          setStats(cached.stats);
          setPendingProRated(cached.pendingProRated || []);
          setPendingActivations(cached.pendingActivations || []);
          setPendingInstallationBills(cached.pendingInstallationBills || []);
          setCustomersWithoutAccounts(cached.customersWithoutAccounts || []);
          setLoading(false);
          setRefreshing(false);
          dataLoadedRef.current = true;
          console.log("✅ Using global cached billing data");
          return;
        } else {
          // Cache expired
          globalCache = null;
          dataLoadedRef.current = false;
        }
      }

      // If we have customers but no cache and not forcing refresh
      if (customers.length > 0 && !forceRefresh) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Start loading
      isLoadingRef.current = true;

      if (forceRefresh) {
        setRefreshing(true);
        clearBillingCache();
        globalCache = null;
        globalCacheTimestamp = 0;
        dataLoadedRef.current = false;
      } else {
        setLoading(true);
      }

      try {
        console.log("🔄 Loading billing data...");

        const [
          cyclesResult,
          billsResult,
          usersResult,
          applicationsResult,
          pendingPaymentsResult,
          customersWithoutAccountsResult,
          pendingInstallationBillsResult,
        ] = await Promise.all([
          getAllBillingCycles({
            limit: 1000, // Increased limit to get all data
            page: 1,
            forceRefresh,
          }),
          getAllBills({
            limit: 1000, // Increased limit to get all data
            page: 1,
            forceRefresh,
          }),
          getAllUsers({ limit: 1000, forceRefresh }).catch(() => ({
            data: [],
          })),
          getAllApplications({ limit: 1000, forceRefresh }).catch(() => ({
            data: [],
          })),
          getPendingPayments(forceRefresh).catch(() => ({ data: [] })),
          getCustomersWithoutAccounts().catch(() => ({ data: [] })),
          getPendingInstallationBills().catch(() => ({ data: [] })),
        ]);

        if (!isMountedRef.current) {
          isLoadingRef.current = false;
          return;
        }

        const cyclesData = cyclesResult?.data || [];
        const billsList = billsResult?.data || [];
        const usersList = usersResult?.data || [];
        const applicationsList = applicationsResult?.data || [];
        const pendingPaymentsList = pendingPaymentsResult?.data || [];
        const customersWithoutAccountsData =
          customersWithoutAccountsResult?.data || [];
        const pendingInstallationBillsData =
          pendingInstallationBillsResult?.data || [];

        setBillingCycles(cyclesData);
        setBills(billsList);
        setPendingPayments(pendingPaymentsList);
        setCustomersWithoutAccounts(customersWithoutAccountsData);
        setPendingInstallationBills(pendingInstallationBillsData);

        // Build customers - moved to a separate function for better performance
        const allCustomers = buildCustomers(
          usersList,
          applicationsList,
          billsList,
          cyclesData,
          buildingsList,
        );

        setCustomers(allCustomers);

        // Calculate stats
        const newStats = calculateStats(
          allCustomers,
          cyclesData,
          applicationsList,
          pendingPaymentsList,
          pendingInstallationBillsData,
        );

        setStats(newStats);

        // Get pending data
        const [proRatedResult, activationsResult] = await Promise.all([
          getPendingProRatedBills(),
          getPendingActivations(),
        ]);

        const pendingProRatedData = proRatedResult?.data || [];
        const pendingActivationsData = activationsResult?.data || [];

        setPendingProRated(pendingProRatedData);
        setPendingActivations(pendingActivationsData);

        // Update cache
        globalCache = {
          customers: allCustomers,
          billingCycles: cyclesData,
          bills: billsList,
          pendingPayments: pendingPaymentsList,
          stats: newStats,
          pendingProRated: pendingProRatedData,
          pendingActivations: pendingActivationsData,
          pendingInstallationBills: pendingInstallationBillsData,
          customersWithoutAccounts: customersWithoutAccountsData,
        };
        globalCacheTimestamp = now;
        dataLoadedRef.current = true;

        console.log(
          `✅ Loaded ${allCustomers.length} customers (cached globally)`,
        );
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
        isLoadingRef.current = false;
        initialLoadDone.current = true;
      }
    },
    [buildingsList],
  ); // Removed pagination dependency

  // Helper function to build customers
  const buildCustomers = (
    usersList: any[],
    applicationsList: any[],
    billsList: any[],
    cyclesData: any[],
    buildingsList: Building[],
  ): CustomerItem[] => {
    const userCustomers: CustomerItem[] = usersList.map((user: any) => {
      const userBills = billsList.filter(
        (bill: any) =>
          bill.userId?._id === user._id &&
          bill.status !== "paid" &&
          !bill.isInstallationBill,
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
        (cycle: any) =>
          cycle.userId?._id === user._id || cycle.userId === user._id,
      );

      let buildingObj = user.building || null;
      if (buildingObj && typeof buildingObj === "object" && !buildingObj._id) {
        const foundBuilding = buildingsList.find(
          (b) => b.buildingName === buildingObj.buildingName,
        );
        if (foundBuilding) {
          buildingObj = foundBuilding;
        }
      }

      return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        status: user.status,
        type: "user" as const,
        planName: user.planId?.name || "No Plan",
        planPrice: user.planId?.price || 0,
        currentBalance: totalBalance,
        unpaidBills: userBills,
        overdueBills: overdueBills,
        billingCycle: userCycle || null,
        installationFee: 0,
        installationFeePaid: true,
        building: buildingObj,
        unitNumber: user.unitNumber,
        floor: user.floor,
      };
    });

    const applicationCustomers: CustomerItem[] = applicationsList
      .filter(
        (app: any) => app.status === "approved" || app.billingStarted === true,
      )
      .map((app: any) => {
        const appBills = billsList.filter(
          (bill: any) =>
            bill.applicationId === app.applicationId &&
            bill.status !== "paid" &&
            !bill.isInstallationBill,
        );
        const totalBalance = appBills.reduce(
          (sum: number, bill: any) => sum + (bill.total || 0),
          0,
        );
        const overdueBills = appBills.filter(
          (bill: any) =>
            bill.status === "overdue" || new Date(bill.dueDate) < new Date(),
        );
        const appCycle = cyclesData.find(
          (cycle: any) => cycle.applicationId === app.applicationId,
        );

        let buildingObj = null;
        if (app.buildingId) {
          if (typeof app.buildingId === "object" && app.buildingId._id) {
            buildingObj = app.buildingId;
          } else if (typeof app.buildingId === "string") {
            const foundBuilding = buildingsList.find(
              (b) =>
                b._id === app.buildingId || b.buildingName === app.buildingId,
            );
            if (foundBuilding) {
              buildingObj = foundBuilding;
            }
          }
        }
        if (!buildingObj && app.buildingName) {
          const foundBuilding = buildingsList.find(
            (b) => b.buildingName === app.buildingName,
          );
          if (foundBuilding) {
            buildingObj = foundBuilding;
          } else {
            buildingObj = { buildingName: app.buildingName };
          }
        }

        return {
          _id: app._id,
          firstName: app.firstName,
          lastName: app.lastName,
          email: app.email,
          phoneNumber: app.phoneNumber,
          status: app.billingStarted ? "billing_started" : "approved",
          type: "application" as const,
          planName: app.planId?.name || "No Plan",
          planPrice: app.planId?.price || 0,
          currentBalance: totalBalance,
          unpaidBills: appBills,
          overdueBills: overdueBills,
          billingCycle: appCycle || null,
          applicationId: app.applicationId,
          installationFee: app.installationFee || 0,
          installationFeePaid: app.installationFeePaid || false,
          building: buildingObj,
          unitNumber: app.unitNumber,
          floor: app.floor,
        };
      });

    const allCustomers = [...userCustomers, ...applicationCustomers];
    allCustomers.sort((a, b) => b.currentBalance - a.currentBalance);
    return allCustomers;
  };

  // Helper function to calculate stats
  const calculateStats = (
    allCustomers: CustomerItem[],
    cyclesData: any[],
    applicationsList: any[],
    pendingPaymentsList: any[],
    pendingInstallationBillsData: any[],
  ) => {
    const totalBalance = allCustomers.reduce(
      (sum, c) => sum + c.currentBalance,
      0,
    );
    const customersWithBalance = allCustomers.filter(
      (c) => c.currentBalance > 0,
    ).length;
    const overdueCustomers = allCustomers.filter(
      (c) => c.overdueBills.length > 0,
    ).length;
    const activeCycles = cyclesData.filter(
      (c: any) => c.status === "active",
    ).length;
    const pausedCycles = cyclesData.filter(
      (c: any) => c.status === "paused",
    ).length;
    const applicationsWithoutBilling = applicationsList.filter(
      (app: any) => app.status === "approved" && !app.billingStarted,
    ).length;

    const totalInstallationFeesDue = allCustomers
      .filter(
        (c) =>
          c.type === "application" &&
          !c.installationFeePaid &&
          (c.installationFee || 0) > 0,
      )
      .reduce((sum, c) => sum + (c.installationFee || 0), 0);
    const installationFeesPaidCount = allCustomers.filter(
      (c) => c.type === "application" && c.installationFeePaid,
    ).length;

    return {
      totalCustomers: allCustomers.length,
      totalBalance: totalBalance,
      customersWithBalanceCount: customersWithBalance,
      overdueCustomersCount: overdueCustomers,
      activeCyclesCount: activeCycles,
      pausedCyclesCount: pausedCycles,
      pendingProRatedCount: 0,
      pendingActivationsCount: 0,
      pendingPaymentsCount: pendingPaymentsList.length,
      pendingInstallationBillsCount: pendingInstallationBillsData.length,
      applicationsWithoutBilling: applicationsWithoutBilling,
      totalInstallationFeesDue: totalInstallationFeesDue,
      installationFeesPaidCount: installationFeesPaidCount,
    };
  };

  // ==================== HANDLE ACTION ====================
  const handleAction = (action: string, customer: CustomerItem, data?: any) => {
    switch (action) {
      case "view":
        setSelectedCustomer(customer);
        setShowCustomerDetailModal(true);
        break;
      case "email":
        openEmailModal(customer, "custom");
        break;
      case "recover":
        handleRecoverMissingBills(customer);
        break;
      case "start":
        setSelectedApplicationId(customer.applicationId || customer._id);
        setSelectedCustomerName(`${customer.firstName} ${customer.lastName}`);
        setSelectedCustomerEmail(customer.email);
        setIncludeInstallationFee(true);
        setShowStartModal(true);
        break;
      case "pause":
        if (customer.type === "application") {
          handlePauseBillingForApplication(customer);
        } else {
          setSelectedUserId(customer._id);
          setShowPauseModal(true);
        }
        break;
      case "resume":
        if (customer.type === "application") {
          handleResumeBillingForApplication(customer);
        } else {
          handleResumeBilling(customer._id, customer.firstName);
        }
        break;
      case "disconnect":
        if (customer.type === "application") {
          handleDisconnectApplication(customer);
        } else {
          handleDisconnect(customer);
        }
        break;
      case "reconnect":
        if (customer.type === "application") {
          handleReconnectApplication(customer);
        } else {
          handleReconnect(customer);
        }
        break;
      case "stop":
        if (customer.type === "application") {
          handleStopBillingForApplication(customer);
        } else {
          handleStopBilling(customer._id, customer.firstName);
        }
        break;
      case "delete":
        setCustomerToDelete(customer);
        setShowDeleteConfirmModal(true);
        break;
      default:
        break;
    }
  };

  // ==================== HANDLE RESUME BILLING ====================
  const handleResumeBilling = async (userId: string, customerName: string) => {
    if (!confirm(`Resume billing for ${customerName}?`)) return;
    try {
      await resumeBilling({ userId });
      toast.success(`✅ Billing resumed for ${customerName}!`);
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    }
  };

  const handleStopBilling = async (userId: string, customerName: string) => {
    if (
      !confirm(
        `Stop billing for ${customerName}? This will cancel the subscription.`,
      )
    )
      return;
    try {
      await stopBilling({ userId, reason: "Admin action" });
      toast.success(`⛔ Billing stopped for ${customerName}.`);
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    }
  };

  const handleDisconnect = async (customer: CustomerItem) => {
    const reason = prompt(
      "Enter reason for disconnection (e.g., non-payment, violation):",
    );
    if (reason === null) return;

    if (
      !confirm(
        `⚠️ Disconnect ${customer.firstName} ${customer.lastName} from the network?\n\nReason: ${reason}\n\nThis will disable their internet access immediately.`,
      )
    )
      return;

    try {
      await disconnectClient({ userId: customer._id, reason });
      toast.success(
        `🔌 ${customer.firstName} ${customer.lastName} disconnected from network.`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    }
  };

  const handleReconnect = async (customer: CustomerItem) => {
    if (
      !confirm(
        `Reconnect ${customer.firstName} ${customer.lastName} to the network?`,
      )
    )
      return;

    try {
      await reconnectClient({ userId: customer._id });
      toast.success(
        `🔌 ${customer.firstName} ${customer.lastName} reconnected to network.`,
      );
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      console.error("Reconnect error:", error);
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    }
  };

  // ==================== HANDLE CONFIRM PAYMENT ====================
  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("Confirm this payment? This will mark the bill as paid."))
      return;
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed! User notified.");
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;
    try {
      await rejectPayment(paymentId, reason);
      toast.success("Payment rejected");
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    }
  };

  const handleMarkBillAsPaid = async (bill: any, customer: CustomerItem) => {
    if (!confirm(`Mark invoice ${bill.invoiceNumber} as paid?`)) return;
    try {
      await markBillAsPaid(bill._id, {
        referenceNumber: `ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
      });
      toast.success(`✅ Invoice ${bill.invoiceNumber} marked as paid!`);
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      console.error("Mark bill as paid error:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    }
  };

  // ==================== HANDLE START BILLING ====================
  const handleStartBillingForApplication = async () => {
    if (!selectedApplicationId) {
      toast.error("No application selected");
      return;
    }

    try {
      toast.loading("Starting billing...", { id: "start-billing-app" });
      const result = await startBillingForApplication(selectedApplicationId, {
        installationDate: startDate || undefined,
        notes: billingNotes,
        includeInstallationFee: includeInstallationFee,
      });
      toast.dismiss("start-billing-app");

      if (result.success) {
        const feeMsg = includeInstallationFee
          ? ` Includes installation fee of ₱${billingFlowSettings.installationFee.toLocaleString()}.`
          : "";
        toast.success(
          `✅ Billing started for ${selectedCustomerName}! Service is now ACTIVE. Invoice sent to ${selectedCustomerEmail}.${feeMsg}`,
        );
        setShowStartModal(false);
        setSelectedApplicationId("");
        setSelectedCustomerName("");
        setSelectedCustomerEmail("");
        setStartDate("");
        setCustomAmount("");
        setBillingNotes("");
        setIncludeInstallationFee(true);
        globalCache = null;
        globalCacheTimestamp = 0;
        dataLoadedRef.current = false;
        await loadData(true);
      } else {
        toast.error(result.message || "Failed to start billing");
      }
    } catch (error: any) {
      toast.dismiss("start-billing-app");
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  const handleStartBillingForUser = async () => {
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
        includeInstallationFee: includeInstallationFee,
      });
      toast.success(`✅ Billing started! Invoice sent to customer`);
      setShowStartModal(false);
      setSelectedUserId("");
      setStartDate("");
      setCustomAmount("");
      setBillingNotes("");
      setIncludeInstallationFee(true);
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
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
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    }
  };

  // ==================== HANDLE MANUAL CUSTOMER ====================
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
        includeInstallationFee: manualCustomerForm.includeInstallationFee,
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
        includeInstallationFee: true,
      });
      globalCache = null;
      globalCacheTimestamp = 0;
      dataLoadedRef.current = false;
      await loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    }
  };

  // ==================== USE EFFECTS ====================
  useEffect(() => {
    isMountedRef.current = true;

    // Only load data once on mount
    if (!dataLoadedRef.current && customers.length === 0) {
      // Use a slight delay to prevent multiple rapid calls
      const timer = setTimeout(() => {
        loadData();
      }, 100);
      return () => clearTimeout(timer);
    }

    loadBillingFlowSettings();
    loadPlans();
    loadBuildings();

    return () => {
      isMountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // ==================== HANDLE REFRESH ====================
  const handleRefresh = () => {
    globalCache = null;
    globalCacheTimestamp = 0;
    dataLoadedRef.current = false;
    loadData(true);
  };

  // ==================== COMPUTED VALUES ====================
  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    pendingPayments.length +
    pendingInstallationBills.length +
    customersWithoutAccounts.length +
    stats.applicationsWithoutBilling;

  // ==================== RENDER ====================
  return (
    <div>
      <BillingTable
        customers={customers}
        billingCycles={billingCycles}
        bills={bills}
        pendingPayments={pendingPayments}
        loading={loading}
        refreshing={refreshing}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        buildingFilter={buildingFilter}
        setBuildingFilter={setBuildingFilter}
        buildingsList={buildingsList}
        pagination={pagination}
        setPagination={setPagination}
        sortField={sortField}
        setSortField={setSortField}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        stats={stats}
        onAction={handleAction}
        onRefresh={handleRefresh}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenManualCustomer={() => setShowManualCustomerModal(true)}
        onOpenBackdated={() => setShowBackdatedModal(true)}
        onOpenExistingCustomers={() => setShowExistingCustomersModal(true)}
        onOpenPending={() => {
          setPendingModalType("pro-rated");
          setShowPendingModal(true);
        }}
        onOpenReports={() => setShowBillingReportsModal(true)}
        totalPendingCount={totalPendingCount}
        customersWithoutAccounts={customersWithoutAccounts}
        applicationsWithoutBillingCount={stats.applicationsWithoutBilling}
      />

      {/* ==================== MODALS ==================== */}
      {/* Billing Reports Modal */}
      <BillingReportsWithDownload
        isOpen={showBillingReportsModal}
        onClose={() => setShowBillingReportsModal(false)}
        customers={customers}
        buildings={buildingsList}
        onMarkBillAsPaid={handleMarkBillAsPaid}
        onMarkInstallationBillAsPaid={handleMarkInstallationBillAsPaid}
      />

      {/* Backdated Billing Modal */}
      {showBackdatedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Backdated Billing
              </h2>
              <button
                onClick={() => {
                  setShowBackdatedModal(false);
                  setSelectedBackdatedCustomer(null);
                  setBackdatedForm({
                    applicationId: "",
                    serviceStartDate: "",
                    customPlanName: "",
                    monthlyRate: "",
                    skipFirstBill: false,
                    notes: "",
                    includeInstallationFee: true,
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg text-sm">
                <p className="font-semibold text-amber-800">📌 When to use:</p>
                <p className="text-xs text-amber-700">
                  Customer has been using internet for past months - generates
                  all missing bills from start date
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Customer *
                </label>
                <select
                  value={backdatedForm.applicationId}
                  onChange={(e) => {
                    const appId = e.target.value;
                    const customer = customers.find(
                      (c) =>
                        c.type === "application" &&
                        c.applicationId === appId &&
                        !c.billingCycle,
                    );
                    setSelectedBackdatedCustomer(customer);
                    setBackdatedForm({
                      ...backdatedForm,
                      applicationId: appId,
                      customPlanName: customer?.planName || "",
                      monthlyRate: customer?.planPrice?.toString() || "",
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Select a customer...</option>
                  {customers
                    .filter(
                      (c) =>
                        c.type === "application" &&
                        !c.billingCycle &&
                        c.applicationId,
                    )
                    .map((c) => (
                      <option key={c.applicationId} value={c.applicationId}>
                        {c.firstName} {c.lastName} - {c.email}
                      </option>
                    ))}
                </select>
              </div>
              {selectedBackdatedCustomer && (
                <div className="bg-green-50 p-2 rounded-lg text-sm">
                  <p className="font-medium">
                    {selectedBackdatedCustomer.firstName}{" "}
                    {selectedBackdatedCustomer.lastName}
                  </p>
                  <p className="text-xs">
                    {selectedBackdatedCustomer.email} |{" "}
                    {selectedBackdatedCustomer.planName} - ₱
                    {selectedBackdatedCustomer.planPrice}/mo
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Start Date *
                </label>
                <input
                  type="date"
                  value={backdatedForm.serviceStartDate}
                  onChange={(e) =>
                    setBackdatedForm({
                      ...backdatedForm,
                      serviceStartDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              {!selectedBackdatedCustomer?.planName && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      value={backdatedForm.customPlanName}
                      onChange={(e) =>
                        setBackdatedForm({
                          ...backdatedForm,
                          customPlanName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rate (₱)
                    </label>
                    <input
                      type="number"
                      value={backdatedForm.monthlyRate}
                      onChange={(e) =>
                        setBackdatedForm({
                          ...backdatedForm,
                          monthlyRate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={backdatedForm.includeInstallationFee}
                    onChange={(e) =>
                      setBackdatedForm({
                        ...backdatedForm,
                        includeInstallationFee: e.target.checked,
                      })
                    }
                  />
                  Include Installation Fee (₱
                  {billingFlowSettings.installationFee.toLocaleString()})
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={backdatedForm.skipFirstBill}
                    onChange={(e) =>
                      setBackdatedForm({
                        ...backdatedForm,
                        skipFirstBill: e.target.checked,
                      })
                    }
                  />
                  Skip first bill
                </label>
              </div>
              <div>
                <textarea
                  value={backdatedForm.notes}
                  onChange={(e) =>
                    setBackdatedForm({
                      ...backdatedForm,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBackdatedModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackdatedBilling}
                  disabled={backdatedLoading}
                  className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {backdatedLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                      Processing...
                    </>
                  ) : (
                    <>Generate</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">
                Delete Billing Cycle
              </h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setCustomerToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="text-red-800 font-semibold text-sm">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="text-sm mt-1">
                Delete billing cycle for{" "}
                <span className="font-medium">
                  {customerToDelete.firstName} {customerToDelete.lastName}
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Balance: ₱{customerToDelete.currentBalance.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setCustomerToDelete(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteBillingCycle(customerToDelete);
                  setShowDeleteConfirmModal(false);
                  setCustomerToDelete(null);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Billing Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Start Billing</h2>
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setSelectedUserId("");
                  setSelectedApplicationId("");
                  setStartDate("");
                  setCustomAmount("");
                  setBillingNotes("");
                  setIncludeInstallationFee(true);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg text-sm mb-4">
              <p>
                <strong>Customer:</strong> {selectedCustomerName}
              </p>
              <p>
                <strong>Email:</strong> {selectedCustomerEmail}
              </p>
              {selectedApplicationId && (
                <p className="font-mono text-xs break-all">
                  <strong>App ID:</strong> {selectedApplicationId}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Installation Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
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
                  placeholder="Auto-calculate"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeInstallationFee}
                  onChange={(e) => setIncludeInstallationFee(e.target.checked)}
                />
                Include Installation Fee (₱
                {billingFlowSettings.installationFee.toLocaleString()})
              </label>
              <div>
                <textarea
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="Notes..."
                />
              </div>
              <div className="bg-green-50 p-2 rounded-lg text-xs">
                <p className="font-semibold">
                  ✅ Billing will be ACTIVE immediately
                </p>
                <p>Customer can use internet right away</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    selectedApplicationId
                      ? handleStartBillingForApplication
                      : handleStartBillingForUser
                  }
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Start Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Pause Billing</h2>
              <button
                onClick={() => setShowPauseModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pause Until Date (Optional)
                </label>
                <input
                  type="date"
                  value={pauseUntilDate}
                  onChange={(e) => setPauseUntilDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseBilling}
                  className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
                >
                  Pause Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Billing Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installation Fee (₱)
                  </label>
                  <input
                    type="number"
                    value={billingFlowSettings.installationFee}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        installationFee: parseInt(e.target.value) || 1500,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Install Fee Due Days
                  </label>
                  <input
                    type="number"
                    value={billingFlowSettings.installationFeeDueDays}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        installationFeeDueDays: parseInt(e.target.value) || 7,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={billingFlowSettings.enableAutoBilling}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        enableAutoBilling: e.target.checked,
                      })
                    }
                  />{" "}
                  Enable Auto Billing
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={billingFlowSettings.sendInvoiceOnInstall}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        sendInvoiceOnInstall: e.target.checked,
                      })
                    }
                  />{" "}
                  Send Invoice on Install
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={billingFlowSettings.autoSendReminders}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        autoSendReminders: e.target.checked,
                      })
                    }
                  />{" "}
                  Auto Send Reminders
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={billingFlowSettings.autoSuspendOnNonPayment}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        autoSuspendOnNonPayment: e.target.checked,
                      })
                    }
                  />{" "}
                  Auto Suspend Overdue
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBillingFlowSettings}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showCustomerDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Customer Details
              </h2>
              <button
                onClick={() => {
                  setShowCustomerDetailModal(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p>{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p>{selectedCustomer.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="capitalize">{selectedCustomer.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p>
                    {selectedCustomer.planName} (₱
                    {selectedCustomer.planPrice.toLocaleString()}/mo)
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Balance</p>
                  <p
                    className={
                      selectedCustomer.currentBalance > 1000
                        ? "text-red-600 font-bold"
                        : selectedCustomer.currentBalance > 0
                          ? "text-orange-600"
                          : "text-green-600"
                    }
                  >
                    ₱{selectedCustomer.currentBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Building</p>
                  <p>{getBuildingDisplay(selectedCustomer)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Unit/Floor</p>
                  <p>
                    {selectedCustomer.unitNumber
                      ? `Unit ${selectedCustomer.unitNumber}`
                      : "-"}
                    {selectedCustomer.floor
                      ? `, Floor ${selectedCustomer.floor}`
                      : ""}
                  </p>
                </div>
                {selectedCustomer.applicationId && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Application ID</p>
                    <p className="font-mono text-xs break-all">
                      {selectedCustomer.applicationId}
                    </p>
                  </div>
                )}
                {selectedCustomer.type === "application" && (
                  <>
                    <div>
                      <p className="text-gray-500">Installation Fee</p>
                      <p>
                        ₱
                        {(
                          selectedCustomer.installationFee || 0
                        ).toLocaleString()}{" "}
                        <span
                          className={
                            selectedCustomer.installationFeePaid
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          (
                          {selectedCustomer.installationFeePaid
                            ? "Paid"
                            : "Unpaid"}
                          )
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Billing Status</p>
                      <p className="capitalize">
                        {selectedCustomer.billingCycle?.status || "Not started"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            {selectedCustomer.unpaidBills.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm mb-2">
                  Unpaid Bills ({selectedCustomer.unpaidBills.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-2 py-1">Invoice</th>
                        <th className="px-2 py-1">Period</th>
                        <th className="px-2 py-1">Due</th>
                        <th className="px-2 py-1">Amount</th>
                        <th className="px-2 py-1">Type</th>
                        <th className="px-2 py-1">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.unpaidBills.map((bill: any) => (
                        <tr key={bill._id}>
                          <td className="px-2 py-1 font-mono">
                            {bill.invoiceNumber}
                          </td>
                          <td className="px-2 py-1">
                            {bill.billingPeriod?.start &&
                            bill.billingPeriod?.end
                              ? formatBillingPeriod(
                                  bill.billingPeriod.start,
                                  bill.billingPeriod.end,
                                )
                              : "-"}
                          </td>
                          <td className="px-2 py-1">
                            {formatDateFixed(bill.dueDate)}
                          </td>
                          <td className="px-2 py-1 text-red-600">
                            ₱{bill.total.toLocaleString()}
                          </td>
                          <td className="px-2 py-1">
                            {bill.isInstallationBill
                              ? "Installation"
                              : bill.isProRated
                                ? "Pro-rated"
                                : "Monthly"}
                          </td>
                          <td className="px-2 py-1">
                            {bill.isInstallationBill &&
                              !bill.installationFeePaid && (
                                <button
                                  onClick={() =>
                                    handleMarkInstallationBillAsPaid(
                                      bill,
                                      selectedCustomer,
                                    )
                                  }
                                  className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded"
                                >
                                  Mark Paid
                                </button>
                              )}
                            {!bill.isInstallationBill &&
                              bill.status !== "paid" && (
                                <button
                                  onClick={() =>
                                    handleMarkBillAsPaid(bill, selectedCustomer)
                                  }
                                  className="px-2 py-0.5 bg-green-600 text-white text-xs rounded"
                                >
                                  Mark Paid
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCustomerDetailModal(false);
                  setSelectedCustomer(null);
                }}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">Pending Items</h2>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 border-b mb-3">
              <button
                onClick={() => setPendingModalType("pro-rated")}
                className={`px-3 py-1.5 text-sm font-medium ${pendingModalType === "pro-rated" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
              >
                Pro-rated ({pendingProRated.length})
              </button>
              <button
                onClick={() => setPendingModalType("installation")}
                className={`px-3 py-1.5 text-sm font-medium ${pendingModalType === "installation" ? "border-b-2 border-amber-500 text-amber-600" : "text-gray-500"}`}
              >
                Installation ({pendingInstallationBills.length})
              </button>
              <button
                onClick={() => setPendingModalType("activation")}
                className={`px-3 py-1.5 text-sm font-medium ${pendingModalType === "activation" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500"}`}
              >
                Activations ({pendingActivations.length})
              </button>
              <button
                onClick={() => setPendingModalType("payments")}
                className={`px-3 py-1.5 text-sm font-medium ${pendingModalType === "payments" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                Payments ({pendingPayments.length})
              </button>
            </div>
            <div className="overflow-x-auto">
              {pendingModalType === "pro-rated" && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left">Invoice</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProRated.map((bill: any) => (
                      <tr key={bill._id}>
                        <td className="px-3 py-2 font-mono text-xs">
                          {bill.invoiceNumber}
                        </td>
                        <td>
                          {bill.applicationData?.firstName}{" "}
                          {bill.applicationData?.lastName}
                        </td>
                        <td>₱{bill.total.toLocaleString()}</td>
                        <td>
                          <button
                            onClick={() =>
                              confirmProRatedPayment({
                                applicationId: bill.applicationId,
                              })
                            }
                            className="px-2 py-0.5 bg-green-600 text-white text-xs rounded"
                          >
                            Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {pendingModalType === "installation" && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInstallationBills.map((bill: any) => (
                      <tr key={bill._id}>
                        <td className="font-mono text-xs">
                          {bill.invoiceNumber}
                        </td>
                        <td>
                          {bill.applicationData?.firstName}{" "}
                          {bill.applicationData?.lastName}
                        </td>
                        <td>₱{bill.total.toLocaleString()}</td>
                        <td>{formatDateFixed(bill.dueDate)}</td>
                        <td>
                          <button
                            onClick={() =>
                              markInstallationBillAsPaid(bill._id, {
                                notes: "Admin confirmed",
                              })
                            }
                            className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded"
                          >
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {pendingModalType === "activation" && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingActivations.map((cycle: any) => (
                      <tr key={cycle._id}>
                        <td>
                          {cycle.applicationData?.firstName}{" "}
                          {cycle.applicationData?.lastName}
                        </td>
                        <td>{cycle.planId?.name}</td>
                        <td>₱{cycle.monthlyRate?.toLocaleString()}</td>
                        <td>
                          <button
                            onClick={() =>
                              startMonthlyBilling({
                                applicationId: cycle.applicationId,
                              })
                            }
                            className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded"
                          >
                            Activate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {pendingModalType === "payments" && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((payment: any) => (
                      <tr key={payment._id}>
                        <td className="font-mono text-xs">
                          {payment.referenceNumber}
                        </td>
                        <td>
                          {payment.application?.firstName}{" "}
                          {payment.application?.lastName}
                        </td>
                        <td>₱{payment.amount?.toLocaleString()}</td>
                        <td>{payment.paymentType}</td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              className="px-2 py-0.5 bg-green-600 text-white text-xs rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              className="px-2 py-0.5 bg-red-600 text-white text-xs rounded"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPendingModal(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">Send Email</h2>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Template
                </label>
                <select
                  value={emailType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEmailType(newType);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="custom">Custom</option>
                  <option value="invoice">Invoice Reminder</option>
                  <option value="payment_confirmation">
                    Payment Confirmation
                  </option>
                  <option value="disconnection">Disconnection Notice</option>
                  <option value="welcome">Welcome</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailCustomer(null);
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendManualEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                      Sending...
                    </>
                  ) : (
                    <>Send Email</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Customers Modal */}
      {showExistingCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">
                Existing Customers Without Billing
              </h2>
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersWithoutAccounts.map((c: any) => (
                    <tr key={c._id}>
                      <td className="px-3 py-2">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-3 py-2">{c.email}</td>
                      <td className="px-3 py-2">{c.planName}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            setSelectedApplicationId(c.applicationId);
                            setSelectedCustomerName(
                              `${c.firstName} ${c.lastName}`,
                            );
                            setSelectedCustomerEmail(c.email);
                            setIncludeInstallationFee(true);
                            setShowStartModal(true);
                            setShowExistingCustomersModal(false);
                          }}
                          className="px-2 py-0.5 bg-green-600 text-white text-xs rounded"
                        >
                          Start Billing
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.applicationsWithoutBilling > 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-center text-yellow-700 text-sm"
                      >
                        Plus {stats.applicationsWithoutBilling} more approved
                        applications without billing.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Customer Modal */}
      {showManualCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">
                Add New Customer
              </h2>
              <button
                onClick={() => setShowManualCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Plan *</label>
                <select
                  value={manualCustomerForm.planId}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      planId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="">Select plan...</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} - ₱{p.price.toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Building
                </label>
                <select
                  value={manualCustomerForm.buildingId}
                  onChange={(e) => {
                    const b = buildings.find(
                      (bld) => bld._id === e.target.value,
                    );
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      buildingId: e.target.value,
                      buildingName: b?.buildingName || "",
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="">Select building...</option>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Floor</label>
                <input
                  type="text"
                  value={manualCustomerForm.floor}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      floor: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Unit Number
                </label>
                <input
                  type="text"
                  value={manualCustomerForm.unitNumber}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      unitNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={manualCustomerForm.includeInstallationFee}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      includeInstallationFee: e.target.checked,
                    })
                  }
                />{" "}
                Include Installation Fee (₱
                {billingFlowSettings.installationFee.toLocaleString()})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={manualCustomerForm.startBillingImmediately}
                  onChange={(e) =>
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      startBillingImmediately: e.target.checked,
                    })
                  }
                />{" "}
                Start Billing Immediately (ACTIVE)
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowManualCustomerModal(false)}
                className="flex-1 px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualCustomerSubmit}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
