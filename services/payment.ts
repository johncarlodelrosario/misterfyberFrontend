// services/payment.ts - COMPLETE WITH MANUAL PAYMENT
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
    return response.data;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

export const getPayments = async (params?: {
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await api.get("/payments", { params });
    return response.data;
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

export default {
  createPayment,
  getPayments,
  getPayment,
  verifyPayment,
};
