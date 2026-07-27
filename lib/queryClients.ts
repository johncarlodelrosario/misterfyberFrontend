// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

// Configure Query Client with optimal defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data is considered fresh
      gcTime: 60 * 60 * 1000, // 1 hour - keep in cache
      refetchOnMount: false, // Don't refetch when component mounts
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on network reconnect
      retry: 1, // Only retry once on failure
      retryDelay: 1000, // Wait 1 second before retry
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Only run on client side
if (typeof window !== "undefined") {
  // Create localStorage persister
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "BILLING_APP_CACHE",
    throttleTime: 2000, // Fixed: changed from 'throttle' to 'throttleTime'
  });

  // Persist query cache to localStorage
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 60 * 60 * 1000, // Keep persisted data for 1 hour
    buster: "v1", // Version - increment to invalidate all cache
  });
}

// Utility to clear all cache
export const clearAllCache = () => {
  queryClient.clear();
  if (typeof window !== "undefined") {
    localStorage.removeItem("BILLING_APP_CACHE");
  }
};

// Utility to invalidate specific queries
export const invalidateBillingQueries = () => {
  queryClient.invalidateQueries({ queryKey: ["billing"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["users"] });
  queryClient.invalidateQueries({ queryKey: ["applications"] });
};
