// app/(dashboard)/admin/applications/page.tsx - COMPLETE FIXED - FILTER WORKS 100% + NAME SORT
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { ApplicationTable } from "@/components/admin/ApplicationTable";
import {
  getAllApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  bulkDeleteApplications,
  patchApplication,
} from "@/services/application";
import { getActiveBuildings } from "@/services/building";
import { getPlans } from "@/services/plan";
import { Building, Plan } from "@/services/application";

// Types
interface Application {
  _id: string;
  id?: string;
  applicationId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  buildingId: string | { _id: string; buildingName: string };
  tower: string;
  floor: string;
  unitNumber: string;
  planId: string | { _id: string; name: string; price: number };
  status: "pending" | "approved" | "rejected" | "suspended";
  idType: string;
  idNumber: string;
  macAddress?: string;
  adminNotes?: string;
  notes?: string;
  idImage?: string;
  idImageUrl?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  billingStarted?: boolean;
  registeredUserId?: string;
  hasAccount?: boolean;
  serviceStatus?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
}

interface Filters {
  status: string;
  search: string;
  buildingId: string;
  page: number;
  limit: number;
  nameSort: string;
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    search: "",
    buildingId: "",
    page: 1,
    limit: 20,
    nameSort: "none",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCounter = useRef(0);
  const hasInitialLoadRef = useRef(false);
  const filtersRef = useRef(filters);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ Keep filtersRef in sync with latest filters
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Get application ID consistently
  const getAppId = useCallback((app: Application): string => {
    return app._id || app.id || app.applicationId || "";
  }, []);

  // ✅ FIXED: Fetch applications with AbortController - NO isFetchingRef guard
  const fetchApplications = useCallback(
    async (refresh = false, overrideFilters?: Partial<Filters>) => {
      // ✅ Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log("🛑 Aborted previous request");
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (refresh) {
          setIsRefreshing(true);
          refreshCounter.current += 1;
        } else if (!hasInitialLoadRef.current) {
          setLoading(true);
        }
        setError(null);

        // Use override filters if provided, otherwise use ref (latest)
        const currentFilters = {
          ...filtersRef.current,
          ...overrideFilters,
        };

        const params: any = {
          page: currentFilters.page,
          limit: currentFilters.limit,
        };

        if (currentFilters.status && currentFilters.status !== "all") {
          params.status = currentFilters.status;
        }

        if (currentFilters.search && currentFilters.search.trim()) {
          params.search = currentFilters.search.trim();
        }

        if (currentFilters.buildingId && currentFilters.buildingId !== "") {
          params.buildingId = currentFilters.buildingId;
        }

        // ✅ Name sort param
        if (currentFilters.nameSort && currentFilters.nameSort !== "none") {
          params.nameSort = currentFilters.nameSort;
        }

        // Add cache-busting param for refresh
        if (refresh) {
          params.forceRefresh = "true";
          params._t = Date.now() + refreshCounter.current;
        }

        console.log("🔄 Fetching applications with params:", params);

        // ✅ Pass abort signal
        const response = await getAllApplications(params, controller.signal);

        // ✅ Skip state update if aborted
        if (controller.signal.aborted) {
          console.log("⏭️ Request was aborted, skipping state update");
          return;
        }

        const data = response.data || [];

        // Ensure each application has an _id
        const mappedData = data.map((app: any) => {
          if (!app._id && app.id) {
            app._id = app.id;
          }
          if (!app._id && app.applicationId) {
            app._id = app.applicationId;
          }
          return app;
        });

        setApplications(mappedData);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(response.currentPage || 1);
        hasInitialLoadRef.current = true;

        console.log(
          `✅ Loaded ${mappedData.length} applications, Total: ${response.total}`,
        );

        if (refresh) {
          toast.success("📋 Data refreshed successfully!");
        }
      } catch (err: any) {
        // ✅ Ignore abort errors
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          console.log("🛑 Request aborted");
          return;
        }

        console.error("❌ Error fetching applications:", err);
        setError(err.message || "Failed to load applications");
        if (!refresh) {
          toast.error("Failed to load applications");
        }
      } finally {
        // ✅ Only set loading false if this controller is still current
        if (abortControllerRef.current === controller) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  // Fetch buildings and plans for dropdowns
  const fetchMetadata = useCallback(async () => {
    try {
      const [buildingsRes, plansRes] = await Promise.all([
        getActiveBuildings(),
        getPlans(),
      ]);

      setBuildings(buildingsRes || []);
      setPlans(plansRes || []);
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  }, []);

  // ✅ Initial load - only once
  useEffect(() => {
    console.log("🚀 Initial load");
    fetchApplications();
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ FIXED: Filter changes (page, status, buildingId, nameSort)
  useEffect(() => {
    // Skip if not initial load yet
    if (!hasInitialLoadRef.current) return;

    // Clear any pending timeout
    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    console.log("🔍 Filter changed, scheduling fetch...", {
      page: filters.page,
      status: filters.status,
      buildingId: filters.buildingId,
      nameSort: filters.nameSort,
    });

    // Debounce filter changes slightly
    filterChangeTimeoutRef.current = setTimeout(() => {
      console.log("🔍 Executing filter fetch...");
      fetchApplications(false, filters);
    }, 150);

    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.buildingId, filters.nameSort]);

  // ✅ Search with debounce (separate from other filters)
  useEffect(() => {
    if (!hasInitialLoadRef.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      console.log("🔍 Search debounce triggered");
      fetchApplications(false, filters);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: any) => {
    console.log(`🔧 Filter change: ${key} = ${value}`);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset page to 1 when changing filters (except page itself)
      ...(key !== "page" && { page: 1 }),
    }));
  };

  const handleRefresh = useCallback(async () => {
    await fetchApplications(true);
  }, [fetchApplications]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setFilters((prev) => ({ ...prev, page }));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = applications.map((app) => getAppId(app)).filter(Boolean);
      setSelectedIds(ids);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleViewApplication = (id: string) => {
    router.push(`/admin/applications/${id}`);
  };

  const handleEditApplication = (id: string) => {
    router.push(`/admin/applications/${id}/edit`);
  };

  // Approve application handler
  const handleApprove = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot approve: No ID found");
        return;
      }

      try {
        console.log("✅ Approving application:", id);
        const result = await approveApplication(id);
        console.log("✅ Approve result:", result);

        toast.success("✅ Application approved successfully!");

        await fetchApplications(true);
      } catch (error: any) {
        console.error("❌ Error approving application:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to approve application";
        toast.error(message);
        throw error;
      }
    },
    [fetchApplications],
  );

  // Reject application handler
  const handleReject = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot reject: No ID found");
        return;
      }

      try {
        console.log("❌ Rejecting application:", id);
        const result = await rejectApplication(id);
        console.log("❌ Reject result:", result);

        toast.success("❌ Application rejected successfully!");

        await fetchApplications(true);
      } catch (error: any) {
        console.error("❌ Error rejecting application:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to reject application";
        toast.error(message);
        throw error;
      }
    },
    [fetchApplications],
  );

