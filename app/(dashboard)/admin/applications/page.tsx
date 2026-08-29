// app/(dashboard)/admin/applications/page.tsx - COMPLETE FIXED
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { ApplicationTable } from "@/components/admin/ApplicationTable";
import { getAllApplications } from "@/services/application";
import { getActiveBuildings } from "@/services/building";
import { getPlans } from "@/services/plan";
import {
  approveApplication,
  rejectApplication,
  deleteApplication,
  bulkDeleteApplications,
  patchApplication,
} from "@/services/application";
import { Building, Plan } from "@/services/application";

// Types
interface Application {
  _id: string;
  firstName: string;
  lastName: string;
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
  applicationId?: string;
  idImage?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  status: string;
  search: string;
  buildingId: string;
  page: number;
  limit: number;
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
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch applications with filters
  const fetchApplications = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else if (!hasInitialLoad) setLoading(true);
        setError(null);

        const params: any = {
          page: filters.page,
          limit: filters.limit,
        };

        if (filters.status && filters.status !== "all") {
          params.status = filters.status;
        }

        if (filters.search && filters.search.trim()) {
          params.search = filters.search.trim();
        }

        if (filters.buildingId && filters.buildingId !== "") {
          params.buildingId = filters.buildingId;
        }

        if (refresh) {
          params.forceRefresh = true;
        }

        console.log("Fetching applications with params:", params);

        const response = await getAllApplications(params);
        const data = response.data || [];

        setApplications(data);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(response.currentPage || 1);
        setHasInitialLoad(true);
      } catch (err: any) {
        console.error("Error fetching applications:", err);
        setError(err.message || "Failed to load applications");
        toast.error("Failed to load applications");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters, hasInitialLoad],
  );

  // Fetch buildings and plans for dropdowns
  const fetchMetadata = useCallback(async () => {
    try {
      const [buildingsRes, plansRes] = await Promise.all([
        getActiveBuildings(),
        getPlans(),
      ]);

      setBuildings(buildingsRes);
      setPlans(plansRes);
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchApplications();
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when filters change (page, status, buildingId)
  useEffect(() => {
    if (hasInitialLoad) {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.buildingId]);

  // Handle search with debounce
  useEffect(() => {
    if (!hasInitialLoad) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchApplications();
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
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && { page: 1 }),
    }));
  };

  const handleRefresh = () => {
    fetchApplications(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setFilters((prev) => ({ ...prev, page }));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(applications.map((app) => app._id));
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
      try {
        await approveApplication(id);
        toast.success("Application approved successfully!");
        await fetchApplications(true);
      } catch (error: any) {
        console.error("Error approving application:", error);
        toast.error(
          error?.response?.data?.message || "Failed to approve application",
        );
        throw error;
      }
    },
    [fetchApplications],
  );

  // Reject application handler
  const handleReject = useCallback(
    async (id: string) => {
      try {
        await rejectApplication(id);
        toast.success("Application rejected successfully!");
        await fetchApplications(true);
      } catch (error: any) {
        console.error("Error rejecting application:", error);
        toast.error(
          error?.response?.data?.message || "Failed to reject application",
        );
        throw error;
      }
    },
    [fetchApplications],
  );

  // Delete application handler
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteApplication(id);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success("Application deleted successfully!");
        await fetchApplications(true);
      } catch (error: any) {
        console.error("Error deleting application:", error);
        toast.error(
          error?.response?.data?.message || "Failed to delete application",
        );
        throw error;
      }
    },
    [fetchApplications],
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        await bulkDeleteApplications(ids);
        setSelectedIds([]);
        toast.success(`${ids.length} applications deleted successfully!`);
        await fetchApplications(true);
      } catch (error: any) {
        console.error("Error bulk deleting applications:", error);
        toast.error(
          error?.response?.data?.message || "Failed to delete applications",
        );
        throw error;
      }
    },
    [fetchApplications],
  );

  // Edit handler
  const handleEdit = useCallback(
    async (id: string, data: any) => {
      try {
        await patchApplication(id, data);
        toast.success("Application updated successfully!");
        await fetchApplications(true);
      } catch (error: any) {
        console.error("Error updating application:", error);
        toast.error(
          error?.response?.data?.message || "Failed to update application",
        );
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
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
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
          onStatusFilterChange={(value) => handleFilterChange("status", value)}
          onBuildingFilterChange={(value) =>
            handleFilterChange("buildingId", value)
          }
          onSearchChange={(value) => handleFilterChange("search", value)}
          onSearchSubmit={() => {
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = null;
            }
            fetchApplications();
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
