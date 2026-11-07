"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FiFileText,
  FiUsers,
  FiCreditCard,
  FiMail,
  FiLoader,
  FiXCircle,
  FiBarChart2,
  FiUserCheck,
  FiActivity,
  FiChevronRight,
  FiServer,
  FiHome,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiSearch,
  FiToggleLeft,
  FiToggleRight,
  FiMapPin,
  FiWifi,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiDatabase,
  FiPieChart,
  FiLayers,
  FiMinus,
  FiFilter,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getAllUsers,
  getAllBills,
  getDashboardStats,
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
  getAllApplications,
  approveApplication,
  rejectApplication,
  startBillingForApplication,
  getAllPayments,
  getRecentActivities,
} from "@/services/admin";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  Plan,
} from "@/services/plan";
import {
  getAllBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  Building,
} from "@/services/building";

import ApplicationReportDownload from "@/components/admin/ApplicationReportDownload";
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";
import PaymentReport from "@/components/admin/PaymentReport";

// ============================================================================
// Types
// ============================================================================
type TabType =
  | "overview"
  | "reports"
  | "applications"
  | "billing-paid"
  | "buildings"
  | "plans";

interface DashboardStats {
  totalUsers: number;
  totalPayments: number;
  monthlyRevenue: number;
  pendingApplications: number;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalBills: number;
  unpaidBills: number;
  overdueBills: number;
  paidBills: number;
  totalBuildings: number;
  activeBuildings: number;
  totalPlans: number;
  activePlans: number;
  totalPendingPayments: number;
  pendingPaymentsAmount: number;
  completedPaymentsAmount: number;
  completedPaymentsCount: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  avgRevenuePerUser: number;
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
  status: "pending" | "approved" | "rejected" | "suspended";
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
  tower?: string;
  createdAt: string;
  submittedAt?: string;
  adminNotes?: string;
  notes?: string;
  idType: string;
  idNumber: string;
  macAddress?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
  billingStarted?: boolean;
  hasAccount?: boolean;
  serviceStatus?: string;
}

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

interface PaymentGroup {
  customerId: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    applicationId: string;
    buildingId?: string;
    buildingName?: string;
  };
  payments: any[];
  totalAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  paymentCount: number;
  lastPaymentDate: string;
  firstPaymentDate: string;
  hasPendingPayments: boolean;
}

interface ActivityItem {
  id: string;
  type: "application" | "payment" | "billing" | "user";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

interface RevenueDataPoint {
  label: string;
  value: number;
  date: string;
  fullDate: string;
}

type RevenuePeriod = "7d" | "30d" | "90d";

// ============================================================================
// Utilities
// ============================================================================
const formatCurrency = (amount: number): string => {
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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
  return new Date(dateString).toLocaleDateString("en-PH", {
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
    processing: "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20",
    rejected: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    failed: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    inactive: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
    suspended: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    overdue: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
    unpaid: "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20",
    disconnected: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
    default: "bg-gray-100 text-gray-700 ring-1 ring-gray-600/20",
  };
  return statusMap[status?.toLowerCase()] || statusMap.default;
};

const extractId = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
    if (typeof v.toString === "function") {
      const s = v.toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return String(v);
};

const extractEmail = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v.includes("@") ? v : "";
  if (typeof v === "object" && v.email) return String(v.email);
  return "";
};

const extractName = (v: any): string => {
  if (!v) return "";
  if (typeof v === "object") {
    const fn = v.firstName || "";
    const ln = v.lastName || "";
    if (fn || ln) return `${fn} ${ln}`.trim();
  }
  return "";
};

const calcPercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const isUnpaidStatus = (status: string): boolean =>
  status === "unpaid" ||
  status === "pending" ||
  status === "overdue" ||
  status === "sent" ||
  status === "pending_confirmation";

const isPaidStatus = (status: string): boolean =>
  status === "paid" || status === "completed";

// ============================================================================
// Hooks
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

const AdvancedStatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
  trendValue,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "amber" | "rose" | "cyan";
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
  isLoading?: boolean;
}) => {
  const colorClasses = {
    blue: { icon: "bg-blue-100 text-blue-600", accent: "bg-blue-500" },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      accent: "bg-emerald-500",
    },
    purple: { icon: "bg-violet-100 text-violet-600", accent: "bg-violet-500" },
    amber: { icon: "bg-amber-100 text-amber-600", accent: "bg-amber-500" },
    rose: { icon: "bg-rose-100 text-rose-600", accent: "bg-rose-500" },
    cyan: { icon: "bg-cyan-100 text-cyan-600", accent: "bg-cyan-500" },
  };
  const colors = colorClasses[color];
  const trendAbs = trendValue !== undefined ? Math.abs(trendValue) : 0;
  const trendLabel =
    trendValue !== undefined ? `${trendAbs.toFixed(1)}%` : undefined;

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden group hover:shadow-md transition-all">
      <div className={`absolute top-0 left-0 w-full h-1 ${colors.accent}`} />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {trend && trendValue !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  trend === "up"
                    ? "bg-emerald-50 text-emerald-600"
                    : trend === "down"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-gray-50 text-gray-500"
                }`}
              >
                {trend === "up" ? (
                  <FiArrowUpRight className="w-3 h-3" />
                ) : trend === "down" ? (
                  <FiArrowDownRight className="w-3 h-3" />
                ) : (
                  <FiMinus className="w-3 h-3" />
                )}
                {trendLabel}
              </span>
            )}
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {isLoading ? (
              <span className="inline-block w-24 h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${colors.icon} group-hover:scale-110 transition-transform`}
        >
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
};

const MiniStatCard = ({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  isLoading,
  active,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "blue" | "green" | "amber" | "rose" | "purple" | "gray";
  onClick?: () => void;
  isLoading?: boolean;
  active?: boolean;
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    purple: "bg-violet-50 text-violet-600 border-violet-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${colorClasses[color]} ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${active ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium opacity-80 truncate">{title}</p>
        <p className="text-lg font-bold truncate">
          {isLoading ? (
            <span className="inline-block w-10 h-5 bg-current/20 rounded animate-pulse" />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  );
};

const TabButton = ({
  label,
  icon: Icon,
  isActive,
  onClick,
  count,
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
      isActive
        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
    }`}
  >
    <Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span
        className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
        }`}
      >
        {count > 99 ? "99+" : count}
      </span>
    )}
  </button>
);

