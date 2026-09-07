// hooks/useBillingData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  // Existing functions from billing.ts
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  deleteBillingCycle,
  markBillAsPaid,
  markInstallationBillAsPaid,
  getBillingSettings,
  // New/renamed functions that exist in billing.ts
  getUserBillingCycle,
  getBillingSummaryAdmin,
  getUserBillingSummary,
  getCurrentBill,
  getBillingHistory,
  getUnpaidBillsReport,
  // Admin functions
  getBillingSettingsAdmin,
  updateBillingSettingsAdmin,
  // Auto functions
  autoGenerateMonthlyBills,
  autoSuspendOverdue,
  autoSendReminders,
  // Payment confirmation
  confirmProRatedPayment,
  startMonthlyBilling,
  // Mark as free
  markBillAsFree,
  markInstallationBillAsFree,
  // Initialize/recover
  initializeBackdatedBilling,
  recoverMissingBills,
  manuallyGenerateEarlyBill,
  autoGenerateEarlyBills,
  // Other
  submitProRatedPayment,
  submitMonthlyPayment,
  submitInstallationPayment,
  updateBillPrice,
} from "@/services/billing";
import {
  getPendingPayments,
  confirmPayment,
  rejectPayment,
} from "@/services/payment";
import {
  getAllUsers,
  getCustomersWithoutAccounts,
  getAllApplications,
} from "@/services/admin";
import toast from "react-hot-toast";

// ============ QUERY HOOKS ============

// Hook for user's current billing cycle
export const useUserBillingCycle = () => {
  return useQuery({
    queryKey: ["userBillingCycle"],
    queryFn: () => getUserBillingCycle(),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for user's billing summary
export const useUserBillingSummary = () => {
  return useQuery({
    queryKey: ["userBillingSummary"],
    queryFn: () => getUserBillingSummary(),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for current bill
export const useCurrentBill = () => {
  return useQuery({
    queryKey: ["currentBill"],
    queryFn: () => getCurrentBill(),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for billing history with pagination
export const useBillingHistory = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["billingHistory", page, limit],
    queryFn: () => getBillingHistory({ page, limit }),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for admin billing summary
export const useBillingSummaryAdmin = () => {
  return useQuery({
    queryKey: ["billingSummaryAdmin"],
    queryFn: () => getBillingSummaryAdmin(),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for unpaid bills report
export const useUnpaidBillsReport = (params?: any) => {
  return useQuery({
    queryKey: ["unpaidBillsReport", params],
    queryFn: () => getUnpaidBillsReport(params),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for admin billing settings
export const useBillingSettingsAdmin = () => {
  return useQuery({
    queryKey: ["billingSettingsAdmin"],
    queryFn: () => getBillingSettingsAdmin(),
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for user billing settings
export const useBillingSettings = () => {
  return useQuery({
    queryKey: ["billingSettings"],
    queryFn: () => getBillingSettings(),
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for all users
export const useAllUsers = (limit = 1000) => {
  return useQuery({
    queryKey: ["users", "all", limit],
    queryFn: () => getAllUsers({ limit, page: 1 }),
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for all applications
export const useAllApplications = (limit = 1000) => {
  return useQuery({
    queryKey: ["applications", "all", limit],
    queryFn: () => getAllApplications({ limit, page: 1 }),
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for pending payments
export const usePendingPayments = () => {
  return useQuery({
    queryKey: ["pendingPayments"],
    queryFn: () => getPendingPayments(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Hook for customers without accounts
export const useCustomersWithoutAccounts = () => {
  return useQuery({
    queryKey: ["customersWithoutAccounts"],
    queryFn: () => getCustomersWithoutAccounts(),
    staleTime: 10 * 60 * 1000,
  });
};

// ============ MUTATIONS ============

// Start billing
export const useStartBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Billing started successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
  });
};

// Stop billing
export const useStopBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("⛔ Billing stopped successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    },
  });
};

// Pause billing
export const usePauseBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      toast.success("⏸️ Billing paused successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    },
  });
};

// Resume billing
export const useResumeBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      toast.success("▶️ Billing resumed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    },
  });
};

// Mark bill as paid
export const useMarkBillAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData: any;
    }) => markBillAsPaid(billId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Bill marked as paid!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    },
  });
};

// Mark bill as free
export const useMarkBillAsFree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData?: any;
    }) => markBillAsFree(billId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Bill marked as free!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as free",
      );
    },
  });
};

// Mark installation bill as paid
export const useMarkInstallationBillAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData: any;
    }) => markInstallationBillAsPaid(billId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("✅ Installation bill marked as paid!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as paid",
      );
    },
  });
};

// Mark installation bill as free
export const useMarkInstallationBillAsFree = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData?: any;
    }) => markInstallationBillAsFree(billId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("✅ Installation bill marked as free!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to mark installation bill as free",
      );
    },
  });
};

// Confirm payment
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId }: { paymentId: string }) =>
      confirmPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      toast.success("✅ Payment confirmed!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    },
  });
};

