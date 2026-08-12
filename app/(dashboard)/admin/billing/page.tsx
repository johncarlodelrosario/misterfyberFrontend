// app/(dashboard)/admin/billing/page.tsx - COMPLETE FIXED VERSION
// FIXED: Installation fee status now properly reflects actual payment status

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
  FiInfo,
  FiCheckCircle,
  FiZap,
} from "react-icons/fi";
import toast from "react-hot-toast";

// Import components
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";
import BillingTable from "@/components/admin/billingTable";

// Import services
import {
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  deleteBillingCycle,
  markBillAsPaid,
  markInstallationBillAsPaid,
  confirmProRatedPayment,
  startMonthlyBilling,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  startBillingForApplication,
  initializeBackdatedBilling,
  recoverMissingBills,
  clearBillingCache,
  manuallyGenerateEarlyBill,
  autoGenerateEarlyBills,
  checkForNewCustomers,
  startRealtimePolling,
  stopRealtimePolling,
  billingEvents,
} from "@/services/billing";
import { confirmPayment, rejectPayment } from "@/services/payment";
import api from "@/services/api";

// Import types
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
  nextMonthBill?: any;
}

interface Building {
  _id: string;
  buildingName: string;
  streetAddress: string;
  city: string;
  isActive: boolean;
}

type SortField = "name" | "plan" | "balance" | "status" | "installationFee";
type SortDirection = "asc" | "desc";

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return "-";
  }
}

function formatBillPeriod(bill: any): string {
  if (!bill.billingPeriod?.start || !bill.billingPeriod?.end) return "-";

  let start = new Date(bill.billingPeriod.start);
  let end = new Date(bill.billingPeriod.end);

  if (!bill.isProRated && !bill.isInstallationBill) {
    const startDay = start.getUTCDate();
    const startMonth = start.getUTCMonth();
    const endMonth = end.getUTCMonth();

    if (startDay === 31 && endMonth === 7) {
      start = new Date(Date.UTC(2026, 7, 1));
    }
  }

  const startStr = formatDate(start.toISOString());
  const endStr = formatDate(end.toISOString());
  return `${startStr} - ${endStr}`;
}

// FIXED: Helper to check if installation fee is truly due
function isInstallationFeeDue(customer: CustomerItem): boolean {
  if (customer.type !== "application") return false;
  const fee = customer.installationFee || 0;
  if (fee <= 0) return false;
  if (customer.installationFeePaid === true) return false;

  // Check if there's an unpaid installation bill
  const hasUnpaidInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true && bill.status !== "paid",
  );

  return hasUnpaidInstallationBill || true;
}

// ==================== QUERY CLIENT SETUP ====================
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "BILLING_APP_CACHE",
  throttleTime: 500,
});

if (typeof window !== "undefined") {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 5 * 60 * 1000,
    buster: "v3",
  });
}

// ==================== API FUNCTIONS ====================
const fetchDashboardData = async () => {
  try {
    const response = await api.get("/billing/dashboard-data");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

const fetchBuildings = async () => {
  try {
    const response = await api.get("/buildings/active");
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return [];
  }
};

const fetchPlans = async () => {
  try {
    const response = await api.get("/plans");
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
};

const sendEmail = async (data: any) => {
  const response = await api.post("/email/send-manual", data);
  return response.data;
};

// ==================== CUSTOM HOOKS ====================
const useDashboardData = () => {
  return useQuery({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    staleTime: 3 * 1000,
    refetchInterval: 2000,
  });
};

const useBuildings = () => {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: fetchBuildings,
    staleTime: 5 * 60 * 1000,
  });
};

const usePlans = () => {
  return useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });
};

