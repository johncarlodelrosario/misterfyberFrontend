// components/admin/EditApplicationModal.tsx - COMPLETE FIXED - REMOVED birthDate AND gender
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building, Plan } from "@/services/application";
import { patchApplication } from "@/services/application";
import { toast } from "sonner";
import Image from "next/image";

interface EditApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    _id: string;
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
    idType: string;
    idNumber: string;
    macAddress?: string;
    notes?: string;
    adminNotes?: string;
    idImage?: string;
    status: string;
    serviceStatus?: string;
    installationFee?: number;
    installationFeePaid?: boolean;
  };
  buildings: Building[];
  plans: Plan[];
  onSuccess: (id: string, data: any) => Promise<void>;
}

export function EditApplicationModal({
  open,
  onOpenChange,
  application,
  buildings,
  plans,
  onSuccess,
}: EditApplicationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [idImagePreview, setIdImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phoneNumber: "",
    buildingId: "",
    tower: "",
    floor: "",
    unitNumber: "",
    planId: "",
    idType: "",
    idNumber: "",
    macAddress: "",
    notes: "",
    adminNotes: "",
    status: "",
    serviceStatus: "",
    installationFee: "",
    installationFeePaid: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with application data when modal opens
  useEffect(() => {
    if (open && application) {
      const buildingId =
        typeof application.buildingId === "string"
          ? application.buildingId
          : application.buildingId?._id || "";

      const planId =
        typeof application.planId === "string"
          ? application.planId
          : application.planId?._id || "";

      setFormData({
        firstName: application.firstName || "",
        lastName: application.lastName || "",
        middleName: application.middleName || "",
        email: application.email || "",
        phoneNumber: application.phoneNumber || "",
        buildingId: buildingId,
        tower: application.tower || "",
        floor: application.floor || "",
        unitNumber: application.unitNumber || "",
        planId: planId,
        idType: application.idType || "",
        idNumber: application.idNumber || "",
        macAddress: application.macAddress || "",
        notes: application.notes || "",
        adminNotes: application.adminNotes || "",
        status: application.status || "pending",
        serviceStatus: application.serviceStatus || "pending",
        installationFee: application.installationFee?.toString() || "",
        installationFeePaid: application.installationFeePaid || false,
      });

      // Set ID image preview
      if (application.idImage) {
        setIdImagePreview(application.idImage);
      } else {
        setIdImagePreview(null);
      }
      setIdImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setErrors({});
    }
  }, [open, application]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.buildingId) newErrors.buildingId = "Building is required";
    if (!formData.floor.trim()) newErrors.floor = "Floor is required";
    if (!formData.unitNumber.trim())
      newErrors.unitNumber = "Unit number is required";
    if (!formData.planId) newErrors.planId = "Plan is required";
    if (!formData.idNumber.trim()) newErrors.idNumber = "ID number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setIdImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeIdImage = () => {
    setIdImageFile(null);
    setIdImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Build the update data with all fields (removed birthDate and gender)
      const updateData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim() || "",
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        buildingId: formData.buildingId,
        tower: formData.tower.trim() || "",
        floor: formData.floor.trim(),
        unitNumber: formData.unitNumber.trim(),
        planId: formData.planId,
        idType: formData.idType.trim() || "",
        idNumber: formData.idNumber.trim(),
        macAddress: formData.macAddress.trim() || "",
        notes: formData.notes.trim() || "",
        adminNotes: formData.adminNotes.trim() || "",
        status: formData.status,
        serviceStatus: formData.serviceStatus,
        installationFee: parseFloat(formData.installationFee) || 0,
        installationFeePaid: formData.installationFeePaid,
      };

      console.log("📤 Submitting update data:", updateData);

      // Call the API
      await patchApplication(application._id, updateData);

      // Handle image upload if needed
      if (idImageFile) {
        const { updateApplication } = await import("@/services/application");
        await updateApplication(application._id, { idImage: idImageFile });
        console.log("✅ Image uploaded successfully");
      }

      await onSuccess(application._id, updateData);
      toast.success("Application updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("❌ Error updating application:", error);

      // Log the full error response
      if (error.response) {
        console.error("❌ Error response data:", error.response.data);
        console.error("❌ Error response status:", error.response.status);
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update application";
      toast.error(errorMessage);

      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(backendErrors).forEach((key) => {
          newErrors[key] = backendErrors[key];
        });
        setErrors(newErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">Edit Application</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Status Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Status
                </label>
                <select
                  value={formData.serviceStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceStatus: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="disconnected">Disconnected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.firstName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) =>
                    setFormData({ ...formData, middleName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.lastName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.phoneNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Type
                </label>
                <input
                  type="text"
                  value={formData.idType}
                  onChange={(e) =>
                    setFormData({ ...formData, idType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Passport, Driver License"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, idNumber: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.idNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.idNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.idNumber}</p>
                )}
              </div>
            </div>

            {/* ID Image */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Image
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIdImageChange}
                  className="hidden"
                  id="editIdImageUpload"
                />
                <label
                  htmlFor="editIdImageUpload"
                  className="px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Change Image
                </label>
                <span className="text-sm text-gray-500">
                  {idImageFile ? idImageFile.name : "Keep current image"}
                </span>
                {idImagePreview && !idImageFile && (
                  <button
                    type="button"
                    onClick={removeIdImage}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
                {idImageFile && (
                  <button
                    type="button"
                    onClick={removeIdImage}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove New
                  </button>
                )}
              </div>
              {idImagePreview && (
                <div className="mt-2 relative w-32 h-32 border rounded-md overflow-hidden">
                  <Image
                    src={idImagePreview}
                    alt="ID Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Accepted formats: JPG, PNG, GIF (Max 5MB)
              </p>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Address Information
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.buildingId}
                onChange={(e) =>
                  setFormData({ ...formData, buildingId: e.target.value })
                }
                className={`w-full px-3 py-2 border ${errors.buildingId ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select building</option>
                {buildings.map((building) => (
                  <option key={building._id} value={building._id}>
                    {building.buildingName}
                  </option>
                ))}
              </select>
              {errors.buildingId && (
                <p className="text-red-500 text-sm mt-1">{errors.buildingId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tower
                </label>
                <input
                  type="text"
                  value={formData.tower}
                  onChange={(e) =>
                    setFormData({ ...formData, tower: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., A, B, C"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.floor ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., 2nd Floor"
                />
                {errors.floor && (
                  <p className="text-red-500 text-sm mt-1">{errors.floor}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, unitNumber: e.target.value })
                  }
                  className={`w-full px-3 py-2 border ${errors.unitNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., 201"
                />
                {errors.unitNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.unitNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Plan Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Plan Information
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.planId}
                onChange={(e) =>
                  setFormData({ ...formData, planId: e.target.value })
                }
                className={`w-full px-3 py-2 border ${errors.planId ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select plan</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ₱{plan.price.toLocaleString()}
                  </option>
                ))}
              </select>
              {errors.planId && (
                <p className="text-red-500 text-sm mt-1">{errors.planId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  value={formData.macAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, macAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 00:1A:2B:3C:4D:5E"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Installation Fee (₱)
                </label>
                <input
                  type="number"
                  value={formData.installationFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installationFee: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.installationFeePaid}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installationFeePaid: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Installation Fee Paid
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Notes
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                  placeholder="Customer notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={formData.adminNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, adminNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                  placeholder="Admin notes..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
