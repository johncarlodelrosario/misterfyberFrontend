"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
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
  FiInfo,
  FiTool,
  FiRepeat,
  FiClock,
  FiSettings,
  FiX,
  FiRefreshCw,
  FiLoader,
} from "react-icons/fi";
import type { Payment as ServicePayment } from "@/services/payment";

// ============================================================================
// Types
// ============================================================================
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

interface ExportOptions {
  title: string;
  companyName: string;
  showGeneratedDate: boolean;
  showFilters: boolean;
  showSummaryCards: boolean;
  showTotalCustomers: boolean;
  showTotalTransactions: boolean;
  showTotalPaid: boolean;
  showTotalPending: boolean;
  showTotalOverall: boolean;
  showBillingPeriodBreakdown: boolean;
  showBuildingBreakdown: boolean;
  showPaymentTypeBreakdown: boolean;
  showCustomerSummary: boolean;
  showRegularFeeSection: boolean;
  showInstallationFeeSection: boolean;
  showProRatedFeeSection: boolean;
  showOtherFeesSection: boolean;
  showFooter: boolean;
  footerText: string;
}

// ============================================================================
// Default Export Options
// ============================================================================
const defaultExportOptions: ExportOptions = {
  title: "Payment Report",
  companyName: "Misterfyber Network Corporation",
  showGeneratedDate: true,
  showFilters: true,
  showSummaryCards: true,
  showTotalCustomers: true,
  showTotalTransactions: true,
  showTotalPaid: true,
  showTotalPending: true,
  showTotalOverall: true,
  showBillingPeriodBreakdown: true,
  showBuildingBreakdown: true,
  showPaymentTypeBreakdown: true,
  showCustomerSummary: true,
  showRegularFeeSection: true,
  showInstallationFeeSection: true,
  showProRatedFeeSection: true,
  showOtherFeesSection: true,
  showFooter: true,
  footerText:
    "This report was generated automatically by Misterfyber Payment Management System.",
};

// ============================================================================
// Helpers
// ============================================================================
function formatCurrency(amount: number): string {
  return `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyExcel(amount: number): string {
  return `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

function resolvePaymentType(payment: Payment): string {
  const billing = payment.billingId as any;

  if (billing?.isInstallationBill === true) return "installation";
  if (billing?.installationFee && billing.installationFee > 0)
    return "installation";
  if (billing?.isProRated === true) return "pro_rated";

  if (payment.paymentType === "pro_rated") return "pro_rated";
  if (payment.paymentType === "installation") return "installation";
  if (payment.paymentType === "subscription") return "subscription";

  return "subscription";
}

function getPaymentTypeLabel(type: string): string {
  switch (type) {
    case "subscription":
      return "Regular Fee (Subscription)";
    case "installation":
      return "Installation Fee";
    case "pro_rated":
      return "Pro-rated Fee";
    case "others":
      return "Other Fees";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function getBillingDate(payment: Payment): Date {
  const billingPeriod = (payment.billingId as any)?.billingPeriod;
  if (billingPeriod?.start) return new Date(billingPeriod.start);
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

function toSheetName(name: string): string {
  return name.replace(/[\\\/\?\*\[\]:]/g, "").substring(0, 31);
}

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
      )
        return true;
    }

    if (p.applicationId && typeof p.applicationId === "object") {
      if (p.applicationId.buildingId === buildingFilter) return true;
      if (
        selectedBuildingName &&
        p.applicationId.buildingName &&
        p.applicationId.buildingName.trim().toLowerCase() ===
          selectedBuildingName.trim().toLowerCase()
      )
        return true;
    }

    if (p.billingId && typeof p.billingId === "object") {
      if (p.billingId.buildingId === buildingFilter) return true;
    }

    return false;
  });
}