// ==================== MAIN COMPONENT ====================
function AdminBillingPageContent() {
  const queryClient = useQueryClient();

  // ==================== STATE ====================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBackdatedModal, setShowBackdatedModal] = useState(false);
  const [showExistingCustomersModal, setShowExistingCustomersModal] =
    useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Real-time states
  const [newCustomerDetected, setNewCustomerDetected] = useState(false);
  const [newCustomerCount, setNewCustomerCount] = useState(0);
  const [autoGenerationRunning, setAutoGenerationRunning] = useState(false);
  const [lastAutoGenTime, setLastAutoGenTime] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [realtimeUpdate, setRealtimeUpdate] = useState(0);
  const [lastPaymentUpdate, setLastPaymentUpdate] = useState<Date | null>(null);

  // Selected data
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(
    null,
  );
  const [emailCustomer, setEmailCustomer] = useState<CustomerItem | null>(null);

  // Form states
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [includeInstallationFee, setIncludeInstallationFee] = useState(true);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailType, setEmailType] = useState("custom");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [backdatedLoading, setBackdatedLoading] = useState(false);
  const [selectedBackdatedCustomer, setSelectedBackdatedCustomer] =
    useState<any>(null);
  const [pendingModalType, setPendingModalType] = useState<
    "pro-rated" | "activation" | "payments" | "installation"
  >("pro-rated");

  const [backdatedForm, setBackdatedForm] = useState({
    applicationId: "",
    serviceStartDate: "",
    customPlanName: "",
    monthlyRate: "",
    skipFirstBill: false,
    notes: "",
    includeInstallationFee: true,
  });

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
    earlyBillGenerationDays: 15,
  });

  // ==================== QUERIES ====================
  const {
    data: dashboardData,
    isLoading,
    refetch,
    isFetching,
  } = useDashboardData();
  const { data: buildingsData = [] } = useBuildings();
  const { data: plansData = [] } = usePlans();

  // ==================== COMPUTED DATA ====================
  const customers = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.customers || [];
  }, [dashboardData, realtimeUpdate]);

  const billingCycles = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.billingCycles || [];
  }, [dashboardData, realtimeUpdate]);

  const bills = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.bills || [];
  }, [dashboardData, realtimeUpdate]);

  const pendingPayments = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.pendingPayments || [];
  }, [dashboardData, realtimeUpdate]);

  const customersWithoutAccounts = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.customersWithoutAccounts || [];
  }, [dashboardData, realtimeUpdate]);

  const pendingInstallationBills = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.pendingInstallationBills || [];
  }, [dashboardData, realtimeUpdate]);

  // FIXED: Stats computation with proper installation fee counting
  const stats = useMemo(() => {
    if (!dashboardData?.stats) {
      return {
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
      };
    }
    return dashboardData.stats;
  }, [dashboardData, realtimeUpdate]);

  const totalPendingCount = useMemo(() => {
    return (
      (dashboardData?.pendingProRated?.length || 0) +
      (dashboardData?.pendingActivations?.length || 0) +
      pendingPayments.length +
      pendingInstallationBills.length +
      customersWithoutAccounts.length +
      stats.applicationsWithoutBilling
    );
  }, [
    dashboardData,
    pendingPayments,
    pendingInstallationBills,
    customersWithoutAccounts,
    stats,
    realtimeUpdate,
  ]);

  // ==================== MUTATIONS ====================
  const invalidateAll = useCallback(() => {
    clearBillingCache();
    queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
    queryClient.invalidateQueries({ queryKey: ["pendingInstallationBills"] });

    setRealtimeUpdate((prev) => prev + 1);

    setTimeout(() => {
      refetch();
    }, 100);
  }, [queryClient, refetch]);

  // ==================== EARLY BILL GENERATION MUTATION ====================
  const generateEarlyBillMutation = useMutation({
    mutationFn: (applicationId: string) =>
      manuallyGenerateEarlyBill({ applicationId }),
    onSuccess: (data) => {
      toast.success(data.message || "✅ Early bill generated successfully!");
      clearBillingCache();
      setTimeout(() => {
        invalidateAll();
      }, 200);
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.message || "Failed to generate early bill";
      toast.error(errorMsg);
      console.error("Early bill generation error:", error);
    },
  });

  // Auto-generate early bills mutation
  const autoGenerateEarlyBillsMutation = useMutation({
    mutationFn: autoGenerateEarlyBills,
    onMutate: () => {
      setAutoGenerationRunning(true);
    },
    onSuccess: (data) => {
      setAutoGenerationRunning(false);
      setLastAutoGenTime(new Date());
      if (data?.generated > 0) {
        toast.success(`✅ Auto-generated ${data.generated} early bills!`);
      } else {
        toast.success("✅ No early bills needed at this time.");
      }
      clearBillingCache();
      setTimeout(() => {
        invalidateAll();
      }, 200);
    },
    onError: (error: any) => {
      setAutoGenerationRunning(false);
      toast.error(
        error.response?.data?.message || "Failed to auto-generate bills",
      );
    },
  });

  // Start Billing Mutation
  const startBillingMutation = useMutation({
    mutationFn: (params: any) => startBilling(params),
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["dashboardData"] });
      const previousData = queryClient.getQueryData(["dashboardData"]);
      queryClient.setQueryData(["dashboardData"], (old: any) => {
        if (!old) return old;
        const updatedCustomers = old.customers?.map((c: any) => {
          if (
            c.applicationId === params.applicationId ||
            c._id === params.userId
          ) {
            return { ...c, billingCycle: { status: "starting" } };
          }
          return c;
        });
        return { ...old, customers: updatedCustomers };
      });
      return { previousData };
    },
    onSuccess: () => {
      toast.success("✅ Billing started successfully!");
      clearBillingCache();
      setTimeout(() => {
        invalidateAll();
      }, 200);
      setShowStartModal(false);
      resetStartForm();
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["dashboardData"], context.previousData);
      }
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
    onSettled: () => {
      setTimeout(() => {
        invalidateAll();
      }, 300);
    },
  });

  // Start Billing for Application Mutation
  const startBillingForAppMutation = useMutation({
    mutationFn: ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data?: any;
    }) => startBillingForApplication(applicationId, data),
    onMutate: async ({ applicationId }) => {
      await queryClient.cancelQueries({ queryKey: ["dashboardData"] });
      const previousData = queryClient.getQueryData(["dashboardData"]);
      queryClient.setQueryData(["dashboardData"], (old: any) => {
        if (!old) return old;
        const updatedCustomers = old.customers?.map((c: any) => {
          if (c.applicationId === applicationId) {
            return { ...c, billingCycle: { status: "starting" } };
          }
          return c;
        });
        return { ...old, customers: updatedCustomers };
      });
      return { previousData };
    },
    onSuccess: () => {
      toast.success("✅ Billing started for application!");
      clearBillingCache();
      setTimeout(() => {
        invalidateAll();
      }, 200);
      setShowStartModal(false);
      resetStartForm();
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["dashboardData"], context.previousData);
      }
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
    onSettled: () => {
      setTimeout(() => {
        invalidateAll();
      }, 300);
    },
  });

  // Stop Billing Mutation
  const stopBillingMutation = useMutation({
    mutationFn: (params: any) => stopBilling(params),
    onSuccess: () => {
      toast.success("⛔ Billing stopped successfully!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    },
  });

  // Pause Billing Mutation
  const pauseBillingMutation = useMutation({
    mutationFn: (params: any) => pauseBilling(params),
    onSuccess: () => {
      toast.success("⏸️ Billing paused successfully!");
      invalidateAll();
      setShowPauseModal(false);
      setPauseReason("");
      setPauseUntilDate("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    },
  });

  // Resume Billing Mutation
  const resumeBillingMutation = useMutation({
    mutationFn: (params: any) => resumeBilling(params),
    onSuccess: () => {
      toast.success("▶️ Billing resumed successfully!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    },
  });

  // Disconnect Client Mutation
  const disconnectMutation = useMutation({
    mutationFn: (params: any) => disconnectClient(params),
    onSuccess: () => {
      toast.success("🔌 Client disconnected successfully!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    },
  });

  // Reconnect Client Mutation
  const reconnectMutation = useMutation({
    mutationFn: (params: any) => reconnectClient(params),
    onSuccess: () => {
      toast.success("🔌 Client reconnected successfully!");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    },
  });

  // Delete Billing Cycle Mutation
  const deleteCycleMutation = useMutation({
    mutationFn: (params: any) => deleteBillingCycle(params),
    onSuccess: () => {
      toast.success("🗑️ Billing cycle deleted successfully!");
      invalidateAll();
      setShowDeleteConfirmModal(false);
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    },
  });

  // Mark Bill as Paid Mutation
  const markBillPaidMutation = useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData: any;
    }) => markBillAsPaid(billId, paymentData),
    onSuccess: () => {
      toast.success("✅ Bill marked as paid!");
      setLastPaymentUpdate(new Date());
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    },
  });

  // Mark Installation Bill as Paid Mutation
  const markInstallationPaidMutation = useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData: any;
    }) => markInstallationBillAsPaid(billId, paymentData),
    onSuccess: () => {
      toast.success("✅ Installation bill marked as paid!");
      setLastPaymentUpdate(new Date());
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as paid",
      );
    },
  });

  // Confirm Payment Mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => confirmPayment(paymentId),
    onSuccess: () => {
      toast.success("✅ Payment confirmed!");
      setLastPaymentUpdate(new Date());
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    },
  });

  // Reject Payment Mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => rejectPayment(paymentId, reason),
    onSuccess: () => {
      toast.success("❌ Payment rejected");
      invalidateAll();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    },
  });

  // ==================== HANDLERS ====================
  const resetStartForm = () => {
    setSelectedUserId("");
    setSelectedApplicationId("");
    setSelectedCustomerName("");
    setSelectedCustomerEmail("");
    setStartDate("");
    setCustomAmount("");
    setBillingNotes("");
    setIncludeInstallationFee(true);
  };

  const handleRefresh = () => {
    clearBillingCache();
    invalidateAll();
    toast.success("🔄 Refreshing data...");
  };

  // ==================== Handle Early Bill Generation ====================
  const handleGenerateEarlyBill = async (customer: CustomerItem) => {
    if (!customer.applicationId) {
      toast.error("No application ID found for this customer");
      return;
    }

    if (!customer.billingCycle || customer.billingCycle.status !== "active") {
      toast.error(
        "Customer must have an active billing cycle to generate early bill",
      );
      return;
    }

    if (customer.nextMonthBill) {
      toast.success(
        `📄 Already have a bill for next month: ${customer.nextMonthBill.invoiceNumber}`,
        {
          icon: "📄",
          duration: 4000,
        },
      );
      return;
    }

    if (
      !confirm(
        `Generate next month's bill for ${customer.firstName} ${customer.lastName}?`,
      )
    ) {
      return;
    }

    generateEarlyBillMutation.mutate(customer.applicationId);
  };

  // ==================== REAL-TIME AUTO-DETECTION ====================
  const handleAutoGenerateEarlyBills = async () => {
    if (autoGenerationRunning) {
      toast("⏳ Auto-generation already running...", {
        icon: "⏳",
        duration: 3000,
      });
      return;
    }

    if (lastAutoGenTime) {
      const minutesSince =
        (Date.now() - lastAutoGenTime.getTime()) / (1000 * 60);
      if (minutesSince < 5) {
        toast(
          `⏳ Auto-generation already ran ${Math.round(minutesSince)} minutes ago`,
          {
            icon: "⏳",
            duration: 3000,
          },
        );
        return;
      }
    }

    autoGenerateEarlyBillsMutation.mutate();
  };

  // ==================== REAL-TIME WEBSOCKET EVENT LISTENERS ====================
  useEffect(() => {
    const unsubscribePayment = billingEvents.on(
      "payment_confirmed",
      (payload) => {
        console.log("💳 Payment confirmed - Real-time update:", payload);
        clearBillingCache();
        setLastPaymentUpdate(new Date());
        invalidateAll();
        toast.success(`✅ Payment confirmed!`, {
          duration: 3000,
        });
      },
    );

    const unsubscribeBill = billingEvents.on("bill_generated", (payload) => {
      console.log("📄 Bill generated - Real-time update:", payload);
      clearBillingCache();
      invalidateAll();
      toast.success(`📄 New bill generated!`, { icon: "📄" });
    });

    const unsubscribeBilling = billingEvents.on(
      "billing_updated",
      (payload) => {
        console.log("🔄 Billing updated - Real-time update:", payload);
        clearBillingCache();
        invalidateAll();
        const action = payload.type || "updated";
        toast.success(`🔄 Billing ${action}!`, { icon: "🔄" });
      },
    );

    const unsubscribeBillsRecovered = billingEvents.on(
      "bills_recovered",
      (payload) => {
        console.log("📄 Bills recovered - Real-time update:", payload);
        clearBillingCache();
        invalidateAll();
        toast.success(`📄 Bills recovered!`, { icon: "📄" });
      },
    );

    const unsubscribeSettings = billingEvents.on(
      "settings_updated",
      (payload) => {
        console.log("⚙️ Settings updated - Real-time update:", payload);
        loadBillingFlowSettings();
      },
    );

    const unsubscribeSuspension = billingEvents.on(
      "suspension_updated",
      (payload) => {
        console.log("⛔ Suspension updated - Real-time update:", payload);
        clearBillingCache();
        invalidateAll();
        toast.success(`⛔ Suspension status updated!`, { icon: "⛔" });
      },
    );

    const unsubscribePaymentSubmitted = billingEvents.on(
      "payment_submitted",
      (payload) => {
        console.log("💳 Payment submitted - Real-time update:", payload);
        clearBillingCache();
        invalidateAll();
        toast.success(`💳 Payment submitted! Waiting for confirmation.`, {
          icon: "💳",
        });
      },
    );

    const unsubscribeNewCustomer = billingEvents.on(
      "new_customer",
      (payload) => {
        console.log("🆕 New customer detected via WebSocket:", payload);
        setNewCustomerDetected(true);
        setNewCustomerCount(payload.totalNew || 1);
        clearBillingCache();
        invalidateAll();
        // Removed duplicate toast notification for new customers
      },
    );

    const unsubscribeBillsGenerated = billingEvents.on(
      "bills_generated",
      (payload) => {
        console.log("📄 Bills generated - Real-time update:", payload);
        clearBillingCache();
        invalidateAll();
        toast.success(`📄 Monthly bills generated!`, { icon: "📄" });
      },
    );

    return () => {
      unsubscribePayment();
      unsubscribeBill();
      unsubscribeBilling();
      unsubscribeBillsRecovered();
      unsubscribeSettings();
      unsubscribeSuspension();
      unsubscribePaymentSubmitted();
      unsubscribeNewCustomer();
      unsubscribeBillsGenerated();
      billingEvents.disconnect();
    };
  }, [invalidateAll]);

  // ==================== POLLING FOR NEW CUSTOMERS ====================
  useEffect(() => {
    pollingIntervalRef.current = startRealtimePolling((data) => {
      if (data.totalNew > 0) {
        setNewCustomerDetected(true);
        setNewCustomerCount(data.totalNew);
        clearBillingCache();
        invalidateAll();
        // Removed duplicate toast notification for new customers
      }
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        stopRealtimePolling(pollingIntervalRef.current);
      }
    };
  }, [invalidateAll]);

  useEffect(() => {
    if (newCustomerDetected) {
      const timer = setTimeout(() => {
        setNewCustomerDetected(false);
        setNewCustomerCount(0);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newCustomerDetected]);

  const handleAction = (action: string, customer: CustomerItem, data?: any) => {
    switch (action) {
      case "view":
        setSelectedCustomer(customer);
        setShowCustomerDetailModal(true);
        break;
      case "email":
        setEmailCustomer(customer);
        setEmailType("custom");
        setEmailSubject("Message from MisterFyber");
        setEmailMessage(`Dear ${customer.firstName},\n\n`);
        setShowEmailModal(true);
        break;
      case "recover":
        handleRecoverMissingBills(customer);
        break;
      case "start":
        if (
          customer.billingCycle &&
          customer.billingCycle.status !== "cancelled"
        ) {
          toast.error(
            `⚠️ ${customer.firstName} ${customer.lastName} already has an active billing cycle`,
          );
          return;
        }
        setSelectedApplicationId(customer.applicationId || customer._id);
        setSelectedCustomerName(`${customer.firstName} ${customer.lastName}`);
        setSelectedCustomerEmail(customer.email);
        setIncludeInstallationFee(true);
        setShowStartModal(true);
        break;
      case "pause":
        if (customer.type === "application") {
          const reason = prompt("Enter reason for pausing:");
          if (reason !== null) {
            pauseBillingMutation.mutate({
              applicationId: customer.applicationId,
              reason: reason || "Admin initiated pause",
            });
          }
        } else {
          setSelectedUserId(customer._id);
          setPauseReason("");
          setPauseUntilDate("");
          setShowPauseModal(true);
        }
        break;
      case "resume":
        if (customer.type === "application") {
          if (
            confirm(
              `Resume billing for ${customer.firstName} ${customer.lastName}?`,
            )
          ) {
            resumeBillingMutation.mutate({
              applicationId: customer.applicationId,
            });
          }
        } else {
          if (
            confirm(
              `Resume billing for ${customer.firstName} ${customer.lastName}?`,
            )
          ) {
            resumeBillingMutation.mutate({ userId: customer._id });
          }
        }
        break;
      case "disconnect":
        if (customer.type === "application") {
          const reason = prompt("Enter reason for disconnection:");
          if (
            reason !== null &&
            confirm(`Disconnect ${customer.firstName} ${customer.lastName}?`)
          ) {
            disconnectMutation.mutate({
              applicationId: customer.applicationId,
              reason,
            });
          }
        } else {
          const reason = prompt("Enter reason for disconnection:");
          if (
            reason !== null &&
            confirm(`Disconnect ${customer.firstName} ${customer.lastName}?`)
          ) {
            disconnectMutation.mutate({ userId: customer._id, reason });
          }
        }
        break;
      case "reconnect":
        if (customer.type === "application") {
          if (
            confirm(`Reconnect ${customer.firstName} ${customer.lastName}?`)
          ) {
            reconnectMutation.mutate({ applicationId: customer.applicationId });
          }
        } else {
          if (
            confirm(`Reconnect ${customer.firstName} ${customer.lastName}?`)
          ) {
            reconnectMutation.mutate({ userId: customer._id });
          }
        }
        break;
      case "stop":
        if (customer.type === "application") {
          if (
            confirm(
              `Stop billing for ${customer.firstName} ${customer.lastName}?`,
            )
          ) {
            stopBillingMutation.mutate({
              applicationId: customer.applicationId,
              reason: "Admin action",
            });
          }
        } else {
          if (
            confirm(
              `Stop billing for ${customer.firstName} ${customer.lastName}?`,
            )
          ) {
            stopBillingMutation.mutate({
              userId: customer._id,
              reason: "Admin action",
            });
          }
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

  const handleStartBilling = () => {
    if (
      startBillingMutation.isPending ||
      startBillingForAppMutation.isPending
    ) {
      toast.error("⚠️ Please wait, billing is already being started");
      return;
    }

    if (selectedApplicationId) {
      const existingCustomer = customers.find(
        (c: CustomerItem) => c.applicationId === selectedApplicationId,
      );
      if (
        existingCustomer?.billingCycle &&
        existingCustomer.billingCycle.status !== "cancelled"
      ) {
        toast.error(
          `⚠️ ${existingCustomer.firstName} ${existingCustomer.lastName} already has an active billing cycle`,
        );
        return;
      }

      startBillingForAppMutation.mutate({
        applicationId: selectedApplicationId,
        data: {
          installationDate: startDate || undefined,
          notes: billingNotes,
          includeInstallationFee,
        },
      });
    } else if (selectedUserId) {
      startBillingMutation.mutate({
        userId: selectedUserId,
        startDate: startDate || undefined,
        customAmount: customAmount ? parseFloat(customAmount) : undefined,
        notes: billingNotes,
        includeInstallationFee,
      });
    } else {
      toast.error("No customer selected");
    }
  };

  const handlePauseBilling = () => {
    if (!selectedUserId) {
      toast.error("No customer selected");
      return;
    }
    pauseBillingMutation.mutate({
      userId: selectedUserId,
      reason: pauseReason || "Admin initiated pause",
      pauseUntilDate: pauseUntilDate || undefined,
    });
  };

  const handleMarkBillAsPaid = (bill: any, customer: CustomerItem) => {
    if (!confirm(`Mark invoice ${bill.invoiceNumber} as paid?`)) return;
    markBillPaidMutation.mutate({
      billId: bill._id,
      paymentData: {
        referenceNumber: `ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
      },
    });
  };

  const handleMarkInstallationBillAsPaid = (
    bill: any,
    customer: CustomerItem,
  ) => {
    if (!confirm(`Mark installation invoice ${bill.invoiceNumber} as paid?`))
      return;
    markInstallationPaidMutation.mutate({
      billId: bill._id,
      paymentData: {
        referenceNumber: `INST-ADMIN-${Date.now()}`,
        notes: `Manually marked as paid by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
      },
    });
  };

  const handleConfirmPayment = (paymentId: string) => {
    if (!confirm("Confirm this payment?")) return;
    confirmPaymentMutation.mutate(paymentId);
  };

  const handleRejectPayment = (paymentId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason !== null) {
      rejectPaymentMutation.mutate({ paymentId, reason });
    }
  };

  const handleDeleteBillingCycle = () => {
    if (!customerToDelete?.billingCycle?._id) {
      toast.error("No billing cycle found to delete");
      return;
    }
    deleteCycleMutation.mutate({
      billingCycleId: customerToDelete.billingCycle._id,
      applicationId: customerToDelete.applicationId,
    });
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
        invalidateAll();
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
        invalidateAll();
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

  const handleSendEmail = async () => {
    if (!emailCustomer) return;
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    setSendingEmail(true);
    try {
      const result = await sendEmail({
        email: emailCustomer.email,
        emailType,
        subject: emailSubject,
        message: emailMessage,
      });

      if (result.success) {
        toast.success(`📧 Email sent to ${emailCustomer.email}`);
        setShowEmailModal(false);
        setEmailCustomer(null);
        setEmailSubject("");
        setEmailMessage("");
      } else {
        toast.error(result.message || "Failed to send email");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const loadBillingFlowSettings = async () => {
    try {
      const response = await getBillingSettingsAdmin(true);
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
          earlyBillGenerationDays: settingsData.earlyBillGenerationDays || 15,
        });
      }
    } catch (error) {
      console.error("Failed to load billing flow settings:", error);
    }
  };

  const saveBillingFlowSettings = async () => {
    try {
      await updateBillingSettingsAdmin({ ...billingFlowSettings });
      toast.success("✅ Billing flow settings saved successfully!");
      invalidateAll();
      setShowSettingsModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadBillingFlowSettings();

    if (billingFlowSettings.earlyBillGenerationDays > 0) {
      const autoGenInterval = setInterval(() => {
        handleAutoGenerateEarlyBills();
      }, 300000);

      return () => clearInterval(autoGenInterval);
    }
  }, []);

  // ==================== RENDER ====================
  return (
    <div>
      {/* Real-time status bar */}
      {(newCustomerDetected || autoGenerationRunning || lastPaymentUpdate) && (
        <div className="sticky top-0 z-50 bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {newCustomerDetected && (
              <span className="flex items-center gap-1 text-blue-700">
                <FiZap className="w-4 h-4 animate-pulse" />
                <span className="font-medium">
                  {newCustomerCount} new customer(s) detected!
                </span>
                <span className="text-sm text-blue-500">Updating...</span>
              </span>
            )}
            {autoGenerationRunning && (
              <span className="flex items-center gap-1 text-amber-700">
                <FiClock className="w-4 h-4 animate-spin" />
                <span className="font-medium">
                  Auto-generating early bills...
                </span>
              </span>
            )}
            {lastPaymentUpdate && !newCustomerDetected && (
              <span className="flex items-center gap-1 text-green-700">
                <FiCheckCircle className="w-4 h-4" />
                <span className="font-medium">Payment updated!</span>
                <span className="text-sm text-green-500">
                  {lastPaymentUpdate.toLocaleTimeString()}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setNewCustomerDetected(false);
              setNewCustomerCount(0);
              setLastPaymentUpdate(null);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      <BillingTable
        customers={customers}
        billingCycles={billingCycles}
        bills={bills}
        pendingPayments={pendingPayments}
        loading={isLoading}
        refreshing={isFetching}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        buildingFilter={buildingFilter}
        setBuildingFilter={setBuildingFilter}
        buildingsList={buildingsData}
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
        onOpenBackdated={() => setShowBackdatedModal(true)}
        onOpenExistingCustomers={() => setShowExistingCustomersModal(true)}
        onOpenPending={() => {
          setPendingModalType("pro-rated");
          setShowPendingModal(true);
        }}
        onOpenReports={() => setShowReportsModal(true)}
        totalPendingCount={totalPendingCount}
        customersWithoutAccounts={customersWithoutAccounts}
        applicationsWithoutBillingCount={stats.applicationsWithoutBilling}
        onGenerateEarlyBill={handleGenerateEarlyBill}
        onAutoGenerateEarlyBills={handleAutoGenerateEarlyBills}
        autoGenerationRunning={autoGenerationRunning}
        lastAutoGenTime={lastAutoGenTime}
      />

      {/* ==================== MODALS ==================== */}
      {/* (All modals remain the same as original) */}
      {/* Reports Modal */}
      <BillingReportsWithDownload
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        customers={customers}
        buildings={buildingsData}
        onMarkBillAsPaid={handleMarkBillAsPaid}
        onMarkInstallationBillAsPaid={handleMarkInstallationBillAsPaid}
      />

      {/* Backdated Modal */}
      {showBackdatedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Backdated Billing
              </h2>
              <button
                onClick={() => setShowBackdatedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
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
                      (customer: CustomerItem) =>
                        customer.type === "application" &&
                        customer.applicationId === appId &&
                        !customer.billingCycle,
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
                      (c: CustomerItem) =>
                        c.type === "application" &&
                        !c.billingCycle &&
                        c.applicationId,
                    )
                    .map((c: CustomerItem) => (
                      <option key={c.applicationId} value={c.applicationId}>
                        {c.firstName} {c.lastName} - {c.email}
                      </option>
                    ))}
                </select>
              </div>

              {selectedBackdatedCustomer && (
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <p className="font-medium">
                    {selectedBackdatedCustomer.firstName}{" "}
                    {selectedBackdatedCustomer.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter plan name"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter monthly rate"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBackdatedModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackdatedBilling}
                  disabled={backdatedLoading}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {backdatedLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    "Generate Bills"
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Start Billing</h2>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm mb-4">
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
                  placeholder="Auto-calculate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Notes..."
                />
              </div>

              <div className="bg-green-50 p-3 rounded-lg text-sm">
                <p className="font-semibold text-green-800">
                  ✅ Billing will be ACTIVE immediately
                </p>
                <p className="text-xs text-green-700">
                  Customer can use internet right away
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartBilling}
                  disabled={
                    startBillingMutation.isPending ||
                    startBillingForAppMutation.isPending
                  }
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {startBillingMutation.isPending ||
                  startBillingForAppMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Starting...
                    </>
                  ) : (
                    "Start Billing"
                  )}
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
                className="text-gray-400 hover:text-gray-600"
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
                  placeholder="Enter reason..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pause Until (Optional)
                </label>
                <input
                  type="date"
                  value={pauseUntilDate}
                  onChange={(e) => setPauseUntilDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPauseModal(false)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600">
                ⚠️ Delete Billing Cycle
              </h2>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the billing cycle for{" "}
              <strong>
                {customerToDelete.firstName} {customerToDelete.lastName}
              </strong>
              ?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBillingCycle}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Delete
              </button>
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
                onClick={() => setShowCustomerDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                        : "text-orange-600"
                    }
                  >
                    ₱{selectedCustomer.currentBalance.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Building</p>
                  <p>{selectedCustomer.building?.buildingName || "-"}</p>
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
                {selectedCustomer.type === "application" && (
                  <>
                    <div>
                      <p className="text-gray-500">Installation Fee</p>
                      <p>
                        ₱
                        {(
                          selectedCustomer.installationFee || 0
                        ).toLocaleString()}
                        <span
                          className={
                            selectedCustomer.installationFeePaid
                              ? "text-green-600 ml-2"
                              : "text-red-600 ml-2"
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
                        <th className="px-3 py-2 text-left">Invoice</th>
                        <th className="px-3 py-2 text-left">Period</th>
                        <th className="px-3 py-2 text-left">Due</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.unpaidBills.map((bill: any) => (
                        <tr key={bill._id}>
                          <td className="px-3 py-2 font-mono">
                            {bill.invoiceNumber}
                          </td>
                          <td className="px-3 py-2">
                            {formatBillPeriod(bill)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDate(bill.dueDate)}
                          </td>
                          <td className="px-3 py-2 text-red-600">
                            ₱{bill.total.toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            {bill.isInstallationBill
                              ? "Installation"
                              : bill.isProRated
                                ? "Pro-rated"
                                : "Monthly"}
                          </td>
                          <td className="px-3 py-2">
                            {bill.isInstallationBill &&
                              !bill.installationFeePaid && (
                                <button
                                  onClick={() =>
                                    handleMarkInstallationBillAsPaid(
                                      bill,
                                      selectedCustomer,
                                    )
                                  }
                                  className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
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
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
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
                onClick={() => setShowCustomerDetailModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pending Items</h2>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1 border-b mb-4">
              <button
                onClick={() => setPendingModalType("pro-rated")}
                className={`px-4 py-2 text-sm font-medium ${pendingModalType === "pro-rated" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
              >
                Pro-rated ({dashboardData?.pendingProRated?.length || 0})
              </button>
              <button
                onClick={() => setPendingModalType("installation")}
                className={`px-4 py-2 text-sm font-medium ${pendingModalType === "installation" ? "border-b-2 border-amber-500 text-amber-600" : "text-gray-500"}`}
              >
                Installation ({pendingInstallationBills.length})
              </button>
              <button
                onClick={() => setPendingModalType("activation")}
                className={`px-4 py-2 text-sm font-medium ${pendingModalType === "activation" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500"}`}
              >
                Activations ({dashboardData?.pendingActivations?.length || 0})
              </button>
              <button
                onClick={() => setPendingModalType("payments")}
                className={`px-4 py-2 text-sm font-medium ${pendingModalType === "payments" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"}`}
              >
                Payments ({pendingPayments.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              {pendingModalType === "pro-rated" && (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Invoice</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.pendingProRated || []).map((bill: any) => (
                      <tr key={bill._id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">
                          {bill.invoiceNumber}
                        </td>
                        <td className="px-4 py-2">
                          {bill.applicationData?.firstName}{" "}
                          {bill.applicationData?.lastName}
                        </td>
                        <td className="px-4 py-2">
                          ₱{bill.total?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() =>
                              confirmProRatedPayment({
                                applicationId: bill.applicationId,
                              })
                            }
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Invoice</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Due</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInstallationBills.map((bill: any) => (
                      <tr key={bill._id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">
                          {bill.invoiceNumber}
                        </td>
                        <td className="px-4 py-2">
                          {bill.applicationData?.firstName}{" "}
                          {bill.applicationData?.lastName}
                        </td>
                        <td className="px-4 py-2">
                          ₱{bill.total?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          {formatDate(bill.dueDate)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() =>
                              markInstallationBillAsPaid(bill._id, {
                                notes: "Admin confirmed",
                              })
                            }
                            className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Plan</th>
                      <th className="px-4 py-2 text-left">Rate</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.pendingActivations || []).map(
                      (cycle: any) => (
                        <tr key={cycle._id} className="border-t">
                          <td className="px-4 py-2">
                            {cycle.applicationData?.firstName}{" "}
                            {cycle.applicationData?.lastName}
                          </td>
                          <td className="px-4 py-2">{cycle.planId?.name}</td>
                          <td className="px-4 py-2">
                            ₱{cycle.monthlyRate?.toLocaleString()}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() =>
                                startMonthlyBilling({
                                  applicationId: cycle.applicationId,
                                })
                              }
                              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                            >
                              Activate
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}

              {pendingModalType === "payments" && (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Reference</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((payment: any) => (
                      <tr key={payment._id} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">
                          {payment.referenceNumber}
                        </td>
                        <td className="px-4 py-2">
                          {payment.application?.firstName}{" "}
                          {payment.application?.lastName}
                        </td>
                        <td className="px-4 py-2">
                          ₱{payment.amount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{payment.paymentType}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
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

            <div className="space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Early Bill Generation (Days before next month)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={billingFlowSettings.earlyBillGenerationDays}
                    onChange={(e) =>
                      setBillingFlowSettings({
                        ...billingFlowSettings,
                        earlyBillGenerationDays: parseInt(e.target.value) || 15,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bills will auto-generate X days before the next month starts
                  </p>
                </div>
              </div>

              <div className="space-y-2">
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
                  />
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
                  />
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
                  />
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
                  />
                  Auto Suspend Overdue
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
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
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Send Email</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <p className="text-gray-700">{emailCustomer.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={emailType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setEmailType(type);
                    const templates: Record<
                      string,
                      { subject: string; message: string }
                    > = {
                      custom: {
                        subject: "Message from MisterFyber",
                        message: `Dear ${emailCustomer.firstName},\n\n`,
                      },
                      invoice: {
                        subject: "Invoice Reminder - MisterFyber",
                        message: `Dear ${emailCustomer.firstName},\n\nThis is a friendly reminder that you have an outstanding balance of ₱${emailCustomer.currentBalance.toLocaleString()}.\n\nPlease log in to your account to view and pay your invoice.\n\nThank you for your prompt payment.\n\nBest regards,\nMisterFyber Team`,
                      },
                      payment_confirmation: {
                        subject: "Payment Confirmation - MisterFyber",
                        message: `Dear ${emailCustomer.firstName},\n\nThank you for your payment! Your account has been credited.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nMisterFyber Team`,
                      },
                      disconnection: {
                        subject: "Service Disconnection Notice - MisterFyber",
                        message: `Dear ${emailCustomer.firstName},\n\nThis is to notify you that your service has been disconnected due to non-payment.\n\nTo restore your service, please settle your outstanding balance.\n\nBest regards,\nMisterFyber Team`,
                      },
                      welcome: {
                        subject: "Welcome to MisterFyber!",
                        message: `Dear ${emailCustomer.firstName},\n\nWelcome to MisterFyber! We're excited to have you as our customer.\n\nYour account has been successfully set up.\n\nBest regards,\nMisterFyber Team`,
                      },
                    };
                    const template = templates[type] || templates.custom;
                    setEmailSubject(template.subject);
                    setEmailMessage(template.message);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
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
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEmailModal(false)}
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
                    "Send Email"
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
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Existing Customers Without Billing
              </h2>
              <button
                onClick={() => setShowExistingCustomersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Plan</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersWithoutAccounts.map((c: any) => (
                    <tr key={c._id} className="border-t">
                      <td className="px-4 py-2">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-4 py-2">{c.email}</td>
                      <td className="px-4 py-2">{c.planName}</td>
                      <td className="px-4 py-2">
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
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
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
                        className="px-4 py-2 text-center text-yellow-700 text-sm"
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

// ==================== EXPORT ====================
export default function AdminBillingPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminBillingPageContent />
    </QueryClientProvider>
  );
}
