// services/admin.ts - COMPLETE FIXED VERSION
import api from "./api";

// ==================== CACHE MANAGEMENT ====================
const CACHE_KEYS = {
  USERS: "admin_users_cache",
  APPLICATIONS: "admin_applications_cache",
  PAYMENTS: "admin_payments_cache",
  BILLS: "admin_bills_cache",
  BILLING_CYCLES: "admin_billing_cycles_cache",
  CUSTOMERS_WITHOUT_ACCOUNTS: "admin_customers_without_accounts_cache",
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
  } catch {
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

export function clearAdminCache(): void {
  Object.values(CACHE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
}

// ==================== DASHBOARD STATS ====================
export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data.data;
};

export const getRecentActivities = async () => {
  try {
    const response = await api.get("/admin/recent-activities");
    return response.data.data;
  } catch (error) {
    console.log("Using mock recent activities");
    return [
      {
        title: "New Payment",
        description: "John Doe paid ₱1,499",
        type: "payment",
        icon: "💰",
        time: "5 minutes ago",
      },
      {
        title: "New User Registered",
        description: "Jane Smith created an account",
        type: "user",
        icon: "👤",
        time: "1 hour ago",
      },
      {
        title: "Application Submitted",
        description: "Mike Johnson applied for Premium plan",
        type: "application",
        icon: "📝",
        time: "3 hours ago",
      },
      {
        title: "Plan Change",
        description: "Sarah Wilson upgraded to Ultimate",
        type: "plan",
        icon: "📡",
        time: "5 hours ago",
      },
    ];
  }
};

// ==================== USER MANAGEMENT ====================
export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  forceRefresh?: boolean;
}) => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.USERS);
      if (cached) return cached;
    }

    const response = await api.get("/admin/users", { params });
    const result = response.data;

    setCachedData(CACHE_KEYS.USERS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching users:",
      error.response?.data || error.message,
    );
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getUser = async (id: string) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data.data;
};

export const updateUser = async (id: string, data: any) => {
  const response = await api.put(`/admin/users/${id}`, data);
  clearAdminCache();
  return response.data.data;
};

export const approveUser = async (id: string) => {
  const response = await api.put(`/admin/users/${id}/approve`);
  clearAdminCache();
  return response.data;
};

export const suspendUser = async (id: string) => {
  const response = await api.put(`/admin/users/${id}/suspend`);
  clearAdminCache();
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/admin/users/${id}`);
  clearAdminCache();
  return response.data;
};

// ==================== APPLICATION MANAGEMENT ====================
export const getAllApplications = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}) => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.APPLICATIONS);
      if (cached) return cached;
    }

    const response = await api.get("/applications", { params });
    const result = response.data;

    setCachedData(CACHE_KEYS.APPLICATIONS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching applications:",
      error.response?.data || error.message,
    );
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const approveApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/approve`, {
    adminNotes,
  });
  clearAdminCache();
  return response.data;
};

export const rejectApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/reject`, { adminNotes });
  clearAdminCache();
  return response.data;
};

export const getApplicationBillingStatus = async (applicationId: string) => {
  try {
    const response = await api.get(
      `/applications/billing-status/${applicationId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application billing status:", error);
    return { data: null };
  }
};

// ==================== PAYMENT MANAGEMENT ====================
export const getAllPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}) => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.PAYMENTS);
      if (cached) return cached;
    }

    const response = await api.get("/admin/payments", { params });
    const result = response.data;

    setCachedData(CACHE_KEYS.PAYMENTS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching payments:",
      error.response?.data || error.message,
    );
    return { data: [], totalPages: 0, currentPage: 1, total: 0, stats: {} };
  }
};

export const getPendingPayments = async (forceRefresh?: boolean) => {
  try {
    if (!forceRefresh) {
      const cached = getCachedData("admin_pending_payments");
      if (cached) return cached;
    }

    const response = await api.get("/payments/admin/pending");
    const result = response.data;

    setCachedData("admin_pending_payments", result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching pending payments:",
      error.response?.data || error.message,
    );
    return { success: true, data: [] };
  }
};

export const confirmPayment = async (paymentId: string, notes?: string) => {
  const response = await api.put(`/payments/${paymentId}/confirm`, { notes });
  clearAdminCache();
  return response.data;
};

export const rejectPayment = async (paymentId: string, reason?: string) => {
  const response = await api.put(`/payments/${paymentId}/reject`, { reason });
  clearAdminCache();
  return response.data;
};

