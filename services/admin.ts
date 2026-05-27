// services/admin.ts - COMPLETE WORKING VERSION
import api from "./api";

export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<any> => {
  try {
    const response = await api.get("/admin/users", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return { data: [], total: 0, totalPages: 0 };
  }
};

export const getAllPayments = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> => {
  try {
    const response = await api.get("/payments", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching payments:", error);
    return { data: [] };
  }
};

export const getPendingPayments = async (): Promise<any> => {
  try {
    const response = await api.get("/payments/admin/pending");
    return response.data;
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return { data: [] };
  }
};

export const confirmPayment = async (
  paymentId: string,
  notes?: string,
): Promise<any> => {
  try {
    const response = await api.put(`/payments/${paymentId}/confirm`, { notes });
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
    return response.data;
  } catch (error) {
    console.error("Error rejecting payment:", error);
    throw error;
  }
};

export const getCustomersWithoutAccounts = async (): Promise<any> => {
  try {
    const response = await api.get("/admin/customers-without-accounts");
    return response.data;
  } catch (error) {
    console.error("Error fetching customers without accounts:", error);
    return { data: [] };
  }
};

export const createManualCustomer = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/admin/manual-customer", data);
    return response.data;
  } catch (error) {
    console.error("Error creating manual customer:", error);
    throw error;
  }
};

export const startBillingForApplication = async (
  applicationId: string,
  data?: { installationDate?: string; notes?: string },
): Promise<any> => {
  try {
    const response = await api.post(
      `/applications/${applicationId}/start-billing`,
      data || {},
    );
    return response.data;
  } catch (error) {
    console.error("Error starting billing for application:", error);
    throw error;
  }
};

export const getAllBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> => {
  try {
    const response = await api.get("/billing/all-bills", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching bills:", error);
    return { data: [] };
  }
};
