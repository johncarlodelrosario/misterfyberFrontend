// frontend/src/app/admin/payments/page.tsx - UNIFIED DESIGN PATTERN
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  getAllPayments,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  deletePayment,
  bulkDeleteCustomerPayments,
  type Payment as ServicePayment,
} from "@/services/payment";
import {
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiX,
  FiFileText,
  FiCalendar,
  FiTrash2,
  FiHome,
  FiBarChart2,
  FiCheckCircle,
  FiFilter,
  FiTrendingUp,
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/services/api";
import CustomerSummaryTable from "@/components/admin/CustomerSummaryTable";
import PaymentReport from "@/components/admin/PaymentReport";

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

// ==================== FORMATTING HELPERS ====================
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

function formatCurrency(amount: any): string {
  const num = Number(amount);
  if (!isFinite(num)) return "₱0.00";
  return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthToRange(monthStr: string): { start: string; end: string } {
  if (!monthStr) return { start: "", end: "" };
  const [yStr, mStr] = monthStr.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  if (isNaN(y) || isNaN(m)) return { start: "", end: "" };
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: toISO(start), end: toISO(end) };
}

// ==================== STRICT BILLING-PERIOD HELPERS ====================
function getBillingPeriodStart(payment: any): Date | null {
  const bp = (payment?.billingId as any)?.billingPeriod;
  if (!bp?.start) return null;
  const d = new Date(bp.start);
  if (isNaN(d.getTime())) return null;
  return d;
}

function paymentBelongsInBillingRange(
  payment: any,
  startISO: string,
  endISO: string,
): boolean {
  if (!startISO || !endISO) return true;

  const billingStart = getBillingPeriodStart(payment);
  if (!billingStart) return false;

  const rangeStart = new Date(`${startISO}T00:00:00`);
  const rangeEnd = new Date(`${endISO}T23:59:59.999`);
  if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) return true;

  return billingStart >= rangeStart && billingStart <= rangeEnd;
}

// ==================== CUSTOMER INFO EXTRACTION ====================
function extractCustomerInfoSync(payment: Payment): CustomerInfo {
  let appId = "";

  if (payment.applicationId) {
    if (typeof payment.applicationId === "string") {
      appId = payment.applicationId;
    } else if (
      typeof payment.applicationId === "object" &&
      payment.applicationId !== null
    ) {
      const appObj = payment.applicationId as any;
      if (appObj.applicationId && typeof appObj.applicationId === "string") {
        appId = appObj.applicationId;
      }
    }
  }

  if (!appId && payment.paymentDetails?.gatewayResponse?.applicationId) {
    appId = payment.paymentDetails.gatewayResponse.applicationId;
  }

  let buildingId: any = (payment as any).buildingId || "";
  let buildingName = (payment as any).buildingName || "";

  if (
    payment.applicationId &&
    typeof payment.applicationId === "object" &&
    payment.applicationId !== null
  ) {
    const appObj = payment.applicationId as any;
    if (appObj.buildingId && !buildingId) buildingId = appObj.buildingId;
    if (appObj.buildingName && !buildingName)
      buildingName = appObj.buildingName;
  }

  if (
    payment.applicationId &&
    typeof payment.applicationId === "object" &&
    payment.applicationId !== null
  ) {
    const appObj = payment.applicationId as any;
    const firstName = appObj.firstName || "";
    const lastName = appObj.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName && !/^[A-Z]{3}\d+/.test(fullName)) {
      return {
        name: fullName || appObj.applicantName || appId || "Unknown Customer",
        email: appObj.email || payment.customerEmail || "—",
        phone: appObj.phoneNumber || payment.customerPhone || "—",
        applicationId: appObj.applicationId || appId || "—",
        buildingId: appObj.buildingId || buildingId,
        buildingName: appObj.buildingName || buildingName,
      };
    }
  }

  if ((payment as any).application) {
    const app = (payment as any).application;
    const firstName = app.firstName || "";
    const lastName = app.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return {
      name: fullName || app.applicantName || appId || "Unknown Customer",
      email: app.email || payment.customerEmail || "—",
      phone: app.phoneNumber || payment.customerPhone || "—",
      applicationId: app.applicationId || appId || "—",
      buildingId: app.buildingId || buildingId,
      buildingName: app.buildingName || buildingName,
    };
  }

  if ((payment as any).user) {
    const user = (payment as any).user;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName && !/^[A-Z]{3}\d+/.test(fullName)) {
      return {
        name: fullName,
        email: user.email || payment.customerEmail || "—",
        phone: user.phoneNumber || payment.customerPhone || "—",
        applicationId: appId || user.username || "—",
        buildingId: user.buildingId || buildingId,
        buildingName: user.buildingName || buildingName,
      };
    }
  }

  if (payment.customerName && payment.customerName.trim() !== "") {
    const name = payment.customerName.trim();
    if (!/^[A-Z]{3}\d+$/.test(name)) {
      return {
        name,
        email: payment.customerEmail || "—",
        phone: payment.customerPhone || "—",
        applicationId: appId || "—",
        buildingId,
        buildingName,
      };
    }
  }

  if (payment.userId && typeof payment.userId === "object") {
    const user = payment.userId as any;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName && !/^[A-Z]{3}\d+$/.test(fullName)) {
      return {
        name: fullName,
        email: user.email || payment.customerEmail || "—",
        phone: user.phoneNumber || payment.customerPhone || "—",
        applicationId: appId || "—",
        buildingId: user.buildingId || buildingId,
        buildingName: user.buildingName || buildingName,
      };
    }
  }

  return {
    name: payment.customerName || appId || "Unknown Customer",
    email: payment.customerEmail || "—",
    phone: payment.customerPhone || "—",
    applicationId: appId || "—",
    buildingId,
    buildingName,
  };
}

