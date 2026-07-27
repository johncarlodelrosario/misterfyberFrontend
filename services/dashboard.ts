// services/dashboard.ts
import api from "./api";

// Types
export interface DashboardData {
  billingCycles: any[];
  bills: any[];
  users: any[];
  applications: any[];
  pendingPayments: any[];
  pendingInstallation: any[];
  customersWithoutAccounts: any[];
  stats: DashboardStats;
}

export interface DashboardStats {
  totalCustomers: number;
  totalBalance: number;
  customersWithBalance: number;
  overdueCustomers: number;
  activeCycles: number;
  pausedCycles: number;
  pendingProRated: number;
  pendingActivations: number;
  pendingPaymentsCount: number;
  pendingInstallationCount: number;
  applicationsWithoutBilling: number;
  totalInstallationFeesDue: number;
  installationFeesPaid: number;
}

// Single endpoint for all dashboard data
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await api.get("/billing/dashboard-data");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

// Lightweight endpoint for stats only
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await api.get("/billing/dashboard-stats");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

// Check if data has changed (lightweight)
export const checkForUpdates = async (
  lastUpdated: string,
): Promise<boolean> => {
  try {
    const response = await api.get("/billing/has-updates", {
      params: { lastUpdated },
    });
    return response.data.hasUpdates;
  } catch (error) {
    console.error("Error checking for updates:", error);
    return false;
  }
};
