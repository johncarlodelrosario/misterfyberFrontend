"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
} from "react";
import {
  getAllPayments,
  confirmPayment,
  rejectPayment,
  getPendingPayments,
  deletePayment,
} from "@/services/admin";
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
} from "react-icons/fi";
import toast from "react-hot-toast";

interface Payment {
  _id: string;
  amount: number;
  referenceNumber: string;
  paymentMethod: string;
  paymentType: "subscription" | "installation" | "others";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  createdAt: string;
  paidAt?: string;
  applicationId?: any;
  application?: any;
  userId?: any;
  user?: any;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingId?: {
    _id: string;
    invoiceNumber: string;
    billingPeriod?: {
      start: string;
      end: string;
    };
    dueDate?: string;
    isProRated?: boolean;
    isInstallationBill?: boolean;
  };
  paymentDetails?: {
    notes?: string;
    gatewayResponse?: {
      applicationId?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    };
  };
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  applicationId: string;
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

// Helper to format billing period
function formatBillingPeriod(billingPeriod?: {
  start: string;
  end: string;
}): string {
  if (!billingPeriod?.start || !billingPeriod?.end) return "-";

  const start = new Date(billingPeriod.start);
  const end = new Date(billingPeriod.end);

  const startMonth = start.getUTCMonth() + 1;
  const startDay = start.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();

  return `${startMonth}/${startDay}/${startYear} - ${endMonth}/${endDay}/${endYear}`;
}

function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
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

// ==================== CRITICAL FIX: EXTRACT CUSTOMER NAME ====================
function extractCustomerInfo(payment: Payment): CustomerInfo {
  console.log("🔍 Extracting customer info for payment:", payment._id);
  console.log("📝 Payment data:", {
    customerName: payment.customerName,
    customerEmail: payment.customerEmail,
    applicationId: payment.applicationId,
    hasApplication: !!payment.application,
    hasUserId: !!payment.userId,
  });

  // ============================================================
  // PRIORITY 1: DIRECT customerName FROM DATABASE (MOST RELIABLE)
  // ============================================================
  if (payment.customerName && payment.customerName.trim() !== "") {
    const name = payment.customerName.trim();
    // Check if it's an application ID pattern (e.g., SIL26067944109)
    const isAppIdPattern = /^[A-Z]{3}\d+/.test(name);
    if (!isAppIdPattern) {
      console.log(`✅ [PRIORITY 1] Using database customerName: "${name}"`);
      return {
        name: name,
        email: payment.customerEmail || "—",
        phone: payment.customerPhone || "—",
        applicationId:
          typeof payment.applicationId === "string"
            ? payment.applicationId
            : payment.applicationId?.applicationId || "—",
      };
    } else {
      console.log(
        `⚠️ Database customerName is an App ID: "${name}", checking other sources...`,
      );
    }
  }

  // ============================================================
  // PRIORITY 2: Check application object (populated from backend)
  // ============================================================
  if (payment.application && typeof payment.application === "object") {
    const app = payment.application;
    console.log("📋 Application object:", app);

    // Try to get name from application
    const firstName = app.firstName || app.first_name || "";
    const lastName = app.lastName || app.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName.length > 1) {
      const isAppIdPattern = /^[A-Z]{3}\d+/.test(fullName);
      if (!isAppIdPattern) {
        console.log(`✅ [PRIORITY 2] Using application name: "${fullName}"`);
        return {
          name: fullName,
          email: app.email || payment.customerEmail || "—",
          phone: app.phoneNumber || app.phone || payment.customerPhone || "—",
          applicationId: app.applicationId || payment.applicationId || "—",
        };
      }
    }

    // Try app.fullName
    if (app.fullName && app.fullName.length > 1) {
      const isAppIdPattern = /^[A-Z]{3}\d+/.test(app.fullName);
      if (!isAppIdPattern) {
        console.log(`✅ [PRIORITY 2] Using app.fullName: "${app.fullName}"`);
        return {
          name: app.fullName,
          email: app.email || payment.customerEmail || "—",
          phone: app.phoneNumber || app.phone || payment.customerPhone || "—",
          applicationId: app.applicationId || payment.applicationId || "—",
        };
      }
    }
  }

