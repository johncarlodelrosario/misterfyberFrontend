// components/admin/ApplicationDetails.tsx - COMPLETE FIXED
"use client";

import React, { useState } from "react";
import type { Application } from "./ApplicationTable";

interface ApplicationDetailsProps {
  application: Application;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onStartBilling: (id: string) => Promise<void>;
  onClose: () => void;
}

export function ApplicationDetails({
  application,
  onApprove,
  onReject,
  onStartBilling,
  onClose,
}: ApplicationDetailsProps) {
  const [actionLoading, setActionLoading] = useState(false);

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
      case "billing_started":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Billing Started
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

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await onApprove(application._id);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await onReject(application._id);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBilling = async () => {
    setActionLoading(true);
    try {
      await onStartBilling(application._id);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          {getStatusBadge(application.status)}
        </div>
        <div className="text-sm text-gray-500 font-mono">
          ID:{" "}
          {application.applicationId || application._id.slice(-8).toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Information */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Personal Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Application ID:</span>
              <span className="font-medium font-mono text-sm">
                {application.applicationId || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name:</span>
              <span className="font-medium">
                {application.firstName} {application.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{application.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone:</span>
              <span className="font-medium">{application.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID Type:</span>
              <span className="font-medium">{application.idType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID Number:</span>
              <span className="font-medium">{application.idNumber}</span>
            </div>
            {application.macAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500">MAC Address:</span>
                <span className="font-medium font-mono text-xs">
                  {application.macAddress}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Address Information */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Address Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Building:</span>
              <span className="font-medium">
                {getBuildingName(application.buildingId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tower:</span>
              <span className="font-medium">{application.tower || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Floor:</span>
              <span className="font-medium">{application.floor || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unit:</span>
              <span className="font-medium">
                {application.unitNumber || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Plan Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan:</span>
              <span className="font-medium">
                {getPlanName(application.planId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Price:</span>
              <span className="font-medium">
                ₱{getPlanPrice(application.planId).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Additional Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span className="font-medium">
                {formatDate(application.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated:</span>
              <span className="font-medium">
                {formatDate(application.updatedAt)}
              </span>
            </div>
            {application.notes && (
              <div className="mt-2">
                <span className="text-gray-500">Notes:</span>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded-md">
                  {application.notes}
                </p>
              </div>
            )}
            {application.adminNotes && (
              <div className="mt-2">
                <span className="text-gray-500">Admin Notes:</span>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded-md">
                  {application.adminNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        {application.status === "pending" && (
          <>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "⏳ Processing..." : "✅ Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "⏳ Processing..." : "❌ Reject"}
            </button>
          </>
        )}
        {application.status === "approved" && (
          <button
            onClick={handleStartBilling}
            disabled={actionLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {actionLoading ? "⏳ Processing..." : "₱ Start Billing"}
          </button>
        )}
      </div>
    </div>
  );
}
