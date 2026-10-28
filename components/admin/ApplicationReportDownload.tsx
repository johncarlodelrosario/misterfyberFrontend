"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FiX,
  FiDownload,
  FiFileText,
  FiUsers,
  FiHome,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiBarChart2,
  FiLoader,
} from "react-icons/fi";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================
interface Building {
  _id: string;
  buildingName: string;
  isActive?: boolean;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
}

interface Application {
  _id: string;
  id?: string;
  applicationId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  buildingId: string | { _id: string; buildingName: string };
  buildingName?: string;
  tower?: string;
  floor?: string;
  unitNumber?: string;
  planId: string | { _id: string; name: string; price: number };
  plan?: { _id: string; name: string; price: number };
  status: "pending" | "approved" | "rejected" | "suspended";
  idType?: string;
  idNumber?: string;
  macAddress?: string;
  adminNotes?: string;
  notes?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt?: string;
  billingStarted?: boolean;
  hasAccount?: boolean;
  serviceStatus?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
}

interface ApplicationReportDownloadProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  plans: Plan[];
  onFetchAllApplications: (filters?: {
    buildingId?: string;
    status?: string;
    search?: string;
  }) => Promise<Application[]>;
  currentFilters?: {
    status?: string;
    buildingId?: string;
    search?: string;
  };
}