  // ============================================================
  // PRIORITY 3: Check userId object (populated from backend)
  // ============================================================
  if (payment.userId && typeof payment.userId === "object") {
    const user = payment.userId;
    console.log("👤 User object:", user);

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName.length > 1) {
      const isAppIdPattern = /^[A-Z]{3}\d+/.test(fullName);
      if (!isAppIdPattern) {
        console.log(`✅ [PRIORITY 3] Using userId name: "${fullName}"`);
        return {
          name: fullName,
          email: user.email || payment.customerEmail || "—",
          phone: user.phoneNumber || user.phone || payment.customerPhone || "—",
          applicationId: payment.applicationId || "—",
        };
      }
    }
  }

  // ============================================================
  // PRIORITY 4: Check user object
  // ============================================================
  if (payment.user && typeof payment.user === "object") {
    const user = payment.user;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName.length > 1) {
      const isAppIdPattern = /^[A-Z]{3}\d+/.test(fullName);
      if (!isAppIdPattern) {
        console.log(`✅ [PRIORITY 4] Using user name: "${fullName}"`);
        return {
          name: fullName,
          email: user.email || payment.customerEmail || "—",
          phone: user.phoneNumber || user.phone || payment.customerPhone || "—",
          applicationId: payment.applicationId || "—",
        };
      }
    }
  }

  // ============================================================
  // PRIORITY 5: Check customerEmail from database
  // ============================================================
  if (payment.customerEmail && payment.customerEmail.trim() !== "") {
    const email = payment.customerEmail.trim();
    // Try to extract name from email (before @)
    const emailName = email.split("@")[0];
    if (emailName && emailName.length > 0) {
      const formattedName = emailName
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      if (formattedName.length > 1) {
        console.log(
          `✅ [PRIORITY 5] Using email-based name: "${formattedName}"`,
        );
        return {
          name: formattedName,
          email: email,
          phone: payment.customerPhone || "—",
          applicationId:
            typeof payment.applicationId === "string"
              ? payment.applicationId
              : payment.applicationId?.applicationId || "—",
        };
      }
    }
  }

  // ============================================================
  // PRIORITY 6: Check gateway response
  // ============================================================
  if (payment.paymentDetails?.gatewayResponse?.customerName) {
    const gr = payment.paymentDetails.gatewayResponse;
    const name = gr.customerName?.trim() || "";
    if (name.length > 1) {
      const isAppIdPattern = /^[A-Z]{3}\d+/.test(name);
      if (!isAppIdPattern) {
        console.log(`✅ [PRIORITY 6] Using gateway name: "${name}"`);
        return {
          name: name,
          email: gr.customerEmail || payment.customerEmail || "—",
          phone: gr.customerPhone || payment.customerPhone || "—",
          applicationId: gr.applicationId || payment.applicationId || "—",
        };
      }
    }
  }

  // ============================================================
  // PRIORITY 7: Check paymentDetails notes
  // ============================================================
  if (payment.paymentDetails?.notes) {
    const notes = payment.paymentDetails.notes;
    const nameMatch = notes.match(/(?:Customer|Name|Applicant):\s*([^\n,]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      if (name.length > 1) {
        const isAppIdPattern = /^[A-Z]{3}\d+/.test(name);
        if (!isAppIdPattern) {
          console.log(`✅ [PRIORITY 7] Using notes name: "${name}"`);
          return {
            name: name,
            email: payment.customerEmail || "—",
            phone: payment.customerPhone || "—",
            applicationId:
              typeof payment.applicationId === "string"
                ? payment.applicationId
                : payment.applicationId?.applicationId || "—",
          };
        }
      }
    }
  }

  // ============================================================
  // FALLBACK: Use whatever we have
  // ============================================================
  let appId = "—";
  if (typeof payment.applicationId === "string") {
    appId = payment.applicationId;
  } else if (payment.applicationId?.applicationId) {
    appId = payment.applicationId.applicationId;
  } else if (payment.paymentDetails?.gatewayResponse?.applicationId) {
    appId = payment.paymentDetails.gatewayResponse.applicationId;
  }

  // Check if we have a valid application ID that looks like one
  if (appId !== "—" && /^[A-Z]{3}\d+/.test(appId)) {
    // Try to find name in applicationId object
    if (payment.applicationId && typeof payment.applicationId === "object") {
      const app = payment.applicationId as any;
      const firstName = app.firstName || "";
      const lastName = app.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 1) {
        console.log(`✅ Using appId object name: "${fullName}"`);
        return {
          name: fullName,
          email: app.email || "—",
          phone: app.phoneNumber || "—",
          applicationId: app.applicationId || appId,
        };
      }
    }

    console.log(`⚠️ Showing application ID as name: "${appId}"`);
    return {
      name: appId, // Show application ID as name
      email: payment.customerEmail || "—",
      phone: payment.customerPhone || "—",
      applicationId: appId,
    };
  }

  // Final fallback
  console.log(`⚠️ No name found, showing "Unknown Customer"`);
  return {
    name: "Unknown Customer",
    email: payment.customerEmail || "—",
    phone: payment.customerPhone || "—",
    applicationId: appId,
  };
}

