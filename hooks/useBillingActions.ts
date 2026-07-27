// hooks/useBillingActions.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  deleteBillingCycle,
  markBillAsPaid,
  markInstallationBillAsPaid,
  confirmProRatedPayment,
  startMonthlyBilling,
  startBillingForApplication,
} from "@/services/billing";
import { confirmPayment, rejectPayment } from "@/services/payment";

// ==================== TYPES ====================
interface StartBillingParams {
  userId?: string;
  applicationId?: string;
  startDate?: string;
  customAmount?: number;
  notes?: string;
  includeInstallationFee?: boolean;
}

interface StartBillingForAppParams {
  applicationId: string;
  installationDate?: string;
  notes?: string;
  includeInstallationFee?: boolean;
}

interface StopBillingParams {
  userId?: string;
  applicationId?: string;
  reason?: string;
}

interface PauseBillingParams {
  userId?: string;
  applicationId?: string;
  reason?: string;
  pauseUntilDate?: string;
}

interface DisconnectParams {
  userId?: string;
  applicationId?: string;
  reason?: string;
}

interface MarkBillPaidParams {
  billId: string;
  paymentData: {
    referenceNumber?: string;
    notes?: string;
  };
}

interface ConfirmProRatedParams {
  userId?: string;
  applicationId?: string;
  paymentDetails?: any;
}

// ==================== HOOKS ====================

/**
 * Hook for starting billing for a user
 */
export const useStartBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StartBillingParams) => startBilling(params),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("✅ Billing started successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start billing");
    },
  });
};

/**
 * Hook for starting billing for an application
 */
export const useStartBillingForApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StartBillingForAppParams) =>
      startBillingForApplication(params.applicationId, {
        installationDate: params.installationDate,
        notes: params.notes,
        includeInstallationFee: params.includeInstallationFee,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("✅ Billing started for application!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Failed to start billing for application",
      );
    },
  });
};

/**
 * Hook for stopping billing
 */
export const useStopBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StopBillingParams) => stopBilling(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("⛔ Billing stopped successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    },
  });
};

/**
 * Hook for pausing billing
 */
export const usePauseBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: PauseBillingParams) => pauseBilling(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("⏸️ Billing paused successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    },
  });
};

/**
 * Hook for resuming billing
 */
export const useResumeBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId?: string; applicationId?: string }) =>
      resumeBilling(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("▶️ Billing resumed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    },
  });
};

/**
 * Hook for disconnecting a client
 */
export const useDisconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DisconnectParams) => disconnectClient(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      toast.success("🔌 Client disconnected successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    },
  });
};

/**
 * Hook for reconnecting a client
 */
export const useReconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId?: string; applicationId?: string }) =>
      reconnectClient(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      toast.success("🔌 Client reconnected successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    },
  });
};

/**
 * Hook for deleting a billing cycle
 */
export const useDeleteBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { billingCycleId: string; applicationId?: string }) =>
      deleteBillingCycle(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("🗑️ Billing cycle deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    },
  });
};

/**
 * Hook for marking a bill as paid
 */
export const useMarkBillAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MarkBillPaidParams) =>
      markBillAsPaid(params.billId, params.paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("✅ Bill marked as paid successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    },
  });
};

/**
 * Hook for marking an installation bill as paid
 */
export const useMarkInstallationBillAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MarkBillPaidParams) =>
      markInstallationBillAsPaid(params.billId, params.paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInstallationBills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
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

/**
 * Hook for confirming a payment
 */
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => confirmPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("✅ Payment confirmed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    },
  });
};

/**
 * Hook for rejecting a payment
 */
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

/**
 * Hook for confirming pro-rated payment
 */
export const useConfirmProRatedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ConfirmProRatedParams) =>
      confirmProRatedPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingProRated"] });
      toast.success("✅ Pro-rated payment confirmed!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to confirm pro-rated payment",
      );
    },
  });
};

/**
 * Hook for starting monthly billing
 */
export const useStartMonthlyBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId?: string; applicationId?: string }) =>
      startMonthlyBilling(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingActivations"] });
      toast.success("✅ Monthly billing started!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to start monthly billing",
      );
    },
  });
};

// ==================== EXPORT ALL ====================
export default {
  useStartBilling,
  useStartBillingForApplication,
  useStopBilling,
  usePauseBilling,
  useResumeBilling,
  useDisconnectClient,
  useReconnectClient,
  useDeleteBillingCycle,
  useMarkBillAsPaid,
  useMarkInstallationBillAsPaid,
  useConfirmPayment,
  useRejectPayment,
  useConfirmProRatedPayment,
  useStartMonthlyBilling,
};
