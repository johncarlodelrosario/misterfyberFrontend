// components/admin/ApplicationTable.tsx - COMPLETE FIXED
// ✅ FIX: Full name search now works ("Juan Dela Cruz", "Cruz Juan", "JuanDelaCruz")
// ✅ FIX: Search also matches email, phone, applicationId, building, plan, status
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ApplicationDetails } from "./ApplicationDetails";
import AddApplicationModal from "./AddApplicationModal";
import { EditApplicationModal } from "./EditApplicationModal";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  TrashIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Building, Plan, getApplication } from "@/services/application";

// ============================================================
// INTERFACE DEFINITIONS
// ============================================================
export interface Application {
  _id?: string;
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
  status: "pending" | "approved" | "rejected" | "suspended" | "disconnected";
  idType: string;
  idNumber: string;
  macAddress?: string;
  notes?: string;
  adminNotes?: string;
  idImage?: string;
  idImageUrl?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  billingStarted?: boolean;
  registeredUserId?: string;
  hasAccount?: boolean;
  serviceStatus?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
  hasIdImage?: boolean;
  disconnectedAt?: string;
  disconnectReason?: string;
  reconnectedAt?: string;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface ApplicationTableProps {
  applications: Application[];
  total?: number;
  currentPage?: number;
  totalPages?: number;
  isLoading?: boolean;
  loading?: boolean;
  selectedIds?: string[];
  onPageChange?: (page: number) => void;
  onRefresh?: () => Promise<void> | void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onEdit?: (id: string, data: any) => Promise<void>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: string, checked: boolean) => void;
  onView?: (id: string) => void;
  buildings?: Building[];
  plans?: Plan[];
  statusFilter?: string;
  buildingFilter?: string;
  searchQuery?: string;
  nameSortFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  onBuildingFilterChange?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  onNameSortChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  statusOptions?: StatusOption[];
}

// ============================================================
// ✅ SEARCH HELPER (THE MAIN FIX)
// ============================================================
/**
 * Full-name search that works with:
 *   - "Juan"                  → matches
 *   - "Cruz"                  → matches
 *   - "Juan Dela Cruz"        → matches (was broken before)
 *   - "juan dela cruz"        → matches (case-insensitive)
 *   - "JUAN DELA CRUZ"        → matches (case-insensitive)
 *   - "JuanDelaCruz"          → matches (no spaces)
 *   - "Cruz Juan"             → matches (reverse order)
 *   - "juan  dela  cruz"      → matches (extra whitespace)
 *   - email / phone / appId   → matches
 *   - building / plan / status → matches
 */
