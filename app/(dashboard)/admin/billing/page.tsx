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
  getPendingProRatedBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  getBillingSummaryAdmin,
  startBillingForApplication,
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
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}/${date.getFullYear()}`;
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
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState("");
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
    "pro-rated" | "activation" | "payments"
  >("pro-rated");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<CustomerItem | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailType, setEmailType] = useState("custom");
  const [sendingEmail, setSendingEmail] = useState(false);
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
    applicationsWithoutBilling: 0,
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
        customerId: customer._id,
        customerType: customer.type,
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
      ] = await Promise.all([
        getAllBillingCycles({ limit: 100, forceRefresh }),
        getAllBills({ limit: 100, forceRefresh }),
        getAllUsers({ limit: 100, forceRefresh }).catch(() => ({ data: [] })),
        getAllApplications({ limit: 100, forceRefresh }).catch(() => ({
          data: [],
        })),
        getPendingPayments(forceRefresh).catch(() => ({ data: [] })),
        getCustomersWithoutAccounts().catch(() => ({ data: [] })),
      ]);

      if (!isMountedRef.current) return;

      const cyclesData = cyclesResult?.data || [];
      const billsList = billsResult?.data || [];
      const usersList = usersResult?.data || [];
      const applicationsList = applicationsResult?.data || [];
      const pendingPaymentsList = pendingPaymentsResult?.data || [];
      const customersWithoutAccountsData =
        customersWithoutAccountsResult?.data || [];

      console.log(
        `📊 Users: ${usersList.length}, Applications: ${applicationsList.length}`,
      );
      console.log(
        `📊 Cycles: ${cyclesData.length}, Bills: ${billsList.length}`,
      );

      setBillingCycles(cyclesData);
      setBills(billsList);
      setPendingPayments(pendingPaymentsList);
      setCustomersWithoutAccounts(customersWithoutAccountsData);

      // Build customers from USERS
      const userCustomers: CustomerItem[] = usersList.map((user: any) => {
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
        };
      });

      // Build customers from APPLICATIONS
      const applicationCustomers: CustomerItem[] = applicationsList
        .filter(
          (app: any) =>
            app.status === "approved" || app.billingStarted === true,
        )
        .map((app: any) => {
          const appBills = billsList.filter(
            (bill: any) =>
              bill.applicationId?._id === app._id && bill.status !== "paid",
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
            (cycle: any) =>
              cycle.applicationId === app.applicationId ||
              cycle.applicationId === app._id ||
              cycle.applicationId?._id === app._id,
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
          };
        });

      const allCustomers = [...userCustomers, ...applicationCustomers];
      allCustomers.sort((a, b) => b.currentBalance - a.currentBalance);

      setCustomers(allCustomers);

      // Calculate stats
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
        applicationsWithoutBilling: applicationsWithoutBilling,
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
      });
      toast.dismiss("start-billing-app");

      if (result.success) {
        toast.success(
          `✅ Billing started for ${selectedCustomerName}! Invoice sent to ${selectedCustomerEmail}`,
        );
        setShowStartModal(false);
        setSelectedApplicationId("");
        setSelectedCustomerName("");
        setSelectedCustomerEmail("");
        setStartDate("");
        setCustomAmount("");
        setBillingNotes("");
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
      });
      toast.success(`✅ Billing started! Invoice sent to customer`);
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
        toast.error(
          "Disconnect for applications is handled through user accounts",
        );
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
        toast.error(
          "Reconnect for applications is handled through user accounts",
        );
      }
    } catch (error: any) {
      console.error("Reconnect error:", error);
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    }
  };

  const getStatusBadge = (customer: CustomerItem) => {
    // FIXED: Check if there are actually unpaid bills before showing "Awaiting Payment"
    const hasUnpaidProRated =
      customer.unpaidBills && customer.unpaidBills.length > 0;

    if (customer.type === "application") {
      // Only show "Awaiting Payment" if there are actually unpaid bills
      if (
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaidProRated
      ) {
        return "bg-purple-100 text-purple-800";
      }
      // If status is pending_activation but no unpaid bills, treat as active
      if (
        customer.billingCycle?.status === "pending_activation" &&
        !hasUnpaidProRated
      ) {
        return "bg-green-100 text-green-800";
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
    // FIXED: Check if there are actually unpaid bills before showing "Awaiting Payment"
    const hasUnpaidProRated =
      customer.unpaidBills && customer.unpaidBills.length > 0;

    if (customer.type === "application") {
      // Only show "Awaiting Payment" if there are actually unpaid bills
      if (
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaidProRated
      ) {
        return "Awaiting Payment";
      }
      // If status is pending_activation but no unpaid bills, show as active
      if (
        customer.billingCycle?.status === "pending_activation" &&
        !hasUnpaidProRated
      ) {
        return "Active";
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
      // Only show if there are actually unpaid bills
      const hasUnpaid = customer.unpaidBills && customer.unpaidBills.length > 0;
      return (
        matchesSearch &&
        customer.billingCycle?.status === "pending_activation" &&
        hasUnpaid
      );
    }
    if (statusFilter === "applications")
      return matchesSearch && customer.type === "application";
    return matchesSearch;
  });

  const totalPendingCount =
    pendingProRated.length +
    pendingActivations.length +
    pendingPayments.length +
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
              Manage customer balances, bills, payments, and subscriptions
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowManualCustomerModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FiUserPlus className="w-4 h-4" /> Add Customer
            </button>
            {(customersWithoutAccounts.length > 0 ||
              stats.applicationsWithoutBilling > 0) && (
              <button
                onClick={() => setShowExistingCustomersModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
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
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-10 gap-4 mb-6">
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
              <p className="text-sm text-gray-500">Cutoff Day</p>
              <p className="text-2xl font-bold text-cyan-600">
                {billingFlowSettings.billingCutoffDay}
              </p>
              <p className="text-xs text-gray-400">After = next month</p>
            </div>
            <FiCalendar className="w-8 h-8 text-cyan-100" />
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
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer / Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
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
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const hasUnpaidBills =
                    customer.unpaidBills && customer.unpaidBills.length > 0;
                  return (
                    <tr
                      key={`${customer.type}-${customer._id}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {customer.type === "application" ? (
                            <FiFileText className="w-4 h-4 text-purple-500" />
                          ) : (
                            <FiUser className="w-4 h-4 text-blue-500" />
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
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {customer.planName}
                        </p>
                        <p className="text-xs text-gray-500">
                          ₱{customer.planPrice.toLocaleString()}/mo
                        </p>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(customer)}`}
                        >
                          {getStatusText(customer)}
                        </span>
                        {/* Only show "Awaiting first payment" if there are actual unpaid bills */}
                        {customer.billingCycle?.status ===
                          "pending_activation" &&
                          hasUnpaidBills && (
                            <p className="text-xs text-purple-600 mt-1">
                              Awaiting first payment
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
                          <button
                            onClick={() => openEmailModal(customer, "custom")}
                            className="p-1 text-purple-600 hover:text-purple-800"
                            title="Send Email"
                          >
                            <FiMail className="w-4 h-4" />
                          </button>

                          {/* APPLICATIONS */}
                          {customer.type === "application" && (
                            <>
                              {!customer.billingCycle ? (
                                <button
                                  onClick={() => {
                                    const appId =
                                      customer.applicationId || customer._id;
                                    setSelectedApplicationId(appId);
                                    setSelectedCustomerName(
                                      `${customer.firstName} ${customer.lastName}`,
                                    );
                                    setSelectedCustomerEmail(customer.email);
                                    setShowStartModal(true);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800"
                                  title="Start Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1 text-gray-300 cursor-not-allowed opacity-50"
                                  title="Billing already started"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete button for applications with billing cycles */}
                              {customer.billingCycle && (
                                <button
                                  onClick={() => {
                                    setCustomerToDelete(customer);
                                    setShowDeleteConfirmModal(true);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete Billing Cycle"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {/* USERS */}
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
                                    setShowStartModal(true);
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800"
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
                                  onClick={() => {
                                    setSelectedUserId(customer._id);
                                    setShowPauseModal(true);
                                  }}
                                  className="p-1 text-yellow-600 hover:text-yellow-800"
                                  title="Pause Billing"
                                >
                                  <FiPause className="w-4 h-4" />
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
                                  className="p-1 text-green-600 hover:text-green-800"
                                  title="Resume Billing"
                                >
                                  <FiPlay className="w-4 h-4" />
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
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Cancel Subscription"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                              )}

                              {customer.status === "active" && (
                                <button
                                  onClick={() => handleDisconnect(customer)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Disconnect from Network"
                                >
                                  <FiWifiOff className="w-4 h-4" />
                                </button>
                              )}

                              {customer.status === "suspended" && (
                                <button
                                  onClick={() => handleReconnect(customer)}
                                  className="p-1 text-green-600 hover:text-green-800"
                                  title="Reconnect to Network"
                                >
                                  <FiWifi className="w-4 h-4" />
                                </button>
                              )}

                              {customer.billingCycle && (
                                <button
                                  onClick={() => {
                                    setCustomerToDelete(customer);
                                    setShowDeleteConfirmModal(true);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800"
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
                className="text-gray-400 hover:text-gray-600"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteBillingCycle(customerToDelete);
                    setShowDeleteConfirmModal(false);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
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
                }}
                className="text-gray-400 hover:text-gray-600"
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
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    selectedApplicationId
                      ? handleStartBillingForApplication
                      : handleStartBillingForUser
                  }
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
                  placeholder="e.g., Customer request, Maintenance"
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

      {/* Customer Detail Modal */}
      {showCustomerDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h2>
                <p className="text-gray-500">{selectedCustomer.email}</p>
                {selectedCustomer.applicationId && (
                  <p className="text-xs text-gray-400 font-mono">
                    App ID: {selectedCustomer.applicationId}
                  </p>
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
                    className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedCustomer)}`}
                  >
                    {getStatusText(selectedCustomer)}
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
            <div className="flex justify-end">
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
                <h3 className="font-semibold text-gray-900 mb-3">
                  <FiSettings className="inline mr-2" /> Basic Settings
                </h3>
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
                    />
                    <span>Enable Automatic Billing Generation</span>
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
                    />
                    <span>Send Invoice Email on Installation</span>
                  </label>
                </div>
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
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBillingFlowSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
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
