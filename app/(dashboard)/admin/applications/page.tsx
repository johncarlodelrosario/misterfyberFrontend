// app/(dashboard)/admin/applications/page.tsx - ULTRA FAST
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ApplicationTable from "@/components/admin/ApplicationTable";
import { getAllApplications } from "@/services/application";
import {
  approveApplication,
  rejectApplication,
  startBillingForApplication,
} from "@/services/admin";
import { toast } from "sonner";

// Super fast LRU cache
const applicationCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_ITEMS = 20;

function getCachedApplications(key: string): any | null {
  const cached = applicationCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    applicationCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedApplications(key: string, data: any): void {
  if (applicationCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = applicationCache.keys().next().value;
    if (firstKey) applicationCache.delete(firstKey);
  }
  applicationCache.set(key, { data, timestamp: Date.now() });
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchApplications = useCallback(
    async (
      page: number,
      status: string,
      building: string,
      search: string,
      forceRefresh = false,
    ) => {
      if (!isMounted.current) return;

      // Clear any pending timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      setIsLoading(true);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const cacheKey = `apps_${page}_${status}_${building}_${search}`;

      // Try cache first (super fast!)
      if (!forceRefresh) {
        const cached = getCachedApplications(cacheKey);
        if (cached) {
          setApplications(cached.data || []);
          setTotal(cached.total || 0);
          setTotalPages(cached.totalPages || 1);
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await getAllApplications({
          page,
          limit: 20,
          status: status === "all" ? undefined : status,
          buildingId: building === "all" ? undefined : building,
          search: search || undefined,
        });

        if (!isMounted.current) return;

        const data = response.data || [];
        const totalCount = response.total || 0;
        const pages = response.totalPages || 1;

        setApplications(data);
        setTotal(totalCount);
        setTotalPages(pages);

        // Cache the result
        setCachedApplications(cacheKey, {
          data,
          total: totalCount,
          totalPages: pages,
        });
      } catch (error: any) {
        if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error fetching applications:", error);
        toast.error("Failed to load applications");
        setApplications([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  // Initial load with debounce
  useEffect(() => {
    isMounted.current = true;

    // Debounce initial load
    const timeoutId = setTimeout(() => {
      fetchApplications(currentPage, statusFilter, buildingFilter, searchQuery);
    }, 100);

    return () => {
      isMounted.current = false;
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [
    currentPage,
    statusFilter,
    buildingFilter,
    searchQuery,
    fetchApplications,
  ]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchApplications(
      currentPage,
      statusFilter,
      buildingFilter,
      searchQuery,
      true,
    );
  }, [
    currentPage,
    statusFilter,
    buildingFilter,
    searchQuery,
    fetchApplications,
  ]);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);

  const handleBuildingFilterChange = useCallback((building: string) => {
    setBuildingFilter(building);
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await approveApplication(id);
        // Silent refresh in background
        fetchApplications(
          currentPage,
          statusFilter,
          buildingFilter,
          searchQuery,
          true,
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to approve application",
        );
        throw error;
      }
    },
    [currentPage, statusFilter, buildingFilter, searchQuery, fetchApplications],
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        await rejectApplication(id);
        fetchApplications(
          currentPage,
          statusFilter,
          buildingFilter,
          searchQuery,
          true,
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to reject application",
        );
        throw error;
      }
    },
    [currentPage, statusFilter, buildingFilter, searchQuery, fetchApplications],
  );

  const handleStartBilling = useCallback(
    async (id: string) => {
      try {
        await startBillingForApplication(id);
        fetchApplications(
          currentPage,
          statusFilter,
          buildingFilter,
          searchQuery,
          true,
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to start billing",
        );
        throw error;
      }
    },
    [currentPage, statusFilter, buildingFilter, searchQuery, fetchApplications],
  );

  const handleApplicationAdded = useCallback(() => {
    fetchApplications(
      currentPage,
      statusFilter,
      buildingFilter,
      searchQuery,
      true,
    );
  }, [
    currentPage,
    statusFilter,
    buildingFilter,
    searchQuery,
    fetchApplications,
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-gray-500">
            Manage customer applications and subscriptions
          </p>
        </div>
        {isLoading && applications.length === 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      <ApplicationTable
        applications={applications}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onRefresh={handleRefresh}
        onStatusFilterChange={handleStatusFilterChange}
        onBuildingFilterChange={handleBuildingFilterChange}
        onSearch={handleSearch}
        onApprove={handleApprove}
        onReject={handleReject}
        onStartBilling={handleStartBilling}
        onApplicationAdded={handleApplicationAdded}
      />
    </div>
  );
}
