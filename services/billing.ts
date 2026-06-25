// frontend/services/billing.ts - OPTIMIZED VERSION
import api from "./api";

export interface BillingCycle {
  _id: string;
  userId: any;
  applicationId?: any;
  planId: any;
  billingStartDate: string;
  billingEndDate: string;
  nextBillingDate: string;
  status:
    | "active"
    | "paused"
    | "completed"
    | "cancelled"
    | "pending_activation";
  monthlyRate: number;
  currentProRatedAmount: number;
  proRatedPaid: boolean;
  proRatedPaidAt?: string;
  freeDays: number;
  actualBillableDays: number;
  manualBillStart: boolean;
  manuallyStartedAt?: string;
  isAfterCutoff: boolean;
  cutoffDayUsed: number;
  paymentHistory: Array<{
    billingId: string;
    amount: number;
    paidAt: string;
  }>;
  serviceSuspendedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  pauseReason?: string;
  pauseUntil?: string;
  disconnectReason?: string;
  pendingPlanChange?: {
    newPlanId: any;
    requestedAt: string;
    effectiveDate: string;
    status: "pending" | "approved" | "rejected";
  };
  installationFee: number;
  installationFeePaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSettings {
  _id: string;
  reminderDays: number[];
  dueDateDaysAfterPeriod: number;
  gracePeriodDays: number;
  autoGenerateBills: boolean;
  autoSendReminders: boolean;
  autoSuspendOnNonPayment: boolean;
  billingCycleDay: number;
  freeDays: number;
  proRatedDueDay: number;
  monthlyDueDay: number;
  billingCutoffDay: number;
  enableAutoBilling: boolean;
  sendInvoiceOnInstall: boolean;
  requireAdminActivation: boolean;
  installationFee: number;
  installationFeeDueDays: number;
}

export interface Bill {
  _id: string;
  invoiceNumber: string;
  userId: any;
  applicationId?: any;
  billingPeriod: {
    start: string;
    end: string;
  };
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status:
    | "draft"
    | "sent"
    | "paid"
    | "overdue"
    | "cancelled"
    | "pending_confirmation";
  paymentId: any;
  notes: string;
  isProRated: boolean;
  proRatedDays: number;
  billingCycleId: string;
  applicationData?: any;
  installationFee: number;
  installationFeePaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  userId: any;
  applicationId?: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  referenceNumber: string;
  billingId: string;
  paymentDetails: {
    gateway: string;
    gatewayResponse: any;
    notes?: string;
  };
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

const CACHE_KEYS = {
  BILLING_CYCLES: "billing_cycles_cache",
  BILLS: "bills_cache",
  SETTINGS: "billing_settings_cache",
  USERS: "users_cache",
  PAYMENTS: "payments_cache",
  BILLING_STATS: "billing_stats_cache",
};

const CACHE_DURATION = 3 * 60 * 1000; // Reduced to 3 minutes

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// LRU Cache for localStorage
let cacheKeys: string[] = [];
const MAX_CACHE_ITEMS = 15;

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const item: CacheItem<T> = JSON.parse(cached);
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      // Update cache keys
      try {
        const storedKeys = localStorage.getItem("billing_cache_keys");
        if (storedKeys) {
          const keys = JSON.parse(storedKeys);
          const filtered = keys.filter((k: string) => k !== key);
          localStorage.setItem("billing_cache_keys", JSON.stringify(filtered));
        }
      } catch (e) {}
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    // LRU: Remove oldest if cache is full
    try {
      const storedKeys = localStorage.getItem("billing_cache_keys");
      cacheKeys = storedKeys ? JSON.parse(storedKeys) : [];

      if (cacheKeys.length >= MAX_CACHE_ITEMS && !cacheKeys.includes(key)) {
        const oldestKey = cacheKeys.shift();
        if (oldestKey) localStorage.removeItem(oldestKey);
      }

      if (!cacheKeys.includes(key)) {
        cacheKeys.push(key);
        localStorage.setItem("billing_cache_keys", JSON.stringify(cacheKeys));
      }
    } catch (e) {
      // Ignore cache key errors
    }

    const item: CacheItem<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error("Failed to cache data:", error);
  }
}

export function clearBillingCache(): void {
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  try {
    localStorage.removeItem("billing_cache_keys");
  } catch (e) {}
}

// ==================== BACKDATED BILLING ====================
export const initializeBackdatedBilling = async (data: {
  applicationId: string;
  serviceStartDate: string;
  customPlanName?: string;
  monthlyRate?: number;
  skipFirstBill?: boolean;
  notes?: string;
  includeInstallationFee?: boolean;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/initialize-backdated", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error initializing backdated billing:", error);
    throw error;
  }
};

// ==================== APPLICATION BILLING ====================
export const startBillingForApplication = async (
  applicationId: string,
  data?: {
    installationDate?: string;
    notes?: string;
    includeInstallationFee?: boolean;
  },
): Promise<any> => {
  try {
    const response = await api.post("/billing/start", {
      applicationId,
      startDate: data?.installationDate,
      notes: data?.notes,
      includeInstallationFee: data?.includeInstallationFee,
    });
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error starting billing for application:", error);
    throw error;
  }
};

