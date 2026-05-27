import api from "./api";

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

export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const response = await api.get("/admin/users", { params });
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data.data;
};

export const updateUser = async (id: string, data: any) => {
  const response = await api.put(`/admin/users/${id}`, data);
  return response.data.data;
};

export const approveUser = async (id: string) => {
  const response = await api.put(`/admin/users/${id}/approve`);
  return response.data;
};

export const suspendUser = async (id: string) => {
  const response = await api.put(`/admin/users/${id}/suspend`);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
};

export const getAllApplications = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const response = await api.get("/applications", { params });
  return response.data;
};

export const approveApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/approve`, {
    adminNotes,
  });
  return response.data;
};

export const rejectApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/reject`, { adminNotes });
  return response.data;
};

export const getAllPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const response = await api.get("/admin/payments", { params });
  return response.data;
};

export const getPendingPayments = async () => {
  try {
    const response = await api.get("/payments/admin/pending");
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching pending payments:",
      error.response?.data || error.message,
    );
    return { success: true, data: [] };
  }
};

export const confirmPayment = async (paymentId: string) => {
  const response = await api.put(`/payments/${paymentId}/confirm`);
  return response.data;
};

export const rejectPayment = async (paymentId: string, reason?: string) => {
  const response = await api.put(`/payments/${paymentId}/reject`, { reason });
  return response.data;
};

export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const response = await api.get("/admin/bills", { params });
  return response.data;
};

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
  const response = await api.post("/admin/manual-customer", data);
  return response.data;
};

// ==================== CUSTOMERS WITHOUT ACCOUNTS ====================
export const getCustomersWithoutAccounts = async () => {
  try {
    console.log("🔍 Fetching customers without accounts from API...");
    const response = await api.get("/admin/customers-without-accounts");
    console.log("📦 API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching customers without accounts:",
      error.response?.data || error.message,
    );
    return { data: [], count: 0 };
  }
};

// ==================== BILLING FOR APPLICATIONS ====================
export const startBillingForApplication = async (
  applicationId: string,
  data?: { installationDate?: string; notes?: string },
) => {
  const response = await api.post(
    `/applications/${applicationId}/start-billing`,
    data || {},
  );
  return response.data;
};

// ==================== BILLING CYCLE MANAGEMENT ====================
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
    const response = await api.get("/billing/cycles", { params });
    return response.data;
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
  return response.data;
};

export const stopBilling = async (data: {
  userId: string;
  reason?: string;
}) => {
  const response = await api.post("/billing/stop", data);
  return response.data;
};

export const pauseBilling = async (data: {
  userId: string;
  reason?: string;
  pauseUntilDate?: string;
}) => {
  const response = await api.post("/billing/pause", data);
  return response.data;
};

export const resumeBilling = async (data: { userId: string }) => {
  const response = await api.post("/billing/resume", data);
  return response.data;
};

export const disconnectClient = async (data: {
  userId: string;
  reason?: string;
}) => {
  const response = await api.post("/billing/disconnect", data);
  return response.data;
};

export const reconnectClient = async (data: { userId: string }) => {
  const response = await api.post("/billing/reconnect", data);
  return response.data;
};

// ==================== BILLING SETTINGS ====================
export const getBillingSettings = async (forceRefresh?: boolean) => {
  const response = await api.get("/billing/settings");
  return response.data;
};

export const updateBillingSettings = async (data: Partial<BillingSettings>) => {
  const response = await api.put("/billing/settings", data);
  return response.data;
};

export const getBillingSettingsAdmin = async () => {
  const response = await api.get("/billing/settings/admin");
  return response.data;
};

export const updateBillingSettingsAdmin = async (
  data: Partial<BillingSettings>,
) => {
  const response = await api.put("/billing/settings/admin", data);
  return response.data;
};

// ==================== BILLING SUMMARY & STATS ====================
export const getBillingSummaryAdmin = async () => {
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
  return response.data;
};

// ==================== PENDING BILLS & ACTIVATIONS ====================
export const getPendingProRatedBills = async () => {
  try {
    const response = await api.get("/billing/pending-pro-rated");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

export const getPendingActivations = async () => {
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
  return response.data;
};

export const startMonthlyBilling = async (data: { userId: string }) => {
  const response = await api.post("/billing/start-monthly", data);
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
  ];
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
};

// ==================== DEFAULT EXPORT ====================
export default {
  getDashboardStats,
  getRecentActivities,
  getAllUsers,
  getUser,
  updateUser,
  approveUser,
  suspendUser,
  deleteUser,
  getAllApplications,
  approveApplication,
  rejectApplication,
  getAllPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
  getAllBills,
  createManualCustomer,
  getCustomersWithoutAccounts,
  startBillingForApplication,
  getAllBillingCycles,
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  getBillingSettings,
  updateBillingSettings,
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  getBillingSummaryAdmin,
  markBillAsPaid,
  getPendingProRatedBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
  clearBillingCache,
};
