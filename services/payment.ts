// frontend/src/services/payment.ts - COMPLETE - NO CACHE, ALWAYS REALTIME

import api from "./api";

export interface CreatePaymentData {
  amount: number;
  paymentMethod: string;
  billingId?: string;
  paymentType?: "subscription" | "installation" | "others";
  referenceNumber?: string;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  buildingId?: string;
  isFree?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  data: {
    payment: any;
    checkoutUrl?: string;
  };
}

export interface Payment {
  _id: string;
  userId: any;
  applicationId?: any;
  buildingId?: string;
  buildingName?: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  referenceNumber: string;
  billingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentDetails: {
    gateway: string;
    gatewayResponse: any;
    notes?: string;
    confirmedBy?: string;
    confirmedAt?: string;
    isFree?: boolean;
  };
  paidAt: string;
  createdAt: string;
  updatedAt: string;
  application?: any;
  user?: any;
}

export interface GetAllPaymentsParams {
  page?: number;
  limit?: number | "all";
  status?: string;
  paymentType?: string;
  buildingId?: string;
  search?: string;
  forceRefresh?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface GetAllPaymentsResponse {
  success: boolean;
  data: Payment[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    total: number;
    totalCount: number;
    monthly: number;
    monthlyCount: number;
    subscription: number;
    subscriptionCount: number;
    installationFees: number;
    installationFeeCount: number;
    pending: number;
    pendingCount: number;
  };
}

// ==================== API FUNCTIONS (NO CACHE - ALWAYS REALTIME) ====================

export const createPayment = async (
  data: CreatePaymentData,
): Promise<PaymentResponse> => {
  const response = await api.post("/payments", {
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    billingId: data.billingId,
    paymentType: data.paymentType || "subscription",
    referenceNumber: data.referenceNumber,
    notes: data.notes,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    buildingId: data.buildingId,
    isFree: data.isFree || false,
  });
  return response.data;
};

export const getPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  buildingId?: string;
  forceRefresh?: boolean;
}): Promise<any> => {
  const response = await api.get("/payments", {
    params: {
      ...params,
      limit: params?.limit || 20,
    },
  });
  return response.data;
};

export const getPayment = async (id: string): Promise<any> => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

export const verifyPayment = async (reference: string): Promise<any> => {
  const response = await api.get(`/payments/verify/${reference}`);
  return response.data;
};

export const confirmPayment = async (
  paymentId: string,
  notes?: string,
): Promise<any> => {
  const response = await api.put(`/payments/${paymentId}/confirm`, { notes });
  return response.data;
};

export const rejectPayment = async (
  paymentId: string,
  reason: string,
): Promise<any> => {
  const response = await api.put(`/payments/${paymentId}/reject`, { reason });
  return response.data;
};

export const getPendingPayments = async (
  forceRefresh?: boolean,
): Promise<any> => {
  const response = await api.get("/payments/admin/pending");
  return response.data;
};

export const getPaymentStats = async (): Promise<any> => {
  const response = await api.get("/payments/admin/stats");
  return response.data;
};

export const getAllPayments = async (
  params?: GetAllPaymentsParams,
): Promise<GetAllPaymentsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    } else {
      queryParams.append("limit", "all");
    }
    if (params?.status) queryParams.append("status", params.status);
    if (params?.paymentType)
      queryParams.append("paymentType", params.paymentType);
    if (params?.buildingId) queryParams.append("buildingId", params.buildingId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const url = `/payments/admin/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await api.get(url);
    const result = response.data;

    return {
      success: result.success || true,
      data: Array.isArray(result.data) ? result.data : [],
      total: result.total || 0,
      page: result.page || params?.page || 1,
      totalPages: result.totalPages || 1,
      stats: result.stats || {
        total: 0,
        totalCount: 0,
        monthly: 0,
        monthlyCount: 0,
        subscription: 0,
        subscriptionCount: 0,
        installationFees: 0,
        installationFeeCount: 0,
        pending: 0,
        pendingCount: 0,
      },
    };
  } catch (error) {
    console.error("Error fetching all payments:", error);
    return {
      success: false,
      data: [],
      total: 0,
      page: params?.page || 1,
      totalPages: 1,
      stats: {
        total: 0,
        totalCount: 0,
        monthly: 0,
        monthlyCount: 0,
        subscription: 0,
        subscriptionCount: 0,
        installationFees: 0,
        installationFeeCount: 0,
        pending: 0,
        pendingCount: 0,
      },
    };
  }
};

export const deletePayment = async (paymentId: string): Promise<any> => {
  const response = await api.delete(`/payments/${paymentId}`);
  return response.data;
};

export const bulkDeleteCustomerPayments = async (
  customerId: string,
  deleteAll: boolean = false,
): Promise<any> => {
  const response = await api.delete(`/payments/bulk/customer/${customerId}`, {
    data: { deleteAll },
  });
  return response.data;
};

// Kept for backward compatibility — no-op now.
export function clearPaymentsCache(): void {}

export default {
  createPayment,
  getPayments,
  getPayment,
  verifyPayment,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  getPaymentStats,
  getAllPayments,
  deletePayment,
  bulkDeleteCustomerPayments,
  clearPaymentsCache,
};
