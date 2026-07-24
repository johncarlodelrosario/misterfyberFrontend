"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FiX,
  FiDownload,
  FiSearch,
  FiHome,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiMail,
  FiPrinter,
  FiFilter,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiCalendar,
} from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

// Dynamically import jspdf to avoid build issues
let jsPDF: any = null;
let autoTable: any = null;

// ==================== TYPES ====================
// This matches the CustomerItem type from the main page exactly
interface CustomerItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phoneNumber: string;
  status: string; // Made required to match main page
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

// ==================== HELPERS ====================
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

// ==================== MAIN COMPONENT ====================
export default function BillingReportsWithDownload({
  isOpen,
  onClose,
  customers,
  buildings,
  onMarkBillAsPaid,
  onMarkInstallationBillAsPaid,
}: BillingReportsWithDownloadProps) {
  // ==================== STATE ====================
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

  // ==================== LOAD PDF LIBRARIES DYNAMICALLY ====================
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

  // ==================== FILTERED DATA ====================
  const filteredData = useMemo(() => {
    let filtered = [...customers];

    // Search filter
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

    // Building filter
    if (selectedBuilding !== "all") {
      filtered = filtered.filter(
        (c) =>
          c.building?._id === selectedBuilding ||
          getBuildingName(c) === selectedBuilding,
      );
    }

    // Customer type filter
    if (customerTypeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === customerTypeFilter);
    }

    // Report type filter
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
        // Already filtered by building
        break;
      case "all":
      default:
        break;
    }

    // Status filter (on bills)
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

    // Date range filter (on bills due date)
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

    // Sort by balance (highest first)
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

  // ==================== CALCULATE TOTALS ====================
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

    // Get all unpaid bills for detailed view
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

    // Sort bills by due date (oldest first)
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

  // ==================== RESET FILTERS ====================
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedBuilding("all");
    setReportType("unpaid");
    setCustomerTypeFilter("all");
    setStatusFilter("all");
    setDateRange({ start: "", end: "" });
    setShowPaidBills(false);
  };

  // ==================== DOWNLOAD FUNCTIONS ====================

  // Download as CSV
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

      // Add summary rows with totals
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
      toast.success(`✅ Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download CSV");
    } finally {
      setLoading(false);
    }
  };

  // Download as Excel (XLSX) with totals
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

      // Add summary sheet with totals
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

      // Set column widths for main sheet
      const colWidths = [
        { wch: 25 }, // Customer
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 12 }, // Type
        { wch: 20 }, // Building
        { wch: 10 }, // Unit
        { wch: 10 }, // Floor
        { wch: 20 }, // Plan
        { wch: 12 }, // Plan Price
        { wch: 15 }, // Balance
        { wch: 12 }, // Unpaid Bills
        { wch: 12 }, // Overdue Bills
        { wch: 18 }, // Installation Fee
        { wch: 18 }, // Installation Paid
        { wch: 18 }, // Billing Status
        { wch: 30 }, // Application ID
      ];
      ws1["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Customers");
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");

      const fileName = `billing_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`✅ Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download Excel");
    } finally {
      setLoading(false);
    }
  };

  // Download as PDF with totals (with dynamic import)
  const downloadPDF = async () => {
    setLoading(true);
    try {
      // Load PDF libraries
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

      // Title
      doc.setFontSize(18);
      doc.setTextColor(44, 62, 80);
      doc.text("Billing Report", pageWidth / 2, 15, { align: "center" });

      // Subtitle
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

      // Summary with totals
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
      doc.text(
        `Average Balance: ${formatCurrency(totals.totalBalance / (totals.totalCustomers || 1))}`,
        14,
        summaryY + 30,
      );

      // Building filter info
      if (selectedBuilding !== "all") {
        const buildingName =
          buildings.find((b) => b._id === selectedBuilding)?.buildingName ||
          selectedBuilding;
        doc.text(`Building Filter: ${buildingName}`, 120, summaryY);
      }

      // Customer table
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
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 },
          9: { cellWidth: 25 },
        },
        didDrawPage: (data: any) => {
          // Footer with totals
          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            const footerText = `Page ${i} of ${pageCount} | MisterFyber Billing Report | Total Balance: ${formatCurrency(totals.totalBalance)} | Total Customers: ${totals.totalCustomers}`;
            doc.text(footerText, pageWidth / 2, pageHeight - 8, {
              align: "center",
            });
          }
        },
      });

      const fileName = `billing_report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success(`✅ Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        "Failed to download PDF. Please install: npm install jspdf jspdf-autotable",
      );
    } finally {
      setLoading(false);
    }
  };

  // Download detailed bills report (shows each unpaid bill with totals)
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

      // Add summary with totals
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

      // Set column widths
      const colWidths = [
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
      ];
      ws1["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Unpaid Bills");
      XLSX.utils.book_append_sheet(wb, ws2, "Summary");

      const fileName = `unpaid_bills_detail_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`✅ Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download detailed bills");
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER ====================
  if (!isOpen) return null;

  const reportTypeLabels: Record<string, string> = {
    all: "All Customers",
    unpaid: "Unpaid Bills",
    overdue: "Overdue Bills",
    byBuilding: "By Building",
    installation: "Installation Fees",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Billing Reports
              </h2>
              <p className="text-xs text-gray-500">
                Financial Analytics & Unpaid Bills Report
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
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
                  ? "border-blue-500 text-blue-600"
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
                  ? "border-blue-500 text-blue-600"
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
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FiHome className="inline w-4 h-4 mr-2" />
              By Building
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Report Type */}
            <div className="flex gap-1 bg-white rounded-lg border p-1">
              {(
                [
                  "all",
                  "unpaid",
                  "overdue",
                  "byBuilding",
                  "installation",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    reportType === type
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {type === "all" && "All"}
                  {type === "unpaid" && "Unpaid"}
                  {type === "overdue" && "Overdue"}
                  {type === "byBuilding" && "By Building"}
                  {type === "installation" && "Install Fees"}
                </button>
              ))}
            </div>

            {/* Building Filter */}
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white"
            >
              <option value="all">🏢 All Buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  🏢 {b.buildingName}
                </option>
              ))}
            </select>

            {/* Customer Type Filter */}
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white"
            >
              <option value="all">All Types</option>
              <option value="user">Users</option>
              <option value="application">Applications</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-white"
              />
            </div>

            {/* Show Paid Bills Toggle */}
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showPaidBills}
                onChange={(e) => setShowPaidBills(e.target.checked)}
                className="rounded"
              />
              Show paid bills
            </label>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
            >
              Reset
            </button>

            {/* Download Buttons */}
            <div className="flex gap-1 ml-auto">
              <button
                onClick={downloadCSV}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiDownload className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={downloadExcel}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiDownload className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={downloadPDF}
                disabled={loading || filteredData.length === 0}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiDownload className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={downloadDetailedBills}
                disabled={loading || totals.allUnpaidBills.length === 0}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiFileText className="w-3.5 h-3.5" /> Detailed Bills
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500">Customers</p>
            <p className="text-lg font-bold text-blue-600">
              {totals.totalCustomers}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500">Total Balance</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totals.totalBalance)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500">Unpaid Bills</p>
            <p className="text-lg font-bold text-orange-600">
              {totals.totalUnpaidBills}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500">Install Fees Due</p>
            <p className="text-lg font-bold text-amber-600">
              {formatCurrency(totals.totalInstallationFeesDue)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Building
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Unpaid
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Overdue
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Install Fee
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                              className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            >
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2">
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
                              <td className="px-3 py-2">
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
                              <td className="px-3 py-2">
                                <p className="text-sm font-medium">
                                  {customer.planName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ₱{customer.planPrice.toLocaleString()}/mo
                                </p>
                              </td>
                              <td className="px-3 py-2 text-right font-bold">
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
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                  {customer.unpaidBills.length}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
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
                              <td className="px-3 py-2 text-right">
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
                              <td className="px-3 py-2 text-center">
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
                              <td className="px-3 py-2 text-center">
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
                                        className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
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
                                      className="px-2 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
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
                    {/* Footer with totals */}
                    {filteredData.length > 0 && (
                      <tfoot className="bg-gray-100 sticky bottom-0">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-2 text-right font-semibold"
                          >
                            TOTALS:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">
                            {formatCurrency(totals.totalBalance)}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-orange-600">
                            {totals.totalUnpaidBills}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-red-600">
                            {totals.totalOverdueBills}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-600">
                            {formatCurrency(totals.totalInstallationFeesDue)}
                          </td>
                          <td
                            className="px-3 py-2 text-center font-semibold"
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
                    // Group customers by building
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

                    // Sort buildings by total balance
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
                                {/* Building totals row */}
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

        {/* Records count */}
        <div className="p-3 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
          <div className="text-xs text-gray-500">
            Showing {filteredData.length} of {customers.length} customers
            {selectedBuilding !== "all" && (
              <span className="ml-2">
                | Building:{" "}
                {
                  buildings.find((b) => b._id === selectedBuilding)
                    ?.buildingName
                }
              </span>
            )}
            {searchTerm && (
              <span className="ml-2">| Search: "{searchTerm}"</span>
            )}
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
