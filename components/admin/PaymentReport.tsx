// frontend/src/components/admin/PaymentReport.tsx - COMPLETE PAYMENT REPORT WITH BILLING DATE SUMMARY, MONTH FILTER & PAYMENT TYPE FILTER

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  FiDownload,
  FiFileText,
  FiCalendar,
  FiFilter,
  FiBarChart2,
  FiPieChart,
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiInfo,
  FiTool,
  FiRepeat,
  FiClock,
} from "react-icons/fi";
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

interface PaymentReportProps {
  paymentGroups: PaymentGroup[];
  buildings: Building[];
  buildingFilter: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  statusFilter: string;
  paymentTypeFilter: string;
}

// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount: number): string {
  return `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
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

function formatBillingPeriod(billingPeriod?: {
  start: string;
  end: string;
}): string {
  if (!billingPeriod?.start || !billingPeriod?.end) return "-";
  const start = new Date(billingPeriod.start);
  const end = new Date(billingPeriod.end);
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

// ==================== BILLING DATE HELPERS ====================
function getBillingDate(payment: Payment): Date {
  const billingPeriod = (payment.billingId as any)?.billingPeriod;
  if (billingPeriod?.start) {
    return new Date(billingPeriod.start);
  }
  return new Date(payment.createdAt);
}

function getBillingMonthKey(payment: Payment): string {
  const billingDate = getBillingDate(payment);
  const year = billingDate.getFullYear();
  const month = (billingDate.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  if (monthKey === "unknown") return "Unknown Period";
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

// ==================== ROBUST BUILDING MATCHING ====================
function groupMatchesBuilding(
  group: PaymentGroup,
  buildingFilter: string,
  selectedBuildingName: string,
): boolean {
  if (!buildingFilter) return true;

  if (group.customerInfo.buildingId === buildingFilter) return true;

  if (
    selectedBuildingName &&
    group.customerInfo.buildingName &&
    group.customerInfo.buildingName.trim().toLowerCase() ===
      selectedBuildingName.trim().toLowerCase()
  ) {
    return true;
  }

  return group.payments.some((p: any) => {
    if (p.buildingId === buildingFilter) return true;

    if (p.userId && typeof p.userId === "object") {
      if (p.userId.buildingId === buildingFilter) return true;
      if (
        selectedBuildingName &&
        p.userId.buildingName &&
        p.userId.buildingName.trim().toLowerCase() ===
          selectedBuildingName.trim().toLowerCase()
      ) {
        return true;
      }
    }

    if (p.applicationId && typeof p.applicationId === "object") {
      if (p.applicationId.buildingId === buildingFilter) return true;
      if (
        selectedBuildingName &&
        p.applicationId.buildingName &&
        p.applicationId.buildingName.trim().toLowerCase() ===
          selectedBuildingName.trim().toLowerCase()
      ) {
        return true;
      }
    }

    if (p.billingId && typeof p.billingId === "object") {
      if (p.billingId.buildingId === buildingFilter) return true;
    }

    return false;
  });
}

// ==================== REPORT COMPONENT ====================
export default function PaymentReport({
  paymentGroups,
  buildings,
  buildingFilter,
  dateRangeStart,
  dateRangeEnd,
  statusFilter,
  paymentTypeFilter,
}: PaymentReportProps) {
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [reportType, setReportType] = useState<
    "summary" | "detailed" | "billing"
  >("summary");

  // ==================== LOCAL FILTER STATES ====================
  // Month filter (format: "YYYY-MM" or "" for all)
  const [monthFilter, setMonthFilter] = useState<string>("");

  // Payment type checkboxes (local, independent of prop)
  const [showRegularFee, setShowRegularFee] = useState<boolean>(true);
  const [showProrateFee, setShowProrateFee] = useState<boolean>(true);
  const [showInstallationFee, setShowInstallationFee] = useState<boolean>(true);

  // Resolve the selected building's name for flexible matching
  const selectedBuilding = useMemo(() => {
    if (!buildingFilter) return null;
    return buildings.find((b) => b._id === buildingFilter) || null;
  }, [buildingFilter, buildings]);

  const selectedBuildingName = useMemo(() => {
    if (!selectedBuilding) return "";
    return selectedBuilding.name || selectedBuilding.buildingName || "";
  }, [selectedBuilding]);

  // ==================== AVAILABLE MONTHS (for month filter dropdown) ====================
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    paymentGroups.forEach((group) => {
      group.payments.forEach((payment) => {
        const key = getBillingMonthKey(payment);
        if (key && key !== "unknown") {
          monthsSet.add(key);
        }
      });
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [paymentGroups]);

  // ==================== ACTIVE PAYMENT TYPES (based on checkboxes) ====================
  const activePaymentTypes = useMemo(() => {
    const types: string[] = [];
    if (showRegularFee) types.push("subscription");
    if (showProrateFee) types.push("pro_rated");
    if (showInstallationFee) types.push("installation");
    return types;
  }, [showRegularFee, showProrateFee, showInstallationFee]);

  // ==================== APPLY ALL FILTERS ====================
  const filteredPaymentGroups = useMemo(() => {
    return paymentGroups
      .map((group) => {
        // Filter individual payments based on status, type, date range, month, and type checkboxes
        const filteredPayments = group.payments.filter((payment) => {
          // Status filter (from prop)
          if (statusFilter && statusFilter !== "all") {
            if (payment.status !== statusFilter) {
              return false;
            }
          }

          // Payment type filter (from prop - used as override)
          if (paymentTypeFilter && paymentTypeFilter !== "all") {
            if (payment.paymentType !== paymentTypeFilter) {
              return false;
            }
          }

          // Payment type checkbox filter (local)
          // If none of the checkboxes are checked, exclude all payments
          if (activePaymentTypes.length === 0) {
            return false;
          }
          // If the payment type is not in the active list, exclude it
          if (
            payment.paymentType &&
            !activePaymentTypes.includes(payment.paymentType)
          ) {
            return false;
          }

          // Month filter (local) - based on billing month key
          if (monthFilter) {
            const paymentMonthKey = getBillingMonthKey(payment);
            if (paymentMonthKey !== monthFilter) {
              return false;
            }
          }

          // Date range filter (from props) - based on billing date
          const paymentDate = getBillingDate(payment);
          if (dateRangeStart) {
            const start = new Date(dateRangeStart);
            start.setHours(0, 0, 0, 0);
            if (paymentDate < start) return false;
          }
          if (dateRangeEnd) {
            const end = new Date(dateRangeEnd);
            end.setHours(23, 59, 59, 999);
            if (paymentDate > end) return false;
          }

          return true;
        });

        // If no payments match, exclude the group entirely
        if (filteredPayments.length === 0) return null;

        // Recompute totals based on the filtered payments
        const totalAmount = filteredPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0,
        );
        const totalPaidAmount = filteredPayments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPendingAmount = filteredPayments
          .filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const sortedByDate = [...filteredPayments].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        return {
          ...group,
          payments: filteredPayments,
          totalAmount,
          totalPaidAmount,
          totalPendingAmount,
          paymentCount: filteredPayments.length,
          lastPaymentDate: sortedByDate[0]?.createdAt || group.lastPaymentDate,
          firstPaymentDate:
            sortedByDate[sortedByDate.length - 1]?.createdAt ||
            group.firstPaymentDate,
          hasPendingPayments: filteredPayments.some(
            (p) => p.status === "pending",
          ),
        } as PaymentGroup;
      })
      .filter((group): group is PaymentGroup => group !== null)
      .filter((group) =>
        buildingFilter
          ? groupMatchesBuilding(group, buildingFilter, selectedBuildingName)
          : true,
      );
  }, [
    paymentGroups,
    buildingFilter,
    selectedBuildingName,
    dateRangeStart,
    dateRangeEnd,
    statusFilter,
    paymentTypeFilter,
    monthFilter,
    activePaymentTypes,
  ]);

  // ==================== COMPUTED STATS ====================
  const reportStats = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverall = 0;
    let totalTransactions = 0;
    let totalCustomers = filteredPaymentGroups.length;

    const monthlyBreakdown: Record<
      string,
      { paid: number; pending: number; count: number }
    > = {};
    const buildingBreakdown: Record<
      string,
      { paid: number; pending: number; count: number; customers: number }
    > = {};
    const paymentTypeBreakdown: Record<
      string,
      { amount: number; count: number; paid: number; pending: number }
    > = {};

    filteredPaymentGroups.forEach((group) => {
      totalPaid += group.totalPaidAmount;
      totalPending += group.totalPendingAmount;
      totalOverall += group.totalAmount;
      totalTransactions += group.paymentCount;

      // Building breakdown
      const buildingName =
        group.customerInfo.buildingName || "Unknown Building";
      if (!buildingBreakdown[buildingName]) {
        buildingBreakdown[buildingName] = {
          paid: 0,
          pending: 0,
          count: 0,
          customers: 0,
        };
      }
      buildingBreakdown[buildingName].paid += group.totalPaidAmount;
      buildingBreakdown[buildingName].pending += group.totalPendingAmount;
      buildingBreakdown[buildingName].count += group.paymentCount;
      buildingBreakdown[buildingName].customers += 1;

      // Payment type breakdown and monthly breakdown
      group.payments.forEach((payment) => {
        const type = payment.paymentType || "unknown";
        if (!paymentTypeBreakdown[type]) {
          paymentTypeBreakdown[type] = {
            amount: 0,
            count: 0,
            paid: 0,
            pending: 0,
          };
        }
        paymentTypeBreakdown[type].amount += payment.amount || 0;
        paymentTypeBreakdown[type].count += 1;

        if (payment.status === "completed") {
          paymentTypeBreakdown[type].paid += payment.amount || 0;
        } else if (payment.status === "pending") {
          paymentTypeBreakdown[type].pending += payment.amount || 0;
        }

        // Monthly breakdown based on billing period
        const billingPeriod = (payment.billingId as any)?.billingPeriod;
        let monthKey = "Unknown";

        if (billingPeriod?.start) {
          const startDate = new Date(billingPeriod.start);
          monthKey = formatMonthYear(startDate);
        } else if (payment.createdAt) {
          const createdDate = new Date(payment.createdAt);
          monthKey = formatMonthYear(createdDate);
        }

        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = { paid: 0, pending: 0, count: 0 };
        }
        monthlyBreakdown[monthKey].count += 1;
        if (payment.status === "completed") {
          monthlyBreakdown[monthKey].paid += payment.amount || 0;
        } else if (payment.status === "pending") {
          monthlyBreakdown[monthKey].pending += payment.amount || 0;
        }
      });
    });

    return {
      totalCustomers,
      totalTransactions,
      totalPaid,
      totalPending,
      totalOverall,
      monthlyBreakdown,
      buildingBreakdown,
      paymentTypeBreakdown,
    };
  }, [filteredPaymentGroups]);

  // ==================== BILLING DATE GROUPED SUMMARY ====================
  const billingDateSummary = useMemo(() => {
    const monthlyData = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        billingPeriodStart: string;
        billingPeriodEnd: string;
        totalPaid: number;
        totalPending: number;
        totalAmount: number;
        transactionCount: number;
        customerCount: number;
        customers: Set<string>;
      }
    >();

    filteredPaymentGroups.forEach((group) => {
      group.payments.forEach((payment) => {
        const monthKey = getBillingMonthKey(payment);
        const billingPeriod = (payment.billingId as any)?.billingPeriod;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            monthKey,
            monthLabel: formatMonthLabel(monthKey),
            billingPeriodStart: billingPeriod?.start || "",
            billingPeriodEnd: billingPeriod?.end || "",
            totalPaid: 0,
            totalPending: 0,
            totalAmount: 0,
            transactionCount: 0,
            customerCount: 0,
            customers: new Set<string>(),
          });
        }

        const monthEntry = monthlyData.get(monthKey)!;
        const amount = payment.amount || 0;

        monthEntry.transactionCount += 1;
        monthEntry.totalAmount += amount;
        monthEntry.customers.add(group.customerId);

        if (payment.status === "completed") {
          monthEntry.totalPaid += amount;
        } else if (payment.status === "pending") {
          monthEntry.totalPending += amount;
        }

        if (billingPeriod?.start) {
          const currentStart = monthEntry.billingPeriodStart
            ? new Date(monthEntry.billingPeriodStart)
            : null;
          const newStart = new Date(billingPeriod.start);
          if (!currentStart || newStart < currentStart) {
            monthEntry.billingPeriodStart = billingPeriod.start;
          }
        }
        if (billingPeriod?.end) {
          const currentEnd = monthEntry.billingPeriodEnd
            ? new Date(monthEntry.billingPeriodEnd)
            : null;
          const newEnd = new Date(billingPeriod.end);
          if (!currentEnd || newEnd > currentEnd) {
            monthEntry.billingPeriodEnd = billingPeriod.end;
          }
        }
      });
    });

    const result = Array.from(monthlyData.values()).map((entry) => ({
      ...entry,
      customerCount: entry.customers.size,
    }));

    result.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return result;
  }, [filteredPaymentGroups]);

  // ==================== SEPARATED PAYMENT TYPE BREAKDOWNS ====================
  const regularFeeBreakdown = useMemo(() => {
    const data = reportStats.paymentTypeBreakdown["subscription"] || {
      amount: 0,
      count: 0,
      paid: 0,
      pending: 0,
    };
    return data;
  }, [reportStats.paymentTypeBreakdown]);

  const installationFeeBreakdown = useMemo(() => {
    const data = reportStats.paymentTypeBreakdown["installation"] || {
      amount: 0,
      count: 0,
      paid: 0,
      pending: 0,
    };
    return data;
  }, [reportStats.paymentTypeBreakdown]);

  const proRatedFeeBreakdown = useMemo(() => {
    const data = reportStats.paymentTypeBreakdown["pro_rated"] || {
      amount: 0,
      count: 0,
      paid: 0,
      pending: 0,
    };
    return data;
  }, [reportStats.paymentTypeBreakdown]);

  const otherFeeBreakdown = useMemo(() => {
    const knownTypes = ["subscription", "installation", "pro_rated"];
    const otherData = { amount: 0, count: 0, paid: 0, pending: 0 };
    Object.entries(reportStats.paymentTypeBreakdown).forEach(([type, data]) => {
      if (!knownTypes.includes(type)) {
        otherData.amount += data.amount;
        otherData.count += data.count;
        otherData.paid += data.paid;
        otherData.pending += data.pending;
      }
    });
    return otherData;
  }, [reportStats.paymentTypeBreakdown]);

  // ==================== SORTED BREAKDOWNS ====================
  const sortedMonthlyBreakdown = useMemo(() => {
    return Object.entries(reportStats.monthlyBreakdown).sort((a, b) => {
      if (a[0] === "Unknown") return 1;
      if (b[0] === "Unknown") return -1;
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateB.getTime() - dateA.getTime();
    });
  }, [reportStats.monthlyBreakdown]);

  const sortedBuildingBreakdown = useMemo(() => {
    return Object.entries(reportStats.buildingBreakdown).sort(
      (a, b) => b[1].paid - a[1].paid,
    );
  }, [reportStats.buildingBreakdown]);

  const sortedPaymentTypeBreakdown = useMemo(() => {
    return Object.entries(reportStats.paymentTypeBreakdown).sort(
      (a, b) => b[1].amount - a[1].amount,
    );
  }, [reportStats.paymentTypeBreakdown]);

  // ==================== EXPORT TO PDF ====================
  const exportToPDF = useCallback(() => {
    if (filteredPaymentGroups.length === 0) {
      alert("No data to export. Please adjust your filters.");
      return;
    }

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
      dateRangeStart && dateRangeEnd
        ? `${formatShortDate(dateRangeStart)} to ${formatShortDate(dateRangeEnd)}`
        : "All Dates";

    const statusStr = statusFilter || "All";
    const typeStr = paymentTypeFilter || "All";

    const monthStr = monthFilter ? formatMonthLabel(monthFilter) : "All Months";

    // Build summary table rows
    let summaryRows = "";
    filteredPaymentGroups.forEach((group, index) => {
      const hasFree = group.payments.some(
        (p) => p.paymentDetails?.isFree === true,
      );
      summaryRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${group.customerInfo.name}${hasFree ? " 🆓" : ""}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${group.customerInfo.applicationId}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${group.customerInfo.email}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${group.customerInfo.buildingName || "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${group.paymentCount}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #16a34a;">${formatCurrency(group.totalPaidAmount)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${group.totalPendingAmount > 0 ? formatCurrency(group.totalPendingAmount) : "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(group.totalAmount)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${formatShortDate(group.lastPaymentDate)}</td>
        </tr>
      `;
    });

    // Build billing date summary rows
    let billingDateRows = "";
    billingDateSummary.forEach((entry, index) => {
      const periodDisplay =
        entry.billingPeriodStart && entry.billingPeriodEnd
          ? `${formatShortDate(entry.billingPeriodStart)} - ${formatShortDate(entry.billingPeriodEnd)}`
          : entry.monthLabel;

      billingDateRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background: #f0f7ff;">${entry.monthLabel}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-size: 10px;">${periodDisplay}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${entry.customerCount}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${entry.transactionCount}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #16a34a; font-weight: bold;">${formatCurrency(entry.totalPaid)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${entry.totalPending > 0 ? formatCurrency(entry.totalPending) : "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #1e40af;">${formatCurrency(entry.totalAmount)}</td>
        </tr>
      `;
    });

    // Build billing period breakdown rows
    let billingRows = "";
    sortedMonthlyBreakdown.forEach(([month, data], index) => {
      billingRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${month}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${data.count}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #16a34a; font-weight: bold;">${formatCurrency(data.paid)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(data.paid + data.pending)}</td>
        </tr>
      `;
    });

    // Build building breakdown rows
    let buildingRows = "";
    sortedBuildingBreakdown.forEach(([building, data], index) => {
      buildingRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${building}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${data.customers}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${data.count}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #16a34a; font-weight: bold;">${formatCurrency(data.paid)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(data.paid + data.pending)}</td>
        </tr>
      `;
    });

    // Build separated payment type breakdown rows
    const buildTypeRow = (
      label: string,
      data: typeof regularFeeBreakdown,
      color: string,
    ) => {
      const percentage = (
        (data.amount / (reportStats.totalOverall || 1)) *
        100
      ).toFixed(1);
      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${label}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${data.count}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #16a34a;">${formatCurrency(data.paid)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #ca8a04;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(data.amount)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: ${color};">${percentage}%</td>
        </tr>
      `;
    };

    const typeRows: string[] = [];
    if (showRegularFee) {
      typeRows.push(
        buildTypeRow(
          "Regular Fee (Subscription)",
          regularFeeBreakdown,
          "#7c3aed",
        ),
      );
    }
    if (showInstallationFee) {
      typeRows.push(
        buildTypeRow("Installation Fee", installationFeeBreakdown, "#ea580c"),
      );
    }
    if (showProrateFee) {
      typeRows.push(
        buildTypeRow("Pro-rated Fee", proRatedFeeBreakdown, "#2563eb"),
      );
    }
    if (otherFeeBreakdown.count > 0) {
      typeRows.push(buildTypeRow("Other Fees", otherFeeBreakdown, "#6b7280"));
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Report - Misterfyber</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; }
          .header h1 { color: #1e3a8a; margin: 0; font-size: 28px; }
          .header .subtitle { color: #6b7280; margin: 5px 0; font-size: 14px; }
          .header .filters { 
            background: #f3f4f6; 
            padding: 10px 15px; 
            border-radius: 8px; 
            margin-top: 15px;
            font-size: 12px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
          }
          .header .filters span { 
            background: white; 
            padding: 4px 12px; 
            border-radius: 15px;
            border: 1px solid #d1d5db;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
          }
          .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-card .value { font-size: 22px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.green { color: #16a34a; }
          .summary-card .value.yellow { color: #ca8a04; }
          .summary-card .value.blue { color: #2563eb; }
          .summary-card .value.purple { color: #7c3aed; }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
            margin: 25px 0 10px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 11px;
            margin-bottom: 20px;
          }
          th { 
            background: #f1f5f9; 
            padding: 8px 6px; 
            border: 1px solid #ddd; 
            text-align: left;
            font-weight: bold;
            color: #374151;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          td { padding: 6px; border: 1px solid #ddd; }
          .grand-total-row {
            background: #f0fdf4;
            font-weight: bold;
          }
          .grand-total-row td {
            border-top: 2px solid #16a34a;
            font-size: 12px;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 11px; 
            color: #6b7280;
            border-top: 2px solid #e5e7eb;
            padding-top: 15px;
          }
          .free-badge {
            background: #22c55e;
            color: white;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
          }
          .page-break { page-break-before: always; }
          @media print {
            .no-print { display: none; }
            body { padding: 15px; }
            .summary-cards { grid-template-columns: repeat(4, 1fr); }
          }
          @media (max-width: 768px) {
            .summary-cards { grid-template-columns: repeat(2, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Payment Report</h1>
          <p class="subtitle">Misterfyber Network Corporation</p>
          <p class="subtitle">Generated on: ${dateStr}</p>
          <div class="filters">
            <span>🏢 Building: ${buildingName}</span>
            <span>📅 Date Range: ${dateRangeStr}</span>
            <span>🗓️ Month: ${monthStr}</span>
            <span>📌 Status: ${statusStr}</span>
            <span>📋 Type: ${typeStr}</span>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="label">Total Customers</div>
            <div class="value blue">${reportStats.totalCustomers}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Transactions</div>
            <div class="value purple">${reportStats.totalTransactions}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Paid</div>
            <div class="value green">${formatCurrency(reportStats.totalPaid)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Pending</div>
            <div class="value yellow">${formatCurrency(reportStats.totalPending)}</div>
          </div>
        </div>

        <div class="section-title">📅 Summary by Billing Date (Billing Period)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th>Billing Month</th>
              <th>Billing Period</th>
              <th style="text-align: center;">Customers</th>
              <th style="text-align: center;">Transactions</th>
              <th style="text-align: right;">Paid Amount</th>
              <th style="text-align: right;">Pending Amount</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${billingDateRows || '<tr><td colspan="8" style="text-align: center; padding: 15px; color: #999;">No billing date data available</td></tr>'}
            <tr class="grand-total-row">
              <td colspan="3" style="text-align: right;">GRAND TOTAL</td>
              <td style="text-align: center;">${reportStats.totalCustomers}</td>
              <td style="text-align: center;">${reportStats.totalTransactions}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(reportStats.totalPaid)}</td>
              <td style="text-align: right; color: #ca8a04;">${formatCurrency(reportStats.totalPending)}</td>
              <td style="text-align: right; color: #1e40af;">${formatCurrency(reportStats.totalOverall)}</td>
            </tr>
          </tbody>
        </table>

        <div class="page-break"></div>

        <div class="section-title">📈 Billing Period Breakdown</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">#</th>
              <th>Billing Period (Month)</th>
              <th style="text-align: center;">Transactions</th>
              <th style="text-align: right;">Paid Amount</th>
              <th style="text-align: right;">Pending Amount</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${billingRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">No billing period data available</td></tr>'}
            <tr class="grand-total-row">
              <td colspan="2" style="text-align: right;">GRAND TOTAL</td>
              <td style="text-align: center;">${reportStats.totalTransactions}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(reportStats.totalPaid)}</td>
              <td style="text-align: right; color: #ca8a04;">${formatCurrency(reportStats.totalPending)}</td>
              <td style="text-align: right; color: #1e40af;">${formatCurrency(reportStats.totalOverall)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">🏢 Building Breakdown</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">#</th>
              <th>Building Name</th>
              <th style="text-align: center;">Customers</th>
              <th style="text-align: center;">Transactions</th>
              <th style="text-align: right;">Paid Amount</th>
              <th style="text-align: right;">Pending Amount</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildingRows || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">No building data available</td></tr>'}
            <tr class="grand-total-row">
              <td colspan="2" style="text-align: right;">GRAND TOTAL</td>
              <td style="text-align: center;">${reportStats.totalCustomers}</td>
              <td style="text-align: center;">${reportStats.totalTransactions}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(reportStats.totalPaid)}</td>
              <td style="text-align: right; color: #ca8a04;">${formatCurrency(reportStats.totalPending)}</td>
              <td style="text-align: right; color: #1e40af;">${formatCurrency(reportStats.totalOverall)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">💰 Payment Type Breakdown (Separated)</div>
        <table>
          <thead>
            <tr>
              <th>Payment Type</th>
              <th style="text-align: center;">Count</th>
              <th style="text-align: right;">Paid Amount</th>
              <th style="text-align: right;">Pending Amount</th>
              <th style="text-align: right;">Total Amount</th>
              <th style="text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${typeRows.join("")}
            <tr class="grand-total-row">
              <td style="text-align: right; font-weight: bold;">GRAND TOTAL</td>
              <td style="text-align: center;">${reportStats.totalTransactions}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(reportStats.totalPaid)}</td>
              <td style="text-align: right; color: #ca8a04;">${formatCurrency(reportStats.totalPending)}</td>
              <td style="text-align: right; color: #1e40af;">${formatCurrency(reportStats.totalOverall)}</td>
              <td style="text-align: right;">100%</td>
            </tr>
          </tbody>
        </table>

        <div class="page-break"></div>

        <div class="section-title">👥 Customer Summary</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
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
            ${summaryRows}
            <tr class="grand-total-row">
              <td colspan="5" style="text-align: right;">GRAND TOTAL</td>
              <td style="text-align: center;">${reportStats.totalTransactions}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(reportStats.totalPaid)}</td>
              <td style="text-align: right; color: #ca8a04;">${formatCurrency(reportStats.totalPending)}</td>
              <td style="text-align: right; color: #1e40af;">${formatCurrency(reportStats.totalOverall)}</td>
              <td style="text-align: center;">—</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This report was generated automatically by Misterfyber Payment Management System.</p>
          <p>Billing dates are based on the billing period start date from each billing record.</p>
          <p>All amounts are in Philippine Pesos (₱).</p>
          <p>© ${now.getFullYear()} Misterfyber Network Corporation. All rights reserved.</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 25px; padding: 15px;">
          <button onclick="window.print()" style="padding: 12px 40px; background: #1e3a8a; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert("Please allow popups to generate PDF report.");
    }
  }, [
    filteredPaymentGroups,
    buildings,
    buildingFilter,
    dateRangeStart,
    dateRangeEnd,
    statusFilter,
    paymentTypeFilter,
    monthFilter,
    reportStats,
    sortedMonthlyBreakdown,
    sortedBuildingBreakdown,
    sortedPaymentTypeBreakdown,
    billingDateSummary,
    regularFeeBreakdown,
    installationFeeBreakdown,
    proRatedFeeBreakdown,
    otherFeeBreakdown,
    showRegularFee,
    showInstallationFee,
    showProrateFee,
  ]);

  // ==================== EXPORT TO EXCEL ====================
  const exportToExcel = useCallback(() => {
    if (filteredPaymentGroups.length === 0) {
      alert("No data to export. Please adjust your filters.");
      return;
    }

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
      dateRangeStart && dateRangeEnd
        ? `${formatShortDate(dateRangeStart)} to ${formatShortDate(dateRangeEnd)}`
        : "All Dates";

    const statusStr = statusFilter || "All";
    const typeStr = paymentTypeFilter || "All";
    const monthStr = monthFilter ? formatMonthLabel(monthFilter) : "All Months";

    // Build CSV content
    let csvContent = "";

    // Header info
    csvContent += "PAYMENT REPORT\n";
    csvContent += "Misterfyber Network Corporation\n";
    csvContent += `Generated: ${dateStr}\n`;
    csvContent += `Building: ${buildingName}\n`;
    csvContent += `Date Range: ${dateRangeStr}\n`;
    csvContent += `Month: ${monthStr}\n`;
    csvContent += `Status: ${statusStr}\n`;
    csvContent += `Payment Type: ${typeStr}\n\n`;

    // Summary cards
    csvContent += "SUMMARY\n";
    csvContent += `Total Customers,${reportStats.totalCustomers}\n`;
    csvContent += `Total Transactions,${reportStats.totalTransactions}\n`;
    csvContent += `Total Paid,${reportStats.totalPaid}\n`;
    csvContent += `Total Pending,${reportStats.totalPending}\n`;
    csvContent += `Total Amount,${reportStats.totalOverall}\n\n`;

    // Billing Date Summary
    if (billingDateSummary.length > 0) {
      csvContent += "SUMMARY BY BILLING DATE (BILLING PERIOD)\n";
      csvContent +=
        "Billing Month,Billing Period Start,Billing Period End,Customers,Transactions,Paid Amount,Pending Amount,Total Amount\n";
      billingDateSummary.forEach((entry) => {
        csvContent += `${entry.monthLabel},`;
        csvContent += `${entry.billingPeriodStart ? formatShortDate(entry.billingPeriodStart) : "—"},`;
        csvContent += `${entry.billingPeriodEnd ? formatShortDate(entry.billingPeriodEnd) : "—"},`;
        csvContent += `${entry.customerCount},`;
        csvContent += `${entry.transactionCount},`;
        csvContent += `${entry.totalPaid},`;
        csvContent += `${entry.totalPending},`;
        csvContent += `${entry.totalAmount}\n`;
      });
      csvContent += `GRAND TOTAL,,,${reportStats.totalCustomers},${reportStats.totalTransactions},${reportStats.totalPaid},${reportStats.totalPending},${reportStats.totalOverall}\n\n`;
    }

    // Billing Period Breakdown
    if (sortedMonthlyBreakdown.length > 0) {
      csvContent += "BILLING PERIOD BREAKDOWN\n";
      csvContent +=
        "Billing Period (Month),Transactions,Paid Amount,Pending Amount,Total Amount\n";
      sortedMonthlyBreakdown.forEach(([month, data]) => {
        csvContent += `${month},`;
        csvContent += `${data.count},`;
        csvContent += `${data.paid},`;
        csvContent += `${data.pending},`;
        csvContent += `${data.paid + data.pending}\n`;
      });
      csvContent += `GRAND TOTAL,${reportStats.totalTransactions},${reportStats.totalPaid},${reportStats.totalPending},${reportStats.totalOverall}\n\n`;
    }

    // Building Breakdown
    if (sortedBuildingBreakdown.length > 0) {
      csvContent += "BUILDING BREAKDOWN\n";
      csvContent +=
        "Building Name,Customers,Transactions,Paid Amount,Pending Amount,Total Amount\n";
      sortedBuildingBreakdown.forEach(([building, data]) => {
        csvContent += `${building},`;
        csvContent += `${data.customers},`;
        csvContent += `${data.count},`;
        csvContent += `${data.paid},`;
        csvContent += `${data.pending},`;
        csvContent += `${data.paid + data.pending}\n`;
      });
      csvContent += `GRAND TOTAL,${reportStats.totalCustomers},${reportStats.totalTransactions},${reportStats.totalPaid},${reportStats.totalPending},${reportStats.totalOverall}\n\n`;
    }

    // Payment Type Breakdown (Separated)
    csvContent += "PAYMENT TYPE BREAKDOWN (SEPARATED)\n";
    csvContent +=
      "Payment Type,Count,Paid Amount,Pending Amount,Total Amount,Percentage\n";

    const typeData: { label: string; data: typeof regularFeeBreakdown }[] = [];
    if (showRegularFee) {
      typeData.push({
        label: "Regular Fee (Subscription)",
        data: regularFeeBreakdown,
      });
    }
    if (showInstallationFee) {
      typeData.push({
        label: "Installation Fee",
        data: installationFeeBreakdown,
      });
    }
    if (showProrateFee) {
      typeData.push({
        label: "Pro-rated Fee",
        data: proRatedFeeBreakdown,
      });
    }
    if (otherFeeBreakdown.count > 0) {
      typeData.push({
        label: "Other Fees",
        data: otherFeeBreakdown,
      });
    }

    typeData.forEach(({ label, data }) => {
      const percentage = (
        (data.amount / (reportStats.totalOverall || 1)) *
        100
      ).toFixed(1);
      csvContent += `${label},`;
      csvContent += `${data.count},`;
      csvContent += `${data.paid},`;
      csvContent += `${data.pending},`;
      csvContent += `${data.amount},`;
      csvContent += `${percentage}%\n`;
    });
    csvContent += `GRAND TOTAL,${reportStats.totalTransactions},${reportStats.totalPaid},${reportStats.totalPending},${reportStats.totalOverall},100%\n\n`;

    // Customer Summary
    csvContent += "CUSTOMER SUMMARY\n";
    csvContent +=
      "Customer Name,Application ID,Email,Building,Payments,Total Paid,Pending,Total Amount,Last Payment Date\n";
    filteredPaymentGroups.forEach((group) => {
      const hasFree = group.payments.some(
        (p) => p.paymentDetails?.isFree === true,
      );
      csvContent += `"${group.customerInfo.name}${hasFree ? " (Free)" : ""}",`;
      csvContent += `${group.customerInfo.applicationId},`;
      csvContent += `${group.customerInfo.email},`;
      csvContent += `"${group.customerInfo.buildingName || "—"}",`;
      csvContent += `${group.paymentCount},`;
      csvContent += `${group.totalPaidAmount},`;
      csvContent += `${group.totalPendingAmount},`;
      csvContent += `${group.totalAmount},`;
      csvContent += `${formatShortDate(group.lastPaymentDate)}\n`;
    });
    csvContent += `GRAND TOTAL,,,,${reportStats.totalTransactions},${reportStats.totalPaid},${reportStats.totalPending},${reportStats.totalOverall},—\n`;

    // Create and download the CSV file
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Payment_Report_${now.toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    filteredPaymentGroups,
    buildings,
    buildingFilter,
    dateRangeStart,
    dateRangeEnd,
    statusFilter,
    paymentTypeFilter,
    monthFilter,
    reportStats,
    sortedMonthlyBreakdown,
    sortedBuildingBreakdown,
    billingDateSummary,
    regularFeeBreakdown,
    installationFeeBreakdown,
    proRatedFeeBreakdown,
    otherFeeBreakdown,
    showRegularFee,
    showInstallationFee,
    showProrateFee,
  ]);

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiBarChart2 className="w-5 h-5 text-blue-600" />
            Payment Report
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive payment analytics and breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
          >
            <FiDownload className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
          >
            <FiDownload className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* ==================== LOCAL FILTER CONTROLS ==================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <FiCalendar className="w-3 h-3 inline mr-1" />
              Billing Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">All Months</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type Checkboxes */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <FiFilter className="w-3 h-3 inline mr-1" />
              Payment Types (check to include)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition">
                <input
                  type="checkbox"
                  checked={showRegularFee}
                  onChange={(e) => setShowRegularFee(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <FiRepeat className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Regular Fee
                </span>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                <input
                  type="checkbox"
                  checked={showProrateFee}
                  onChange={(e) => setShowProrateFee(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <FiClock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Pro-rated Fee
                </span>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition">
                <input
                  type="checkbox"
                  checked={showInstallationFee}
                  onChange={(e) => setShowInstallationFee(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <FiTool className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Installation Fee
                </span>
              </label>

              {/* Reset button */}
              {(monthFilter ||
                !showRegularFee ||
                !showProrateFee ||
                !showInstallationFee) && (
                <button
                  onClick={() => {
                    setMonthFilter("");
                    setShowRegularFee(true);
                    setShowProrateFee(true);
                    setShowInstallationFee(true);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {activePaymentTypes.length === 0 && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <FiInfo className="w-3 h-3" />
                Please select at least one payment type to see data.
              </p>
            )}
          </div>
        </div>

        {/* Active filters summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Active filters:</span>
          {buildingFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              🏢 {selectedBuildingName || buildingFilter}
            </span>
          )}
          {dateRangeStart && dateRangeEnd && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              📅 {formatShortDate(dateRangeStart)} -{" "}
              {formatShortDate(dateRangeEnd)}
            </span>
          )}
          {monthFilter && (
            <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">
              🗓️ {formatMonthLabel(monthFilter)}
            </span>
          )}
          {statusFilter && statusFilter !== "all" && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
              📌 {statusFilter}
            </span>
          )}
          {paymentTypeFilter && paymentTypeFilter !== "all" && (
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
              📋 {paymentTypeFilter}
            </span>
          )}
          <span className="text-gray-400">
            ({filteredPaymentGroups.length} of {paymentGroups.length} customers
            matched)
          </span>
        </div>
      </div>

      {/* No Data Warning */}
      {filteredPaymentGroups.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <FiInfo className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">
              No data matches the current filters
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              {activePaymentTypes.length === 0
                ? "Please select at least one payment type above."
                : buildingFilter
                  ? "No customers matched the selected building. Try removing the building filter or checking if payments have a building reference."
                  : "Try adjusting your filters."}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Customers</p>
              <p className="text-xl font-bold text-blue-600">
                {reportStats.totalCustomers}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FiFileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="text-xl font-bold text-purple-600">
                {reportStats.totalTransactions}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(reportStats.totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatCurrency(reportStats.totalPending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SUMMARY BY BILLING DATE ==================== */}
      {billingDateSummary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-blue-600" />
                Summary by Billing Date
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Grouped by billing period (start date) —{" "}
                {billingDateSummary.length} billing month
                {billingDateSummary.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {billingDateSummary.map((entry) => (
                <div
                  key={entry.monthKey}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-700">
                      {entry.monthLabel}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                      {entry.transactionCount} txn
                    </span>
                  </div>
                  {(entry.billingPeriodStart || entry.billingPeriodEnd) && (
                    <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {entry.billingPeriodStart &&
                        formatShortDate(entry.billingPeriodStart)}
                      {entry.billingPeriodStart &&
                        entry.billingPeriodEnd &&
                        " - "}
                      {entry.billingPeriodEnd &&
                        formatShortDate(entry.billingPeriodEnd)}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Customers</span>
                      <span className="font-semibold text-gray-700">
                        {entry.customerCount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Paid</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(entry.totalPaid)}
                      </span>
                    </div>
                    {entry.totalPending > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Pending</span>
                        <span className="font-bold text-yellow-600">
                          {formatCurrency(entry.totalPending)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500 font-medium">Total</span>
                      <span className="font-bold text-blue-700">
                        {formatCurrency(entry.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-gray-600">
                <span className="font-semibold text-blue-700">
                  {reportStats.totalCustomers}
                </span>{" "}
                customers
              </span>
              <span className="text-gray-600">
                <span className="font-semibold text-purple-700">
                  {reportStats.totalTransactions}
                </span>{" "}
                transactions
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-green-600 font-semibold">
                Paid: {formatCurrency(reportStats.totalPaid)}
              </span>
              {reportStats.totalPending > 0 && (
                <span className="text-yellow-600 font-semibold">
                  Pending: {formatCurrency(reportStats.totalPending)}
                </span>
              )}
              <span className="text-blue-700 font-bold">
                Grand Total: {formatCurrency(reportStats.totalOverall)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SEPARATED PAYMENT TYPE BREAKDOWNS ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Regular Fee (Subscription) */}
        {showRegularFee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
              <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                <FiRepeat className="w-4 h-4" />
                Regular Fee (Subscription)
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Transactions</span>
                <span className="font-semibold text-gray-800">
                  {regularFeeBreakdown.count}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Paid</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(regularFeeBreakdown.paid)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="font-bold text-yellow-600">
                  {regularFeeBreakdown.pending > 0
                    ? formatCurrency(regularFeeBreakdown.pending)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  Total Amount
                </span>
                <span className="font-bold text-purple-700">
                  {formatCurrency(regularFeeBreakdown.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Percentage</span>
                <span className="text-xs font-medium text-gray-500">
                  {(
                    (regularFeeBreakdown.amount /
                      (reportStats.totalOverall || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Installation Fee */}
        {showInstallationFee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
              <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                <FiTool className="w-4 h-4" />
                Installation Fee
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Transactions</span>
                <span className="font-semibold text-gray-800">
                  {installationFeeBreakdown.count}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Paid</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(installationFeeBreakdown.paid)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="font-bold text-yellow-600">
                  {installationFeeBreakdown.pending > 0
                    ? formatCurrency(installationFeeBreakdown.pending)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  Total Amount
                </span>
                <span className="font-bold text-orange-700">
                  {formatCurrency(installationFeeBreakdown.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Percentage</span>
                <span className="text-xs font-medium text-gray-500">
                  {(
                    (installationFeeBreakdown.amount /
                      (reportStats.totalOverall || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pro-rated Fee */}
        {showProrateFee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <FiClock className="w-4 h-4" />
                Pro-rated Fee
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Transactions</span>
                <span className="font-semibold text-gray-800">
                  {proRatedFeeBreakdown.count}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Paid</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(proRatedFeeBreakdown.paid)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="font-bold text-yellow-600">
                  {proRatedFeeBreakdown.pending > 0
                    ? formatCurrency(proRatedFeeBreakdown.pending)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  Total Amount
                </span>
                <span className="font-bold text-blue-700">
                  {formatCurrency(proRatedFeeBreakdown.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Percentage</span>
                <span className="text-xs font-medium text-gray-500">
                  {(
                    (proRatedFeeBreakdown.amount /
                      (reportStats.totalOverall || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other Fees (if any) */}
      {otherFeeBreakdown.count > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FiDollarSign className="w-4 h-4 text-gray-600" />
              Other Fees
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-lg font-bold text-gray-800">
                  {otherFeeBreakdown.count}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(otherFeeBreakdown.paid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-yellow-600">
                  {otherFeeBreakdown.pending > 0
                    ? formatCurrency(otherFeeBreakdown.pending)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-700">
                  {formatCurrency(otherFeeBreakdown.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Period Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-blue-600" />
            Billing Period Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Billing Period (Month)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Paid Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Pending Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedMonthlyBreakdown.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No billing period data available
                  </td>
                </tr>
              ) : (
                sortedMonthlyBreakdown.map(([month, data], index) => (
                  <tr key={month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{month}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {data.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {formatCurrency(data.paid)}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-600">
                      {data.pending > 0 ? formatCurrency(data.pending) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(data.paid + data.pending)}
                    </td>
                  </tr>
                ))
              )}
              {sortedMonthlyBreakdown.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-right text-gray-700"
                  >
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reportStats.totalTransactions}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(reportStats.totalPaid)}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-600">
                    {formatCurrency(reportStats.totalPending)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {formatCurrency(reportStats.totalOverall)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Building Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiHome className="w-4 h-4 text-blue-600" />
            Building Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Building Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Customers
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Paid Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Pending Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedBuildingBreakdown.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No building data available
                  </td>
                </tr>
              ) : (
                sortedBuildingBreakdown.map(([building, data], index) => (
                  <tr key={building} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{building}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {data.customers}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {data.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {formatCurrency(data.paid)}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-600">
                      {data.pending > 0 ? formatCurrency(data.pending) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatCurrency(data.paid + data.pending)}
                    </td>
                  </tr>
                ))
              )}
              {sortedBuildingBreakdown.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-right text-gray-700"
                  >
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reportStats.totalCustomers}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reportStats.totalTransactions}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(reportStats.totalPaid)}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-600">
                    {formatCurrency(reportStats.totalPending)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {formatCurrency(reportStats.totalOverall)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Type Breakdown (All Types Combined) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiPieChart className="w-4 h-4 text-blue-600" />
            Payment Type Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Paid Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Pending Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedPaymentTypeBreakdown.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No payment type data available
                  </td>
                </tr>
              ) : (
                sortedPaymentTypeBreakdown.map(([type, data], index) => {
                  const typeLabel =
                    type === "pro_rated"
                      ? "Pro-rated"
                      : type === "subscription"
                        ? "Regular Fee (Subscription)"
                        : type === "installation"
                          ? "Installation Fee"
                          : type.charAt(0).toUpperCase() + type.slice(1);
                  const percentage =
                    (data.amount / (reportStats.totalOverall || 1)) * 100;
                  return (
                    <tr key={type} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-sm ${
                            type === "subscription"
                              ? "bg-purple-100 text-purple-800"
                              : type === "installation"
                                ? "bg-orange-100 text-orange-800"
                                : type === "pro_rated"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {data.count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {formatCurrency(data.paid)}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-600">
                        {data.pending > 0 ? formatCurrency(data.pending) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(data.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-600 w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
