// frontend/src/app/admin/payments/page.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
  useMemo,
} from "react";
import {
  getAllPayments,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  deletePayment,
  type Payment as ServicePayment,
} from "@/services/payment";
import {
  FiSearch,
  FiEye,
  FiRefreshCw,
  FiClock,
  FiX,
  FiFileText,
  FiInfo,
  FiMail,
  FiPhone,
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiChevronsDown,
  FiChevronsUp,
  FiCalendar,
  FiTrash2,
  FiHome,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/services/api";

// Re-export the Payment type from the service to ensure consistency
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
}

// ==================== BUILDING CACHE ====================
const buildingCache = new Map<string, { name: string; address: string }>();

// ==================== CUSTOMER NAME CACHE ====================
const customerNameCache = new Map<
  string,
  { name: string; email: string; phone: string; buildingId?: string }
>();

// ==================== GLOBAL CACHE ====================
let globalCache: any = null;
let globalCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ==================== HELPERS ====================
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

// ==================== FETCH BUILDINGS ====================
async function fetchBuildings(): Promise<Building[]> {
  try {
    const response = await api.get("/buildings");
    if (response.data?.success && response.data?.data) {
      const buildings = response.data.data;
      buildings.forEach((b: Building) => {
        buildingCache.set(b._id, { name: b.name, address: b.address });
      });
      return buildings;
    }
    return [];
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return [];
  }
}

// ==================== FETCH CUSTOMER NAME ====================
async function fetchCustomerName(applicationId: string): Promise<{
  name: string;
  email: string;
  phone: string;
  buildingId?: string;
}> {
  if (!applicationId || applicationId === "—" || applicationId === "") {
    return { name: "Unknown Customer", email: "—", phone: "—" };
  }

  if (customerNameCache.has(applicationId)) {
    return customerNameCache.get(applicationId)!;
  }

  try {
    const response = await api.get(`/applications/status/${applicationId}`);
    if (response.data?.success && response.data?.data) {
      const app = response.data.data;
      const firstName = app.firstName || "";
      const lastName = app.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const finalName = fullName || app.applicationId || applicationId;

      const customerInfo = {
        name: finalName,
        email: app.email || "—",
        phone: app.phoneNumber || "—",
        buildingId: app.buildingId,
      };
      customerNameCache.set(applicationId, customerInfo);
      return customerInfo;
    }
    return { name: applicationId, email: "—", phone: "—" };
  } catch (error) {
    console.error(`Error fetching customer for ${applicationId}:`, error);
    return { name: applicationId, email: "—", phone: "—" };
  }
}

// ==================== EXTRACT CUSTOMER INFO ====================
async function extractCustomerInfo(payment: Payment): Promise<CustomerInfo> {
  let appId = "";

  // Safely extract applicationId with proper type checking
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

  const isAppIdPattern = /^[A-Z]{3}\d+/.test(appId);

  let buildingId = payment.buildingId;
  let buildingName = "";

  if (buildingId && buildingCache.has(buildingId)) {
    const building = buildingCache.get(buildingId)!;
    buildingName = building.name;
  } else if (buildingId) {
    try {
      const response = await api.get(`/buildings/${buildingId}`);
      if (response.data?.success && response.data?.data) {
        const b = response.data.data;
        buildingCache.set(buildingId, { name: b.name, address: b.address });
        buildingName = b.name;
      }
    } catch (e) {}
  }

  if (appId && isAppIdPattern) {
    const customerData = await fetchCustomerName(appId);
    return {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      applicationId: appId,
      buildingId: customerData.buildingId || buildingId,
      buildingName: buildingName,
    };
  }

  if (payment.customerName && payment.customerName.trim() !== "") {
    const name = payment.customerName.trim();
    const isAppId = /^[A-Z]{3}\d+/.test(name);
    if (!isAppId) {
      return {
        name: name,
        email: payment.customerEmail || "—",
        phone: payment.customerPhone || "—",
        applicationId: appId || "—",
        buildingId: buildingId,
        buildingName: buildingName,
      };
    }
  }

  if (payment.userId && typeof payment.userId === "object") {
    const user = payment.userId as any;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName.length > 1) {
      const isAppId = /^[A-Z]{3}\d+/.test(fullName);
      if (!isAppId) {
        return {
          name: fullName,
          email: user.email || payment.customerEmail || "—",
          phone: user.phoneNumber || user.phone || payment.customerPhone || "—",
          applicationId: appId || "—",
          buildingId: buildingId,
          buildingName: buildingName,
        };
      }
    }
  }

  if (appId && appId.length > 0) {
    const customerData = await fetchCustomerName(appId);
    if (customerData.name !== appId) {
      return {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        applicationId: appId,
        buildingId: customerData.buildingId || buildingId,
        buildingName: buildingName,
      };
    }
    return {
      name: appId,
      email: payment.customerEmail || "—",
      phone: payment.customerPhone || "—",
      applicationId: appId,
      buildingId: buildingId,
      buildingName: buildingName,
    };
  }

  return {
    name: "Unknown Customer",
    email: payment.customerEmail || "—",
    phone: payment.customerPhone || "—",
    applicationId: appId || "—",
    buildingId: buildingId,
    buildingName: buildingName,
  };
}

