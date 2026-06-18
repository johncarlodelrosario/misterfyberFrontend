import api from "./api";

// ==================== CACHE MANAGEMENT ====================
const CACHE_KEYS = {
  USERS: "admin_users_cache",
  APPLICATIONS: "admin_applications_cache",
  PAYMENTS: "admin_payments_cache",
  BILLS: "admin_bills_cache",
  BILLING_CYCLES: "admin_billing_cycles_cache",
  CUSTOMERS_WITHOUT_ACCOUNTS: "admin_customers_without_accounts_cache",
  EMAIL_ALERTS_PREFERENCE: "admin_email_alerts_preference_cache",
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

// ==================== CUSTOMER EMAIL ALERTS TOGGLE ====================
export const toggleCustomerEmailAlerts = async (enabled: boolean) => {
  try {
    const response = await api.put("/admin/customer-email-alerts/toggle", {
      enabled,
    });
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error toggling customer email alerts:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getCustomerEmailAlertsPreference = async (
  forceRefresh?: boolean,
) => {
  try {
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.EMAIL_ALERTS_PREFERENCE);
      if (cached) return cached;
    }

    const response = await api.get("/admin/customer-email-alerts/preference");
    const result = response.data;

    setCachedData(CACHE_KEYS.EMAIL_ALERTS_PREFERENCE, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching customer email alerts preference:",
      error.response?.data || error.message,
    );
    return { success: true, data: { customerEmailAlertsEnabled: true } };
  }
};

// ==================== DASHBOARD STATS ====================
export const getDashboardStats = async () => {
  try {
    const response = await api.get("/admin/dashboard");
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error fetching dashboard stats:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getRecentActivities = async () => {
  try {
    const response = await api.get("/admin/recent-activities");
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error fetching recent activities:",
      error.response?.data || error.message,
    );
    return [];
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
    return { success: true, data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getUser = async (id: string) => {
  try {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error fetching user:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const updateUser = async (id: string, data: any) => {
  try {
    const response = await api.put(`/admin/users/${id}`, data);
    clearAdminCache();
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error updating user:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const approveUser = async (id: string) => {
  try {
    const response = await api.put(`/admin/users/${id}/approve`);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error approving user:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const suspendUser = async (id: string) => {
  try {
    const response = await api.put(`/admin/users/${id}/suspend`);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error suspending user:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await api.delete(`/admin/users/${id}`);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error deleting user:",
      error.response?.data || error.message,
    );
    throw error;
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
    return {
      success: true,
      data: [],
      totalPages: 0,
      currentPage: 1,
      total: 0,
      stats: {},
    };
  }
};

export const getPendingPayments = async (forceRefresh?: boolean) => {
  try {
    const response = await api.get("/admin/payments/pending");
    const result = response.data;
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching pending payments:",
      error.response?.data || error.message,
    );
    return { success: true, data: [] };
  }
};

export const confirmPayment = async (paymentId: string) => {
  try {
    const response = await api.post(`/admin/payments/${paymentId}/confirm`);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error confirming payment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const rejectPayment = async (paymentId: string, reason: string) => {
  try {
    const response = await api.post(`/admin/payments/${paymentId}/reject`, {
      reason,
    });
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error rejecting payment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// DELETE PAYMENT - Admin only
export const deletePayment = async (paymentId: string) => {
  try {
    const response = await api.delete(`/payments/${paymentId}`);
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error deleting payment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ==================== BILL MANAGEMENT ====================
export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
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
    return {
      success: true,
      data: [],
      totalPages: 0,
      currentPage: 1,
      total: 0,
      stats: [],
    };
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
  includeInstallationFee?: boolean;
}) => {
  try {
    console.log("📝 Creating manual customer with data:", data);
    const response = await api.post("/admin/manual-customer", data);
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

    const response = await api.get("/admin/customers-without-accounts");
    console.log("📦 API Response:", response.data);
    const result = response.data;

    setCachedData(CACHE_KEYS.CUSTOMERS_WITHOUT_ACCOUNTS, result);
    return result;
  } catch (error: any) {
    console.error(
      "Error fetching customers without accounts:",
      error.response?.data || error.message,
    );
    return { success: true, data: [], count: 0 };
  }
};

// ==================== REPORT GENERATION ====================
export const generateReport = async (data: {
  type: "revenue" | "users" | "plans" | "billing";
  startDate: string;
  endDate: string;
  format?: "json" | "csv" | "pdf";
}) => {
  try {
    const response = await api.post("/admin/reports", data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error generating report:",
      error.response?.data || error.message,
    );
    throw error;
  }
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
    return { success: true, data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
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
    return { success: true, data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const approveApplication = async (id: string, adminNotes?: string) => {
  try {
    const response = await api.put(`/applications/${id}/approve`, {
      adminNotes,
    });
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error approving application:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const rejectApplication = async (id: string, adminNotes?: string) => {
  try {
    const response = await api.put(`/applications/${id}/reject`, {
      adminNotes,
    });
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error rejecting application:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const startBillingForApplication = async (
  applicationId: string,
  data?: {
    installationDate?: string;
    notes?: string;
    includeInstallationFee?: boolean;
  },
) => {
  try {
    console.log(`🚀 Starting billing for application: ${applicationId}`);
    const response = await api.post(
      `/applications/${applicationId}/start-billing`,
      data || {},
    );
    clearAdminCache();
    return response.data;
  } catch (error: any) {
    console.error(
      "Error starting billing for application:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getApplicationBillingStatus = async (applicationId: string) => {
  try {
    const response = await api.get(
      `/applications/billing-status/${applicationId}`,
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching application billing status:",
      error.response?.data || error.message,
    );
    return { success: true, data: null };
  }
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
    "admin_email_alerts_preference_cache",
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
  toggleCustomerEmailAlerts,
  getCustomerEmailAlertsPreference,
  getDashboardStats,
  getRecentActivities,
  getAllUsers,
  getUser,
  updateUser,
  approveUser,
  suspendUser,
  deleteUser,
  getAllPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
  deletePayment,
  getAllBills,
  createManualCustomer,
  getCustomersWithoutAccounts,
  generateReport,
  getAllApplications,
  approveApplication,
  rejectApplication,
  startBillingForApplication,
  getApplicationBillingStatus,
  getAllBillingCycles,
  clearBillingCache,
  clearAdminCache,
};
