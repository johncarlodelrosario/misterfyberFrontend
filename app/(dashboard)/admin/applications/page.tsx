// app/(dashboard)/admin/applications/page.tsx - COMPLETE FIXED
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import ApplicationTable from "@/components/admin/ApplicationTable";
import { getAllApplications } from "@/services/application";
import { getActiveBuildings } from "@/services/building";
import { getPlans } from "@/services/plan";
import { approveApplication, rejectApplication } from "@/services/application";

// Types
interface Application {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  buildingId: {
    _id: string;
    buildingName: string;
  };
  tower: string;
  floor: string;
  unitNumber: string;
  planId: {
    _id: string;
    name: string;
    price: number;
  };
  status: "pending" | "approved" | "rejected";
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
  const [buildings, setBuildings] = useState<
    { _id: string; buildingName: string }[]
  >([]);
  const [plans, setPlans] = useState<
    { _id: string; name: string; price: number }[]
  >([]);
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
        if (filters.search) {
          params.search = filters.search;
        }
        if (filters.buildingId) {
          params.buildingId = filters.buildingId;
        }

        if (refresh) {
          params.forceRefresh = true;
        }

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

      setBuildings(
        buildingsRes.map((b: any) => ({
          _id: b._id,
          buildingName: b.buildingName,
        })),
      );

      setPlans(
        plansRes.map((p: any) => ({
          _id: p._id,
          name: p.name,
          price: p.price,
        })),
      );
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchApplications();
    fetchMetadata();
  }, []);

  // Refresh when filters change
  useEffect(() => {
    if (hasInitialLoad) {
      fetchApplications();
    }
  }, [filters.page, filters.status, filters.buildingId]);

  // Handle search with debounce
  useEffect(() => {
    if (!hasInitialLoad) return;
    const debounceTimer = setTimeout(() => {
      fetchApplications();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters.search]);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && { page: 1 }),
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
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

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  // Memoized stats
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;

    return { total, pending, approved, rejected };
  }, [applications]);

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
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Building Filter */}
          <select
            value={filters.buildingId}
            onChange={(e) => handleFilterChange("buildingId", e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
          >
            <option value="">All Buildings</option>
            {buildings.map((b) => (
              <option key={b._id} value={b._id}>
                {b.buildingName}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <ApplicationTable
          applications={applications}
          loading={loading}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onView={handleViewApplication}
          onEdit={handleEditApplication}
          onRefresh={handleRefresh}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {applications.length} of {total} applications
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
