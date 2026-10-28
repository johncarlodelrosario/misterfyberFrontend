// frontend/src/app/(dashboard)/admin/billing/page.tsx - COMPLETE FIXED
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
  FiUsers,
  FiPlusCircle,
  FiUserX,
  FiUserCheck,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiBarChart2,
  FiTrendingUp,
  FiCreditCard,
} from "react-icons/fi";
import toast from "react-hot-toast";

// Import components
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";
import BillingTable from "@/components/admin/billingTable";
import CustomerDetailModal from "@/components/admin/CustomerDetailModal";
import BackdatedModal from "@/components/billing/BackdatedModal";
import RichTextEditor from "@/components/RichTextEditor";

// Import services
import {
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  deleteBillingCycle,
  deleteBill,
  markBillAsPaid,
  markBillAsFree,
  markInstallationBillAsPaid,
  markInstallationBillAsFree,
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
  updateBillPrice,
} from "@/services/billing";
import { confirmPayment, rejectPayment } from "@/services/payment";
import api from "@/services/api";
import emailService, {
  SenderType,
  EmailTemplate,
} from "@/services/emailService";

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
  isDisconnected?: boolean;
  serviceStatus?: string;
  hiddenBills?: any[];
  visibleUnpaidBills?: any[];
  disconnectedAt?: string;
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

// ==================== SENDER OPTIONS ====================
const SENDER_OPTIONS: {
  value: SenderType;
  label: string;
  email: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "collection",
    label: "Collection",
    email: "Location-specific",
    icon: "📍",
    color: "green",
  },
  {
    value: "admin",
    label: "Admin",
    email: "admin@misterfyber.com",
    icon: "👤",
    color: "blue",
  },
  {
    value: "workselpueblo",
    label: "Workselpueblo",
    email: "workselpueblo@fyberblizz.com",
    icon: "🏢",
    color: "purple",
  },
  {
    value: "fbsilkresidence",
    label: "FB Silk Residence",
    email: "fbsilkresidence@fyberblizz.com",
    icon: "🏠",
    color: "orange",
  },
];

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

