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
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiX,
  FiSettings,
  FiUser,
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
  FiMail,
  FiFileText,
  FiTrash2,
  FiCalendar as FiCalendarIcon,
  FiPrinter,
  FiMoreVertical,
  FiArrowUp,
  FiArrowDown,
  FiHome,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";

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

// Helper to format date as MM/DD/YYYY (no timezone shift)
function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

// Helper to format billing period correctly using ACTUAL dates
function formatBillingPeriod(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "-";

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const startMonth = start.getUTCMonth() + 1;
  const startDay = start.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();

  return `${startMonth}/${startDay}/${startYear} - ${endMonth}/${endDay}/${endYear}`;
}

// Helper to get building display name
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

export default function AdminBillingPage() {
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

  // Horizontal scroll state - buttons always shown
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isMountedRef = useRef(true);
  const loadedRef = useRef(false);

  // Check scroll position to enable/disable buttons
  const checkScrollPosition = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sorted customers
  const getSortedCustomers = (
    customersToSort: CustomerItem[],
  ): CustomerItem[] => {
    const sorted = [...customersToSort];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "plan":
          aValue = a.planName.toLowerCase();
          bValue = b.planName.toLowerCase();
          break;
        case "balance":
          aValue = a.currentBalance;
          bValue = b.currentBalance;
          break;
        case "status":
          aValue = getStatusText(a);
          bValue = getStatusText(b);
          break;
        case "installationFee":
          aValue = a.type === "application" ? a.installationFee || 0 : -1;
          bValue = b.type === "application" ? b.installationFee || 0 : -1;
          break;
        default:
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

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
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    }
  };

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
        loadedRef.current = false;
        loadData(true);
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
        loadedRef.current = false;
        loadData(true);
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
        loadedRef.current = false;
        loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      console.error("Mark installation bill as paid error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as paid",
      );
    }
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
        getAllBillingCycles({ limit: 100, forceRefresh }),
        getAllBills({ limit: 100, forceRefresh }),
        getAllUsers({ limit: 100, forceRefresh }).catch(() => ({ data: [] })),
        getAllApplications({ limit: 100, forceRefresh }).catch(() => ({
          data: [],
        })),
        getPendingPayments(forceRefresh).catch(() => ({ data: [] })),
        getCustomersWithoutAccounts().catch(() => ({ data: [] })),
        getPendingInstallationBills().catch(() => ({ data: [] })),
      ]);

      if (!isMountedRef.current) return;

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
          building: user.building,
          unitNumber: user.unitNumber,
          floor: user.floor,
        };
      });

      const applicationCustomers: CustomerItem[] = applicationsList
        .filter(
          (app: any) =>
            app.status === "approved" || app.billingStarted === true,
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
          if (
            app.buildingId &&
            typeof app.buildingId === "object" &&
            app.buildingId.buildingName
          ) {
            buildingObj = app.buildingId;
          } else if (app.buildingName) {
            buildingObj = { buildingName: app.buildingName };
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

      setCustomers(allCustomers);

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

      const [proRatedResult, activationsResult] = await Promise.all([
        getPendingProRatedBills(),
        getPendingActivations(),
      ]);

      setPendingProRated(proRatedResult?.data || []);
      setPendingActivations(activationsResult?.data || []);

      const newStats = {
        totalCustomers: allCustomers.length,
        totalBalance: totalBalance,
        customersWithBalanceCount: customersWithBalance,
        overdueCustomersCount: overdueCustomers,
        activeCyclesCount: activeCycles,
        pausedCyclesCount: pausedCycles,
        pendingProRatedCount: proRatedResult?.data?.length || 0,
        pendingActivationsCount: activationsResult?.data?.length || 0,
        pendingPaymentsCount: pendingPaymentsList.length,
        pendingInstallationBillsCount: pendingInstallationBillsData.length,
        applicationsWithoutBilling: applicationsWithoutBilling,
        totalInstallationFeesDue: totalInstallationFeesDue,
        installationFeesPaidCount: installationFeesPaidCount,
      };

      setStats(newStats);
      loadedRef.current = true;
      console.log(`✅ Loaded ${allCustomers.length} customers`);
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

    const handleResize = () => {
      checkScrollPosition();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", handleResize);
    };
  }, [loadData, checkScrollPosition]);

  useEffect(() => {
    setTimeout(checkScrollPosition, 100);
  }, [customers, checkScrollPosition]);

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
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    }
  };

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
        loadedRef.current = false;
        loadData(true);
      } else {
        toast.error(result.message || "Failed to start billing");
      }
    } catch (error: any) {
      toast.dismiss("start-billing-app");
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to start billing");
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("Confirm this payment? This will mark the bill as paid."))
      return;
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed! User notified.");
      loadData(true);
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
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
    } catch (error: any) {
      console.error("Mark bill as paid error:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
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

  const handleResumeBilling = async (userId: string, customerName: string) => {
    if (!confirm(`Resume billing for ${customerName}?`)) return;
    try {
      await resumeBilling({ userId });
      toast.success(`✅ Billing resumed for ${customerName}!`);
      loadedRef.current = false;
      loadData(true);
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
      loadedRef.current = false;
      loadData(true);
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
      if (customer.type === "user") {
        await disconnectClient({ userId: customer._id, reason });
        toast.success(
          `🔌 ${customer.firstName} ${customer.lastName} disconnected from network.`,
        );
        loadedRef.current = false;
        loadData(true);
      } else {
        await handleDisconnectApplication(customer);
      }
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
      if (customer.type === "user") {
        await reconnectClient({ userId: customer._id });
        toast.success(
          `🔌 ${customer.firstName} ${customer.lastName} reconnected to network.`,
        );
        loadedRef.current = false;
        loadData(true);
      } else {
        await handleReconnectApplication(customer);
      }
    } catch (error: any) {
      console.error("Reconnect error:", error);
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    }
  };

  const getStatusBadge = (customer: CustomerItem) => {
    const hasUnpaidBills =
      customer.unpaidBills && customer.unpaidBills.length > 0;
    const hasUnpaidInstallationFee =
      customer.type === "application" &&
      (customer.installationFee ?? 0) > 0 &&
      !customer.installationFeePaid;

    if (hasUnpaidInstallationFee) {
      return "bg-amber-100 text-amber-800";
    }

    if (customer.type === "application") {
      if (
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaidBills
      ) {
        return "bg-purple-100 text-purple-800";
      }
      if (
        customer.billingCycle?.status === "pending_activation" &&
        !hasUnpaidBills
      ) {
        return "bg-green-100 text-green-800";
      }
      if (customer.billingCycle?.status === "active") {
        return "bg-green-100 text-green-800";
      }
      if (customer.billingCycle?.status === "paused") {
        return "bg-yellow-100 text-yellow-800";
      }
      if (customer.status === "billing_started")
        return "bg-indigo-100 text-indigo-800";
      return "bg-blue-100 text-blue-800";
    }
    if (customer.billingCycle?.status === "paused")
      return "bg-yellow-100 text-yellow-800";
    if (customer.status === "active") return "bg-green-100 text-green-800";
    if (customer.status === "suspended") return "bg-red-100 text-red-800";
    if (customer.status === "pending_activation")
      return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (customer: CustomerItem) => {
    const hasUnpaidBills =
      customer.unpaidBills && customer.unpaidBills.length > 0;
    const hasUnpaidInstallationFee =
      customer.type === "application" &&
      (customer.installationFee ?? 0) > 0 &&
      !customer.installationFeePaid;

    if (hasUnpaidInstallationFee) {
      return "Installation Fee Due";
    }

    if (customer.type === "application") {
      if (
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaidBills
      ) {
        return "Awaiting Payment";
      }
      if (
        customer.billingCycle?.status === "pending_activation" &&
        !hasUnpaidBills
      ) {
        return "Active";
      }
      if (customer.billingCycle?.status === "active") {
        return "Active";
      }
      if (customer.billingCycle?.status === "paused") {
        return "Paused";
      }
      if (customer.status === "billing_started") return "Billing Started";
      return "Approved";
    }
    if (customer.billingCycle?.status === "paused") return "Paused";
    if (customer.status === "active") return "Active";
    if (customer.status === "suspended") return "Suspended";
    if (customer.status === "pending_activation") return "Pending Activation";
    return customer.status || "Inactive";
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return "text-green-600";
    if (balance > 1000) return "text-red-600 font-bold";
    return "text-orange-600";
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.applicationId &&
        customer.applicationId
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesBuilding =
      buildingFilter === "all" ||
      (customer.building && customer.building._id === buildingFilter) ||
      (customer.building &&
        customer.building.buildingName
          ?.toLowerCase()
          .includes(buildingFilter.toLowerCase()));

    if (!matchesSearch || !matchesBuilding) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "has_balance") return customer.currentBalance > 0;
    if (statusFilter === "overdue") return customer.overdueBills.length > 0;
    if (statusFilter === "active") return customer.status === "active";
    if (statusFilter === "suspended") return customer.status === "suspended";
    if (statusFilter === "paused")
      return customer.billingCycle?.status === "paused";
    if (statusFilter === "pending_activation") {
      const hasUnpaid = customer.unpaidBills && customer.unpaidBills.length > 0;
      return (
        customer.billingCycle?.status === "pending_activation" && hasUnpaid
      );
    }
    if (statusFilter === "applications") return customer.type === "application";
    if (statusFilter === "installation_fee_due")
      return (
        customer.type === "application" &&
        (customer.installationFee ?? 0) > 0 &&
        !customer.installationFeePaid
      );
    return true;
  });

  const sortedAndFilteredCustomers = getSortedCustomers(filteredCustomers);

  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    pendingPayments.length +
    pendingInstallationBills.length +
    customersWithoutAccounts.length +
    stats.applicationsWithoutBilling;

  const compactStatsCards = [
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: FiUser,
      color: "blue",
    },
    {
      label: "Total Balance",
      value: `₱${stats.totalBalance.toLocaleString()}`,
      color: "red",
    },
    {
      label: "With Balance",
      value: stats.customersWithBalanceCount,
      icon: FiAlertCircle,
      color: "orange",
    },
    {
      label: "Overdue",
      value: stats.overdueCustomersCount,
      icon: FiClock,
      color: "red",
    },
    {
      label: "Active Cycles",
      value: stats.activeCyclesCount,
      icon: FiActivity,
      color: "green",
    },
    {
      label: "Paused Cycles",
      value: stats.pausedCyclesCount,
      icon: FiPause,
      color: "yellow",
    },
    {
      label: "Pending Payments",
      value: stats.pendingPaymentsCount,
      icon: FiClock,
      color: "purple",
    },
    {
      label: "Applications",
      value: customers.filter((c) => c.type === "application").length,
      icon: FiFileText,
      color: "indigo",
    },
    {
      label: "Pro-rated Due",
      value: billingFlowSettings.proRatedDueDay,
      sub: "Day of month",
      icon: FiCalendar,
      color: "teal",
    },
    {
      label: "Installation Fee",
      value: `₱${billingFlowSettings.installationFee.toLocaleString()}`,
      sub: "One-time charge",
      color: "amber",
    },
    {
      label: "Installation Fees Due",
      value: `₱${stats.totalInstallationFeesDue.toLocaleString()}`,
      sub: "Unpaid",
      icon: FiAlertCircle,
      color: "amber",
    },
    {
      label: "Pending Install Bills",
      value: stats.pendingInstallationBillsCount,
      icon: FiFileText,
      color: "amber",
    },
  ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <FiArrowUp className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiArrowUp className="w-3 h-3" />
    ) : (
      <FiArrowDown className="w-3 h-3" />
    );
  };

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
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h1>
            <p className="text-sm text-gray-500">
              Manage customer balances, bills, payments, and subscriptions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowBillingReportsModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <FiFileText className="w-3.5 h-3.5" /> Reports
            </button>
            <button
              onClick={() => setShowBackdatedModal(true)}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiCalendarIcon className="w-3.5 h-3.5" /> Backdated
            </button>
            <button
              onClick={() => setShowManualCustomerModal(true)}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiUserPlus className="w-3.5 h-3.5" /> Add
            </button>
            {(customersWithoutAccounts.length > 0 ||
              stats.applicationsWithoutBilling > 0) && (
              <button
                onClick={() => setShowExistingCustomersModal(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiUser className="w-3.5 h-3.5" /> Existing (
                {customersWithoutAccounts.length +
                  stats.applicationsWithoutBilling}
                )
              </button>
            )}
            {totalPendingCount > 0 && (
              <button
                onClick={() => {
                  setPendingModalType("pro-rated");
                  setShowPendingModal(true);
                }}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiBell className="w-3.5 h-3.5" /> Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiSettings className="w-3.5 h-3.5" /> Settings
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {compactStatsCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm p-3 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold text-${stat.color}-600`}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-[10px] text-gray-400">{stat.sub}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="all">🏢 All Buildings</option>
            {buildingsList.map((building) => (
              <option key={building._id} value={building._id}>
                🏢 {building.buildingName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="has_balance">With Balance</option>
            <option value="overdue">Overdue</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="pending_activation">Awaiting Payment</option>
            <option value="applications">Applications Only</option>
            <option value="installation_fee_due">Installation Fee Due</option>
          </select>
        </div>
      </div>

      {/* Table with horizontal scroll buttons - FIXED AT PAGE CENTER */}
      <div className="relative">
        {/* Scrollable table container with always-visible scrollbar */}
        <div
          ref={tableContainerRef}
          onScroll={checkScrollPosition}
          className="overflow-x-auto scrollbar-always-visible"
          style={{
            scrollbarWidth: "thin",
            msOverflowStyle: "auto",
          }}
        >
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 min-w-[1100px]">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr className="border-b border-gray-300">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-gray-100 sticky left-0 z-20"></th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Customer
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("plan")}
                  >
                    <div className="flex items-center gap-1">
                      Plan
                      <SortIcon field="plan" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center gap-1">
                      Balance
                      <SortIcon field="balance" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("installationFee")}
                  >
                    <div className="flex items-center gap-1">
                      Install Fee
                      <SortIcon field="installationFee" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center gap-1">
                      <FiHome className="w-3 h-3" />
                      Building
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAndFilteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-gray-500 text-sm border-t border-gray-200"
                    >
                      No customers found
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredCustomers.map((customer, idx) => {
                    const hasUnpaidBills =
                      customer.unpaidBills && customer.unpaidBills.length > 0;
                    const hasBillingCycle = !!customer.billingCycle;
                    const isActive = customer.billingCycle?.status === "active";
                    const isPaused = customer.billingCycle?.status === "paused";
                    const isPendingActivation =
                      customer.billingCycle?.status === "pending_activation";
                    const hasUnpaidInstallationFee =
                      customer.type === "application" &&
                      (customer.installationFee ?? 0) > 0 &&
                      !customer.installationFeePaid;

                    return (
                      <tr
                        key={`${customer.type}-${customer._id}`}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                      >
                        <td className="px-3 py-2 border-r border-gray-200 text-center bg-white sticky left-0 z-10">
                          <span className="text-sm font-medium text-gray-500">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            {customer.type === "application" ? (
                              <FiFileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            ) : (
                              <FiUser className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {customer.email}
                              </p>
                              {customer.applicationId && (
                                <p className="text-[10px] text-gray-400 font-mono break-all">
                                  {customer.applicationId}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <p className="text-sm font-medium text-gray-900">
                            {customer.planName}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₱{customer.planPrice.toLocaleString()}/mo
                          </p>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <p
                            className={`text-sm font-bold ${getBalanceColor(customer.currentBalance)}`}
                          >
                            ₱{customer.currentBalance.toLocaleString()}
                          </p>
                          {customer.unpaidBills.length > 0 && (
                            <p className="text-[10px] text-red-500">
                              {customer.unpaidBills.length} unpaid
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(customer)}`}
                          >
                            {getStatusText(customer)}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          {customer.type === "application" &&
                          (customer.installationFee ?? 0) > 0 ? (
                            <div>
                              <p className="text-sm font-medium">
                                ₱
                                {(
                                  customer.installationFee ?? 0
                                ).toLocaleString()}
                              </p>
                              <p
                                className={`text-[10px] ${customer.installationFeePaid ? "text-green-600" : "text-red-600"}`}
                              >
                                {customer.installationFeePaid
                                  ? "Paid"
                                  : "Unpaid"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">—</p>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-1">
                            <FiHome className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {getBuildingDisplay(customer)}
                            </span>
                            {customer.unitNumber && (
                              <span className="text-xs text-gray-400">
                                (Unit {customer.unitNumber})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowCustomerDetailModal(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="View Details"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEmailModal(customer, "custom")}
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                              title="Send Email"
                            >
                              <FiMail className="w-3.5 h-3.5" />
                            </button>
                            {customer.type === "application" &&
                              hasBillingCycle && (
                                <button
                                  onClick={() =>
                                    handleRecoverMissingBills(customer)
                                  }
                                  className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                                  title="Recover Missing Bills"
                                >
                                  <FiCalendar className="w-3.5 h-3.5" />
                                </button>
                              )}
                            {customer.type === "application" && (
                              <>
                                {!hasBillingCycle && (
                                  <button
                                    onClick={() => {
                                      setSelectedApplicationId(
                                        customer.applicationId || customer._id,
                                      );
                                      setSelectedCustomerName(
                                        `${customer.firstName} ${customer.lastName}`,
                                      );
                                      setSelectedCustomerEmail(customer.email);
                                      setIncludeInstallationFee(true);
                                      setShowStartModal(true);
                                    }}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Start Billing"
                                  >
                                    <FiPlay className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isActive && (
                                  <button
                                    onClick={() =>
                                      handlePauseBillingForApplication(customer)
                                    }
                                    className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                                    title="Pause Billing"
                                  >
                                    <FiPause className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isPaused && (
                                  <button
                                    onClick={() =>
                                      handleResumeBillingForApplication(
                                        customer,
                                      )
                                    }
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Resume Billing"
                                  >
                                    <FiPlay className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {(isActive || isPendingActivation) && (
                                  <button
                                    onClick={() =>
                                      handleDisconnectApplication(customer)
                                    }
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Disconnect"
                                  >
                                    <FiWifiOff className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.status === "suspended" && (
                                  <button
                                    onClick={() =>
                                      handleReconnectApplication(customer)
                                    }
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Reconnect"
                                  >
                                    <FiWifi className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {hasBillingCycle && (
                                  <button
                                    onClick={() =>
                                      handleStopBillingForApplication(customer)
                                    }
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Cancel Subscription"
                                  >
                                    <FiX className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {hasBillingCycle && (
                                  <button
                                    onClick={() => {
                                      setCustomerToDelete(customer);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Billing Cycle"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                            {customer.type === "user" && (
                              <>
                                {(!customer.billingCycle ||
                                  customer.billingCycle?.status ===
                                    "cancelled") && (
                                  <button
                                    onClick={() => {
                                      setSelectedUserId(customer._id);
                                      setSelectedCustomerName(
                                        `${customer.firstName} ${customer.lastName}`,
                                      );
                                      setSelectedCustomerEmail(customer.email);
                                      setIncludeInstallationFee(true);
                                      setShowStartModal(true);
                                    }}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Start Billing"
                                  >
                                    <FiPlay className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.billingCycle?.status === "active" && (
                                  <button
                                    onClick={() => {
                                      setSelectedUserId(customer._id);
                                      setShowPauseModal(true);
                                    }}
                                    className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                                    title="Pause Billing"
                                  >
                                    <FiPause className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.billingCycle?.status === "paused" && (
                                  <button
                                    onClick={() =>
                                      handleResumeBilling(
                                        customer._id,
                                        customer.firstName,
                                      )
                                    }
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Resume Billing"
                                  >
                                    <FiPlay className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.billingCycle?.status === "active" && (
                                  <button
                                    onClick={() =>
                                      handleStopBilling(
                                        customer._id,
                                        customer.firstName,
                                      )
                                    }
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Cancel Subscription"
                                  >
                                    <FiX className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.status === "active" && (
                                  <button
                                    onClick={() => handleDisconnect(customer)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Disconnect"
                                  >
                                    <FiWifiOff className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.status === "suspended" && (
                                  <button
                                    onClick={() => handleReconnect(customer)}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    title="Reconnect"
                                  >
                                    <FiWifi className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {customer.billingCycle && (
                                  <button
                                    onClick={() => {
                                      setCustomerToDelete(customer);
                                      setShowDeleteConfirmModal(true);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Billing Cycle"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
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

        {/* Left scroll button - fixed at page center left */}
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg p-3 transition-all duration-200 border border-gray-300 ${
            canScrollLeft
              ? "hover:bg-gray-100 cursor-pointer opacity-100"
              : "opacity-40 cursor-not-allowed"
          }`}
          title="Scroll left"
        >
          <FiChevronLeft className="w-6 h-6 text-gray-700" />
        </button>

        {/* Right scroll button - fixed at page center right */}
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg p-3 transition-all duration-200 border border-gray-300 ${
            canScrollRight
              ? "hover:bg-gray-100 cursor-pointer opacity-100"
              : "opacity-40 cursor-not-allowed"
          }`}
          title="Scroll right"
        >
          <FiChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-b-lg text-xs text-gray-500">
        Showing {sortedAndFilteredCustomers.length} of {customers.length}{" "}
        customers ({customers.filter((c) => c.type === "user").length} users,{" "}
        {customers.filter((c) => c.type === "application").length} applications)
        - Sorted by {sortField} (
        {sortDirection === "asc" ? "Ascending" : "Descending"})
        {buildingFilter !== "all" && (
          <span className="ml-2 text-blue-600">
            - Filtered by building:{" "}
            {buildingsList.find((b) => b._id === buildingFilter)?.buildingName}
          </span>
        )}
      </div>

      {/* Add global styles for always-visible scrollbar */}
      <style jsx global>{`
        .scrollbar-always-visible {
          scrollbar-width: thin;
        }
        .scrollbar-always-visible::-webkit-scrollbar {
          height: 10px;
          display: block;
        }
        .scrollbar-always-visible::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .scrollbar-always-visible::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .scrollbar-always-visible::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>

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
                    className={getBalanceColor(selectedCustomer.currentBalance)}
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
