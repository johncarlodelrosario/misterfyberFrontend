// components/admin/ApplicationDetails.tsx - COMPLETE FIXED WITH ID IMAGE DISPLAY
"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import type { Application } from "./ApplicationTable";

interface ApplicationDetailsProps {
  application: Application;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: () => void;
  onClose: () => void;
  buildings?: { _id: string; buildingName: string }[];
}

export function ApplicationDetails({
  application,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  onClose,
  buildings = [],
}: ApplicationDetailsProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get the ID safely - handle both _id and id
  const getApplicationId = useCallback((): string => {
    const id = application._id || application.id;
    if (!id) return "N/A";
    if (typeof id === "string") {
      return id.slice(-8).toUpperCase();
    }
    return String(id).slice(-8).toUpperCase();
  }, [application._id, application.id]);

  // Get the ID for API calls - ensures we always have a string
  const getAppIdForApi = useCallback((): string => {
    const id = application._id || application.id || application.applicationId;
    if (!id) {
      console.error("No ID found for application:", application);
      return "";
    }
    return id;
  }, [application._id, application.id, application.applicationId]);

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

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  // ============================================================
  // ✅ FIXED: Get the ID image URL - handles all possible formats
  // ============================================================
  const getIdImageUrl = useCallback(() => {
    // Check multiple possible sources for the image
    const image = application.idImage || application.idImageUrl;

    console.log("🔍 Checking for ID image:", {
      idImage: application.idImage,
      idImageUrl: application.idImageUrl,
      applicationId: application.applicationId,
      firstName: application.firstName,
      lastName: application.lastName,
    });

    if (!image) {
      console.log(
        "❌ No ID image found for application:",
        application.applicationId,
      );
      return null;
    }

    // If it's already a full URL or data URL, return as is
    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:") ||
      image.startsWith("https://res.cloudinary.com")
    ) {
      console.log("✅ Using full URL:", image);
      return image;
    }

    // If it's a relative path starting with /uploads/
    if (image.startsWith("/uploads/")) {
      const PRODUCTION_URL = "https://misterfyberbackend-lvjd.onrender.com";
      const fullUrl = `${PRODUCTION_URL}${image}`;
      console.log("✅ Using relative path URL:", fullUrl);
      return fullUrl;
    }

    // If it's a relative path without leading slash
    if (image.startsWith("uploads/")) {
      const PRODUCTION_URL = "https://misterfyberbackend-lvjd.onrender.com";
      const fullUrl = `${PRODUCTION_URL}/${image}`;
      console.log("✅ Using uploads path URL:", fullUrl);
      return fullUrl;
    }

    // If it's just a filename, construct the full path
    const filename = image.split(/[\\\/]/).pop() || image;

    // Check if it's the placeholder
    if (filename === "placeholder.jpg" || !filename || filename === "") {
      const PRODUCTION_URL = "https://misterfyberbackend-lvjd.onrender.com";
      const fallbackUrl = `${PRODUCTION_URL}/uploads/id-cards/placeholder.jpg`;
      console.log("📸 Using placeholder URL:", fallbackUrl);
      return fallbackUrl;
    }

    // Construct URL from filename
    const PRODUCTION_URL = "https://misterfyberbackend-q4k5.onrender.com";
    const fullUrl = `${PRODUCTION_URL}/uploads/id-cards/${filename}`;
    console.log("✅ Constructed URL from filename:", fullUrl);
    return fullUrl;
  }, [application.idImage, application.idImageUrl, application.applicationId]);

  const handleApprove = async () => {
    const appId = getAppIdForApi();
    if (!appId) {
      console.error("Cannot approve: No ID found");
      return;
    }
    setActionLoading(true);
    try {
      await onApprove(appId);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const appId = getAppIdForApi();
    if (!appId) {
      console.error("Cannot reject: No ID found");
      return;
    }
    setActionLoading(true);
    try {
      await onReject(appId);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const appId = getAppIdForApi();
    if (!appId) {
      console.error("Cannot delete: No ID found");
      return;
    }
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone.",
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await onDelete(appId);
      onClose();
    } catch (error) {
      // Error is handled in parent
    } finally {
      setActionLoading(false);
    }
  };

  const idImageUrl = getIdImageUrl();
  console.log("📸 Final ID Image URL:", idImageUrl);

  // ============================================================
  // ✅ HANDLE IMAGE LOAD ERROR - Fallback to placeholder
  // ============================================================
  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const target = e.target as HTMLImageElement;
      console.error("❌ Image failed to load:", idImageUrl);
      setImageError(true);
      // Try to load placeholder
      const PRODUCTION_URL = "https://misterfyberbackend-q4k5.onrender.com";
      target.src = `${PRODUCTION_URL}/uploads/id-cards/placeholder.jpg`;
      target.onerror = null; // Prevent infinite loop
    },
    [idImageUrl],
  );

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">Status:</span>
          {getStatusBadge(application.status)}
          {application.serviceStatus && (
            <>
              <span className="text-gray-400 mx-2">|</span>
              <span className="font-medium">Service:</span>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {application.serviceStatus}
              </span>
            </>
          )}
        </div>
        <div className="text-sm text-gray-500 font-mono">
          ID: {application.applicationId || getApplicationId()}
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
                {application.middleName && ` ${application.middleName}`}
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
              <span className="font-medium">{application.idType || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID Number:</span>
              <span className="font-medium">
                {application.idNumber || "N/A"}
              </span>
            </div>
            {application.macAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500">MAC Address:</span>
                <span className="font-medium font-mono text-xs">
                  {application.macAddress}
                </span>
              </div>
            )}
            {application.hasAccount !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Has Account:</span>
                <span className="font-medium">
                  {application.hasAccount ? "✅ Yes" : "❌ No"}
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
            {application.installationFee !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Installation Fee:</span>
                <span className="font-medium">
                  ₱{application.installationFee.toLocaleString()}
                  {application.installationFeePaid && " (Paid)"}
                </span>
              </div>
            )}
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

        {/* ============================================================ */}
        {/* ✅ ID IMAGE SECTION - FIXED WITH BETTER DEBUGGING */}
        {/* ============================================================ */}
        <div className="border rounded-lg p-4 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>📷 ID Image</span>
            <span className="text-xs text-gray-400 font-normal">
              ({application.idType || "No ID Type"})
            </span>
          </h3>

          {idImageUrl ? (
            <div className="flex flex-col items-center">
              <div
                className="relative w-64 h-64 border-2 border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                onClick={() => setShowFullImage(true)}
              >
                <Image
                  src={idImageUrl}
                  alt={`${application.firstName} ${application.lastName}'s ID`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 256px"
                  priority
                  onError={handleImageError}
                  unoptimized={true}
                />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>Click image to enlarge</span>
                <span>•</span>
                <span className="font-mono">
                  {application.idNumber || "No ID Number"}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {imageError ? (
                  <span className="text-amber-600">
                    ⚠️ Image load error - showing placeholder
                  </span>
                ) : (
                  <span className="text-green-600">✅ ID Card Uploaded</span>
                )}
              </div>
              {idImageUrl && !imageError && (
                <div className="mt-1 text-xs text-gray-400 truncate max-w-full">
                  <span className="font-mono text-[10px]">{idImageUrl}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No ID image uploaded</p>
              <p className="text-xs text-gray-400 mt-1">
                ID Type: {application.idType || "Not specified"}
              </p>
              <p className="text-xs text-gray-400">
                ID Number: {application.idNumber || "Not specified"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            ✏️ Edit
          </button>
        )}
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
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50"
          >
            {actionLoading ? "⏳ Processing..." : "🗑️ Delete"}
          </button>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && idImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 z-10 transition-all"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="relative w-full h-full">
              <Image
                src={idImageUrl}
                alt={`${application.firstName} ${application.lastName}'s ID - Full View`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                onError={handleImageError}
                unoptimized={true}
              />
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <div className="bg-black/60 py-2 px-4 mx-auto max-w-md rounded-full text-white text-sm">
                <span className="font-medium">
                  {application.firstName} {application.lastName}
                </span>
                <span className="mx-2">•</span>
                <span>{application.idType || "ID"}</span>
                <span className="mx-2">•</span>
                <span className="font-mono">
                  {application.idNumber || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
