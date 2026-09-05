// components/admin/CustomerDetailModal.tsx - COMPLETE

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FiX, FiEdit2, FiSave, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";

// Types
export interface CustomerItem {
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

interface CustomerDetailModalProps {
  isOpen: boolean;
  customer: CustomerItem | null;
  onClose: () => void;
  onAction: (action: string, customer: CustomerItem, data?: any) => void;
  onMarkBillAsPaid: (bill: any, customer: CustomerItem) => void;
  onMarkInstallationBillAsPaid: (bill: any, customer: CustomerItem) => void;
  onEditBillPrice: (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => void;
  onEditInstallationPrice: (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => void;
}

// ==================== HELPER FUNCTIONS ====================

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return "-";
  }
}

function formatBillPeriod(bill: any): string {
  if (!bill.billingPeriod?.start || !bill.billingPeriod?.end) return "-";

  let start = new Date(bill.billingPeriod.start);
  let end = new Date(bill.billingPeriod.end);

  if (!bill.isProRated && !bill.isInstallationBill) {
    const startDay = start.getUTCDate();
    const startMonth = start.getUTCMonth();
    const endMonth = end.getUTCMonth();

    if (startDay === 31 && endMonth === 7) {
      start = new Date(Date.UTC(2026, 7, 1));
    }
  }

  const startStr = formatDate(start.toISOString());
  const endStr = formatDate(end.toISOString());
  return `${startStr} - ${endStr}`;
}

// ==================== BILL PRICE EDIT COMPONENT ====================
const EditablePrice = ({
  amount,
  billId,
  isInstallation,
  customer,
  onSave,
}: {
  amount: number;
  billId: string;
  isInstallation: boolean;
  customer: CustomerItem;
  onSave: (billId: string, newPrice: number, customer: CustomerItem) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(amount.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    setDisplayAmount(amount);
    setEditValue(amount.toString());
    if (isEditing) {
      setIsEditing(false);
    }
  }, [amount]);

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price (must be 0 or greater)");
      return;
    }
    if (newPrice === displayAmount) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setDisplayAmount(newPrice);
    onSave(billId, newPrice, customer);
    setIsSaving(false);
    setIsEditing(false);
    toast.success(`✅ Price updated to ₱${newPrice.toLocaleString()}!`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(displayAmount.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">₱</span>
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 px-1 py-0.5 text-sm border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
          min="0"
          step="1"
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
          title="Save price"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FiSave className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => {
            setEditValue(displayAmount.toString());
            setIsEditing(false);
          }}
          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
          title="Cancel"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span
        className={`text-sm font-medium ${displayAmount > 0 ? "text-red-600" : "text-green-600"}`}
      >
        ₱{displayAmount.toLocaleString()}
      </span>
      {displayAmount > 0 && (
        <button
          onClick={() => {
            setEditValue(displayAmount.toString());
            setIsEditing(true);
          }}
          className="p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Edit price"
        >
          <FiEdit2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export default function CustomerDetailModal({
  isOpen,
  customer,
  onClose,
  onAction,
  onMarkBillAsPaid,
  onMarkInstallationBillAsPaid,
  onEditBillPrice,
  onEditInstallationPrice,
}: CustomerDetailModalProps) {
  const [localCustomer, setLocalCustomer] = useState<CustomerItem | null>(
    customer,
  );

  useEffect(() => {
    if (customer) {
      setLocalCustomer(customer);
    }
  }, [customer]);

  const handleEditBillPriceLocal = (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.map((bill: any) => {
        if (bill._id === billId) {
          return { ...bill, total: newPrice };
        }
        return bill;
      });
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, bill: any) => sum + (bill.total || 0),
          0,
        ),
      });
    }
    onEditBillPrice(billId, newPrice, customer);
  };

  const handleEditInstallationPriceLocal = (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.map((bill: any) => {
        if (bill._id === billId) {
          return { ...bill, total: newPrice, installationFee: newPrice };
        }
        return bill;
      });
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        installationFee: newPrice,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, bill: any) => sum + (bill.total || 0),
          0,
        ),
      });
    }
    onEditInstallationPrice(billId, newPrice, customer);
  };

  const handleMarkBillAsPaidLocal = (bill: any, customer: CustomerItem) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.filter(
        (b: any) => b._id !== bill._id,
      );
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, b: any) => sum + (b.total || 0),
          0,
        ),
      });
    }
    onMarkBillAsPaid(bill, customer);
  };

  const handleMarkInstallationBillAsPaidLocal = (
    bill: any,
    customer: CustomerItem,
  ) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.filter(
        (b: any) => b._id !== bill._id,
      );
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        installationFeePaid: true,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, b: any) => sum + (b.total || 0),
          0,
        ),
      });
    }
    onMarkInstallationBillAsPaid(bill, customer);
  };

  const handleFreeBillLocal = (bill: any, customer: CustomerItem) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.filter(
        (b: any) => b._id !== bill._id,
      );
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, b: any) => sum + (b.total || 0),
          0,
        ),
      });
    }
    onAction("freeBill", customer, { billId: bill._id });
  };

  const handleFreeInstallationLocal = (bill: any, customer: CustomerItem) => {
    if (localCustomer) {
      const updatedUnpaidBills = localCustomer.unpaidBills.filter(
        (b: any) => b._id !== bill._id,
      );
      setLocalCustomer({
        ...localCustomer,
        unpaidBills: updatedUnpaidBills,
        installationFeePaid: true,
        currentBalance: updatedUnpaidBills.reduce(
          (sum: number, b: any) => sum + (b.total || 0),
          0,
        ),
      });
    }
    onAction("freeInstallation", customer, { billId: bill._id });
  };

  const displayCustomer = localCustomer || customer;

  if (!isOpen || !displayCustomer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Customer Details</h2>
          <button
            onClick={() => {
              setLocalCustomer(null);
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">
                {displayCustomer.firstName} {displayCustomer.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p>{displayCustomer.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p>{displayCustomer.phoneNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="capitalize">{displayCustomer.type}</p>
            </div>
            <div>
              <p className="text-gray-500">Plan</p>
              <p>
                {displayCustomer.planName} (₱
                {displayCustomer.planPrice.toLocaleString()}/mo)
              </p>
            </div>
            <div>
              <p className="text-gray-500">Balance</p>
              <p
                className={
                  displayCustomer.currentBalance > 1000
                    ? "text-red-600 font-bold"
                    : "text-orange-600"
                }
              >
                ₱{displayCustomer.currentBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Building</p>
              <p>{displayCustomer.building?.buildingName || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Unit/Floor</p>
              <p>
                {displayCustomer.unitNumber
                  ? `Unit ${displayCustomer.unitNumber}`
                  : "-"}
                {displayCustomer.floor
                  ? `, Floor ${displayCustomer.floor}`
                  : ""}
              </p>
            </div>
            {displayCustomer.type === "application" && (
              <>
                <div>
                  <p className="text-gray-500">Installation Fee</p>
                  <p>
                    ₱{(displayCustomer.installationFee || 0).toLocaleString()}
                    <span
                      className={
                        displayCustomer.installationFeePaid
                          ? "text-green-600 ml-2"
                          : "text-red-600 ml-2"
                      }
                    >
                      ({displayCustomer.installationFeePaid ? "Paid" : "Unpaid"}
                      )
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Billing Status</p>
                  <p className="capitalize">
                    {displayCustomer.billingCycle?.status || "Not started"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {displayCustomer.unpaidBills.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2">
              Unpaid Bills ({displayCustomer.unpaidBills.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice</th>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-left">Due</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCustomer.unpaidBills.map((bill: any) => (
                    <tr key={bill._id}>
                      <td className="px-3 py-2 font-mono">
                        {bill.invoiceNumber}
                      </td>
                      <td className="px-3 py-2">{formatBillPeriod(bill)}</td>
                      <td className="px-3 py-2">{formatDate(bill.dueDate)}</td>
                      <td className="px-3 py-2">
                        {bill.isInstallationBill ? (
                          <EditablePrice
                            amount={bill.total}
                            billId={bill._id}
                            isInstallation={true}
                            customer={displayCustomer}
                            onSave={handleEditInstallationPriceLocal}
                          />
                        ) : (
                          <EditablePrice
                            amount={bill.total}
                            billId={bill._id}
                            isInstallation={false}
                            customer={displayCustomer}
                            onSave={handleEditBillPriceLocal}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {bill.isInstallationBill
                          ? "Installation"
                          : bill.isProRated
                            ? "Pro-rated"
                            : "Monthly"}
                      </td>
                      <td className="px-3 py-2">
                        {bill.isInstallationBill &&
                          !bill.installationFeePaid && (
                            <>
                              <button
                                onClick={() =>
                                  handleMarkInstallationBillAsPaidLocal(
                                    bill,
                                    displayCustomer,
                                  )
                                }
                                className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 mr-1"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() =>
                                  handleFreeInstallationLocal(
                                    bill,
                                    displayCustomer,
                                  )
                                }
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Free
                              </button>
                            </>
                          )}
                        {!bill.isInstallationBill && bill.status !== "paid" && (
                          <>
                            <button
                              onClick={() =>
                                handleMarkBillAsPaidLocal(bill, displayCustomer)
                              }
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-1"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() =>
                                handleFreeBillLocal(bill, displayCustomer)
                              }
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Free
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => {
              setLocalCustomer(null);
              onClose();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