  // Delete application handler
  const handleDelete = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot delete: No ID found");
        return;
      }

      try {
        console.log("🗑️ Deleting application:", id);
        await deleteApplication(id);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success("🗑️ Application deleted successfully!");

        await fetchApplications(true);
      } catch (error: any) {
        console.error("❌ Error deleting application:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete application";
        toast.error(message);
        throw error;
      }
    },
    [fetchApplications],
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        toast.error("No applications selected for deletion");
        return;
      }

      try {
        console.log("🗑️ Bulk deleting applications:", ids);
        await bulkDeleteApplications(ids);
        setSelectedIds([]);
        toast.success(`🗑️ ${ids.length} applications deleted successfully!`);

        await fetchApplications(true);
      } catch (error: any) {
        console.error("❌ Error bulk deleting applications:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete applications";
        toast.error(message);
        throw error;
      }
    },
    [fetchApplications],
  );

  // Edit handler
  const handleEdit = useCallback(
    async (id: string, data: any) => {
      if (!id) {
        toast.error("Cannot update: No ID found");
        return;
      }

      try {
        console.log("✏️ Updating application:", id, data);
        await patchApplication(id, data);
        toast.success("✅ Application updated successfully!");

        await fetchApplications(true);
      } catch (error: any) {
        console.error("❌ Error updating application:", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update application";
        toast.error(message);
        throw error;
      }
    },
    [fetchApplications],
  );

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
  ];

  // Memoized stats
  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const suspended = applications.filter(
      (a) => a.status === "suspended",
    ).length;

    return { total, pending, approved, rejected, suspended };
  }, [applications, total]);

  if (error && !loading) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Error loading applications</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all customer applications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          {isRefreshing && (
            <span className="text-sm text-gray-500">Refreshing...</span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-100">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-100">
          <p className="text-sm text-green-700">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-100">
          <p className="text-sm text-red-700">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Table with Filters Integrated */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <ApplicationTable
          applications={applications}
          isLoading={loading}
          loading={loading}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onView={handleViewApplication}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          buildings={buildings}
          plans={plans}
          statusFilter={filters.status}
          buildingFilter={filters.buildingId}
          searchQuery={filters.search}
          nameSortFilter={filters.nameSort}
          onStatusFilterChange={(value) => handleFilterChange("status", value)}
          onBuildingFilterChange={(value) =>
            handleFilterChange("buildingId", value)
          }
          onSearchChange={(value) => handleFilterChange("search", value)}
          onNameSortChange={(value) => handleFilterChange("nameSort", value)}
          onSearchSubmit={() => {
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = null;
            }
            fetchApplications(false, filters);
          }}
          statusOptions={statusOptions}
          total={total}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