// ============================================================================
// Component
// ============================================================================
export default function PaymentReport({
  paymentGroups,
  buildings,
  buildingFilter,
  dateRangeStart,
  dateRangeEnd,
  statusFilter,
  paymentTypeFilter,
}: PaymentReportProps) {
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [showRegularFee, setShowRegularFee] = useState<boolean>(true);
  const [showProrateFee, setShowProrateFee] = useState<boolean>(true);
  const [showInstallationFee, setShowInstallationFee] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] =
    useState<ExportOptions>(defaultExportOptions);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showExportModal) setShowExportModal(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showExportModal]);

  const selectedBuilding = useMemo(() => {
    if (!buildingFilter) return null;
    return buildings.find((b) => b._id === buildingFilter) || null;
  }, [buildingFilter, buildings]);

  const selectedBuildingName = useMemo(() => {
    if (!selectedBuilding) return "";
    return selectedBuilding.name || selectedBuilding.buildingName || "";
  }, [selectedBuilding]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    paymentGroups.forEach((group) => {
      group.payments.forEach((payment) => {
        const key = getBillingMonthKey(payment);
        if (key && key !== "unknown") monthsSet.add(key);
      });
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [paymentGroups]);

  const activePaymentTypes = useMemo(() => {
    const types: string[] = [];
    if (showRegularFee) types.push("subscription");
    if (showProrateFee) types.push("pro_rated");
    if (showInstallationFee) types.push("installation");
    return types;
  }, [showRegularFee, showProrateFee, showInstallationFee]);

  const filteredPaymentGroups = useMemo(() => {
    return paymentGroups
      .map((group) => {
        const filteredPayments = group.payments.filter((payment) => {
          if (statusFilter && statusFilter !== "all") {
            if (payment.status !== statusFilter) return false;
          }

          const resolvedType = resolvePaymentType(payment);

          if (paymentTypeFilter && paymentTypeFilter !== "all") {
            if (resolvedType !== paymentTypeFilter) return false;
          }

          if (activePaymentTypes.length === 0) return false;
          if (!activePaymentTypes.includes(resolvedType)) return false;

          if (monthFilter) {
            const paymentMonthKey = getBillingMonthKey(payment);
            if (paymentMonthKey !== monthFilter) return false;
          }

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

        if (filteredPayments.length === 0) return null;

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

      group.payments.forEach((payment) => {
        const type = resolvePaymentType(payment);
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

        const billingPeriod = (payment.billingId as any)?.billingPeriod;
        let monthKey = "Unknown";

        if (billingPeriod?.start) {
          monthKey = formatMonthYear(new Date(billingPeriod.start));
        } else if (payment.createdAt) {
          monthKey = formatMonthYear(new Date(payment.createdAt));
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

  const regularFeeBreakdown = useMemo(() => {
    return (
      reportStats.paymentTypeBreakdown["subscription"] || {
        amount: 0,
        count: 0,
        paid: 0,
        pending: 0,
      }
    );
  }, [reportStats.paymentTypeBreakdown]);

  const installationFeeBreakdown = useMemo(() => {
    return (
      reportStats.paymentTypeBreakdown["installation"] || {
        amount: 0,
        count: 0,
        paid: 0,
        pending: 0,
      }
    );
  }, [reportStats.paymentTypeBreakdown]);

  const proRatedFeeBreakdown = useMemo(() => {
    return (
      reportStats.paymentTypeBreakdown["pro_rated"] || {
        amount: 0,
        count: 0,
        paid: 0,
        pending: 0,
      }
    );
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

  const sortedMonthlyBreakdown = useMemo(() => {
    return Object.entries(reportStats.monthlyBreakdown).sort((a, b) => {
      if (a[0] === "Unknown") return 1;
      if (b[0] === "Unknown") return -1;
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
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

  const paymentsByMonth = useMemo(() => {
    const byMonth = new Map<
      string,
      Array<{
        group: PaymentGroup;
        payment: Payment;
        billingPeriod?: { start: string; end: string };
      }>
    >();

    filteredPaymentGroups.forEach((group) => {
      group.payments.forEach((payment) => {
        const monthKey = getBillingMonthKey(payment);
        const billingPeriod = (payment.billingId as any)?.billingPeriod;

        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey)!.push({ group, payment, billingPeriod });
      });
    });

    return Array.from(byMonth.entries()).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
  }, [filteredPaymentGroups]);

  const handleExport = (format: "pdf" | "excel") => {
    if (filteredPaymentGroups.length === 0) {
      alert("No data to export. Please adjust your filters.");
      return;
    }

    setLoading(true);
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

    if (format === "pdf") {
      let summaryRows = "";
      if (exportOptions.showCustomerSummary) {
        filteredPaymentGroups.forEach((group, index) => {
          const hasFree = group.payments.some(
            (p) => p.paymentDetails?.isFree === true,
          );
          summaryRows += `
            <tr>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-size: 11px;">${group.customerInfo.name}${hasFree ? " 🆓" : ""}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-family: monospace; font-size: 10px;">${group.customerInfo.applicationId}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-size: 11px;">${group.customerInfo.email}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-size: 11px;">${group.customerInfo.buildingName || "—"}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${group.paymentCount}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; font-weight: bold; color: #16a34a; font-size: 11px;">${formatCurrency(group.totalPaidAmount)}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #ca8a04; font-size: 11px;">${group.totalPendingAmount > 0 ? formatCurrency(group.totalPendingAmount) : "—"}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; font-weight: bold; font-size: 11px;">${formatCurrency(group.totalAmount)}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${formatShortDate(group.lastPaymentDate)}</td>
            </tr>
          `;
        });
      }

      let billingRows = "";
      if (exportOptions.showBillingPeriodBreakdown) {
        sortedMonthlyBreakdown.forEach(([month, data], index) => {
          billingRows += `
            <tr>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-weight: bold; font-size: 11px;">${month}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${data.count}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #16a34a; font-weight: bold; font-size: 11px;">${formatCurrency(data.paid)}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #ca8a04; font-size: 11px;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; font-weight: bold; font-size: 11px;">${formatCurrency(data.paid + data.pending)}</td>
            </tr>
          `;
        });
      }

      let buildingRows = "";
      if (exportOptions.showBuildingBreakdown) {
        sortedBuildingBreakdown.forEach(([building, data], index) => {
          buildingRows += `
            <tr>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; font-weight: bold; font-size: 11px;">${building}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${data.customers}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${data.count}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #16a34a; font-weight: bold; font-size: 11px;">${formatCurrency(data.paid)}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #ca8a04; font-size: 11px;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
              <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; font-weight: bold; font-size: 11px;">${formatCurrency(data.paid + data.pending)}</td>
            </tr>
          `;
        });
      }

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
            <td style="padding: 8px; border: 1px solid #dbeafe; font-weight: bold; font-size: 11px;">${label}</td>
            <td style="padding: 8px; border: 1px solid #dbeafe; text-align: center; font-size: 11px;">${data.count}</td>
            <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #16a34a; font-size: 11px;">${formatCurrency(data.paid)}</td>
            <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: #ca8a04; font-size: 11px;">${data.pending > 0 ? formatCurrency(data.pending) : "—"}</td>
            <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; font-weight: bold; font-size: 11px;">${formatCurrency(data.amount)}</td>
            <td style="padding: 8px; border: 1px solid #dbeafe; text-align: right; color: ${color}; font-size: 11px;">${percentage}%</td>
          </tr>
        `;
      };

      const typeRows: string[] = [];
      if (exportOptions.showPaymentTypeBreakdown) {
        if (exportOptions.showRegularFeeSection && showRegularFee) {
          typeRows.push(
            buildTypeRow(
              "Regular Fee (Subscription)",
              regularFeeBreakdown,
              "#7c3aed",
            ),
          );
        }
        if (exportOptions.showInstallationFeeSection && showInstallationFee) {
          typeRows.push(
            buildTypeRow(
              "Installation Fee",
              installationFeeBreakdown,
              "#ea580c",
            ),
          );
        }
        if (exportOptions.showProRatedFeeSection && showProrateFee) {
          typeRows.push(
            buildTypeRow("Pro-rated Fee", proRatedFeeBreakdown, "#2563eb"),
          );
        }
        if (exportOptions.showOtherFeesSection && otherFeeBreakdown.count > 0) {
          typeRows.push(
            buildTypeRow("Other Fees", otherFeeBreakdown, "#6b7280"),
          );
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${exportOptions.title} - ${exportOptions.companyName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; padding: 0; color: #1e293b; line-height: 1.5; background: #ffffff; }
            .header-wrap { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%); color: white; padding: 40px 40px 30px 40px; text-align: center; position: relative; }
            .header-wrap::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #60a5fa, #93c5fd, #bfdbfe); }
            .header h1 { color: #ffffff; margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15); }
            .header .company { color: #dbeafe; font-size: 17px; font-weight: 500; margin-top: 8px; }
            .header .generated { color: #bfdbfe; font-size: 13px; margin-top: 6px; }
            .filters { background: rgba(255,255,255,0.15); padding: 14px 20px; border-radius: 10px; margin-top: 20px; font-size: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; border: 1px solid rgba(255,255,255,0.25); }
            .filters span { background: rgba(255,255,255,0.95); padding: 6px 14px; border-radius: 20px; border: 1px solid #bfdbfe; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #1e40af; }
            .content { padding: 30px 40px; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
            .summary-card { background: white; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(37,99,235,0.08); border-top: 4px solid #3b82f6; }
            .summary-card .label { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            .summary-card .value { font-size: 24px; font-weight: 700; margin-top: 8px; color: #0f172a; }
            .summary-card .value.green { color: #16a34a; }
            .summary-card .value.yellow { color: #ca8a04; }
            .summary-card .value.blue { color: #1e40af; }
            .summary-card .value.purple { color: #7c3aed; }
            .section-title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin: 32px 0 16px 0; padding: 12px 16px; background: linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%); border-left: 5px solid #2563eb; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(37,99,235,0.08); }
            th { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 12px 10px; border: 1px solid #1e40af; text-align: left; font-weight: 700; color: #ffffff; font-size: 10px; text-transform: uppercase; }
            td { padding: 10px 10px; border: 1px solid #dbeafe; color: #1e293b; }
            tr:nth-child(even) td { background: #f8fafc; }
            .grand-total-row { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); font-weight: 700; }
            .grand-total-row td { border-top: 2px solid #16a34a; font-size: 12px; color: #166534; background: transparent !important; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 2px solid #dbeafe; padding-top: 20px; }
            .page-break { page-break-before: always; }
            @media print { .no-print { display: none; } .content { padding: 20px; } .header-wrap { padding: 25px 20px; } table { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            <div class="header">
              <h1>📊 ${exportOptions.title}</h1>
              <p class="company">${exportOptions.companyName}</p>
              ${exportOptions.showGeneratedDate ? `<p class="generated">Generated on: ${dateStr}</p>` : ""}
              ${exportOptions.showFilters ? `<div class="filters"><span>🏢 ${buildingName}</span><span>📅 ${dateRangeStr}</span><span>🗓️ ${monthStr}</span><span>📌 ${statusStr}</span><span>📋 ${typeStr}</span></div>` : ""}
            </div>
          </div>
          <div class="content">
            ${
              exportOptions.showSummaryCards
                ? `<div class="summary-cards">
              ${exportOptions.showTotalCustomers ? `<div class="summary-card"><div class="label">Total Customers</div><div class="value blue">${reportStats.totalCustomers}</div></div>` : ""}
              ${exportOptions.showTotalTransactions ? `<div class="summary-card"><div class="label">Total Transactions</div><div class="value purple">${reportStats.totalTransactions}</div></div>` : ""}
              ${exportOptions.showTotalPaid ? `<div class="summary-card"><div class="label">Total Paid</div><div class="value green">${formatCurrency(reportStats.totalPaid)}</div></div>` : ""}
              ${exportOptions.showTotalPending ? `<div class="summary-card"><div class="label">Total Pending</div><div class="value yellow">${formatCurrency(reportStats.totalPending)}</div></div>` : ""}
              ${exportOptions.showTotalOverall ? `<div class="summary-card" style="grid-column: span 4; border-top-color: #1e40af;"><div class="label">🎯 Grand Total</div><div class="value blue" style="font-size: 28px;">${formatCurrency(reportStats.totalOverall)}</div></div>` : ""}
            </div>`
                : ""
            }
            ${exportOptions.showBillingPeriodBreakdown ? `<div class="section-title">📈 Billing Period Breakdown</div><table><thead><tr><th style="text-align: center; width: 40px;">#</th><th>Billing Period (Month)</th><th style="text-align: center;">Transactions</th><th style="text-align: right;">Paid Amount</th><th style="text-align: right;">Pending Amount</th><th style="text-align: right;">Total Amount</th></tr></thead><tbody>${billingRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No billing period data available</td></tr>'}<tr class="grand-total-row"><td colspan="2" style="text-align: right;">GRAND TOTAL</td><td style="text-align: center;">${reportStats.totalTransactions}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPaid)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPending)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalOverall)}</td></tr></tbody></table>` : ""}
            ${exportOptions.showBuildingBreakdown ? `<div class="section-title">🏢 Building Breakdown</div><table><thead><tr><th style="text-align: center; width: 40px;">#</th><th>Building Name</th><th style="text-align: center;">Customers</th><th style="text-align: center;">Transactions</th><th style="text-align: right;">Paid Amount</th><th style="text-align: right;">Pending Amount</th><th style="text-align: right;">Total Amount</th></tr></thead><tbody>${buildingRows || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No building data available</td></tr>'}<tr class="grand-total-row"><td colspan="2" style="text-align: right;">GRAND TOTAL</td><td style="text-align: center;">${reportStats.totalCustomers}</td><td style="text-align: center;">${reportStats.totalTransactions}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPaid)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPending)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalOverall)}</td></tr></tbody></table>` : ""}
            ${exportOptions.showPaymentTypeBreakdown && typeRows.length > 0 ? `<div class="section-title">💰 Payment Type Breakdown</div><table><thead><tr><th>Payment Type</th><th style="text-align: center;">Count</th><th style="text-align: right;">Paid Amount</th><th style="text-align: right;">Pending Amount</th><th style="text-align: right;">Total Amount</th><th style="text-align: right;">Percentage</th></tr></thead><tbody>${typeRows.join("")}<tr class="grand-total-row"><td style="text-align: right; font-weight: 700;">GRAND TOTAL</td><td style="text-align: center;">${reportStats.totalTransactions}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPaid)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPending)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalOverall)}</td><td style="text-align: right;">100%</td></tr></tbody></table>` : ""}
            ${exportOptions.showCustomerSummary ? `<div class="page-break"></div><div class="section-title">👥 Customer Summary</div><table><thead><tr><th style="text-align: center; width: 40px;">#</th><th>Customer Name</th><th>Application ID</th><th>Email</th><th>Building</th><th style="text-align: center;">Payments</th><th style="text-align: right;">Total Paid</th><th style="text-align: right;">Pending</th><th style="text-align: right;">Total Amount</th><th style="text-align: center;">Last Payment</th></tr></thead><tbody>${summaryRows}<tr class="grand-total-row"><td colspan="5" style="text-align: right;">GRAND TOTAL</td><td style="text-align: center;">${reportStats.totalTransactions}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPaid)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalPending)}</td><td style="text-align: right;">${formatCurrency(reportStats.totalOverall)}</td><td style="text-align: center;">—</td></tr></tbody></table>` : ""}
            ${exportOptions.showFooter ? `<div class="footer"><p>${exportOptions.footerText}</p><p style="margin-top: 8px;">All amounts are in Philippine Pesos (₱).</p><p style="margin-top: 4px;">© ${now.getFullYear()} ${exportOptions.companyName}. All rights reserved.</p></div>` : ""}
          </div>
          <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px;">
            <button onclick="window.print()" style="padding: 14px 48px; background: #1e3a8a; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(30,58,138,0.3);">🖨️ Print / Save as PDF</button>
          </div>
          <script>setTimeout(() => { window.print(); }, 800);</script>
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
    } else {
      const wb = XLSX.utils.book_new();

      const summaryData: any[][] = [];
      summaryData.push([exportOptions.title.toUpperCase()]);
      summaryData.push([exportOptions.companyName]);
      if (exportOptions.showGeneratedDate) {
        summaryData.push([`Generated on: ${dateStr}`]);
      }
      summaryData.push([]);

      if (exportOptions.showFilters) {
        summaryData.push([
          `Building: ${buildingName}  |  Date Range: ${dateRangeStr}  |  Month: ${monthStr}  |  Status: ${statusStr}  |  Payment Type: ${typeStr}`,
        ]);
        summaryData.push([]);
      }

      if (exportOptions.showSummaryCards) {
        summaryData.push(["SUMMARY"]);
        if (exportOptions.showTotalCustomers)
          summaryData.push(["Total Customers", reportStats.totalCustomers]);
        if (exportOptions.showTotalTransactions)
          summaryData.push([
            "Total Transactions",
            reportStats.totalTransactions,
          ]);
        if (exportOptions.showTotalPaid)
          summaryData.push([
            "Total Paid",
            formatCurrencyExcel(reportStats.totalPaid),
          ]);
        if (exportOptions.showTotalPending)
          summaryData.push([
            "Total Pending",
            formatCurrencyExcel(reportStats.totalPending),
          ]);
        if (exportOptions.showTotalOverall)
          summaryData.push([
            "Grand Total",
            formatCurrencyExcel(reportStats.totalOverall),
          ]);
        summaryData.push([]);
      }

      if (exportOptions.showBuildingBreakdown) {
        summaryData.push(["BUILDING BREAKDOWN"]);
        summaryData.push([
          "#",
          "Building Name",
          "Customers",
          "Transactions",
          "Paid Amount",
          "Pending Amount",
          "Total Amount",
        ]);
        sortedBuildingBreakdown.forEach(([building, data], i) => {
          summaryData.push([
            i + 1,
            building,
            data.customers,
            data.count,
            formatCurrencyExcel(data.paid),
            formatCurrencyExcel(data.pending),
            formatCurrencyExcel(data.paid + data.pending),
          ]);
        });
        summaryData.push([
          "GRAND TOTAL",
          "",
          reportStats.totalCustomers,
          reportStats.totalTransactions,
          formatCurrencyExcel(reportStats.totalPaid),
          formatCurrencyExcel(reportStats.totalPending),
          formatCurrencyExcel(reportStats.totalOverall),
        ]);
      }

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS["!cols"] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

      paymentsByMonth.forEach(([monthKey, entries]) => {
        const monthLabel = formatMonthLabel(monthKey);

        let monthTotalPaid = 0;
        let monthTotalPending = 0;
        let monthTotal = 0;

        entries.forEach(({ payment }) => {
          const amt = payment.amount || 0;
          monthTotal += amt;
          if (payment.status === "completed") monthTotalPaid += amt;
          if (payment.status === "pending") monthTotalPending += amt;
        });

        const monthData: any[][] = [];
        monthData.push([monthLabel]);
        monthData.push([
          `${exportOptions.companyName} — ${exportOptions.title}`,
        ]);
        monthData.push([]);
        monthData.push([
          "Month Total Paid",
          formatCurrencyExcel(monthTotalPaid),
        ]);
        monthData.push([
          "Month Total Pending",
          formatCurrencyExcel(monthTotalPending),
        ]);
        monthData.push(["Transactions", entries.length]);
        monthData.push(["Month Grand Total", formatCurrencyExcel(monthTotal)]);
        monthData.push([]);
        monthData.push([
          "#",
          "Customer Name",
          "Application ID",
          "Email",
          "Building",
          "Amount",
          "Status",
          "Payment Type",
          "Billing Period",
          "Reference #",
          "Payment Date",
        ]);

        entries.forEach(({ group, payment, billingPeriod }, i) => {
          const hasFree = payment.paymentDetails?.isFree === true;
          const resolvedType = resolvePaymentType(payment);
          const isInstallation = resolvedType === "installation";
          monthData.push([
            i + 1,
            `${group.customerInfo.name}${hasFree ? " (FREE)" : ""}`,
            group.customerInfo.applicationId,
            group.customerInfo.email,
            group.customerInfo.buildingName || "—",
            formatCurrencyExcel(payment.amount),
            payment.status === "completed" ? "Paid" : payment.status,
            getPaymentTypeLabel(resolvedType),
            isInstallation
              ? "—"
              : billingPeriod
                ? `${formatShortDate(billingPeriod.start)} - ${formatShortDate(billingPeriod.end)}`
                : "—",
            payment.referenceNumber || "—",
            formatShortDate(payment.createdAt),
          ]);
        });

        monthData.push([]);
        monthData.push([
          `MONTH TOTAL (${monthLabel})`,
          "",
          "",
          "",
          "",
          formatCurrencyExcel(monthTotal),
          "",
          "",
          "",
          "",
          "",
        ]);

        const monthWS = XLSX.utils.aoa_to_sheet(monthData);
        monthWS["!cols"] = [
          { wch: 5 },
          { wch: 25 },
          { wch: 18 },
          { wch: 30 },
          { wch: 25 },
          { wch: 15 },
          { wch: 12 },
          { wch: 18 },
          { wch: 25 },
          { wch: 20 },
          { wch: 15 },
        ];

        let sheetName = toSheetName(monthLabel);
        let counter = 1;
        while (wb.SheetNames.includes(sheetName)) {
          sheetName = toSheetName(`${monthLabel} (${counter++})`).substring(
            0,
            31,
          );
        }
        XLSX.utils.book_append_sheet(wb, monthWS, sheetName);
      });

      const fileName = `${exportOptions.title.replace(/\s+/g, "_")}_${now.toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    }

    setLoading(false);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiBarChart2 className="w-5 h-5 text-purple-600" />
            Payment Report
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive payment analytics and breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setExportFormat("excel");
              setShowExportModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm font-medium"
          >
            <FiDownload className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={() => {
              setExportFormat("pdf");
              setShowExportModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 shadow-sm font-medium"
          >
            <FiDownload className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">All Months</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-4 py-2.5 rounded-lg border transition flex items-center gap-2 text-sm font-medium ${
              showFilters
                ? "bg-purple-50 border-purple-300 text-purple-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiFilter className="w-4 h-4" />
            {showFilters ? "Less Filters" : "More Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                >
                  <FiX className="w-4 h-4" /> Reset Filters
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
        )}

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
                : "Try adjusting your filters."}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Customers</p>
              <p className="text-lg font-bold text-blue-600">
                {reportStats.totalCustomers}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiFileText className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="text-lg font-bold text-purple-600">
                {reportStats.totalTransactions}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(reportStats.totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pending</p>
              <p className="text-lg font-bold text-yellow-600">
                {formatCurrency(reportStats.totalPending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Period Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-purple-600" />
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiHome className="w-4 h-4 text-purple-600" />
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

      {/* Payment Type Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiPieChart className="w-4 h-4 text-purple-600" />
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
                          {getPaymentTypeLabel(type)}
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
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiSettings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Customize Export
                  </h2>
                  <p className="text-xs text-gray-500">
                    Choose what to include in your{" "}
                    {exportFormat === "pdf" ? "PDF" : "Excel"} report
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-2 rounded-full hover:bg-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Format */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExportFormat("pdf")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition flex items-center justify-center gap-2 font-medium ${
                      exportFormat === "pdf"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <FiFileText className="w-5 h-5" />
                    PDF Report
                  </button>
                  <button
                    onClick={() => setExportFormat("excel")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition flex items-center justify-center gap-2 font-medium ${
                      exportFormat === "excel"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <FiDownload className="w-5 h-5" />
                    Excel (Multi-Tab)
                  </button>
                </div>
              </div>

              {/* Header Info */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-purple-600" />
                  Header Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Report Title
                    </label>
                    <input
                      type="text"
                      value={exportOptions.title}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={exportOptions.companyName}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.showGeneratedDate}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          showGeneratedDate: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">
                      Show generated date
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.showFilters}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          showFilters: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">
                      Show active filters
                    </span>
                  </label>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiBarChart2 className="w-4 h-4 text-purple-600" />
                  Summary Cards
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "showSummaryCards", label: "Enable summary cards" },
                    { key: "showTotalCustomers", label: "Total customers" },
                    {
                      key: "showTotalTransactions",
                      label: "Total transactions",
                    },
                    { key: "showTotalPaid", label: "Total paid" },
                    { key: "showTotalPending", label: "Total pending" },
                    { key: "showTotalOverall", label: "Grand total" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={(exportOptions as any)[key]}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            [key]: e.target.checked,
                          })
                        }
                        disabled={
                          key !== "showSummaryCards" &&
                          !exportOptions.showSummaryCards
                        }
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Report Sections */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiPieChart className="w-4 h-4 text-purple-600" />
                  Report Sections
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      key: "showBillingPeriodBreakdown",
                      label: "Billing Period Breakdown",
                    },
                    {
                      key: "showBuildingBreakdown",
                      label: "Building Breakdown",
                    },
                    {
                      key: "showPaymentTypeBreakdown",
                      label: "Payment Type Breakdown",
                    },
                    {
                      key: "showCustomerSummary",
                      label: "Customer Summary Table",
                    },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={(exportOptions as any)[key]}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            [key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Type Sections */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiDollarSign className="w-4 h-4 text-purple-600" />
                  Payment Type Sections
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      key: "showRegularFeeSection",
                      label: "Regular Fee (Subscription)",
                    },
                    {
                      key: "showInstallationFeeSection",
                      label: "Installation Fee",
                    },
                    { key: "showProRatedFeeSection", label: "Pro-rated Fee" },
                    { key: "showOtherFeesSection", label: "Other Fees" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={(exportOptions as any)[key]}
                        onChange={(e) =>
                          setExportOptions({
                            ...exportOptions,
                            [key]: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiInfo className="w-4 h-4 text-purple-600" />
                  Footer
                </h3>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.showFooter}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        showFooter: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    Show footer text
                  </span>
                </label>
                {exportOptions.showFooter && (
                  <textarea
                    value={exportOptions.footerText}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        footerText: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    placeholder="Enter footer text..."
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setExportOptions(defaultExportOptions)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition flex items-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" /> Reset to Default
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleExport(exportFormat)}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg transition font-medium flex items-center gap-2 ${
                    exportFormat === "pdf"
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  } disabled:opacity-50`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FiDownload className="w-4 h-4" />
                      Export {exportFormat === "pdf" ? "PDF" : "Excel"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
