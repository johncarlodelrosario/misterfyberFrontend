// components/billing/BackdatedModal.tsx

"use client";

import React from "react";
import { FiX } from "react-icons/fi";

interface CustomerItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phoneNumber: string;
  status: string;
  type: "user" | "application";
  planName: string;
  planPrice: number;
  currentBalance: number;
  unpaidBills: any[];
  overdueBills: any[];
  billingCycle?: any;
  applicationId?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
  building?: {
    _id?: string;
    buildingName: string;
    streetAddress?: string;
    city?: string;
  } | null;
  unitNumber?: string;
  floor?: string;
  nextMonthBill?: any;
}

interface BackdatedForm {
  applicationId: string;
  serviceStartDate: string;
  customPlanName: string;
  monthlyRate: string;
  skipFirstBill: boolean;
  notes: string;
  includeInstallationFee: boolean;
}

interface BackdatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerItem[];
  selectedBackdatedCustomer: CustomerItem | null;
  setSelectedBackdatedCustomer: (customer: CustomerItem | null) => void;
  backdatedForm: BackdatedForm;
  setBackdatedForm: React.Dispatch<React.SetStateAction<BackdatedForm>>;
  backdatedLoading: boolean;
  onConfirm: () => void;
  installationFee: number;
}

export default function BackdatedModal({
  isOpen,
  onClose,
  customers,
  selectedBackdatedCustomer,
  setSelectedBackdatedCustomer,
  backdatedForm,
  setBackdatedForm,
  backdatedLoading,
  onConfirm,
  installationFee,
}: BackdatedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Backdated Billing</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-lg text-sm">
            <p className="font-semibold text-amber-800">📌 When to use:</p>
            <p className="text-xs text-amber-700">
              Customer has been using internet for past months - generates all
              missing bills from start date
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer *
            </label>
            <select
              value={backdatedForm.applicationId}
              onChange={(e) => {
                const appId = e.target.value;
                const customer = customers.find(
                  (c: CustomerItem) =>
                    c.type === "application" &&
                    c.applicationId === appId &&
                    !c.billingCycle,
                );
                setSelectedBackdatedCustomer(customer || null);
                setBackdatedForm({
                  ...backdatedForm,
                  applicationId: appId,
                  customPlanName: customer?.planName || "",
                  monthlyRate: customer?.planPrice?.toString() || "",
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a customer...</option>
              {customers
                .filter(
                  (c: CustomerItem) =>
                    c.type === "application" &&
                    !c.billingCycle &&
                    c.applicationId,
                )
                .map((c: CustomerItem) => (
                  <option key={c.applicationId} value={c.applicationId}>
                    {c.firstName} {c.lastName} - {c.email}
                  </option>
                ))}
            </select>
          </div>

          {selectedBackdatedCustomer && (
            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <p className="font-medium">
                {selectedBackdatedCustomer.firstName}{" "}
                {selectedBackdatedCustomer.lastName}
              </p>
              <p className="text-xs text-gray-600">
                {selectedBackdatedCustomer.email} |{" "}
                {selectedBackdatedCustomer.planName} - ₱
                {selectedBackdatedCustomer.planPrice}/mo
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Start Date *
            </label>
            <input
              type="date"
              value={backdatedForm.serviceStartDate}
              onChange={(e) =>
                setBackdatedForm({
                  ...backdatedForm,
                  serviceStartDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {!selectedBackdatedCustomer?.planName && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={backdatedForm.customPlanName}
                  onChange={(e) =>
                    setBackdatedForm({
                      ...backdatedForm,
                      customPlanName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter plan name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rate (₱)
                </label>
                <input
                  type="number"
                  value={backdatedForm.monthlyRate}
                  onChange={(e) =>
                    setBackdatedForm({
                      ...backdatedForm,
                      monthlyRate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter monthly rate"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={backdatedForm.includeInstallationFee}
                onChange={(e) =>
                  setBackdatedForm({
                    ...backdatedForm,
                    includeInstallationFee: e.target.checked,
                  })
                }
              />
              Include Installation Fee (₱
              {installationFee.toLocaleString()})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={backdatedForm.skipFirstBill}
                onChange={(e) =>
                  setBackdatedForm({
                    ...backdatedForm,
                    skipFirstBill: e.target.checked,
                  })
                }
              />
              Skip first bill
            </label>
          </div>

          <div>
            <textarea
              value={backdatedForm.notes}
              onChange={(e) =>
                setBackdatedForm({
                  ...backdatedForm,
                  notes: e.target.value,
                })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={backdatedLoading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {backdatedLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                "Generate Bills"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