function applicationMatchesSearch(
  app: Application,
  searchTerm: string,
  buildings: Building[],
  plans: Plan[],
): boolean {
  const term = (searchTerm || "").trim().toLowerCase();
  if (!term) return true;

  const firstName = (app.firstName || "").toLowerCase().trim();
  const middleName = (app.middleName || "").toLowerCase().trim();
  const lastName = (app.lastName || "").toLowerCase().trim();
  const email = (app.email || "").toLowerCase().trim();
  const phone = (app.phoneNumber || "").toLowerCase().trim();
  const appId = (app.applicationId || app.id || app._id || "")
    .toLowerCase()
    .trim();
  const idNumber = (app.idNumber || "").toLowerCase().trim();
  const macAddress = (app.macAddress || "").toLowerCase().trim();
  const tower = (app.tower || "").toLowerCase().trim();
  const floor = (app.floor || "").toLowerCase().trim();
  const unit = (app.unitNumber || "").toLowerCase().trim();

  // Build name variants
  const fullName = `${firstName} ${middleName} ${lastName}`
    .replace(/\s+/g, " ")
    .trim();
  const fullNameNoMiddle = `${firstName} ${lastName}`
    .replace(/\s+/g, " ")
    .trim();
  const reverseName = `${lastName} ${firstName}`.replace(/\s+/g, " ").trim();

  const fullNameNoSpaces = fullName.replace(/\s+/g, "");
  const fullNameNoMiddleNoSpaces = fullNameNoMiddle.replace(/\s+/g, "");
  const reverseNameNoSpaces = reverseName.replace(/\s+/g, "");
  const termNoSpaces = term.replace(/\s+/g, "");

  // Build building/plan names for search
  let buildingName = "";
  if (typeof app.buildingId === "object" && app.buildingId !== null) {
    buildingName = (app.buildingId.buildingName || "").toLowerCase().trim();
  } else if (typeof app.buildingId === "string") {
    const found = buildings.find((b) => b._id === app.buildingId);
    buildingName = (found?.buildingName || "").toLowerCase().trim();
  }

  let planName = "";
  if (typeof app.planId === "object" && app.planId !== null) {
    planName = (app.planId.name || "").toLowerCase().trim();
  } else if (typeof app.planId === "string") {
    const found = plans.find((p) => p._id === app.planId);
    planName = (found?.name || "").toLowerCase().trim();
  }

  const status = (app.status || "").toLowerCase().trim();

  // 1) Direct substring matches on combined name
  if (fullName.includes(term)) return true;
  if (fullNameNoMiddle.includes(term)) return true;
  if (reverseName.includes(term)) return true;

  // 2) No-spaces match (handles "JuanDelaCruz")
  if (termNoSpaces.length > 0) {
    if (fullNameNoSpaces.includes(termNoSpaces)) return true;
    if (fullNameNoMiddleNoSpaces.includes(termNoSpaces)) return true;
    if (reverseNameNoSpaces.includes(termNoSpaces)) return true;
  }

  // 3) Individual field substring matches
  if (firstName.includes(term)) return true;
  if (middleName.includes(term)) return true;
  if (lastName.includes(term)) return true;
  if (email.includes(term)) return true;
  if (phone.includes(term)) return true;
  if (appId.includes(term)) return true;
  if (idNumber.includes(term)) return true;
  if (macAddress.includes(term)) return true;
  if (buildingName.includes(term)) return true;
  if (planName.includes(term)) return true;
  if (status.includes(term)) return true;
  if (tower.includes(term)) return true;
  if (floor.includes(term)) return true;
  if (unit.includes(term)) return true;

  // 4) Word-based matching — all words must appear somewhere in name/email/appId
  //    This handles "Cruz Juan", "juan d", "dela juan", etc.
  const termWords = term.split(/\s+/).filter(Boolean);
  if (termWords.length > 1) {
    const haystack = [
      fullName,
      fullNameNoMiddle,
      reverseName,
      email,
      phone,
      appId,
      idNumber,
      buildingName,
      planName,
      status,
      tower,
      floor,
      unit,
      macAddress,
    ].join(" ");
    const allWordsMatch = termWords.every((word) => haystack.includes(word));
    if (allWordsMatch) return true;
  }

  return false;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function ApplicationTable({
  applications: initialApplications,
  isLoading = false,
  loading = false,
  selectedIds = [],
  onRefresh,
  onApprove,
  onReject,
  onDelete,
  onBulkDelete,
  onEdit,
  onSelectAll,
  onSelectOne,
  onView,
  buildings = [],
  plans = [],
  total = 0,
  totalPages = 0,
  currentPage = 1,
  onPageChange,
  searchQuery = "",
}: ApplicationTableProps) {
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  const [localApplications, setLocalApplications] =
    useState<Application[]>(initialApplications);

  useEffect(() => {
    setLocalApplications(initialApplications);
  }, [initialApplications]);

  // Sync local search with parent searchQuery
  useEffect(() => {
    setLocalSearch(searchQuery || "");
  }, [searchQuery]);

  // ============================================================
  // ✅ GET APP ID
  // ============================================================
  const getAppId = useCallback((app: Application): string => {
    return app._id || app.id || app.applicationId || "";
  }, []);

  // ============================================================
  // ✅ STATUS BADGE
  // ============================================================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case "suspended":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Suspended
          </span>
        );
      case "disconnected":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
            🔌 Disconnected
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // ============================================================
  // ✅ BUILDING NAME HELPER
  // ============================================================
  const getBuildingName = useCallback(
    (building: string | { _id: string; buildingName: string }) => {
      if (!building) return "N/A";
      if (
        typeof building === "object" &&
        building !== null &&
        "buildingName" in building
      ) {
        return building.buildingName || "N/A";
      }
      if (typeof building === "string") {
        const found = buildings.find((b) => b._id === building);
        return found ? found.buildingName : building;
      }
      return "N/A";
    },
    [buildings],
  );

  // ============================================================
  // ✅ PLAN NAME HELPER
  // ============================================================
  const getPlanName = useCallback(
    (
      plan:
        | string
        | { _id: string; name: string; price: number }
        | null
        | undefined,
    ) => {
      if (!plan) return "N/A";
      if (typeof plan === "object" && plan !== null && "name" in plan) {
        return plan.name || "N/A";
      }
      if (typeof plan === "string") {
        const found = plans.find((p) => p._id === plan);
        return found ? found.name : "N/A";
      }
      return "N/A";
    },
    [plans],
  );

  // ============================================================
  // ✅ PLAN PRICE HELPER
  // ============================================================
  const getPlanPrice = useCallback(
    (
      plan:
        | string
        | { _id: string; name: string; price: number }
        | null
        | undefined,
    ) => {
      if (!plan) return 0;
      if (typeof plan === "object" && plan !== null && "price" in plan) {
        return plan.price || 0;
      }
      if (typeof plan === "string") {
        const found = plans.find((p) => p._id === plan);
        return found ? found.price || 0 : 0;
      }
      return 0;
    },
    [plans],
  );

  // ============================================================
  // ✅ REFRESH DATA
  // ============================================================
  const refreshData = useCallback(async () => {
    if (isRefreshing || isActionInProgress) return;
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, isActionInProgress]);

  // ============================================================
  // ✅ UPDATE APPLICATION STATUS (LOCAL)
  // ============================================================
  const updateApplicationStatus = useCallback(
    (
      id: string,
      newStatus:
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
        | "disconnected",
    ) => {
      setLocalApplications((prev) =>
        prev.map((app) => {
          const appId = getAppId(app);
          return appId === id ? { ...app, status: newStatus } : app;
        }),
      );
    },
    [getAppId],
  );

  // ============================================================
  // ✅ REMOVE SINGLE APPLICATION (LOCAL)
  // ============================================================
  const removeApplication = useCallback(
    (id: string) => {
      setLocalApplications((prev) =>
        prev.filter((app) => getAppId(app) !== id),
      );
    },
    [getAppId],
  );

  // ============================================================
  // ✅ REMOVE MULTIPLE APPLICATIONS (LOCAL)
  // ============================================================
  const removeApplications = useCallback(
    (ids: string[]) => {
      setLocalApplications((prev) =>
        prev.filter((app) => !ids.includes(getAppId(app))),
      );
    },
    [getAppId],
  );

  // ============================================================
  // ✅ APPROVE HANDLER
  // ============================================================
  const handleApprove = async (id: string) => {
    if (!id) {
      toast.error("Cannot approve: No ID found");
      return;
    }

    if (isActionInProgress) return;
    setIsActionInProgress(true);
    setActionLoading(id);

    updateApplicationStatus(id, "approved");
    toast.success("✅ Application approved!");

    try {
      if (onApprove) {
        await onApprove(id);
      }
      await refreshData();
    } catch (error: any) {
      updateApplicationStatus(id, "pending");
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to approve application",
      );
    } finally {
      setActionLoading(null);
      setIsActionInProgress(false);
    }
  };

  // ============================================================
  // ✅ REJECT HANDLER
  // ============================================================
  const handleReject = async (id: string) => {
    if (!id) {
      toast.error("Cannot reject: No ID found");
      return;
    }

    if (isActionInProgress) return;
    setIsActionInProgress(true);
    setActionLoading(id);

    updateApplicationStatus(id, "rejected");
    toast.success("❌ Application rejected");

    try {
      if (onReject) {
        await onReject(id);
      }
      await refreshData();
    } catch (error: any) {
      updateApplicationStatus(id, "pending");
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reject application",
      );
    } finally {
      setActionLoading(null);
      setIsActionInProgress(false);
    }
  };

  // ============================================================
  // ✅ DELETE HANDLER
  // ============================================================
  const handleDelete = async (id: string) => {
    if (!id) {
      toast.error("Cannot delete: No ID found");
      return;
    }

    if (isActionInProgress) return;

    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsActionInProgress(true);
    setActionLoading(id);
    const appToDelete = localApplications.find((app) => getAppId(app) === id);
    removeApplication(id);
    toast.info("🗑️ Deleting application...");

    try {
      if (onDelete) {
        await onDelete(id);
        toast.success(
          `✅ Application ${appToDelete?.applicationId || ""} deleted successfully`,
        );
      }
      await refreshData();
    } catch (error: any) {
      if (appToDelete) {
        setLocalApplications((prev) => [...prev, appToDelete]);
      }
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete application",
      );
    } finally {
      setActionLoading(null);
      setIsActionInProgress(false);
    }
  };

  // ============================================================
  // ✅ BULK DELETE HANDLER
  // ============================================================
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select applications to delete");
      return;
    }

    if (isActionInProgress) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} applications? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsActionInProgress(true);
    const idsToDelete = [...selectedIds];
    removeApplications(idsToDelete);
    toast.info(`🗑️ Deleting ${idsToDelete.length} applications...`);

    try {
      if (onBulkDelete) {
        await onBulkDelete(idsToDelete);
        toast.success(
          `✅ ${idsToDelete.length} applications deleted successfully`,
        );
      }
      await refreshData();
    } catch (error: any) {
      setLocalApplications(initialApplications);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete applications",
      );
    } finally {
      setIsActionInProgress(false);
    }
  };

  // ============================================================
  // ✅ EDIT HANDLER
  // ============================================================
  const handleEdit = (application: Application) => {
    if (isActionInProgress) return;
    setSelectedApplication(application);
    setShowEditModal(true);
  };

  const handleEditSuccess = async (id: string, data: any) => {
    setShowEditModal(false);
    if (isActionInProgress) return;
    setIsActionInProgress(true);

    try {
      if (onEdit) {
        await onEdit(id, data);
      }
      await refreshData();
      toast.success("✅ Application updated successfully!");
    } catch (error) {
      console.error("Edit error:", error);
    } finally {
      setIsActionInProgress(false);
    }
  };

  // ============================================================
  // ✅ VIEW DETAILS HANDLER
  // ============================================================
  const handleViewDetails = async (application: Application) => {
    if (isActionInProgress) return;

    const appId = getAppId(application);
    if (!appId) {
      toast.error("Cannot view: No ID found");
      return;
    }

    setActionLoading(appId);

    try {
      const response = await getApplication(appId);
      const fullApplication = response.data || response;

      setSelectedApplication({
        ...application,
        ...fullApplication,
        _id: fullApplication._id || application._id,
        applicationId:
          fullApplication.applicationId || application.applicationId,
      });
    } catch (error: any) {
      console.error("❌ Failed to fetch full details:", error);
      toast.error("Failed to load full details, showing cached data");
      setSelectedApplication(application);
    } finally {
      setActionLoading(null);
    }

    setShowDetailsModal(true);
  };

  // ============================================================
  // ✅ FORMAT DATE
  // ============================================================
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  // ============================================================
  // ✅ FILTERED APPLICATIONS (CLIENT-SIDE SEARCH FALLBACK)
  // Ito ang nag-aapply ng full-name search sa local data kapag
  // hindi nagre-reload ang backend. Pero kung may server-side search
  // na, hindi ito magdodoble-filter dahil nag-match na ang backend.
  // ============================================================
  const filteredApplications = useMemo(() => {
    if (!localSearch || !localSearch.trim()) {
      return localApplications;
    }
    return localApplications.filter((app) =>
      applicationMatchesSearch(app, localSearch, buildings, plans),
    );
  }, [localApplications, localSearch, buildings, plans]);

  const displayApplications = useMemo(
    () => filteredApplications,
    [filteredApplications],
  );
  const isLoaded = loading || isLoading || isRefreshing;

  // ============================================================
  // ✅ SELECT HANDLERS
  // ============================================================
  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) onSelectAll(checked);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectOne) onSelectOne(id, checked);
  };

  // ============================================================
  // ✅ GET APPLICATION FOR EDIT
  // ============================================================
  const getApplicationForEdit = (app: Application | null) => {
    if (!app) return null;
    const id = app._id || app.id || app.applicationId || "";
    return {
      ...app,
      _id: id,
    } as Application & { _id: string };
  };

  // ============================================================
  // ✅ LOCAL SEARCH INPUT HANDLER
  // ============================================================
  const handleLocalSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-4">
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isActionInProgress}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50 transition"
            >
              <TrashIcon className="h-4 w-4" />
              Delete ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={isActionInProgress}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Add Application
          </button>
        </div>
      </div>

      {/* Search Result Info */}
      {localSearch && localSearch.trim() && (
        <div className="px-4">
          <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
            🔍 Showing <strong>{displayApplications.length}</strong> result
            {displayApplications.length !== 1 ? "s" : ""} for "
            <strong>{localSearch}</strong>"
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {onSelectAll && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={
                      selectedIds.length === displayApplications.length &&
                      displayApplications.length > 0
                    }
                    disabled={isActionInProgress}
                    className="rounded border-gray-300 disabled:opacity-50"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Building
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoaded && displayApplications.length === 0 ? (
              <tr>
                <td
                  colSpan={onSelectAll ? 9 : 8}
                  className="px-6 py-8 text-center"
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-6 w-6 text-gray-400"
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
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : displayApplications.length === 0 ? (
              <tr>
                <td
                  colSpan={onSelectAll ? 9 : 8}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No applications found
                  {localSearch && (
                    <div className="text-xs text-gray-400 mt-1">
                      No results for "{localSearch}"
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayApplications.map((app, index) => {
                const appId = getAppId(app);
                const key =
                  appId || app.applicationId || Math.random().toString();
                const isDisconnected = app.status === "disconnected";
                return (
                  <tr
                    key={key}
                    className={
                      isDisconnected
                        ? "bg-gray-50 opacity-75"
                        : "hover:bg-gray-50"
                    }
                  >
                    {onSelectAll && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(appId)}
                          onChange={(e) =>
                            handleSelectOne(appId, e.target.checked)
                          }
                          disabled={isActionInProgress}
                          className="rounded border-gray-300 disabled:opacity-50"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${isDisconnected ? "text-gray-500" : "text-gray-900"}`}
                      >
                        {(currentPage - 1) * 10 + index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`font-medium ${isDisconnected ? "text-gray-500" : "text-gray-900"}`}
                      >
                        {app.firstName}{" "}
                        {app.middleName ? `${app.middleName} ` : ""}
                        {app.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {app.applicationId || app.idNumber || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.email}</div>
                      <div className="text-xs text-gray-500">
                        {app.phoneNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getBuildingName(app.buildingId)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tower {app.tower || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {app.floor || "N/A"} - {app.unitNumber || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPlanName(app.planId)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ₱{getPlanPrice(app.planId).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                      {isDisconnected && app.disconnectedAt && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          Since{" "}
                          {new Date(app.disconnectedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetails(app)}
                          disabled={
                            isActionInProgress || actionLoading === appId
                          }
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          title="View Details"
                        >
                          {actionLoading === appId ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <EyeIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(app)}
                          disabled={isActionInProgress}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                          title="Edit Application"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {app.status === "pending" && onApprove && onReject && (
                          <>
                            <button
                              onClick={() => handleApprove(appId)}
                              disabled={
                                actionLoading === appId ||
                                isRefreshing ||
                                isActionInProgress
                              }
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(appId)}
                              disabled={
                                actionLoading === appId ||
                                isRefreshing ||
                                isActionInProgress
                              }
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(appId)}
                          disabled={
                            actionLoading === appId ||
                            isRefreshing ||
                            isActionInProgress
                          }
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {displayApplications.length} of {total} applications
            {localSearch && localSearch.trim() && (
              <span className="ml-2 text-purple-600">
                (filtered by "{localSearch}")
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isRefreshing || isActionInProgress}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>

            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={
                currentPage >= totalPages || isRefreshing || isActionInProgress
              }
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Application Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ApplicationDetails
                application={selectedApplication}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                onEdit={() => handleEdit(selectedApplication)}
                onClose={() => setShowDetailsModal(false)}
                buildings={buildings}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Application Modal */}
      <AddApplicationModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setShowAddModal(false);
          refreshData();
          toast.success("✅ Application submitted successfully!");
        }}
      />

      {/* Edit Application Modal */}
      {showEditModal && selectedApplication && (
        <EditApplicationModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          application={getApplicationForEdit(selectedApplication)!}
          buildings={buildings}
          plans={plans}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
