// frontend/src/components/admin/CustomerSummaryTable.tsx - COMPLETE SEPARATE COMPONENT

"use client";

import React, { useState, Fragment, useMemo } from "react";
import {
  FiEye,
  FiTrash2,
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiChevronsDown,
  FiChevronsUp,
  FiCheckCircle,
  FiInfo,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";
import type { Payment as ServicePayment } from "@/services/payment";

type Payment = ServicePayment;

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  applicationId: string;
  buildingId?: string;
  buildingName?: string;
}

interface PaymentGroup {
  customerId: string;
  customerInfo: CustomerInfo;
  payments: Payment[];
  totalAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  paymentCount: number;
  lastPaymentDate: string;
  firstPaymentDate: string;
  hasPendingPayments: boolean;
}

interface Building {
  _id: string;
  name: string;
  address: string;
  buildingName?: string;
}

// ==================== HELPER FUNCTIONS ====================
function formatBillingPeriod(billingPeriod?: {
  start: string;
  end: string;
}): string {
  if (!billingPeriod?.start || !billingPeriod?.end) return "-";
  const start = new Date(billingPeriod.start);
  const end = new Date(billingPeriod.end);
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
}

function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPaymentTypeColor(type: string): string {
  switch (type) {
    case "subscription":
      return "bg-purple-100 text-purple-800";
    case "installation":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// ==================== CUSTOMER SUMMARY ROW COMPONENT ====================
const CustomerSummaryRow = React.memo(
  ({
    group,
    rowNumber,
    isExpanded,
    onToggleExpand,
    onView,
    onDelete,
    onBulkDelete,
    deleting,
    bulkDeleting,
  }: {
    group: PaymentGroup;
    rowNumber: number;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onView: (payment: Payment) => void;
    onDelete: (id: string, ref: string) => void;
    onBulkDelete: (customerId: string, customerName: string) => void;
    deleting: boolean;
    bulkDeleting: boolean;
  }) => {
    const hasMultiple = group.paymentCount > 1;
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const hasFreePayment = group.payments.some(
      (p) => p.paymentDetails?.isFree === true,
    );

    const showToastInfo = (message: string) => {
      toast(message, {
        icon: "ℹ️",
        duration: 4000,
      });
    };

    return (
      <Fragment>
        <tr
          className={`hover:bg-gray-50 ${group.hasPendingPayments ? "bg-yellow-50/30" : ""}`}
        >
          <td className="px-4 py-4 text-sm text-gray-500">{rowNumber}</td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-2">
              {hasMultiple && (
                <button
                  onClick={() => onToggleExpand(group.customerId)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {isExpanded ? (
                    <FiChevronsUp className="w-4 h-4" />
                  ) : (
                    <FiChevronsDown className="w-4 h-4" />
                  )}
                </button>
              )}
              <span className="font-semibold">{group.customerInfo.name}</span>
              {hasFreePayment && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full flex items-center gap-0.5">
                  <FiCheckCircle className="w-3 h-3" /> FREE
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-4 font-mono text-sm">
            {group.customerInfo.applicationId}
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-1 text-sm">
              <FiMail className="w-3 h-3 text-gray-400" />{" "}
              {group.customerInfo.email}
            </div>
            {group.customerInfo.phone !== "—" && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <FiPhone className="w-3 h-3" /> {group.customerInfo.phone}
              </div>
            )}
          </td>
          <td className="px-4 py-4 text-sm">
            {group.customerInfo.buildingName || "—"}
          </td>
          <td className="px-4 py-4 text-center">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {group.paymentCount}
            </span>
          </td>
          <td className="px-4 py-4 text-right">
            <span className="font-bold text-green-600">
              {formatCurrency(group.totalPaidAmount)}
            </span>
          </td>
          <td className="px-4 py-4 text-right">
            {group.totalPendingAmount > 0 ? (
              <span className="text-yellow-600 font-medium">
                {formatCurrency(group.totalPendingAmount)}
              </span>
            ) : (
              "—"
            )}
          </td>
          <td className="px-4 py-4 text-sm">
            {formatShortDate(group.lastPaymentDate)}
          </td>
          <td className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onView(group.payments[0])}
                className="text-blue-600 hover:text-blue-800"
                title="View Details"
              >
                <FiEye className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete Options"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 px-3 py-1 border-b border-gray-100">
                        Delete options for {group.customerInfo.name}
                      </p>
                      <button
                        onClick={() => {
                          setShowDeleteMenu(false);
                          onBulkDelete(
                            group.customerId,
                            group.customerInfo.name,
                          );
                        }}
                        disabled={bulkDeleting}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition flex items-center gap-2"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete ALL payments for this customer
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteMenu(false);
                          const pendingPayments = group.payments.filter(
                            (p) => p.status === "pending",
                          );
                          if (pendingPayments.length === 0) {
                            showToastInfo(
                              "No pending payments to delete for this customer",
                            );
                            return;
                          }
                          if (
                            !confirm(
                              `Delete ${pendingPayments.length} pending payment(s) for ${group.customerInfo.name}?`,
                            )
                          )
                            return;
                          pendingPayments.forEach((p) =>
                            onDelete(p._id, p.referenceNumber),
                          );
                        }}
                        disabled={deleting}
                        className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded transition flex items-center gap-2"
                      >
                        <FiClock className="w-4 h-4" />
                        Delete only PENDING payments
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
        {isExpanded && hasMultiple && (
          <tr className="bg-gray-50">
            <td colSpan={10} className="px-4 py-4 pl-12">
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Payment History ({group.payments.length} payments)
                </p>
                <div className="space-y-3">
                  {group.payments.map((p, idx) => {
                    const billingPeriod = (p.billingId as any)?.billingPeriod;
                    const isInstallation =
                      p.paymentType === "installation" ||
                      (p.billingId as any)?.isInstallationBill;
                    const isFree = p.paymentDetails?.isFree === true;
                    return (
                      <div
                        key={p._id}
                        className={`border rounded-lg p-3 bg-white ${isFree ? "border-green-300" : "border-gray-200"}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">
                              #{idx + 1} - Date
                            </p>
                            <p className="font-medium">
                              {formatShortDate(p.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Reference</p>
                            <p className="font-mono text-xs break-all">
                              {p.referenceNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Type</p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs inline-block ${getPaymentTypeColor(p.paymentType)}`}
                            >
                              {p.paymentType === "installation"
                                ? "Installation Fee"
                                : p.paymentType === "subscription"
                                  ? "Monthly Subscription"
                                  : p.paymentType}
                            </span>
                            {isFree && (
                              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full">
                                FREE
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Amount</p>
                            <p
                              className={`font-bold ${isFree ? "text-green-600" : "text-green-600"}`}
                            >
                              {formatCurrency(p.amount)}
                              {isFree && (
                                <span className="ml-1 text-xs text-green-500">
                                  (FREE)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Status</p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs inline-block ${getStatusColor(p.status)}`}
                            >
                              {p.status === "completed" ? "Paid" : p.status}
                            </span>
                          </div>
                          {!isInstallation &&
                            (p.billingId as any)?.invoiceNumber && (
                              <div>
                                <p className="text-xs text-gray-400">Invoice</p>
                                <p className="font-mono text-xs">
                                  {(p.billingId as any).invoiceNumber}
                                </p>
                              </div>
                            )}
                          {!isInstallation && billingPeriod && (
                            <>
                              <div className="md:col-span-2">
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <FiCalendar className="w-3 h-3" /> Billing
                                  Period
                                </p>
                                <p className="text-sm font-mono bg-gray-50 p-1 rounded">
                                  {formatBillingPeriod(billingPeriod)}
                                </p>
                              </div>
                              {(p.billingId as any)?.isProRated && (
                                <div>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    Pro-rated Bill
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {!isInstallation && (p.billingId as any)?.dueDate && (
                            <div>
                              <p className="text-xs text-gray-400">Due Date</p>
                              <p className="text-sm font-medium text-red-600">
                                {formatDateFixed((p.billingId as any).dueDate)}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => onView(p)}
                            className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                          >
                            <FiEye className="w-3 h-3" /> View Full Details
                          </button>
                          <button
                            onClick={() => onDelete(p._id, p.referenceNumber)}
                            disabled={deleting}
                            className="text-red-600 text-xs hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <FiTrash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  },
);

CustomerSummaryRow.displayName = "CustomerSummaryRow";

// ==================== MAIN COMPONENT ====================
interface CustomerSummaryTableProps {
  paymentGroups: PaymentGroup[];
  search: string;
  buildingFilter: string;
  buildings: Building[];
  dateRangeStart: string;
  dateRangeEnd: string;
  onView: (payment: Payment) => void;
  onDelete: (id: string, ref: string) => void;
  onBulkDelete: (customerId: string, customerName: string) => void;
  onExportPDF: () => void;
  deleting: boolean;
  bulkDeleting: boolean;
}

export default function CustomerSummaryTable({
  paymentGroups,
  search,
  buildingFilter,
  buildings,
  dateRangeStart,
  dateRangeEnd,
  onView,
  onDelete,
  onBulkDelete,
  onExportPDF,
  deleting,
  bulkDeleting,
}: CustomerSummaryTableProps) {
  const [sortField, setSortField] =
    useState<keyof PaymentGroup>("lastPaymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentTablePage, setCurrentTablePage] = useState(1);

  // ==================== MEMOIZED DATA ====================
  const filteredGroups = useMemo(() => {
    return paymentGroups.filter((group) => {
      const info = group.customerInfo;

      let matchesSearch = true;
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        matchesSearch =
          info.name.toLowerCase().includes(searchLower) ||
          info.email.toLowerCase().includes(searchLower) ||
          info.applicationId.toLowerCase().includes(searchLower) ||
          info.phone.toLowerCase().includes(searchLower) ||
          group.payments.some((p) =>
            p.referenceNumber?.toLowerCase().includes(searchLower),
          );
      }

      let matchesBuilding = true;
      if (buildingFilter) {
        matchesBuilding = info.buildingId === buildingFilter;

        if (!matchesBuilding && info.buildingName) {
          const selectedBuilding = buildings.find(
            (b) => b._id === buildingFilter,
          );
          if (selectedBuilding) {
            const selectedName =
              selectedBuilding.name || selectedBuilding.buildingName || "";
            matchesBuilding = info.buildingName === selectedName;
          }
        }

        if (!matchesBuilding) {
          matchesBuilding = group.payments.some((p) => {
            if (p.buildingId === buildingFilter) return true;
            if (p.userId && typeof p.userId === "object") {
              const user = p.userId as any;
              if (user.buildingId === buildingFilter) return true;
            }
            return false;
          });
        }
      }

      return matchesSearch && matchesBuilding;
    });
  }, [paymentGroups, search, buildingFilter, buildings]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "customerInfo":
          aVal = a.customerInfo.name;
          bVal = b.customerInfo.name;
          break;
        case "totalAmount":
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case "paymentCount":
          aVal = a.paymentCount;
          bVal = b.paymentCount;
          break;
        case "lastPaymentDate":
          aVal = new Date(a.lastPaymentDate).getTime();
          bVal = new Date(b.lastPaymentDate).getTime();
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredGroups, sortField, sortDirection]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentTablePage - 1) * itemsPerPage;
    return sortedGroups.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedGroups, currentTablePage, itemsPerPage]);

  const totalFilteredCount = filteredGroups.length;
  const totalPagesCount = Math.ceil(totalFilteredCount / itemsPerPage) || 1;

  const grandTotals = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverall = 0;
    let totalTransactions = 0;

    filteredGroups.forEach((group) => {
      totalPaid += group.totalPaidAmount;
      totalPending += group.totalPendingAmount;
      totalOverall += group.totalAmount;
      totalTransactions += group.paymentCount;
    });

    return {
      totalPaid,
      totalPending,
      totalOverall,
      totalTransactions,
      totalCustomers: filteredGroups.length,
    };
  }, [filteredGroups]);

  const handleSort = (field: keyof PaymentGroup) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: keyof PaymentGroup }) => {
    if (sortField !== field)
      return <FiChevronsDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiChevronsUp className="w-3 h-3" />
    ) : (
      <FiChevronsDown className="w-3 h-3" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Customer Payment Summary ({totalFilteredCount})
          </h2>
          <p className="text-sm text-gray-500">
            Showing {paginatedGroups.length} of {sortedGroups.length} customers
          </p>
          {(dateRangeStart || dateRangeEnd) && (
            <p className="text-xs text-blue-600 mt-1">
              📅 Filtered by:{" "}
              {dateRangeStart ? formatShortDate(dateRangeStart) : "Start"} to{" "}
              {dateRangeEnd ? formatShortDate(dateRangeEnd) : "End"}
            </p>
          )}
          {buildingFilter && (
            <p className="text-xs text-blue-600 mt-1">
              🏢 Building:{" "}
              {buildings.find((b) => b._id === buildingFilter)?.name ||
                buildingFilter}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentTablePage(1);
            }}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          <button
            onClick={onExportPDF}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            <FiPrinter /> PDF Report
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("customerInfo")}
              >
                Customer Name <SortIcon field="customerInfo" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Application ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email / Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Building
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("paymentCount")}
              >
                Payments <SortIcon field="paymentCount" />
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("totalAmount")}
              >
                Total Paid <SortIcon field="totalAmount" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("lastPaymentDate")}
              >
                Last Payment <SortIcon field="lastPaymentDate" />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <FiInfo className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No payment records found</p>
                  {(dateRangeStart || dateRangeEnd) && (
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your date range filters
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              paginatedGroups.map((group, index) => {
                const isExpanded = expandedCustomer === group.customerId;
                const rowNumber =
                  (currentTablePage - 1) * itemsPerPage + index + 1;
                return (
                  <CustomerSummaryRow
                    key={group.customerId}
                    group={group}
                    rowNumber={rowNumber}
                    isExpanded={isExpanded}
                    onToggleExpand={(id) =>
                      setExpandedCustomer(isExpanded ? null : id)
                    }
                    onView={onView}
                    onDelete={onDelete}
                    onBulkDelete={onBulkDelete}
                    deleting={deleting}
                    bulkDeleting={bulkDeleting}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalFilteredCount > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-gray-600">
            Showing {(currentTablePage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentTablePage * itemsPerPage, totalFilteredCount)} of{" "}
            {totalFilteredCount} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentTablePage(1)}
              disabled={currentTablePage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 transition"
            >
              First
            </button>
            <button
              onClick={() =>
                setCurrentTablePage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentTablePage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentTablePage} of {totalPagesCount}
            </span>
            <button
              onClick={() =>
                setCurrentTablePage((prev) =>
                  Math.min(totalPagesCount, prev + 1),
                )
              }
              disabled={currentTablePage === totalPagesCount}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 transition"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentTablePage(totalPagesCount)}
              disabled={currentTablePage === totalPagesCount}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 transition"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