// ============================================================================
// Field Options
// ============================================================================
const FIELD_OPTIONS = [
  { key: "applicationId", label: "Application ID", default: true },
  { key: "fullName", label: "Full Name", default: true },
  { key: "email", label: "Email", default: true },
  { key: "phoneNumber", label: "Phone Number", default: true },
  { key: "building", label: "Building", default: true },
  { key: "tower", label: "Tower", default: true },
  { key: "floor", label: "Floor", default: true },
  { key: "unitNumber", label: "Unit Number", default: true },
  { key: "plan", label: "Plan Name", default: true },
  { key: "planPrice", label: "Plan Price", default: true },
  { key: "status", label: "Status", default: true },
  { key: "submittedAt", label: "Submitted Date", default: true },
  { key: "idType", label: "ID Type", default: false },
  { key: "idNumber", label: "ID Number", default: false },
  { key: "macAddress", label: "MAC Address", default: false },
  { key: "installationFee", label: "Installation Fee", default: false },
  { key: "installationFeePaid", label: "Fee Paid", default: false },
  { key: "billingStarted", label: "Billing Started", default: false },
  { key: "hasAccount", label: "Has Account", default: false },
  { key: "serviceStatus", label: "Service Status", default: false },
  { key: "notes", label: "Customer Notes", default: false },
  { key: "adminNotes", label: "Admin Notes", default: false },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

// ============================================================================
// Helpers
// ============================================================================
const formatDate = (d?: string): string => {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
};

const formatCurrency = (n: number): string =>
  `₱${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusLabel = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";

const getStatusColor = (s: string): [number, number, number] => {
  switch (s?.toLowerCase()) {
    case "approved":
      return [22, 163, 74];
    case "pending":
      return [202, 138, 4];
    case "rejected":
      return [220, 38, 38];
    case "suspended":
      return [107, 114, 128];
    default:
      return [0, 0, 0];
  }
};

// ============================================================================
// Component
// ============================================================================
export default function ApplicationReportDownload({
  isOpen,
  onClose,
  buildings,
  plans,
  onFetchAllApplications,
  currentFilters,
}: ApplicationReportDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [buildingId, setBuildingId] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    FIELD_OPTIONS.reduce(
      (acc, f) => {
        acc[f.key] = f.default;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentFilters) {
      setBuildingId(currentFilters.buildingId || "");
      setStatus(currentFilters.status || "all");
      setSearch(currentFilters.search || "");
    }
  }, [isOpen, currentFilters]);

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

  const getBuildingName = useCallback(
    (app: Application): string => {
      if (typeof app.buildingId === "object" && app.buildingId !== null) {
        return app.buildingId.buildingName || "N/A";
      }
      if (app.buildingName) return app.buildingName;
      const building = buildings.find((b) => b._id === app.buildingId);
      return building?.buildingName || "N/A";
    },
    [buildings],
  );

  const getPlanName = useCallback(
    (app: Application): string => {
      if (typeof app.planId === "object" && app.planId !== null) {
        return app.planId.name || "N/A";
      }
      if (app.plan?.name) return app.plan.name;
      const plan = plans.find((p) => p._id === app.planId);
      return plan?.name || "N/A";
    },
    [plans],
  );

  const getPlanPrice = useCallback(
    (app: Application): number => {
      if (typeof app.planId === "object" && app.planId !== null) {
        return app.planId.price || 0;
      }
      if (app.plan?.price) return app.plan.price;
      const plan = plans.find((p) => p._id === app.planId);
      return plan?.price || 0;
    },
    [plans],
  );

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSelectedFields(
      FIELD_OPTIONS.reduce(
        (acc, f) => {
          acc[f.key] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    );
  };

  const deselectAll = () => {
    setSelectedFields(
      FIELD_OPTIONS.reduce(
        (acc, f) => {
          acc[f.key] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    );
  };

  const resetFilters = () => {
    setBuildingId("");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const fetchData = useCallback(async (): Promise<Application[]> => {
    const applications = await onFetchAllApplications({
      buildingId: buildingId && buildingId !== "all" ? buildingId : undefined,
      status: status && status !== "all" ? status : undefined,
      search: search || undefined,
    });

    let filtered = applications;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((a) => new Date(a.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((a) => new Date(a.createdAt) <= to);
    }

    return filtered;
  }, [buildingId, status, search, dateFrom, dateTo, onFetchAllApplications]);

  const getFieldValue = useCallback(
    (app: Application, fieldKey: string): string => {
      switch (fieldKey) {
        case "applicationId":
          return app.applicationId || app._id || "";
        case "fullName":
          return [app.firstName, app.middleName, app.lastName]
            .filter(Boolean)
            .join(" ");
        case "email":
          return app.email || "";
        case "phoneNumber":
          return app.phoneNumber || "";
        case "building":
          return getBuildingName(app);
        case "tower":
          return app.tower || "";
        case "floor":
          return app.floor || "";
        case "unitNumber":
          return app.unitNumber || "";
        case "plan":
          return getPlanName(app);
        case "planPrice":
          return formatCurrency(getPlanPrice(app));
        case "status":
          return getStatusLabel(app.status);
        case "idType":
          return app.idType || "";
        case "idNumber":
          return app.idNumber || "";
        case "macAddress":
          return app.macAddress || "";
        case "installationFee":
          return formatCurrency(app.installationFee || 0);
        case "installationFeePaid":
          return app.installationFeePaid ? "Yes" : "No";
        case "billingStarted":
          return app.billingStarted ? "Yes" : "No";
        case "hasAccount":
          return app.hasAccount ? "Yes" : "No";
        case "serviceStatus":
          return app.serviceStatus || "";
        case "notes":
          return app.notes || "";
        case "adminNotes":
          return app.adminNotes || "";
        case "submittedAt":
          return formatDate(app.submittedAt || app.createdAt);
        default:
          return "";
      }
    },
    [getBuildingName, getPlanName, getPlanPrice],
  );

  const handleGenerate = useCallback(async () => {
    const enabledFields = FIELD_OPTIONS.filter((f) => selectedFields[f.key]);
    if (enabledFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    setIsGenerating(true);
    try {
      const applications = await fetchData();
      if (applications.length === 0) {
        toast.error("No applications match your filters");
        return;
      }

      const headers = enabledFields.map((f) => f.label);
      const rows = applications.map((app) =>
        enabledFields.map((f) => getFieldValue(app, f.key)),
      );

      if (format === "pdf") {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const orientation = enabledFields.length > 8 ? "landscape" : "portrait";
        const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("Applications Report", 14, 15);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        const now = new Date().toLocaleString("en-US");
        let info = `Generated: ${now}  |  Total: ${applications.length}`;
        if (status !== "all") info += `  |  Status: ${getStatusLabel(status)}`;
        if (buildingId) {
          const b = buildings.find((x) => x._id === buildingId);
          if (b) info += `  |  Building: ${b.buildingName}`;
        }
        doc.text(info, 14, 22);

        const columnStyles: Record<number, any> = {};
        enabledFields.forEach((_, i) => {
          columnStyles[i] = { cellWidth: "auto", halign: "left" };
        });

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 27,
          theme: "grid",
          styles: {
            fontSize:
              enabledFields.length > 12 ? 6 : enabledFields.length > 8 ? 7 : 8,
            cellPadding: 1.5,
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
          },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles,
          didParseCell: (data) => {
            if (data.section === "body") {
              const statusIdx = enabledFields.findIndex(
                (f) => f.key === "status",
              );
              if (statusIdx >= 0 && data.column.index === statusIdx) {
                const color = getStatusColor(String(data.cell.raw));
                data.cell.styles.textColor = color;
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
          didDrawPage: (data) => {
            const pageCount = doc.getNumberOfPages();
            const currentPage = doc.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
              `Page ${currentPage} of ${pageCount}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10,
            );
            doc.text(
              "Applications Report - Confidential",
              doc.internal.pageSize.width - data.settings.margin.right,
              doc.internal.pageSize.height - 10,
              { align: "right" },
            );
          },
        });

        const dateStr = new Date().toISOString().split("T")[0];
        doc.save(`applications-report-${dateStr}.pdf`);
        toast.success(`PDF downloaded (${applications.length} records)`);
      } else {
        const escapeCSV = (v: string): string => {
          if (v.includes(",") || v.includes('"') || v.includes("\n")) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        };

        const csvContent = [
          headers.map(escapeCSV).join(","),
          ...rows.map((r) => r.map(escapeCSV).join(",")),
        ].join("\n");
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().split("T")[0];
        link.href = url;
        link.download = `applications-report-${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Excel downloaded (${applications.length} records)`);
      }

      onClose();
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedFields,
    format,
    fetchData,
    getFieldValue,
    status,
    buildingId,
    buildings,
    onClose,
  ]);

  const enabledCount = Object.values(selectedFields).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiFileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Application Report
              </h2>
              <p className="text-xs text-gray-500">
                Export applications as PDF or Excel
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

        {/* Filter Bar */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`px-4 py-2.5 rounded-lg border transition flex items-center gap-2 text-sm font-medium ${
                showFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FiFilter className="w-4 h-4" />
              {showFilters ? "Less Filters" : "More Filters"}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setFormat("pdf")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition ${
                  format === "pdf"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiFileText className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => setFormat("excel")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition ${
                  format === "excel"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiDownload className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 rounded-lg transition"
                >
                  <FiX className="w-4 h-4" /> Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-blue-600" />
                Fields to Include ({enabledCount}/{FIELD_OPTIONS.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4 border border-gray-200 rounded-lg bg-gray-50 max-h-72 overflow-y-auto">
              {FIELD_OPTIONS.map((field) => (
                <label
                  key={field.key}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition ${
                    selectedFields[field.key]
                      ? "bg-blue-100 text-blue-800"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields[field.key]}
                    onChange={() => toggleField(field.key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="truncate">{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 border-t rounded-b-2xl">
          <div className="text-xs text-gray-500">
            Format:{" "}
            <span className="font-semibold text-gray-700">
              {format.toUpperCase()}
            </span>{" "}
            | {enabledCount} field{enabledCount !== 1 ? "s" : ""} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || enabledCount === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FiDownload className="h-4 w-4" />
                  Download {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
