"use client";

import { useState, useEffect } from "react";
import {
  FiX,
  FiDownload,
  FiCalendar,
  FiFilter,
  FiPrinter,
  FiFileText,
  FiHome,
  FiUser,
  FiDollarSign,
  FiTrendingUp,
  FiAlertCircle,
  FiBarChart2,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { getUnpaidBillsReport } from "@/services/billing";

interface ReportData {
  bills: any[];
  summary: {
    totalUnpaidBills: number;
    totalAmountDue: number;
    totalInstallationFeesDue: number;
    byStatus: {
      overdue: number;
      pending: number;
    };
    byBuilding?: Record<string, any>;
    byCustomer?: Record<string, any>;
  };
  generatedAt: string;
}

interface FilterOptions {
  buildingId: string;
  dateRange: {
    start: string;
    end: string;
  };
  periodType: "daily" | "weekly" | "monthly" | "all";
  status: "all" | "unpaid" | "overdue" | "pending";
  customerType: "all" | "user" | "application";
  minAmount: number;
  maxAmount: number;
}

interface BillingReportsWithDownloadProps {
  isOpen: boolean;
  onClose: () => void;
  customers?: any[];
  buildings?: any[];
  onMarkBillAsPaid?: (bill: any, customer: any) => void;
  onMarkInstallationBillAsPaid?: (bill: any, customer: any) => void;
}

const BillingReportsLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
        <FiDollarSign className="w-5 h-5 text-white" />
      </div>
    </div>
    <div>
      <h3 className="text-lg font-bold text-gray-900">Billing Reports</h3>
      <p className="text-xs text-gray-500">Financial Analytics & Reports</p>
    </div>
  </div>
);