export const getApplicationBillingStatus = async (
  applicationId: string,
): Promise<any> => {
  try {
    const response = await api.get(
      `/billing/application/${applicationId}/status`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application billing status:", error);
    return { data: null };
  }
};

export const getApplicationCurrentBilling = async (
  applicationId: string,
): Promise<any> => {
  try {
    const response = await api.get(
      `/billing/application/${applicationId}/current`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application current billing:", error);
    return { data: null };
  }
};

export const getApplicationBillingHistory = async (
  applicationId: string,
  params?: { page?: number; limit?: number },
): Promise<any> => {
  try {
    const response = await api.get(
      `/billing/application/${applicationId}/history`,
      { params },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application billing history:", error);
    return { data: { billingHistory: [], total: 0, page: 1, pages: 0 } };
  }
};

// ==================== USER BILLING ====================
export const getUserBillingCycle = async (): Promise<{
  billingCycle: BillingCycle | null;
  upcomingBills: Bill[];
  hasOverdue: boolean;
  overdueCount: number;
  overdueAmount: number;
} | null> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching user billing cycle:", error);
    return null;
  }
};

export const getCurrentBill = async (): Promise<Bill | null> => {
  try {
    const response = await api.get("/billing/user/current");
    const data = response.data.data;
    return data?.currentBill || null;
  } catch (error) {
    console.error("Error fetching current bill:", error);
    return null;
  }
};

export const getBillingHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{
  data: Bill[];
  totalPages: number;
  currentPage: number;
  total: number;
}> => {
  try {
    const response = await api.get("/billing/user/history", { params });
    const result = response.data;
    return {
      data: result.data?.billingHistory || [],
      totalPages: result.data?.pages || 0,
      currentPage: result.data?.page || 1,
      total: result.data?.total || 0,
    };
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getUserBillingSummary = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return {
      currentBill: null,
      lastPayment: null,
      paymentHistory: [],
      billingHistory: [],
    };
  }
};

// ==================== ADMIN BILLING ====================
export const getAllBillingCycles = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}): Promise<{
  data: BillingCycle[];
  totalPages: number;
  currentPage: number;
  total: number;
}> => {
  try {
    const cacheKey = `${CACHE_KEYS.BILLING_CYCLES}_${params?.page || 1}_${params?.limit || 20}`;

    if (!params?.forceRefresh) {
      const cached = getCachedData<{
        data: BillingCycle[];
        totalPages: number;
        currentPage: number;
        total: number;
      }>(cacheKey);
      if (cached) return cached;
    }

    const response = await api.get("/billing/cycles", {
      params: {
        ...params,
        limit: params?.limit || 20,
      },
    });
    const result = response.data;
    const data = result.data || [];
    const total = result.total || data.length;
    const currentPage = params?.page || 1;
    const limit = params?.limit || 20;
    const totalPages = Math.ceil(total / limit);

    const returnData = {
      data: Array.isArray(data) ? data : [],
      totalPages,
      currentPage,
      total,
    };
    setCachedData(cacheKey, returnData);
    return returnData;
  } catch (error) {
    console.error("Error fetching billing cycles:", error);
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  applicationId?: string;
  forceRefresh?: boolean;
}): Promise<{
  data: Bill[];
  stats: any[];
  totalPages: number;
  currentPage: number;
  total: number;
}> => {
  try {
    const cacheKey = `${CACHE_KEYS.BILLS}_${params?.page || 1}_${params?.limit || 20}_${params?.status || "all"}`;

    if (!params?.forceRefresh) {
      const cached = getCachedData<{
        data: Bill[];
        stats: any[];
        totalPages: number;
        currentPage: number;
        total: number;
      }>(cacheKey);
      if (cached) return cached;
    }

    const response = await api.get("/billing/all-bills", {
      params: {
        ...params,
        limit: params?.limit || 20,
      },
    });
    const result = response.data;
    const data = result.data || [];
    const total = result.total || data.length;
    const currentPage = params?.page || 1;
    const limit = params?.limit || 20;
    const totalPages = Math.ceil(total / limit);

    const returnData = {
      data: Array.isArray(data) ? data : [],
      stats: result.stats || [],
      totalPages,
      currentPage,
      total,
    };
    setCachedData(cacheKey, returnData);
    return returnData;
  } catch (error) {
    console.error("Error fetching all bills:", error);
    return { data: [], stats: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const startBilling = async (data: {
  userId?: string;
  applicationId?: string;
  startDate?: string;
  customAmount?: number;
  notes?: string;
  includeInstallationFee?: boolean;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/start", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error starting billing:", error);
    throw error;
  }
};

export const stopBilling = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/stop", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error stopping billing:", error);
    throw error;
  }
};

export const pauseBilling = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
  pauseUntilDate?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/pause", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error pausing billing:", error);
    throw error;
  }
};