// ==================== PAYMENT GROUPING ====================
function groupPaymentsSync(payments: Payment[]): PaymentGroup[] {
  const groups = new Map<string, PaymentGroup>();

  for (const payment of payments) {
    const customerInfo = extractCustomerInfoSync(payment);

    let customerId = customerInfo.applicationId;
    if (
      !customerId ||
      customerId === "—" ||
      customerId === "" ||
      customerId === "Unknown Customer"
    ) {
      customerId =
        customerInfo.email !== "—"
          ? customerInfo.email
          : (payment.userId as any)?._id || `unknown-${payment._id}`;
    }

    if (!groups.has(customerId)) {
      groups.set(customerId, {
        customerId,
        customerInfo,
        payments: [],
        totalAmount: 0,
        totalPaidAmount: 0,
        totalPendingAmount: 0,
        paymentCount: 0,
        lastPaymentDate: payment.createdAt,
        firstPaymentDate: payment.createdAt,
        hasPendingPayments: false,
      });
    }

    const group = groups.get(customerId)!;
    group.payments.push(payment);
    group.totalAmount += Number(payment.amount) || 0;
    group.paymentCount++;

    if (payment.status === "completed") {
      group.totalPaidAmount += Number(payment.amount) || 0;
    } else if (payment.status === "pending") {
      group.totalPendingAmount += Number(payment.amount) || 0;
      group.hasPendingPayments = true;
    }

    if (new Date(payment.createdAt) > new Date(group.lastPaymentDate)) {
      group.lastPaymentDate = payment.createdAt;
    }
    if (new Date(payment.createdAt) < new Date(group.firstPaymentDate)) {
      group.firstPaymentDate = payment.createdAt;
    }
  }

  return Array.from(groups.values());
}

