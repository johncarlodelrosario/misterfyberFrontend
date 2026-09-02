// frontend/src/services/billing.ts - COMPLETE FIXED - NO CACHE!

import api from "./api";

// ==================== TYPES ====================
export interface BillingCycle {
  _id: string;
  userId: any;
  applicationId?: any;
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
  pendingPlanChange?: {
    newPlanId: any;
    requestedAt: string;
    effectiveDate: string;
    status: "pending" | "approved" | "rejected";
  };
  installationFee: number;
  installationFeePaid: boolean;
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
  installationFee: number;
  installationFeeDueDays: number;
  earlyBillGenerationDays: number;
}

export interface Bill {
  _id: string;
  invoiceNumber: string;
  userId: any;
  applicationId?: any;
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
  applicationData?: any;
  installationFee: number;
  installationFeePaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== CACHE - TOTALLY DISABLED ====================
const BILLING_CACHE = new Map();
const CACHE_TTL = 0; // ZERO - NO CACHE!

const cacheManager = {
  get<T>(key: string): T | null {
    return null; // ALWAYS RETURN NULL!
  },
  set<T>(key: string, data: T): void {
    // DO NOTHING!
  },
  clear(): void {
    BILLING_CACHE.clear();
  },
  remove(key: string): void {
    BILLING_CACHE.delete(key);
  },
  forceRefresh(key: string): void {
    BILLING_CACHE.delete(key);
  },
};

// ==================== EVENT SYSTEM ====================
type BillingEventListener = (data: any) => void;

class BillingEventManager {
  private listeners: Map<string, Set<BillingEventListener>> = new Map();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
    try {
      this.ws = new WebSocket(`${wsUrl}/billing-events`);
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);
      this.ws.onclose = this.handleWebSocketClose.bind(this);
      this.ws.onopen = () => {
        console.log("✅ Billing WebSocket connected");
        this.reconnectAttempts = 0;
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.scheduleReconnect();
    }
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const { eventType, payload } = data;

      if (this.listeners.has(eventType)) {
        this.listeners.get(eventType)?.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error("Error in event listener:", e);
          }
        });
      }

      if (this.listeners.has("*")) {
        this.listeners.get("*")?.forEach((listener) => {
          try {
            listener(data);
          } catch (e) {
            console.error("Error in wildcard listener:", e);
          }
        });
      }

      // Clear cache on ANY event
      cacheManager.clear();
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }

  private handleWebSocketClose() {
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("⚠️ Max WebSocket reconnect attempts reached");
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  on(eventType: string, listener: BillingEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  off(eventType: string, listener: BillingEventListener): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  emit(eventType: string, data: any): void {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)?.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error("Error in local event listener:", e);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const billingEvents = new BillingEventManager();

// ==================== CACHE KEYS ====================
const CACHE_KEYS = {
  BILLING_CYCLES: "billing_cycles",
  BILLS: "bills",
  SETTINGS: "billing_settings",
  PENDING_PRO_RATED: "pending_pro_rated",
  PENDING_INSTALLATION: "pending_installation",
  PENDING_ACTIVATIONS: "pending_activations",
  DASHBOARD_DATA: "dashboard_data",
  CUSTOMERS: "customers",
};

function getCacheKey(prefix: string, params?: any): string {
  return `${prefix}_${params ? JSON.stringify(params) : ""}`;
}

// ==================== CLEAR CACHE ====================
export const clearBillingCache = (): void => {
  cacheManager.clear();
};

// ==================== DASHBOARD DATA - FORCE REFRESH ====================
export const fetchDashboardData = async (
  forceRefresh = false,
): Promise<any> => {
  try {
    // Always add forceRefresh=true para walang cache sa backend
    const url = forceRefresh
      ? "/billing/dashboard-data?forceRefresh=true"
      : "/billing/dashboard-data?forceRefresh=true"; // ALWAYS FORCE REFRESH!
    const response = await api.get(url);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

// ==================== BILLING ACTIONS ====================

export const startBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/start", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "started",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error starting billing:", error);
    throw error;
  }
};

export const startBillingForApplication = async (
  applicationId: string,
  data?: any,
): Promise<any> => {
  try {
    const response = await api.post("/billing/start", {
      applicationId,
      startDate: data?.installationDate,
      notes: data?.notes,
      includeInstallationFee: data?.includeInstallationFee,
    });
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "started",
      applicationId,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error starting billing for application:", error);
    throw error;
  }
};

export const stopBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/stop", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "stopped",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error stopping billing:", error);
    throw error;
  }
};

