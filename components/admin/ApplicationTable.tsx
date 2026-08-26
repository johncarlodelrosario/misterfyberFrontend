// components/admin/ApplicationTable.tsx
"use client";

import { useState, useMemo } from "react";
import {
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import Image from "next/image";

import { approveApplication, rejectApplication } from "@/services/application";
import { startBillingForApplication } from "@/services/billing";

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
  status: "pending" | "approved" | "rejected" | "billing_started";
  idType: string;
  idNumber: string;
  macAddress?: string;
  adminNotes?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationTableProps {
  applications: Application[];
  loading: boolean;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onRefresh: () => void;
}

type SortField =
  | "fullName"
  | "email"
  | "building"
  | "plan"
  | "status"
  | "submittedAt";
type SortDirection = "asc" | "desc";

export default function ApplicationTable({
  applications,
  loading,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onView,
  onEdit,
  onRefresh,
}: ApplicationTableProps) {
  const [sortField, setSortField] = useState<SortField>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sort applications
  const sortedApplications = useMemo(() => {
    const sorted = [...applications];

    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "fullName":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "building":
          aVal = a.buildingId?.buildingName?.toLowerCase() || "";
          bVal = b.buildingId?.buildingName?.toLowerCase() || "";
          break;
        case "plan":
          aVal = a.planId?.name?.toLowerCase() || "";
          bVal = b.planId?.name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "submittedAt":
          aVal = new Date(a.submittedAt || a.createdAt).getTime();
          bVal = new Date(b.submittedAt || b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [applications, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: Application["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3.5 w-3.5" />
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case "billing_started":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <PlayCircleIcon className="h-3.5 w-3.5" />
            Billing Started
          </span>
        );
      default:
        return null;
    }
  };

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);

    try {
      const result = await approveApplication(id);
      toast.success("Application approved successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast.error(error.message || "Failed to approve application");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);

    const reason = prompt("Please enter a reason for rejection:");
    if (reason === null) {
      setActionLoading(null);
      return;
    }

    try {
      await rejectApplication(id, reason || undefined);
      toast.success("Application rejected");
      onRefresh();
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast.error(error.message || "Failed to reject application");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartBilling = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);

    try {
      await startBillingForApplication(id);
      toast.success("Billing started successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Error starting billing:", error);
      toast.error(error.message || "Failed to start billing");
    } finally {
      setActionLoading(null);
    }
  };

  const isAllSelected =
    applications.length > 0 && selectedIds.length === applications.length;

  if (loading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Loading applications...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No applications found
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your filters or search criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort("fullName")}
            >
              <span className="flex items-center gap-1">
                Applicant
                {sortField === "fullName" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700 hidden sm:table-cell"
              onClick={() => handleSort("email")}
            >
              <span className="flex items-center gap-1">
                Email
                {sortField === "email" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700 hidden md:table-cell"
              onClick={() => handleSort("building")}
            >
              <span className="flex items-center gap-1">
                Building
                {sortField === "building" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700 hidden lg:table-cell"
              onClick={() => handleSort("plan")}
            >
              <span className="flex items-center gap-1">
                Plan
                {sortField === "plan" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort("status")}
            >
              <span className="flex items-center gap-1">
                Status
                {sortField === "status" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-700 hidden md:table-cell"
              onClick={() => handleSort("submittedAt")}
            >
              <span className="flex items-center gap-1">
                Submitted
                {sortField === "submittedAt" && (
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </span>
            </th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedApplications.map((app) => (
            <tr
              key={app._id}
              className="hover:bg-gray-50 transition cursor-pointer"
              onClick={() => onView(app._id)}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(app._id)}
                  onChange={(e) => onSelectOne(app._id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                    {app.firstName.charAt(0)}
                    {app.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {app.firstName} {app.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      #{app._id.slice(-6)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <p className="text-gray-600 truncate max-w-[150px]">
                  {app.email}
                </p>
                <p className="text-xs text-gray-400">{app.phoneNumber}</p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <p className="text-gray-600">
                  {app.buildingId?.buildingName || "N/A"}
                </p>
                <p className="text-xs text-gray-400">
                  {app.tower} • Floor {app.floor} • Unit {app.unitNumber}
                </p>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <p className="text-gray-600 font-medium">
                  {app.planId?.name || "N/A"}
                </p>
                <p className="text-xs text-gray-400">
                  ₱{app.planId?.price?.toLocaleString() || 0}
                </p>
              </td>
              <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
              <td className="px-4 py-3 hidden md:table-cell">
                <p className="text-gray-500 text-sm">
                  {new Date(
                    app.submittedAt || app.createdAt,
                  ).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(
                    app.submittedAt || app.createdAt,
                  ).toLocaleTimeString()}
                </p>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onView(app._id)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="View"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => onEdit(app._id)}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  {app.status === "pending" && (
                    <>
                      <button
                        onClick={(e) => handleApprove(app._id, e)}
                        disabled={actionLoading === app._id}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleReject(app._id, e)}
                        disabled={actionLoading === app._id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {app.status === "approved" && (
                    <button
                      onClick={(e) => handleStartBilling(app._id, e)}
                      disabled={actionLoading === app._id}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                      title="Start Billing"
                    >
                      <PlayCircleIcon className="h-4 w-4" />
                    </button>
                  )}

                  {actionLoading === app._id && (
                    <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
