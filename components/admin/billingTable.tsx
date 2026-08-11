// components/admin/BillingTable.tsx - COMPLETE FIXED VERSION

"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
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
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiBell,
  FiClock,
  FiZap,
  FiCheckCircle,
  FiAlertCircle,
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
  stats: {
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
  };
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

// FIXED: Proper date formatter using UTC
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

// FIXED: Dynamically check if installation fee is truly due based on unpaid bills
function isInstallationFeeDue(customer: CustomerItem): boolean {
  // Only applicable for application type customers
  if (customer.type !== "application") return false;

  // Check if there's an installation fee
  const fee = customer.installationFee || 0;
  if (fee <= 0) return false;

  // CRITICAL FIX: Check if there's an UNPAID installation bill
  // This is the source of truth - not the installationFeePaid flag
  const hasUnpaidInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true && bill.status !== "paid",
  );

  // If there's an unpaid installation bill, the fee is due
  if (hasUnpaidInstallationBill) return true;

  // If the fee is marked as paid, it's not due
  if (customer.installationFeePaid === true) return false;

  // Check if there's a paid installation bill
  const hasPaidInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true && bill.status === "paid",
  );

  // If there's a paid installation bill, fee is not due
  if (hasPaidInstallationBill) return false;

  // If there's no installation bill at all, and fee > 0, it's due
  const hasAnyInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true,
  );

  // Only due if there's no installation bill at all AND fee > 0 AND not marked paid
  return !hasAnyInstallationBill && fee > 0;
}

// FIXED: Get installation fee display status - DYNAMIC based on bills
function getInstallationFeeStatus(customer: CustomerItem): {
  display: string;
  color: string;
  isDue: boolean;
  isPaid: boolean;
  amount: number;
} {
  const fee = customer.installationFee || 0;

  // If fee is 0 or less, no installation fee
  if (fee <= 0) {
    return {
      display: "—",
      color: "text-gray-400",
      isDue: false,
      isPaid: true,
      amount: 0,
    };
  }

  // CRITICAL FIX: Check actual unpaid installation bills
  const hasUnpaidInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true && bill.status !== "paid",
  );

  // Check if there's any installation bill at all
  const hasAnyInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true,
  );

  // Check if there's a paid installation bill
  const hasPaidInstallationBill = customer.unpaidBills?.some(
    (bill: any) => bill.isInstallationBill === true && bill.status === "paid",
  );

  // If there's an unpaid installation bill -> NOT PAID
  if (hasUnpaidInstallationBill) {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-red-600",
      isDue: true,
      isPaid: false,
      amount: fee,
    };
  }

  // If there's a paid installation bill -> PAID
  if (hasPaidInstallationBill) {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-green-600",
      isDue: false,
      isPaid: true,
      amount: fee,
    };
  }

  // If there's no installation bill at all, but fee > 0 -> DUE
  if (!hasAnyInstallationBill && fee > 0) {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-red-600",
      isDue: true,
      isPaid: false,
      amount: fee,
    };
  }

  // Check the flag as fallback
  if (customer.installationFeePaid === true) {
    return {
      display: `₱${fee.toLocaleString()}`,
      color: "text-green-600",
      isDue: false,
      isPaid: true,
      amount: fee,
    };
  }

  // Default: due
  return {
    display: `₱${fee.toLocaleString()}`,
    color: "text-red-600",
    isDue: true,
    isPaid: false,
    amount: fee,
  };
}