// Reject payment
export const useRejectPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => rejectPayment(paymentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("❌ Payment rejected");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    },
  });
};

// Delete billing cycle
export const useDeleteBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBillingCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("🗑️ Billing cycle deleted!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    },
  });
};

// Disconnect client
export const useDisconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("🔌 Client disconnected!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    },
  });
};

// Reconnect client
export const useReconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reconnectClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("🔌 Client reconnected!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    },
  });
};

// Confirm pro-rated payment
export const useConfirmProRatedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      applicationId,
      paymentDetails,
    }: {
      userId?: string;
      applicationId?: string;
      paymentDetails?: any;
    }) => confirmProRatedPayment({ userId, applicationId, paymentDetails }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("✅ Pro-rated payment confirmed!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to confirm pro-rated payment",
      );
    },
  });
};

// Start monthly billing
export const useStartMonthlyBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      applicationId,
    }: {
      userId?: string;
      applicationId?: string;
    }) => startMonthlyBilling({ userId, applicationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("✅ Monthly billing started!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to start monthly billing",
      );
    },
  });
};

// Update admin billing settings
export const useUpdateBillingSettingsAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBillingSettingsAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSettingsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["billingSettings"] });
      toast.success("✅ Billing settings updated!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update billing settings",
      );
    },
  });
};

// Auto-generate monthly bills
export const useAutoGenerateMonthlyBills = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoGenerateMonthlyBills,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Monthly bills generated!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate monthly bills",
      );
    },
  });
};

// Auto-suspend overdue
export const useAutoSuspendOverdue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoSuspendOverdue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Overdue accounts suspended!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to suspend overdue accounts",
      );
    },
  });
};

// Auto-send reminders
export const useAutoSendReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoSendReminders,
    onSuccess: () => {
      toast.success("✅ Reminders sent!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send reminders");
    },
  });
};

// Initialize backdated billing
export const useInitializeBackdatedBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: initializeBackdatedBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingCycle"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("✅ Backdated billing initialized!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to initialize backdated billing",
      );
    },
  });
};

// Recover missing bills
export const useRecoverMissingBills = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recoverMissingBills,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Missing bills recovered!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to recover missing bills",
      );
    },
  });
};

// Manually generate early bill
export const useManuallyGenerateEarlyBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manuallyGenerateEarlyBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      toast.success("✅ Early bill generated!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate early bill",
      );
    },
  });
};

// Auto-generate early bills
export const useAutoGenerateEarlyBills = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoGenerateEarlyBills,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      toast.success("✅ Early bills generated!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to generate early bills",
      );
    },
  });
};

// Submit pro-rated payment
export const useSubmitProRatedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitProRatedPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      toast.success("✅ Pro-rated payment submitted!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to submit pro-rated payment",
      );
    },
  });
};

// Submit monthly payment
export const useSubmitMonthlyPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitMonthlyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      toast.success("✅ Monthly payment submitted!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to submit monthly payment",
      );
    },
  });
};

// Submit installation payment
export const useSubmitInstallationPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitInstallationPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("✅ Installation payment submitted!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to submit installation payment",
      );
    },
  });
};

// Update bill price
export const useUpdateBillPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ billId, newPrice }: { billId: string; newPrice: number }) =>
      updateBillPrice(billId, newPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingSummaryAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userBillingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["currentBill"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidBillsReport"] });
      toast.success("✅ Bill price updated!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update bill price",
      );
    },
  });
};

// ============ HOOK TO USE BILLING EVENTS ============
export const useBillingEvents = () => {
  // This hook can be used to subscribe to WebSocket events
  // Usage: const { on, off } = useBillingEvents();
  // on('refresh', (data) => console.log('Refresh event:', data));

  const subscribe = (eventType: string, callback: (data: any) => void) => {
    // Import billingEvents dynamically to avoid circular dependencies
    const { billingEvents } = require("@/services/billing");
    return billingEvents.on(eventType, callback);
  };

  return { subscribe };
};