export const pauseBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/pause", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "paused",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error pausing billing:", error);
    throw error;
  }
};

export const resumeBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/resume", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "resumed",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error resuming billing:", error);
    throw error;
  }
};

export const disconnectClient = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/disconnect", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "disconnected",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error disconnecting client:", error);
    throw error;
  }
};

export const reconnectClient = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/reconnect", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "reconnected",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error reconnecting client:", error);
    throw error;
  }
};

export const deleteBillingCycle = async (data: any): Promise<any> => {
  try {
    const response = await api.delete("/billing/delete-cycle", { data });
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "deleted",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting billing cycle:", error);
    throw error;
  }
};

export const markBillAsPaid = async (
  billId: string,
  paymentData: any,
): Promise<any> => {
  try {
    const response = await api.put(`/billing/mark-paid/${billId}`, paymentData);
    cacheManager.clear();
    billingEvents.emit("payment_confirmed", {
      billId,
      paymentData,
      data: response.data,
    });
    // FORCE CLEAR AND EMIT
    billingEvents.emit("billing_updated", {
      type: "paid",
      billId,
      forceRefresh: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error marking bill as paid:", error);
    throw error;
  }
};

export const markInstallationBillAsPaid = async (
  billId: string,
  paymentData: any,
): Promise<any> => {
  try {
    const response = await api.put(
      `/billing/mark-installation-paid/${billId}`,
      paymentData,
    );
    cacheManager.clear();
    billingEvents.emit("payment_confirmed", {
      billId,
      type: "installation",
      paymentData,
      data: response.data,
    });
    billingEvents.emit("billing_updated", {
      type: "installation_paid",
      billId,
      forceRefresh: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error marking installation bill as paid:", error);
    throw error;
  }
};

export const confirmProRatedPayment = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/confirm-pro-rated", data);
    cacheManager.clear();
    billingEvents.emit("payment_confirmed", {
      type: "pro-rated",
      ...data,
      data: response.data,
    });
    billingEvents.emit("billing_updated", {
      type: "pro_rated_confirmed",
      forceRefresh: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error confirming pro-rated payment:", error);
    throw error;
  }
};

export const startMonthlyBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/start-monthly", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "monthly_started",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error starting monthly billing:", error);
    throw error;
  }
};

export const initializeBackdatedBilling = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/initialize-backdated", data);
    cacheManager.clear();
    billingEvents.emit("billing_updated", {
      type: "backdated_initialized",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error initializing backdated billing:", error);
    throw error;
  }
};

export const recoverMissingBills = async (data: any): Promise<any> => {
  try {
    const response = await api.post("/billing/recover-missing-bills", data);
    cacheManager.clear();
    billingEvents.emit("bills_recovered", {
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error recovering missing bills:", error);
    throw error;
  }
};

export const manuallyGenerateEarlyBill = async (data: any): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/manually-generate-early-bill",
      data,
    );
    cacheManager.clear();
    billingEvents.emit("bill_generated", {
      type: "early_bill",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error manually generating early bill:", error);
    throw error;
  }
};

export const autoGenerateEarlyBills = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-generate-early-bills");
    cacheManager.clear();
    billingEvents.emit("bill_generated", {
      type: "auto_early_bill",
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error auto-generating early bills:", error);
    throw error;
  }
};

export const checkForNewCustomers = async (
  forceRefresh?: boolean,
): Promise<any> => {
  try {
    const response = await api.get("/billing/check-new-customers");
    return {
      newCustomers: response.data?.data || [],
      totalNew: response.data?.total || 0,
    };
  } catch (error) {
    console.error("Error checking for new customers:", error);
    return { newCustomers: [], totalNew: 0 };
  }
};

export const getBillingSettingsAdmin = async (
  forceRefresh?: boolean,
): Promise<any> => {
  try {
    const response = await api.get("/billing/settings/admin");
    return response.data;
  } catch (error) {
    console.error("Error fetching admin billing settings:", error);
    throw error;
  }
};

export const updateBillingSettingsAdmin = async (data: any): Promise<any> => {
  try {
    const response = await api.put("/billing/settings/admin", data);
    cacheManager.clear();
    billingEvents.emit("settings_updated", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating admin billing settings:", error);
    throw error;
  }
};

export const autoGenerateMonthlyBills = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-generate");
    cacheManager.clear();
    billingEvents.emit("bills_generated", {
      type: "monthly",
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error auto-generating monthly bills:", error);
    throw error;
  }
};

export const autoSuspendOverdue = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-suspend");
    cacheManager.clear();
    billingEvents.emit("suspension_updated", {
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error auto-suspending overdue:", error);
    throw error;
  }
};

export const getUnpaidBillsReport = async (params?: any): Promise<any> => {
  try {
    const response = await api.get("/billing/unpaid-bills-report", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching unpaid bills report:", error);
    return { data: { bills: [], summary: {} } };
  }
};

// ==================== USER FUNCTIONS ====================
export const getUserBillingCycle = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching user billing cycle:", error);
    return null;
  }
};

export const getUserBillingSummary = async (): Promise<any> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    return null;
  }
};

