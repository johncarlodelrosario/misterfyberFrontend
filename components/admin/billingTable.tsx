// frontend/src/components/admin/billingTable.tsx - COMPLETE FIXED
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FiX,
  FiPlay,
  FiPause,
  FiEye,
  FiMail,
  FiCalendar,
  FiWifiOff,
  FiWifi,
  FiTrash2,
  FiHome,
  FiUser,
  FiFileText,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
  FiSettings,
  FiBell,
  FiClock,
  FiZap,
  FiCheckCircle,
  FiEdit2,
  FiSave,
  FiUserX,
  FiUserCheck,
  FiDollarSign,
  FiAlertCircle,
  FiActivity,
  FiTrendingUp,
  FiCreditCard,
  FiPieChart,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
} from "react-icons/fi";

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
  isDisconnected?: boolean;
  serviceStatus?: string;
  hiddenBills?: any[];
  visibleUnpaidBills?: any[];
  disconnectedAt?: string;
}

export interface Building {
  _id: string;
  buildingName: string;
  streetAddress: string;
  city: string;
  isActive: boolean;
}

export type SortField =
  | "name"
  | "plan"
  | "balance"
  | "status"
  | "installationFee";
export type SortDirection = "asc" | "desc";

export interface BillingStatsData {
  totalCustomers: number;
  totalBalance: number;
  customersWithBalanceCount: number;
  overdueCustomersCount: number;
  activeCyclesCount: number;
  pausedCyclesCount: number;
  pendingProRatedCount: number;
  pendingActivationsCount: number;
  pendingPaymentsCount: number;
  pendingInstallationBillsCount: number;
  applicationsWithoutBilling: number;
  totalInstallationFeesDue: number;
  installationFeesPaidCount: number;
  disconnectedCustomersCount?: number;
  collectibles?: number;
  totalOverdueAmount?: number;
  totalUnpaidBillsCount?: number;
  paidInstallationFeesAmount?: number;
  monthlyRecurringRevenue?: number;
  averageBalance?: number;
}

interface BillingTableProps {
  customers: CustomerItem[];
  billingCycles: any[];
  bills: any[];
  pendingPayments: any[];
  loading: boolean;
  refreshing: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  buildingFilter: string;
  setBuildingFilter: (value: string) => void;
  buildingsList: Building[];
  monthFilter: string;
  setMonthFilter: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setPagination: (value: any) => void;
  sortField: SortField;
  setSortField: (value: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
  stats: BillingStatsData;
  buildingFilteredStats?: BillingStatsData;
  activeBuildingName?: string | null;
  onAction: (action: string, customer: CustomerItem, data?: any) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenBackdated: () => void;
  onOpenExistingCustomers: () => void;
  onOpenPending: () => void;
  onOpenReports: () => void;
  totalPendingCount: number;
  customersWithoutAccounts: any[];
  applicationsWithoutBillingCount: number;
  onGenerateEarlyBill?: (customer: CustomerItem) => void;
  onAutoGenerateEarlyBills?: () => void;
  autoGenerationRunning?: boolean;
  lastAutoGenTime?: Date | null;
  realtimeUpdateCount?: number;
  websocketConnected?: boolean;
  onEditBillPrice?: (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => void;
  onEditInstallationPrice?: (
    billId: string,
    newPrice: number,
    customer: CustomerItem,
  ) => void;
  onDeleteBill?: (
    billId: string,
    invoiceNumber: string,
    customer: CustomerItem,
  ) => void;
  disconnectedCustomers?: CustomerItem[];
}

// Helper functions
function getBuildingDisplay(customer: CustomerItem): string {
  if (customer.building) {
    if (
      typeof customer.building === "object" &&
      customer.building.buildingName
    ) {
      return customer.building.buildingName;
    }
    if (typeof customer.building === "string") {
      return customer.building;
    }
  }
  return "-";
}

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

function getInstallationFeeStatus(customer: CustomerItem): {
  display: string;
  color: string;
  isDue: boolean;
  isPaid: boolean;
  amount: number;
} {
  const fee = customer.installationFee || 0;

  if (fee <= 0) {
    return {
      display: "—",
      color: "text-gray-400",
      isDue: false,
      isPaid: true,
      amount: 0,
    };
  }

  const unpaidInstallationBill = customer.unpaidBills?.find(
    (bill: any) => bill.isInstallationBill === true,
  );

  if (unpaidInstallationBill && unpaidInstallationBill.status !== "paid") {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-red-600",
      isDue: true,
      isPaid: false,
      amount: fee,
    };
  }

  if (customer.installationFeePaid === true) {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-green-600",
      isDue: false,
      isPaid: true,
      amount: fee,
    };
  }

