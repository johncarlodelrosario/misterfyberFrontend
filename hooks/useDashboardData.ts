// hooks/useDashboardData.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardData,
  fetchDashboardStats,
  checkForUpdates,
} from "@/services/dashboard";
import { useEffect, useState } from "react";

export const useDashboardData = () => {
  const queryClient = useQueryClient();
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);

  // Main data query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Background update check
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for updates every 30 seconds only if data exists
    const interval = setInterval(() => {
      if (!data) return;

      const checkForBackgroundUpdates = async () => {
        try {
          const lastUpdated =
            localStorage.getItem("billing_last_updated") ||
            new Date().toISOString();
          const hasUpdates = await checkForUpdates(lastUpdated);

          if (hasUpdates && !isBackgroundUpdating) {
            setIsBackgroundUpdating(true);
            await refetch();
            localStorage.setItem(
              "billing_last_updated",
              new Date().toISOString(),
            );
            setIsBackgroundUpdating(false);
          }
        } catch (error) {
          console.error("Background update check failed:", error);
        }
      };

      checkForBackgroundUpdates();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [data, refetch, isBackgroundUpdating]);

  // Save last updated timestamp
  useEffect(() => {
    if (data) {
      localStorage.setItem("billing_last_updated", new Date().toISOString());
    }
  }, [data]);

  // Memoized data processing
  const processedData = data
    ? {
        billingCycles: data.billingCycles || [],
        bills: data.bills || [],
        users: data.users || [],
        applications: data.applications || [],
        pendingPayments: data.pendingPayments || [],
        pendingInstallation: data.pendingInstallation || [],
        customersWithoutAccounts: data.customersWithoutAccounts || [],
        stats: data.stats || {
          totalCustomers: 0,
          totalBalance: 0,
          customersWithBalance: 0,
          overdueCustomers: 0,
          activeCycles: 0,
          pausedCycles: 0,
          pendingProRated: 0,
          pendingActivations: 0,
          pendingPaymentsCount: 0,
          pendingInstallationCount: 0,
          applicationsWithoutBilling: 0,
          totalInstallationFeesDue: 0,
          installationFeesPaid: 0,
        },
      }
    : null;

  return {
    data: processedData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isBackgroundUpdating,
    // Utility to manually update
    updateData: async () => {
      await refetch();
      localStorage.setItem("billing_last_updated", new Date().toISOString());
    },
  };
};

// Hook for stats only (lighter weight)
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

// Hook to check if data is loading
export const useIsDashboardLoading = () => {
  const { isLoading, isFetching } = useDashboardData();
  return isLoading || isFetching;
};