// ==================== CUSTOMER DETAILS ====================
const CustomerDetails = React.memo(({ payment }: { payment: Payment }) => {
  const info = useMemo(() => extractCustomerInfoSync(payment), [payment]);
  const isFree = payment.paymentDetails?.isFree === true;

  const isInstallation =
    payment.paymentType === "installation" ||
    (payment.billingId as any)?.isInstallationBill;
  const billingPeriod = (payment.billingId as any)?.billingPeriod;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">Customer</p>
        <p className="font-semibold text-lg">{info.name}</p>
        <p className="text-sm text-gray-600">{info.email}</p>
        <p className="text-sm font-mono text-gray-500">{info.applicationId}</p>
        {info.buildingName && (
          <p className="text-sm text-blue-600 flex items-center gap-1">
            <FiHome className="w-3 h-3" /> {info.buildingName}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Amount</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(payment.amount)}
            </p>
            {isFree && (
              <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full flex items-center gap-1">
                <FiCheckCircle className="w-3 h-3" /> FREE
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <span
            className={`px-2 py-1 text-xs rounded-full inline-block ${getStatusColor(payment.status)}`}
          >
            {payment.status === "completed" ? "Paid" : payment.status}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500">Reference Number</p>
        <p className="font-mono text-sm break-all">{payment.referenceNumber}</p>
      </div>
      {!isInstallation && (payment.billingId as any)?.invoiceNumber && (
        <div>
          <p className="text-xs text-gray-500">Invoice Number</p>
          <p className="font-mono text-sm">
            {(payment.billingId as any).invoiceNumber}
          </p>
        </div>
      )}
      {!isInstallation && billingPeriod && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <FiCalendar className="w-3 h-3" /> Billing Period
          </p>
          <p className="text-base font-bold text-blue-800">
            {formatBillingPeriod(billingPeriod)}
          </p>
          {(payment.billingId as any)?.isProRated && (
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full mt-1 inline-block">
              Pro-rated Bill
            </span>
          )}
        </div>
      )}
      {!isInstallation && (payment.billingId as any)?.dueDate && (
        <div>
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-sm font-medium text-red-600">
            {formatDateFixed((payment.billingId as any).dueDate)}
          </p>
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500">Payment Date</p>
        <p className="text-sm">{formatShortDate(payment.createdAt)}</p>
      </div>
      {payment.paidAt && (
        <div>
          <p className="text-xs text-gray-500">Paid At</p>
          <p className="text-sm">{formatShortDate(payment.paidAt)}</p>
        </div>
      )}
      {payment.paymentDetails?.notes && (
        <div>
          <p className="text-xs text-gray-500">Notes</p>
          <p className="text-sm text-gray-600">
            {payment.paymentDetails.notes}
          </p>
        </div>
      )}
      {isFree && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" /> This payment was marked as
            FREE
          </p>
        </div>
      )}
    </div>
  );
});

CustomerDetails.displayName = "CustomerDetails";

// ==================== PENDING PAYMENT ROW ====================
const PendingPaymentRow = React.memo(
  ({
    payment,
    index,
    onConfirm,
    onReject,
    onView,
    onDelete,
    confirming,
    rejecting,
    deleting,
  }: {
    payment: Payment;
    index: number;
    onConfirm: (id: string) => void;
    onReject: (id: string) => void;
    onView: (payment: Payment) => void;
    onDelete: (id: string, ref: string) => void;
    confirming: boolean;
    rejecting: boolean;
    deleting: boolean;
  }) => {
    const info = useMemo(() => extractCustomerInfoSync(payment), [payment]);
    const isFree = payment.paymentDetails?.isFree === true;

    const billingPeriod = (payment.billingId as any)?.billingPeriod;
    const isInstallation =
      payment.paymentType === "installation" ||
      (payment.billingId as any)?.isInstallationBill;

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
        <td className="px-4 py-3 text-sm">
          {formatShortDate(payment.createdAt)}
        </td>
        <td className="px-4 py-3 font-medium">
          {info.name}
          {isFree && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full">
              FREE
            </span>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-sm">{info.applicationId}</td>
        <td className="px-4 py-3 text-sm">{info.buildingName || "—"}</td>
        <td className="px-4 py-3 font-semibold">
          {formatCurrency(payment.amount)}
          {isFree && (
            <span className="ml-1 text-xs text-green-600">(FREE)</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          {isInstallation ? (
            <span className="text-orange-600 font-medium">
              Installation Fee
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <FiCalendar className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium">
                  {formatBillingPeriod(billingPeriod)}
                </span>
              </div>
              {(payment.billingId as any)?.dueDate && (
                <span className="text-xs text-gray-500">
                  Due: {formatDateFixed((payment.billingId as any).dueDate)}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onConfirm(payment._id)}
              disabled={confirming}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => onReject(payment._id)}
              disabled={rejecting}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onView(payment)}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
            >
              View
            </button>
            <button
              onClick={() => onDelete(payment._id, payment.referenceNumber)}
              disabled={deleting}
              className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-800 transition flex items-center gap-1 disabled:opacity-50"
            >
              <FiTrash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </td>
      </tr>
    );
  },
);

PendingPaymentRow.displayName = "PendingPaymentRow";

// ==================== MAIN PAGE ====================
export default function AdminPaymentsPage() {
  const [paymentGroups, setPaymentGroups] = useState<PaymentGroup[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [activeView, setActiveView] = useState<"payments" | "report">(
    "payments",
  );

  const [monthFilter, setMonthFilter] = useState(getCurrentMonthString());
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Full raw payment list from the last successful API call
  const [allPayments, setAllPayments] = useState<Payment[]>([]);

  const isMountedRef = useRef(true);

  const effectiveStart = useMemo(() => {
    if (dateRangeStart && dateRangeEnd) return dateRangeStart;
    if (monthFilter) return monthToRange(monthFilter).start;
    return "";
  }, [dateRangeStart, dateRangeEnd, monthFilter]);

  const effectiveEnd = useMemo(() => {
    if (dateRangeStart && dateRangeEnd) return dateRangeEnd;
    if (monthFilter) return monthToRange(monthFilter).end;
    return "";
  }, [dateRangeStart, dateRangeEnd, monthFilter]);

  useEffect(() => {
    isMountedRef.current = true;
    api
      .get("/buildings")
      .then((response) => {
        if (isMountedRef.current && response.data?.success) {
          setBuildings(response.data.data || []);
        }
      })
      .catch(() => {});
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==================== LOAD PAYMENTS ====================
  const loadPayments = useCallback(
    async (isRefresh = false) => {
      if (!isMountedRef.current) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params: any = {
          limit: "all" as const,
          forceRefresh: true,
        };

        if (statusFilter && statusFilter !== "all" && statusFilter !== "") {
          params.status = statusFilter;
        }
        if (
          paymentTypeFilter &&
          paymentTypeFilter !== "all" &&
          paymentTypeFilter !== ""
        ) {
          params.paymentType = paymentTypeFilter;
        }
        if (
          buildingFilter &&
          buildingFilter !== "all" &&
          buildingFilter !== ""
        ) {
          params.buildingId = buildingFilter;
        }

        const allPaymentsResult = await getAllPayments(params);

        if (!isMountedRef.current) return;

        const rawList: Payment[] = allPaymentsResult.data || [];

        const filteredByBilling = rawList.filter((p) =>
          paymentBelongsInBillingRange(p, effectiveStart, effectiveEnd),
        );

        setAllPayments(filteredByBilling);
        const grouped = groupPaymentsSync(filteredByBilling);
        setPaymentGroups(grouped);

        let pendingList: Payment[] = [];
        if (
          !statusFilter ||
          statusFilter === "pending" ||
          statusFilter === ""
        ) {
          try {
            const pendingResult = await getPendingPayments(true);
            pendingList = pendingResult.data || [];

            if (paymentTypeFilter && paymentTypeFilter !== "all") {
              pendingList = pendingList.filter(
                (p: Payment) => p.paymentType === paymentTypeFilter,
              );
            }

            if (buildingFilter && buildingFilter !== "all") {
              const targetId = String(buildingFilter);
              const normalizeId = (v: any): string => {
                if (v === null || v === undefined) return "";
                if (typeof v === "string") return v;
                if (typeof v === "object" && v._id) return normalizeId(v._id);
                if (typeof v === "object" && v.toString) {
                  try {
                    return v.toString();
                  } catch {
                    return "";
                  }
                }
                return String(v);
              };

              pendingList = pendingList.filter((p: any) => {
                if (normalizeId(p.buildingId) === targetId) return true;
                if (p.userId && typeof p.userId === "object") {
                  if (normalizeId(p.userId.buildingId) === targetId)
                    return true;
                }
                if (p.applicationId && typeof p.applicationId === "object") {
                  if (normalizeId(p.applicationId.buildingId) === targetId)
                    return true;
                }
                return false;
              });
            }

            pendingList = pendingList.filter((p) =>
              paymentBelongsInBillingRange(p, effectiveStart, effectiveEnd),
            );
          } catch {
            // ignore
          }
        }
        setPendingPayments(pendingList);
      } catch (error: any) {
        console.error("Failed to load payments:", error);
        if (isRefresh) toast.error("Failed to refresh payments");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      statusFilter,
      paymentTypeFilter,
      buildingFilter,
      effectiveStart,
      effectiveEnd,
    ],
  );

  // ==================== RELOAD WHEN NON-SEARCH FILTERS CHANGE ====================
  useEffect(() => {
    loadPayments(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilter,
    paymentTypeFilter,
    buildingFilter,
    effectiveStart,
    effectiveEnd,
  ]);

  // ==================== STATS THAT FOLLOW SEARCH ====================
  const searchedPayments = useMemo(() => {
    const trimmed = (search || "").trim().toLowerCase();
    if (!trimmed) return allPayments;

    return allPayments.filter((p) => {
      const info = extractCustomerInfoSync(p);
      return (
        (info.name || "").toLowerCase().includes(trimmed) ||
        (info.email || "").toLowerCase().includes(trimmed) ||
        (info.applicationId || "").toLowerCase().includes(trimmed) ||
        (info.phone || "").toLowerCase().includes(trimmed) ||
        (p.referenceNumber || "").toLowerCase().includes(trimmed)
      );
    });
  }, [allPayments, search]);

  const searchedStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    let totalAmount = 0;
    let totalCount = 0;
    let monthlyAmount = 0;
    let monthlyCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    for (const p of searchedPayments) {
      const amt = Number(p.amount) || 0;
      totalAmount += amt;
      totalCount += 1;

      const billingStart = getBillingPeriodStart(p);
      if (
        billingStart &&
        billingStart >= monthStart &&
        billingStart <= monthEnd
      ) {
        monthlyAmount += amt;
        monthlyCount += 1;
      }

      if (p.status === "pending") {
        pendingAmount += amt;
        pendingCount += 1;
      }
    }

    return {
      totalAmount,
      totalCount,
      monthlyAmount,
      monthlyCount,
      pendingAmount,
      pendingCount,
    };
  }, [searchedPayments]);

  const searchedPendingPayments = useMemo(() => {
    const trimmed = (search || "").trim().toLowerCase();
    if (!trimmed) return pendingPayments;
    return pendingPayments.filter((p) => {
      const info = extractCustomerInfoSync(p);
      return (
        (info.name || "").toLowerCase().includes(trimmed) ||
        (info.email || "").toLowerCase().includes(trimmed) ||
        (info.applicationId || "").toLowerCase().includes(trimmed) ||
        (info.phone || "").toLowerCase().includes(trimmed) ||
        (p.referenceNumber || "").toLowerCase().includes(trimmed)
      );
    });
  }, [pendingPayments, search]);

  // ==================== HANDLERS ====================
  const handleRefresh = () => {
    loadPayments(true);
  };

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentTypeFilter("");
    setBuildingFilter("");
    setMonthFilter("");
    setDateRangeStart("");
    setDateRangeEnd("");
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("Confirm this payment?")) return;
    setConfirming(true);
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed!");
      await loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason?.trim()) return;
    setRejecting(true);
    try {
      await rejectPayment(paymentId, reason);
      toast.success("Payment rejected");
      await loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject payment");
    } finally {
      setRejecting(false);
    }
  };

  const handleDeletePayment = async (
    paymentId: string,
    referenceNumber: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete payment ${referenceNumber}? This action cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await deletePayment(paymentId);
      toast.success(`Payment ${referenceNumber} deleted successfully`);
      await loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete payment");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteCustomerPayments = async (
    customerId: string,
    customerName: string,
  ) => {
    if (
      !confirm(
        `⚠️ WARNING: This will delete ALL payments for customer "${customerName}". This action cannot be undone!\n\nClick OK to proceed.`,
      )
    )
      return;

    setBulkDeleting(true);
    try {
      const result = await bulkDeleteCustomerPayments(customerId, true);
      toast.success(
        `Deleted ${result.data?.deletedCount || 0} payments for ${customerName}`,
      );
      await loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to delete customer payments",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  // ==================== EXPORT PDF ====================
  const exportToPDF = () => {
    const exportData = paymentGroups;

    if (exportData.length === 0) {
      toast.error("No data to export. Please adjust your filters.");
      return;
    }

    let grandTotalPaid = 0;
    let grandTotalPending = 0;
    let grandTotalOverall = 0;
    let totalCustomers = exportData.length;
    let totalTransactions = 0;

    exportData.forEach((group) => {
      grandTotalPaid += Number(group.totalPaidAmount) || 0;
      grandTotalPending += Number(group.totalPendingAmount) || 0;
      grandTotalOverall += Number(group.totalAmount) || 0;
      totalTransactions += Number(group.paymentCount) || 0;
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const buildingName = buildingFilter
      ? buildings.find((b) => b._id === buildingFilter)?.name || buildingFilter
      : "All Buildings";

    const dateRangeStr =
      effectiveStart && effectiveEnd
        ? `${formatShortDate(effectiveStart)} to ${formatShortDate(effectiveEnd)} (by billing period)`
        : "All Dates";

    const statusStr = statusFilter || "All";
    const typeStr = paymentTypeFilter || "All";
    const searchStr = search || "None";

    let tableRows = "";
    exportData.forEach((group, index) => {
      const hasFree = group.payments.some(
        (p) => p.paymentDetails?.isFree === true,
      );
      tableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${group.customerInfo.name}${hasFree ? " 🆓" : ""}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${group.customerInfo.applicationId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${group.customerInfo.email}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${group.customerInfo.buildingName || "—"}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${group.paymentCount}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #16a34a;">${formatCurrency(group.totalPaidAmount)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${group.totalPendingAmount > 0 ? formatCurrency(group.totalPendingAmount) : "—"}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(group.totalAmount)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatShortDate(group.lastPaymentDate)}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { color: #1e3a8a; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          .header .filters { 
            background: #f3f4f6; padding: 10px; border-radius: 5px;
            margin-top: 10px; font-size: 13px; display: flex; flex-wrap: wrap;
            justify-content: center; gap: 15px;
          }
          .header .filters span { background: white; padding: 3px 10px; border-radius: 15px; border: 1px solid #d1d5db; }
          .summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; flex-wrap: wrap; justify-content: space-between; }
          .summary-item { padding: 5px 10px; font-size: 14px; }
          .summary-item strong { color: #1e40af; }
          .summary-item .paid { color: #16a34a; font-weight: bold; }
          .summary-item .pending { color: #ca8a04; font-weight: bold; }
          .summary-item .grand { color: #1e40af; font-weight: bold; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #f3f4f6; padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-weight: bold; color: #374151; }
          td { padding: 8px; border: 1px solid #ddd; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #ddd; padding-top: 10px; }
          .grand-total-row { background: #f0fdf4; font-weight: bold; }
          .grand-total-row td { border-top: 2px solid #16a34a; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Payment Report</h1>
          <p>Generated on: ${dateStr}</p>
          <div class="filters">
            <span>🏢 Building: ${buildingName}</span>
            <span>📅 Date Range: ${dateRangeStr}</span>
            <span>📌 Status: ${statusStr}</span>
            <span>📋 Type: ${typeStr}</span>
            <span>🔍 Search: ${searchStr}</span>
          </div>
        </div>
        <div class="summary">
          <span class="summary-item"><strong>Total Customers:</strong> ${totalCustomers}</span>
          <span class="summary-item"><strong>Total Transactions:</strong> ${totalTransactions}</span>
          <span class="summary-item"><span class="paid">Total Paid:</span> ${formatCurrency(grandTotalPaid)}</span>
          <span class="summary-item"><span class="pending">Total Pending:</span> ${formatCurrency(grandTotalPending)}</span>
          <span class="summary-item"><span class="grand">🎯 Grand Total:</span> ${formatCurrency(grandTotalOverall)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">#</th>
              <th>Customer Name</th>
              <th>Application ID</th>
              <th>Email</th>
              <th>Building</th>
              <th style="text-align: center;">Payments</th>
              <th style="text-align: right;">Total Paid</th>
              <th style="text-align: right;">Pending</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: center;">Last Payment</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="grand-total-row">
              <td colspan="5" style="text-align: right; font-size: 14px; font-weight: bold;">GRAND TOTALS</td>
              <td style="text-align: center; font-size: 14px; font-weight: bold;">${totalTransactions}</td>
              <td style="text-align: right; font-size: 14px; font-weight: bold; color: #16a34a;">${formatCurrency(grandTotalPaid)}</td>
              <td style="text-align: right; font-size: 14px; font-weight: bold; color: #ca8a04;">${formatCurrency(grandTotalPending)}</td>
              <td style="text-align: right; font-size: 14px; font-weight: bold; color: #1e40af;">${formatCurrency(grandTotalOverall)}</td>
              <td style="text-align: center;">—</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
          <p>© ${now.getFullYear()} Misterfyber - Payment Management System</p>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #1e3a8a; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      toast.success(
        "PDF report generated! Use the print dialog to save as PDF.",
      );
    } else {
      toast.error("Please allow popups to generate PDF report.");
    }
  };

  const hasActiveFilters =
    !!statusFilter ||
    !!paymentTypeFilter ||
    !!buildingFilter ||
    !!monthFilter ||
    (!!dateRangeStart && !!dateRangeEnd) ||
    !!search;

  if (loading && paymentGroups.length === 0 && pendingPayments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Management
          </h1>
          <p className="text-gray-600">
            View, confirm, and manage customer payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveView("payments")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeView === "payments"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FiFileText className="w-4 h-4" /> Payments
            </button>
            <button
              onClick={() => setActiveView("report")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeView === "report"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FiBarChart2 className="w-4 h-4" /> Report
            </button>
          </div>
        </div>
      </div>

      {/* STATS — follow search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Amount
                {search && (
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (filtered)
                  </span>
                )}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(searchedStats.totalAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {searchedStats.totalCount} transaction
                {searchedStats.totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiCreditCard className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                This Month's Total
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(searchedStats.monthlyAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {searchedStats.monthlyCount} payment
                {searchedStats.monthlyCount !== 1 ? "s" : ""} this month (by
                billing period)
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Payments
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(searchedStats.pendingAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {searchedStats.pendingCount} payment
                {searchedStats.pendingCount !== 1 ? "s" : ""} awaiting
                confirmation
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiClock className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or application ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                if (e.target.value) {
                  setDateRangeStart("");
                  setDateRangeEnd("");
                }
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`px-4 py-2.5 rounded-lg border transition flex items-center gap-2 text-sm font-medium ${
              showMoreFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FiFilter className="w-4 h-4" />
            {showMoreFilters ? "Less Filters" : "More Filters"}
            {showMoreFilters ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
            {hasActiveFilters && !showMoreFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>

        {showMoreFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Type
                </label>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="subscription">Subscription</option>
                  <option value="installation">Installation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Building
                </label>
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.name ||
                        building.buildingName ||
                        "Unnamed Building"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="text-xs font-medium text-gray-600">
                Specific Date Range:
              </label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => {
                  setDateRangeStart(e.target.value);
                  if (e.target.value) setMonthFilter("");
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                max={dateRangeEnd || undefined}
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => {
                  setDateRangeEnd(e.target.value);
                  if (e.target.value) setMonthFilter("");
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                min={dateRangeStart || undefined}
                max={new Date().toISOString().split("T")[0]}
              />
              <span className="text-xs text-gray-400">
                (overrides month picker above, filters by billing period)
              </span>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 rounded-lg transition"
                >
                  <FiX className="w-4 h-4" /> Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && !showMoreFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {monthFilter && !dateRangeStart && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📅 {monthFilter}
              </span>
            )}
            {dateRangeStart && dateRangeEnd && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📅 {formatShortDate(dateRangeStart)} →{" "}
                {formatShortDate(dateRangeEnd)}
              </span>
            )}
            {statusFilter && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📌 {statusFilter}
              </span>
            )}
            {paymentTypeFilter && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                📋 {paymentTypeFilter}
              </span>
            )}
            {buildingFilter && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                🏢{" "}
                {buildings.find((b) => b._id === buildingFilter)?.name ||
                  buildingFilter}
              </span>
            )}
            {search && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                🔍 {search}
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-full transition"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Pending banner */}
      {searchedPendingPayments.length > 0 && activeView === "payments" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiClock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-gray-900">
              {searchedPendingPayments.length} Pending Payment
              {searchedPendingPayments.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-gray-500">
              Total:{" "}
              {formatCurrency(
                searchedPendingPayments.reduce(
                  (sum, p) => sum + (Number(p.amount) || 0),
                  0,
                ),
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      )}

      {activeView === "payments" ? (
        <>
          {searchedPendingPayments.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">
                  Pending Confirmation ({searchedPendingPayments.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Building
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billing Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {searchedPendingPayments.map((payment, index) => (
                      <PendingPaymentRow
                        key={payment._id}
                        payment={payment}
                        index={index}
                        onConfirm={handleConfirmPayment}
                        onReject={handleRejectPayment}
                        onView={setSelectedPayment}
                        onDelete={handleDeletePayment}
                        confirming={confirming}
                        rejecting={rejecting}
                        deleting={deleting}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <CustomerSummaryTable
            paymentGroups={paymentGroups}
            search={search}
            buildingFilter={buildingFilter}
            buildings={buildings}
            dateRangeStart={effectiveStart}
            dateRangeEnd={effectiveEnd}
            onView={setSelectedPayment}
            onDelete={handleDeletePayment}
            onBulkDelete={handleBulkDeleteCustomerPayments}
            onExportPDF={exportToPDF}
            deleting={deleting}
            bulkDeleting={bulkDeleting}
          />
        </>
      ) : (
        <PaymentReport
          paymentGroups={paymentGroups}
          buildings={buildings}
          buildingFilter={buildingFilter}
          dateRangeStart={effectiveStart}
          dateRangeEnd={effectiveEnd}
          statusFilter={statusFilter}
          paymentTypeFilter={paymentTypeFilter}
        />
      )}

      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Payment Details</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX />
              </button>
            </div>
            <div className="p-6">
              <CustomerDetails payment={selectedPayment} />
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete payment ${selectedPayment.referenceNumber}?`,
                      )
                    ) {
                      handleDeletePayment(
                        selectedPayment._id,
                        selectedPayment.referenceNumber,
                      );
                      setSelectedPayment(null);
                    }
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <FiTrash2 className="w-4 h-4" /> Delete
                </button>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
