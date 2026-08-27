// components/admin/AddApplicationModal.tsx - COMPLETE FIXED
"use client";

import React, { useState, useEffect } from "react";
import { getActiveBuildings, Building } from "@/services/building";
import { getPlans, Plan } from "@/services/plan";
import { submitApplication, ApplicationData } from "@/services/application";
import { toast } from "sonner";

interface AddApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddApplicationModal({
  open,
  onOpenChange,
  onSuccess,
}: AddApplicationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    buildingId: "",
    tower: "",
    floor: "",
    unitNumber: "",
    planId: "",
    idType: "Passport",
    idNumber: "",
    macAddress: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        setLoadingData(true);
        try {
          const [buildingsRes, plansRes] = await Promise.all([
            getActiveBuildings(),
            getPlans(),
          ]);
          setBuildings(buildingsRes || []);
          setPlans(plansRes || []);
        } catch (error) {
          console.error("Error loading data:", error);
          toast.error("Failed to load buildings and plans");
        } finally {
          setLoadingData(false);
        }
      };
      loadData();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const applicationData: ApplicationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        buildingId: formData.buildingId,
        tower: formData.tower.trim(),
        floor: formData.floor.trim(),
        unitNumber: formData.unitNumber.trim(),
        planId: formData.planId,
        idType: formData.idType,
        idNumber: formData.idNumber.trim(),
        macAddress: formData.macAddress.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await submitApplication(applicationData);

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        buildingId: "",
        tower: "",
        floor: "",
        unitNumber: "",
        planId: "",
        idType: "Passport",
        idNumber: "",
        macAddress: "",
        notes: "",
      });
      setErrors({});

      onSuccess();
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting application:", error);

      // Handle specific error messages from backend
      const errorMessage =
        error?.response?.data?.message || "Failed to submit application";
      toast.error(errorMessage);

      // If there are validation errors from backend, display them
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

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">Add New Customer Application</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`w-full px-3 py-2 border ${errors.firstName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Juan"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.firstName}
                  </p>
                )}
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
                  className={`w-full px-3 py-2 border ${errors.lastName ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Dela Cruz"
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
                  className={`w-full px-3 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="customer@email.com"
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
                  className={`w-full px-3 py-2 border ${errors.phoneNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="09123456789"
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
                <select
                  value={formData.idType}
                  onChange={(e) =>
                    setFormData({ ...formData, idType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver License</option>
                  <option value="National ID">National ID</option>
                  <option value="UMID">UMID</option>
                  <option value="Postal ID">Postal ID</option>
                  <option value="Other">Other</option>
                </select>
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
                  className={`w-full px-3 py-2 border ${errors.idNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Enter ID number"
                />
                {errors.idNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.idNumber}</p>
                )}
              </div>
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
                className={`w-full px-3 py-2 border ${errors.buildingId ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                disabled={loadingData}
              >
                <option value="">
                  {loadingData ? "Loading..." : "Select building"}
                </option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className={`w-full px-3 py-2 border ${errors.floor ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                  className={`w-full px-3 py-2 border ${errors.unitNumber ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                className={`w-full px-3 py-2 border ${errors.planId ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                disabled={loadingData}
              >
                <option value="">
                  {loadingData ? "Loading..." : "Select plan"}
                </option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ₱{plan.price.toLocaleString()} (
                    {plan.speed?.download || 0} Mbps)
                  </option>
                ))}
              </select>
              {errors.planId && (
                <p className="text-red-500 text-sm mt-1">{errors.planId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address (Optional)
              </label>
              <input
                type="text"
                value={formData.macAddress}
                onChange={(e) =>
                  setFormData({ ...formData, macAddress: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 00:1A:2B:3C:4D:5E"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
              placeholder="Additional notes about this application..."
            />
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
              disabled={isLoading || loadingData}
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
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
