// services/user.ts - COMPLETE WITH ALL EXPORTS
import api from "./api";
import { getUserCurrentBilling, getUserBillingHistory } from "./billing";

export interface AddressData {
  street: string;
  landmark?: string;
  buildingName?: string;
  floor?: string;
  unitNumber?: string;
  houseNo?: string;
  villageSubdivision?: string;
}

export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  addressType: "building" | "house";
  region: string;
  province: string;
  city: string;
  barangay: string;
  zipCode: string;
  address: AddressData;
  idType: string;
  idNumber: string;
  idImage?: string;
  profilePicture?: string;
  role: string;
  planId: any;
  status: string;
}

export interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  speed: {
    download: number;
    upload: number;
  };
  features: string[];
  duration: number;
  mikrotikProfile: string;
  isActive: boolean;
}

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get("/users/profile");
    return response.data.data?.user || response.data.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (data: Partial<UserProfile>) => {
  const response = await api.put("/users/profile", data);
  return response.data.data;
};

export const getUserDashboard = async () => {
  try {
    const response = await api.get("/users/dashboard");
    return response.data.data;
  } catch (error) {
    console.log("Using mock dashboard data");
    return {
      plan: {
        name: "Fiber 100",
        speed: { download: 100, upload: 100 },
      },
      currentBill: {
        total: 1299,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      usage: 45,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      recentActivities: [],
    };
  }
};

export const changeUserPlan = async (planId: string) => {
  const response = await api.put("/users/change-plan", { planId });
  return response.data.data;
};

export const requestPlanChange = async (
  planId: string,
  effectiveDate?: string,
) => {
  const response = await api.post("/users/request-plan-change", {
    newPlanId: planId,
    effectiveDate,
  });
  return response.data;
};

// Re-export billing functions from billing service
export { getUserCurrentBilling, getUserBillingHistory };

// Alias for backward compatibility
export const getUserBillingCycle = getUserCurrentBilling;
export const getCurrentBill = async () => {
  const result = await getUserCurrentBilling();
  return result?.data?.currentBill || null;
};

export const getUsage = async () => {
  try {
    const response = await api.get("/users/usage");
    return response.data.data;
  } catch (error) {
    return {
      currentUsage: 45,
      totalLimit: 1000,
      dailyUsage: [],
    };
  }
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const response = await api.put("/users/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const uploadProfilePicture = async (file: File) => {
  const formData = new FormData();
  formData.append("profilePicture", file);
  const response = await api.post("/users/profile/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
};

export const getPaymentMethods = async () => {
  try {
    const response = await api.get("/users/payment-methods");
    return response.data.data;
  } catch (error) {
    return [];
  }
};

export const getSupportTickets = async () => {
  try {
    const response = await api.get("/users/support-tickets");
    return response.data.data;
  } catch (error) {
    return [];
  }
};

export const createSupportTicket = async (data: {
  subject: string;
  message: string;
}) => {
  const response = await api.post("/users/support-tickets", data);
  return response.data.data;
};

export const getUserBills = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  try {
    const response = await api.get("/billing/user/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching bills:", error);
    return { data: [], total: 0 };
  }
};

export const getInvoice = async (invoiceId: string) => {
  try {
    const response = await api.get(`/users/invoice/${invoiceId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    throw error;
  }
};

export const downloadInvoice = async (invoiceId: string) => {
  try {
    const response = await api.get(`/users/invoice/${invoiceId}/download`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("Error downloading invoice:", error);
    throw error;
  }
};

export const updateNotificationPreferences = async (preferences: {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  billingReminders?: boolean;
  serviceUpdates?: boolean;
  promotional?: boolean;
}) => {
  const response = await api.put(
    "/users/notification-preferences",
    preferences,
  );
  return response.data;
};

export const getConnectionInfo = async () => {
  try {
    const response = await api.get("/users/connection-info");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching connection info:", error);
    return {
      username: null,
      ipAddress: null,
      macAddress: null,
      status: "unknown",
    };
  }
};

export const requestAccountDeletion = async (reason?: string) => {
  const response = await api.post("/users/request-deletion", { reason });
  return response.data;
};
