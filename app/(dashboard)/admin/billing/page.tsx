// frontend/app/admin/billing/page.tsx - COMPLETE FIXED VERSION
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
  FiDollarSign,
  FiFileText,
  FiTrash2,
  FiCalendar as FiCalendarIcon,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";

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

// Helper to format date as MM/DD/YYYY (no timezone shift)
function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  // Parse as UTC to avoid timezone shifting the date
  const date = new Date(dateStr);
  // Use UTC methods to prevent timezone conversion
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

// Helper to get last day of month for billing period end (using UTC)
function getLastDayOfMonthUTC(year: number, month: number): Date {
  // month is 0-indexed, next month's 0th day is last day of current month
  return new Date(Date.UTC(year, month + 1, 0));
}

// Helper to format billing period correctly using UTC dates
function formatBillingPeriod(startDateStr: string, endDateStr: string): string {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  // Use UTC to prevent timezone shifts
  const startMonth = start.getUTCMonth() + 1;
  const startDay = start.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();
  return `${startMonth}/${startDay}/${startYear} - ${endMonth}/${endDay}/${endYear}`;
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
  const [showUnpaidBillsReportModal, setShowUnpaidBillsReportModal] =
    useState(false);
  const [unpaidBillsReport, setUnpaidBillsReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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
  const loadedRef = useRef(false);

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

  const loadUnpaidBillsReport = async () => {
    setLoadingReport(true);
    try {
      const result = await getUnpaidBillsReport({ includePaid: false });
      if (result.success) {
        setUnpaidBillsReport(result.data);
        setShowUnpaidBillsReportModal(true);
      } else {
        toast.error("Failed to load report");
      }
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Failed to load unpaid bills report");
    } finally {
      setLoadingReport(false);
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
        unpaidReportResult,
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
        getUnpaidBillsReport({ includePaid: false }).catch(() => ({
          data: { summary: {} },
        })),
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
      const reportSummary = unpaidReportResult?.data?.summary || {};

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

      const totalInstallationFeesDue =
        reportSummary.totalInstallationFeesDue || 0;
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
    if (statusFilter === "pending_activation") {
      const hasUnpaid = customer.unpaidBills && customer.unpaidBills.length > 0;
      return (
        matchesSearch &&
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaid
      );
    }
    if (statusFilter === "applications")
      return matchesSearch && customer.type === "application";
    if (statusFilter === "installation_fee_due")
      return (
        matchesSearch &&
        customer.type === "application" &&
        (customer.installationFee ?? 0) > 0 &&
        !customer.installationFeePaid
      );
    return matchesSearch;
  });

  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    pendingPayments.length +
    pendingInstallationBills.length +
    customersWithoutAccounts.length +
    stats.applicationsWithoutBilling;

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h1>
            <p className="text-gray-600">
              Manage customer balances, bills, payments, subscriptions, and
              installation fees
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={loadUnpaidBillsReport}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2 cursor-pointer"
            >
              <FiPrinter className="w-4 h-4" /> Unpaid Bills Report
            </button>
            <button
              onClick={() => setShowBackdatedModal(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 cursor-pointer"
            >
              <FiCalendarIcon className="w-4 h-4" /> Backdated Billing
            </button>
            <button
              onClick={() => setShowManualCustomerModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
            >
              <FiUserPlus className="w-4 h-4" /> Add Customer
            </button>
            {(customersWithoutAccounts.length > 0 ||
              stats.applicationsWithoutBilling > 0) && (
              <button
                onClick={() => setShowExistingCustomersModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 cursor-pointer"
              >
                <FiUser className="w-4 h-4" /> Existing (
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
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2 cursor-pointer"
              >
                <FiBell className="w-4 h-4" /> Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 cursor-pointer"
            >
              <FiSettings className="w-4 h-4" /> Settings
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4 mb-6">
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
            <FiDollarSign className="w-8 h-8 text-red-100" />
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
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.pendingPaymentsCount}
              </p>
            </div>
            <FiClock className="w-8 h-8 text-purple-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Applications</p>
              <p className="text-2xl font-bold text-indigo-600">
                {customers.filter((c) => c.type === "application").length}
              </p>
            </div>
            <FiFileText className="w-8 h-8 text-indigo-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pro-rated Due</p>
              <p className="text-2xl font-bold text-teal-600">
                {billingFlowSettings.proRatedDueDay}
              </p>
              <p className="text-xs text-gray-400">Day of month</p>
            </div>
            <FiCalendar className="w-8 h-8 text-teal-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Installation Fee</p>
              <p className="text-2xl font-bold text-amber-600">
                ₱{billingFlowSettings.installationFee.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">One-time charge</p>
            </div>
            <FiDollarSign className="w-8 h-8 text-amber-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Installation Fees Due</p>
              <p className="text-2xl font-bold text-amber-600">
                ₱{stats.totalInstallationFeesDue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Unpaid</p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-amber-100" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Install Bills</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pendingInstallationBillsCount}
              </p>
            </div>
            <FiFileText className="w-8 h-8 text-amber-100" />
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
              <div>
                • Installation Fee: ₱
                {billingFlowSettings.installationFee.toLocaleString()}{" "}
                (one-time, due in {billingFlowSettings.installationFeeDueDays}{" "}
                days)
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
              placeholder="Search by name, email, or application ID..."
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
            <option value="pending_activation">Awaiting Payment</option>
            <option value="applications">Applications Only</option>
            <option value="installation_fee_due">Installation Fee Due</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <div>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer / Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Installation Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </div>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
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
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {customer.type === "application" ? (
                            <FiFileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          ) : (
                            <FiUser className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {customer.email}
                            </p>
                            {customer.applicationId && (
                              <p className="text-xs text-gray-400 font-mono">
                                App ID: {customer.applicationId}
                              </p>
                            )}
                            {customer.username && (
                              <p className="text-xs text-gray-400">
                                @{customer.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">
                          {customer.planName}
                        </p>
                        <p className="text-xs text-gray-500">
                          ₱{customer.planPrice.toLocaleString()}/mo
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p
                          className={`text-lg font-bold ${getBalanceColor(customer.currentBalance)}`}
                        >
                          ₱{customer.currentBalance.toLocaleString()}
                        </p>
                        {customer.unpaidBills.length > 0 && (
                          <p className="text-xs text-red-500">
                            {customer.unpaidBills.length} unpaid bill(s)
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(customer)}`}
                        >
                          {getStatusText(customer)}
                        </span>
                        {customer.billingCycle?.status ===
                          "pending_activation" &&
                          hasUnpaidBills && (
                            <p className="text-xs text-purple-600 mt-1">
                              Awaiting first payment
                            </p>
                          )}
                        {customer.billingCycle?.status === "active" &&
                          customer.type === "application" && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ Service ACTIVE
                            </p>
                          )}
                        {hasUnpaidInstallationFee && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Installation fee unpaid
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.type === "application" &&
                        (customer.installationFee ?? 0) > 0 ? (
                          <div>
                            <p className="text-sm font-medium">
                              ₱
                              {(customer.installationFee ?? 0).toLocaleString()}
                            </p>
                            <p
                              className={`text-xs ${customer.installationFeePaid ? "text-green-600" : "text-red-600"}`}
                            >
                              {customer.installationFeePaid ? "Paid" : "Unpaid"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(customer);
                              setShowCustomerDetailModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEmailModal(customer, "custom");
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                            title="Send Email"
                          >
                            <FiMail className="w-4 h-4" />
                          </button>
                          {customer.type === "application" &&
                            hasBillingCycle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecoverMissingBills(customer);
                                }}
                                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title="Recover Missing Bills"
                              >
                                <FiCalendar className="w-4 h-4" />
                              </button>
                            )}
                          {customer.type === "application" && (
                            <>
                              {!hasBillingCycle && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Start Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              )}
                              {isActive && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePauseBillingForApplication(customer);
                                  }}
                                  className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors cursor-pointer"
                                  title="Pause Billing"
                                >
                                  <FiPause className="w-4 h-4" />
                                </button>
                              )}
                              {isPaused && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResumeBillingForApplication(customer);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Resume Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              )}
                              {(isActive || isPendingActivation) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisconnectApplication(customer);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Disconnect from Network"
                                >
                                  <FiWifiOff className="w-4 h-4" />
                                </button>
                              )}
                              {customer.status === "suspended" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReconnectApplication(customer);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Reconnect to Network"
                                >
                                  <FiWifi className="w-4 h-4" />
                                </button>
                              )}
                              {hasBillingCycle && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopBillingForApplication(customer);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Cancel Subscription"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                              )}
                              {hasBillingCycle && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomerToDelete(customer);
                                    setShowDeleteConfirmModal(true);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Delete Billing Cycle"
                                >
                                  <FiTrash2 className="w-4 h-4" />
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserId(customer._id);
                                    setSelectedCustomerName(
                                      `${customer.firstName} ${customer.lastName}`,
                                    );
                                    setSelectedCustomerEmail(customer.email);
                                    setIncludeInstallationFee(true);
                                    setShowStartModal(true);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Start Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              )}
                              {customer.billingCycle &&
                                customer.billingCycle?.status !==
                                  "cancelled" && (
                                  <button
                                    disabled
                                    className="p-1 text-gray-300 cursor-not-allowed opacity-50"
                                    title="Billing already started"
                                  >
                                    <FiPlay className="w-4 h-4" />
                                  </button>
                                )}
                              {customer.billingCycle?.status === "active" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserId(customer._id);
                                    setShowPauseModal(true);
                                  }}
                                  className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors cursor-pointer"
                                  title="Pause Billing"
                                >
                                  <FiPause className="w-4 h-4" />
                                </button>
                              )}
                              {customer.billingCycle?.status === "paused" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResumeBilling(
                                      customer._id,
                                      customer.firstName,
                                    );
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Resume Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              )}
                              {customer.billingCycle?.status === "active" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopBilling(
                                      customer._id,
                                      customer.firstName,
                                    );
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Cancel Subscription"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                              )}
                              {customer.status === "active" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisconnect(customer);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Disconnect from Network"
                                >
                                  <FiWifiOff className="w-4 h-4" />
                                </button>
                              )}
                              {customer.status === "suspended" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReconnect(customer);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  title="Reconnect to Network"
                                >
                                  <FiWifi className="w-4 h-4" />
                                </button>
                              )}
                              {customer.billingCycle && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomerToDelete(customer);
                                    setShowDeleteConfirmModal(true);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Delete Billing Cycle"
                                >
                                  <FiTrash2 className="w-4 h-4" />
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
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Showing {filteredCustomers.length} of {customers.length} customers (
          {customers.filter((c) => c.type === "user").length} users,{" "}
          {customers.filter((c) => c.type === "application").length}{" "}
          applications)
        </div>
      </div>
      {/* Unpaid Bills Report Modal */}
      {showUnpaidBillsReportModal && unpaidBillsReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Unpaid Bills Report
              </h2>
              <button
                onClick={() => setShowUnpaidBillsReportModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Unpaid Bills</p>
                <p className="text-2xl font-bold text-red-600">
                  {unpaidBillsReport.summary?.totalUnpaidBills || 0}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Amount Due</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₱
                  {(
                    unpaidBillsReport.summary?.totalAmountDue || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Installation Fees Due</p>
                <p className="text-2xl font-bold text-amber-600">
                  ₱
                  {(
                    unpaidBillsReport.summary?.totalInstallationFeesDue || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Overdue Bills</p>
                <p className="text-2xl font-bold text-purple-600">
                  {unpaidBillsReport.summary?.byStatus?.overdue || 0}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Installation Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidBillsReport.bills?.map((bill: any) => {
                    // Format period correctly using start and end dates from the bill
                    let periodDisplay = "-";
                    if (bill.billingPeriod?.start && bill.billingPeriod?.end) {
                      const start = new Date(bill.billingPeriod.start);
                      const end = new Date(bill.billingPeriod.end);
                      periodDisplay = `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
                    }
                    return (
                      <tr key={bill._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">
                          {bill.invoiceNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">
                            {bill.applicationData?.firstName}{" "}
                            {bill.applicationData?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bill.applicationData?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">{periodDisplay}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatDateFixed(bill.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">
                          ₱{bill.total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {bill.installationFee > 0 ? (
                            <span
                              className={`text-sm ${bill.installationFeePaid ? "text-green-600" : "text-amber-600"}`}
                            >
                              ₱{bill.installationFee.toLocaleString()}
                              {!bill.installationFeePaid && " (Unpaid)"}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${bill.status === "overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {bill.isInstallationBill &&
                            !bill.installationFeePaid && (
                              <button
                                onClick={() => {
                                  const customer = customers.find(
                                    (c) =>
                                      c.applicationId === bill.applicationId,
                                  );
                                  if (customer) {
                                    handleMarkInstallationBillAsPaid(
                                      bill,
                                      customer,
                                    );
                                  }
                                }}
                                className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 cursor-pointer"
                              >
                                Mark Install Paid
                              </button>
                            )}
                          {!bill.isInstallationBill &&
                            bill.status !== "paid" && (
                              <button
                                onClick={() => {
                                  const customer = customers.find(
                                    (c) =>
                                      c.applicationId === bill.applicationId,
                                  );
                                  if (customer) {
                                    handleMarkBillAsPaid(bill, customer);
                                  }
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowUnpaidBillsReportModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdated Billing Modal */}
      {showBackdatedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Backdated Billing for Existing Customer
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
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-semibold mb-2">
                  📌 When to use Backdated Billing:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  <li>Customer has been using your internet for past months</li>
                  <li>
                    Need to generate all missing bills from their start date
                  </li>
                  <li>Customer never had billing in the system before</li>
                  <li>Will create billing cycle + all past monthly bills</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Customer/Application *
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                        {c.firstName} {c.lastName} - {c.email} (No billing yet)
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only shows applications without existing billing
                </p>
              </div>
              {selectedBackdatedCustomer && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    Selected Customer:
                  </p>
                  <p className="text-sm">
                    {selectedBackdatedCustomer.firstName}{" "}
                    {selectedBackdatedCustomer.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedBackdatedCustomer.email}
                  </p>
                  <p className="text-xs text-gray-600">
                    Plan: {selectedBackdatedCustomer.planName} - ₱
                    {selectedBackdatedCustomer.planPrice}/mo
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Start Date (When they started using) *
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: If customer started on March 5, 2024, enter
                  2024-03-05
                </p>
              </div>
              {!selectedBackdatedCustomer?.planName && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name (for custom plan)
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
                      placeholder="e.g., Basic Plan 10Mbps"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                      placeholder="e.g., 999"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backdatedForm.includeInstallationFee}
                    onChange={(e) =>
                      setBackdatedForm({
                        ...backdatedForm,
                        includeInstallationFee: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-800">
                    Include Installation Fee (₱
                    {billingFlowSettings.installationFee.toLocaleString()})
                  </span>
                </label>
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  Add one-time installation fee to the first bill
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2">
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
                  <span>
                    Skip first bill (customer already paid first month)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Check this if the customer already paid their first month's
                  bill
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={backdatedForm.notes}
                  onChange={(e) =>
                    setBackdatedForm({
                      ...backdatedForm,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Any notes about this backdated billing..."
                />
              </div>
              <div className="flex gap-3 pt-4">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackdatedBilling}
                  disabled={backdatedLoading}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {backdatedLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiCalendarIcon className="w-4 h-4" /> Generate Backdated
                      Bills
                    </>
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
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Delete Billing Cycle
              </h2>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setCustomerToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 font-semibold mb-2">
                  ⚠️ Warning: This action cannot be undone!
                </p>
                <p className="text-red-700 text-sm">
                  You are about to delete the billing cycle for:
                </p>
                <p className="font-medium text-gray-900 mt-2">
                  {customerToDelete.firstName} {customerToDelete.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {customerToDelete.email}
                </p>
                {customerToDelete.billingCycle && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-gray-600">
                      Billing Cycle ID: {customerToDelete.billingCycle._id}
                    </p>
                    <p className="text-xs text-gray-600">
                      Status: {customerToDelete.billingCycle.status}
                    </p>
                    <p className="text-xs text-gray-600">
                      Current Balance: ₱
                      {customerToDelete.currentBalance.toLocaleString()}
                    </p>
                  </div>
                )}
                <p className="text-red-600 text-sm mt-3">
                  This will delete the billing cycle AND all associated bills
                  and records.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteBillingCycle(customerToDelete);
                    setShowDeleteConfirmModal(false);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 cursor-pointer"
                >
                  Delete Permanently
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Start Billing</h2>
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
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Customer:</strong> {selectedCustomerName}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> {selectedCustomerEmail}
                </p>
                {selectedApplicationId && (
                  <p className="text-sm text-blue-800 font-mono">
                    <strong>Application ID:</strong> {selectedApplicationId}
                  </p>
                )}
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
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date
                </p>
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
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInstallationFee}
                    onChange={(e) =>
                      setIncludeInstallationFee(e.target.checked)
                    }
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-800">
                    Include Installation Fee (₱
                    {billingFlowSettings.installationFee.toLocaleString()})
                  </span>
                </label>
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  One-time fee added to the first bill, due in{" "}
                  {billingFlowSettings.installationFeeDueDays} days
                </p>
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
                  placeholder="Optional notes about this billing..."
                />
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-800 font-semibold mb-1">
                  ✅ When you start billing:
                </p>
                <ul className="text-xs text-green-700 mt-1 list-disc list-inside">
                  <li>
                    Billing cycle status will be set to <strong>ACTIVE</strong>
                  </li>
                  <li>
                    Customer can use internet <strong>IMMEDIATELY</strong>
                  </li>
                  <li>No registration needed</li>
                  <li>Bill will be sent via email</li>
                  {includeInstallationFee && (
                    <li>
                      Installation fee of ₱
                      {billingFlowSettings.installationFee.toLocaleString()}{" "}
                      will be added as separate bill
                    </li>
                  )}
                </ul>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>ℹ️ How billing works:</strong>
                </p>
                <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                  <li>
                    If installation is on or before day{" "}
                    {billingFlowSettings.billingCutoffDay}: Pro-rated bill only
                  </li>
                  <li>
                    If installation is after day{" "}
                    {billingFlowSettings.billingCutoffDay}: Combined bill
                    (pro-rated + next month)
                  </li>
                  <li>
                    Pro-rated bills are due on day{" "}
                    {billingFlowSettings.proRatedDueDay}
                  </li>
                  <li>
                    Monthly bills are due on day{" "}
                    {billingFlowSettings.monthlyDueDay}
                  </li>
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    selectedApplicationId
                      ? handleStartBillingForApplication
                      : handleStartBillingForUser
                  }
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 cursor-pointer"
                >
                  Start Billing (ACTIVE)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pause Billing</h2>
              <button
                onClick={() => setShowPauseModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
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
                  placeholder="Enter reason for pausing"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseBilling}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 cursor-pointer"
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Billing Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  <FiSettings className="inline mr-2" /> Basic Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-gray-500 mt-1">
                      Days after due date before suspension
                    </p>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      One-time fee charged separately
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installation Fee Due Days
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Days after installation to pay fee
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  <FiCalendar className="inline mr-2" /> Billing Flow Settings
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
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
                    <p className="text-xs text-gray-500">
                      Day of month for pro-rated bills
                    </p>
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
                    <p className="text-xs text-gray-500">
                      Day of month for monthly bills
                    </p>
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
                    <p className="text-xs text-gray-500">
                      After this day = combined bill
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span>Enable Automatic Billing Generation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span>Send Invoice Email on Installation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span>Auto-send Payment Reminders</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
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
                    <span>Auto-suspend Overdue Accounts</span>
                  </label>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✅ Current Behavior:
                </p>
                <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                  <li>
                    When you start billing, status is set to{" "}
                    <strong>ACTIVE</strong>
                  </li>
                  <li>
                    Customer can use internet <strong>IMMEDIATELY</strong>
                  </li>
                  <li>No user account registration needed</li>
                  <li>Email with bill is sent to customer</li>
                  <li>
                    Installation fee of ₱
                    {billingFlowSettings.installationFee.toLocaleString()} added
                    as separate bill
                  </li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  ℹ️ How Billing Works:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>
                    Installation on days 1-
                    {billingFlowSettings.billingCutoffDay}:{" "}
                    <strong>Pro-rated bill only</strong> due on day{" "}
                    {billingFlowSettings.proRatedDueDay}
                  </li>
                  <li>
                    Installation on days{" "}
                    {billingFlowSettings.billingCutoffDay + 1}-31:{" "}
                    <strong>Combined bill</strong> (pro-rated + next month) due
                    on day {billingFlowSettings.monthlyDueDay}
                  </li>
                  <li>
                    After {billingFlowSettings.gracePeriodDays} days grace
                    period, service may be suspended
                  </li>
                  <li>
                    Installation fee is a <strong>SEPARATE bill</strong> due in{" "}
                    {billingFlowSettings.installationFeeDueDays} days
                  </li>
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBillingFlowSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
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
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Customer Details
              </h2>
              <button
                onClick={() => {
                  setShowCustomerDetailModal(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Customer Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{selectedCustomer.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Type</p>
                  <p className="font-medium capitalize">
                    {selectedCustomer.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium">
                    {selectedCustomer.planName} (₱
                    {selectedCustomer.planPrice.toLocaleString()}/mo)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p
                    className={`font-bold text-lg ${getBalanceColor(selectedCustomer.currentBalance)}`}
                  >
                    ₱{selectedCustomer.currentBalance.toLocaleString()}
                  </p>
                </div>
                {selectedCustomer.applicationId && (
                  <div>
                    <p className="text-sm text-gray-500">Application ID</p>
                    <p className="font-mono text-sm">
                      {selectedCustomer.applicationId}
                    </p>
                  </div>
                )}
                {selectedCustomer.username && (
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">@{selectedCustomer.username}</p>
                  </div>
                )}
                {selectedCustomer.type === "application" && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Installation Fee</p>
                      <p className="font-medium">
                        ₱
                        {(
                          selectedCustomer.installationFee || 0
                        ).toLocaleString()}
                        <span
                          className={`ml-2 text-xs ${selectedCustomer.installationFeePaid ? "text-green-600" : "text-red-600"}`}
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
                      <p className="text-sm text-gray-500">
                        Billing Cycle Status
                      </p>
                      <p className="font-medium capitalize">
                        {selectedCustomer.billingCycle?.status || "Not started"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Unpaid Bills */}
            {selectedCustomer.unpaidBills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiAlertCircle className="text-red-500" /> Unpaid Bills (
                  {selectedCustomer.unpaidBills.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Invoice #</th>
                        <th className="px-4 py-2 text-left">Period</th>
                        <th className="px-4 py-2 text-left">Due Date</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCustomer.unpaidBills.map((bill: any) => {
                        // Format period correctly using UTC
                        let periodDisplay = "-";
                        if (
                          bill.billingPeriod?.start &&
                          bill.billingPeriod?.end
                        ) {
                          const start = new Date(bill.billingPeriod.start);
                          const end = new Date(bill.billingPeriod.end);
                          periodDisplay = `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
                        }
                        return (
                          <tr key={bill._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono">
                              {bill.invoiceNumber}
                            </td>
                            <td className="px-4 py-2">{periodDisplay}</td>
                            <td className="px-4 py-2">
                              {formatDateFixed(bill.dueDate)}
                            </td>
                            <td className="px-4 py-2 font-medium text-red-600">
                              ₱{bill.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${bill.status === "overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                              >
                                {bill.status}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {bill.isInstallationBill ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                                  Installation Fee
                                </span>
                              ) : bill.isProRated ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                  Pro-rated
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  Monthly
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {bill.isInstallationBill &&
                                !bill.installationFeePaid && (
                                  <button
                                    onClick={() =>
                                      handleMarkInstallationBillAsPaid(
                                        bill,
                                        selectedCustomer,
                                      )
                                    }
                                    className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 cursor-pointer"
                                  >
                                    Mark Install Paid
                                  </button>
                                )}
                              {!bill.isInstallationBill &&
                                bill.status !== "paid" && (
                                  <button
                                    onClick={() =>
                                      handleMarkBillAsPaid(
                                        bill,
                                        selectedCustomer,
                                      )
                                    }
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Billing Cycle Info */}
            {selectedCustomer.billingCycle && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Billing Cycle Details
                </h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Cycle ID</p>
                      <p className="font-mono text-xs">
                        {selectedCustomer.billingCycle._id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">
                        {selectedCustomer.billingCycle.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Billing Start Date</p>
                      <p>
                        {formatDateFixed(
                          selectedCustomer.billingCycle.billingStartDate,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Next Billing Date</p>
                      <p>
                        {formatDateFixed(
                          selectedCustomer.billingCycle.nextBillingDate,
                        )}
                      </p>
                    </div>
                    {selectedCustomer.billingCycle.installationFee > 0 && (
                      <div>
                        <p className="text-gray-500">Installation Fee</p>
                        <p>
                          ₱
                          {selectedCustomer.billingCycle.installationFee.toLocaleString()}
                          <span
                            className={`ml-2 text-xs ${selectedCustomer.billingCycle.installationFeePaid ? "text-green-600" : "text-red-600"}`}
                          >
                            (
                            {selectedCustomer.billingCycle.installationFeePaid
                              ? "Paid"
                              : "Unpaid"}
                            )
                          </span>
                        </p>
                      </div>
                    )}
                    {selectedCustomer.billingCycle.pausedAt && (
                      <div>
                        <p className="text-gray-500">Paused At</p>
                        <p>
                          {formatDateFixed(
                            selectedCustomer.billingCycle.pausedAt,
                          )}
                        </p>
                      </div>
                    )}
                    {selectedCustomer.billingCycle.pauseReason && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Pause Reason</p>
                        <p>{selectedCustomer.billingCycle.pauseReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCustomerDetailModal(false);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pending Items</h2>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setPendingModalType("pro-rated")}
                className={`px-4 py-2 font-medium text-sm ${pendingModalType === "pro-rated" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
              >
                Pro-rated Bills ({pendingProRated.length})
              </button>
              <button
                onClick={() => setPendingModalType("installation")}
                className={`px-4 py-2 font-medium text-sm ${pendingModalType === "installation" ? "border-b-2 border-amber-500 text-amber-600" : "text-gray-500"}`}
              >
                Installation Bills ({pendingInstallationBills.length})
              </button>
              <button
                onClick={() => setPendingModalType("activation")}
                className={`px-4 py-2 font-medium text-sm ${pendingModalType === "activation" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500"}`}
              >
                Pending Activations ({pendingActivations.length})
              </button>
              <button
                onClick={() => setPendingModalType("payments")}
                className={`px-4 py-2 font-medium text-sm ${pendingModalType === "payments" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                Pending Payments ({pendingPayments.length})
              </button>
            </div>

            {/* Pro-rated Bills Content */}
            {pendingModalType === "pro-rated" && (
              <div>
                {pendingProRated.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No pending pro-rated bills
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingProRated.map((bill: any) => {
                          let periodDisplay = "-";
                          if (
                            bill.billingPeriod?.start &&
                            bill.billingPeriod?.end
                          ) {
                            const start = new Date(bill.billingPeriod.start);
                            const end = new Date(bill.billingPeriod.end);
                            periodDisplay = `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
                          }
                          return (
                            <tr key={bill._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-sm">
                                {bill.invoiceNumber}
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium">
                                  {bill.applicationData?.firstName}{" "}
                                  {bill.applicationData?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {bill.applicationData?.email}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-red-600">
                                ₱{bill.total.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                  {bill.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() =>
                                    confirmProRatedPayment({
                                      applicationId: bill.applicationId,
                                    })
                                  }
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                                >
                                  Confirm Payment
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Installation Bills Content */}
            {pendingModalType === "installation" && (
              <div>
                {pendingInstallationBills.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No pending installation bills
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Invoice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Due Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInstallationBills.map((bill: any) => (
                          <tr key={bill._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm">
                              {bill.invoiceNumber}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">
                                {bill.applicationData?.firstName}{" "}
                                {bill.applicationData?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {bill.applicationData?.email}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-amber-600">
                              ₱{bill.total.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDateFixed(bill.dueDate)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${bill.status === "overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                              >
                                {bill.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() =>
                                  markInstallationBillAsPaid(bill._id, {
                                    notes: "Admin confirmed",
                                  })
                                }
                                className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pending Activations Content */}
            {pendingModalType === "activation" && (
              <div>
                {pendingActivations.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No pending activations
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Plan
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Monthly Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingActivations.map((cycle: any) => (
                          <tr key={cycle._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">
                                {cycle.applicationData?.firstName}{" "}
                                {cycle.applicationData?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {cycle.applicationData?.email}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {cycle.planId?.name || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              ₱{cycle.monthlyRate?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() =>
                                  startMonthlyBilling({
                                    applicationId: cycle.applicationId,
                                  })
                                }
                                className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 cursor-pointer"
                              >
                                Activate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pending Payments Content */}
            {pendingModalType === "payments" && (
              <div>
                {pendingPayments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No pending payments
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Reference
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Submitted
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayments.map((payment: any) => (
                          <tr key={payment._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm">
                              {payment.referenceNumber}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">
                                {payment.application?.firstName}{" "}
                                {payment.application?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.application?.email}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                              ₱{payment.amount?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${payment.paymentType === "installation" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}
                              >
                                {payment.paymentType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDateFixed(payment.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleConfirmPayment(payment._id)
                                  }
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() =>
                                    handleRejectPayment(payment._id)
                                  }
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPendingModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
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
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Send Email to {emailCustomer.firstName} {emailCustomer.lastName}
              </h2>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template
                </label>
                <select
                  value={emailType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEmailType(newType);
                    switch (newType) {
                      case "invoice":
                        setEmailSubject(`Invoice Reminder - MisterFyber`);
                        setEmailMessage(
                          `Dear ${emailCustomer.firstName},\n\nThis is a friendly reminder that you have an outstanding balance of ₱${emailCustomer.currentBalance.toLocaleString()}.\n\nPlease log in to your account to view and pay your invoice.\n\nThank you for your prompt payment.\n\nBest regards,\nMisterFyber Team`,
                        );
                        break;
                      case "payment_confirmation":
                        setEmailSubject(`Payment Confirmation - MisterFyber`);
                        setEmailMessage(
                          `Dear ${emailCustomer.firstName},\n\nThank you for your payment! Your account has been credited.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMisterFyber Team`,
                        );
                        break;
                      case "disconnection":
                        setEmailSubject(
                          `Important: Service Disconnection Notice - MisterFyber`,
                        );
                        setEmailMessage(
                          `Dear ${emailCustomer.firstName},\n\nThis is to notify you that your internet service has been disconnected due to non-payment.\n\nTo restore your service, please settle your outstanding balance of ₱${emailCustomer.currentBalance.toLocaleString()}.\n\nBest regards,\nMisterFyber Team`,
                        );
                        break;
                      case "welcome":
                        setEmailSubject(`Welcome to MisterFyber!`);
                        setEmailMessage(
                          `Dear ${emailCustomer.firstName},\n\nWelcome to MisterFyber! We're excited to have you as our customer.\n\nYour account has been successfully set up. You can now log in to your account to manage your subscription.\n\nBest regards,\nMisterFyber Team`,
                        );
                        break;
                      default:
                        setEmailSubject(`Message from MisterFyber`);
                        setEmailMessage(`Dear ${emailCustomer.firstName},\n\n`);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="custom">Custom</option>
                  <option value="invoice">Invoice Reminder</option>
                  <option value="payment_confirmation">
                    Payment Confirmation
                  </option>
                  <option value="disconnection">Disconnection Notice</option>
                  <option value="welcome">Welcome Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="Write your email message here..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailCustomer(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendManualEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiMail className="w-4 h-4" /> Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Customers Modal - Simplified version */}
      {showExistingCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Existing Customers Without Billing
              </h2>
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersWithoutAccounts.map((customer: any) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {customer.firstName} {customer.lastName}
                      </td>
                      <td className="px-4 py-3">{customer.email}</td>
                      <td className="px-4 py-3">{customer.planName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Application
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedApplicationId(customer.applicationId);
                            setSelectedCustomerName(
                              `${customer.firstName} ${customer.lastName}`,
                            );
                            setSelectedCustomerEmail(customer.email);
                            setIncludeInstallationFee(true);
                            setShowStartModal(true);
                            setShowExistingCustomersModal(false);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer"
                        >
                          Start Billing
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.applicationsWithoutBilling > 0 && (
                    <tr className="bg-yellow-50">
                      <td colSpan={5} className="px-4 py-3 text-center">
                        <p className="text-sm text-yellow-800">
                          Plus {stats.applicationsWithoutBilling} more approved
                          applications without billing. Go to Applications page
                          to start billing for them.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Add New Customer
              </h2>
              <button
                onClick={() => setShowManualCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
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
                  <option value="">Select a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} - ₱{plan.price.toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building
                </label>
                <select
                  value={manualCustomerForm.buildingId}
                  onChange={(e) => {
                    const building = buildings.find(
                      (b) => b._id === e.target.value,
                    );
                    setManualCustomerForm({
                      ...manualCustomerForm,
                      buildingId: e.target.value,
                      buildingName: building?.buildingName || "",
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a building...</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.buildingName} - {building.streetAddress}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
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
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualCustomerForm.includeInstallationFee}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        includeInstallationFee: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-800">
                    Include Installation Fee (₱
                    {billingFlowSettings.installationFee.toLocaleString()})
                  </span>
                </label>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualCustomerForm.startBillingImmediately}
                    onChange={(e) =>
                      setManualCustomerForm({
                        ...manualCustomerForm,
                        startBillingImmediately: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-green-800">
                    Start Billing Immediately (ACTIVE)
                  </span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowManualCustomerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualCustomerSubmit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 cursor-pointer"
                >
                  Create Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
