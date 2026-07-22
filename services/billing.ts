// frontend/services/billing.ts - ULTRA FAST VERSION
import api from "./api";

// ==================== TYPES ====================
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
  paymentHistory: Array<{ billingId: string; amount: number; paidAt: string }>;
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
  billingPeriod: { start: string; end: string };
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

// ==================== ULTRA-FAST CACHE ====================
const BILLING_CACHE = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const MAX_CACHE_ITEMS = 20;
let cacheKeys: string[] = [];

// LRU cache manager
const cacheManager = {
  get<T>(key: string): T | null {
    const cached = BILLING_CACHE.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      BILLING_CACHE.delete(key);
      return null;
    }
    return cached.data as T;
  },

  set<T>(key: string, data: T): void {
    // LRU: Remove oldest if cache is full
    if (BILLING_CACHE.size >= MAX_CACHE_ITEMS) {
      const firstKey = BILLING_CACHE.keys().next().value;
      if (firstKey) BILLING_CACHE.delete(firstKey);
    }
    BILLING_CACHE.set(key, { data, timestamp: Date.now() });
  },

  clear(): void {
    BILLING_CACHE.clear();
  },

  remove(key: string): void {
    BILLING_CACHE.delete(key);
  },
};

// ==================== CACHE HELPERS ====================
const CACHE_KEYS = {
  BILLING_CYCLES: "billing_cycles",
  BILLS: "bills",
  SETTINGS: "billing_settings",
  PENDING_PRO_RATED: "pending_pro_rated",
  PENDING_INSTALLATION: "pending_installation",
  PENDING_ACTIVATIONS: "pending_activations",
};

function getCacheKey(prefix: string, params?: any): string {
  return `${prefix}_${params ? JSON.stringify(params) : ""}`;
}

// ==================== API FUNCTIONS ====================

// ADMIN BILLING - GET ALL CYCLES
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
  const cacheKey = getCacheKey(CACHE_KEYS.BILLING_CYCLES, {
    ...params,
    forceRefresh: false,
  });

  if (!params?.forceRefresh) {
    const cached = cacheManager.get<{
      data: BillingCycle[];
      totalPages: number;
      currentPage: number;
      total: number;
    }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/cycles", {
      params: { ...params, limit: params?.limit || 20 },
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

    cacheManager.set(cacheKey, returnData);
    return returnData;
  } catch (error) {
    console.error("Error fetching billing cycles:", error);
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

// ADMIN BILLING - GET ALL BILLS
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
  const cacheKey = getCacheKey(CACHE_KEYS.BILLS, {
    ...params,
    forceRefresh: false,
  });

  if (!params?.forceRefresh) {
    const cached = cacheManager.get<{
      data: Bill[];
      stats: any[];
      totalPages: number;
      currentPage: number;
      total: number;
    }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/all-bills", {
      params: { ...params, limit: params?.limit || 20 },
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

    cacheManager.set(cacheKey, returnData);
    return returnData;
  } catch (error) {
    console.error("Error fetching all bills:", error);
    return { data: [], stats: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

// GET PENDING PRO-RATED BILLS
export const getPendingProRatedBills = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_PRO_RATED;

  if (!forceRefresh) {
    const cached = cacheManager.get<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-pro-rated");
    const result = { data: response.data?.data || [] };
    cacheManager.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

// GET PENDING INSTALLATION BILLS
export const getPendingInstallationBills = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_INSTALLATION;

  if (!forceRefresh) {
    const cached = cacheManager.get<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-installation");
    const result = { data: response.data?.data || [] };
    cacheManager.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending installation bills:", error);
    return { data: [] };
  }
};

// GET PENDING ACTIVATIONS
export const getPendingActivations = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_ACTIVATIONS;

  if (!forceRefresh) {
    const cached = cacheManager.get<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-activations");
    const result = { data: response.data?.data || [] };
    cacheManager.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { data: [] };
  }
};

// GET BILLING SETTINGS ADMIN
export const getBillingSettingsAdmin = async (
  forceRefresh?: boolean,
): Promise<{ data: BillingSettings }> => {
  const cacheKey = CACHE_KEYS.SETTINGS;

  if (!forceRefresh) {
    const cached = cacheManager.get<{ data: BillingSettings }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/settings/admin");
    const result = response.data;
    cacheManager.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching admin billing settings:", error);
    throw error;
  }
};

// UPDATE BILLING SETTINGS ADMIN
export const updateBillingSettingsAdmin = async (
  data: Partial<BillingSettings>,
): Promise<any> => {
  try {
    const response = await api.put("/billing/settings/admin", data);
    // Clear all caches
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error updating admin billing settings:", error);
    throw error;
  }
};

// ==================== BILLING ACTIONS ====================

// START BILLING FOR APPLICATION
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error starting billing for application:", error);
    throw error;
  }
};

