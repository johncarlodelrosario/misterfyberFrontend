"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiDownload,
  FiFileText,
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiPrinter,
  FiMail,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiBell,
  FiXCircle,
  FiCalendar,
  FiBarChart2,
  FiUserCheck,
  FiActivity,
  FiSliders,
  FiRefreshCw,
  FiChevronRight,
  FiPieChart,
  FiServer,
  FiShield,
  FiHome,
  FiBox,
  FiHardDrive,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiToggleLeft,
  FiToggleRight,
  FiMapPin,
  FiGlobe,
  FiMap,
  FiNavigation,
  FiWifi,
  FiZap,
  FiClock,
  FiStar,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getAllPayments,
  getAllUsers,
  getAllBills,
  getDashboardStats,
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
  getAllApplications,
  approveApplication,
  rejectApplication,
  startBillingForApplication,
  createManualCustomer,
} from "@/services/admin";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  Plan,
} from "@/services/plan";
import {
  getActiveBuildings,
  getAllBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  Building,
} from "@/services/building";
import * as XLSX from "xlsx";

// ============================================================================
// Types & Constants
// ============================================================================
type ReportType = "payments" | "users" | "bills" | "revenue";
type TabType = "reports" | "applications" | "buildings" | "plans";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DashboardStats {
  totalUsers: number;
  totalPayments: number;
  monthlyRevenue: number;
  pendingApplications: number;
}

interface QuickDateRange {
  label: string;
  getValue: () => DateRange;
}

interface Application {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: "pending" | "approved" | "rejected";
  planId: {
    _id: string;
    name: string;
    price: number;
  };
  buildingId: {
    _id: string;
    buildingName: string;
    city: string;
  };
  floor: string;
  unitNumber: string;
  createdAt: string;
  adminNotes?: string;
  idType: string;
  idNumber: string;
}

// ============================================================================
// Utility Functions
// ============================================================================
const formatCurrency = (amount: number): string => {
  // Removed the currency symbol ($ sign) - now displays as "1,234.56"
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/[A-Z]{3}/g, "")
    .trim();
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
    paid: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
    active: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
    approved: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
    pending: "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20",
    rejected: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    failed: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    inactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
    suspended: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    overdue: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    default: "bg-gray-100 text-gray-700 ring-1 ring-gray-600/20",
  };
  return statusMap[status?.toLowerCase()] || statusMap.default;
};

// ============================================================================
// Custom Hooks
// ============================================================================
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

// ============================================================================
// Subcomponents
// ============================================================================

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  color: "blue" | "green" | "purple" | "amber";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    green: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    purple: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  };

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 tracking-wide">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <FiTrendingUp
                  className={`w-3.5 h-3.5 ${trend.isPositive ? "text-emerald-600" : "text-rose-600 rotate-180"}`}
                />
                <span
                  className={`text-xs font-medium ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${colorClasses[color]}`}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-100 to-transparent group-hover:via-gray-200 transition-all" />
    </div>
  );
};

