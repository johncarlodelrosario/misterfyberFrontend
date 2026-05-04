// services/billing.ts - COMPLETE BILLING SERVICE FOR FRONTEND
import api from "./api";

export interface BillingCycle {
  _id: string;
  userId: any;
  planId: any;
  billingStartDate: string;
  billingEndDate: string;
  nextBillingDate: string;
  status: "active" | "paused" | "completed" | "cancelled";
  monthlyRate: number;
  currentProRatedAmount: number;
  reminderSent: boolean;
  reminderSentAt: string;
  serviceSuspendedAt: string;
  pendingPlanChange: {
    newPlanId: any;
    requestedAt: string;
    effectiveDate: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
  } | null;
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
}

export interface Bill {
  _id: string;
  invoiceNumber: string;
  userId: any;
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
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentId: any;
  notes: string;
  isProRated: boolean;
  proRatedDays: number;
  billingCycleId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== USER BILLING FUNCTIONS ====================

export const getUserBillingCycle = async (): Promise<{
  billingCycle: BillingCycle;
  upcomingBills: Bill[];
  hasOverdue: boolean;
  overdueCount: number;
  overdueAmount: number;
} | null> => {
  try {
    const response = await api.get("/users/billing-cycle");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching user billing cycle:", error);
    return null;
  }
};

export const getCurrentBill = async (): Promise<Bill | null> => {
  try {
    const response = await api.get("/users/billing/current");
    return response.data.data;
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
    const response = await api.get("/users/billing/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getUserBillingSummary = async (): Promise<any> => {
  try {
    const response = await api.get("/users/billing-summary");
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

export const requestUserPlanChange = async (
  newPlanId: string,
  effectiveDate?: string,
): Promise<any> => {
  try {
    const response = await api.post("/users/request-plan-change", {
      newPlanId,
      effectiveDate,
    });
    return response.data;
  } catch (error) {
    console.error("Error requesting plan change:", error);
    throw error;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  } catch (error) {
    console.error("Error stopping billing:", error);
    throw error;
  }
};

export const approvePlanChange = async (data: {
  userId: string;
  approvalNotes?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/plan-change/approve", data);
    return response.data;
  } catch (error) {
    console.error("Error approving plan change:", error);
    throw error;
  }
};

export const rejectPlanChange = async (data: {
  userId: string;
  rejectionReason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/plan-change/reject", data);
    return response.data;
  } catch (error) {
    console.error("Error rejecting plan change:", error);
    throw error;
  }
};

export const setReminder = async (data: {
  userId: string;
  reminderDate: string;
  reminderType?: string;
  customMessage?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/set-reminder", data);
    return response.data;
  } catch (error) {
    console.error("Error setting reminder:", error);
    throw error;
  }
};

export const disconnectClient = async (data: {
  userId: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await api.post("/billing/disconnect", data);
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

export const updateBillingSettings = async (
  data: Partial<BillingSettings>,
): Promise<any> => {
  try {
    const response = await api.put("/billing/settings", data);
    return response.data;
  } catch (error) {
    console.error("Error updating billing settings:", error);
    throw error;
  }
};

// ==================== UNPAID BILLS & OVERDUE FUNCTIONS ====================

export const getUnpaidBills = async (userId?: string): Promise<Bill[]> => {
  try {
    const params = userId ? { userId } : {};
    const response = await api.get("/billing/unpaid", { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching unpaid bills:", error);
    return [];
  }
};

export const getOverdueBills = async (userId?: string): Promise<Bill[]> => {
  try {
    const params = userId ? { userId } : {};
    const response = await api.get("/billing/overdue", { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching overdue bills:", error);
    return [];
  }
};

export const getBillById = async (billId: string): Promise<Bill> => {
  try {
    const response = await api.get(`/billing/bills/${billId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching bill:", error);
    throw error;
  }
};

// ==================== DASHBOARD STATS ====================

export const getBillingStats = async (): Promise<{
  totalRevenue: number;
  monthlyRevenue: number;
  totalUnpaid: number;
  totalOverdue: number;
  activeBillingCycles: number;
}> => {
  try {
    const response = await api.get("/billing/stats");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching billing stats:", error);
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalUnpaid: 0,
      totalOverdue: 0,
      activeBillingCycles: 0,
    };
  }
};