// ==================== BILL MANAGEMENT ====================
export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  applicationId?: string;
  forceRefresh?: boolean;
}) => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.BILLS);
      if (cached) return cached;
    }

    const response = await api.get("/admin/bills", { params });
    const result = response.data;

    setCachedData(CACHE_KEYS.BILLS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching bills:",
      error.response?.data || error.message,
    );
    return { data: [], totalPages: 0, currentPage: 1, total: 0, stats: [] };
  }
};

// ==================== CUSTOMER MANAGEMENT ====================
export const createManualCustomer = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  buildingId?: string;
  buildingName?: string;
  floor?: string;
  unitNumber?: string;
  planId: string;
  idType?: string;
  idNumber?: string;
  startBillingImmediately?: boolean;
  installationDate?: string;
  notes?: string;
}) => {
  try {
    console.log("📝 Creating manual customer with data:", data);
    const response = await api.post("/admin/customers/manual", data);
    console.log("✅ Manual customer created:", response.data);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Error creating manual customer:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getCustomersWithoutAccounts = async (forceRefresh?: boolean) => {
  try {
    console.log("🔍 Fetching customers without accounts from API...");

    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.CUSTOMERS_WITHOUT_ACCOUNTS);
      if (cached) return cached;
    }

    const response = await api.get("/admin/customers/without-accounts");
    console.log("📦 API Response:", response.data);
    const result = response.data;

    setCachedData(CACHE_KEYS.CUSTOMERS_WITHOUT_ACCOUNTS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching customers without accounts:",
      error.response?.data || error.message,
    );
    return { data: [], count: 0 };
  }
};

// ==================== BILLING FOR APPLICATIONS (PRIORITY) ====================
export const startBillingForApplication = async (
  applicationId: string,
  data?: { installationDate?: string; notes?: string },
) => {
  console.log(`🚀 Starting billing for application: ${applicationId}`);
  const response = await api.post(
    `/applications/${applicationId}/start-billing`,
    data || {},
  );
  clearAdminCache();
  return response.data;
};

// ==================== BILLING CYCLE MANAGEMENT ====================
export interface BillingCycle {
  _id: string;
  userId: any;
  applicationId?: string;
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

export const getAllBillingCycles = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}) => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.BILLING_CYCLES);
      if (cached) return cached;
    }

    const response = await api.get("/billing/cycles", { params });
    const result = response.data;

    setCachedData(CACHE_KEYS.BILLING_CYCLES, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching billing cycles:",
      error.response?.data || error.message,
    );
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const startBilling = async (data: {
  userId: string;
  startDate?: string;
  customAmount?: number;
  notes?: string;
}) => {
  const response = await api.post("/billing/start", data);
  clearAdminCache();
  return response.data;
};

export const stopBilling = async (data: {
  userId: string;
  reason?: string;
}) => {
  const response = await api.post("/billing/stop", data);
  clearAdminCache();
  return response.data;
};

export const pauseBilling = async (data: {
  userId: string;
  reason?: string;
  pauseUntilDate?: string;
}) => {
  const response = await api.post("/billing/pause", data);
  clearAdminCache();
  return response.data;
};

export const resumeBilling = async (data: { userId: string }) => {
  const response = await api.post("/billing/resume", data);
  clearAdminCache();
  return response.data;
};

export const disconnectClient = async (data: {
  userId: string;
  reason?: string;
}) => {
  const response = await api.post("/billing/disconnect", data);
  clearAdminCache();
  return response.data;
};

export const reconnectClient = async (data: { userId: string }) => {
  const response = await api.post("/billing/reconnect", data);
  clearAdminCache();
  return response.data;
};

// ==================== BILLING SETTINGS ====================
export const getBillingSettings = async (forceRefresh?: boolean) => {
  const response = await api.get("/billing/settings");
  return response.data;
};

export const updateBillingSettings = async (data: Partial<BillingSettings>) => {
  const response = await api.put("/billing/settings", data);
  clearAdminCache();
  return response.data;
};

export const getBillingSettingsAdmin = async (forceRefresh?: boolean) => {
  const response = await api.get("/billing/settings/admin");
  return response.data;
};

export const updateBillingSettingsAdmin = async (
  data: Partial<BillingSettings>,
) => {
  const response = await api.put("/billing/settings/admin", data);
  clearAdminCache();
  return response.data;
};

