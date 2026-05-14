// services/admin.ts - COMPLETE WITH PAYMENT FUNCTIONS (FIXED)
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
  const response = await api.put(`/applications/${id}/approve`, { adminNotes });
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

// ==================== BILLING CYCLE API CALLS ====================

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

export const getAllBillingCycles = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
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

export const approvePlanChange = async (data: {
  userId: string;
  approvalNotes?: string;
}) => {
  const response = await api.post("/billing/plan-change/approve", data);
  return response.data;
};

export const rejectPlanChange = async (data: {
  userId: string;
  rejectionReason?: string;
}) => {
  const response = await api.post("/billing/plan-change/reject", data);
  return response.data;
};

export const setReminder = async (data: {
  userId: string;
  reminderDate: string;
  reminderType?: string;
  customMessage?: string;
}) => {
  const response = await api.post("/billing/set-reminder", data);
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

export const getBillingSettings = async () => {
  const response = await api.get("/billing/settings");
  return response.data;
};

export const updateBillingSettings = async (data: Partial<BillingSettings>) => {
  const response = await api.put("/billing/settings", data);
  return response.data;
};