export default function BillingReportsWithDownload({
  isOpen,
  onClose,
  customers = [],
  buildings = [],
  onMarkBillAsPaid,
  onMarkInstallationBillAsPaid,
}: BillingReportsWithDownloadProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filteredBills, setFilteredBills] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    buildingId: "",
    dateRange: {
      start: "",
      end: "",
    },
    periodType: "all",
    status: "all",
    customerType: "all",
    minAmount: 0,
    maxAmount: 100000,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "summary" | "details" | "buildings"
  >("details");

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen]);

  useEffect(() => {
    if (reportData) {
      applyFilters();
    }
  }, [filters, reportData]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getUnpaidBillsReport({ includePaid: false });
      if (result.success) {
        const enhancedBills = (result.data.bills || []).map((bill: any) => {
          const customer = customers.find(
            (c) =>
              c.applicationId === bill.applicationId ||
              c._id === bill.userId?._id,
          );
          return {
            ...bill,
            building: customer?.building || null,
            buildingName: customer?.building?.buildingName || "Unknown",
            customerName: customer
              ? `${customer.firstName} ${customer.lastName}`
              : bill.applicationData?.firstName +
                " " +
                bill.applicationData?.lastName,
            customerEmail: customer?.email || bill.applicationData?.email,
            unitNumber: customer?.unitNumber,
            floor: customer?.floor,
          };
        });

        const byBuilding: Record<string, any> = {};
        enhancedBills.forEach((bill: any) => {
          const buildingName = bill.buildingName || "Unknown";
          if (!byBuilding[buildingName]) {
            byBuilding[buildingName] = {
              count: 0,
              totalAmount: 0,
              bills: [],
            };
          }
          byBuilding[buildingName].count++;
          byBuilding[buildingName].totalAmount += bill.total;
          byBuilding[buildingName].bills.push(bill);
        });

        setReportData({
          bills: enhancedBills,
          summary: {
            ...result.data.summary,
            byBuilding,
          },
          generatedAt: new Date().toISOString(),
        });
        setFilteredBills(enhancedBills);
      } else {
        toast.error("Failed to load report");
      }
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Failed to load billing reports");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!reportData) return;

    let filtered = [...reportData.bills];

    if (filters.buildingId) {
      filtered = filtered.filter(
        (bill) =>
          bill.building?._id === filters.buildingId ||
          bill.buildingName === filters.buildingId,
      );
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(
        (bill) => new Date(bill.dueDate) >= new Date(filters.dateRange.start),
      );
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(
        (bill) => new Date(bill.dueDate) <= new Date(filters.dateRange.end),
      );
    }

    if (filters.periodType !== "all") {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter((bill) => {
        const dueDate = new Date(bill.dueDate);
        if (filters.periodType === "daily") {
          return dueDate >= startOfDay;
        } else if (filters.periodType === "weekly") {
          return dueDate >= startOfWeek;
        } else if (filters.periodType === "monthly") {
          return dueDate >= startOfMonth;
        }
        return true;
      });
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((bill) => bill.status === filters.status);
    }

    if (filters.customerType !== "all") {
      filtered = filtered.filter((bill) => {
        if (filters.customerType === "user") {
          return bill.userId && !bill.applicationId;
        } else {
          return bill.applicationId && !bill.userId;
        }
      });
    }

    filtered = filtered.filter(
      (bill) =>
        bill.total >= filters.minAmount && bill.total <= filters.maxAmount,
    );

    setFilteredBills(filtered);
  };

  const resetFilters = () => {
    setFilters({
      buildingId: "",
      dateRange: { start: "", end: "" },
      periodType: "all",
      status: "all",
      customerType: "all",
      minAmount: 0,
      maxAmount: 100000,
    });
    if (reportData) {
      setFilteredBills(reportData.bills);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "Invoice Number",
      "Customer Name",
      "Customer Email",
      "Building",
      "Unit/Floor",
      "Period Start",
      "Period End",
      "Due Date",
      "Amount (₱)",
      "Installation Fee (₱)",
      "Status",
      "Type",
      "Days Overdue",
    ];

    const rows = filteredBills.map((bill) => {
      const periodStart = bill.billingPeriod?.start
        ? new Date(bill.billingPeriod.start).toLocaleDateString()
        : "-";
      const periodEnd = bill.billingPeriod?.end
        ? new Date(bill.billingPeriod.end).toLocaleDateString()
        : "-";
      const dueDate = new Date(bill.dueDate).toLocaleDateString();
      const daysOverdue =
        bill.status === "overdue"
          ? Math.max(
              0,
              Math.floor(
                (new Date().getTime() - new Date(bill.dueDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

      return [
        bill.invoiceNumber,
        bill.customerName || "-",
        bill.customerEmail || "-",
        bill.buildingName || "-",
        `${bill.unitNumber || ""} ${bill.floor ? `Fl. ${bill.floor}` : ""}`.trim() ||
          "-",
        periodStart,
        periodEnd,
        dueDate,
        bill.total.toFixed(2),
        (bill.installationFee || 0).toFixed(2),
        bill.status.toUpperCase(),
        bill.isInstallationBill
          ? "Installation"
          : bill.isProRated
            ? "Pro-rated"
            : "Monthly",
        daysOverdue,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      "download",
      `billing_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully!");
  };

  const downloadJSON = () => {
    const exportData = {
      generatedAt: reportData?.generatedAt,
      filters: filters,
      summary: {
        totalBills: filteredBills.length,
        totalAmount: filteredBills.reduce((sum, b) => sum + b.total, 0),
        totalInstallationFees: filteredBills.reduce(
          (sum, b) => sum + (b.installationFee || 0),
          0,
        ),
        byStatus: {
          overdue: filteredBills.filter((b) => b.status === "overdue").length,
          pending: filteredBills.filter((b) => b.status === "pending").length,
        },
      },
      bills: filteredBills.map((bill) => ({
        invoiceNumber: bill.invoiceNumber,
        customer: bill.customerName,
        email: bill.customerEmail,
        building: bill.buildingName,
        amount: bill.total,
        installationFee: bill.installationFee,
        status: bill.status,
        dueDate: bill.dueDate,
        billingPeriod: bill.billingPeriod,
      })),
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      "download",
      `billing_report_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("JSON report downloaded successfully!");
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the report");
      return;
    }

    const totalAmount = filteredBills.reduce((sum, b) => sum + b.total, 0);
    const overdueCount = filteredBills.filter(
      (b) => b.status === "overdue",
    ).length;

    const buildingStats = filteredBills.reduce((acc: any, bill) => {
      const building = bill.buildingName || "Unknown";
      if (!acc[building]) {
        acc[building] = { count: 0, amount: 0 };
      }
      acc[building].count++;
      acc[building].amount += bill.total;
      return acc;
    }, {});

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Billing Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .logo { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 10px; }
          .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
          .logo-icon svg { width: 24px; height: 24px; fill: white; }
          h1 { margin: 0; color: #1e3a8a; }
          .subtitle { color: #666; font-size: 14px; }
          .summary { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
          .summary-card { flex: 1; background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #666; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .summary-card .value.red { color: #dc2626; }
          .summary-card .value.green { color: #10b981; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M3 6H21V8H3V6ZM3 10H21V12H3V10ZM3 14H21V16H3V14ZM3 18H21V20H3V18Z"/>
                <path d="M7 4H9V20H7V4Z"/>
                <path d="M15 4H17V20H15V4Z"/>
                <rect x="11" y="4" width="2" height="20"/>
              </svg>
            </div>
            <h1>Billing Reports</h1>
          </div>
          <div class="subtitle">Financial Analytics & Unpaid Bills Report</div>
          <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Unpaid Bills</h3>
            <div class="value">${filteredBills.length}</div>
          </div>
          <div class="summary-card">
            <h3>Total Amount Due</h3>
            <div class="value red">₱${totalAmount.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>Overdue Bills</h3>
            <div class="value red">${overdueCount}</div>
          </div>
          <div class="summary-card">
            <h3>Avg. Bill Amount</h3>
            <div class="value green">₱${(totalAmount / (filteredBills.length || 1)).toLocaleString()}</div>
          </div>
        </div>

        <h3>Building Summary</h3>
        <table>
          <thead><tr><th>Building</th><th>Unpaid Bills</th><th>Total Amount</th></tr></thead>
          <tbody>
            ${Object.entries(buildingStats)
              .map(
                ([building, stats]: [string, any]) => `
              <tr>
                <td>${building}</td>
                <td>${stats.count}</td>
                <td>₱${stats.amount.toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <h3>Detailed Bills</h3>
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Building</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${filteredBills
              .map(
                (bill) => `
              <tr>
                <td>${bill.invoiceNumber}</td>
                <td>${bill.customerName || "-"}</td>
                <td>${bill.buildingName || "-"}</td>
                <td>${new Date(bill.dueDate).toLocaleDateString()}</td>
                <td>₱${bill.total.toLocaleString()}</td>
                <td>${bill.status.toUpperCase()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>This report is automatically generated by the Billing Management System.</p>
        </div>

        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  const summaryStats = {
    totalBills: filteredBills.length,
    totalAmount: filteredBills.reduce((sum, b) => sum + b.total, 0),
    totalInstallationFees: filteredBills.reduce(
      (sum, b) => sum + (b.installationFee || 0),
      0,
    ),
    overdueCount: filteredBills.filter((b) => b.status === "overdue").length,
    pendingCount: filteredBills.filter((b) => b.status === "pending").length,
    avgAmount:
      filteredBills.length > 0
        ? filteredBills.reduce((sum, b) => sum + b.total, 0) /
          filteredBills.length
        : 0,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <BillingReportsLogo />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

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

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <FiFilter className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Building
                </label>
                <select
                  value={filters.buildingId}
                  onChange={(e) =>
                    setFilters({ ...filters, buildingId: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Period Type
                </label>
                <select
                  value={filters.periodType}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      periodType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="all">All Time</option>
                  <option value="daily">Today</option>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as any })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="overdue">Overdue</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Customer Type
                </label>
                <select
                  value={filters.customerType}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      customerType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="all">All Customers</option>
                  <option value="user">Users</option>
                  <option value="application">Applications</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min Amount (₱)
                </label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Amount (₱)
                </label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxAmount: parseInt(e.target.value) || 100000,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-white border-b border-gray-200 flex gap-2">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            <FiDownload className="w-4 h-4" /> Download CSV
          </button>
          <button
            onClick={downloadJSON}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <FiDownload className="w-4 h-4" /> Download JSON
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            <FiPrinter className="w-4 h-4" /> Print / PDF
          </button>
        </div>

        <div className="p-6">
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
                            {summaryStats.totalBills}
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
                            ₱{summaryStats.totalAmount.toLocaleString()}
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
                            {summaryStats.overdueCount}
                          </p>
                        </div>
                        <FiAlertCircle className="w-8 h-8 text-orange-400" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 uppercase font-semibold">
                            Average Bill
                          </p>
                          <p className="text-2xl font-bold text-green-900">
                            ₱{summaryStats.avgAmount.toLocaleString()}
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
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Generated:</span>{" "}
                        <span className="text-gray-900">
                          {new Date(
                            reportData?.generatedAt || "",
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Filters Applied:</span>{" "}
                        <span className="text-gray-900">
                          {filters.buildingId ? "Building, " : ""}
                          {filters.periodType !== "all" ? "Period, " : ""}
                          {filters.status !== "all" ? "Status, " : ""}
                          {filters.customerType !== "all"
                            ? "Customer Type"
                            : ""}
                          {!filters.buildingId &&
                            filters.periodType === "all" &&
                            filters.status === "all" &&
                            filters.customerType === "all" &&
                            "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          Total Installation Fees:
                        </span>{" "}
                        <span className="text-gray-900">
                          ₱{summaryStats.totalInstallationFees.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pending Bills:</span>{" "}
                        <span className="text-gray-900">
                          {summaryStats.pendingCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "details" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Building
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit/Floor
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period Start
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period End
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Installation Fee
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Overdue
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBills.length === 0 ? (
                        <tr>
                          <td
                            colSpan={13}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            No bills found with the current filters
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map((bill) => {
                          const periodStart = bill.billingPeriod?.start
                            ? new Date(
                                bill.billingPeriod.start,
                              ).toLocaleDateString()
                            : "-";
                          const periodEnd = bill.billingPeriod?.end
                            ? new Date(
                                bill.billingPeriod.end,
                              ).toLocaleDateString()
                            : "-";
                          const daysOverdue =
                            bill.status === "overdue"
                              ? Math.max(
                                  0,
                                  Math.floor(
                                    (new Date().getTime() -
                                      new Date(bill.dueDate).getTime()) /
                                      (1000 * 60 * 60 * 24),
                                  ),
                                )
                              : 0;

                          return (
                            <tr key={bill._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-xs">
                                {bill.invoiceNumber}
                              </td>
                              <td className="px-3 py-2">
                                <p className="text-sm font-medium">
                                  {bill.customerName || "-"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {bill.customerEmail || "-"}
                                </p>
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {bill.buildingName || "-"}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {`${bill.unitNumber || ""} ${bill.floor ? `Fl. ${bill.floor}` : ""}`.trim() ||
                                  "-"}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {periodStart}
                              </td>
                              <td className="px-3 py-2 text-xs">{periodEnd}</td>
                              <td className="px-3 py-2 text-xs">
                                {new Date(bill.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-xs font-medium text-red-600">
                                ₱{bill.total.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                ₱{(bill.installationFee || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full ${
                                    bill.status === "overdue"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {bill.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {bill.isInstallationBill
                                  ? "Installation"
                                  : bill.isProRated
                                    ? "Pro-rated"
                                    : "Monthly"}
                              </td>
                              <td className="px-3 py-2 text-xs font-medium">
                                {daysOverdue > 0 ? `${daysOverdue} days` : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {bill.isInstallationBill &&
                                  !bill.installationFeePaid &&
                                  onMarkInstallationBillAsPaid && (
                                    <button
                                      onClick={() => {
                                        const customer = customers.find(
                                          (c) =>
                                            c.applicationId ===
                                            bill.applicationId,
                                        );
                                        if (customer)
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
                                {!bill.isInstallationBill &&
                                  bill.status !== "paid" &&
                                  onMarkBillAsPaid && (
                                    <button
                                      onClick={() => {
                                        const customer = customers.find(
                                          (c) =>
                                            c.applicationId ===
                                              bill.applicationId ||
                                            c._id === bill.userId?._id,
                                        );
                                        if (customer)
                                          onMarkBillAsPaid(bill, customer);
                                      }}
                                      className="px-2 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "buildings" && reportData?.summary.byBuilding && (
                <div>
                  {Object.entries(reportData.summary.byBuilding).map(
                    ([buildingName, data]: [string, any]) => (
                      <div key={buildingName} className="mb-6">
                        <div className="bg-gray-100 rounded-t-lg p-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FiHome className="w-4 h-4" />
                            {buildingName}
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              ({data.count} bills, ₱
                              {data.totalAmount.toLocaleString()})
                            </span>
                          </h3>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-b-lg">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Invoice
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Customer
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Amount
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.bills.map((bill: any) => (
                                <tr key={bill._id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {bill.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2">
                                    {bill.customerName || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-xs font-medium text-red-600">
                                    ₱{bill.total.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded-full ${
                                        bill.status === "overdue"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {bill.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
