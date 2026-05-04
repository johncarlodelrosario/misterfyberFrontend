// services/auth.ts - COMPLETE FIXED FILE
import api from "./api";

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    status: string;
    isAdmin?: boolean;
  };
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface RegisterWithApplicationData {
  username: string;
  email: string;
  password: string;
  applicationId: string;
}

export interface RegisterAdminData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const register = async (data: RegisterData): Promise<LoginResponse> => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data.data;
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const response = await api.put("/auth/update-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string) => {
  const response = await api.put(`/auth/reset-password/${token}`, { password });
  return response.data;
};

export const checkApplicationStatus = async (applicationId: string) => {
  const response = await api.get(`/applications/status/${applicationId}`);
  return response.data;
};

export const registerWithApplication = async (
  data: RegisterWithApplicationData,
): Promise<LoginResponse> => {
  const response = await api.post("/auth/register-with-application", {
    username: data.username,
    email: data.email,
    password: data.password,
    applicationId: data.applicationId,
  });
  return response.data;
};

export const registerAdmin = async (
  data: RegisterAdminData,
): Promise<LoginResponse> => {
  const response = await api.post("/auth/register-admin", {
    username: data.username,
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    role: data.role || "staff",
  });
  return response.data;
};

export const createInitialAdmin = async () => {
  const response = await api.post("/auth/create-initial-admin");
  return response.data;
};

// Default export for convenience
const authService = {
  login,
  logout,
  register,
  getCurrentUser,
  updatePassword,
  forgotPassword,
  resetPassword,
  checkApplicationStatus,
  registerWithApplication,
  registerAdmin,
  createInitialAdmin,
};

export default authService;