// Memoized Row Component - FIXED
const CustomerRow = React.memo(
  ({
    customer,
    index,
    onAction,
    onGenerateEarlyBill,
  }: {
    customer: CustomerItem;
    index: number;
    onAction: (action: string, customer: CustomerItem, data?: any) => void;
    onGenerateEarlyBill?: (customer: CustomerItem) => void;
  }) => {
    const hasUnpaidBills =
      customer.unpaidBills && customer.unpaidBills.length > 0;
    const hasBillingCycle = !!customer.billingCycle;
    const isActive = customer.billingCycle?.status === "active";
    const isPaused = customer.billingCycle?.status === "paused";
    const isPendingActivation =
      customer.billingCycle?.status === "pending_activation";
    const hasNextMonthBill = !!customer.nextMonthBill;

    // FIXED: Proper installation fee status - DYNAMIC from bills
    const installFeeStatus = getInstallationFeeStatus(customer);
    const hasUnpaidInstallationFee = installFeeStatus.isDue;

    // FIXED: Proper status badge determination
    const getStatusBadge = () => {
      // If there's an unpaid installation fee, show that first
      if (hasUnpaidInstallationFee) {
        return "bg-amber-100 text-amber-800";
      }

      if (customer.type === "application") {
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        ) {
          return "bg-purple-100 text-purple-800";
        }
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        ) {
          return "bg-green-100 text-green-800";
        }
        if (customer.billingCycle?.status === "active") {
          return "bg-green-100 text-green-800";
        }
        if (customer.billingCycle?.status === "paused") {
          return "bg-yellow-100 text-yellow-800";
        }
        if (customer.status === "billing_started") {
          return "bg-indigo-100 text-indigo-800";
        }
        return "bg-blue-100 text-blue-800";
      }

      if (customer.billingCycle?.status === "paused") {
        return "bg-yellow-100 text-yellow-800";
      }
      if (customer.status === "active") {
        return "bg-green-100 text-green-800";
      }
      if (customer.status === "suspended") {
        return "bg-red-100 text-red-800";
      }
      if (customer.status === "pending_activation") {
        return "bg-purple-100 text-purple-800";
      }
      return "bg-gray-100 text-gray-800";
    };

    // FIXED: Proper status text determination
    const getStatusText = () => {
      // Installation fee due takes priority
      if (hasUnpaidInstallationFee) {
        return "Installation Fee Due";
      }

      if (customer.type === "application") {
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        ) {
          return "Awaiting Payment";
        }
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        ) {
          return "Active";
        }
        if (customer.billingCycle?.status === "active") {
          return "Active";
        }
        if (customer.billingCycle?.status === "paused") {
          return "Paused";
        }
        if (customer.status === "billing_started") {
          return "Billing Started";
        }
        return "Approved";
      }

      if (customer.billingCycle?.status === "paused") {
        return "Paused";
      }
      if (customer.status === "active") {
        return "Active";
      }
      if (customer.status === "suspended") {
        return "Suspended";
      }
      if (customer.status === "pending_activation") {
        return "Pending Activation";
      }
      return customer.status || "Inactive";
    };

    const getBalanceColor = (balance: number) => {
      if (balance === 0) return "text-green-600";
      if (balance > 1000) return "text-red-600 font-bold";
      return "text-orange-600";
    };

    return (
      <tr
        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
      >
        <td className="px-3 py-2 text-center text-sm font-medium text-gray-500 sticky left-0 bg-inherit z-10">
          {index + 1}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {customer.type === "application" ? (
              <FiFileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            ) : (
              <FiUser className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
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
          <p className="text-sm font-medium text-gray-900">
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
          {customer.unpaidBills.length > 0 && (
            <p className="text-[10px] text-red-500">
              {customer.unpaidBills.length} unpaid
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge()}`}
          >
            {getStatusText()}
          </span>
          {hasNextMonthBill && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded-full">
              Next Month Ready
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          {customer.type === "application" && installFeeStatus.amount > 0 ? (
            <div>
              <p className={`text-sm font-medium ${installFeeStatus.color}`}>
                {installFeeStatus.display}
              </p>
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
            <span className="text-xs text-gray-600">
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
            <button
              onClick={() => onAction("email", customer)}
              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
              title="Send Email"
            >
              <FiMail className="w-3.5 h-3.5" />
            </button>
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
                    title="Disconnect"
                  >
                    <FiWifiOff className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.status === "suspended" && (
                  <button
                    onClick={() => onAction("reconnect", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Reconnect"
                  >
                    <FiWifi className="w-3.5 h-3.5" />
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
                    title="Disconnect"
                  >
                    <FiWifiOff className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.status === "suspended" && (
                  <button
                    onClick={() => onAction("reconnect", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Reconnect"
                  >
                    <FiWifi className="w-3.5 h-3.5" />
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
          </div>
        </td>
      </tr>
    );
  },
);

CustomerRow.displayName = "CustomerRow";

// Main Table Component
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
  pagination,
  setPagination,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  stats,
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
}: BillingTableProps) {
  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = [...customers];

    // Search filter
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

    // Building filter
    if (buildingFilter !== "all") {
      filtered = filtered.filter((c) => {
        const customerBuildingId = c.building?._id || null;
        return customerBuildingId === buildingFilter;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
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
          // FIXED: Use the proper installation fee due check
          return isInstallationFeeDue(c);
        }
        return true;
      });
    }

    // Sort
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
        case "status":
          const getStatusText = (c: CustomerItem) => {
            if (isInstallationFeeDue(c)) return "Installation Fee Due";
            if (c.type === "application")
              return c.billingCycle?.status || "Approved";
            return c.status || "Inactive";
          };
          aValue = getStatusText(a);
          bValue = getStatusText(b);
          break;
        case "installationFee":
          // FIXED: Sort by actual installation fee status
          const getInstallFeeSort = (c: CustomerItem) => {
            if (c.type !== "application") return -2;
            const fee = c.installationFee || 0;
            if (fee <= 0) return -1;
            if (isInstallationFeeDue(c)) return fee;
            return 0; // Paid or no bill
          };
          aValue = getInstallFeeSort(a);
          bValue = getInstallFeeSort(b);
          break;
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
    customers,
    searchTerm,
    statusFilter,
    buildingFilter,
    sortField,
    sortDirection,
  ]);

  // Update pagination
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

  // Get current page data
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

  // Helper to format last auto-gen time
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
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h1>
            <p className="text-sm text-gray-500">
              Manage customer balances, bills, payments, and subscriptions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Auto-generate Early Bills Button */}
            {onAutoGenerateEarlyBills && (
              <button
                onClick={onAutoGenerateEarlyBills}
                disabled={autoGenerationRunning}
                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  autoGenerationRunning
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title={`Last run: ${getLastAutoGenText()}`}
              >
                <FiZap
                  className={`w-3.5 h-3.5 ${autoGenerationRunning ? "animate-pulse" : ""}`}
                />
                {autoGenerationRunning
                  ? "Generating..."
                  : "Auto-Gen Early Bills"}
                {lastAutoGenTime && (
                  <span className="text-[10px] opacity-75 ml-1">
                    ({getLastAutoGenText()})
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onOpenReports}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <FiFileText className="w-3.5 h-3.5" /> Reports
            </button>
            <button
              onClick={onOpenBackdated}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiCalendar className="w-3.5 h-3.5" /> Backdated
            </button>
            {(customersWithoutAccounts.length > 0 ||
              applicationsWithoutBillingCount > 0) && (
              <button
                onClick={onOpenExistingCustomers}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiUser className="w-3.5 h-3.5" /> Existing (
                {customersWithoutAccounts.length +
                  applicationsWithoutBillingCount}
                )
              </button>
            )}
            {totalPendingCount > 0 && (
              <button
                onClick={onOpenPending}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiBell className="w-3.5 h-3.5" /> Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiSettings className="w-3.5 h-3.5" /> Settings
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Total Customers
          </p>
          <p className="text-lg font-bold text-blue-600">
            {stats.totalCustomers}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Total Balance
          </p>
          <p className="text-lg font-bold text-red-600">
            ₱{stats.totalBalance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            With Balance
          </p>
          <p className="text-lg font-bold text-orange-600">
            {stats.customersWithBalanceCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Overdue
          </p>
          <p className="text-lg font-bold text-red-600">
            {stats.overdueCustomersCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Active Cycles
          </p>
          <p className="text-lg font-bold text-green-600">
            {stats.activeCyclesCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="all">🏢 All Buildings</option>
            {buildingsList.map((building) => (
              <option key={building._id} value={building._id}>
                🏢 {building.buildingName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="has_balance">With Balance</option>
            <option value="overdue">Overdue</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="pending_activation">Awaiting Payment</option>
            <option value="applications">Applications Only</option>
            <option value="installation_fee_due">Installation Fee Due</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
        <div
          className="overflow-x-auto"
          style={{ maxHeight: "600px", overflowY: "auto" }}
        >
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr className="border-b border-gray-300">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-gray-100 sticky left-0 z-20 w-12"></th>
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Customer <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("plan")}
                >
                  <div className="flex items-center gap-1">
                    Plan <SortIcon field="plan" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center gap-1">
                    Balance <SortIcon field="balance" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort("installationFee")}
                >
                  <div className="flex items-center gap-1">
                    Install Fee <SortIcon field="installationFee" />
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                  <div className="flex items-center gap-1">
                    <FiHome className="w-3 h-3" /> Building
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 px-4 py-2 bg-white rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} customers
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev: any) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((prev: any) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-b-lg text-xs text-gray-500">
        Showing {currentPageData.length} of {filteredAndSortedCustomers.length}{" "}
        customers ({customers.filter((c) => c.type === "user").length} users,{" "}
        {customers.filter((c) => c.type === "application").length} applications)
        - Sorted by {sortField} (
        {sortDirection === "asc" ? "Ascending" : "Descending"})
        <span className="ml-4 text-blue-600">
          ⏰ Early bill generation: {stats.activeCyclesCount} active customers
        </span>
        {lastAutoGenTime && (
          <span className="ml-4 text-gray-400">
            ⚡ Auto-gen last run: {getLastAutoGenText()}
          </span>
        )}
      </div>
    </div>
  );
}
