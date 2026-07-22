// frontend/services/billing.ts - ULTRA FAST WITH PARALLEL LOADING
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

// ==================== MEMORY CACHE ====================
const BILLING_CACHE = new Map();
const CACHE_TTL = 30000; // 30 seconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCached<T>(key: string): T | null {
  const entry = BILLING_CACHE.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    BILLING_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  BILLING_CACHE.set(key, { data, timestamp: Date.now() });
}

export function clearBillingCache(): void {
  BILLING_CACHE.clear();
}

// ==================== CACHE KEYS ====================
const CACHE_KEYS = {
  BILLING_CYCLES: "billing_cycles",
  BILLS: "bills",
  USERS: "users",
  APPLICATIONS: "applications",
  PENDING_PAYMENTS: "pending_payments",
  CUSTOMERS_WITHOUT_ACCOUNTS: "customers_without_accounts",
  PENDING_INSTALLATION: "pending_installation",
  PENDING_PRO_RATED: "pending_pro_rated",
  PENDING_ACTIVATIONS: "pending_activations",
  SETTINGS: "billing_settings",
};

// ==================== PARALLEL DATA LOADER ====================
export interface AllBillingData {
  cycles: BillingCycle[];
  bills: Bill[];
  users: any[];
  applications: any[];
  pendingPayments: any[];
  customersWithoutAccounts: any[];
  pendingInstallation: any[];
  pendingProRated: any[];
  pendingActivations: any[];
  settings: BillingSettings | null;
}

export async function loadAllBillingData(
  forceRefresh = false,
): Promise<AllBillingData> {
  const cacheKey = "all_billing_data";

  if (!forceRefresh) {
    const cached = getCached<AllBillingData>(cacheKey);
    if (cached) {
      console.log("📦 Using cached billing data");
      return cached;
    }
  }

  console.log("🔄 Loading all billing data in parallel...");
  const startTime = Date.now();

  try {
    const [
      cyclesPromise,
      billsPromise,
      usersPromise,
      applicationsPromise,
      pendingPaymentsPromise,
      customersWithoutAccountsPromise,
      pendingInstallationPromise,
      pendingProRatedPromise,
      pendingActivationsPromise,
      settingsPromise,
    ] = await Promise.allSettled([
      api.get("/billing/cycles", { params: { limit: 1000 } }),
      api.get("/billing/all-bills", { params: { limit: 1000 } }),
      api.get("/admin/users", { params: { limit: 1000 } }),
      api.get("/admin/applications", { params: { limit: 1000 } }),
      api.get("/payments/pending"),
      api.get("/admin/customers-without-accounts"),
      api.get("/billing/pending-installation"),
      api.get("/billing/pending-pro-rated"),
      api.get("/billing/pending-activations"),
      api.get("/billing/settings/admin"),
    ]);

    const cycles =
      cyclesPromise.status === "fulfilled"
        ? cyclesPromise.value.data?.data || []
        : [];
    const bills =
      billsPromise.status === "fulfilled"
        ? billsPromise.value.data?.data || []
        : [];
    const users =
      usersPromise.status === "fulfilled"
        ? usersPromise.value.data?.data || []
        : [];
    const applications =
      applicationsPromise.status === "fulfilled"
        ? applicationsPromise.value.data?.data || []
        : [];
    const pendingPayments =
      pendingPaymentsPromise.status === "fulfilled"
        ? pendingPaymentsPromise.value.data?.data || []
        : [];
    const customersWithoutAccounts =
      customersWithoutAccountsPromise.status === "fulfilled"
        ? customersWithoutAccountsPromise.value.data?.data || []
        : [];
    const pendingInstallation =
      pendingInstallationPromise.status === "fulfilled"
        ? pendingInstallationPromise.value.data?.data || []
        : [];
    const pendingProRated =
      pendingProRatedPromise.status === "fulfilled"
        ? pendingProRatedPromise.value.data?.data || []
        : [];
    const pendingActivations =
      pendingActivationsPromise.status === "fulfilled"
        ? pendingActivationsPromise.value.data?.data || []
        : [];
    const settings =
      settingsPromise.status === "fulfilled"
        ? settingsPromise.value.data?.data || null
        : null;

    const result: AllBillingData = {
      cycles,
      bills,
      users,
      applications,
      pendingPayments,
      customersWithoutAccounts,
      pendingInstallation,
      pendingProRated,
      pendingActivations,
      settings,
    };

    setCache(cacheKey, result);
    const elapsed = Date.now() - startTime;
    console.log(`✅ All billing data loaded in ${elapsed}ms`);

    return result;
  } catch (error) {
    console.error("❌ Failed to load billing data:", error);
    return {
      cycles: [],
      bills: [],
      users: [],
      applications: [],
      pendingPayments: [],
      customersWithoutAccounts: [],
      pendingInstallation: [],
      pendingProRated: [],
      pendingActivations: [],
      settings: null,
    };
  }
}