export const getCurrentBill = async (): Promise<Bill | null> => {
  try {
    const response = await api.get("/billing/user/current");
    return response.data.data?.currentBill || null;
  } catch (error) {
    console.error("Error fetching current bill:", error);
    return null;
  }
};

export const getBillingHistory = async (params?: any): Promise<any> => {
  try {
    const response = await api.get("/billing/user/history", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return { data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const getBillingSettings = async (
  forceRefresh?: boolean,
): Promise<any> => {
  try {
    const response = await api.get("/billing/settings");
    return response.data;
  } catch (error) {
    console.error("Error fetching billing settings:", error);
    throw error;
  }
};

export const updateBillingSettings = async (data: any): Promise<any> => {
  try {
    const response = await api.put("/billing/settings", data);
    cacheManager.clear();
    billingEvents.emit("settings_updated", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating billing settings:", error);
    throw error;
  }
};

export const submitProRatedPayment = async (data: any): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-pro-rated",
      data,
    );
    cacheManager.clear();
    billingEvents.emit("payment_submitted", {
      type: "pro-rated",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting pro-rated payment:", error);
    throw error;
  }
};

export const submitMonthlyPayment = async (data: any): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-monthly",
      data,
    );
    cacheManager.clear();
    billingEvents.emit("payment_submitted", {
      type: "monthly",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting monthly payment:", error);
    throw error;
  }
};

export const submitInstallationPayment = async (data: any): Promise<any> => {
  try {
    const response = await api.post(
      "/billing/application/submit-installation",
      data,
    );
    cacheManager.clear();
    billingEvents.emit("payment_submitted", {
      type: "installation",
      ...data,
      data: response.data,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting installation payment:", error);
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

export const autoSendReminders = async (): Promise<any> => {
  try {
    const response = await api.post("/billing/auto-reminders");
    cacheManager.clear();
    return response.data;
  } catch (error) {
    console.error("Error auto-sending reminders:", error);
    throw error;
  }
};

// ==================== POLLING ====================
export const startRealtimePolling = (
  callback: (data: any) => void,
  interval: number = 5000,
): NodeJS.Timeout => {
  const poll = async () => {
    try {
      const result = await checkForNewCustomers(true);
      if (result.totalNew > 0) {
        callback(result);
        cacheManager.clear();
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  };

  poll();
  return setInterval(poll, interval);
};

export const stopRealtimePolling = (intervalId: NodeJS.Timeout): void => {
  clearInterval(intervalId);
};

export { billingEvents as BillingEvents };