// ==================== BILLING SUMMARY & STATS ====================
export const getBillingSummaryAdmin = async (forceRefresh?: boolean) => {
  try {
    const response = await api.get("/billing/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return { data: {} };
  }
};

// ==================== BILL PAYMENT MANAGEMENT ====================
export const markBillAsPaid = async (
  billId: string,
  data: { referenceNumber?: string; notes?: string },
) => {
  const response = await api.put(`/billing/mark-paid/${billId}`, data);
  clearAdminCache();
  return response.data;
};

// ==================== PENDING BILLS & ACTIVATIONS ====================
export const getPendingProRatedBills = async (forceRefresh?: boolean) => {
  try {
    const response = await api.get("/billing/pending-pro-rated");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

export const getPendingActivations = async (forceRefresh?: boolean) => {
  try {
    const response = await api.get("/billing/pending-activations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { data: [] };
  }
};

// ==================== PAYMENT CONFIRMATIONS ====================
export const confirmProRatedPayment = async (data: {
  userId: string;
  paymentDetails?: any;
}) => {
  const response = await api.post("/billing/confirm-pro-rated", data);
  clearAdminCache();
  return response.data;
};

export const startMonthlyBilling = async (data: { userId: string }) => {
  const response = await api.post("/billing/start-monthly", data);
  clearAdminCache();
  return response.data;
};

// ==================== USER BILLING FUNCTIONS ====================
export const getUserCurrentBilling = async () => {
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
}) => {
  try {
    const response = await api.get("/billing/user/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching user billing history:", error);
    return { data: { billingHistory: [], total: 0, page: 1, pages: 0 } };
  }
};

// ==================== AUTO BILLING FUNCTIONS ====================
export const autoGenerateMonthlyBills = async () => {
  const response = await api.post("/billing/auto-generate");
  clearAdminCache();
  return response.data;
};

export const autoSendReminders = async () => {
  const response = await api.post("/billing/auto-reminders");
  clearAdminCache();
  return response.data;
};

export const autoSuspendOverdue = async () => {
  const response = await api.post("/billing/auto-suspend");
  clearAdminCache();
  return response.data;
};

// ==================== SUBMIT PAYMENTS (USER) ====================
export const submitProRatedPayment = async (data: {
  billId: string;
  referenceNumber: string;
  notes?: string;
}) => {
  const response = await api.post("/billing/user/submit-pro-rated", data);
  clearAdminCache();
  return response.data;
};

export const submitMonthlyPayment = async (data: {
  billId: string;
  referenceNumber: string;
  notes?: string;
}) => {
  const response = await api.post("/billing/user/submit-monthly", data);
  clearAdminCache();
  return response.data;
};

// ==================== CACHE MANAGEMENT ====================
export const clearBillingCache = () => {
  const keys = [
    "billing_cycles_cache",
    "bills_cache",
    "billing_settings_cache",
    "billing_stats_cache",
    "misterfyber_billing_data",
    "misterfyber_billing_timestamp",
    "misterfyber_billing_stats",
    "admin_users_cache",
    "admin_applications_cache",
    "admin_payments_cache",
    "admin_bills_cache",
    "admin_billing_cycles_cache",
    "admin_customers_without_accounts_cache",
    "admin_pending_payments",
  ];
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
  console.log("🗑️ All caches cleared");
};

// ==================== DEFAULT EXPORT ====================
export default {
  // Dashboard
  getDashboardStats,
  getRecentActivities,

  // User Management
  getAllUsers,
  getUser,
  updateUser,
  approveUser,
  suspendUser,
  deleteUser,

  // Application Management
  getAllApplications,
  approveApplication,
  rejectApplication,
  getApplicationBillingStatus,

  // Payment Management
  getAllPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,

  // Bill Management
  getAllBills,
  markBillAsPaid,

  // Customer Management
  createManualCustomer,
  getCustomersWithoutAccounts,

  // Billing for Applications (Priority)
  startBillingForApplication,

  // Billing Cycle Management
  getAllBillingCycles,
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,

  // Billing Settings
  getBillingSettings,
  updateBillingSettings,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,

  // Billing Summary
  getBillingSummaryAdmin,

  // Pending Items
  getPendingProRatedBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,

  // User Billing
  getUserCurrentBilling,
  getUserBillingHistory,

  // Auto Billing
  autoGenerateMonthlyBills,
  autoSendReminders,
  autoSuspendOverdue,

  // Submit Payments
  submitProRatedPayment,
  submitMonthlyPayment,

  // Cache Management
  clearBillingCache,
  clearAdminCache,
};