const QuickActionCard = ({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  isLoading,
  badge,
  stat,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple";
  onClick: () => void;
  isLoading?: boolean;
  badge?: string;
  stat?: string;
}) => {
  const colorClasses = {
    blue: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      border: "hover:border-blue-300",
    },
    green: {
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      border: "hover:border-emerald-300",
    },
    purple: {
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      border: "hover:border-violet-300",
    },
  };
  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`relative flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-gray-100 ${colors.border} hover:shadow-lg transition-all group disabled:opacity-50 text-left w-full`}
    >
      {badge && (
        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {badge}
        </span>
      )}
      <div
        className={`p-3.5 ${colors.iconBg} rounded-xl group-hover:scale-110 transition-transform`}
      >
        {isLoading ? (
          <FiLoader className={`w-6 h-6 ${colors.iconColor} animate-spin`} />
        ) : (
          <Icon className={`w-6 h-6 ${colors.iconColor}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
        {stat && (
          <p className="text-xs font-medium text-gray-700 mt-1">{stat}</p>
        )}
      </div>
      <FiChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
};

const ApplicationCard = ({
  application,
  onApprove,
  onReject,
  onStartBilling,
}: {
  application: Application;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onStartBilling: (id: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {application.firstName?.[0]}
              {application.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">
                  {application.firstName} {application.lastName}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(application.status)}`}
                >
                  {application.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {application.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiEye className="w-4 h-4" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Plan</span>
                <p className="font-medium">
                  {application.planId?.name || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Rate</span>
                <p className="font-medium">
                  {formatCurrency(application.planId?.price || 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Building</span>
                <p className="font-medium">
                  {application.buildingId?.buildingName || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Unit</span>
                <p className="font-medium">
                  {application.floor} {application.unitNumber}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">ID Type</span>
                <p className="font-medium">{application.idType}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Submitted</span>
                <p className="font-medium">
                  {formatDate(application.createdAt)}
                </p>
              </div>
            </div>
            {application.adminNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500">Notes</span>
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

const BuildingCard = ({
  building,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  building: Building;
  onEdit: (b: Building) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, s: boolean) => void;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">
              {building.buildingName}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
              <FiMapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{building.streetAddress}</span>
            </p>
            <p className="text-sm text-gray-500 truncate">
              {building.barangay}, {building.city}, {building.province}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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

const PlanCard = ({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  plan: Plan;
  onEdit: (p: Plan) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, s: boolean) => void;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
    <div className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">
              {plan.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <FiWifi className="w-3 h-3" />
              {plan.speed?.download || 0} / {plan.speed?.upload || 0} Mbps
            </span>
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {plan.duration} months
            </span>
          </div>
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
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
          <p className="text-sm text-gray-500">
            {emailEnabled
              ? "Customers receive notifications"
              : "Emails suppressed"}
          </p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={togglingEmail}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
          emailEnabled ? "bg-emerald-500" : "bg-gray-300"
        } ${togglingEmail ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            emailEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  </div>
);

const ActivityFeed = ({
  activities,
  isLoading,
}: {
  activities: ActivityItem[];
  isLoading: boolean;
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "application":
        return <FiFileText className="w-4 h-4" />;
      case "payment":
        return <FiCreditCard className="w-4 h-4" />;
      case "billing":
        return <FiCreditCard className="w-4 h-4" />;
      default:
        return <FiUsers className="w-4 h-4" />;
    }
  };
  const getColor = (type: string) => {
    switch (type) {
      case "application":
        return "bg-blue-100 text-blue-600";
      case "payment":
        return "bg-emerald-100 text-emerald-600";
      case "billing":
        return "bg-violet-100 text-violet-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <FiActivity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.slice(0, 8).map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(activity.type)}`}
          >
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.title}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {activity.description}
            </p>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {new Date(activity.timestamp).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// ADVANCED REVENUE CHART with period selector + hover tooltips
// ============================================================================
const AdvancedRevenueChart = ({
  payments,
  isLoading,
}: {
  payments: any[];
  isLoading: boolean;
}) => {
  const [period, setPeriod] = useState<RevenuePeriod>("7d");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo<RevenueDataPoint[]>(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const completed = payments.filter((p) => p.status === "completed");
    const data: RevenueDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRevenue = completed
        .filter((p) => {
          const d = new Date(p.paidAt || p.createdAt);
          return d >= date && d <= dayEnd;
        })
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const label =
        period === "7d"
          ? date.toLocaleDateString("en-PH", { weekday: "short" })
          : period === "30d"
            ? date.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
              })
            : date.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
              });

      data.push({
        label,
        value: dayRevenue,
        date: date.toISOString(),
        fullDate: date.toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
    }
    return data;
  }, [payments, period]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const totalRevenue = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
  const peakDay = chartData.reduce(
    (max, d) => (d.value > max.value ? d : max),
    chartData[0] || { label: "—", value: 0, date: "", fullDate: "" },
  );

  const displayData = useMemo(() => {
    if (period === "7d") return chartData;
    if (period === "30d") return chartData;
    const buckets: RevenueDataPoint[] = [];
    for (let i = 0; i < chartData.length; i += 7) {
      const slice = chartData.slice(i, i + 7);
      const sum = slice.reduce((s, d) => s + d.value, 0);
      buckets.push({
        label: slice[0]?.label || "",
        value: sum,
        date: slice[0]?.date || "",
        fullDate: `Week of ${slice[0]?.fullDate || ""}`,
      });
    }
    return buckets;
  }, [chartData, period]);

  const displayMax = Math.max(...displayData.map((d) => d.value), 1);
  const displayAvg =
    displayData.length > 0
      ? displayData.reduce((s, d) => s + d.value, 0) / displayData.length
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-64 flex items-end gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t animate-pulse"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-500">
            {period === "7d"
              ? "Last 7 days"
              : period === "30d"
                ? "Last 30 days"
                : "Last 90 days (weekly)"}{" "}
            · Completed payments only
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(
            [
              { key: "7d", label: "7D" },
              { key: "30d", label: "30D" },
              { key: "90d", label: "90D" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setPeriod(opt.key);
                setHoveredIdx(null);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === opt.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {totalRevenue === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
          <FiBarChart2 className="w-10 h-10 mb-2" />
          <p className="text-sm">No revenue data in this period</p>
        </div>
      ) : (
        <div className="relative">
          <div className="h-64 flex items-end gap-1 relative">
            {displayData.map((item, idx) => {
              const heightPercent = Math.max(
                (item.value / displayMax) * 100,
                2,
              );
              const isAboveAvg = item.value >= displayAvg;
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {isHovered && item.value > 0 && (
                    <div className="absolute -top-14 z-20 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                      <div className="font-semibold">
                        {formatCurrency(item.value)}
                      </div>
                      <div className="text-white/60 text-[10px]">
                        {item.fullDate}
                      </div>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t transition-all duration-200 ${
                      isAboveAvg
                        ? isHovered
                          ? "bg-gradient-to-t from-blue-700 to-blue-500"
                          : "bg-gradient-to-t from-blue-600 to-blue-400"
                        : isHovered
                          ? "bg-gradient-to-t from-blue-500 to-blue-300"
                          : "bg-gradient-to-t from-blue-400 to-blue-300"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 mt-2">
            {displayData.map((item, idx) => {
              const step = period === "30d" ? 5 : 1;
              const shouldShow =
                period === "7d" ||
                period === "90d" ||
                idx % step === 0 ||
                idx === displayData.length - 1;
              return (
                <div
                  key={idx}
                  className="flex-1 text-center text-xs text-gray-500 font-medium overflow-hidden"
                >
                  {shouldShow ? item.label : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-base font-bold text-gray-900 truncate">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Average</p>
          <p className="text-base font-bold text-gray-900 truncate">
            {formatCurrency(avgRevenue)}
          </p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Peak Day</p>
          <p className="text-base font-bold text-gray-900 truncate">
            {formatCurrency(peakDay.value)}
          </p>
          <p className="text-[10px] text-gray-400 truncate">{peakDay.label}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Filter Panel
// ============================================================================
interface FilterState {
  search: string;
  status: string;
  buildingId: string;
  planId: string;
  dateFrom: string;
  dateTo: string;
}

const FilterPanel = ({
  filters,
  setFilters,
  buildings,
  plans,
  onReset,
  resultCount,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  buildings: Building[];
  plans: Plan[];
  onReset: () => void;
  resultCount: number;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.buildingId && filters.buildingId !== "all") count++;
    if (filters.planId && filters.planId !== "all") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900">Filters</span>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {activeFilterCount}
            </span>
          )}
          <span className="text-xs text-gray-500 ml-2">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <FiX className="w-3 h-3" /> Clear
            </span>
          )}
          {isOpen ? (
            <FiChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                placeholder="Name, email, phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Building
            </label>
            <select
              value={filters.buildingId}
              onChange={(e) =>
                setFilters({ ...filters, buildingId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Buildings</option>
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.buildingName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plan
            </label>
            <select
              value={filters.planId}
              onChange={(e) =>
                setFilters({ ...filters, planId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date From
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date To
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Billing Paid Card
// ============================================================================
const BillingPaidCard = ({ bill }: { bill: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const customerName =
    extractName(bill.userId) ||
    extractName(bill.applicationId) ||
    bill.customerName ||
    "Unknown Customer";
  const customerEmail =
    extractEmail(bill.userId) ||
    extractEmail(bill.applicationId) ||
    bill.customerEmail ||
    "—";
  const invoiceNumber = bill.invoiceNumber || bill._id?.slice(-8) || "—";
  const paidAt = bill.paidAt || bill.updatedAt || bill.createdAt;
  const amount = Number(bill.total || bill.amount || bill.subtotal || 0);

  return (
    <div className="bg-white rounded-xl border border-emerald-200 hover:shadow-md transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">
                  {customerName}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                  PAID
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{customerEmail}</p>
              <p className="text-xs text-gray-400 mt-1">
                Invoice: {invoiceNumber}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(amount)}
            </p>
            <p className="text-xs text-gray-400">{formatDate(paidAt)}</p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-500 hover:text-blue-700 mt-1"
            >
              {isExpanded ? "Hide" : "Details"}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Billing Period</span>
              <p className="font-medium">
                {bill.billingPeriod?.start
                  ? `${formatDate(bill.billingPeriod.start)} - ${formatDate(bill.billingPeriod.end)}`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Due Date</span>
              <p className="font-medium">{formatDate(bill.dueDate)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Payment Method</span>
              <p className="font-medium">{bill.paymentMethod || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Reference</span>
              <p className="font-medium truncate">
                {bill.referenceNumber || "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Pro-rated</span>
              <p className="font-medium">{bill.isProRated ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Installation</span>
              <p className="font-medium">
                {bill.installationFee > 0
                  ? formatCurrency(bill.installationFee)
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
    pendingApplications: 0,
    totalApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalBills: 0,
    unpaidBills: 0,
    overdueBills: 0,
    paidBills: 0,
    totalBuildings: 0,
    activeBuildings: 0,
    totalPlans: 0,
    activePlans: 0,
    totalPendingPayments: 0,
    pendingPaymentsAmount: 0,
    completedPaymentsAmount: 0,
    completedPaymentsCount: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    avgRevenuePerUser: 0,
  });

  // Applications
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appFilters, setAppFilters] = useState<FilterState>({
    search: "",
    status: "all",
    buildingId: "all",
    planId: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Billing Paid
  const [paidBills, setPaidBills] = useState<any[]>([]);
  const [isLoadingPaidBills, setIsLoadingPaidBills] = useState(false);
  const [billingFilters, setBillingFilters] = useState<FilterState>({
    search: "",
    status: "all",
    buildingId: "all",
    planId: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Buildings
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

  // Plans
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

  // Report Modals
  const [showApplicationReport, setShowApplicationReport] = useState(false);
  const [showBillingReport, setShowBillingReport] = useState(false);
  const [showPaymentReport, setShowPaymentReport] = useState(false);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [paymentGroups, setPaymentGroups] = useState<PaymentGroup[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingPaymentReport, setIsLoadingPaymentReport] = useState(false);

  // Activities
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Raw data
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Debounced
  const debouncedBuildingSearch = useDebounce(buildingSearchTerm, 300);
  const debouncedPlanSearch = useDebounce(planSearchTerm, 300);

  // ==========================================================================
  // Compute stats
  // ==========================================================================
  const computeStatsFromData = useCallback(
    (
      users: any[],
      apps: any[],
      bills: any[],
      payments: any[],
      buildingsList: Building[],
      plansList: Plan[],
    ): DashboardStats => {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
      );

      const completed = payments.filter((p) => p.status === "completed");
      const pending = payments.filter(
        (p) => p.status === "pending" || p.status === "processing",
      );

      const totalCompleted = completed.reduce(
        (s, p) => s + Number(p.amount || 0),
        0,
      );

      const sumInRange = (start: Date, end?: Date) =>
        completed
          .filter((p) => {
            const d = new Date(p.paidAt || p.createdAt);
            return d >= start && (!end || d <= end);
          })
          .reduce((s, p) => s + Number(p.amount || 0), 0);

      const todayRevenue = sumInRange(todayStart);
      const weekRevenue = sumInRange(weekStart);
      const monthRevenue = sumInRange(monthStart);
      const lastMonthRevenue = sumInRange(lastMonthStart, lastMonthEnd);

      const pendingAmount = pending.reduce(
        (s, p) => s + Number(p.amount || 0),
        0,
      );

      const unpaidBillsCount = bills.filter((b) =>
        isUnpaidStatus(b.status),
      ).length;
      const overdueBillsCount = bills.filter(
        (b) => b.status === "overdue",
      ).length;
      const paidBillsCount = bills.filter((b) => isPaidStatus(b.status)).length;

      const nonAdminUsers = users.filter((u) => u.role !== "admin");

      return {
        totalUsers: nonAdminUsers.length,
        totalPayments: totalCompleted,
        monthlyRevenue: monthRevenue,
        pendingApplications: apps.filter((a) => a.status === "pending").length,
        totalApplications: apps.length,
        approvedApplications: apps.filter((a) => a.status === "approved")
          .length,
        rejectedApplications: apps.filter((a) => a.status === "rejected")
          .length,
        totalBills: bills.length,
        unpaidBills: unpaidBillsCount,
        overdueBills: overdueBillsCount,
        paidBills: paidBillsCount,
        totalBuildings: buildingsList.length,
        activeBuildings: buildingsList.filter((b) => b.isActive).length,
        totalPlans: plansList.length,
        activePlans: plansList.filter((p) => p.isActive).length,
        totalPendingPayments: pending.length,
        pendingPaymentsAmount: pendingAmount,
        completedPaymentsAmount: totalCompleted,
        completedPaymentsCount: completed.length,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        lastMonthRevenue,
        avgRevenuePerUser:
          nonAdminUsers.length > 0 ? totalCompleted / nonAdminUsers.length : 0,
      };
    },
    [],
  );

  // ==========================================================================
  // Fetch all
  // ==========================================================================
  const fetchAllData = useCallback(
    async (showToast = false) => {
      setIsLoadingStats(true);
      setIsLoadingApps(true);
      setIsLoadingBuildings(true);
      setIsLoadingPlans(true);
      setIsLoadingActivities(true);

      try {
        const [
          usersResult,
          appsResult,
          billsResult,
          paymentsResult,
          buildingsResult,
          plansResult,
          activitiesResult,
          emailResult,
        ] = await Promise.allSettled([
          getAllUsers({ forceRefresh: true, limit: 10000 }),
          getAllApplications({ forceRefresh: true, limit: 10000 }),
          getAllBills({ forceRefresh: true, limit: 10000 }),
          getAllPayments({ forceRefresh: true, limit: 10000 }),
          getAllBuildings({ limit: 10000, forceRefresh: true }),
          getPlans(true),
          getRecentActivities(),
          getCustomerEmailAlertsPreference(true),
        ]);

        const users =
          usersResult.status === "fulfilled"
            ? usersResult.value.data || []
            : [];
        const apps =
          appsResult.status === "fulfilled" ? appsResult.value.data || [] : [];
        const bills =
          billsResult.status === "fulfilled"
            ? billsResult.value.data || []
            : [];
        const payments =
          paymentsResult.status === "fulfilled"
            ? paymentsResult.value.data || []
            : [];
        const buildingsData =
          buildingsResult.status === "fulfilled"
            ? buildingsResult.value.data || []
            : [];
        const plansData =
          plansResult.status === "fulfilled" ? plansResult.value || [] : [];
        const activitiesData =
          activitiesResult.status === "fulfilled"
            ? activitiesResult.value || []
            : [];
        const emailData =
          emailResult.status === "fulfilled" ? emailResult.value : null;

        setApplications(apps);
        setBuildings(buildingsData);
        setPlans(plansData);
        setAllPayments(payments);
        setAllBills(bills);
        setAllUsers(users);

        const paid = bills.filter((b: any) => isPaidStatus(b.status));
        setPaidBills(paid);

        setStats(
          computeStatsFromData(
            users,
            apps,
            bills,
            payments,
            buildingsData,
            plansData,
          ),
        );

        if (emailData?.data?.customerEmailAlertsEnabled !== undefined) {
          setEmailEnabled(emailData.data.customerEmailAlertsEnabled);
        }

        const builtActivities: ActivityItem[] = [];
        if (Array.isArray(activitiesData)) {
          activitiesData.forEach((act: any, idx: number) => {
            builtActivities.push({
              id: act._id || act.id || `api-act-${idx}`,
              type: act.type || "user",
              title: act.title || act.description || "Activity",
              description: act.message || act.description || "",
              timestamp:
                act.createdAt || act.timestamp || new Date().toISOString(),
              status: act.status,
            });
          });
        }
        apps.slice(0, 5).forEach((app: any) => {
          builtActivities.push({
            id: `app-${app._id}`,
            type: "application",
            title: `${app.firstName || "Customer"} ${app.lastName || ""} submitted an application`,
            description: `${app.email || ""} - ${app.status || "pending"}`,
            timestamp: app.createdAt || new Date().toISOString(),
            status: app.status,
          });
        });
        payments.slice(0, 5).forEach((payment: any) => {
          builtActivities.push({
            id: `pay-${payment._id}`,
            type: "payment",
            title: `Payment of ${formatCurrency(payment.amount || 0)} - ${payment.status || "completed"}`,
            description:
              payment.customerName ||
              payment.referenceNumber ||
              "Payment transaction",
            timestamp:
              payment.paidAt || payment.createdAt || new Date().toISOString(),
            status: payment.status,
          });
        });

        const seen = new Set<string>();
        setRecentActivities(
          builtActivities
            .filter((a) => {
              if (seen.has(a.id)) return false;
              seen.add(a.id);
              return true;
            })
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )
            .slice(0, 15),
        );

        setLastUpdated(new Date());
        if (showToast) toast.success("Dashboard refreshed");
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        if (showToast) toast.error("Failed to refresh dashboard");
      } finally {
        setIsLoadingStats(false);
        setIsLoadingApps(false);
        setIsLoadingBuildings(false);
        setIsLoadingPlans(false);
        setIsLoadingActivities(false);
      }
    },
    [computeStatsFromData],
  );

  // ==========================================================================
  // Fetch customers for billing report
  // ==========================================================================
  const fetchCustomersForBilling = useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const [usersResult, appsResult, billsResult] = await Promise.all([
        getAllUsers({ forceRefresh: true, limit: 10000 }),
        getAllApplications({ forceRefresh: true, limit: 10000 }),
        getAllBills({ forceRefresh: true, limit: 10000 }),
      ]);

      const users = usersResult.data || [];
      const apps = appsResult.data || [];
      const bills = billsResult.data || [];

      const billsByIdentifier: Record<string, any[]> = {};
      bills.forEach((bill: any) => {
        const ids: string[] = [];
        const userId = extractId(bill.userId);
        if (userId) ids.push(userId);
        const appId = extractId(bill.applicationId);
        if (appId) ids.push(appId);
        const cycleId = extractId(bill.billingCycleId);
        if (cycleId) ids.push(cycleId);
        const email =
          extractEmail(bill.userId) || extractEmail(bill.customerEmail);
        if (email) ids.push(email.toLowerCase());
        const appEmail = extractEmail(bill.applicationId);
        if (appEmail) ids.push(appEmail.toLowerCase());

        ids.forEach((id) => {
          if (!billsByIdentifier[id]) billsByIdentifier[id] = [];
          billsByIdentifier[id].push(bill);
        });
      });

      const getBillsForCustomer = (
        customerId: string,
        email?: string,
        appId?: string,
      ): any[] => {
        const seen = new Set<string>();
        const out: any[] = [];
        const add = (arr?: any[]) => {
          if (!arr) return;
          arr.forEach((b) => {
            if (b._id && !seen.has(b._id)) {
              seen.add(b._id);
              out.push(b);
            }
          });
        };
        add(billsByIdentifier[customerId]);
        if (appId) add(billsByIdentifier[appId]);
        if (email) add(billsByIdentifier[email.toLowerCase()]);
        return out;
      };

      const items: CustomerItem[] = [];

      users.forEach((user: any) => {
        if (user.role === "admin") return;
        const appId = user.applicationId || "";
        const all = getBillsForCustomer(user._id, user.email, appId);
        const unpaid = all.filter((b) => isUnpaidStatus(b.status));
        const overdue = unpaid.filter((b) => b.status === "overdue");
        items.push({
          _id: user._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          username: user.username,
          phoneNumber: user.phoneNumber || "",
          status: user.status || "active",
          type: "user",
          planName: user.planId?.name || "No Plan",
          planPrice: user.planId?.price || 0,
          currentBalance: unpaid.reduce(
            (s, b) => s + Number(b.total || b.amount || 0),
            0,
          ),
          unpaidBills: unpaid,
          overdueBills: overdue,
          billingCycle: user.billingCycle,
          applicationId: appId || user.username || "",
          installationFee: user.installationFee || 0,
          installationFeePaid: user.installationFeePaid || false,
          building: user.buildingId
            ? {
                _id: extractId(user.buildingId),
                buildingName: user.buildingId.buildingName || "Unknown",
                streetAddress: user.buildingId.streetAddress,
                city: user.buildingId.city,
              }
            : null,
          unitNumber: user.unitNumber,
          floor: user.floor,
        });
      });

      apps.forEach((app: any) => {
        if (app.status !== "approved") return;
        const appIdStr = app.applicationId || "";
        const all = getBillsForCustomer(app._id, app.email, appIdStr);
        const unpaid = all.filter((b) => isUnpaidStatus(b.status));
        const overdue = unpaid.filter((b) => b.status === "overdue");
        items.push({
          _id: app._id,
          firstName: app.firstName || "",
          lastName: app.lastName || "",
          email: app.email || "",
          phoneNumber: app.phoneNumber || "",
          status: app.status || "active",
          type: "application",
          planName: app.planId?.name || "No Plan",
          planPrice: app.planId?.price || 0,
          currentBalance: unpaid.reduce(
            (s, b) => s + Number(b.total || b.amount || 0),
            0,
          ),
          unpaidBills: unpaid,
          overdueBills: overdue,
          billingCycle: app.billingCycle,
          applicationId: appIdStr,
          installationFee: app.installationFee || 0,
          installationFeePaid: app.installationFeePaid || false,
          building: app.buildingId
            ? {
                _id: extractId(app.buildingId),
                buildingName: app.buildingId.buildingName || "Unknown",
                streetAddress: app.buildingId.streetAddress,
                city: app.buildingId.city,
              }
            : null,
          unitNumber: app.unitNumber,
          floor: app.floor,
        });
      });

      setCustomerItems(items);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      toast.error("Unable to load customer data");
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // ==========================================================================
  // Fetch payment groups
  // ==========================================================================
  const fetchPaymentGroups = useCallback(async () => {
    setIsLoadingPaymentReport(true);
    try {
      const result = await getAllPayments({
        forceRefresh: true,
        limit: 10000,
      });
      const payments = result.data || [];
      const groupsMap = new Map<string, PaymentGroup>();

      payments.forEach((p: any) => {
        const userId = extractId(p.userId);
        const appId = extractId(p.applicationId);
        const email = extractEmail(p.userId) || p.customerEmail || "";
        const customerId = userId || appId || email || p._id;

        if (!groupsMap.has(customerId)) {
          const userObj = typeof p.userId === "object" ? p.userId : null;
          const appObj =
            typeof p.applicationId === "object" ? p.applicationId : null;
          const name =
            extractName(userObj) ||
            extractName(appObj) ||
            p.customerName ||
            "Unknown Customer";
          const buildingId =
            extractId(userObj?.buildingId) ||
            extractId(appObj?.buildingId) ||
            extractId(p.buildingId);
          const buildingName =
            userObj?.buildingId?.buildingName ||
            appObj?.buildingId?.buildingName ||
            p.buildingId?.buildingName ||
            "";

          groupsMap.set(customerId, {
            customerId,
            customerInfo: {
              name,
              email: userObj?.email || appObj?.email || p.customerEmail || "—",
              phone:
                userObj?.phoneNumber ||
                appObj?.phoneNumber ||
                p.customerPhone ||
                "—",
              applicationId:
                appObj?.applicationId || appId || userObj?.username || "—",
              buildingId: buildingId || undefined,
              buildingName: buildingName || undefined,
            },
            payments: [],
            totalAmount: 0,
            totalPaidAmount: 0,
            totalPendingAmount: 0,
            paymentCount: 0,
            lastPaymentDate: p.createdAt,
            firstPaymentDate: p.createdAt,
            hasPendingPayments: false,
          });
        }

        const group = groupsMap.get(customerId)!;
        group.payments.push(p);
        group.totalAmount += Number(p.amount) || 0;
        group.paymentCount++;
        if (p.status === "completed")
          group.totalPaidAmount += Number(p.amount) || 0;
        else if (p.status === "pending") {
          group.totalPendingAmount += Number(p.amount) || 0;
          group.hasPendingPayments = true;
        }
        if (new Date(p.createdAt) > new Date(group.lastPaymentDate))
          group.lastPaymentDate = p.createdAt;
        if (new Date(p.createdAt) < new Date(group.firstPaymentDate))
          group.firstPaymentDate = p.createdAt;
      });

      setPaymentGroups(Array.from(groupsMap.values()));
    } catch (err) {
      console.error("Failed to fetch payment groups:", err);
      toast.error("Unable to load payment data");
    } finally {
      setIsLoadingPaymentReport(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApproveApplication = async (id: string) => {
    try {
      await approveApplication(id);
      toast.success("Application approved");
      await fetchAllData();
    } catch {
      toast.error("Failed to approve application");
    }
  };

  const handleRejectApplication = async (id: string) => {
    const notes = prompt("Please provide rejection reason:");
    if (notes === null) return;
    try {
      await rejectApplication(id, notes || undefined);
      toast.success("Application rejected");
      await fetchAllData();
    } catch {
      toast.error("Failed to reject application");
    }
  };

  const handleStartBilling = async (id: string) => {
    const includeFee = confirm("Include installation fee?");
    try {
      await startBillingForApplication(id, {
        includeInstallationFee: includeFee,
      });
      toast.success("Billing started");
      await fetchAllData();
    } catch {
      toast.error("Failed to start billing");
    }
  };

  const handleCreateBuilding = async () => {
    if (!buildingForm.buildingName || !buildingForm.city) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await createBuilding(buildingForm);
      toast.success("Building created");
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
      await fetchAllData();
    } catch {
      toast.error("Failed to create building");
    }
  };

  const handleUpdateBuilding = async () => {
    if (!editingBuilding) return;
    try {
      await updateBuilding(editingBuilding._id, buildingForm);
      toast.success("Building updated");
      setShowBuildingModal(false);
      setEditingBuilding(null);
      await fetchAllData();
    } catch {
      toast.error("Failed to update building");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm("Delete this building?")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted");
      await fetchAllData();
    } catch {
      toast.error("Failed to delete building");
    }
  };

  const handleToggleBuildingStatus = async (id: string, current: boolean) => {
    try {
      await updateBuilding(id, { isActive: !current });
      toast.success(`Building ${!current ? "activated" : "deactivated"}`);
      await fetchAllData();
    } catch {
      toast.error("Failed to update building");
    }
  };

  const openBuildingModal = (b?: Building) => {
    if (b) {
      setEditingBuilding(b);
      setBuildingForm({
        buildingName: b.buildingName,
        region: b.region || "",
        province: b.province || "",
        city: b.city || "",
        barangay: b.barangay || "",
        streetAddress: b.streetAddress || "",
        zipCode: b.zipCode || "",
        isActive: b.isActive,
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

  const handleCreatePlan = async () => {
    if (!planForm.name || planForm.price <= 0) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await createPlan(planForm);
      toast.success("Plan created");
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
      await fetchAllData();
    } catch {
      toast.error("Failed to create plan");
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      await updatePlan(editingPlan._id, planForm);
      toast.success("Plan updated");
      setShowPlanModal(false);
      setEditingPlan(null);
      await fetchAllData();
    } catch {
      toast.error("Failed to update plan");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    try {
      await deletePlan(id);
      toast.success("Plan deleted");
      await fetchAllData();
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  const handleTogglePlanStatus = async (id: string, current: boolean) => {
    try {
      await updatePlan(id, { isActive: !current });
      toast.success(`Plan ${!current ? "activated" : "deactivated"}`);
      await fetchAllData();
    } catch {
      toast.error("Failed to update plan");
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

  const removeFeature = (i: number) => {
    setPlanForm({
      ...planForm,
      features: planForm.features.filter((_, idx) => idx !== i),
    });
  };

  const openPlanModal = (p?: Plan) => {
    if (p) {
      setEditingPlan(p);
      setPlanForm({
        name: p.name,
        description: p.description || "",
        price: p.price,
        speed: p.speed || { download: 0, upload: 0 },
        features: p.features || [],
        duration: p.duration || 1,
        mikrotikProfile: p.mikrotikProfile || "",
        isActive: p.isActive,
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

  const handleToggleEmail = async () => {
    setTogglingEmail(true);
    try {
      const newState = !emailEnabled;
      const result = await toggleCustomerEmailAlerts(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(`Email alerts ${newState ? "enabled" : "disabled"}`);
      }
    } catch {
      toast.error("Failed to toggle email");
    } finally {
      setTogglingEmail(false);
    }
  };

  const handleFetchAllApplications = useCallback(
    async (filters?: {
      buildingId?: string;
      status?: string;
      search?: string;
    }) => {
      const res = await getAllApplications({
        forceRefresh: true,
        limit: 10000,
        ...filters,
      });
      return (res.data || []) as Application[];
    },
    [],
  );

  const openApplicationReport = () => setShowApplicationReport(true);
  const openBillingReport = async () => {
    await fetchCustomersForBilling();
    setShowBillingReport(true);
  };
  const openPaymentReport = async () => {
    await fetchPaymentGroups();
    setShowPaymentReport(true);
  };

  // ==========================================================================
  // Filtered lists
  // ==========================================================================
  const filterApplications = useCallback(
    (list: Application[], f: FilterState): Application[] => {
      return list.filter((app) => {
        const search = f.search.toLowerCase().trim();
        const matchesSearch =
          !search ||
          `${app.firstName} ${app.lastName}`.toLowerCase().includes(search) ||
          app.email.toLowerCase().includes(search) ||
          app.phoneNumber?.toLowerCase().includes(search) ||
          app.applicationId?.toLowerCase().includes(search);

        const matchesStatus = f.status === "all" || app.status === f.status;

        const matchesBuilding =
          f.buildingId === "all" || extractId(app.buildingId) === f.buildingId;

        const matchesPlan =
          f.planId === "all" || extractId(app.planId) === f.planId;

        const created = new Date(app.createdAt || app.submittedAt || 0);
        const matchesFrom =
          !f.dateFrom || created >= new Date(f.dateFrom + "T00:00:00");
        const matchesTo =
          !f.dateTo || created <= new Date(f.dateTo + "T23:59:59");

        return (
          matchesSearch &&
          matchesStatus &&
          matchesBuilding &&
          matchesPlan &&
          matchesFrom &&
          matchesTo
        );
      });
    },
    [],
  );

  const filteredApplications = useMemo(
    () => filterApplications(applications, appFilters),
    [applications, appFilters, filterApplications],
  );

  const filteredPaidBills = useMemo(() => {
    return paidBills.filter((bill) => {
      const name =
        extractName(bill.userId) ||
        extractName(bill.applicationId) ||
        bill.customerName ||
        "";
      const email =
        extractEmail(bill.userId) ||
        extractEmail(bill.applicationId) ||
        bill.customerEmail ||
        "";
      const search = billingFilters.search.toLowerCase().trim();
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search) ||
        (bill.invoiceNumber || "").toLowerCase().includes(search) ||
        (bill.referenceNumber || "").toLowerCase().includes(search);

      const billBuildingId =
        extractId(bill.buildingId) ||
        extractId(bill.userId?.buildingId) ||
        extractId(bill.applicationId?.buildingId);
      const matchesBuilding =
        billingFilters.buildingId === "all" ||
        billBuildingId === billingFilters.buildingId;

      const billPlanId =
        extractId(bill.planId) ||
        extractId(bill.userId?.planId) ||
        extractId(bill.applicationId?.planId);
      const matchesPlan =
        billingFilters.planId === "all" || billPlanId === billingFilters.planId;

      const paidAt = new Date(bill.paidAt || bill.updatedAt || bill.createdAt);
      const matchesFrom =
        !billingFilters.dateFrom ||
        paidAt >= new Date(billingFilters.dateFrom + "T00:00:00");
      const matchesTo =
        !billingFilters.dateTo ||
        paidAt <= new Date(billingFilters.dateTo + "T23:59:59");

      return (
        matchesSearch &&
        matchesBuilding &&
        matchesPlan &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [paidBills, billingFilters]);

  const filteredBuildings = useMemo(
    () =>
      buildings.filter(
        (b) =>
          debouncedBuildingSearch === "" ||
          b.buildingName
            .toLowerCase()
            .includes(debouncedBuildingSearch.toLowerCase()),
      ),
    [buildings, debouncedBuildingSearch],
  );

  const filteredPlans = useMemo(
    () =>
      plans.filter(
        (p) =>
          debouncedPlanSearch === "" ||
          p.name.toLowerCase().includes(debouncedPlanSearch.toLowerCase()),
      ),
    [plans, debouncedPlanSearch],
  );

  const pendingAppsCount = useMemo(
    () => applications.filter((a) => a.status === "pending").length,
    [applications],
  );

  const monthlyTrend = useMemo(() => {
    const change = calcPercentChange(
      stats.monthRevenue,
      stats.lastMonthRevenue,
    );
    return {
      trend:
        change > 0
          ? ("up" as const)
          : change < 0
            ? ("down" as const)
            : ("neutral" as const),
      value: change,
    };
  }, [stats.monthRevenue, stats.lastMonthRevenue]);

  const paidTotalAmount = useMemo(
    () =>
      filteredPaidBills.reduce(
        (s, b) => s + Number(b.total || b.amount || 0),
        0,
      ),
    [filteredPaidBills],
  );

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FiBarChart2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/60 text-xs font-mono tracking-wider uppercase">
                  Admin Dashboard
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Admin Control Center
              </h1>
              <p className="text-white/50 mt-1 text-sm">
                Manage reports, applications, buildings, and service plans
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <FiClock className="w-4 h-4 text-white/60" />
                <span className="text-white/80 text-sm">
                  {lastUpdated.toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all backdrop-blur-sm disabled:opacity-50"
              >
                <FiRefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* PRIMARY STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <AdvancedStatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalPayments)}
            icon={FiTrendingUp}
            color="green"
            subtitle={`${stats.completedPaymentsCount} completed payments`}
            trend={monthlyTrend.trend}
            trendValue={monthlyTrend.value}
            isLoading={isLoadingStats}
          />
          <AdvancedStatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthRevenue)}
            icon={FiTrendingUp}
            color="blue"
            subtitle={`Last month: ${formatCurrency(stats.lastMonthRevenue)}`}
            trend={monthlyTrend.trend}
            trendValue={monthlyTrend.value}
            isLoading={isLoadingStats}
          />
          <AdvancedStatCard
            title="Total Customers"
            value={formatNumber(stats.totalUsers)}
            icon={FiUsers}
            color="purple"
            subtitle={`Avg ${formatCurrency(stats.avgRevenuePerUser)}/user`}
            isLoading={isLoadingStats}
          />
          <AdvancedStatCard
            title="Pending Applications"
            value={formatNumber(stats.pendingApplications)}
            icon={FiUserCheck}
            color="amber"
            subtitle={`${stats.totalApplications} total applications`}
            isLoading={isLoadingStats}
          />
        </div>

        {/* SECONDARY METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MiniStatCard
            title="Applications"
            value={stats.totalApplications}
            icon={FiFileText}
            color="blue"
            onClick={() => setActiveTab("applications")}
            active={activeTab === "applications"}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Approved"
            value={stats.approvedApplications}
            icon={FiCheckCircle}
            color="green"
            onClick={() => {
              setActiveTab("applications");
              setAppFilters({ ...appFilters, status: "approved" });
            }}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Paid Bills"
            value={stats.paidBills}
            icon={FiCreditCard}
            color="green"
            onClick={() => setActiveTab("billing-paid")}
            active={activeTab === "billing-paid"}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Unpaid Bills"
            value={stats.unpaidBills}
            icon={FiAlertCircle}
            color="amber"
            onClick={openBillingReport}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Overdue"
            value={stats.overdueBills}
            icon={FiTrendingDown}
            color="rose"
            onClick={openBillingReport}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Buildings"
            value={`${stats.activeBuildings}/${stats.totalBuildings}`}
            icon={FiHome}
            color="purple"
            onClick={() => setActiveTab("buildings")}
            active={activeTab === "buildings"}
            isLoading={isLoadingStats}
          />
          <MiniStatCard
            title="Plans"
            value={`${stats.activePlans}/${stats.totalPlans}`}
            icon={FiWifi}
            color="gray"
            onClick={() => setActiveTab("plans")}
            active={activeTab === "plans"}
            isLoading={isLoadingStats}
          />
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="xl:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
              <div className="flex gap-1 overflow-x-auto">
                <TabButton
                  label="Overview"
                  icon={FiLayers}
                  isActive={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                />
                <TabButton
                  label="Reports"
                  icon={FiPieChart}
                  isActive={activeTab === "reports"}
                  onClick={() => setActiveTab("reports")}
                />
                <TabButton
                  label="Applications"
                  icon={FiFileText}
                  isActive={activeTab === "applications"}
                  onClick={() => setActiveTab("applications")}
                  count={pendingAppsCount}
                />
                <TabButton
                  label="Billing Paid"
                  icon={FiCheckCircle}
                  isActive={activeTab === "billing-paid"}
                  onClick={() => setActiveTab("billing-paid")}
                  count={stats.paidBills}
                />
                <TabButton
                  label="Buildings"
                  icon={FiHome}
                  isActive={activeTab === "buildings"}
                  onClick={() => setActiveTab("buildings")}
                />
                <TabButton
                  label="Plans"
                  icon={FiWifi}
                  isActive={activeTab === "plans"}
                  onClick={() => setActiveTab("plans")}
                />
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <AdvancedRevenueChart
                    payments={allPayments}
                    isLoading={isLoadingStats}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <QuickActionCard
                        title="Application Report"
                        description="Export applications data"
                        icon={FiFileText}
                        color="blue"
                        onClick={openApplicationReport}
                        stat={`${stats.totalApplications} records`}
                      />
                      <QuickActionCard
                        title="Billing Report"
                        description="Unpaid & overdue bills"
                        icon={FiCreditCard}
                        color="green"
                        onClick={openBillingReport}
                        isLoading={isLoadingCustomers}
                        badge={
                          stats.unpaidBills + stats.overdueBills > 0
                            ? `${stats.unpaidBills + stats.overdueBills}`
                            : undefined
                        }
                        stat={`${stats.unpaidBills} unpaid • ${stats.overdueBills} overdue`}
                      />
                      <QuickActionCard
                        title="Payment Report"
                        description="Transaction history"
                        icon={FiCreditCard}
                        color="purple"
                        onClick={openPaymentReport}
                        isLoading={isLoadingPaymentReport}
                        stat={`${stats.completedPaymentsCount} completed`}
                      />
                    </div>
                  </div>
                  <EmailToggleCard
                    emailEnabled={emailEnabled}
                    togglingEmail={togglingEmail}
                    onToggle={handleToggleEmail}
                  />
                </div>
              )}

              {/* REPORTS */}
              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Generate Reports
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Export comprehensive data for analysis
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <QuickActionCard
                        title="Application Report"
                        description="Export applications as PDF or Excel with filters"
                        icon={FiFileText}
                        color="blue"
                        onClick={openApplicationReport}
                        stat={`${stats.totalApplications} records`}
                      />
                      <QuickActionCard
                        title="Billing Report"
                        description="Unpaid bills, overdue & installation fees breakdown"
                        icon={FiCreditCard}
                        color="green"
                        onClick={openBillingReport}
                        isLoading={isLoadingCustomers}
                        stat={`${stats.unpaidBills} unpaid • ${stats.overdueBills} overdue`}
                      />
                      <QuickActionCard
                        title="Payment Report"
                        description="Complete transaction history & analytics"
                        icon={FiCreditCard}
                        color="purple"
                        onClick={openPaymentReport}
                        isLoading={isLoadingPaymentReport}
                        stat={`${stats.completedPaymentsCount} completed`}
                      />
                    </div>
                  </div>
                  <EmailToggleCard
                    emailEnabled={emailEnabled}
                    togglingEmail={togglingEmail}
                    onToggle={handleToggleEmail}
                  />
                </div>
              )}

              {/* APPLICATIONS */}
              {activeTab === "applications" && (
                <div className="space-y-4">
                  <FilterPanel
                    filters={appFilters}
                    setFilters={setAppFilters}
                    buildings={buildings}
                    plans={plans}
                    resultCount={filteredApplications.length}
                    onReset={() =>
                      setAppFilters({
                        search: "",
                        status: "all",
                        buildingId: "all",
                        planId: "all",
                        dateFrom: "",
                        dateTo: "",
                      })
                    }
                  />

                  {isLoadingApps ? (
                    <div className="flex justify-center py-12">
                      <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No applications found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredApplications.map((app) => (
                        <ApplicationCard
                          key={app._id}
                          application={app}
                          onApprove={handleApproveApplication}
                          onReject={handleRejectApplication}
                          onStartBilling={handleStartBilling}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BILLING PAID */}
              {activeTab === "billing-paid" && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FiCheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-900">
                          Paid Bills
                        </p>
                        <p className="text-xs text-emerald-700">
                          {filteredPaidBills.length} bill
                          {filteredPaidBills.length !== 1 ? "s" : ""} • Total:{" "}
                          {formatCurrency(paidTotalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <FilterPanel
                    filters={billingFilters}
                    setFilters={setBillingFilters}
                    buildings={buildings}
                    plans={plans}
                    resultCount={filteredPaidBills.length}
                    onReset={() =>
                      setBillingFilters({
                        search: "",
                        status: "all",
                        buildingId: "all",
                        planId: "all",
                        dateFrom: "",
                        dateTo: "",
                      })
                    }
                  />

                  {isLoadingPaidBills ? (
                    <div className="flex justify-center py-12">
                      <FiLoader className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                  ) : filteredPaidBills.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No paid bills found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {filteredPaidBills.map((bill) => (
                        <BillingPaidCard key={bill._id} bill={bill} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BUILDINGS */}
              {activeTab === "buildings" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search buildings..."
                        value={buildingSearchTerm}
                        onChange={(e) => setBuildingSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => openBuildingModal()}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-md shadow-blue-500/25"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add Building
                    </button>
                  </div>
                  {isLoadingBuildings ? (
                    <div className="flex justify-center py-12">
                      <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : filteredBuildings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FiHome className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No buildings found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredBuildings.map((b) => (
                        <BuildingCard
                          key={b._id}
                          building={b}
                          onEdit={openBuildingModal}
                          onDelete={handleDeleteBuilding}
                          onToggleStatus={handleToggleBuildingStatus}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PLANS */}
              {activeTab === "plans" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search plans..."
                        value={planSearchTerm}
                        onChange={(e) => setPlanSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => openPlanModal()}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-md shadow-blue-500/25"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add Plan
                    </button>
                  </div>
                  {isLoadingPlans ? (
                    <div className="flex justify-center py-12">
                      <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : filteredPlans.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <FiWifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No plans found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredPlans.map((p) => (
                        <PlanCard
                          key={p._id}
                          plan={p}
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

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FiActivity className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">
                    Recent Activity
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  {recentActivities.length} events
                </span>
              </div>
              <ActivityFeed
                activities={recentActivities}
                isLoading={isLoadingActivities}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiServer className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">System Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">API Status</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Database</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Email Service</span>
                  <span
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      emailEnabled ? "text-emerald-600" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        emailEnabled ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    {emailEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Last Sync</span>
                  <span className="text-sm font-medium text-gray-700">
                    {lastUpdated.toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiTrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">
                  Revenue Breakdown
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Today</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(stats.todayRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">This Week</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(stats.weekRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">This Month</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(stats.monthRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Last Month</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(stats.lastMonthRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Pending Amount</span>
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(stats.pendingPaymentsAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <FiDatabase className="w-5 h-5 text-white/70" />
                <h3 className="font-semibold">Data Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Applications</span>
                  <span className="font-semibold">
                    {formatNumber(stats.totalApplications)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Total Bills</span>
                  <span className="font-semibold">
                    {formatNumber(stats.totalBills)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Paid Bills</span>
                  <span className="font-semibold text-emerald-400">
                    {formatNumber(stats.paidBills)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Buildings</span>
                  <span className="font-semibold">{stats.totalBuildings}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Plans</span>
                  <span className="font-semibold">{stats.totalPlans}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/60">Users</span>
                  <span className="font-semibold">
                    {formatNumber(stats.totalUsers)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 pb-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Live Database
            </span>
            <span>•</span>
            <span>
              Last sync:{" "}
              {lastUpdated.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">v5.1</span>
        </div>
      </div>

      {/* BUILDING MODAL */}
      {showBuildingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBuilding ? "Edit Building" : "Add Building"}
              </h2>
              <button
                onClick={() => setShowBuildingModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Tower A"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 123 Main Street"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Manila"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Metro Manila"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Barangay 1"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
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
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Building is active
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowBuildingModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={
                  editingBuilding ? handleUpdateBuilding : handleCreateBuilding
                }
                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md shadow-blue-500/25"
              >
                {editingBuilding ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPlan ? "Edit Plan" : "Add Plan"}
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Fiber 100"
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
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download (Mbps)
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload (Mbps)
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add feature..."
                  />
                  <button
                    onClick={addFeature}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {planForm.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg"
                    >
                      {feature}
                      <button
                        onClick={() => removeFeature(idx)}
                        className="hover:text-blue-900"
                      >
                        <FiXCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="planIsActive"
                  checked={planForm.isActive}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <label htmlFor="planIsActive" className="text-sm text-gray-700">
                  Plan is active
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-md shadow-blue-500/25"
              >
                {editingPlan ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODALS */}
      <ApplicationReportDownload
        isOpen={showApplicationReport}
        onClose={() => setShowApplicationReport(false)}
        buildings={buildings.map((b) => ({
          _id: b._id,
          buildingName: b.buildingName,
          isActive: b.isActive,
        }))}
        plans={plans.map((p) => ({
          _id: p._id,
          name: p.name,
          price: p.price,
        }))}
        onFetchAllApplications={handleFetchAllApplications}
        currentFilters={{
          status: appFilters.status !== "all" ? appFilters.status : undefined,
          search: appFilters.search || undefined,
        }}
      />

      <BillingReportsWithDownload
        isOpen={showBillingReport}
        onClose={() => setShowBillingReport(false)}
        customers={customerItems}
        buildings={buildings.map((b) => ({
          _id: b._id,
          buildingName: b.buildingName,
          streetAddress: b.streetAddress || "",
          city: b.city || "",
          isActive: b.isActive,
        }))}
        onMarkBillAsPaid={(bill, customer) => {
          toast.success(
            `Marked bill as paid for ${customer.firstName} ${customer.lastName}`,
          );
        }}
        onMarkInstallationBillAsPaid={(bill, customer) => {
          toast.success(
            `Marked installation fee as paid for ${customer.firstName} ${customer.lastName}`,
          );
        }}
      />

      {showPaymentReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiCreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Payment Report
                  </h2>
                  <p className="text-xs text-gray-500">
                    Transaction history & analytics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentReport(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <PaymentReport
                paymentGroups={paymentGroups}
                buildings={buildings.map((b) => ({
                  _id: b._id,
                  name: b.buildingName,
                  address: b.streetAddress || "",
                }))}
                buildingFilter={""}
                dateRangeStart={""}
                dateRangeEnd={""}
                statusFilter={""}
                paymentTypeFilter={""}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