  return {
    display: `₱${fee.toLocaleString()}`,
    color: "text-red-600",
    isDue: true,
    isPaid: false,
    amount: fee,
  };
}

function isInstallationFeeDue(customer: CustomerItem): boolean {
  const status = getInstallationFeeStatus(customer);
  return status.isDue;
}

// ==================== BILL PRICE EDIT COMPONENT ====================
const EditablePrice = ({
  amount,
  billId,
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

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("Please enter a valid price (must be 0 or greater)");
      return;
    }
    if (newPrice === amount) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    onSave(billId, newPrice, customer);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(amount.toString());
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
            setEditValue(amount.toString());
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
        className={`text-sm font-medium ${amount > 0 ? "text-red-600" : "text-green-600"}`}
      >
        ₱{amount.toLocaleString()}
      </span>
      {amount > 0 && (
        <button
          onClick={() => {
            setEditValue(amount.toString());
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

// ==================== CUSTOMER ROW ====================
const CustomerRow = React.memo(
  ({
    customer,
    index,
    onAction,
    onGenerateEarlyBill,
    onEditBillPrice,
    onEditInstallationPrice,
    onDeleteBill,
  }: {
    customer: CustomerItem;
    index: number;
    onAction: (action: string, customer: CustomerItem, data?: any) => void;
    onGenerateEarlyBill?: (customer: CustomerItem) => void;
    onEditBillPrice?: (
      billId: string,
      newPrice: number,
      customer: CustomerItem,
    ) => void;
    onEditInstallationPrice?: (
      billId: string,
      newPrice: number,
      customer: CustomerItem,
    ) => void;
    onDeleteBill?: (
      billId: string,
      invoiceNumber: string,
      customer: CustomerItem,
    ) => void;
  }) => {
    const hasUnpaidBills =
      customer.unpaidBills && customer.unpaidBills.length > 0;
    const hasBillingCycle = !!customer.billingCycle;
    const isActive = customer.billingCycle?.status === "active";
    const isPaused = customer.billingCycle?.status === "paused";
    const isPendingActivation =
      customer.billingCycle?.status === "pending_activation";

    const isDisconnected =
      customer.isDisconnected === true ||
      customer.status === "disconnected" ||
      customer.billingCycle?.status === "disconnected";

    const hasNextMonthBill = !!customer.nextMonthBill;

    const installFeeStatus = getInstallationFeeStatus(customer);
    const hasUnpaidInstallationFee = installFeeStatus.isDue;

    const unpaidInstallationBill = customer.unpaidBills?.find(
      (bill: any) => bill.isInstallationBill && bill.status !== "paid",
    );

    const visibleUnpaidBills = customer.unpaidBills || [];

    // ✅ FIXED: getStatusBadge
    const getStatusBadge = () => {
      if (isDisconnected) return "bg-gray-200 text-gray-700";
      if (hasUnpaidInstallationFee) return "bg-amber-100 text-amber-800";

      if (customer.type === "application") {
        if (!customer.billingCycle && customer.status === "approved") {
          return "bg-blue-100 text-blue-800";
        }
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        )
          return "bg-purple-100 text-purple-800";
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        )
          return "bg-green-100 text-green-800";
        if (customer.billingCycle?.status === "active")
          return "bg-green-100 text-green-800";
        if (customer.billingCycle?.status === "paused")
          return "bg-yellow-100 text-yellow-800";
        if (customer.status === "billing_started")
          return "bg-indigo-100 text-indigo-800";
        if (customer.status === "suspended") return "bg-red-100 text-red-800";
        return "bg-blue-100 text-blue-800";
      }

      if (customer.billingCycle?.status === "paused")
        return "bg-yellow-100 text-yellow-800";
      if (customer.status === "active") return "bg-green-100 text-green-800";
      if (customer.status === "suspended") return "bg-red-100 text-red-800";
      if (customer.status === "pending_activation")
        return "bg-purple-100 text-purple-800";
      return "bg-gray-100 text-gray-800";
    };

    // ✅ FIXED: getStatusText
    const getStatusText = () => {
      if (isDisconnected) return "Disconnected";
      if (hasUnpaidInstallationFee) return "Installation Fee Due";

      if (customer.type === "application") {
        if (!customer.billingCycle && customer.status === "approved") {
          return "Approved";
        }
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        )
          return "Awaiting Payment";
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        )
          return "Active";
        if (customer.billingCycle?.status === "active") return "Active";
        if (customer.billingCycle?.status === "paused") return "Paused";
        if (customer.status === "billing_started") return "Billing Started";
        if (customer.status === "suspended") return "Suspended";
        return customer.status || "Approved";
      }

      if (customer.billingCycle?.status === "paused") return "Paused";
      if (customer.status === "active") return "Active";
      if (customer.status === "suspended") return "Suspended";
      if (customer.status === "pending_activation") return "Pending Activation";
      return customer.status || "Inactive";
    };

    const getBalanceColor = (balance: number) => {
      if (isDisconnected) return "text-gray-400 line-through";
      if (balance === 0) return "text-green-600";
      if (balance > 1000) return "text-red-600 font-bold";
      return "text-orange-600";
    };

    const hasUnpaidMonthlyBill = visibleUnpaidBills.some(
      (bill: any) => !bill.isInstallationBill && bill.status !== "paid",
    );
    const hasUnpaidInstallationBill = visibleUnpaidBills.some(
      (bill: any) => bill.isInstallationBill && bill.status !== "paid",
    );

    return (
      <tr
        className={`${
          isDisconnected ? "bg-gray-100 opacity-75" : "hover:bg-blue-50"
        } transition-colors`}
      >
        <td className="px-3 py-2 text-center text-sm font-medium text-gray-500 sticky left-0 bg-inherit z-10">
          {index + 1}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {isDisconnected ? (
              <FiUserX className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            ) : customer.type === "application" ? (
              <FiFileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            ) : (
              <FiUser className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${isDisconnected ? "text-gray-500" : "text-gray-900"}`}
              >
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-xs text-gray-500">{customer.email}</p>
              {customer.applicationId && (
                <p className="text-[10px] text-gray-400 font-mono break-all">
                  {customer.applicationId}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2">
          <p
            className={`text-sm font-medium ${isDisconnected ? "text-gray-500" : "text-gray-900"}`}
          >
            {customer.planName}
          </p>
          <p className="text-xs text-gray-500">
            ₱{customer.planPrice.toLocaleString()}/mo
          </p>
        </td>
        <td className="px-3 py-2">
          <p
            className={`text-sm font-bold ${getBalanceColor(customer.currentBalance)}`}
          >
            ₱{customer.currentBalance.toLocaleString()}
          </p>
          {customer.unpaidBills.length > 0 && !isDisconnected && (
            <p className="text-[10px] text-red-500">
              {customer.unpaidBills.length} unpaid
            </p>
          )}
          {isDisconnected && customer.unpaidBills.length > 0 && (
            <p className="text-[10px] text-gray-500 italic">
              {customer.unpaidBills.length} bill(s) preserved
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge()}`}
          >
            {isDisconnected && "🔌 "}
            {getStatusText()}
          </span>
          {hasNextMonthBill && !isDisconnected && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded-full">
              Next Month Ready
            </span>
          )}
          {isDisconnected && customer.disconnectedAt && (
            <p className="text-[9px] text-gray-500 mt-0.5">
              Since {formatDate(customer.disconnectedAt)}
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          {customer.type === "application" && installFeeStatus.amount > 0 ? (
            <div>
              {!isDisconnected &&
              unpaidInstallationBill &&
              onEditInstallationPrice ? (
                <EditablePrice
                  amount={installFeeStatus.amount}
                  billId={unpaidInstallationBill._id}
                  isInstallation={true}
                  customer={customer}
                  onSave={onEditInstallationPrice}
                />
              ) : (
                <p
                  className={`text-sm font-medium ${isDisconnected ? "text-gray-400" : installFeeStatus.color}`}
                >
                  {installFeeStatus.display}
                </p>
              )}
              <p
                className={`text-[10px] ${
                  installFeeStatus.isPaid ? "text-green-600" : "text-red-600"
                }`}
              >
                {installFeeStatus.isPaid ? "✅ Paid" : "❌ Unpaid"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <FiHome className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span
              className={`text-xs ${isDisconnected ? "text-gray-400" : "text-gray-600"}`}
            >
              {getBuildingDisplay(customer)}
            </span>
            {customer.unitNumber && (
              <span className="text-xs text-gray-400">
                (Unit {customer.unitNumber})
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onAction("view", customer)}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <FiEye className="w-3.5 h-3.5" />
            </button>

            {isDisconnected ? (
              <button
                onClick={() => onAction("reconnect", customer)}
                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                title="Reconnect - Restore Service"
              >
                <FiUserCheck className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onAction("email", customer)}
                  className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                  title="Send Email"
                >
                  <FiMail className="w-3.5 h-3.5" />
                </button>

                {hasUnpaidMonthlyBill && (
                  <button
                    onClick={() => {
                      const bill = visibleUnpaidBills.find(
                        (b: any) =>
                          !b.isInstallationBill && b.status !== "paid",
                      );
                      if (bill) {
                        onAction("freeBill", customer, { billId: bill._id });
                      }
                    }}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Mark Bill as FREE"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}

                {hasUnpaidInstallationBill && (
                  <button
                    onClick={() => {
                      const bill = visibleUnpaidBills.find(
                        (b: any) => b.isInstallationBill && b.status !== "paid",
                      );
                      if (bill) {
                        onAction("freeInstallation", customer, {
                          billId: bill._id,
                        });
                      }
                    }}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Mark Installation Fee as FREE"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}

                {onDeleteBill &&
                  (hasUnpaidMonthlyBill || hasUnpaidInstallationBill) && (
                    <button
                      onClick={() => {
                        let bill = visibleUnpaidBills.find(
                          (b: any) =>
                            !b.isInstallationBill && b.status !== "paid",
                        );
                        if (!bill) {
                          bill = visibleUnpaidBills.find(
                            (b: any) =>
                              b.isInstallationBill && b.status !== "paid",
                          );
                        }
                        if (bill) {
                          onDeleteBill(bill._id, bill.invoiceNumber, customer);
                        }
                      }}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Delete Bill"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                {customer.type === "application" && hasBillingCycle && (
                  <button
                    onClick={() => onAction("recover", customer)}
                    className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                    title="Recover Missing Bills"
                  >
                    <FiCalendar className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.type === "application" &&
                  isActive &&
                  !hasNextMonthBill && (
                    <button
                      onClick={() => onGenerateEarlyBill?.(customer)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Generate Next Month Bill"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                    </button>
                  )}
                {customer.type === "application" && (
                  <>
                    {!hasBillingCycle && (
                      <button
                        onClick={() => onAction("start", customer)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Start Billing"
                      >
                        <FiPlay className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={() => onAction("pause", customer)}
                        className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                        title="Pause Billing"
                      >
                        <FiPause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isPaused && (
                      <button
                        onClick={() => onAction("resume", customer)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Resume Billing"
                      >
                        <FiPlay className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(isActive || isPendingActivation) && (
                      <button
                        onClick={() => onAction("disconnect", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Disconnect - Preserve bills, mark customer as disconnected"
                      >
                        <FiWifiOff className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {hasBillingCycle && (
                      <button
                        onClick={() => onAction("stop", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Cancel Subscription"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasBillingCycle && (
                      <button
                        onClick={() => onAction("delete", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Delete Billing Cycle"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                {customer.type === "user" && (
                  <>
                    {(!customer.billingCycle ||
                      customer.billingCycle?.status === "cancelled") && (
                      <button
                        onClick={() => onAction("start", customer)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Start Billing"
                      >
                        <FiPlay className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {customer.billingCycle?.status === "active" && (
                      <button
                        onClick={() => onAction("pause", customer)}
                        className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                        title="Pause Billing"
                      >
                        <FiPause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {customer.billingCycle?.status === "paused" && (
                      <button
                        onClick={() => onAction("resume", customer)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        title="Resume Billing"
                      >
                        <FiPlay className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {customer.billingCycle?.status === "active" && (
                      <button
                        onClick={() => onAction("stop", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Cancel Subscription"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {customer.status === "active" && (
                      <button
                        onClick={() => onAction("disconnect", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Disconnect - Preserve bills"
                      >
                        <FiWifiOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {customer.billingCycle && (
                      <button
                        onClick={() => onAction("delete", customer)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Delete Billing Cycle"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

CustomerRow.displayName = "CustomerRow";

// ==================== MAIN COMPONENT ====================
export default function BillingTable({
  customers,
  loading,
  refreshing,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  buildingFilter,
  setBuildingFilter,
  buildingsList,
  monthFilter,
  setMonthFilter,
  dateFilter,
  setDateFilter,
  pagination,
  setPagination,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  stats,
  buildingFilteredStats,
  activeBuildingName,
  onAction,
  onRefresh,
  onOpenSettings,
  onOpenBackdated,
  onOpenExistingCustomers,
  onOpenPending,
  onOpenReports,
  totalPendingCount,
  customersWithoutAccounts,
  applicationsWithoutBillingCount,
  onGenerateEarlyBill,
  onAutoGenerateEarlyBills,
  autoGenerationRunning = false,
  lastAutoGenTime = null,
  realtimeUpdateCount = 0,
  websocketConnected = false,
  onEditBillPrice,
  onEditInstallationPrice,
  onDeleteBill,
  disconnectedCustomers = [],
}: BillingTableProps) {
  const [displayCustomers, setDisplayCustomers] = useState<CustomerItem[]>(
    customers || [],
  );

  const [showAllStats, setShowAllStats] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    setDisplayCustomers(customers || []);
  }, [customers]);

  const dateRange = useMemo(() => {
    if (!monthFilter && !dateFilter) return null;

    if (dateFilter) {
      const d = new Date(`${dateFilter}T00:00:00`);
      if (isNaN(d.getTime())) return null;
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }

    if (monthFilter) {
      const [yStr, mStr] = monthFilter.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (isNaN(y) || isNaN(m)) return null;
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    return null;
  }, [monthFilter, dateFilter]);

  const billInRange = (bill: any): boolean => {
    if (!dateRange) return true;
    const raw =
      bill?.billDate ||
      bill?.createdAt ||
      bill?.dueDate ||
      bill?.paidAt ||
      bill?.paymentDate ||
      bill?.updatedAt;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return d >= dateRange.start && d <= dateRange.end;
  };

  // ✅ CRITICAL FIX: Date range filter must not hide customers who have NO bills.
  // Approved applications without billing must remain visible regardless of month filter.
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = [...displayCustomers];

    if (dateRange) {
      filtered = filtered.filter((c) => {
        const allBills = [
          ...(c.unpaidBills || []),
          ...(c.overdueBills || []),
          ...(c.visibleUnpaidBills || []),
          ...(c.hiddenBills || []),
        ];
        if (c.billingCycle?.bills && Array.isArray(c.billingCycle.bills)) {
          allBills.push(...c.billingCycle.bills);
        }
        if (c.nextMonthBill) allBills.push(c.nextMonthBill);

        // ✅ ITO ANG FIX: Kung walang bills, huwag i-filter out. Ipakita pa rin.
        if (allBills.length === 0) return true;

        return allBills.some((b) => billInRange(b));
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(term) ||
          c.lastName?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          (c.applicationId && c.applicationId.toLowerCase().includes(term)),
      );
    }

    if (buildingFilter !== "all") {
      filtered = filtered.filter((c) => {
        const customerBuildingId = c.building?._id || null;
        return customerBuildingId === buildingFilter;
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        const isDisc =
          c.isDisconnected === true ||
          c.status === "disconnected" ||
          c.billingCycle?.status === "disconnected";

        if (statusFilter === "disconnected") return isDisc;
        if (isDisc && statusFilter !== "all") return false;

        if (statusFilter === "has_balance") return c.currentBalance > 0;
        if (statusFilter === "overdue") return c.overdueBills.length > 0;
        if (statusFilter === "active") return c.status === "active";
        if (statusFilter === "suspended") return c.status === "suspended";
        if (statusFilter === "paused")
          return c.billingCycle?.status === "paused";
        if (statusFilter === "pending_activation") {
          const hasUnpaid = c.unpaidBills && c.unpaidBills.length > 0;
          return c.billingCycle?.status === "pending_activation" && hasUnpaid;
        }
        if (statusFilter === "applications") return c.type === "application";
        if (statusFilter === "installation_fee_due") {
          return isInstallationFeeDue(c);
        }
        if (statusFilter === "approved_no_billing") {
          return (
            c.type === "application" &&
            !c.billingCycle &&
            c.status !== "disconnected" &&
            c.status !== "suspended"
          );
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "plan":
          aValue = a.planName.toLowerCase();
          bValue = b.planName.toLowerCase();
          break;
        case "balance":
          aValue = a.currentBalance;
          bValue = b.currentBalance;
          break;
        case "status": {
          const getStatusText = (c: CustomerItem) => {
            if (
              c.isDisconnected ||
              c.status === "disconnected" ||
              c.billingCycle?.status === "disconnected"
            )
              return "Disconnected";
            if (isInstallationFeeDue(c)) return "Installation Fee Due";
            if (c.type === "application")
              return c.billingCycle?.status || "Approved";
            return c.status || "Inactive";
          };
          aValue = getStatusText(a);
          bValue = getStatusText(b);
          break;
        }
        case "installationFee": {
          const getInstallFeeSort = (c: CustomerItem) => {
            if (c.type !== "application") return -2;
            const fee = c.installationFee || 0;
            if (fee <= 0) return -1;
            if (isInstallationFeeDue(c)) return fee;
            return 0;
          };
          aValue = getInstallFeeSort(a);
          bValue = getInstallFeeSort(b);
          break;
        }
        default:
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    displayCustomers,
    searchTerm,
    statusFilter,
    buildingFilter,
    sortField,
    sortDirection,
    dateRange,
  ]);

  useEffect(() => {
    setPagination((prev: any) => ({
      ...prev,
      total: filteredAndSortedCustomers.length,
      totalPages: Math.ceil(filteredAndSortedCustomers.length / prev.limit),
      page: Math.min(
        prev.page,
        Math.ceil(filteredAndSortedCustomers.length / prev.limit) || 1,
      ),
    }));
  }, [filteredAndSortedCustomers.length, setPagination]);

  const currentPageData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredAndSortedCustomers.slice(start, end);
  }, [filteredAndSortedCustomers, pagination.page, pagination.limit]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <FiArrowUp className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiArrowUp className="w-3 h-3" />
    ) : (
      <FiArrowDown className="w-3 h-3" />
    );
  };

  const getLastAutoGenText = () => {
    if (!lastAutoGenTime) return "Never";
    const now = new Date();
    const diff = now.getTime() - lastAutoGenTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const disconnectedCount = useMemo(() => {
    return displayCustomers.filter(
      (c) =>
        c.isDisconnected === true ||
        c.status === "disconnected" ||
        c.billingCycle?.status === "disconnected",
    ).length;
  }, [displayCustomers]);

  const displayStats = buildingFilteredStats || stats;

  const hasActiveFilters =
    (statusFilter && statusFilter !== "all") ||
    (buildingFilter && buildingFilter !== "all") ||
    !!monthFilter ||
    !!dateFilter ||
    !!searchTerm;

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBuildingFilter("all");
    setMonthFilter("");
    setDateFilter("");
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Customer Billing List
          </h2>
          {websocketConnected && (
            <p className="text-xs text-green-600 mt-1">
              🟢 Live
              {realtimeUpdateCount > 0 && ` · ${realtimeUpdateCount} updates`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onAutoGenerateEarlyBills && (
            <button
              onClick={onAutoGenerateEarlyBills}
              disabled={autoGenerationRunning}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              title={`Last run: ${getLastAutoGenText()}`}
            >
              <FiZap
                className={`w-4 h-4 ${autoGenerationRunning ? "animate-pulse" : ""}`}
              />
              {autoGenerationRunning ? "Generating..." : "Auto-Gen"}
            </button>
          )}

          {/* Reports button removed from table toolbar */}

          <button
            onClick={onOpenBackdated}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <FiCalendar className="w-4 h-4" />
            <span className="hidden sm:inline">Backdated</span>
          </button>

          {(customersWithoutAccounts.length > 0 ||
            applicationsWithoutBillingCount > 0) && (
            <button
              onClick={onOpenExistingCustomers}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FiUser className="w-4 h-4" />
              <span className="hidden sm:inline">
                Existing (
                {customersWithoutAccounts.length +
                  applicationsWithoutBillingCount}
                )
              </span>
            </button>
          )}

          {totalPendingCount > 0 && (
            <button
              onClick={onOpenPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FiBell className="w-4 h-4" />
              <span className="hidden sm:inline">
                Pending ({totalPendingCount})
              </span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <FiSettings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => {
              setDisplayCustomers([...customers]);
              if (onRefresh) {
                onRefresh();
              }
            }}
            disabled={refreshing}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Active building filter indicator */}
      {activeBuildingName && (
        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <FiHome className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Showing stats for: <strong>{activeBuildingName}</strong>
          </span>
          <button
            onClick={() => setBuildingFilter("all")}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Show All Buildings
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div
          className="overflow-x-auto"
          style={{ maxHeight: "600px", overflowY: "auto" }}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 w-12"></th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Customer <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("plan")}
                >
                  <div className="flex items-center gap-1">
                    Plan <SortIcon field="plan" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center gap-1">
                    Balance <SortIcon field="balance" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("installationFee")}
                >
                  <div className="flex items-center gap-1">
                    Install Fee <SortIcon field="installationFee" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <FiHome className="w-3 h-3" /> Building
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500 text-sm"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                currentPageData.map((customer, idx) => (
                  <CustomerRow
                    key={`${customer.type}-${customer._id}`}
                    customer={customer}
                    index={(pagination.page - 1) * pagination.limit + idx}
                    onAction={onAction}
                    onGenerateEarlyBill={onGenerateEarlyBill}
                    onEditBillPrice={onEditBillPrice}
                    onEditInstallationPrice={onEditInstallationPrice}
                    onDeleteBill={onDeleteBill}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border border-gray-200 flex-wrap gap-3">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} customers
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev: any) => ({
                  ...prev,
                  page: prev.page - 1,
                }))
              }
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((prev: any) => ({
                  ...prev,
                  page: prev.page + 1,
                }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
        Showing {currentPageData.length} of {filteredAndSortedCustomers.length}{" "}
        customers ({customers.filter((c) => c.type === "user").length} users,{" "}
        {customers.filter((c) => c.type === "application").length} applications)
        {disconnectedCount > 0 && (
          <span className="ml-2 text-gray-600">
            | 🔌 {disconnectedCount} disconnected
          </span>
        )}
        {activeBuildingName && (
          <span className="ml-2 text-blue-600">| 🏢 {activeBuildingName}</span>
        )}
        {dateFilter && (
          <span className="ml-2 text-indigo-600">
            | 📅 {formatDate(dateFilter)}
          </span>
        )}
        {!dateFilter && monthFilter && (
          <span className="ml-2 text-indigo-600">
            | 🗓️{" "}
            {new Date(
              parseInt(monthFilter.split("-")[0], 10),
              parseInt(monthFilter.split("-")[1], 10) - 1,
              1,
            ).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        - Sorted by {sortField} (
        {sortDirection === "asc" ? "Ascending" : "Descending"})
        {lastAutoGenTime && (
          <span className="ml-4 text-gray-400">
            ⚡ Auto-gen last run: {getLastAutoGenText()}
          </span>
        )}
        {realtimeUpdateCount > 0 && (
          <span className="ml-4 text-green-500">
            🔄 Real-time updates: {realtimeUpdateCount}
          </span>
        )}
        {websocketConnected && (
          <span className="ml-4 text-green-500">🟢 Live</span>
        )}
      </div>
    </div>
  );
}
