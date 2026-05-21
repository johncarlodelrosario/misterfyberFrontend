// services/billing.ts - FIXED VERSION (no cache errors)
import api from "./api";

export interface BillingCycle {
  _id: string;
  userId: any;
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
  installationDay: number;
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
}

export interface Bill {
  _id: string;
  invoiceNumber: string;
  userId: any;
  billingCycleId: string;
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
  includesProRatedAmount: boolean;
  proRatedAmountIncluded: number;
  reminder7DaySent: boolean;
  reminder3DaySent: boolean;
  reminder1DaySent: boolean;
  reminderDueDateSent: boolean;
  suspensionNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

const CACHE_KEYS = {
  BILLING_CYCLES: "misterfyber_billing_cycles",
  BILLS: "misterfyber_bills",
  SETTINGS: "misterfyber_billing_settings",
  BILLING_STATS: "misterfyber_billing_stats",
};

const CACHE_DURATION = 5 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const item: CacheItem<T> = JSON.parse(cached);
    if (Date.now() - item.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch (error) {
    console.error("Failed to get cached data:", error);
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const item: CacheItem<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error("Failed to cache data:", error);
  }
}

export function clearBillingCache(): void {
  Object.values(CACHE_KEYS).forEach((key) => localStorage.removeItem(key));
}

// ==================== USER BILLING FUNCTIONS ====================

export const getUserCurrentBilling = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data;
  } catch (error) {
    console.error("Error fetching user current billing:", error);
    return { success: true, data: null };
  }
};

export const getUserBillingHistory = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: {
    billingHistory: Bill[];
    total: number;
    page: number;
    pages: number;
  };
}> => {
  try {
    const response = await api.get("/billing/user/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return {
      success: false,
      data: { billingHistory: [], total: 0, page: 1, pages: 0 },
    };
  }
};

// ==================== ADMIN BILLING FUNCTIONS ====================

export const getAllBillingCycles = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}): Promise<{
  success: boolean;
  data: BillingCycle[];
}> => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData<any>(CACHE_KEYS.BILLING_CYCLES);
      if (cached && cached.success !== undefined) {
        return cached;
      }
    }

    const response = await api.get("/billing/cycles", { params });
    const result = response.data;
    setCachedData(CACHE_KEYS.BILLING_CYCLES, result);
    return result;
  } catch (error) {
    console.error("Error fetching billing cycles:", error);
    return { success: false, data: [] };
  }
};

export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  forceRefresh?: boolean;
}): Promise<{
  success: boolean;
  data: Bill[];
}> => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData<any>(CACHE_KEYS.BILLS);
      if (cached && cached.success !== undefined) {
        return cached;
      }
    }

    const response = await api.get("/billing/all-bills", { params });
    const result = response.data;
    setCachedData(CACHE_KEYS.BILLS, result);
    return result;
  } catch (error) {
    console.error("Error fetching all bills:", error);
    return { success: false, data: [] };
  }
};

export const getBillingSummaryAdmin = async (
  forceRefresh?: boolean,
): Promise<{
  success: boolean;
  data: {
    activeSubscriptions: number;
    pausedSubscriptions: number;
    pendingProRated: number;
    pendingActivations: number;
    overdueAccounts: number;
    totalOutstanding: number;
    monthlyRevenue: number;
    unpaidProRated: number;
  };
}> => {
  try {
    if (!forceRefresh) {
      const cached = getCachedData<any>(CACHE_KEYS.BILLING_STATS);
      if (cached && cached.success !== undefined) {
        return cached;
      }
    }

    const response = await api.get("/billing/summary");
    const result = response.data;
    setCachedData(CACHE_KEYS.BILLING_STATS, result);
    return result;
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return {
      success: false,
      data: {
        activeSubscriptions: 0,
        pausedSubscriptions: 0,
        pendingProRated: 0,
        pendingActivations: 0,
        overdueAccounts: 0,
        totalOutstanding: 0,
        monthlyRevenue: 0,
        unpaidProRated: 0,
      },
    };
  }
};

export const startBilling = async (data: {
  userId: string;
  startDate?: string;
  customProRatedAmount?: number;
  notes?: string;
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
  userId: string;
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
  userId: string;
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

export const resumeBilling = async (data: { userId: string }): Promise<any> => {
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
  userId: string;
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
  userId: string;
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

export const getBillingSettings = async (
  forceRefresh?: boolean,
): Promise<{
  success: boolean;
  data: BillingSettings;
}> => {
  try {
    if (!forceRefresh) {
      const cached = getCachedData<any>(CACHE_KEYS.SETTINGS);
      if (cached && cached.success !== undefined) {
        return cached;
      }
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
  success: boolean;
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
  data: {
    referenceNumber?: string;
    notes?: string;
  },
): Promise<any> => {
  try {
    const response = await api.put(`/billing/mark-paid/${billId}`, data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error marking bill as paid:", error);
    throw error;
  }
};

export const confirmProRatedPayment = async (data: {
  billId: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.put(
      `/billing/confirm-pro-rated/${data.billId}`,
      data,
    );
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error confirming pro-rated payment:", error);
    throw error;
  }
};

export const getPendingProRatedBills = async (): Promise<{
  success: boolean;
  data: Bill[];
}> => {
  try {
    const response = await api.get("/billing/pending-pro-rated");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { success: false, data: [] };
  }
};

export const getPendingActivations = async (): Promise<{
  success: boolean;
  data: BillingCycle[];
}> => {
  try {
    const response = await api.get("/billing/pending-activations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { success: false, data: [] };
  }
};

// User payment submission
export const submitProRatedPayment = async (data: {
  billId: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/user/submit-pro-rated", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting pro-rated payment:", error);
    throw error;
  }
};

export const submitMonthlyPayment = async (data: {
  billId: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/user/submit-monthly", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting monthly payment:", error);
    throw error;
  }
};

// Auto cron jobs
export const autoGenerateMonthlyBills = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-generate");
    return response.data;
  } catch (error) {
    console.error("Error auto-generating bills:", error);
    throw error;
  }
};

export const autoSendReminders = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-reminders");
    return response.data;
  } catch (error) {
    console.error("Error auto-sending reminders:", error);
    throw error;
  }
};

export const autoSuspendOverdue = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-suspend");
    return response.data;
  } catch (error) {
    console.error("Error auto-suspending overdue:", error);
    throw error;
  }
};