// ==================== INDIVIDUAL API FUNCTIONS ====================

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
  const cacheKey = CACHE_KEYS.BILLING_CYCLES;

  if (!params?.forceRefresh) {
    const cached = getCached<{
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
    setCache(cacheKey, returnData);
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
  const cacheKey = CACHE_KEYS.BILLS;

  if (!params?.forceRefresh) {
    const cached = getCached<{
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
    setCache(cacheKey, returnData);
    return returnData;
  } catch (error) {
    console.error("Error fetching all bills:", error);
    return { data: [], stats: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getAllUsers = async (params?: {
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.USERS;

  if (!params?.forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/admin/users", {
      params: { limit: params?.limit || 1000 },
    });
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching users:", error);
    return { data: [] };
  }
};

export const getAllApplications = async (params?: {
  limit?: number;
  forceRefresh?: boolean;
}): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.APPLICATIONS;

  if (!params?.forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/admin/applications", {
      params: { limit: params?.limit || 1000 },
    });
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching applications:", error);
    return { data: [] };
  }
};

export const getPendingPayments = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_PAYMENTS;

  if (!forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/payments/pending");
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return { data: [] };
  }
};

export const getCustomersWithoutAccounts = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.CUSTOMERS_WITHOUT_ACCOUNTS;

  if (!forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/admin/customers-without-accounts");
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching customers without accounts:", error);
    return { data: [] };
  }
};

export const getPendingProRatedBills = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_PRO_RATED;

  if (!forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-pro-rated");
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

export const getPendingInstallationBills = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_INSTALLATION;

  if (!forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-installation");
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending installation bills:", error);
    return { data: [] };
  }
};

export const getPendingActivations = async (
  forceRefresh?: boolean,
): Promise<{ data: any[] }> => {
  const cacheKey = CACHE_KEYS.PENDING_ACTIVATIONS;

  if (!forceRefresh) {
    const cached = getCached<{ data: any[] }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/pending-activations");
    const result = { data: response.data?.data || [] };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { data: [] };
  }
};

export const getBillingSettingsAdmin = async (
  forceRefresh?: boolean,
): Promise<{ data: BillingSettings }> => {
  const cacheKey = CACHE_KEYS.SETTINGS;

  if (!forceRefresh) {
    const cached = getCached<{ data: BillingSettings }>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/billing/settings/admin");
    const result = response.data;
    setCache(cacheKey, result);
    return result;
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

// ==================== BILLING ACTIONS ====================

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
      ...data,
    });
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error starting billing for application:", error);
    throw error;
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

export const markBillAsPaid = async (
  billId: string,
  paymentData: { referenceNumber?: string; notes?: string },
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
  paymentData: { referenceNumber?: string; notes?: string },
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

export const createManualCustomer = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/admin/create-manual-customer", data);
    clearBillingCache();
    return response.data;
  } catch (error) {
    console.error("Error creating manual customer:", error);
    throw error;
  }
};

// User billing functions
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
): Promise<{ data: BillingSettings }> => {
  try {
    if (!forceRefresh) {
      const cached = getCached<{ data: BillingSettings }>(CACHE_KEYS.SETTINGS);
      if (cached) return cached;
    }
    const response = await api.get("/billing/settings");
    const result = response.data;
    setCache(CACHE_KEYS.SETTINGS, result);
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