// ==================== GROUP PAYMENTS ====================
async function groupPaymentsAsync(
  payments: Payment[],
): Promise<PaymentGroup[]> {
  const groups = new Map<string, PaymentGroup>();

  const paymentPromises = payments.map(async (payment) => {
    const customerInfo = await extractCustomerInfo(payment);
    return { payment, customerInfo };
  });

  const results = await Promise.all(paymentPromises);

  for (const { payment, customerInfo } of results) {
    let customerId = customerInfo.applicationId;
    if (
      customerId === "—" ||
      customerId === "Loading..." ||
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
    group.totalAmount += payment.amount || 0;
    group.paymentCount++;

    if (payment.status === "completed") {
      group.totalPaidAmount += payment.amount || 0;
    } else if (payment.status === "pending") {
      group.totalPendingAmount += payment.amount || 0;
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

// ==================== HELPER FUNCTIONS ====================
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

// ==================== MEMOIZED CUSTOMER DETAILS ====================
const CustomerDetails = React.memo(({ payment }: { payment: Payment }) => {
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    extractCustomerInfo(payment).then((result) => {
      if (mounted) {
        setInfo(result);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [payment]);

  if (loading || !info) {
    return (
      <div className="animate-pulse text-center py-4">
        Loading customer info...
      </div>
    );
  }

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
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(payment.amount)}
          </p>
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
    </div>
  );
});

CustomerDetails.displayName = "CustomerDetails";

// ==================== MEMOIZED PENDING PAYMENT ROW ====================
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
    const [info, setInfo] = useState<CustomerInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let mounted = true;
      extractCustomerInfo(payment).then((result) => {
        if (mounted) {
          setInfo(result);
          setLoading(false);
        }
      });
      return () => {
        mounted = false;
      };
    }, [payment]);

    if (loading || !info) {
      return (
        <tr>
          <td colSpan={8} className="px-4 py-3 text-center">
            <span className="animate-pulse">Loading customer info...</span>
          </td>
        </tr>
      );
    }

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
        <td className="px-4 py-3 font-medium">{info.name}</td>
        <td className="px-4 py-3 font-mono text-sm">{info.applicationId}</td>
        <td className="px-4 py-3 text-sm">{info.buildingName || "—"}</td>
        <td className="px-4 py-3 font-semibold">
          {formatCurrency(payment.amount)}
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

// ==================== MEMOIZED CUSTOMER SUMMARY ROW ====================
const CustomerSummaryRow = React.memo(
  ({
    group,
    index,
    rowNumber,
    isExpanded,
    onToggleExpand,
    onView,
    onDelete,
    deleting,
  }: {
    group: PaymentGroup;
    index: number;
    rowNumber: number;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onView: (payment: Payment) => void;
    onDelete: (id: string, ref: string) => void;
    deleting: boolean;
  }) => {
    const hasMultiple = group.paymentCount > 1;

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
            <button
              onClick={() => onView(group.payments[0])}
              className="text-blue-600 hover:text-blue-800"
            >
              <FiEye className="w-5 h-5" />
            </button>
          </td>
        </tr>
        {isExpanded && hasMultiple && (
          <tr className="bg-gray-50">
            <td colSpan={10} className="px-4 py-4 pl-12">
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Payment History
                </p>
                <div className="space-y-3">
                  {group.payments.map((p, idx) => {
                    const billingPeriod = (p.billingId as any)?.billingPeriod;
                    const isInstallation =
                      p.paymentType === "installation" ||
                      (p.billingId as any)?.isInstallationBill;
                    return (
                      <div
                        key={p._id}
                        className="border border-gray-200 rounded-lg p-3 bg-white"
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
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Amount</p>
                            <p className="font-bold text-green-600">
                              {formatCurrency(p.amount)}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] =
    useState<keyof PaymentGroup>("lastPaymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    monthlyAmount: 0,
    monthlyCount: 0,
    subscriptionAmount: 0,
    subscriptionCount: 0,
    installationFees: 0,
    installationFeeCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentTablePage, setCurrentTablePage] = useState(1);
  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  // Load buildings on mount
  useEffect(() => {
    fetchBuildings().then((data) => {
      if (isMountedRef.current) {
        setBuildings(data);
      }
    });
  }, []);

  // ==================== LOAD PAYMENTS ====================
  const loadPayments = useCallback(
    async (forceRefresh = false) => {
      if (!isMountedRef.current) return;

      // Check global cache first
      const now = Date.now();
      if (!forceRefresh && globalCache) {
        if (now - globalCacheTimestamp < CACHE_TTL) {
          const cached = globalCache;
          setPaymentGroups(cached.paymentGroups);
          setPendingPayments(cached.pendingPayments);
          setStats(cached.stats);
          setLoading(false);
          setRefreshing(false);
          initialLoadDone.current = true;
          console.log("✅ Using global cached payment data");
          return;
        } else {
          globalCache = null;
        }
      }

      if (forceRefresh) {
        setRefreshing(true);
        customerNameCache.clear();
      } else {
        setLoading(true);
      }

      try {
        const allPaymentsResult = await getAllPayments({
          page: currentPage,
          limit: 100,
          status: statusFilter || undefined,
          buildingId: buildingFilter || undefined,
          forceRefresh,
        });

        if (!isMountedRef.current) return;

        let paymentsList: Payment[] = allPaymentsResult.data || [];
        if (paymentTypeFilter) {
          paymentsList = paymentsList.filter(
            (p: Payment) => p.paymentType === paymentTypeFilter,
          );
        }

        const grouped = await groupPaymentsAsync(paymentsList);
        setPaymentGroups(grouped);

        const pendingResult = await getPendingPayments(forceRefresh).catch(
          () => ({ data: [] }),
        );
        let pendingList: Payment[] = pendingResult.data || [];

        if (paymentTypeFilter) {
          pendingList = pendingList.filter(
            (p: Payment) => p.paymentType === paymentTypeFilter,
          );
        }
        setPendingPayments(pendingList);

        let newStats;
        if (allPaymentsResult.stats) {
          newStats = {
            totalAmount: allPaymentsResult.stats.total || 0,
            totalCount: allPaymentsResult.stats.totalCount || 0,
            monthlyAmount: allPaymentsResult.stats.monthly || 0,
            monthlyCount: allPaymentsResult.stats.monthlyCount || 0,
            subscriptionAmount: allPaymentsResult.stats.subscription || 0,
            subscriptionCount: allPaymentsResult.stats.subscriptionCount || 0,
            installationFees: allPaymentsResult.stats.installationFees || 0,
            installationFeeCount:
              allPaymentsResult.stats.installationFeeCount || 0,
            pendingAmount: allPaymentsResult.stats.pending || 0,
            pendingCount: allPaymentsResult.stats.pendingCount || 0,
          };
          setStats(newStats);
        }

        globalCache = {
          paymentGroups: grouped,
          pendingPayments: pendingList,
          stats: newStats || stats,
        };
        globalCacheTimestamp = now;

        initialLoadDone.current = true;
        console.log(
          `✅ Loaded ${grouped.length} payment groups (cached globally)`,
        );
      } catch (error: any) {
        console.error("Failed to load payments:", error);
        if (!forceRefresh) toast.error("Failed to load payments");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, statusFilter, paymentTypeFilter, buildingFilter, stats],
  );

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    isMountedRef.current = true;
    loadPayments();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadPayments]);

  // ==================== HANDLERS ====================
  const handleRefresh = () => {
    globalCache = null;
    globalCacheTimestamp = 0;
    loadPayments(true);
  };

  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("Confirm this payment?")) return;
    setConfirming(true);
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed!");
      globalCache = null;
      globalCacheTimestamp = 0;
      loadPayments(true);
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
      globalCache = null;
      globalCacheTimestamp = 0;
      loadPayments(true);
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
      globalCache = null;
      globalCacheTimestamp = 0;
      loadPayments(true);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete payment");
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: keyof PaymentGroup) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // ==================== EXPORT ====================
  const exportToExcel = () => {
    const csvData = sortedGroups.map((group) => ({
      "Customer Name": group.customerInfo.name,
      "Application ID": group.customerInfo.applicationId,
      Email: group.customerInfo.email,
      Phone: group.customerInfo.phone,
      Building: group.customerInfo.buildingName || "—",
      "Total Paid": group.totalPaidAmount,
      "Total Pending": group.totalPendingAmount,
      "Payment Count": group.paymentCount,
      "Last Payment Date": formatShortDate(group.lastPaymentDate),
      "First Payment Date": formatShortDate(group.firstPaymentDate),
      Status: group.hasPendingPayments ? "Has Pending" : "All Completed",
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvRows = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            if (typeof value === "number") return value.toString();
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export complete!");
  };

  // ==================== MEMOIZED DATA ====================
  const filteredGroups = useMemo(() => {
    return paymentGroups.filter((group) => {
      const info = group.customerInfo;

      // Search filter
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

      // Building filter - FIXED: Simple direct match
      let matchesBuilding = true;
      if (buildingFilter) {
        // Direct match by buildingId
        matchesBuilding = info.buildingId === buildingFilter;

        // If no buildingId, check if buildingName matches the selected building name
        if (!matchesBuilding && info.buildingName) {
          const selectedBuilding = buildings.find(
            (b) => b._id === buildingFilter,
          );
          if (selectedBuilding) {
            matchesBuilding = info.buildingName === selectedBuilding.name;
          }
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

  // ==================== SORT ICON ====================
  const SortIcon = ({ field }: { field: keyof PaymentGroup }) => {
    if (sortField !== field)
      return <FiChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiChevronUp className="w-3 h-3" />
    ) : (
      <FiChevronDown className="w-3 h-3" />
    );
  };

  // ==================== LOADING STATE ====================
  if (loading && paymentGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">
          View, confirm, and manage customer payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.totalCount} transactions
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.monthlyAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.monthlyCount} this month
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Subscription Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.subscriptionAmount)}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiClock className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.subscriptionCount} subscriptions
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Installation Fees</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.installationFees)}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.installationFeeCount} installations
          </p>
        </div>
      </div>

      {/* Pending Alert */}
      {pendingPayments.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <FiClock className="w-6 h-6 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {pendingPayments.length} Pending Payment
                {pendingPayments.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-yellow-700">
                Total:{" "}
                {formatCurrency(
                  pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
                )}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, application ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 border border-gray-300"
            >
              <FiFilter /> Filters
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition border border-gray-300 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={paymentTypeFilter}
                onChange={(e) => {
                  setPaymentTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="subscription">Subscription</option>
                <option value="installation">Installation</option>
              </select>
              <select
                value={buildingFilter}
                onChange={(e) => {
                  setBuildingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">All Buildings</option>
                {buildings.map((building) => (
                  <option key={building._id} value={building._id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Pending Confirmation ({pendingPayments.length})
          </h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
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
                  {pendingPayments.map((payment, index) => (
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
        </div>
      )}

      {/* Customer Summary Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Customer Payment Summary ({totalFilteredCount})
            </h2>
            <p className="text-sm text-gray-500">
              Showing {paginatedGroups.length} of {sortedGroups.length}{" "}
              customers
            </p>
          </div>
          <div className="flex gap-2">
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
              onClick={exportToExcel}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FiDownload /> Export
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
                      index={index}
                      rowNumber={rowNumber}
                      isExpanded={isExpanded}
                      onToggleExpand={(id) =>
                        setExpandedCustomer(isExpanded ? null : id)
                      }
                      onView={setSelectedPayment}
                      onDelete={handleDeletePayment}
                      deleting={deleting}
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

      {/* Payment Modal */}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