// Tab Button Component
const TabButton = ({
  tab,
  label,
  icon: Icon,
  isActive,
  onClick,
  count,
}: {
  tab: TabType;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
      isActive
        ? "bg-white text-blue-600 shadow-md ring-1 ring-blue-100"
        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
    }`}
  >
    <Icon className={`w-4 h-4 ${isActive ? "text-blue-500" : ""}`} />
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span
        className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
          isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

// Application Card Component
const ApplicationCard = ({
  application,
  onView,
  onApprove,
  onReject,
  onStartBilling,
}: {
  application: Application;
  onView: (app: Application) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onStartBilling: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {application.firstName} {application.lastName}
              </h3>
              <span className={getStatusColor(application.status)}>
                {application.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{application.email}</p>
            <p className="text-sm text-gray-500">{application.phoneNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiEye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Plan:</span>
                <p className="font-medium text-gray-800">
                  {application.planId?.name || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Monthly Rate:</span>
                <p className="font-medium text-gray-800">
                  {formatCurrency(application.planId?.price || 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Building:</span>
                <p className="font-medium text-gray-800">
                  {application.buildingId?.buildingName || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <p className="font-medium text-gray-800">
                  {application.floor} {application.unitNumber}
                </p>
              </div>
              <div>
                <span className="text-gray-500">ID Type:</span>
                <p className="font-medium text-gray-800">
                  {application.idType}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Submitted:</span>
                <p className="font-medium text-gray-800">
                  {formatDate(application.createdAt)}
                </p>
              </div>
            </div>
            {application.adminNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500">Admin Notes:</span>
                <p className="text-sm text-gray-700">
                  {application.adminNotes}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {application.status === "pending" && (
                <>
                  <button
                    onClick={() => onApprove(application._id)}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(application._id)}
                    className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
              {application.status === "approved" && (
                <button
                  onClick={() => onStartBilling(application._id)}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Start Billing
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Building Card Component
const BuildingCard = ({
  building,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  building: Building;
  onEdit: (building: Building) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {building.buildingName}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  building.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {building.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <FiMapPin className="w-3 h-3" />
                {building.streetAddress}
              </p>
              <p className="text-sm text-gray-500">
                {building.barangay}, {building.city}, {building.province}
              </p>
              <p className="text-sm text-gray-500">ZIP: {building.zipCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(building)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleStatus(building._id, building.isActive)}
              className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
            >
              {building.isActive ? (
                <FiToggleRight className="w-5 h-5" />
              ) : (
                <FiToggleLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onDelete(building._id)}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Plan Card Component
const PlanCard = ({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  plan.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {plan.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(plan.price)}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FiWifi className="w-3 h-3" />
                {plan.speed.download} Mbps / {plan.speed.upload} Mbps
              </span>
              <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                {plan.duration} months
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {plan.description}
            </p>
            {plan.features && plan.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    {feature}
                  </span>
                ))}
                {plan.features.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{plan.features.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(plan)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleStatus(plan._id, plan.isActive)}
              className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
            >
              {plan.isActive ? (
                <FiToggleRight className="w-5 h-5" />
              ) : (
                <FiToggleLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onDelete(plan._id)}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Email Toggle Component
const EmailToggleCard = ({
  emailEnabled,
  togglingEmail,
  onToggle,
}: {
  emailEnabled: boolean;
  togglingEmail: boolean;
  onToggle: () => void;
}) => (
  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-5">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-xl ${emailEnabled ? "bg-emerald-100" : "bg-gray-100"}`}
        >
          <FiMail
            className={`w-5 h-5 ${emailEnabled ? "text-emerald-600" : "text-gray-500"}`}
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Customer Email Alerts</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {emailEnabled
              ? "Customers receive all notifications"
              : "Customer emails are suppressed"}
          </p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={togglingEmail}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
          emailEnabled ? "bg-emerald-500" : "bg-gray-300"
        } ${togglingEmail ? "opacity-50 cursor-not-allowed" : "cursor-pointer shadow-sm hover:shadow"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
            emailEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
    <div
      className={`mt-4 p-3 rounded-xl text-xs ${emailEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
    >
      {emailEnabled ? (
        <div className="flex items-center gap-2">
          <FiCheckCircle className="w-3.5 h-3.5" />
          <span>
            All customer emails (invoices, reminders, approvals) are being sent
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <FiAlertCircle className="w-3.5 h-3.5" />
          <span>
            Customer emails DISABLED. Admin emails still work normally.
          </span>
        </div>
      )}
    </div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================
export default function AdminDashboardPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>("reports");
  const [generating, setGenerating] = useState<ReportType | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reportType, setReportType] = useState<ReportType>("payments");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
    pendingApplications: 0,
  });

  // Applications State
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appSearchTerm, setAppSearchTerm] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");

  // Buildings State
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [buildingSearchTerm, setBuildingSearchTerm] = useState("");
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingForm, setBuildingForm] = useState({
    buildingName: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    streetAddress: "",
    zipCode: "",
    isActive: true,
  });

  // Plans State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState("");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 0,
    speed: { download: 0, upload: 0 },
    features: [] as string[],
    duration: 1,
    mikrotikProfile: "",
    isActive: true,
  });
  const [newFeature, setNewFeature] = useState("");

  // Debounced search
  const debouncedAppSearch = useDebounce(appSearchTerm, 300);
  const debouncedBuildingSearch = useDebounce(buildingSearchTerm, 300);
  const debouncedPlanSearch = useDebounce(planSearchTerm, 300);

  // Quick date ranges
  const quickDateRanges: QuickDateRange[] = useMemo(
    () => [
      {
        label: "This Month",
        getValue: () => {
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          return {
            startDate: firstDay.toISOString().split("T")[0],
            endDate: today.toISOString().split("T")[0],
          };
        },
      },
      {
        label: "Last Month",
        getValue: () => {
          const today = new Date();
          const firstDay = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
          return {
            startDate: firstDay.toISOString().split("T")[0],
            endDate: lastDay.toISOString().split("T")[0],
          };
        },
      },
      {
        label: "Last 30 Days",
        getValue: () => {
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return {
            startDate: thirtyDaysAgo.toISOString().split("T")[0],
            endDate: today.toISOString().split("T")[0],
          };
        },
      },
      {
        label: "This Quarter",
        getValue: () => {
          const today = new Date();
          const quarter = Math.floor(today.getMonth() / 3);
          const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
          return {
            startDate: firstDay.toISOString().split("T")[0],
            endDate: today.toISOString().split("T")[0],
          };
        },
      },
    ],
    [],
  );

  // Data fetching
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const dashboardStats = await getDashboardStats();
      setStats({
        totalUsers: dashboardStats?.users?.total || 0,
        totalPayments: dashboardStats?.revenue?.total || 0,
        monthlyRevenue: dashboardStats?.revenue?.monthly || 0,
        pendingApplications: dashboardStats?.applications?.pending || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error("Unable to load dashboard statistics");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchEmailStatus = useCallback(async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      setEmailEnabled(result.data?.customerEmailAlertsEnabled ?? true);
    } catch (error) {
      console.error("Failed to fetch email status:", error);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setIsLoadingApps(true);
    try {
      const result = await getAllApplications({
        forceRefresh: true,
        limit: 100,
      });
      setApplications(result.data || []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast.error("Unable to load applications");
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  const fetchBuildings = useCallback(async () => {
    setIsLoadingBuildings(true);
    try {
      const result = await getAllBuildings({ limit: 100 });
      setBuildings(result.data || []);
    } catch (error) {
      console.error("Failed to fetch buildings:", error);
      toast.error("Unable to load buildings");
    } finally {
      setIsLoadingBuildings(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const result = await getPlans();
      setPlans(result);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Unable to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchEmailStatus();
    fetchApplications();
    fetchBuildings();
    fetchPlans();
  }, [
    fetchStats,
    fetchEmailStatus,
    fetchApplications,
    fetchBuildings,
    fetchPlans,
  ]);

  // Application handlers
  const handleApproveApplication = async (id: string) => {
    try {
      await approveApplication(id);
      toast.success("Application approved successfully");
      fetchApplications();
      fetchStats();
    } catch (error) {
      toast.error("Failed to approve application");
    }
  };

  const handleRejectApplication = async (id: string) => {
    const notes = prompt("Please provide rejection reason:");
    try {
      await rejectApplication(id, notes || undefined);
      toast.success("Application rejected");
      fetchApplications();
    } catch (error) {
      toast.error("Failed to reject application");
    }
  };

  const handleStartBilling = async (id: string) => {
    const includeInstallationFee = confirm(
      "Do you want to include the installation fee?",
    );
    try {
      await startBillingForApplication(id, { includeInstallationFee });
      toast.success("Billing started successfully");
      fetchApplications();
    } catch (error) {
      toast.error("Failed to start billing");
    }
  };

  // Building handlers
  const handleCreateBuilding = async () => {
    if (!buildingForm.buildingName || !buildingForm.city) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      await createBuilding(buildingForm);
      toast.success("Building created successfully");
      setShowBuildingModal(false);
      setBuildingForm({
        buildingName: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        streetAddress: "",
        zipCode: "",
        isActive: true,
      });
      fetchBuildings();
    } catch (error) {
      toast.error("Failed to create building");
    }
  };

  const handleUpdateBuilding = async () => {
    if (!editingBuilding) return;
    try {
      await updateBuilding(editingBuilding._id, buildingForm);
      toast.success("Building updated successfully");
      setShowBuildingModal(false);
      setEditingBuilding(null);
      setBuildingForm({
        buildingName: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        streetAddress: "",
        zipCode: "",
        isActive: true,
      });
      fetchBuildings();
    } catch (error) {
      toast.error("Failed to update building");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building?")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted successfully");
      fetchBuildings();
    } catch (error) {
      toast.error("Failed to delete building");
    }
  };

  const handleToggleBuildingStatus = async (
    id: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateBuilding(id, { isActive: !currentStatus });
      toast.success(`Building ${!currentStatus ? "activated" : "deactivated"}`);
      fetchBuildings();
    } catch (error) {
      toast.error("Failed to update building status");
    }
  };

  const openBuildingModal = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      setBuildingForm({
        buildingName: building.buildingName,
        region: building.region || "",
        province: building.province || "",
        city: building.city || "",
        barangay: building.barangay || "",
        streetAddress: building.streetAddress || "",
        zipCode: building.zipCode || "",
        isActive: building.isActive,
      });
    } else {
      setEditingBuilding(null);
      setBuildingForm({
        buildingName: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        streetAddress: "",
        zipCode: "",
        isActive: true,
      });
    }
    setShowBuildingModal(true);
  };

  // Plan handlers
  const handleCreatePlan = async () => {
    if (!planForm.name || planForm.price <= 0) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      await createPlan(planForm);
      toast.success("Plan created successfully");
      setShowPlanModal(false);
      setPlanForm({
        name: "",
        description: "",
        price: 0,
        speed: { download: 0, upload: 0 },
        features: [],
        duration: 1,
        mikrotikProfile: "",
        isActive: true,
      });
      fetchPlans();
    } catch (error) {
      toast.error("Failed to create plan");
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      await updatePlan(editingPlan._id, planForm);
      toast.success("Plan updated successfully");
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanForm({
        name: "",
        description: "",
        price: 0,
        speed: { download: 0, upload: 0 },
        features: [],
        duration: 1,
        mikrotikProfile: "",
        isActive: true,
      });
      fetchPlans();
    } catch (error) {
      toast.error("Failed to update plan");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await deletePlan(id);
      toast.success("Plan deleted successfully");
      fetchPlans();
    } catch (error) {
      toast.error("Failed to delete plan");
    }
  };

  const handleTogglePlanStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updatePlan(id, { isActive: !currentStatus });
      toast.success(`Plan ${!currentStatus ? "activated" : "deactivated"}`);
      fetchPlans();
    } catch (error) {
      toast.error("Failed to update plan status");
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanForm({
        ...planForm,
        features: [...planForm.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setPlanForm({
      ...planForm,
      features: planForm.features.filter((_, i) => i !== index),
    });
  };

  const openPlanModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        description: plan.description || "",
        price: plan.price,
        speed: plan.speed || { download: 0, upload: 0 },
        features: plan.features || [],
        duration: plan.duration || 1,
        mikrotikProfile: plan.mikrotikProfile || "",
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: "",
        description: "",
        price: 0,
        speed: { download: 0, upload: 0 },
        features: [],
        duration: 1,
        mikrotikProfile: "",
        isActive: true,
      });
    }
    setShowPlanModal(true);
  };

  // Filtered data
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      debouncedAppSearch === "" ||
      `${app.firstName} ${app.lastName}`
        .toLowerCase()
        .includes(debouncedAppSearch.toLowerCase()) ||
      app.email.toLowerCase().includes(debouncedAppSearch.toLowerCase()) ||
      app.phoneNumber.includes(debouncedAppSearch);
    const matchesStatus =
      appStatusFilter === "all" || app.status === appStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBuildings = buildings.filter(
    (building) =>
      debouncedBuildingSearch === "" ||
      building.buildingName
        .toLowerCase()
        .includes(debouncedBuildingSearch.toLowerCase()) ||
      building.city
        ?.toLowerCase()
        .includes(debouncedBuildingSearch.toLowerCase()),
  );

  const filteredPlans = plans.filter(
    (plan) =>
      debouncedPlanSearch === "" ||
      plan.name.toLowerCase().includes(debouncedPlanSearch.toLowerCase()),
  );

  // Report generation handlers
  const generatePaymentsReport = async () => {
    setGenerating("payments");
    const loadingToast = toast.loading("Fetching payment data...");

    try {
      const result = await getAllPayments({
        forceRefresh: true,
        limit: 10000,
      });

      let payments = result.data || [];

      payments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return paymentDate >= start && paymentDate <= end;
      });

      toast.loading("Building Excel report...", { id: loadingToast });

      const reportData = payments.map((payment: any) => ({
        "Payment ID": payment._id,
        "Invoice Number": payment.invoiceNumber || payment.billingId || "N/A",
        Amount: payment.amount,
        Status: payment.status?.toUpperCase() || "UNKNOWN",
        "Payment Method": payment.paymentMethod || "N/A",
        "Payment Type": payment.paymentType || "subscription",
        "Reference Number": payment.referenceNumber || "N/A",
        "Paid At": payment.paidAt ? formatDateTime(payment.paidAt) : "Not paid",
        "Created At": formatDateTime(payment.createdAt),
        "User ID":
          typeof payment.userId === "object"
            ? payment.userId?._id
            : payment.userId,
        "User Name":
          typeof payment.userId === "object"
            ? `${payment.userId?.firstName || ""} ${payment.userId?.lastName || ""}`.trim() ||
              payment.userId?.username ||
              "N/A"
            : "N/A",
        "User Email":
          typeof payment.userId === "object"
            ? payment.userId?.email || "N/A"
            : "N/A",
      }));

      const totalAmount = payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0,
      );
      const completedPayments = payments.filter(
        (p: any) => p.status === "completed",
      ).length;
      const pendingPayments = payments.filter(
        (p: any) => p.status === "pending",
      ).length;
      const failedPayments = payments.filter(
        (p: any) => p.status === "failed",
      ).length;

      const summary = [
        ["PAYMENTS REPORT"],
        [`Generated: ${formatDateTime(new Date().toISOString())}`],
        [
          `Date Range: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["SUMMARY STATISTICS"],
        ["Total Payments", payments.length],
        ["Total Amount", formatCurrency(totalAmount)],
        ["Completed", completedPayments],
        ["Pending", pendingPayments],
        ["Failed", failedPayments],
        [
          "Average Payment",
          formatCurrency(
            payments.length > 0 ? totalAmount / payments.length : 0,
          ),
        ],
        [""],
        ["DETAILED TRANSACTIONS"],
      ];

      const headers = Object.keys(reportData[0] || {});
      const rows = reportData.map(Object.values);

      const finalData = [...summary, headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(finalData);

      ws["!cols"] = headers.map(() => ({ wch: 18 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payments");
      XLSX.writeFile(
        wb,
        `payments_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );

      toast.success(`Payments report generated (${payments.length} records)`, {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error generating payments report:", error);
      toast.error("Failed to generate payments report", { id: loadingToast });
    } finally {
      setGenerating(null);
    }
  };

  const generateUsersReport = async () => {
    setGenerating("users");
    const loadingToast = toast.loading("Fetching user data...");

    try {
      const result = await getAllUsers({ forceRefresh: true, limit: 10000 });
      let users = result.data || [];

      users = users.filter((user: any) => {
        const userDate = new Date(user.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return userDate >= start && userDate <= end;
      });

      toast.loading("Building Excel report...", { id: loadingToast });

      const reportData = users.map((user: any) => ({
        "User ID": user._id,
        Username: user.username || "N/A",
        Email: user.email || "N/A",
        "First Name": user.firstName || "N/A",
        "Last Name": user.lastName || "N/A",
        "Phone Number": user.phoneNumber || "N/A",
        Role: user.role?.toUpperCase() || "USER",
        Status: user.status?.toUpperCase() || "UNKNOWN",
        Plan: user.planId?.name || "No Plan",
        Address:
          `${user.barangay || ""}, ${user.city || ""}, ${user.province || ""}`.replace(
            /^,\s|,\s$/,
            "",
          ) || "N/A",
        "Created At": formatDateTime(user.createdAt),
        "Last Login": user.lastLogin ? formatDateTime(user.lastLogin) : "Never",
      }));

      const totalActive = users.filter(
        (u: any) => u.status === "active",
      ).length;
      const totalInactive = users.filter(
        (u: any) => u.status === "inactive",
      ).length;
      const totalSuspended = users.filter(
        (u: any) => u.status === "suspended",
      ).length;

      const summary = [
        ["USERS REPORT"],
        [`Generated: ${formatDateTime(new Date().toISOString())}`],
        [
          `Date Range: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["SUMMARY STATISTICS"],
        ["Total Users", users.length],
        ["Active", totalActive],
        ["Inactive", totalInactive],
        ["Suspended", totalSuspended],
        [""],
        ["DETAILED USER LIST"],
      ];

      const headers = Object.keys(reportData[0] || {});
      const rows = reportData.map(Object.values);

      const finalData = [...summary, headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      ws["!cols"] = headers.map(() => ({ wch: 18 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(
        wb,
        `users_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );

      toast.success(`Users report generated (${users.length} records)`, {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error generating users report:", error);
      toast.error("Failed to generate users report", { id: loadingToast });
    } finally {
      setGenerating(null);
    }
  };

  const generateBillsReport = async () => {
    setGenerating("bills");
    const loadingToast = toast.loading("Fetching bill data...");

    try {
      const result = await getAllBills({ forceRefresh: true, limit: 10000 });
      let bills = result.data || [];

      bills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return billDate >= start && billDate <= end;
      });

      toast.loading("Building Excel report...", { id: loadingToast });

      const reportData = bills.map((bill: any) => ({
        "Bill ID": bill._id,
        "Invoice Number": bill.invoiceNumber || "N/A",
        Subtotal: bill.subtotal || 0,
        Tax: bill.tax || 0,
        Discount: bill.discount || 0,
        Total: bill.total || 0,
        Status: bill.status?.toUpperCase() || "UNKNOWN",
        "Due Date": bill.dueDate ? formatDate(bill.dueDate) : "N/A",
        "Created At": formatDateTime(bill.createdAt),
      }));

      const totalAmount = bills.reduce(
        (sum: number, b: any) => sum + (b.total || 0),
        0,
      );
      const paidBills = bills.filter((b: any) => b.status === "paid").length;

      const summary = [
        ["BILLS REPORT"],
        [`Generated: ${formatDateTime(new Date().toISOString())}`],
        [
          `Date Range: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["SUMMARY STATISTICS"],
        ["Total Bills", bills.length],
        ["Total Amount", formatCurrency(totalAmount)],
        ["Paid Bills", paidBills],
        [
          "Collection Rate",
          `${bills.length > 0 ? ((paidBills / bills.length) * 100).toFixed(1) : 0}%`,
        ],
        [""],
        ["DETAILED BILL LIST"],
      ];

      const headers = Object.keys(reportData[0] || {});
      const rows = reportData.map(Object.values);

      const finalData = [...summary, headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      ws["!cols"] = headers.map(() => ({ wch: 18 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bills");
      XLSX.writeFile(
        wb,
        `bills_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );

      toast.success(`Bills report generated (${bills.length} records)`, {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error generating bills report:", error);
      toast.error("Failed to generate bills report", { id: loadingToast });
    } finally {
      setGenerating(null);
    }
  };

  const generateRevenueReport = async () => {
    setGenerating("revenue");
    const loadingToast = toast.loading("Analyzing revenue data...");

    try {
      const [paymentsResult, billsResult] = await Promise.all([
        getAllPayments({ forceRefresh: true, limit: 10000 }),
        getAllBills({ forceRefresh: true, limit: 10000 }),
      ]);

      let payments = paymentsResult.data || [];
      let bills = billsResult.data || [];

      payments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return paymentDate >= start && paymentDate <= end;
      });

      bills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59);
        return billDate >= start && billDate <= end;
      });

      const totalBills = bills.reduce(
        (sum: number, b: any) => sum + (b.total || 0),
        0,
      );
      const totalPayments = payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0,
      );
      const completedPayments = payments
        .filter((p: any) => p.status === "completed")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const collectionRate =
        totalBills > 0 ? (completedPayments / totalBills) * 100 : 0;

      const summary = [
        ["REVENUE REPORT"],
        [`Generated: ${formatDateTime(new Date().toISOString())}`],
        [
          `Date Range: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
        ],
        [""],
        ["FINANCIAL SUMMARY"],
        ["Total Bills Generated", formatCurrency(totalBills)],
        ["Total Payments Received", formatCurrency(totalPayments)],
        ["Confirmed/Completed Revenue", formatCurrency(completedPayments)],
        ["Outstanding Balance", formatCurrency(totalBills - completedPayments)],
        [""],
        ["PERFORMANCE METRICS"],
        ["Collection Rate", `${collectionRate.toFixed(2)}%`],
        [
          "Bill-to-Payment Ratio",
          `${totalBills > 0 ? ((totalPayments / totalBills) * 100).toFixed(1) : 0}%`,
        ],
        ["Total Transactions", payments.length],
        ["Total Bills Issued", bills.length],
      ];

      const finalData = [...summary];
      const ws = XLSX.utils.aoa_to_sheet(finalData);
      ws["!cols"] = [{ wch: 30 }, { wch: 20 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Revenue Summary");
      XLSX.writeFile(
        wb,
        `revenue_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`,
      );

      toast.success("Revenue report generated successfully", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error generating revenue report:", error);
      toast.error("Failed to generate revenue report", { id: loadingToast });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateReport = useCallback(() => {
    switch (reportType) {
      case "payments":
        generatePaymentsReport();
        break;
      case "users":
        generateUsersReport();
        break;
      case "bills":
        generateBillsReport();
        break;
      case "revenue":
        generateRevenueReport();
        break;
    }
  }, [reportType, dateRange]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleToggleEmail = useCallback(async () => {
    setTogglingEmail(true);
    try {
      const newState = !emailEnabled;
      const result = await toggleCustomerEmailAlerts(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(
          `Customer email alerts ${newState ? "enabled" : "disabled"}`,
        );
      } else {
        toast.error(result.message || "Failed to toggle email settings");
      }
    } catch (error) {
      console.error("Failed to toggle email:", error);
      toast.error("Failed to toggle email settings");
    } finally {
      setTogglingEmail(false);
    }
  }, [emailEnabled]);

  // Report info configuration
  const reportInfo = {
    payments: {
      title: "Payments Report",
      description: "Complete transaction history with status and user details",
      icon: FiCreditCard,
      features: [
        "All payment transactions within date range",
        "Payment status breakdown (Completed, Pending, Failed)",
        "Payment methods and reference numbers",
        "User information for each payment",
        "Summary statistics with totals and averages",
      ],
    },
    users: {
      title: "Users Report",
      description:
        "Comprehensive user registry with account status and plan details",
      icon: FiUsers,
      features: [
        "Complete user account list with contact info",
        "User roles and account status",
        "Plan subscription details",
        "Account creation and last login tracking",
        "Active/Inactive/Suspended breakdown",
      ],
    },
    bills: {
      title: "Bills Report",
      description: "Invoice and billing summary with payment status",
      icon: FiFileText,
      features: [
        "Complete bill/invoice listing",
        "Bill status (Paid, Unpaid, Overdue)",
        "Financial breakdown (subtotal, tax, discount, total)",
        "Due dates and aging analysis",
        "Collection rate calculation",
      ],
    },
    revenue: {
      title: "Revenue Report",
      description: "Financial performance and collection analysis",
      icon: FiTrendingUp,
      features: [
        "Overall revenue summary",
        "Bills generated vs payments received",
        "Collection rate analysis",
        "Outstanding balance tracking",
        "Bill-to-payment ratio metrics",
      ],
    },
  };

  const currentReportInfo = reportInfo[reportType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header - Premium Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-xl">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="relative px-8 py-8 lg:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
                    <FiBarChart2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <span className="text-white/70 text-sm font-mono tracking-wide">
                    ADMIN DASHBOARD
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Admin Control Center
                </h1>
                <p className="text-white/60 text-base max-w-2xl">
                  Manage reports, applications, buildings, and service plans
                  from one centralized dashboard
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 flex items-center gap-2 text-sm font-medium backdrop-blur-sm border border-white/10"
                >
                  <FiPrinter className="w-4 h-4" />
                  Print View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={isLoadingStats ? "—" : stats.totalUsers.toLocaleString()}
            icon={FiUsers}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
          <StatsCard
            title="Total Payments"
            value={isLoadingStats ? "—" : formatCurrency(stats.totalPayments)}
            icon={FiCreditCard}
            trend={{ value: 8, isPositive: true }}
            color="green"
          />
          <StatsCard
            title="Monthly Revenue"
            value={isLoadingStats ? "—" : formatCurrency(stats.monthlyRevenue)}
            trend={{ value: 5, isPositive: true }}
            color="purple"
          />
          <StatsCard
            title="Pending Applications"
            value={
              isLoadingStats ? "—" : stats.pendingApplications.toLocaleString()
            }
            icon={FiUserCheck}
            trend={{ value: 3, isPositive: false }}
            color="amber"
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-4">
            <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
              <TabButton
                tab="reports"
                label="Reports & Analytics"
                icon={FiBarChart2}
                isActive={activeTab === "reports"}
                onClick={() => setActiveTab("reports")}
              />
              <TabButton
                tab="applications"
                label="Applications"
                icon={FiFileText}
                isActive={activeTab === "applications"}
                onClick={() => setActiveTab("applications")}
                count={stats.pendingApplications}
              />
              <TabButton
                tab="buildings"
                label="Buildings"
                icon={FiHome}
                isActive={activeTab === "buildings"}
                onClick={() => setActiveTab("buildings")}
              />
              <TabButton
                tab="plans"
                label="Service Plans"
                icon={FiWifi}
                isActive={activeTab === "plans"}
                onClick={() => setActiveTab("plans")}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* REPORTS TAB */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                {/* Report Generator */}
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Report Type Selection */}
                    <div className="lg:col-span-5 space-y-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiSliders className="w-4 h-4" />
                        Report Type
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ReportTypeButton
                          type="payments"
                          label="Payments Report"
                          description="Transactions & history"
                          icon={FiCreditCard}
                          isActive={reportType === "payments"}
                          onClick={() => setReportType("payments")}
                        />
                        <ReportTypeButton
                          type="users"
                          label="Users Report"
                          description="Accounts & profiles"
                          icon={FiUsers}
                          isActive={reportType === "users"}
                          onClick={() => setReportType("users")}
                        />
                        <ReportTypeButton
                          type="bills"
                          label="Bills Report"
                          description="Invoices & billing"
                          icon={FiFileText}
                          isActive={reportType === "bills"}
                          onClick={() => setReportType("bills")}
                        />
                        <ReportTypeButton
                          type="revenue"
                          label="Revenue Report"
                          description="Financial summary"
                          icon={FiPieChart}
                          isActive={reportType === "revenue"}
                          onClick={() => setReportType("revenue")}
                        />
                      </div>
                    </div>

                    {/* Date Range Selection */}
                    <div className="lg:col-span-4 space-y-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiCalendar className="w-4 h-4" />
                        Date Range
                      </label>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={dateRange.startDate}
                              onChange={(e) =>
                                setDateRange({
                                  ...dateRange,
                                  startDate: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={dateRange.endDate}
                              onChange={(e) =>
                                setDateRange({
                                  ...dateRange,
                                  endDate: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {quickDateRanges.map((range) => (
                            <button
                              key={range.label}
                              onClick={() => setDateRange(range.getValue())}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="lg:col-span-3 space-y-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiActivity className="w-4 h-4" />
                        Generate
                      </label>
                      <button
                        onClick={handleGenerateReport}
                        disabled={generating !== null}
                        className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                          generating !== null
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-200 hover:shadow-md"
                        }`}
                      >
                        {generating === reportType ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" />
                            Generating Report...
                          </>
                        ) : (
                          <>
                            <FiDownload className="w-4 h-4" />
                            Export {currentReportInfo.title}
                          </>
                        )}
                      </button>
                      <div className="text-center text-xs text-gray-400">
                        Excel format · Up to 10,000 records
                      </div>
                    </div>
                  </div>
                </div>

                {/* What's Included */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Report Contents
                        </h3>
                        <p className="text-sm text-gray-500">
                          What's included in this report
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {currentReportInfo.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-gray-600 text-sm"
                        >
                          <FiChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-xl">
                        <FiAlertCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Export Details
                        </h3>
                        <p className="text-sm text-gray-500">
                          File format and compatibility
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500 text-sm">
                          File Format
                        </span>
                        <span className="font-mono text-sm font-medium text-gray-900">
                          .xlsx (Excel)
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500 text-sm">
                          Compatibility
                        </span>
                        <span className="text-sm text-gray-700">
                          Excel, Google Sheets, LibreOffice
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-500 text-sm">
                          Summary Section
                        </span>
                        <span className="text-sm font-medium text-emerald-600">
                          Included
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-500 text-sm">
                          Auto-download
                        </span>
                        <span className="text-sm font-medium text-emerald-600">
                          Yes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* APPLICATIONS TAB */}
            {activeTab === "applications" && (
              <div className="space-y-6">
                {/* Header with Search and Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={appSearchTerm}
                      onChange={(e) => setAppSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAppStatusFilter("all")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appStatusFilter === "all"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAppStatusFilter("pending")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appStatusFilter === "pending"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setAppStatusFilter("approved")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appStatusFilter === "approved"
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setAppStatusFilter("rejected")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        appStatusFilter === "rejected"
                          ? "bg-rose-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Rejected
                    </button>
                  </div>
                </div>

                {/* Applications Grid */}
                {isLoadingApps ? (
                  <div className="flex justify-center items-center py-12">
                    <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No applications found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredApplications.map((application) => (
                      <ApplicationCard
                        key={application._id}
                        application={application}
                        onView={() => {}}
                        onApprove={handleApproveApplication}
                        onReject={handleRejectApplication}
                        onStartBilling={handleStartBilling}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BUILDINGS TAB */}
            {activeTab === "buildings" && (
              <div className="space-y-6">
                {/* Header with Search and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search buildings by name or city..."
                      value={buildingSearchTerm}
                      onChange={(e) => setBuildingSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    onClick={() => openBuildingModal()}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Building
                  </button>
                </div>

                {/* Buildings Grid */}
                {isLoadingBuildings ? (
                  <div className="flex justify-center items-center py-12">
                    <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredBuildings.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FiHome className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No buildings found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBuildings.map((building) => (
                      <BuildingCard
                        key={building._id}
                        building={building}
                        onEdit={openBuildingModal}
                        onDelete={handleDeleteBuilding}
                        onToggleStatus={handleToggleBuildingStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PLANS TAB */}
            {activeTab === "plans" && (
              <div className="space-y-6">
                {/* Header with Search and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search plans by name..."
                      value={planSearchTerm}
                      onChange={(e) => setPlanSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    onClick={() => openPlanModal()}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Plan
                  </button>
                </div>

                {/* Plans Grid */}
                {isLoadingPlans ? (
                  <div className="flex justify-center items-center py-12">
                    <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FiWifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No plans found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlans.map((plan) => (
                      <PlanCard
                        key={plan._id}
                        plan={plan}
                        onEdit={openPlanModal}
                        onDelete={handleDeletePlan}
                        onToggleStatus={handleTogglePlanStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Email Configuration Card - Only visible on Reports tab */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <FiBell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Email Notification Control
                    </h3>
                    <p className="text-sm text-gray-500">
                      Manage customer email delivery preferences
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${emailEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {emailEnabled
                      ? "Customer Emails: ON"
                      : "Customer Emails: OFF"}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <EmailToggleCard
                emailEnabled={emailEnabled}
                togglingEmail={togglingEmail}
                onToggle={handleToggleEmail}
              />
              <div className="mt-5 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <FiShield className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    <p className="font-medium mb-1">Administrator Note:</p>
                    <p>
                      This setting affects all customer-facing notifications
                      including invoices, payment confirmations, and application
                      status updates. Admin email alerts are always delivered
                      regardless of this toggle.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FiServer className="w-3 h-3" />
              Data Source: Live Database
            </span>
            <span>•</span>
            <span>Last sync: {new Date().toLocaleString()}</span>
          </div>
          <div>
            <span className="font-mono">v2.0 · Admin Dashboard</span>
          </div>
        </div>
      </div>

      {/* Building Modal */}
      {showBuildingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBuilding ? "Edit Building" : "Add New Building"}
              </h2>
              <button
                onClick={() => setShowBuildingModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Name *
                </label>
                <input
                  type="text"
                  value={buildingForm.buildingName}
                  onChange={(e) =>
                    setBuildingForm({
                      ...buildingForm,
                      buildingName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Tower One"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={buildingForm.streetAddress}
                  onChange={(e) =>
                    setBuildingForm({
                      ...buildingForm,
                      streetAddress: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={buildingForm.city}
                    onChange={(e) =>
                      setBuildingForm({ ...buildingForm, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={buildingForm.province}
                    onChange={(e) =>
                      setBuildingForm({
                        ...buildingForm,
                        province: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <input
                    type="text"
                    value={buildingForm.barangay}
                    onChange={(e) =>
                      setBuildingForm({
                        ...buildingForm,
                        barangay: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={buildingForm.zipCode}
                    onChange={(e) =>
                      setBuildingForm({
                        ...buildingForm,
                        zipCode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={buildingForm.isActive}
                  onChange={(e) =>
                    setBuildingForm({
                      ...buildingForm,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active (available for applications)
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowBuildingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  editingBuilding ? handleUpdateBuilding : handleCreateBuilding
                }
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {editingBuilding ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPlan ? "Edit Plan" : "Add New Plan"}
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Fiber 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={planForm.description}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Plan description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (PHP) *
                  </label>
                  <input
                    type="number"
                    value={planForm.price}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (months)
                  </label>
                  <input
                    type="number"
                    value={planForm.duration}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        duration: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download Speed (Mbps)
                  </label>
                  <input
                    type="number"
                    value={planForm.speed.download}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        speed: {
                          ...planForm.speed,
                          download: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Speed (Mbps)
                  </label>
                  <input
                    type="number"
                    value={planForm.speed.upload}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        speed: {
                          ...planForm.speed,
                          upload: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addFeature()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a feature..."
                  />
                  <button
                    onClick={addFeature}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {planForm.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg"
                    >
                      {feature}
                      <button
                        onClick={() => removeFeature(idx)}
                        className="hover:text-blue-900"
                      >
                        <FiXCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MikroTik Profile
                </label>
                <input
                  type="text"
                  value={planForm.mikrotikProfile}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      mikrotikProfile: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MikroTik queue profile name"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="planIsActive"
                  checked={planForm.isActive}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <label htmlFor="planIsActive" className="text-sm text-gray-700">
                  Active (available for customers)
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {editingPlan ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for report type buttons
const ReportTypeButton = ({
  type,
  label,
  description,
  icon: Icon,
  isActive,
  onClick,
}: {
  type: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full group ${
      isActive
        ? "border-blue-500 bg-blue-50/50 shadow-md"
        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`p-2 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p
          className={`font-semibold ${isActive ? "text-blue-700" : "text-gray-800"}`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      {isActive && <FiChevronRight className="w-4 h-4 text-blue-500 mt-2" />}
    </div>
  </button>
);