export const resumeBilling = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/resume", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error resuming billing:", error);
    throw error;
  }
};

export const disconnectClient = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/disconnect", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error disconnecting client:", error);
    throw error;
  }
};

export const reconnectClient = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/reconnect", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error reconnecting client:", error);
    throw error;
  }
};

export const deleteBillingCycle = async (data: {
  billingCycleId: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.delete("/billing/delete-cycle", { data });
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error deleting billing cycle:", error);
    throw error;
  }
};

export const getBillingSettings = async (
  forceRefresh?: boolean,
): Promise<{
  data: BillingSettings;
}> => {
  try {
    if (!forceRefresh) {
      const cached = getCachedData<{ data: BillingSettings }>(
        CACHE_KEYS.SETTINGS,
      );
      if (cached) return cached;
    }
    const response = await api.get("/billing/settings");
    const result = response.data;
    setCachedData(CACHE_KEYS.SETTINGS, result);
    return result;
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    throw error;
  }
};

export const updateBillingSettings = async (
  data: Partial<BillingSettings>,
): Promise<any> => {
  try {
    const response = await api.put("/billing/settings", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error updating billing settings:", error);
    throw error;
  }
};

export const getBillingSettingsAdmin = async (): Promise<{
  data: BillingSettings;
}> => {
  try {
    const response = await api.get("/billing/settings/admin");
    return response.data;
  } catch (error) {
    console.error("Error fetching admin billing settings:", error);
    throw error;
  }
};

export const updateBillingSettingsAdmin = async (
  data: Partial<BillingSettings>,
): Promise<any> => {
  try {
    const response = await api.put("/billing/settings/admin", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error updating admin billing settings:", error);
    throw error;
  }
};

export const markBillAsPaid = async (
  billId: string,
  paymentData: {
    referenceNumber?: string;
    notes?: string;
  },
): Promise<any> => {
  try {
    const response = await api.put(`/billing/mark-paid/${billId}`, paymentData);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error marking bill as paid:", error);
    throw error;
  }
};

export const markInstallationBillAsPaid = async (
  billId: string,
  paymentData: {
    referenceNumber?: string;
    notes?: string;
  },
): Promise<any> => {
  try {
    const response = await api.put(
      `/billing/mark-installation-paid/${billId}`,
      paymentData,
    );
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error marking installation bill as paid:", error);
    throw error;
  }
};

export const getPendingProRatedBills = async (): Promise<{
  data: any[];
}> => {
  try {
    const response = await api.get("/billing/pending-pro-rated");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

export const getPendingInstallationBills = async (): Promise<{
  data: any[];
}> => {
  try {
    const response = await api.get("/billing/pending-installation");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending installation bills:", error);
    return { data: [] };
  }
};

export const getPendingActivations = async (): Promise<{
  data: any[];
}> => {
  try {
    const response = await api.get("/billing/pending-activations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { data: [] };
  }
};

export const confirmProRatedPayment = async (data: {
  userId?: string;
  applicationId?: string;
  paymentDetails?: any;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/confirm-pro-rated", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error confirming pro-rated payment:", error);
    throw error;
  }
};

export const startMonthlyBilling = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/start-monthly", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error starting monthly billing:", error);
    throw error;
  }
};

export const getUserCurrentBilling = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data;
  } catch (error) {
    console.error("Error fetching user current billing:", error);
    return { data: null };
  }
};

export const getUserBillingHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await api.get("/billing/user/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching user billing history:", error);
    return { data: { billingHistory: [], total: 0, page: 1, pages: 0 } };
  }
};

export const submitProRatedPayment = async (data: {
  billId: string;
  referenceNumber: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-pro-rated",
      data,
    );
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting pro-rated payment:", error);
    throw error;
  }
};

export const submitMonthlyPayment = async (data: {
  billId: string;
  referenceNumber: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-monthly",
      data,
    );
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting monthly payment:", error);
    throw error;
  }
};

export const submitInstallationPayment = async (data: {
  billId: string;
  referenceNumber: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-installation",
      data,
    );
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting installation payment:", error);
    throw error;
  }
};

export const getBillingSummaryAdmin = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching billing summary admin:", error);
    return { data: {} };
  }
};

export const autoGenerateMonthlyBills = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-generate");
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error auto-generating monthly bills:", error);
    throw error;
  }
};

export const autoSendReminders = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-reminders");
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error auto-sending reminders:", error);
    throw error;
  }
};

export const autoSuspendOverdue = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-suspend");
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error auto-suspending overdue:", error);
    throw error;
  }
};

export const recoverMissingBills = async (data: {
  applicationId: string;
  startFromDate?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/recover-missing-bills", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error recovering missing bills:", error);
    throw error;
  }
};

export const getUnpaidBillsReport = async (params?: {
  applicationId?: string;
  includePaid?: boolean;
}): Promise<any> => {
  try {
    const response = await api.get("/billing/unpaid-bills-report", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching unpaid bills report:", error);
    return { data: { bills: [], summary: {} } };
  }
};
