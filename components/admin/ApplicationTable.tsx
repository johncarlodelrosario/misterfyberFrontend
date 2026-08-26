// components/admin/ApplicationTable.tsx - COMPLETE FIXED
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ApplicationDetails } from "./ApplicationDetails";
import { AddApplicationModal } from "./AddApplicationModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { getActiveBuildings, Building } from "@/services/building";

// Interface definitions
export interface Application {
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
  status: "pending" | "approved" | "rejected";
  idType: string;
  idNumber: string;
  macAddress?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationTableProps {
  applications: Application[];
  total: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onStatusFilterChange: (status: string) => void;
  onBuildingFilterChange: (buildingId: string) => void;
  onSearch: (query: string) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onStartBilling: (id: string) => Promise<void>;
  onApplicationAdded: () => void;
}

export default function ApplicationTable({
  applications: initialApplications,
  total,
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
  onRefresh,
  onStatusFilterChange,
  onBuildingFilterChange,
  onSearch,
  onApprove,
  onReject,
  onStartBilling,
  onApplicationAdded,
}: ApplicationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Local state for instant updates - OPTIMISTIC UI
  const [localApplications, setLocalApplications] =
    useState<Application[]>(initialApplications);

  // Update local applications when props change
  useEffect(() => {
    setLocalApplications(initialApplications);
  }, [initialApplications]);

  // Load buildings for filter
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const data = await getActiveBuildings();
        setBuildings(data || []);
      } catch (error) {
        console.error("Error loading buildings:", error);
      }
    };
    loadBuildings();
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  const handleStatusFilter = useCallback(
    (value: string) => {
      setStatusFilter(value);
      onStatusFilterChange(value);
    },
    [onStatusFilterChange],
  );

  const handleBuildingFilter = useCallback(
    (value: string) => {
      setBuildingFilter(value);
      onBuildingFilterChange(value);
    },
    [onBuildingFilterChange],
  );

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
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getBuildingName = (
    building: string | { _id: string; buildingName: string },
  ) => {
    if (typeof building === "string") return building;
    return building?.buildingName || "N/A";
  };

  const getPlanName = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (typeof plan === "string") return plan;
    return plan?.name || "N/A";
  };

  const getPlanPrice = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (typeof plan === "string") return 0;
    return plan?.price || 0;
  };

  // OPTIMISTIC UPDATE: Instant status change without waiting for API
  const updateApplicationStatus = useCallback(
    (id: string, newStatus: "pending" | "approved" | "rejected") => {
      setLocalApplications((prev) =>
        prev.map((app) =>
          app._id === id ? { ...app, status: newStatus } : app,
        ),
      );
    },
    [],
  );

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    // OPTIMISTIC UPDATE: Change status instantly
    updateApplicationStatus(id, "approved");
    toast.success("✅ Application approved!");

    try {
      await onApprove(id);
      // Refresh in background to sync with server
      setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      // Revert on error
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
    // OPTIMISTIC UPDATE: Change status instantly
    updateApplicationStatus(id, "rejected");
    toast.success("❌ Application rejected");

    try {
      await onReject(id);
      setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      updateApplicationStatus(id, "pending");
      toast.error(
        error?.response?.data?.message || "Failed to reject application",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartBilling = async (id: string) => {
    setActionLoading(id);
    toast.success("💰 Starting billing...");

    try {
      await onStartBilling(id);
      toast.success("✅ Billing started successfully!");
      setTimeout(() => onRefresh(), 300);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to start billing");
    } finally {
      setActionLoading(null);
    }
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

  // Use localApplications for display
  const displayApplications = useMemo(
    () => localApplications,
    [localApplications],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
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
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={buildingFilter}
            onChange={(e) => handleBuildingFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
          >
            <option value="all">All Buildings</option>
            {buildings.map((building) => (
              <option key={building._id} value={building._id}>
                {building.buildingName}
              </option>
            ))}
          </select>

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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
            {isLoading && displayApplications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
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
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No applications found
                </td>
              </tr>
            ) : (
              displayApplications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {app.firstName} {app.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {app.idNumber || "N/A"}
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
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => handleViewDetails(app)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(app._id)}
                            disabled={actionLoading === app._id}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {actionLoading === app._id ? "⏳" : "✅ Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(app._id)}
                            disabled={actionLoading === app._id}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {actionLoading === app._id ? "⏳" : "❌ Reject"}
                          </button>
                        </>
                      )}
                      {app.status === "approved" && (
                        <button
                          onClick={() => handleStartBilling(app._id)}
                          disabled={actionLoading === app._id}
                          className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          {actionLoading === app._id
                            ? "⏳"
                            : "💰 Start Billing"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {displayApplications.length} of {total} applications
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={`px-4 py-2 border rounded-md ${
                      pageNum === currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onStartBilling={handleStartBilling}
                onClose={() => setShowDetailsModal(false)}
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
          onApplicationAdded();
          toast.success("✅ Application submitted successfully!");
        }}
      />
    </div>
  );
}
