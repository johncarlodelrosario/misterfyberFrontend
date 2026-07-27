// hooks/useBillingData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllBillingCycles,
  getAllBills,
  getBillingSettings,
  startBilling,
  stopBilling,
  pauseBilling,
  resumeBilling,
  disconnectClient,
  reconnectClient,
  deleteBillingCycle,
  markBillAsPaid,
  markInstallationBillAsPaid,
  getPendingProRatedBills,
  getPendingInstallationBills,
  getPendingActivations,
  confirmProRatedPayment,
  startMonthlyBilling,
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

// Hook for billing cycles with pagination
export const useBillingCycles = (page = 1, limit = 20, status = "all") => {
  return useQuery({
    queryKey: ["billingCycles", page, limit, status],
    queryFn: () => getAllBillingCycles({ page, limit, status }),
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for bills with pagination
export const useBills = (page = 1, limit = 20, status = "all") => {
  return useQuery({
    queryKey: ["bills", page, limit, status],
    queryFn: () => getAllBills({ page, limit, status }),
    staleTime: 5 * 60 * 1000,
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

// Hook for pending installation bills
export const usePendingInstallationBills = () => {
  return useQuery({
    queryKey: ["pendingInstallationBills"],
    queryFn: () => getPendingInstallationBills(),
    staleTime: 2 * 60 * 1000,
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

export const useStartBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startBilling,
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

export const useStopBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("⛔ Billing stopped successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to stop billing");
    },
  });
};

export const usePauseBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      toast.success("⏸️ Billing paused successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pause billing");
    },
  });
};

export const useResumeBilling = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      toast.success("▶️ Billing resumed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resume billing");
    },
  });
};

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
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      toast.success("✅ Bill marked as paid!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to mark bill as paid",
      );
    },
  });
};

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
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInstallationBills"] });
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

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId }: { paymentId: string }) =>
      confirmPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("✅ Payment confirmed!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    },
  });
};

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

export const useDeleteBillingCycle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBillingCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["billingCycles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("🗑️ Billing cycle deleted!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete billing cycle",
      );
    },
  });
};

export const useDisconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("🔌 Client disconnected!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to disconnect client",
      );
    },
  });
};

export const useReconnectClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reconnectClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("🔌 Client reconnected!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reconnect client",
      );
    },
  });
};

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

export const useGetPendingProRatedBills = () => {
  return useQuery({
    queryKey: ["pendingProRatedBills"],
    queryFn: () => getPendingProRatedBills(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetPendingActivations = () => {
  return useQuery({
    queryKey: ["pendingActivations"],
    queryFn: () => getPendingActivations(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetBillingSettings = () => {
  return useQuery({
    queryKey: ["billingSettings"],
    queryFn: () => getBillingSettings(),
    staleTime: 10 * 60 * 1000,
  });
};