// START BILLING
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error starting billing:", error);
    throw error;
  }
};

// STOP BILLING
export const stopBilling = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/stop", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error stopping billing:", error);
    throw error;
  }
};

// PAUSE BILLING
export const pauseBilling = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
  pauseUntilDate?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/pause", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error pausing billing:", error);
    throw error;
  }
};

// RESUME BILLING
export const resumeBilling = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/resume", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error resuming billing:", error);
    throw error;
  }
};

// DISCONNECT CLIENT
export const disconnectClient = async (data: {
  userId?: string;
  applicationId?: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/disconnect", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error disconnecting client:", error);
    throw error;
  }
};

// RECONNECT CLIENT
export const reconnectClient = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/reconnect", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error reconnecting client:", error);
    throw error;
  }
};

// DELETE BILLING CYCLE
export const deleteBillingCycle = async (data: {
  billingCycleId: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.delete("/billing/delete-cycle", { data });
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error deleting billing cycle:", error);
    throw error;
  }
};

// MARK BILL AS PAID
export const markBillAsPaid = async (
  billId: string,
  paymentData: {
    referenceNumber?: string;
    notes?: string;
  },
): Promise<any> => {
  try {
    const response = await api.put(`/billing/mark-paid/${billId}`, paymentData);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error marking bill as paid:", error);
    throw error;
  }
};

// MARK INSTALLATION BILL AS PAID
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error marking installation bill as paid:", error);
    throw error;
  }
};

// CONFIRM PRO-RATED PAYMENT
export const confirmProRatedPayment = async (data: {
  userId?: string;
  applicationId?: string;
  paymentDetails?: any;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/confirm-pro-rated", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error confirming pro-rated payment:", error);
    throw error;
  }
};

// START MONTHLY BILLING
export const startMonthlyBilling = async (data: {
  userId?: string;
  applicationId?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/start-monthly", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error starting monthly billing:", error);
    throw error;
  }
};

// INITIALIZE BACKDATED BILLING
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error initializing backdated billing:", error);
    throw error;
  }
};

// RECOVER MISSING BILLS
export const recoverMissingBills = async (data: {
  applicationId: string;
  startFromDate?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/recover-missing-bills", data);
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error recovering missing bills:", error);
    throw error;
  }
};

// GET UNPAID BILLS REPORT
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

// CLEAR ALL CACHES
export const clearBillingCache = (): void => {
  cacheManager.clear();
};

// ==================== USER BILLING FUNCTIONS ====================

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

export const getBillingSettings = async (
  forceRefresh?: boolean,
): Promise<{
  data: BillingSettings;
}> => {
  try {
    if (!forceRefresh) {
      const cached = cacheManager.get<{ data: BillingSettings }>(
        CACHE_KEYS.SETTINGS,
      );
      if (cached) return cached;
    }
    const response = await api.get("/billing/settings");
    const result = response.data;
    cacheManager.set(CACHE_KEYS.SETTINGS, result);
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error updating billing settings:", error);
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
    cacheManager.clear();
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
    cacheManager.clear();
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
    cacheManager.clear();
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
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error auto-generating monthly bills:", error);
    throw error;
  }
};

export const autoSendReminders = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-reminders");
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error auto-sending reminders:", error);
    throw error;
  }
};

export const autoSuspendOverdue = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-suspend");
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error auto-suspending overdue:", error);
    throw error;
  }
};
