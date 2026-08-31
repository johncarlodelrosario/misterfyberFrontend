// components/admin/ApplicationTable.tsx - COMPLETE FIXED - REMOVED birthDate AND gender
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ApplicationDetails } from "./ApplicationDetails";
import AddApplicationModal from "./AddApplicationModal";
import { EditApplicationModal } from "./EditApplicationModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Building, Plan } from "@/services/application";

// Interface definitions
export interface Application {
  _id: string;
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
  onRefresh?: () => void;
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
  onStatusFilterChange?: (value: string) => void;
  onBuildingFilterChange?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  statusOptions?: StatusOption[];
}

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
  statusFilter = "all",
  buildingFilter = "",
  searchQuery = "",
  onStatusFilterChange,
  onBuildingFilterChange,
  onSearchChange,
  onSearchSubmit,
  statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "suspended", label: "Suspended" },
  ],
  total = 0,
  totalPages = 0,
  currentPage = 1,
  onPageChange,
}: ApplicationTableProps) {
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [localApplications, setLocalApplications] =
    useState<Application[]>(initialApplications);

  useEffect(() => {
    setLocalApplications(initialApplications);
  }, [initialApplications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case "suspended":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            Suspended
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

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

  const getPlanName = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (!plan) return "N/A";
    if (typeof plan === "string") return plan;
    return plan?.name || "N/A";
  };

  const getPlanPrice = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (!plan) return 0;
    if (typeof plan === "string") return 0;
    return plan?.price || 0;
  };

  const updateApplicationStatus = useCallback(
    (
      id: string,
      newStatus: "pending" | "approved" | "rejected" | "suspended",
    ) => {
      setLocalApplications((prev) =>
        prev.map((app) =>
          app._id === id ? { ...app, status: newStatus } : app,
        ),
      );
    },
    [],
  );

  const removeApplication = useCallback((id: string) => {
    setLocalApplications((prev) => prev.filter((app) => app._id !== id));
  }, []);

  const removeApplications = useCallback((ids: string[]) => {
    setLocalApplications((prev) =>
      prev.filter((app) => !ids.includes(app._id)),
    );
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    updateApplicationStatus(id, "approved");
    toast.success("✅ Application approved!");

    try {
      if (onApprove) {
        await onApprove(id);
      }
      if (onRefresh) setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      updateApplicationStatus(id, "pending");
      toast.error(
        error?.response?.data?.message || "Failed to approve application",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    updateApplicationStatus(id, "rejected");
    toast.success("❌ Application rejected");

    try {
      if (onReject) {
        await onReject(id);
      }
      if (onRefresh) setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      updateApplicationStatus(id, "pending");
      toast.error(
        error?.response?.data?.message || "Failed to reject application",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone.",
      )
    ) {
      return;
    }

    setActionLoading(id);
    const appToDelete = localApplications.find((app) => app._id === id);
    removeApplication(id);
    toast.info("🗑️ Deleting application...");

    try {
      if (onDelete) {
        await onDelete(id);
        toast.success(
          `✅ Application ${appToDelete?.applicationId || ""} deleted successfully`,
        );
      }
      if (onRefresh) setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      if (appToDelete) {
        setLocalApplications((prev) => [...prev, appToDelete]);
      }
      toast.error(
        error?.response?.data?.message || "Failed to delete application",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select applications to delete");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} applications? This action cannot be undone.`,
      )
    ) {
      return;
    }

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
      if (onRefresh) setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      setLocalApplications(initialApplications);
      toast.error(
        error?.response?.data?.message || "Failed to delete applications",
      );
    }
  };

  const handleEdit = (application: Application) => {
    setSelectedApplication(application);
    setShowEditModal(true);
  };

  const handleEditSuccess = async (id: string, data: any) => {
    setShowEditModal(false);
    if (onEdit) {
      await onEdit(id, data);
    }
    if (onRefresh) setTimeout(() => onRefresh(), 300);
    toast.success("✅ Application updated successfully!");
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  const displayApplications = useMemo(
    () => localApplications,
    [localApplications],
  );
  const isLoaded = loading || isLoading;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) onSelectAll(checked);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectOne) onSelectOne(id, checked);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) onSearchSubmit();
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(e.target.value);
    }
  };

  const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onBuildingFilterChange) {
      onBuildingFilterChange(e.target.value);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={buildingFilter}
            onChange={handleBuildingChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px] bg-white"
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg
              className={`h-4 w-4 ${isLoaded ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center gap-1"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Application
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                    className="rounded border-gray-300"
                  />
                </th>
              )}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
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
                </td>
              </tr>
            ) : (
              displayApplications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  {onSelectAll && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(app._id)}
                        onChange={(e) =>
                          handleSelectOne(app._id, e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {app.firstName} {app.lastName}
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(app.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="relative inline-flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleEdit(app)}
                        className="px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                        title="Edit Application"
                      >
                        ✏️
                      </button>
                      {app.status === "pending" && onApprove && onReject && (
                        <>
                          <button
                            onClick={() => handleApprove(app._id)}
                            disabled={actionLoading === app._id}
                            className="px-2 py-1 text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Approve"
                          >
                            {actionLoading === app._id ? "⏳" : "✅"}
                          </button>
                          <button
                            onClick={() => handleReject(app._id)}
                            disabled={actionLoading === app._id}
                            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Reject"
                          >
                            {actionLoading === app._id ? "⏳" : "❌"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(app._id)}
                        disabled={actionLoading === app._id}
                        className="px-2 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {displayApplications.length} of {total} applications
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          if (onRefresh) onRefresh();
          toast.success("✅ Application submitted successfully!");
        }}
      />

      {/* Edit Application Modal */}
      {showEditModal && selectedApplication && (
        <EditApplicationModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          application={selectedApplication}
          buildings={buildings}
          plans={plans}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
