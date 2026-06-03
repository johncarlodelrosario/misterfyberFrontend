// services/payment.ts - COMPLETE FIXED VERSION
import api from "./api";

export interface CreatePaymentData {
  amount: number;
  paymentMethod: string;
  billingId?: string;
  paymentType?: "subscription" | "installation" | "others";
  referenceNumber?: string;
  notes?: string;
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
  applicationId?: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  referenceNumber: string;
  billingId: string;
  paymentDetails: {
    gateway: string;
    gatewayResponse: any;
    notes?: string;
    confirmedBy?: string;
    confirmedAt?: string;
  };
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_CACHE_KEYS = {
  PAYMENTS_DATA: "misterfyber_payments_data",
  PAYMENTS_TIMESTAMP: "misterfyber_payments_timestamp",
  PENDING_PAYMENTS: "misterfyber_pending_payments",
};

const PAYMENT_CACHE_DURATION = 5 * 60 * 1000;

function getCachedPayments<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const item = JSON.parse(cached);
    if (Date.now() - item.timestamp > PAYMENT_CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
}

function setCachedPayments<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error("Failed to cache payments data:", error);
  }
}

export function clearPaymentsCache(): void {
  Object.values(PAYMENT_CACHE_KEYS).forEach((key) =>
    localStorage.removeItem(key),
  );
}

export const createPayment = async (
  data: CreatePaymentData,
): Promise<PaymentResponse> => {
  try {
    const response = await api.post("/payments", {
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      billingId: data.billingId,
      paymentType: data.paymentType || "subscription",
      referenceNumber: data.referenceNumber,
      notes: data.notes,
    });
    clearPaymentsCache();
    return response.data;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

export const getPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  forceRefresh?: boolean;
}): Promise<any> => {
  try {
    if (!params?.forceRefresh) {
      const cached = getCachedPayments(PAYMENT_CACHE_KEYS.PAYMENTS_DATA);
      if (cached) return cached;
    }
    const response = await api.get("/payments", { params });
    const result = response.data;
    setCachedPayments(PAYMENT_CACHE_KEYS.PAYMENTS_DATA, result);
    return result;
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }
};

export const getPayment = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

export const verifyPayment = async (reference: string): Promise<any> => {
  try {
    const response = await api.get(`/payments/verify/${reference}`);
    return response.data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
};

export const confirmPayment = async (
  paymentId: string,
  notes?: string,
): Promise<any> => {
  try {
    const response = await api.put(`/payments/${paymentId}/confirm`, { notes });
    clearPaymentsCache();
    return response.data;
  } catch (error) {
    console.error("Error confirming payment:", error);
    throw error;
  }
};

export const rejectPayment = async (
  paymentId: string,
  reason: string,
): Promise<any> => {
  try {
    const response = await api.put(`/payments/${paymentId}/reject`, { reason });
    clearPaymentsCache();
    return response.data;
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
};

export const getPendingPayments = async (
  forceRefresh?: boolean,
): Promise<any> => {
  try {
    if (!forceRefresh) {
      const cached = getCachedPayments(PAYMENT_CACHE_KEYS.PENDING_PAYMENTS);
      if (cached) return cached;
    }
    const response = await api.get("/payments/admin/pending");
    const result = response.data;
    setCachedPayments(PAYMENT_CACHE_KEYS.PENDING_PAYMENTS, result);
    return result;
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    throw error;
  }
};

export const getPaymentStats = async (): Promise<any> => {
  try {
    const response = await api.get("/payments/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    throw error;
  }
};

export default {
  createPayment,
  getPayments,
  getPayment,
  verifyPayment,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  getPaymentStats,
  clearPaymentsCache,
};
