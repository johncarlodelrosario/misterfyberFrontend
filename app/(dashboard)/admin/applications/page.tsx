// app/(dashboard)/admin/applications/page.tsx - COMPLETE FIXED - FILTER WORKS 100% + NAME SORT + REPORT DOWNLOAD + DISCONNECTED STATUS
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { ApplicationTable } from "@/components/admin/ApplicationTable";
import ApplicationReportDownload from "@/components/admin/ApplicationReportDownload";
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
  // ✅ ADDED "disconnected"
  status: "pending" | "approved" | "rejected" | "suspended" | "disconnected";
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
  // ✅ ADDED disconnect fields
  disconnectedAt?: string;
  disconnectReason?: string;
  reconnectedAt?: string;
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
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCounter = useRef(0);
  const hasInitialLoadRef = useRef(false);
  const filtersRef = useRef(filters);
  const abortControllerRef = useRef<AbortController | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync filtersRef
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get application ID
  const getAppId = useCallback((app: Application): string => {
    return app._id || app.id || app.applicationId || "";
  }, []);

  // Get building name
  const getBuildingName = useCallback(
    (app: Application): string => {
      if (typeof app.buildingId === "object" && app.buildingId !== null) {
        return app.buildingId.buildingName || "N/A";
      }
      const building = buildings.find((b) => b._id === app.buildingId);
      return building?.buildingName || "N/A";
    },
    [buildings],
  );

  // Get plan name
  const getPlanName = useCallback(
    (app: Application): string => {
      if (typeof app.planId === "object" && app.planId !== null) {
        return app.planId.name || "N/A";
      }
      const plan = plans.find((p) => p._id === app.planId);
      return plan?.name || "N/A";
    },
    [plans],
  );

  // Get plan price
  const getPlanPrice = useCallback(
    (app: Application): number => {
      if (typeof app.planId === "object" && app.planId !== null) {
        return app.planId.price || 0;
      }
      const plan = plans.find((p) => p._id === app.planId);
      return plan?.price || 0;
    },
    [plans],
  );

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  }, []);

  // Fetch ALL applications for report (no limit)
  const fetchAllApplicationsForReport = useCallback(
    async (reportFilters?: {
      buildingId?: string;
      status?: string;
      search?: string;
    }): Promise<Application[]> => {
      console.log("📊 Fetching ALL applications for report...");

      const params: any = {
        page: 1,
        limit: 10000,
      };

      if (reportFilters?.buildingId) {
        params.buildingId = reportFilters.buildingId;
      }
      if (reportFilters?.status && reportFilters.status !== "all") {
        params.status = reportFilters.status;
      }
      if (reportFilters?.search) {
        params.search = reportFilters.search;
      }

      const response = await getAllApplications(params);
      console.log(
        `✅ Fetched ${response.data?.length || 0} applications for report`,
      );

      return response.data || [];
    },
    [],
  );

  // Quick export Excel (current page only)
  const handleExportExcel = useCallback(() => {
    try {
      if (applications.length === 0) {
        toast.error("No applications to export");
        return;
      }

      setIsExporting(true);

      const headers = [
        "Application ID",
        "First Name",
        "Middle Name",
        "Last Name",
        "Email",
        "Phone Number",
        "Building",
        "Tower",
        "Floor",
        "Unit Number",
        "Plan",
        "Plan Price",
        "Status",
        "ID Type",
        "ID Number",
        "MAC Address",
        "Installation Fee",
        "Installation Fee Paid",
        "Billing Started",
        "Has Account",
        "Service Status",
        "Submitted At",
        "Created At",
      ];

      const rows = applications.map((app) => [
        app.applicationId || getAppId(app),
        app.firstName || "",
        app.middleName || "",
        app.lastName || "",
        app.email || "",
        app.phoneNumber || "",
        getBuildingName(app),
        app.tower || "",
        app.floor || "",
        app.unitNumber || "",
        getPlanName(app),
        getPlanPrice(app).toString(),
        app.status || "",
        app.idType || "",
        app.idNumber || "",
        app.macAddress || "",
        (app.installationFee || 0).toString(),
        app.installationFeePaid ? "Yes" : "No",
        app.billingStarted ? "Yes" : "No",
        app.hasAccount ? "Yes" : "No",
        app.serviceStatus || "",
        formatDate(app.submittedAt),
        formatDate(app.createdAt),
      ]);

      const escapeCSV = (value: string): string => {
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `applications-report-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `📊 Excel report downloaded (${applications.length} records)`,
      );
      setShowExportMenu(false);
    } catch (err) {
      console.error("❌ Error exporting Excel:", err);
      toast.error("Failed to export Excel report");
    } finally {
      setIsExporting(false);
    }
  }, [
    applications,
    getAppId,
    getBuildingName,
    getPlanName,
    getPlanPrice,
    formatDate,
  ]);

  // Quick export PDF (current page only)
  const handleExportPDF = useCallback(async () => {
    try {
      if (applications.length === 0) {
        toast.error("No applications to export");
        return;
      }

      setIsExporting(true);

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const timestamp = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Applications Report", 14, 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);

      let filterInfo = `Generated: ${timestamp}`;
      filterInfo += `  |  Total Records: ${applications.length}`;

      if (filters.status && filters.status !== "all") {
        filterInfo += `  |  Status: ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`;
      }
      if (filters.buildingId) {
        const building = buildings.find((b) => b._id === filters.buildingId);
        if (building) filterInfo += `  |  Building: ${building.buildingName}`;
      }
      if (filters.search) {
        filterInfo += `  |  Search: "${filters.search}"`;
      }

      doc.text(filterInfo, 14, 22);

      const tableHeaders = [
        [
          "ID",
          "Name",
          "Email",
          "Phone",
          "Building",
          "Unit",
          "Plan",
          "Status",
          "Submitted",
        ],
      ];

      const tableBody = applications.map((app) => [
        (app.applicationId || getAppId(app)).substring(0, 12),
        `${app.firstName || ""} ${app.lastName || ""}`.trim() || "N/A",
        app.email || "N/A",
        app.phoneNumber || "N/A",
        getBuildingName(app),
        `${app.tower || ""}${app.tower && app.unitNumber ? "-" : ""}${app.unitNumber || ""}` ||
          "N/A",
        getPlanName(app),
        (app.status || "").charAt(0).toUpperCase() +
          (app.status || "").slice(1),
        formatDate(app.submittedAt),
      ]);

      // ✅ ADDED disconnected color
      const getStatusColor = (status: string): [number, number, number] => {
        switch (status) {
          case "approved":
            return [22, 163, 74];
          case "pending":
            return [202, 138, 4];
          case "rejected":
            return [220, 38, 38];
          case "suspended":
            return [107, 114, 128];
          case "disconnected":
            return [75, 85, 99];
          default:
            return [0, 0, 0];
        }
      };

      autoTable(doc, {
        head: tableHeaders,
        body: tableBody,
        startY: 28,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 7.5,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 35 },
          2: { cellWidth: 42 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 },
          5: { cellWidth: 20 },
          6: { cellWidth: 28 },
          7: { cellWidth: 20, halign: "center" },
          8: { cellWidth: 35 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 7) {
            const status = data.cell.raw as string;
            const color = getStatusColor(status.toLowerCase());
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10,
          );
          doc.text(
            "Applications Report - Confidential",
            doc.internal.pageSize.width - data.settings.margin.right,
            doc.internal.pageSize.height - 10,
            { align: "right" },
          );
        },
      });

      const dateStr = new Date().toISOString().split("T")[0];
      doc.save(`applications-report-${dateStr}.pdf`);

      toast.success(
        `📄 PDF report downloaded (${applications.length} records)`,
      );
      setShowExportMenu(false);
    } catch (err) {
      console.error("❌ Error exporting PDF:", err);
      toast.error("Failed to export PDF report");
    } finally {
      setIsExporting(false);
    }
  }, [
    applications,
    filters,
    buildings,
    getAppId,
    getBuildingName,
    getPlanName,
    formatDate,
  ]);

  // Fetch applications
  const fetchApplications = useCallback(
    async (refresh = false, overrideFilters?: Partial<Filters>) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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

        if (currentFilters.nameSort && currentFilters.nameSort !== "none") {
          params.nameSort = currentFilters.nameSort;
        }

        if (refresh) {
          params.forceRefresh = "true";
          params._t = Date.now() + refreshCounter.current;
        }

        const response = await getAllApplications(params, controller.signal);

        if (controller.signal.aborted) return;

        const data = response.data || [];

        const mappedData = data.map((app: any) => {
          if (!app._id && app.id) app._id = app.id;
          if (!app._id && app.applicationId) app._id = app.applicationId;
          return app;
        });

        setApplications(mappedData);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 0);
        setCurrentPage(response.currentPage || 1);
        hasInitialLoadRef.current = true;

        if (refresh) {
          toast.success("📋 Data refreshed successfully!");
        }
      } catch (err: any) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;

        console.error("❌ Error fetching applications:", err);
        setError(err.message || "Failed to load applications");
        if (!refresh) {
          toast.error("Failed to load applications");
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  // Fetch buildings and plans
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

  // Initial load
  useEffect(() => {
    fetchApplications();
    fetchMetadata();
  }, []);

  // Filter changes
  useEffect(() => {
    if (!hasInitialLoadRef.current) return;

    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    filterChangeTimeoutRef.current = setTimeout(() => {
      fetchApplications(false, filters);
    }, 150);

    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, [filters.page, filters.status, filters.buildingId, filters.nameSort]);

  // Search debounce
  useEffect(() => {
    if (!hasInitialLoadRef.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchApplications(false, filters);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search]);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
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

  const handleApprove = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot approve: No ID found");
        return;
      }
      try {
        await approveApplication(id);
        toast.success("✅ Application approved successfully!");
        await fetchApplications(true);
      } catch (error: any) {
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

  const handleReject = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot reject: No ID found");
        return;
      }
      try {
        await rejectApplication(id);
        toast.success("❌ Application rejected successfully!");
        await fetchApplications(true);
      } catch (error: any) {
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!id) {
        toast.error("Cannot delete: No ID found");
        return;
      }
      try {
        await deleteApplication(id);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success("🗑️ Application deleted successfully!");
        await fetchApplications(true);
      } catch (error: any) {
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

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      if (!ids || ids.length === 0) {
        toast.error("No applications selected for deletion");
        return;
      }
      try {
        await bulkDeleteApplications(ids);
        setSelectedIds([]);
        toast.success(`🗑️ ${ids.length} applications deleted successfully!`);
        await fetchApplications(true);
      } catch (error: any) {
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

  const handleEdit = useCallback(
    async (id: string, data: any) => {
      if (!id) {
        toast.error("Cannot update: No ID found");
        return;
      }
      try {
        await patchApplication(id, data);
        toast.success("✅ Application updated successfully!");
        await fetchApplications(true);
      } catch (error: any) {
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

  // ✅ ADDED Disconnected
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
    { value: "disconnected", label: "Disconnected" },
  ];

  // ✅ ADDED disconnected count
  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const disconnected = applications.filter(
      (a) => a.status === "disconnected",
    ).length;
    return { total, pending, approved, rejected, disconnected };
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
          {/* Report Download Button */}
          <button
            onClick={() => setShowReportModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue rounded-lg hover:from-blue-700 hover:to-emerald-700 transition disabled:opacity-50 shadow-sm"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Download Report</span>
          </button>

          {/* Quick Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              disabled={isExporting || loading || applications.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {isExporting ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isExporting ? "..." : "Quick"}
              </span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 text-red-500" />
                  <span>Quick PDF</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <TableCellsIcon className="h-5 w-5 text-green-600" />
                  <span>Quick Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ✅ ADDED Disconnected card - Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
        {/* ✅ ADDED Disconnected card */}
        <div className="bg-gray-100 rounded-lg shadow p-4 border border-gray-300">
          <p className="text-sm text-gray-700">🔌 Disconnected</p>
          <p className="text-2xl font-bold text-gray-700">
            {stats.disconnected}
          </p>
        </div>
      </div>

      {/* Table */}
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

      {/* Report Modal */}
      <ApplicationReportDownload
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        buildings={buildings}
        plans={plans}
        onFetchAllApplications={fetchAllApplicationsForReport}
        currentFilters={{
          status: filters.status,
          buildingId: filters.buildingId,
          search: filters.search,
        }}
      />
    </div>
  );
}
