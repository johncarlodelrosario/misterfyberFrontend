// services/billing.ts - COMPLETE WORKING VERSION
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
  paymentHistory: Array<{ billingId: string; amount: number; paidAt: string }>;
  serviceSuspendedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  pauseReason?: string;
  pauseUntil?: string;
  disconnectReason?: string;
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
  createdAt: string;
  updatedAt: string;
}

export function clearBillingCache(): void {
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
}

// ==================== USER BILLING FUNCTIONS ====================
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

// ==================== ADMIN BILLING FUNCTIONS ====================
export const getAllBillingCycles = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  data: BillingCycle[];
  totalPages: number;
  currentPage: number;
  total: number;
}> => {
  try {
    const response = await api.get("/billing/cycles", { params });
    const result = response.data;
    const data = result.data || [];
    const total = result.total || data.length;
    const currentPage = params?.page || 1;
    const limit = params?.limit || 10;
    const totalPages = Math.ceil(total / limit);
    return { data, totalPages, currentPage, total };
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
}): Promise<{
  data: Bill[];
  stats: any[];
  totalPages: number;
  currentPage: number;
  total: number;
}> => {
  try {
    const response = await api.get("/billing/all-bills", { params });
    const result = response.data;
    const data = result.data || [];
    const total = result.total || data.length;
    const currentPage = params?.page || 1;
    const limit = params?.limit || 10;
    const totalPages = Math.ceil(total / limit);
    return { data, stats: result.stats || [], totalPages, currentPage, total };
  } catch (error) {
    console.error("Error fetching all bills:", error);
    return { data: [], stats: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const startBilling = async (data: {
  userId: string;
  startDate?: string;
  customAmount?: number;
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

export const getBillingSettings = async (): Promise<{
  data: BillingSettings;
}> => {
  try {
    const response = await api.get("/billing/settings");
    return response.data;
  } catch (error) {
    console.error("Error fetching billing settings:", error);
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

export const getPendingProRatedBills = async (): Promise<{ data: any[] }> => {
  try {
    const response = await api.get("/billing/pending-pro-rated");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending pro-rated bills:", error);
    return { data: [] };
  }
};

export const getPendingActivations = async (): Promise<{ data: any[] }> => {
  try {
    const response = await api.get("/billing/pending-activations");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending activations:", error);
    return { data: [] };
  }
};

export const confirmProRatedPayment = async (data: {
  userId: string;
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
  userId: string;
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

export const getBillingSummaryAdmin = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching billing summary admin:", error);
    return { data: {} };
  }
};
