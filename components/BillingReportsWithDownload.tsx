"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FiX,
  FiDownload,
  FiSearch,
  FiHome,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiPrinter,
  FiFilter,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiCalendar,
  FiUsers,
  FiLoader,
} from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

// Dynamically import jspdf to avoid build issues
let jsPDF: any = null;
let autoTable: any = null;

// ============================================================================
// Types
// ============================================================================
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
}

interface Building {
  _id: string;
  buildingName: string;
  streetAddress: string;
  city: string;
  isActive: boolean;
}

interface BillingReportsWithDownloadProps {
  isOpen: boolean;
  onClose: () => void;
  customers: CustomerItem[];
  buildings: Building[];
  onMarkBillAsPaid: (bill: any, customer: CustomerItem) => void;
  onMarkInstallationBillAsPaid: (bill: any, customer: CustomerItem) => void;
}

// ============================================================================
// Helpers
// ============================================================================
function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}

function getBuildingName(customer: CustomerItem): string {
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

// ============================================================================
// Component
// ============================================================================
export default function BillingReportsWithDownload({
  isOpen,
  onClose,
  customers,
  buildings,
  onMarkBillAsPaid,
  onMarkInstallationBillAsPaid,
}: BillingReportsWithDownloadProps) {
  const [reportType, setReportType] = useState<
    "unpaid" | "overdue" | "all" | "byBuilding" | "installation"
  >("unpaid");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaidBills, setShowPaidBills] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "summary" | "details" | "buildings"
  >("details");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const loadPdfLibraries = async () => {
    if (!jsPDF) {
      try {
        const jspdfModule = await import("jspdf");
        const autoTableModule = await import("jspdf-autotable");
        jsPDF = jspdfModule.default;
        autoTable = autoTableModule.default;
      } catch (error) {
        console.error("Failed to load PDF libraries:", error);
        toast.error(
          "PDF libraries not installed. Run: npm install jspdf jspdf-autotable",
        );
      }
    }
  };

  const filteredData = useMemo(() => {
    let filtered = [...customers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          (c.applicationId && c.applicationId.toLowerCase().includes(term)),
      );
    }

    if (selectedBuilding !== "all") {
      filtered = filtered.filter(
        (c) =>
          c.building?._id === selectedBuilding ||
          getBuildingName(c) === selectedBuilding,
      );
    }

    if (customerTypeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === customerTypeFilter);
    }

    switch (reportType) {
      case "unpaid":
        filtered = filtered.filter((c) => c.currentBalance > 0);
        break;
      case "overdue":
        filtered = filtered.filter((c) => c.overdueBills.length > 0);
        break;
      case "installation":
        filtered = filtered.filter(
          (c) =>
            c.type === "application" &&
            (c.installationFee || 0) > 0 &&
            !c.installationFeePaid,
        );
        break;
      case "byBuilding":
        break;
      case "all":
      default:
        break;
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => {
        const bills = c.unpaidBills.filter((b) => {
          if (statusFilter === "overdue") return b.status === "overdue";
          if (statusFilter === "pending")
            return b.status === "pending" || b.status === "sent";
          if (statusFilter === "paid") return b.status === "paid";
          return true;
        });
        return bills.length > 0;
      });
    }

    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((c) => {
        return c.unpaidBills.some((bill) => {
          const dueDate = new Date(bill.dueDate);
          if (dateRange.start && dueDate < new Date(dateRange.start))
            return false;
          if (dateRange.end && dueDate > new Date(dateRange.end)) return false;
          return true;
        });
      });
    }

    filtered.sort((a, b) => b.currentBalance - a.currentBalance);
    return filtered;
  }, [
    customers,
    searchTerm,
    selectedBuilding,
    reportType,
    customerTypeFilter,
    statusFilter,
    dateRange,
  ]);

  const totals = useMemo(() => {
    const totalBalance = filteredData.reduce(
      (sum, c) => sum + c.currentBalance,
      0,
    );
    const totalUnpaidBills = filteredData.reduce(
      (sum, c) => sum + c.unpaidBills.length,
      0,
    );
    const totalOverdueBills = filteredData.reduce(
      (sum, c) => sum + c.overdueBills.length,
      0,
    );
    const totalInstallationFeesDue = filteredData
      .filter(
        (c) =>
          c.type === "application" &&
          !c.installationFeePaid &&
          (c.installationFee || 0) > 0,
      )
      .reduce((sum, c) => sum + (c.installationFee || 0), 0);

    const allUnpaidBills: any[] = [];
    filteredData.forEach((customer) => {
      const billsToShow = showPaidBills
        ? customer.unpaidBills
        : customer.unpaidBills.filter((b) => b.status !== "paid");

      billsToShow.forEach((bill) => {
        allUnpaidBills.push({
          ...bill,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          customerPhone: customer.phoneNumber,
          customerType: customer.type,
          building: getBuildingName(customer),
          unitNumber: customer.unitNumber || "-",
          floor: customer.floor || "-",
        });
      });
    });

    allUnpaidBills.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    return {
      totalCustomers: filteredData.length,
      totalBalance,
      totalUnpaidBills,
      totalOverdueBills,
      totalInstallationFeesDue,
      allUnpaidBills,
    };
  }, [filteredData, showPaidBills]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBuilding("all");
    setReportType("unpaid");
    setCustomerTypeFilter("all");
    setStatusFilter("all");
    setDateRange({ start: "", end: "" });
    setShowPaidBills(false);
  };

  const downloadCSV = () => {
    setLoading(true);
    try {
      const rows = [
        [
          "Customer",
          "Email",
          "Phone",
          "Type",
          "Building",
          "Unit",
          "Floor",
          "Plan",
          "Balance",
          "Unpaid Bills",
          "Overdue Bills",
          "Installation Fee",
          "Installation Paid",
          "Billing Status",
        ],
      ];

      filteredData.forEach((c) => {
        rows.push([
          `${c.firstName} ${c.lastName}`,
          c.email,
          c.phoneNumber,
          c.type,
          getBuildingName(c),
          c.unitNumber || "-",
          c.floor || "-",
          c.planName,
          c.currentBalance.toString(),
          c.unpaidBills.length.toString(),
          c.overdueBills.length.toString(),
          (c.type === "application" ? c.installationFee || 0 : 0).toString(),
          c.type === "application"
            ? c.installationFeePaid
              ? "Yes"
              : "No"
            : "N/A",
          c.billingCycle?.status || "Not Started",
        ]);
      });

      rows.push([]);
      rows.push(["===== SUMMARY ====="]);
      rows.push(["Total Customers", totals.totalCustomers.toString()]);
      rows.push(["Total Balance", formatCurrency(totals.totalBalance)]);
      rows.push(["Total Unpaid Bills", totals.totalUnpaidBills.toString()]);
      rows.push(["Total Overdue Bills", totals.totalOverdueBills.toString()]);
      rows.push([
        "Total Installation Fees Due",
        formatCurrency(totals.totalInstallationFeesDue),
      ]);
      rows.push(["Report Generated", new Date().toLocaleString()]);
      rows.push(["Report Type", reportType]);
      rows.push([
        "Building Filter",
        selectedBuilding === "all" ? "All Buildings" : selectedBuilding,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Billing Report");
      const fileName = `billing_report_${new Date().toISOString().split("T")[0]}.csv`;
      XLSX.writeFile(wb, fileName, { bookType: "csv" });
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download CSV");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    setLoading(true);
    try {
      const data = filteredData.map((c) => ({
        Customer: `${c.firstName} ${c.lastName}`,
        Email: c.email,
        Phone: c.phoneNumber,
        Type: c.type,
        Building: getBuildingName(c),
        Unit: c.unitNumber || "-",
        Floor: c.floor || "-",
        Plan: c.planName,
        "Plan Price": c.planPrice,
        Balance: c.currentBalance,
        "Unpaid Bills": c.unpaidBills.length,
        "Overdue Bills": c.overdueBills.length,
        "Installation Fee":
          c.type === "application" ? c.installationFee || 0 : 0,
        "Installation Paid":
          c.type === "application"
            ? c.installationFeePaid
              ? "Yes"
              : "No"
            : "N/A",
        "Billing Status": c.billingCycle?.status || "Not Started",
        "Application ID": c.applicationId || "-",
      }));

      const summaryData = [
        { Metric: "Report Generated", Value: new Date().toLocaleString() },
        { Metric: "Report Type", Value: reportType },
        {
          Metric: "Building Filter",
          Value:
            selectedBuilding === "all" ? "All Buildings" : selectedBuilding,
        },
        { Metric: "Total Customers", Value: totals.totalCustomers },
        { Metric: "Total Balance", Value: formatCurrency(totals.totalBalance) },
        { Metric: "Total Unpaid Bills", Value: totals.totalUnpaidBills },
        { Metric: "Total Overdue Bills", Value: totals.totalOverdueBills },
        {
          Metric: "Total Installation Fees Due",
          Value: formatCurrency(totals.totalInstallationFeesDue),
        },
        {
          Metric: "Average Balance per Customer",
          Value: formatCurrency(
            totals.totalBalance / (totals.totalCustomers || 1),
          ),
        },
      ];

      const ws1 = XLSX.utils.json_to_sheet(data);
      const ws2 = XLSX.utils.json_to_sheet(summaryData);

      ws1["!cols"] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Customers");
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");

      const fileName = `billing_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download Excel");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setLoading(true);
    try {
      await loadPdfLibraries();

      if (!jsPDF || !autoTable) {
        toast.error(
          "PDF libraries not available. Please install: npm install jspdf jspdf-autotable",
        );
        setLoading(false);
        return;
      }

      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Billing Report", pageWidth / 2, 15, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const reportTypeLabels: Record<string, string> = {
        all: "All Customers",
        unpaid: "Customers with Unpaid Bills",
        overdue: "Customers with Overdue Bills",
        byBuilding: "Customers by Building",
        installation: "Installation Fees Due",
      };
      doc.text(
        `Report Type: ${reportTypeLabels[reportType] || "All Customers"} | Generated: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        22,
        { align: "center" },
      );

      const summaryY = 30;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Total Customers: ${totals.totalCustomers}`, 14, summaryY);
      doc.text(
        `Total Balance: ${formatCurrency(totals.totalBalance)}`,
        14,
        summaryY + 6,
      );
      doc.text(
        `Total Unpaid Bills: ${totals.totalUnpaidBills}`,
        14,
        summaryY + 12,
      );
      doc.text(
        `Total Overdue Bills: ${totals.totalOverdueBills}`,
        14,
        summaryY + 18,
      );
      doc.text(
        `Total Installation Fees Due: ${formatCurrency(totals.totalInstallationFeesDue)}`,
        14,
        summaryY + 24,
      );

      if (selectedBuilding !== "all") {
        const buildingName =
          buildings.find((b) => b._id === selectedBuilding)?.buildingName ||
          selectedBuilding;
        doc.text(`Building Filter: ${buildingName}`, 120, summaryY);
      }

      const tableData = filteredData.map((c) => [
        `${c.firstName} ${c.lastName}`,
        c.email,
        c.phoneNumber,
        c.type,
        getBuildingName(c),
        c.planName,
        formatCurrency(c.currentBalance),
        c.unpaidBills.length.toString(),
        c.overdueBills.length.toString(),
        c.type === "application"
          ? c.installationFeePaid
            ? "Paid"
            : "Unpaid"
          : "N/A",
      ]);

      autoTable(doc, {
        head: [
          [
            "Customer",
            "Email",
            "Phone",
            "Type",
            "Building",
            "Plan",
            "Balance",
            "Unpaid",
            "Overdue",
            "Install Fee",
          ],
        ],
        body: tableData,
        startY: summaryY + 38,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontSize: 7,
        },
        alternateRowStyles: { fillColor: [240, 245, 248] },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            const footerText = `Page ${i} of ${pageCount} | Billing Report | Total Balance: ${formatCurrency(totals.totalBalance)} | Total Customers: ${totals.totalCustomers}`;
            doc.text(footerText, pageWidth / 2, pageHeight - 8, {
              align: "center",
            });
          }
        },
      });

      const fileName = `billing_report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download PDF");
    } finally {
      setLoading(false);
    }
  };

  const downloadDetailedBills = () => {
    setLoading(true);
    try {
      const billsData = totals.allUnpaidBills.map((bill) => ({
        "Invoice #": bill.invoiceNumber,
        Customer: bill.customerName,
        Email: bill.customerEmail,
        Phone: bill.customerPhone,
        "Customer Type": bill.customerType,
        Building: bill.building,
        Unit: bill.unitNumber,
        Floor: bill.floor,
        "Period Start": bill.billingPeriod?.start
          ? formatDateFixed(bill.billingPeriod.start)
          : "-",
        "Period End": bill.billingPeriod?.end
          ? formatDateFixed(bill.billingPeriod.end)
          : "-",
        "Due Date": formatDateFixed(bill.dueDate),
        Amount: bill.total,
        Status: bill.status,
        "Bill Type": bill.isInstallationBill
          ? "Installation"
          : bill.isProRated
            ? "Pro-rated"
            : "Monthly",
        "Days Overdue": Math.max(
          0,
          Math.floor(
            (new Date().getTime() - new Date(bill.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
        "Installation Fee": bill.installationFee || 0,
      }));

      const summaryData = [
        { Metric: "Report Generated", Value: new Date().toLocaleString() },
        { Metric: "Total Unpaid Bills", Value: totals.totalUnpaidBills },
        {
          Metric: "Total Amount Due",
          Value: formatCurrency(totals.totalBalance),
        },
        { Metric: "Total Overdue Bills", Value: totals.totalOverdueBills },
        {
          Metric: "Total Installation Fees Due",
          Value: formatCurrency(totals.totalInstallationFeesDue),
        },
        { Metric: "Customers with Unpaid Bills", Value: totals.totalCustomers },
        {
          Metric: "Average Bill Amount",
          Value: formatCurrency(
            totals.totalBalance / (totals.totalUnpaidBills || 1),
          ),
        },
      ];

      const ws1 = XLSX.utils.json_to_sheet(billsData);
      const ws2 = XLSX.utils.json_to_sheet(summaryData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Unpaid Bills");
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");

      const fileName = `unpaid_bills_detail_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download detailed bills");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const reportTypeLabels: Record<string, string> = {
    all: "All Customers",
    unpaid: "Unpaid Bills",
    overdue: "Overdue Bills",
    byBuilding: "By Building",
    installation: "Installation Fees",
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Billing Report
              </h2>
              <p className="text-xs text-gray-500">
                Financial analytics & unpaid bills report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "summary"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FiTrendingUp className="inline w-4 h-4 mr-2" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "details"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FiFileText className="inline w-4 h-4 mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("buildings")}
              className={`py-3 px-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === "buildings"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FiHome className="inline w-4 h-4 mr-2" />
              By Building
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`px-4 py-2.5 rounded-lg border transition flex items-center gap-2 text-sm font-medium ${
                showFilters
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiFilter className="w-4 h-4" />
              {showFilters ? "Less Filters" : "More Filters"}
            </button>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={downloadCSV}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-2.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 disabled:opacity-50 font-medium"
              >
                <FiDownload className="w-4 h-4" /> CSV
              </button>
              <button
                onClick={downloadExcel}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 disabled:opacity-50 font-medium"
              >
                <FiDownload className="w-4 h-4" /> Excel
              </button>
              <button
                onClick={downloadPDF}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50 font-medium"
              >
                <FiDownload className="w-4 h-4" /> PDF
              </button>
              <button
                onClick={downloadDetailedBills}
                disabled={loading || totals.allUnpaidBills.length === 0}
                className="px-3 py-2.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 disabled:opacity-50 font-medium"
              >
                <FiFileText className="w-4 h-4" /> Bills
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Customers</option>
                  <option value="unpaid">Unpaid Bills</option>
                  <option value="overdue">Overdue Bills</option>
                  <option value="byBuilding">By Building</option>
                  <option value="installation">Installation Fees</option>
                </select>

                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>

                <select
                  value={customerTypeFilter}
                  onChange={(e) => setCustomerTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Types</option>
                  <option value="user">Users</option>
                  <option value="application">Applications</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="overdue">Overdue</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                <label className="text-xs font-medium text-gray-600">
                  Date Range:
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <label className="flex items-center gap-2 text-sm ml-4">
                  <input
                    type="checkbox"
                    checked={showPaidBills}
                    onChange={(e) => setShowPaidBills(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Show paid bills
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 rounded-lg transition"
                >
                  <FiX className="w-4 h-4" /> Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiUsers className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Customers</p>
                <p className="text-lg font-bold text-blue-600">
                  {totals.totalCustomers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Balance</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(totals.totalBalance)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiAlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Unpaid Bills</p>
                <p className="text-lg font-bold text-orange-600">
                  {totals.totalUnpaidBills}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <FiBarChart2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Install Fees Due</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatCurrency(totals.totalInstallationFeesDue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FiLoader className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading report data...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "summary" && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 uppercase font-semibold">
                            Total Unpaid Bills
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {totals.totalUnpaidBills}
                          </p>
                        </div>
                        <FiFileText className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-red-600 uppercase font-semibold">
                            Total Amount Due
                          </p>
                          <p className="text-2xl font-bold text-red-900">
                            {formatCurrency(totals.totalBalance)}
                          </p>
                        </div>
                        <FiDollarSign className="w-8 h-8 text-red-400" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-orange-600 uppercase font-semibold">
                            Overdue Bills
                          </p>
                          <p className="text-2xl font-bold text-orange-900">
                            {totals.totalOverdueBills}
                          </p>
                        </div>
                        <FiAlertCircle className="w-8 h-8 text-orange-400" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 uppercase font-semibold">
                            Avg Bill Amount
                          </p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatCurrency(
                              totals.totalBalance /
                                (totals.totalUnpaidBills || 1),
                            )}
                          </p>
                        </div>
                        <FiBarChart2 className="w-8 h-8 text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Report Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Report Type:</span>{" "}
                        <span className="text-gray-900 font-medium">
                          {reportTypeLabels[reportType]}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Building Filter:</span>{" "}
                        <span className="text-gray-900 font-medium">
                          {selectedBuilding === "all"
                            ? "All Buildings"
                            : buildings.find((b) => b._id === selectedBuilding)
                                ?.buildingName || selectedBuilding}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Generated:</span>{" "}
                        <span className="text-gray-900">
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Customers:</span>{" "}
                        <span className="text-gray-900 font-medium">
                          {totals.totalCustomers}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          Total Installation Fees:
                        </span>{" "}
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(totals.totalInstallationFeesDue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Show Paid Bills:</span>{" "}
                        <span className="text-gray-900 font-medium">
                          {showPaidBills ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "details" && (
                <div ref={tableRef} className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Customer
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Building
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Plan
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Balance
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Unpaid
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Overdue
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Install Fee
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Status
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            No customers match the current filters
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((customer, idx) => {
                          const hasUnpaidInstallation =
                            customer.type === "application" &&
                            (customer.installationFee || 0) > 0 &&
                            !customer.installationFeePaid;

                          return (
                            <tr
                              key={`${customer.type}-${customer._id}`}
                              className={`hover:bg-emerald-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            >
                              <td className="px-3 py-3 text-xs text-gray-500">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {customer.firstName} {customer.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {customer.email}
                                  </p>
                                  {customer.applicationId && (
                                    <p className="text-[10px] text-gray-400 font-mono">
                                      {customer.applicationId}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <FiHome className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm">
                                    {getBuildingName(customer)}
                                  </span>
                                </div>
                                {customer.unitNumber && (
                                  <p className="text-xs text-gray-400">
                                    Unit {customer.unitNumber}
                                    {customer.floor &&
                                      `, Floor ${customer.floor}`}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-sm font-medium">
                                  {customer.planName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ₱{customer.planPrice.toLocaleString()}/mo
                                </p>
                              </td>
                              <td className="px-3 py-3 text-right font-bold">
                                <span
                                  className={
                                    customer.currentBalance > 1000
                                      ? "text-red-600"
                                      : customer.currentBalance > 0
                                        ? "text-orange-600"
                                        : "text-green-600"
                                  }
                                >
                                  {formatCurrency(customer.currentBalance)}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                  {customer.unpaidBills.length}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    customer.overdueBills.length > 0
                                      ? "bg-red-100 text-red-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {customer.overdueBills.length}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                {customer.type === "application" ? (
                                  <div>
                                    <p className="text-sm font-medium">
                                      {formatCurrency(
                                        customer.installationFee || 0,
                                      )}
                                    </p>
                                    <p
                                      className={`text-xs ${
                                        customer.installationFeePaid
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {customer.installationFeePaid
                                        ? "Paid"
                                        : "Unpaid"}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    hasUnpaidInstallation
                                      ? "bg-amber-100 text-amber-800"
                                      : customer.billingCycle?.status ===
                                          "active"
                                        ? "bg-green-100 text-green-800"
                                        : customer.billingCycle?.status ===
                                            "paused"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : customer.status === "suspended"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {hasUnpaidInstallation
                                    ? "Install Fee Due"
                                    : customer.billingCycle?.status === "active"
                                      ? "Active"
                                      : customer.billingCycle?.status ===
                                          "paused"
                                        ? "Paused"
                                        : customer.status === "suspended"
                                          ? "Suspended"
                                          : customer.billingCycle?.status ||
                                            "Inactive"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex gap-1 justify-center">
                                  {customer.type === "application" &&
                                    hasUnpaidInstallation && (
                                      <button
                                        onClick={() => {
                                          const bill =
                                            customer.unpaidBills.find(
                                              (b) => b.isInstallationBill,
                                            );
                                          if (bill)
                                            onMarkInstallationBillAsPaid(
                                              bill,
                                              customer,
                                            );
                                        }}
                                        className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                                      >
                                        Mark Paid
                                      </button>
                                    )}
                                  {customer.unpaidBills.some(
                                    (b) =>
                                      !b.isInstallationBill &&
                                      b.status !== "paid",
                                  ) && (
                                    <button
                                      onClick={() => {
                                        const bill = customer.unpaidBills.find(
                                          (b) =>
                                            !b.isInstallationBill &&
                                            b.status !== "paid",
                                        );
                                        if (bill)
                                          onMarkBillAsPaid(bill, customer);
                                      }}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredData.length > 0 && (
                      <tfoot className="bg-gray-100 sticky bottom-0">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-3 text-right font-semibold"
                          >
                            TOTALS:
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-red-600">
                            {formatCurrency(totals.totalBalance)}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-orange-600">
                            {totals.totalUnpaidBills}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-red-600">
                            {totals.totalOverdueBills}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-amber-600">
                            {formatCurrency(totals.totalInstallationFeesDue)}
                          </td>
                          <td
                            className="px-3 py-3 text-center font-semibold"
                            colSpan={2}
                          >
                            {totals.totalCustomers} customers
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {activeTab === "buildings" && (
                <div>
                  {(() => {
                    const buildingGroups = filteredData.reduce(
                      (acc: any, customer) => {
                        const buildingName = getBuildingName(customer);
                        if (!acc[buildingName]) {
                          acc[buildingName] = {
                            customers: [],
                            totalBalance: 0,
                            totalUnpaid: 0,
                            totalOverdue: 0,
                          };
                        }
                        acc[buildingName].customers.push(customer);
                        acc[buildingName].totalBalance +=
                          customer.currentBalance;
                        acc[buildingName].totalUnpaid +=
                          customer.unpaidBills.length;
                        acc[buildingName].totalOverdue +=
                          customer.overdueBills.length;
                        return acc;
                      },
                      {},
                    );

                    const sortedBuildings = Object.entries(buildingGroups).sort(
                      (a: any, b: any) => b[1].totalBalance - a[1].totalBalance,
                    );

                    if (sortedBuildings.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          No customers found in any building
                        </div>
                      );
                    }

                    return sortedBuildings.map(
                      ([buildingName, data]: [string, any]) => (
                        <div key={buildingName} className="mb-6">
                          <div className="bg-gray-100 rounded-t-lg p-3 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <FiHome className="w-4 h-4" />
                              {buildingName}
                            </h3>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-600">
                                Customers:{" "}
                                <span className="font-bold">
                                  {data.customers.length}
                                </span>
                              </span>
                              <span className="text-red-600">
                                Balance:{" "}
                                <span className="font-bold">
                                  {formatCurrency(data.totalBalance)}
                                </span>
                              </span>
                              <span className="text-orange-600">
                                Unpaid:{" "}
                                <span className="font-bold">
                                  {data.totalUnpaid}
                                </span>
                              </span>
                              <span className="text-red-600">
                                Overdue:{" "}
                                <span className="font-bold">
                                  {data.totalOverdue}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="overflow-x-auto border border-gray-200 rounded-b-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Customer
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    Plan
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                    Balance
                                  </th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                    Unpaid
                                  </th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                    Overdue
                                  </th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.customers.map(
                                  (customer: CustomerItem, idx: number) => (
                                    <tr
                                      key={customer._id}
                                      className={
                                        idx % 2 === 0
                                          ? "bg-white"
                                          : "bg-gray-50"
                                      }
                                    >
                                      <td className="px-3 py-2">
                                        <p className="font-medium">
                                          {customer.firstName}{" "}
                                          {customer.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {customer.email}
                                        </p>
                                      </td>
                                      <td className="px-3 py-2 text-sm">
                                        {customer.planName}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-red-600">
                                        {formatCurrency(
                                          customer.currentBalance,
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                          {customer.unpaidBills.length}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span
                                          className={`px-2 py-0.5 text-xs rounded-full ${customer.overdueBills.length > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
                                        >
                                          {customer.overdueBills.length}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span
                                          className={`px-2 py-0.5 text-xs rounded-full ${customer.billingCycle?.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                                        >
                                          {customer.billingCycle?.status ||
                                            "Inactive"}
                                        </span>
                                      </td>
                                    </tr>
                                  ),
                                )}
                                <tr className="bg-gray-100 font-semibold">
                                  <td className="px-3 py-2" colSpan={2}>
                                    BUILDING TOTALS
                                  </td>
                                  <td className="px-3 py-2 text-right text-red-600">
                                    {formatCurrency(data.totalBalance)}
                                  </td>
                                  <td className="px-3 py-2 text-center text-orange-600">
                                    {data.totalUnpaid}
                                  </td>
                                  <td className="px-3 py-2 text-center text-red-600">
                                    {data.totalOverdue}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {data.customers.length} customers
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ),
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 flex justify-between items-center rounded-b-2xl">
          <div className="text-xs text-gray-500">
            Showing {filteredData.length} of {customers.length} customers
            {totals.totalBalance > 0 && (
              <span className="ml-2">
                | Total Balance:{" "}
                <span className="font-bold text-red-600">
                  {formatCurrency(totals.totalBalance)}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">
              Unpaid:{" "}
              <span className="font-bold text-orange-600">
                {totals.totalUnpaidBills}
              </span>
            </span>
            <span className="text-gray-500">
              Overdue:{" "}
              <span className="font-bold text-red-600">
                {totals.totalOverdueBills}
              </span>
            </span>
            <span className="text-gray-500">
              Install Fees:{" "}
              <span className="font-bold text-amber-600">
                {formatCurrency(totals.totalInstallationFeesDue)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