// Group payments by customer
function groupPayments(payments: Payment[]): PaymentGroup[] {
  const groups = new Map<string, PaymentGroup>();

  for (const payment of payments) {
    const customerInfo = extractCustomerInfo(payment);

    // Determine a unique customer ID
    let customerId = customerInfo.applicationId;
    if (
      customerId === "—" ||
      customerId === "Loading..." ||
      customerId === ""
    ) {
      customerId =
        customerInfo.email !== "—"
          ? customerInfo.email
          : payment.userId?._id || "unknown";
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

  // Update group info with best available name
  for (const group of Array.from(groups.values())) {
    // Find a payment with a proper name (not "Unknown Customer" or app ID)
    const paymentWithName = group.payments.find((p) => {
      const info = extractCustomerInfo(p);
      return (
        info.name !== "—" &&
        info.name !== "Loading..." &&
        info.name !== "Unknown Customer" &&
        !/^[A-Z]{3}\d+/.test(info.name) &&
        info.name.length > 1
      );
    });

    if (paymentWithName) {
      group.customerInfo = extractCustomerInfo(paymentWithName);
    }
  }

  return Array.from(groups.values());
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

export default function AdminPaymentsPage() {
  const [paymentGroups, setPaymentGroups] = useState<PaymentGroup[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
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

  const loadPayments = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const allPaymentsResult = await getAllPayments({
          page: currentPage,
          limit: 100,
          status: statusFilter || undefined,
          forceRefresh,
        });

        if (!isMountedRef.current) return;

        let paymentsList = allPaymentsResult.data || [];
        if (paymentTypeFilter) {
          paymentsList = paymentsList.filter(
            (p: Payment) => p.paymentType === paymentTypeFilter,
          );
        }

        console.log("📊 Payments loaded:", paymentsList.length);
        if (paymentsList.length > 0) {
          console.log("📝 Sample payment:", {
            _id: paymentsList[0]._id,
            customerName: paymentsList[0].customerName,
            customerEmail: paymentsList[0].customerEmail,
            applicationId: paymentsList[0].applicationId,
            hasApplication: !!paymentsList[0].application,
          });
        }

        // Group payments by customer
        const grouped = groupPayments(paymentsList);
        setPaymentGroups(grouped);

        // Get pending payments
        const pendingResult = await getPendingPayments(forceRefresh).catch(
          () => ({ data: [] }),
        );
        let pendingList = pendingResult.data || [];

        if (paymentTypeFilter) {
          setPendingPayments(
            pendingList.filter(
              (p: Payment) => p.paymentType === paymentTypeFilter,
            ),
          );
        } else {
          setPendingPayments(pendingList);
        }

        if (allPaymentsResult.stats) {
          setStats({
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
          });
        }
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
    [currentPage, statusFilter, paymentTypeFilter],
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadPayments();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadPayments]);

  const handleRefresh = () => loadPayments(true);

  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("Confirm this payment?")) return;
    setConfirming(true);
    try {
      await confirmPayment(paymentId);
      toast.success("Payment confirmed!");
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

  const getSortedGroups = (groups: PaymentGroup[]): PaymentGroup[] => {
    return [...groups].sort((a, b) => {
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
  };

  const getFilteredGroups = (groups: PaymentGroup[]): PaymentGroup[] => {
    if (!search.trim()) return groups;
    const searchLower = search.toLowerCase();
    return groups.filter((group) => {
      const info = group.customerInfo;
      return (
        info.name.toLowerCase().includes(searchLower) ||
        info.email.toLowerCase().includes(searchLower) ||
        info.applicationId.toLowerCase().includes(searchLower) ||
        info.phone.toLowerCase().includes(searchLower) ||
        group.payments.some((p) =>
          p.referenceNumber?.toLowerCase().includes(searchLower),
        )
      );
    });
  };

  const getPaginatedGroups = (groups: PaymentGroup[]): PaymentGroup[] => {
    const startIndex = (currentTablePage - 1) * itemsPerPage;
    return groups.slice(startIndex, startIndex + itemsPerPage);
  };

  const SortIcon = ({ field }: { field: keyof PaymentGroup }) => {
    if (sortField !== field)
      return <FiChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiChevronUp className="w-3 h-3" />
    ) : (
      <FiChevronDown className="w-3 h-3" />
    );
  };

  const exportToExcel = () => {
    const filteredGroups = getFilteredGroups(paymentGroups);
    const sortedGroups = getSortedGroups(filteredGroups);
    const csvData = sortedGroups.map((group) => ({
      "Customer Name": group.customerInfo.name,
      "Application ID": group.customerInfo.applicationId,
      Email: group.customerInfo.email,
      Phone: group.customerInfo.phone,
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

  const filteredGroups = getFilteredGroups(paymentGroups);
  const sortedGroups = getSortedGroups(filteredGroups);
  const paginatedGroups = getPaginatedGroups(sortedGroups);
  const totalFilteredCount = filteredGroups.length;
  const totalPagesCount = Math.ceil(totalFilteredCount / itemsPerPage);

  if (loading) {
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">
          View, confirm, and manage customer payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border">
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
        <div className="bg-white rounded-lg shadow-sm p-4 border">
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
        <div className="bg-white rounded-lg shadow-sm p-4 border">
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
        <div className="bg-white rounded-lg shadow-sm p-4 border">
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
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition"
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
      <div className="bg-white rounded-lg shadow-sm mb-6 border">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, application ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
            >
              <FiFilter /> Filters
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border rounded-lg"
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
                className="px-4 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="subscription">Subscription</option>
                <option value="installation">Installation</option>
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
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Customer Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Application ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Billing Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingPayments.map((payment) => {
                    const info = extractCustomerInfo(payment);
                    const billingPeriod = payment.billingId?.billingPeriod;
                    const isInstallation =
                      payment.paymentType === "installation" ||
                      payment.billingId?.isInstallationBill;
                    return (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {formatShortDate(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">{info.name}</td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {info.applicationId}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isInstallation ? (
                            <span className="text-orange-600">
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
                              {payment.billingId?.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due:{" "}
                                  {formatDateFixed(payment.billingId.dueDate)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleConfirmPayment(payment._id)}
                              disabled={confirming}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment._id)}
                              disabled={rejecting}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePayment(
                                  payment._id,
                                  payment.referenceNumber,
                                )
                              }
                              disabled={deleting}
                              className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-800 flex items-center gap-1"
                            >
                              <FiTrash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Summary Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-4">
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
              className="px-3 py-1 border rounded-lg text-sm"
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
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("customerInfo")}
                >
                  Customer Name <SortIcon field="customerInfo" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Application ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Email / Phone
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("paymentCount")}
                >
                  Payments <SortIcon field="paymentCount" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("totalAmount")}
                >
                  Total Paid <SortIcon field="totalAmount" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                  Pending
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("lastPaymentDate")}
                >
                  Last Payment <SortIcon field="lastPaymentDate" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <FiInfo className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No payment records found</p>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => {
                  const isExpanded = expandedCustomer === group.customerId;
                  const hasMultiple = group.paymentCount > 1;
                  return (
                    <Fragment key={group.customerId}>
                      <tr
                        className={`hover:bg-gray-50 ${group.hasPendingPayments ? "bg-yellow-50/30" : ""}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {hasMultiple && (
                              <button
                                onClick={() =>
                                  setExpandedCustomer(
                                    isExpanded ? null : group.customerId,
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? (
                                  <FiChevronsUp />
                                ) : (
                                  <FiChevronsDown />
                                )}
                              </button>
                            )}
                            <span className="font-semibold">
                              {group.customerInfo.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-sm">
                          {group.customerInfo.applicationId}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <FiMail className="w-3 h-3" />{" "}
                            {group.customerInfo.email}
                          </div>
                          {group.customerInfo.phone !== "—" && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <FiPhone className="w-3 h-3" />{" "}
                              {group.customerInfo.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
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
                            <span className="text-yellow-600">
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
                            onClick={() =>
                              setSelectedPayment(group.payments[0])
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && hasMultiple && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-4 pl-12">
                            <div className="border-l-4 border-blue-400 pl-4">
                              <p className="text-xs font-semibold text-gray-500 mb-3">
                                Payment History
                              </p>
                              <div className="space-y-3">
                                {group.payments.map((p) => {
                                  const billingPeriod =
                                    p.billingId?.billingPeriod;
                                  const isInstallation =
                                    p.paymentType === "installation" ||
                                    p.billingId?.isInstallationBill;
                                  return (
                                    <div
                                      key={p._id}
                                      className="border rounded-lg p-3 bg-white"
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div>
                                          <p className="text-xs text-gray-400">
                                            Date
                                          </p>
                                          <p className="font-medium">
                                            {formatShortDate(p.createdAt)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-400">
                                            Reference
                                          </p>
                                          <p className="font-mono text-xs break-all">
                                            {p.referenceNumber}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-400">
                                            Type
                                          </p>
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
                                          <p className="text-xs text-gray-400">
                                            Amount
                                          </p>
                                          <p className="font-bold text-green-600">
                                            {formatCurrency(p.amount)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-400">
                                            Status
                                          </p>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-xs inline-block ${getStatusColor(p.status)}`}
                                          >
                                            {p.status === "completed"
                                              ? "Paid"
                                              : p.status}
                                          </span>
                                        </div>
                                        {!isInstallation &&
                                          p.billingId?.invoiceNumber && (
                                            <div>
                                              <p className="text-xs text-gray-400">
                                                Invoice
                                              </p>
                                              <p className="font-mono text-xs">
                                                {p.billingId.invoiceNumber}
                                              </p>
                                            </div>
                                          )}
                                        {!isInstallation && billingPeriod && (
                                          <>
                                            <div className="md:col-span-2">
                                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <FiCalendar className="w-3 h-3" />{" "}
                                                Billing Period
                                              </p>
                                              <p className="text-sm font-mono bg-gray-50 p-1 rounded">
                                                {formatBillingPeriod(
                                                  billingPeriod,
                                                )}
                                              </p>
                                            </div>
                                            {p.billingId?.isProRated && (
                                              <div>
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                                  Pro-rated Bill
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                        {!isInstallation &&
                                          p.billingId?.dueDate && (
                                            <div>
                                              <p className="text-xs text-gray-400">
                                                Due Date
                                              </p>
                                              <p className="text-sm font-medium text-red-600">
                                                {formatDateFixed(
                                                  p.billingId.dueDate,
                                                )}
                                              </p>
                                            </div>
                                          )}
                                      </div>
                                      <div className="mt-3 flex justify-end gap-2">
                                        <button
                                          onClick={() => setSelectedPayment(p)}
                                          className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                                        >
                                          <FiEye className="w-3 h-3" /> View
                                          Full Details
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeletePayment(
                                              p._id,
                                              p.referenceNumber,
                                            )
                                          }
                                          disabled={deleting}
                                          className="text-red-600 text-xs hover:underline flex items-center gap-1"
                                        >
                                          <FiTrash2 className="w-3 h-3" />{" "}
                                          Delete
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
                })
              )}
            </tbody>
          </table>
        </div>
        {totalFilteredCount > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              Showing {(currentTablePage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentTablePage * itemsPerPage, totalFilteredCount)} of{" "}
              {totalFilteredCount} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentTablePage(1)}
                disabled={currentTablePage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() =>
                  setCurrentTablePage((prev) => Math.max(1, prev - 1))
                }
                disabled={currentTablePage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentTablePage} of {totalPagesCount || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentTablePage((prev) =>
                    Math.min(totalPagesCount, prev + 1),
                  )
                }
                disabled={currentTablePage === totalPagesCount}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentTablePage(totalPagesCount)}
                disabled={currentTablePage === totalPagesCount}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
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
              {(() => {
                const info = extractCustomerInfo(selectedPayment);
                const isInstallation =
                  selectedPayment.paymentType === "installation" ||
                  selectedPayment.billingId?.isInstallationBill;
                const billingPeriod = selectedPayment.billingId?.billingPeriod;
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-semibold text-lg">{info.name}</p>
                      <p className="text-sm text-gray-600">{info.email}</p>
                      <p className="text-sm font-mono text-gray-500">
                        {info.applicationId}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedPayment.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span
                          className={`px-2 py-1 text-xs rounded-full inline-block ${getStatusColor(selectedPayment.status)}`}
                        >
                          {selectedPayment.status === "completed"
                            ? "Paid"
                            : selectedPayment.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reference Number</p>
                      <p className="font-mono text-sm break-all">
                        {selectedPayment.referenceNumber}
                      </p>
                    </div>
                    {!isInstallation &&
                      selectedPayment.billingId?.invoiceNumber && (
                        <div>
                          <p className="text-xs text-gray-500">
                            Invoice Number
                          </p>
                          <p className="font-mono text-sm">
                            {selectedPayment.billingId.invoiceNumber}
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
                        {selectedPayment.billingId?.isProRated && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Pro-rated Bill
                          </span>
                        )}
                      </div>
                    )}
                    {!isInstallation && selectedPayment.billingId?.dueDate && (
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className="text-sm font-medium text-red-600">
                          {formatDateFixed(selectedPayment.billingId.dueDate)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Payment Date</p>
                      <p className="text-sm">
                        {formatShortDate(selectedPayment.createdAt)}
                      </p>
                    </div>
                    {selectedPayment.paidAt && (
                      <div>
                        <p className="text-xs text-gray-500">Paid At</p>
                        <p className="text-sm">
                          {formatShortDate(selectedPayment.paidAt)}
                        </p>
                      </div>
                    )}
                    {selectedPayment.paymentDetails?.notes && (
                      <div>
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="text-sm text-gray-600">
                          {selectedPayment.paymentDetails.notes}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3 pt-4 border-t flex-wrap">
                      {selectedPayment.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleConfirmPayment(selectedPayment._id)
                            }
                            disabled={confirming}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Confirm Payment
                          </button>
                          <button
                            onClick={() =>
                              handleRejectPayment(selectedPayment._id)
                            }
                            disabled={rejecting}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          handleDeletePayment(
                            selectedPayment._id,
                            selectedPayment.referenceNumber,
                          )
                        }
                        disabled={deleting}
                        className="w-full py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <FiTrash2 className="w-4 h-4" /> Delete Payment
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