function formatCurrency(amount: any): string {
  const num = Number(amount);
  if (!isFinite(num)) return "₱0.00";
  return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==================== QUERY CLIENT SETUP ====================
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// ===== API FUNCTIONS =====
const fetchDashboardData = async () => {
  try {
    const timestamp = Date.now();
    const response = await api.get(
      `/billing/dashboard-data?forceRefresh=true&_t=${timestamp}`,
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

const fetchBuildings = async (): Promise<Building[]> => {
  try {
    const response = await api.get("/buildings/active");
    return (response.data.data || []) as Building[];
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

// ==================== CUSTOM HOOKS ====================
const useDashboardData = () => {
  return useQuery({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    staleTime: 60000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

const useBuildings = () => {
  return useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: fetchBuildings,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

const usePlans = () => {
  return useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ==================== MAIN COMPONENT ====================
function AdminBillingPageContent() {
  const queryClient = useQueryClient();

  // ✅ Function to get current month string (YYYY-MM)
  const getCurrentMonthString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // ==================== STATE ====================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonthString());
  const [dateFilter, setDateFilter] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
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
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteBillConfirmModal, setShowDeleteBillConfirmModal] =
    useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState("");
  const [customerToDisconnect, setCustomerToDisconnect] =
    useState<CustomerItem | null>(null);
  const [customerToReconnect, setCustomerToReconnect] =
    useState<CustomerItem | null>(null);

  // Real-time states
  const [autoGenerationRunning, setAutoGenerationRunning] = useState(false);
  const [lastAutoGenTime, setLastAutoGenTime] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMounted, setIsMounted] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // WebSocket states
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
  const [billToDelete, setBillToDelete] = useState<{
    billId: string;
    invoiceNumber: string;
    customer: CustomerItem;
  } | null>(null);

  // ==================== EMAIL MODAL STATE ====================
  const [emailCustomer, setEmailCustomer] = useState<CustomerItem | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailRichTextContent, setEmailRichTextContent] = useState("");
  const [emailSenderType, setEmailSenderType] =
    useState<SenderType>("collection");
  const [emailIncludeBilling, setEmailIncludeBilling] = useState(false);
  const [emailSelectedBillIds, setEmailSelectedBillIds] = useState<string[]>(
    [],
  );
  const [emailCustomerBills, setEmailCustomerBills] = useState<any[]>([]);
  const [emailSendCopyToAdmin, setEmailSendCopyToAdmin] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailLoadingBills, setEmailLoadingBills] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  const [emailPreviewLocation, setEmailPreviewLocation] = useState("");
  const [emailPreviewSenderInfo, setEmailPreviewSenderInfo] = useState("");
  const [emailCustomerLocation, setEmailCustomerLocation] = useState("");
  const [emailCollectionEmail, setEmailCollectionEmail] = useState("");

  // ✅ NEW: Template + Schedule state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSelectedTemplateId, setEmailSelectedTemplateId] = useState("");
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(false);
  const [emailScheduleMode, setEmailScheduleMode] = useState(false);
  const [emailScheduledFor, setEmailScheduledFor] = useState("");
  const [emailScheduleName, setEmailScheduleName] = useState("");
  const [emailScheduling, setEmailScheduling] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [includeInstallationFee, setIncludeInstallationFee] = useState(true);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseUntilDate, setPauseUntilDate] = useState("");
  const [backdatedLoading, setBackdatedLoading] = useState(false);
  const [selectedBackdatedCustomer, setSelectedBackdatedCustomer] =
    useState<any>(null);
  const [pendingModalType, setPendingModalType] = useState<
    "pro-rated" | "activation" | "payments" | "installation"
  >("pro-rated");
  const [deleteBillReason, setDeleteBillReason] = useState("");

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

  // ==================== EMAIL HELPER FUNCTIONS ====================
  const getLocationFromBuildingName = useCallback(
    (buildingName?: string): string => {
      if (!buildingName) return "other";
      const name = buildingName.toLowerCase().trim();
      if (name.includes("breeze")) return "breeze";
      if (name.includes("sil") || name.includes("silk")) return "sil";
      return "other";
    },
    [],
  );

  const getCollectionEmailForLocation = useCallback(
    (location: string): string => {
      if (location === "breeze") {
        return (
          process.env.NEXT_PUBLIC_COLLECTION_EMAIL_BREEZE ||
          "collection.breeze@misterfyber.com"
        );
      } else if (location === "sil") {
        return (
          process.env.NEXT_PUBLIC_COLLECTION_EMAIL_SIL ||
          "collection.silk@misterfyber.com"
        );
      }
      return (
        process.env.NEXT_PUBLIC_COLLECTION_EMAIL_DEFAULT ||
        "admin@misterfyber.com"
      );
    },
    [],
  );

  const getLocationDisplay = useCallback((location: string): string => {
    if (location === "breeze") return "🌊 Breeze";
    if (location === "sil") return "🏢 SIL";
    return "📍 Other";
  }, []);

  // ==================== COMPUTED DATE RANGE ====================
  const dateRange = useMemo(() => {
    if (!monthFilter && !dateFilter) return null;

    if (dateFilter) {
      const d = new Date(`${dateFilter}T00:00:00`);
      if (isNaN(d.getTime())) return null;
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }

    if (monthFilter) {
      const [yStr, mStr] = monthFilter.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (isNaN(y) || isNaN(m)) return null;
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    return null;
  }, [monthFilter, dateFilter]);

  // ✅ Helper: check if a bill falls in current date range
  const billInRange = useCallback(
    (bill: any): boolean => {
      if (!dateRange) return true;
      const raw =
        bill?.billDate ||
        bill?.createdAt ||
        bill?.dueDate ||
        bill?.paidAt ||
        bill?.paymentDate ||
        bill?.updatedAt;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return d >= dateRange.start && d <= dateRange.end;
    },
    [dateRange],
  );

  // ==================== COMPUTED DATA ====================
  // ✅ FIX: Prefer allCustomers (backend already merges approved-no-billing apps)
  //         Fall back to merging customers + disconnectedCustomers
  const allCustomers = useMemo<CustomerItem[]>(() => {
    if (!dashboardData) return [];

    if (
      dashboardData.allCustomers &&
      Array.isArray(dashboardData.allCustomers) &&
      dashboardData.allCustomers.length > 0
    ) {
      return dashboardData.allCustomers as CustomerItem[];
    }

    const active = (dashboardData.customers || []) as CustomerItem[];
    const disconnected = (dashboardData.disconnectedCustomers ||
      []) as CustomerItem[];

    // Dedupe by _id + type
    const seen = new Set<string>();
    return [...active, ...disconnected].filter((c) => {
      const key = `${c.type}-${c._id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dashboardData]);

  const buildingFilteredCustomers = useMemo<CustomerItem[]>(() => {
    let result = allCustomers;

    if (buildingFilter !== "all") {
      result = result.filter((c) => {
        const customerBuildingId = c.building?._id || null;
        return customerBuildingId === buildingFilter;
      });
    }

    if (dateRange) {
      result = result.filter((c) => {
        const allBills = [
          ...(c.unpaidBills || []),
          ...(c.overdueBills || []),
          ...(c.visibleUnpaidBills || []),
          ...(c.hiddenBills || []),
        ];
        if (c.billingCycle?.bills && Array.isArray(c.billingCycle.bills)) {
          allBills.push(...c.billingCycle.bills);
        }
        if (c.nextMonthBill) allBills.push(c.nextMonthBill);
        return allBills.some((b) => billInRange(b));
      });
    }

    return result;
  }, [allCustomers, buildingFilter, dateRange, billInRange]);

  const buildingFilteredStats = useMemo(() => {
    // Count disconnected from current allCustomers
    const disconnectedCount = allCustomers.filter(
      (c) =>
        c.isDisconnected === true ||
        c.status === "disconnected" ||
        c.billingCycle?.status === "disconnected",
    ).length;

    if (buildingFilter === "all" && !dateRange) {
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
          disconnectedCustomersCount: 0,
          collectibles: 0,
          totalOverdueAmount: 0,
          totalUnpaidBillsCount: 0,
          paidInstallationFeesAmount: 0,
          monthlyRecurringRevenue: 0,
          averageBalance: 0,
        };
      }
      const baseStats = dashboardData.stats;
      const collectibles = allCustomers.reduce(
        (sum, c) => sum + (c.currentBalance || 0),
        0,
      );
      const totalOverdueAmount = allCustomers.reduce((sum, c) => {
        const overdue = (c.overdueBills || []).reduce(
          (s: number, b: any) => s + (b.total || b.amount || 0),
          0,
        );
        return sum + overdue;
      }, 0);
      const totalUnpaidBillsCount = allCustomers.reduce(
        (sum, c) => sum + (c.unpaidBills?.length || 0),
        0,
      );
      const paidInstallationFeesAmount = allCustomers.reduce((sum, c) => {
        if (c.type === "application" && c.installationFeePaid) {
          return sum + (c.installationFee || 0);
        }
        return sum;
      }, 0);
      const monthlyRecurringRevenue = allCustomers.reduce((sum, c) => {
        if (c.billingCycle?.status === "active" || c.status === "active") {
          return sum + (c.planPrice || 0);
        }
        return sum;
      }, 0);
      const averageBalance =
        baseStats.customersWithBalanceCount > 0
          ? baseStats.totalBalance / baseStats.customersWithBalanceCount
          : 0;

      // ✅ Total customers should EXCLUDE disconnected
      const totalActiveCustomers = Math.max(
        0,
        (baseStats.totalCustomers || 0) - disconnectedCount,
      );

      return {
        ...baseStats,
        totalCustomers: totalActiveCustomers,
        disconnectedCustomersCount: disconnectedCount,
        collectibles,
        totalOverdueAmount,
        totalUnpaidBillsCount,
        paidInstallationFeesAmount,
        monthlyRecurringRevenue,
        averageBalance,
      };
    }

    const filtered = buildingFilteredCustomers;
    const disconnected = filtered.filter(
      (c) =>
        c.isDisconnected === true ||
        c.status === "disconnected" ||
        c.billingCycle?.status === "disconnected",
    );
    const nonDisconnected = filtered.filter(
      (c) =>
        !(
          c.isDisconnected === true ||
          c.status === "disconnected" ||
          c.billingCycle?.status === "disconnected"
        ),
    );
    const totalBalance = filtered.reduce(
      (sum, c) => sum + (c.currentBalance || 0),
      0,
    );
    const customersWithBalanceCount = filtered.filter(
      (c) => (c.currentBalance || 0) > 0,
    ).length;
    const overdueCustomersCount = filtered.filter(
      (c) => (c.overdueBills?.length || 0) > 0,
    ).length;
    const activeCyclesCount = filtered.filter(
      (c) => c.billingCycle?.status === "active",
    ).length;
    const pausedCyclesCount = filtered.filter(
      (c) => c.billingCycle?.status === "paused",
    ).length;

    const pendingProRatedCount = filtered.filter(
      (c) =>
        c.billingCycle?.status === "pending_activation" &&
        (c.unpaidBills?.length || 0) > 0 &&
        c.unpaidBills?.some(
          (b: any) => b.isProRated === true && b.status !== "paid",
        ),
    ).length;
    const pendingActivationsCount = filtered.filter(
      (c) => c.billingCycle?.status === "pending_activation",
    ).length;
    const pendingPaymentsCount = 0;
    const pendingInstallationBillsCount = filtered.filter(
      (c) =>
        c.type === "application" &&
        c.installationFeePaid !== true &&
        (c.installationFee || 0) > 0,
    ).length;

    const totalInstallationFeesDue = filtered.reduce((sum, c) => {
      if (c.type === "application" && c.installationFeePaid !== true) {
        return sum + (c.installationFee || 0);
      }
      return sum;
    }, 0);
    const paidInstallationFeesAmount = filtered.reduce((sum, c) => {
      if (c.type === "application" && c.installationFeePaid === true) {
        return sum + (c.installationFee || 0);
      }
      return sum;
    }, 0);
    const installationFeesPaidCount = filtered.filter(
      (c) => c.type === "application" && c.installationFeePaid === true,
    ).length;
    const applicationsWithoutBilling = filtered.filter(
      (c) => c.type === "application" && !c.billingCycle,
    ).length;

    const collectibles = totalBalance;
    const totalOverdueAmount = filtered.reduce((sum, c) => {
      const overdue = (c.overdueBills || []).reduce(
        (s: number, b: any) => s + (b.total || b.amount || 0),
        0,
      );
      return sum + overdue;
    }, 0);
    const totalUnpaidBillsCount = filtered.reduce(
      (sum, c) => sum + (c.unpaidBills?.length || 0),
      0,
    );
    const monthlyRecurringRevenue = filtered.reduce((sum, c) => {
      if (c.billingCycle?.status === "active" || c.status === "active") {
        return sum + (c.planPrice || 0);
      }
      return sum;
    }, 0);
    const averageBalance =
      customersWithBalanceCount > 0
        ? totalBalance / customersWithBalanceCount
        : 0;

    return {
      // ✅ Total customers should EXCLUDE disconnected
      totalCustomers: nonDisconnected.length,
      totalBalance,
      customersWithBalanceCount,
      overdueCustomersCount,
      activeCyclesCount,
      pausedCyclesCount,
      pendingProRatedCount,
      pendingActivationsCount,
      pendingPaymentsCount,
      pendingInstallationBillsCount,
      applicationsWithoutBilling,
      totalInstallationFeesDue,
      installationFeesPaidCount,
      disconnectedCustomersCount: disconnected.length,
      collectibles,
      totalOverdueAmount,
      totalUnpaidBillsCount,
      paidInstallationFeesAmount,
      monthlyRecurringRevenue,
      averageBalance,
    };
  }, [
    buildingFilter,
    dateRange,
    buildingFilteredCustomers,
    allCustomers,
    dashboardData,
  ]);

  const activeBuildingName = useMemo<string | null>(() => {
    if (buildingFilter === "all") return null;
    const building = buildingsData.find(
      (b: Building) => b._id === buildingFilter,
    );
    return building?.buildingName || null;
  }, [buildingFilter, buildingsData]);

  const disconnectedCustomers = useMemo<CustomerItem[]>(() => {
    if (!dashboardData) return [];
    if (
      dashboardData.disconnectedCustomers &&
      Array.isArray(dashboardData.disconnectedCustomers)
    ) {
      return dashboardData.disconnectedCustomers as CustomerItem[];
    }
    return allCustomers.filter(
      (c: CustomerItem) =>
        c.isDisconnected === true ||
        c.status === "disconnected" ||
        c.billingCycle?.status === "disconnected",
    );
  }, [dashboardData, allCustomers]);

  const billingCycles = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.billingCycles || [];
  }, [dashboardData]);

  const bills = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.bills || [];
  }, [dashboardData]);

  const pendingPayments = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.pendingPayments || [];
  }, [dashboardData]);

  const customersWithoutAccounts = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.customersWithoutAccounts || [];
  }, [dashboardData]);

  const pendingInstallationBills = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.pendingInstallationBills || [];
  }, [dashboardData]);

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
        disconnectedCustomersCount: 0,
      };
    }
    return dashboardData.stats;
  }, [dashboardData]);

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
  ]);

  // ==================== REFRESH FUNCTION ====================
  const refreshData = useCallback(
    async (silent: boolean = false) => {
      if (isRefreshing) return;
      setIsRefreshing(true);

      try {
        clearBillingCache();

        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
        queryClient.invalidateQueries({ queryKey: ["bills"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
        queryClient.invalidateQueries({
          queryKey: ["pendingInstallationBills"],
        });

        const result = await refetch();

        if (result.data) {
          setRefreshCount((prev) => prev + 1);
          setLastUpdated(new Date());
          if (!silent) {
            toast.success("🔄 Dashboard updated!", { duration: 1500 });
          }
        }
      } catch (error) {
        console.error("❌ Error refreshing data:", error);
      } finally {
        setIsRefreshing(false);
      }
    },
    [queryClient, refetch, isRefreshing],
  );

  // ==================== WEBSOCKET SETUP ====================
  useEffect(() => {
    if (!isMounted) return;

    let isFirstConnection = true;

    billingEvents.connect();

    const handleRefresh = (payload: any) => {
      refreshData(true);
    };

    const handleConnected = () => {
      setWebsocketConnected(true);
      if (isFirstConnection) {
        isFirstConnection = false;
        refreshData(true);
      }
    };

    const handleDisconnected = () => {
      setWebsocketConnected(false);
    };

    const unsubConnected = billingEvents.on("connected", handleConnected);
    const unsubDisconnected = billingEvents.on(
      "disconnected",
      handleDisconnected,
    );

    const unsubRefresh = billingEvents.on("refresh", handleRefresh);
    const unsubBillingUpdated = billingEvents.on(
      "billing_updated",
      handleRefresh,
    );
    const unsubPaymentConfirmed = billingEvents.on(
      "payment_confirmed",
      handleRefresh,
    );
    const unsubBillingCreated = billingEvents.on(
      "billing:created",
      handleRefresh,
    );
    const unsubBillingPaid = billingEvents.on("billing:paid", handleRefresh);
    const unsubCustomerCreated = billingEvents.on(
      "customer:created",
      handleRefresh,
    );
    const unsubBillingCycleCreated = billingEvents.on(
      "billingCycle:created",
      handleRefresh,
    );
    const unsubBillingCycleUpdated = billingEvents.on(
      "billingCycle:updated",
      handleRefresh,
    );
    const unsubBillingCycleDeleted = billingEvents.on(
      "billingCycle:deleted",
      handleRefresh,
    );
    const unsubBillsRecovered = billingEvents.on(
      "bills_recovered",
      handleRefresh,
    );
    const unsubBillsGenerated = billingEvents.on(
      "bills_generated",
      handleRefresh,
    );
    const unsubSettingsUpdated = billingEvents.on(
      "settings_updated",
      (payload) => {
        if (settingsLoaded) {
          loadBillingFlowSettings();
        }
        handleRefresh(payload);
      },
    );
    const unsubPaymentSubmitted = billingEvents.on(
      "payment_submitted",
      handleRefresh,
    );
    const unsubSuspensionUpdated = billingEvents.on(
      "suspension_updated",
      handleRefresh,
    );
    const unsubBillGenerated = billingEvents.on(
      "bill_generated",
      handleRefresh,
    );

    setWebsocketConnected(billingEvents.isConnected());

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubRefresh();
      unsubBillingUpdated();
      unsubPaymentConfirmed();
      unsubBillingCreated();
      unsubBillingPaid();
      unsubCustomerCreated();
      unsubBillingCycleCreated();
      unsubBillingCycleUpdated();
      unsubBillingCycleDeleted();
      unsubBillsRecovered();
      unsubBillsGenerated();
      unsubSettingsUpdated();
      unsubPaymentSubmitted();
      unsubSuspensionUpdated();
      unsubBillGenerated();

      billingEvents.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  // ==================== MUTATIONS ====================

  const disconnectClientMutation = useMutation({
    mutationFn: (params: { applicationId: string; reason?: string }) =>
      disconnectClient(params),
    onSuccess: (data) => {
      toast.success(
        data.message ||
          "🔌 Client disconnected! Customer remains visible in billing list.",
      );
      setShowDisconnectModal(false);
      setCustomerToDisconnect(null);
      setDisconnectReason("");
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    },
  });

  const reconnectClientMutation = useMutation({
    mutationFn: (params: { applicationId: string }) => reconnectClient(params),
    onSuccess: (data) => {
      toast.success(data.message || "🔌 Client reconnected!");
      setShowReconnectModal(false);
      setCustomerToReconnect(null);
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    },
  });

  const updateBillPriceMutation = useMutation({
    mutationFn: ({ billId, newPrice }: { billId: string; newPrice: number }) =>
      updateBillPrice(billId, newPrice),
    onSuccess: () => {
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update bill price",
      );
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: ({ billId, reason }: { billId: string; reason?: string }) =>
      deleteBill(billId, reason),
    onSuccess: (data) => {
      toast.success(data.message || "✅ Bill deleted successfully!");
      setShowDeleteBillConfirmModal(false);
      setBillToDelete(null);
      setDeleteBillReason("");
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete bill");
    },
  });

  const generateEarlyBillMutation = useMutation({
    mutationFn: (applicationId: string) =>
      manuallyGenerateEarlyBill({ applicationId }),
    onSuccess: (data) => {
      toast.success(data.message || "✅ Early bill generated successfully!");
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate early bill",
      );
    },
  });

  const autoGenerateEarlyBillsMutation = useMutation({
    mutationFn: autoGenerateEarlyBills,
    onMutate: () => setAutoGenerationRunning(true),
    onSuccess: (data) => {
      setAutoGenerationRunning(false);
      setLastAutoGenTime(new Date());
      if (data?.generated > 0) {
        toast.success(`✅ Auto-generated ${data.generated} early bills!`);
      } else {
        toast.success("✅ No early bills needed at this time.");
      }
      clearBillingCache();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      setAutoGenerationRunning(false);
      toast.error(
        error.response?.data?.message || "Failed to auto-generate bills",
      );
    },
  });

  const startBillingMutation = useMutation({
    mutationFn: (params: any) => startBilling(params),
    onSuccess: () => {
      toast.success("✅ Billing started successfully!");
      clearBillingCache();
      resetStartForm();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
  });

  const startBillingForAppMutation = useMutation({
    mutationFn: ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data?: any;
    }) => startBillingForApplication(applicationId, data),
    onSuccess: () => {
      toast.success("✅ Billing started for application!");
      clearBillingCache();
      resetStartForm();
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
  });

  const stopBillingMutation = useMutation({
    mutationFn: (params: any) => stopBilling(params),
    onSuccess: () => {
      toast.success("⛔ Billing stopped successfully!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    },
  });

  const pauseBillingMutation = useMutation({
    mutationFn: (params: any) => pauseBilling(params),
    onSuccess: () => {
      toast.success("⏸️ Billing paused successfully!");
      setShowPauseModal(false);
      setPauseReason("");
      setPauseUntilDate("");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    },
  });

  const resumeBillingMutation = useMutation({
    mutationFn: (params: any) => resumeBilling(params),
    onSuccess: () => {
      toast.success("▶️ Billing resumed successfully!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    },
  });

  const deleteCycleMutation = useMutation({
    mutationFn: (params: any) => deleteBillingCycle(params),
    onSuccess: () => {
      toast.success("🗑️ Billing cycle deleted successfully!");
      setShowDeleteConfirmModal(false);
      setCustomerToDelete(null);
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    },
  });

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
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    },
  });

  const markBillFreeMutation = useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData?: any;
    }) => markBillAsFree(billId, paymentData),
    onSuccess: () => {
      toast.success("✅ Bill marked as FREE!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as free",
      );
    },
  });

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
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as paid",
      );
    },
  });

  const markInstallationFreeMutation = useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData?: any;
    }) => markInstallationBillAsFree(billId, paymentData),
    onSuccess: () => {
      toast.success("✅ Installation bill marked as FREE!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as free",
      );
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => confirmPayment(paymentId),
    onSuccess: () => {
      toast.success("✅ Payment confirmed!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    },
  });

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
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    },
  });

  const confirmProRatedPaymentMutation = useMutation({
    mutationFn: (data: any) => confirmProRatedPayment(data),
    onSuccess: () => {
      toast.success("✅ Pro-rated payment confirmed!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to confirm pro-rated payment",
      );
    },
  });

  const startMonthlyBillingMutation = useMutation({
    mutationFn: (data: any) => startMonthlyBilling(data),
    onSuccess: () => {
      toast.success("✅ Monthly billing started!");
      setTimeout(() => refreshData(true), 200);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to start monthly billing",
      );
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
    refreshData(false);
  };

  const handleEditBillPrice = useCallback(
    (billId: string, newPrice: number, customer: CustomerItem) => {
      if (newPrice < 0) {
        toast.error("Price cannot be negative");
        return;
      }
      updateBillPriceMutation.mutate({ billId, newPrice });
    },
    [updateBillPriceMutation],
  );

  const handleEditInstallationPrice = useCallback(
    (billId: string, newPrice: number, customer: CustomerItem) => {
      if (newPrice < 0) {
        toast.error("Price cannot be negative");
        return;
      }
      updateBillPriceMutation.mutate({ billId, newPrice });
    },
    [updateBillPriceMutation],
  );

  const handleDeleteBill = useCallback(
    (billId: string, invoiceNumber: string, customer: CustomerItem) => {
      setBillToDelete({ billId, invoiceNumber, customer });
      setDeleteBillReason("");
      setShowDeleteBillConfirmModal(true);
    },
    [],
  );

  const confirmDeleteBill = () => {
    if (!billToDelete) return;
    deleteBillMutation.mutate({
      billId: billToDelete.billId,
      reason: deleteBillReason || "Deleted by admin",
    });
  };

  const handleDisconnectCustomer = (customer: CustomerItem) => {
    setCustomerToDisconnect(customer);
    setDisconnectReason("");
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = () => {
    if (!customerToDisconnect) return;
    if (!customerToDisconnect.applicationId) {
      toast.error("No application ID found for this customer");
      return;
    }
    disconnectClientMutation.mutate({
      applicationId: customerToDisconnect.applicationId,
      reason: disconnectReason || "Disconnected by admin",
    });
  };

  const handleReconnectCustomer = (customer: CustomerItem) => {
    setCustomerToReconnect(customer);
    setShowReconnectModal(true);
  };

  const confirmReconnect = () => {
    if (!customerToReconnect) return;
    if (!customerToReconnect.applicationId) {
      toast.error("No application ID found for this customer");
      return;
    }
    reconnectClientMutation.mutate({
      applicationId: customerToReconnect.applicationId,
    });
  };

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
        { icon: "📄", duration: 4000 },
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

  const handleAutoGenerateEarlyBills = useCallback(async () => {
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
          { icon: "⏳", duration: 3000 },
        );
        return;
      }
    }

    autoGenerateEarlyBillsMutation.mutate();
  }, [autoGenerationRunning, lastAutoGenTime, autoGenerateEarlyBillsMutation]);

  const checkForNewCustomersHandler = useCallback(async () => {
    try {
      const result = await checkForNewCustomers(true);
      if (result.totalNew > 0) {
        clearBillingCache();
        setTimeout(() => refreshData(true), 200);
      }
    } catch (error) {
      console.error("Error checking for new customers:", error);
    }
  }, [refreshData]);

  // ==================== EMAIL HANDLERS ====================
  const loadEmailCustomerBills = useCallback(async (applicationId: string) => {
    if (!applicationId) {
      setEmailCustomerBills([]);
      return;
    }
    setEmailLoadingBills(true);
    try {
      const data = await emailService.getCustomerBills(applicationId);
      const billsData = data?.bills || [];
      setEmailCustomerBills(billsData);
      setEmailSelectedBillIds([]);
    } catch (error) {
      console.error("Failed to load customer bills for email:", error);
      setEmailCustomerBills([]);
      setEmailSelectedBillIds([]);
    } finally {
      setEmailLoadingBills(false);
    }
  }, []);

  const loadEmailTemplates = useCallback(async () => {
    setEmailTemplatesLoading(true);
    try {
      const data = await emailService.getTemplates();
      setEmailTemplates(data || []);
    } catch (error) {
      console.error("Failed to load email templates:", error);
      setEmailTemplates([]);
    } finally {
      setEmailTemplatesLoading(false);
    }
  }, []);

  const handleEmailTemplateSelect = useCallback(
    (templateId: string) => {
      setEmailSelectedTemplateId(templateId);
      if (!templateId) return;
      const template = emailTemplates.find((t) => t.id === templateId);
      if (!template) return;

      setEmailSubject(template.subject || "");

      const templateMessage = template.message || "";
      const hasHtml = /<[a-z][\s\S]*>/i.test(templateMessage);

      if (hasHtml) {
        setEmailRichTextContent(templateMessage);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateMessage;
        setEmailMessage(tempDiv.textContent || "");
      } else {
        const htmlContent = templateMessage.replace(/\n/g, "<br>");
        setEmailRichTextContent(htmlContent);
        setEmailMessage(templateMessage);
      }

      setEmailIncludeBilling(template.includeBillingDefault || false);
      if (!template.includeBillingDefault) {
        setEmailSelectedBillIds([]);
      }
    },
    [emailTemplates],
  );

  const openEmailModal = useCallback(
    async (customer: CustomerItem) => {
      setEmailCustomer(customer);
      setEmailSubject(`Message from MisterFyber`);
      setEmailMessage(`Dear ${customer.firstName},\n\n`);
      setEmailRichTextContent(`<p>Dear ${customer.firstName},</p><p><br></p>`);
      setEmailIncludeBilling(false);
      setEmailSelectedBillIds([]);
      setEmailSendCopyToAdmin(false);
      setEmailSenderType("collection");
      setEmailPreviewOpen(false);
      setEmailPreviewHtml("");

      setEmailSelectedTemplateId("");
      setEmailScheduleMode(false);
      setEmailScheduledFor("");
      setEmailScheduleName("");

      const location = getLocationFromBuildingName(
        customer.building?.buildingName,
      );
      setEmailCustomerLocation(location);
      setEmailCollectionEmail(getCollectionEmailForLocation(location));

      setShowEmailModal(true);

      void loadEmailTemplates();
      if (customer.applicationId) {
        await loadEmailCustomerBills(customer.applicationId);
      } else {
        setEmailCustomerBills([]);
      }
    },
    [
      getLocationFromBuildingName,
      getCollectionEmailForLocation,
      loadEmailCustomerBills,
      loadEmailTemplates,
    ],
  );

  const toggleEmailBillSelection = (billId: string) => {
    setEmailSelectedBillIds((prev) =>
      prev.includes(billId)
        ? prev.filter((id) => id !== billId)
        : [...prev, billId],
    );
  };

  const selectAllEmailBills = () => {
    setEmailSelectedBillIds(emailCustomerBills.map((bill) => bill._id));
  };

  const deselectAllEmailBills = () => {
    setEmailSelectedBillIds([]);
  };

  const handleEmailPreview = async () => {
    if (!emailCustomer) {
      toast.error("Please select a customer first");
      return;
    }
    if (
      !emailSubject.trim() ||
      !(emailMessage.trim() || emailRichTextContent.trim())
    ) {
      toast.error("Please enter subject and message");
      return;
    }
    if (emailIncludeBilling && emailSelectedBillIds.length === 0) {
      toast.error("Please select at least one bill to include");
      return;
    }

    try {
      const preview = await emailService.previewEmail({
        subject: emailSubject,
        message: emailRichTextContent || emailMessage,
        richTextContent: emailRichTextContent || emailMessage,
        includeBilling: emailIncludeBilling,
        applicationId: emailCustomer.applicationId || "",
        billIds: emailIncludeBilling ? emailSelectedBillIds : undefined,
        senderType: emailSenderType,
      });
      setEmailPreviewHtml(preview.html || "");
      setEmailPreviewLocation(preview.location || "unknown");
      setEmailPreviewSenderInfo(preview.senderInfo || "");
      setEmailPreviewOpen(true);
    } catch (error: any) {
      console.error("Failed to generate preview:", error);
      toast.error(
        error.response?.data?.message || "Failed to generate preview",
      );
    }
  };

  const handleSendEmail = async () => {
    if (!emailCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (!emailCustomer.applicationId) {
      toast.error("This customer has no application ID — cannot send email");
      return;
    }
    if (
      !emailSubject.trim() ||
      !(emailMessage.trim() || emailRichTextContent.trim())
    ) {
      toast.error("Please enter subject and message");
      return;
    }
    if (emailIncludeBilling && emailSelectedBillIds.length === 0) {
      toast.error("Please select at least one bill to include");
      return;
    }

    setEmailSending(true);
    try {
      const result = await emailService.sendEmail({
        applicationId: emailCustomer.applicationId,
        subject: emailSubject,
        message: emailRichTextContent || emailMessage,
        richTextContent: emailRichTextContent || emailMessage,
        includeBilling: emailIncludeBilling,
        billIds: emailIncludeBilling ? emailSelectedBillIds : undefined,
        sendCopyToAdmin: emailSendCopyToAdmin,
        senderType: emailSenderType,
      });

      const senderDisplay =
        SENDER_OPTIONS.find((s) => s.value === emailSenderType)?.label ||
        emailSenderType;
      const locationDisplay = emailCustomerLocation
        ? emailCustomerLocation.toUpperCase()
        : "Unknown";
      toast.success(
        `✅ Email sent via ${senderDisplay} to ${emailCustomer.firstName} ${emailCustomer.lastName} (${locationDisplay})`,
      );

      setShowEmailModal(false);
      setEmailCustomer(null);
      setEmailSubject("");
      setEmailMessage("");
      setEmailRichTextContent("");
      setEmailIncludeBilling(false);
      setEmailSelectedBillIds([]);
      setEmailCustomerBills([]);
      setEmailPreviewOpen(false);
      setEmailPreviewHtml("");
      setEmailSendCopyToAdmin(false);
      setEmailSenderType("collection");
      setEmailCustomerLocation("");
      setEmailCollectionEmail("");
      setEmailSelectedTemplateId("");
      setEmailScheduleMode(false);
      setEmailScheduledFor("");
      setEmailScheduleName("");

      setTimeout(() => refreshData(true), 200);
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error(error.response?.data?.message || "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (!emailCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (!emailCustomer.applicationId) {
      toast.error("This customer has no application ID — cannot schedule");
      return;
    }
    if (
      !emailSubject.trim() ||
      !(emailMessage.trim() || emailRichTextContent.trim())
    ) {
      toast.error("Please enter subject and message");
      return;
    }
    if (emailIncludeBilling && emailSelectedBillIds.length === 0) {
      toast.error("Please select at least one bill to include");
      return;
    }
    if (!emailScheduledFor) {
      toast.error("Please choose a date and time to schedule the email");
      return;
    }

    const scheduledDate = new Date(emailScheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      toast.error("Invalid scheduled date/time");
      return;
    }
    if (scheduledDate.getTime() <= Date.now()) {
      toast.error("Scheduled date/time must be in the future");
      return;
    }

    setEmailScheduling(true);
    try {
      const scheduleName =
        emailScheduleName.trim() ||
        `Email to ${emailCustomer.firstName} ${emailCustomer.lastName} - ${scheduledDate.toLocaleString()}`;

      await emailService.scheduleEmail({
        name: scheduleName,
        applicationIds: [emailCustomer.applicationId],
        subject: emailSubject,
        message: emailRichTextContent || emailMessage,
        richTextContent: emailRichTextContent || emailMessage,
        includeBilling: emailIncludeBilling,
        billIds: emailIncludeBilling ? emailSelectedBillIds : undefined,
        sendCopyToAdmin: emailSendCopyToAdmin,
        senderType: emailSenderType,
        scheduledFor: scheduledDate.toISOString(),
        locationFilter:
          emailCustomerLocation === "breeze" ||
          emailCustomerLocation === "sil" ||
          emailCustomerLocation === "other"
            ? (emailCustomerLocation as "all" | "breeze" | "sil" | "other")
            : undefined,
        recurring: {
          enabled: false,
          frequency: "daily",
          interval: 1,
        },
      });

      toast.success(`📅 Email scheduled for ${scheduledDate.toLocaleString()}`);

      setShowEmailModal(false);
      setEmailCustomer(null);
      setEmailSubject("");
      setEmailMessage("");
      setEmailRichTextContent("");
      setEmailIncludeBilling(false);
      setEmailSelectedBillIds([]);
      setEmailCustomerBills([]);
      setEmailPreviewOpen(false);
      setEmailPreviewHtml("");
      setEmailSendCopyToAdmin(false);
      setEmailSenderType("collection");
      setEmailCustomerLocation("");
      setEmailCollectionEmail("");
      setEmailSelectedTemplateId("");
      setEmailScheduleMode(false);
      setEmailScheduledFor("");
      setEmailScheduleName("");

      setTimeout(() => refreshData(true), 200);
    } catch (error: any) {
      console.error("Failed to schedule email:", error);
      toast.error(error.response?.data?.message || "Failed to schedule email");
    } finally {
      setEmailScheduling(false);
    }
  };

  const handleAction = (action: string, customer: CustomerItem, data?: any) => {
    switch (action) {
      case "view":
        setSelectedCustomer(customer);
        setShowCustomerDetailModal(true);
        break;
      case "email":
        openEmailModal(customer);
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
        setSelectedBackdatedCustomer(customer);
        setBackdatedForm({
          applicationId: customer.applicationId || "",
          serviceStartDate: "",
          customPlanName: customer.planName || "",
          monthlyRate: customer.planPrice?.toString() || "",
          skipFirstBill: false,
          notes: "",
          includeInstallationFee: true,
        });
        setShowBackdatedModal(true);
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
        handleDisconnectCustomer(customer);
        break;
      case "reconnect":
        handleReconnectCustomer(customer);
        break;
      case "stop":
        if (customer.type === "application") {
          if (
            confirm(
              `Stop billing for ${customer.firstName} ${customer.lastName}?\n\nThis will cancel the subscription permanently.`,
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
      case "deleteBill":
        if (data?.billId && data?.invoiceNumber) {
          handleDeleteBill(data.billId, data.invoiceNumber, customer);
        }
        break;
      case "freeBill":
        if (data?.billId) {
          if (
            confirm(
              `Mark bill as FREE for ${customer.firstName} ${customer.lastName}?\n\nThis will set the bill amount to ₱0 and mark it as paid.`,
            )
          ) {
            markBillFreeMutation.mutate({
              billId: data.billId,
              paymentData: {
                notes: `Marked as free by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
              },
            });
          }
        }
        break;
      case "freeInstallation":
        if (data?.billId) {
          if (
            confirm(
              `Mark installation fee as FREE for ${customer.firstName} ${customer.lastName}?\n\nThis will set the installation fee to ₱0 and mark it as paid.`,
            )
          ) {
            markInstallationFreeMutation.mutate({
              billId: data.billId,
              paymentData: {
                notes: `Installation fee marked as free by admin for ${customer.type}: ${customer.firstName} ${customer.lastName}`,
              },
            });
          }
        }
        break;
      default:
        break;
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

  const handleConfirmProRated = (applicationId: string) => {
    if (!confirm("Confirm this pro-rated payment?")) return;
    confirmProRatedPaymentMutation.mutate({ applicationId });
  };

  const handleStartMonthly = (applicationId: string) => {
    if (!confirm("Start monthly billing for this customer?")) return;
    startMonthlyBillingMutation.mutate({ applicationId });
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
        setTimeout(() => refreshData(true), 200);
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
        setTimeout(() => refreshData(true), 200);
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

  const loadBillingFlowSettings = useCallback(async () => {
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
        setSettingsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load billing flow settings:", error);
    }
  }, []);

  const saveBillingFlowSettings = async () => {
    try {
      await updateBillingSettingsAdmin({ ...billingFlowSettings });
      toast.success("✅ Billing flow settings saved successfully!");
      setShowSettingsModal(false);
      setTimeout(() => refreshData(true), 200);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    setIsMounted(true);

    if (!settingsLoaded) {
      loadBillingFlowSettings();
    }

    const autoGenInterval = setInterval(() => {
      if (!autoGenerationRunning && isMounted && settingsLoaded) {
        handleAutoGenerateEarlyBills();
      }
    }, 300000);

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("admin_") || key.includes("cache")) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const size = new Blob([value]).size;
              if (size > 50 * 1024 * 1024) {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (e) {
      console.error("Error cleaning cache:", e);
    }

    setTimeout(() => {
      refreshData(true);
    }, 500);

    return () => {
      clearInterval(autoGenInterval);
      setIsMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters =
    !!statusFilter && statusFilter !== "all"
      ? true
      : !!buildingFilter && buildingFilter !== "all"
        ? true
        : !!monthFilter || !!dateFilter || !!searchTerm;

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBuildingFilter("all");
    setMonthFilter("");
    setDateFilter("");
  };

  // ==================== RENDER ====================
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-600">
            Manage customer billing, invoices, and payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-600">
            <span
              className={`w-2 h-2 rounded-full ${
                websocketConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            {websocketConnected ? "Live" : "Offline"}
            {lastUpdated && (
              <span className="text-gray-400 hidden sm:inline">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Reports button removed as requested */}

          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <FiSettings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isFetching || isRefreshing}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${
                isFetching || isRefreshing ? "animate-spin" : ""
              }`}
            />
            {isFetching || isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {buildingFilteredStats.totalCustomers}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {buildingFilteredStats.activeCyclesCount} active cycles
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Collectibles</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(buildingFilteredStats.collectibles)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {buildingFilteredStats.customersWithBalanceCount} with balance
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Overdue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatCurrency(buildingFilteredStats.totalOverdueAmount)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {buildingFilteredStats.overdueCustomersCount} customers
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Disconnected</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {buildingFilteredStats.disconnectedCustomersCount || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Customers with preserved bills
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                if (e.target.value) {
                  setDateFilter("");
                }
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`px-4 py-2.5 rounded-lg border transition flex items-center gap-2 text-sm font-medium ${
              showMoreFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FiFilter className="w-4 h-4" />
            {showMoreFilters ? "Less Filters" : "More Filters"}
            {showMoreFilters ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
            {hasActiveFilters && !showMoreFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>

        {showMoreFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="disconnected">Disconnected</option>
                  <option value="pending_activation">Pending Activation</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="approved_no_billing">
                    Approved (No Billing)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Building
                </label>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Buildings</option>
                  {buildingsData.map((building: Building) => (
                    <option key={building._id} value={building._id}>
                      {building.buildingName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Specific Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value) setMonthFilter("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 rounded-lg transition"
                >
                  <FiX className="w-4 h-4" /> Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && !showMoreFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {monthFilter && !dateFilter && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📅 {monthFilter}
              </span>
            )}
            {dateFilter && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📅 {formatDate(dateFilter)}
              </span>
            )}
            {statusFilter && statusFilter !== "all" && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📌 {statusFilter}
              </span>
            )}
            {buildingFilter && buildingFilter !== "all" && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                🏢{" "}
                {buildingsData.find((b: Building) => b._id === buildingFilter)
                  ?.buildingName || buildingFilter}
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                🔍 {searchTerm}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-full transition"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <BillingTable
          customers={allCustomers}
          disconnectedCustomers={disconnectedCustomers}
          billingCycles={billingCycles}
          bills={bills}
          pendingPayments={pendingPayments}
          loading={isLoading}
          refreshing={isFetching || isRefreshing}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          buildingFilter={buildingFilter}
          setBuildingFilter={setBuildingFilter}
          buildingsList={buildingsData}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          pagination={pagination}
          setPagination={setPagination}
          sortField={sortField}
          setSortField={setSortField}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          stats={stats}
          buildingFilteredStats={buildingFilteredStats}
          activeBuildingName={activeBuildingName}
          onAction={handleAction}
          onRefresh={handleRefresh}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenBackdated={() => setShowBackdatedModal(true)}
          onOpenExistingCustomers={() => {
            setShowExistingCustomersModal(true);
          }}
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
          realtimeUpdateCount={refreshCount}
          websocketConnected={websocketConnected}
          onEditBillPrice={handleEditBillPrice}
          onEditInstallationPrice={handleEditInstallationPrice}
          onDeleteBill={handleDeleteBill}
        />
      </div>

      {/* ==================== MODALS ==================== */}
      <CustomerDetailModal
        isOpen={showCustomerDetailModal}
        customer={selectedCustomer}
        onClose={() => setShowCustomerDetailModal(false)}
        onAction={handleAction}
        onMarkBillAsPaid={handleMarkBillAsPaid}
        onMarkInstallationBillAsPaid={handleMarkInstallationBillAsPaid}
        onEditBillPrice={handleEditBillPrice}
        onEditInstallationPrice={handleEditInstallationPrice}
        onDeleteBill={handleDeleteBill}
      />

      <BillingReportsWithDownload
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        customers={allCustomers}
        buildings={buildingsData}
        onMarkBillAsPaid={handleMarkBillAsPaid}
        onMarkInstallationBillAsPaid={handleMarkInstallationBillAsPaid}
      />

      <BackdatedModal
        isOpen={showBackdatedModal}
        onClose={() => setShowBackdatedModal(false)}
        customers={allCustomers}
        selectedBackdatedCustomer={selectedBackdatedCustomer}
        setSelectedBackdatedCustomer={setSelectedBackdatedCustomer}
        backdatedForm={backdatedForm}
        setBackdatedForm={setBackdatedForm}
        backdatedLoading={backdatedLoading}
        onConfirm={handleBackdatedBilling}
        installationFee={billingFlowSettings.installationFee}
      />

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && customerToDisconnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <FiWifiOff className="w-6 h-6" />
                Disconnect Customer
              </h2>
              <button
                onClick={() => {
                  setShowDisconnectModal(false);
                  setCustomerToDisconnect(null);
                  setDisconnectReason("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Important:</strong> Disconnecting will:
              </p>
              <ul className="text-xs text-amber-700 mt-2 ml-4 list-disc space-y-1">
                <li>
                  Mark the customer as <strong>disconnected</strong>
                </li>
                <li>
                  Customer <strong>stays visible</strong> in billing list
                </li>
                <li>
                  <strong>PRESERVE</strong> all bills in the database
                </li>
                <li>
                  You can <strong>reconnect</strong> anytime to restore service
                </li>
              </ul>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-600">Customer:</p>
                <p className="font-medium text-gray-900">
                  {customerToDisconnect.firstName}{" "}
                  {customerToDisconnect.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {customerToDisconnect.email}
                </p>
                {customerToDisconnect.applicationId && (
                  <p className="text-xs text-gray-400 font-mono">
                    {customerToDisconnect.applicationId}
                  </p>
                )}
              </div>

              {customerToDisconnect.unpaidBills &&
                customerToDisconnect.unpaidBills.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-600">
                      Bills preserved:{" "}
                      <span className="font-bold">
                        {customerToDisconnect.unpaidBills.length}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Total balance:{" "}
                      <span className="font-bold text-red-600">
                        ₱{customerToDisconnect.currentBalance.toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for disconnection (optional)
              </label>
              <textarea
                value={disconnectReason}
                onChange={(e) => setDisconnectReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g., Non-payment, Customer request, Violation..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisconnectModal(false);
                  setCustomerToDisconnect(null);
                  setDisconnectReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={disconnectClientMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {disconnectClientMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <FiWifiOff className="w-4 h-4" />
                    Disconnect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECONNECT CONFIRMATION MODAL */}
      {showReconnectModal && customerToReconnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-600 flex items-center gap-2">
                <FiWifi className="w-6 h-6" />
                Reconnect Customer
              </h2>
              <button
                onClick={() => {
                  setShowReconnectModal(false);
                  setCustomerToReconnect(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800">
                <strong>✅ Reconnecting will:</strong>
              </p>
              <ul className="text-xs text-green-700 mt-2 ml-4 list-disc space-y-1">
                <li>
                  Restore the customer's <strong>active</strong> status
                </li>
                <li>Resume billing cycle</li>
                <li>All preserved bills remain visible</li>
              </ul>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-600">Customer:</p>
                <p className="font-medium text-gray-900">
                  {customerToReconnect.firstName} {customerToReconnect.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {customerToReconnect.email}
                </p>
              </div>

              {customerToReconnect.disconnectedAt && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-600">
                    Disconnected since:{" "}
                    <span className="font-medium">
                      {formatDate(customerToReconnect.disconnectedAt)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReconnectModal(false);
                  setCustomerToReconnect(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReconnect}
                disabled={reconnectClientMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reconnectClientMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <FiWifi className="w-4 h-4" />
                    Reconnect
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bill Confirmation Modal */}
      {showDeleteBillConfirmModal && billToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-600">🗑️ Delete Bill</h2>
              <button
                onClick={() => {
                  setShowDeleteBillConfirmModal(false);
                  setBillToDelete(null);
                  setDeleteBillReason("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-600">Invoice Number:</p>
                <p className="font-mono font-medium text-gray-900">
                  {billToDelete.invoiceNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer:</p>
                <p className="font-medium text-gray-900">
                  {billToDelete.customer.firstName}{" "}
                  {billToDelete.customer.lastName}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteBillReason}
                onChange={(e) => setDeleteBillReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Enter reason for deleting this bill..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteBillConfirmModal(false);
                  setBillToDelete(null);
                  setDeleteBillReason("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBill}
                disabled={deleteBillMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteBillMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    Delete Bill
                  </>
                )}
              </button>
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
                              handleConfirmProRated(bill.applicationId)
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
                    {pendingInstallationBills.map((bill: any) => {
                      const billCustomer: CustomerItem = {
                        _id: bill.applicationId || bill._id,
                        firstName: bill.applicationData?.firstName || "Unknown",
                        lastName: bill.applicationData?.lastName || "",
                        email: bill.applicationData?.email || "",
                        phoneNumber: bill.applicationData?.phoneNumber || "",
                        status: "active",
                        type: "application",
                        planName: "N/A",
                        planPrice: 0,
                        currentBalance: bill.total || 0,
                        unpaidBills: [bill],
                        overdueBills: [],
                        billingCycle: bill.billingCycleId,
                        applicationId: bill.applicationId,
                        installationFee: bill.installationFee || 0,
                        installationFeePaid: bill.installationFeePaid || false,
                      };
                      return (
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
                                handleMarkInstallationBillAsPaid(
                                  bill,
                                  billCustomer,
                                )
                              }
                              className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                            >
                              Mark Paid
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                                handleStartMonthly(cycle.applicationId)
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
                    Early Bill Generation (Days)
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

      {/* ==================== EMAIL MODAL ==================== */}
      {showEmailModal && emailCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiMail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {emailScheduleMode ? "Schedule Email" : "Send Email"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    To: {emailCustomer.firstName} {emailCustomer.lastName} (
                    {emailCustomer.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailCustomer(null);
                  setEmailPreviewOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {emailCustomerLocation && emailCustomerLocation !== "other" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>📍 Location Detected:</strong>{" "}
                    {getLocationDisplay(emailCustomerLocation)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Collection Email: {emailCollectionEmail}
                  </p>
                  {emailCustomer.building?.buildingName && (
                    <p className="text-xs text-blue-600">
                      Building: {emailCustomer.building.buildingName}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load Template
                </label>
                {emailTemplatesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading templates...
                  </div>
                ) : (
                  <>
                    <select
                      value={emailSelectedTemplateId}
                      onChange={(e) =>
                        handleEmailTemplateSelect(e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {emailTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name || "Unnamed"} (
                          {template.category || "general"})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Loading a template will preserve all formatting
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📧 Send From (Choose Sender Email)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SENDER_OPTIONS.map((option) => {
                    const isSelected = emailSenderType === option.value;
                    const isCollection = option.value === "collection";
                    const disabled = isCollection && !emailCustomerLocation;

                    const colorClasses: Record<string, string> = {
                      green: isSelected
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700",
                      blue: isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700",
                      purple: isSelected
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700",
                      orange: isSelected
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700",
                    };

                    const displayEmail = isCollection
                      ? emailCustomerLocation
                        ? emailCollectionEmail
                        : "No location detected"
                      : option.email;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          !disabled && setEmailSenderType(option.value)
                        }
                        disabled={disabled}
                        className={`px-4 py-3 rounded-lg border text-sm transition-colors text-left ${
                          disabled
                            ? "opacity-50 cursor-not-allowed bg-gray-50"
                            : colorClasses[option.color]
                        }`}
                      >
                        <span className="block font-medium">
                          {option.icon} {option.label}
                        </span>
                        <span className="text-xs text-gray-500 truncate block">
                          {displayEmail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <RichTextEditor
                  value={emailRichTextContent || emailMessage}
                  onChange={(content) => {
                    setEmailRichTextContent(content);
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = content;
                    setEmailMessage(tempDiv.textContent || "");
                  }}
                  placeholder="Write your email message here..."
                  minHeight="200px"
                  maxHeight="350px"
                />
              </div>

              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  checked={emailIncludeBilling}
                  onChange={(e) => {
                    setEmailIncludeBilling(e.target.checked);
                    if (!e.target.checked) {
                      setEmailSelectedBillIds([]);
                    }
                  }}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include Billing Information
                </span>
              </label>

              {emailIncludeBilling && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Bills ({emailSelectedBillIds.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllEmailBills}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllEmailBills}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {emailLoadingBills ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : emailCustomerBills.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {emailCustomerBills.map((bill) => (
                        <label
                          key={bill._id}
                          className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                            emailSelectedBillIds.includes(bill._id)
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            checked={emailSelectedBillIds.includes(bill._id)}
                            onChange={() => toggleEmailBillSelection(bill._id)}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {bill.invoiceNumber || "N/A"}
                              </span>
                              <span className="text-sm font-bold text-red-600">
                                ₱{(bill.total || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  bill.status === "paid"
                                    ? "bg-green-100 text-green-700"
                                    : bill.status === "overdue"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {bill.status || "N/A"}
                              </span>
                              {bill.isInstallationBill && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  Installation
                                </span>
                              )}
                              {bill.isProRated && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                  Pro-rated
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Due:{" "}
                                {new Date(bill.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      No bills found for this customer.
                    </p>
                  )}

                  {emailSelectedBillIds.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Selected {emailSelectedBillIds.length} bill(s)
                      </p>
                      <p className="text-xs text-gray-500">
                        Total: ₱
                        {emailCustomerBills
                          .filter((b) => emailSelectedBillIds.includes(b._id))
                          .reduce((sum, b) => sum + (b.total || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  checked={emailSendCopyToAdmin}
                  onChange={(e) => setEmailSendCopyToAdmin(e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Send copy to admin
                </span>
              </label>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    checked={emailScheduleMode}
                    onChange={(e) => {
                      setEmailScheduleMode(e.target.checked);
                      if (!e.target.checked) {
                        setEmailScheduledFor("");
                        setEmailScheduleName("");
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    📅 Schedule for later (instead of sending now)
                  </span>
                </label>

                {emailScheduleMode && (
                  <div className="mt-3 space-y-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schedule Name (optional)
                      </label>
                      <input
                        type="text"
                        value={emailScheduleName}
                        onChange={(e) => setEmailScheduleName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={`Email to ${emailCustomer.firstName} ${emailCustomer.lastName}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date & Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={emailScheduledFor}
                        onChange={(e) => setEmailScheduledFor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {emailScheduledFor && (
                        <p className="text-xs text-gray-500 mt-1">
                          Will be sent on{" "}
                          {new Date(emailScheduledFor).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t">
                <button
                  onClick={handleEmailPreview}
                  disabled={
                    !emailSubject.trim() ||
                    !(emailMessage.trim() || emailRichTextContent.trim()) ||
                    (emailIncludeBilling && emailSelectedBillIds.length === 0)
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔍 Preview
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailCustomer(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                {emailScheduleMode ? (
                  <button
                    onClick={handleScheduleEmail}
                    disabled={
                      emailScheduling ||
                      !emailScheduledFor ||
                      !emailSubject.trim() ||
                      !(emailMessage.trim() || emailRichTextContent.trim()) ||
                      (emailIncludeBilling && emailSelectedBillIds.length === 0)
                    }
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {emailScheduling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <FiCalendar className="w-4 h-4" /> Schedule Email
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleSendEmail}
                    disabled={
                      emailSending ||
                      !emailSubject.trim() ||
                      !(emailMessage.trim() || emailRichTextContent.trim()) ||
                      (emailIncludeBilling && emailSelectedBillIds.length === 0)
                    }
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {emailSending ? (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {emailPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                📧 Email Preview
              </h3>
              <button
                onClick={() => setEmailPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            {emailPreviewLocation && emailPreviewLocation !== "unknown" && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-700">
                  📍 Location: {getLocationDisplay(emailPreviewLocation)}
                </p>
                <p className="text-xs text-blue-600">
                  {emailPreviewSenderInfo}
                </p>
              </div>
            )}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-160px)]">
              <div dangerouslySetInnerHTML={{ __html: emailPreviewHtml }} />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setEmailPreviewOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
              {emailScheduleMode ? (
                <button
                  onClick={() => {
                    setEmailPreviewOpen(false);
                    handleScheduleEmail();
                  }}
                  disabled={emailScheduling || !emailScheduledFor}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {emailScheduling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <FiCalendar className="w-4 h-4" /> Schedule
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEmailPreviewOpen(false);
                    handleSendEmail();
                  }}
                  disabled={emailSending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {emailSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiMail className="w-4 h-4" /> Send Now
                    </>
                  )}
                </button>
              )}
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
                            setSelectedBackdatedCustomer(c);
                            setBackdatedForm({
                              applicationId: c.applicationId || "",
                              serviceStartDate: "",
                              customPlanName: c.planName || "",
                              monthlyRate: c.planPrice?.toString() || "",
                              skipFirstBill: false,
                              notes: "",
                              includeInstallationFee: true,
                            });
                            setShowBackdatedModal(true);
                            setShowExistingCustomersModal(false);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Start Billing
                        </button>
                      </td>
                    </tr>
                  ))}

                  {customersWithoutAccounts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500 text-sm"
                      >
                        No customers without billing found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Auto-detecting new customers every 1 minute
              </div>
              <button
                onClick={() => {
                  checkForNewCustomersHandler();
                  toast.success("🔄 Checking for new customers...");
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                Check Now
              </button>
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
