"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "@/services/admin";
import { getAllPayments } from "@/services/payment";
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

// Import the 3 report components
import ApplicationReportDownload from "@/components/admin/ApplicationReportDownload";
import BillingReportsWithDownload from "@/components/BillingReportsWithDownload";
import PaymentReport from "@/components/admin/PaymentReport";

// ============================================================================
// Types
// ============================================================================
type TabType = "reports" | "applications" | "buildings" | "plans";

interface DashboardStats {
  totalUsers: number;
  totalPayments: number;
  monthlyRevenue: number;
  pendingApplications: number;
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

// ============================================================================
// Utility Functions
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

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

// Robustly extract an ID from any object/string/ref
const extractId = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v._id) return String(v._id);
    if (v.id) return String(v.id);
    if (typeof v.toString === "function") {
      const s = v.toString();
      // Ensure it's not "[object Object]"
      if (s && s !== "[object Object]") return s;
    }
  }
  return String(v);
};

// Extract email from any object/string
const extractEmail = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v.includes("@") ? v : "";
  if (typeof v === "object" && v.email) return String(v.email);
  return "";
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

const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "amber";
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
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
    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
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
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiEye className="w-4 h-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Plan:</span>
                <p className="font-medium">
                  {application.planId?.name || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Rate:</span>
                <p className="font-medium">
                  {formatCurrency(application.planId?.price || 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Building:</span>
                <p className="font-medium">
                  {application.buildingId?.buildingName || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Unit:</span>
                <p className="font-medium">
                  {application.floor} {application.unitNumber}
                </p>
              </div>
              <div>
                <span className="text-gray-500">ID Type:</span>
                <p className="font-medium">{application.idType}</p>
              </div>
              <div>
                <span className="text-gray-500">Submitted:</span>
                <p className="font-medium">
                  {formatDate(application.createdAt)}
                </p>
              </div>
            </div>
            {application.adminNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500">Notes:</span>
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
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(application._id)}
                    className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium"
                  >
                    Reject
                  </button>
                </>
              )}
              {application.status === "approved" && (
                <button
                  onClick={() => onStartBilling(application._id)}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
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
  onEdit: (building: Building) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
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
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(building)}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(building._id, building.isActive)}
            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
          >
            {building.isActive ? (
              <FiToggleRight className="w-5 h-5" />
            ) : (
              <FiToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onDelete(building._id)}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
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
  onEdit: (plan: Plan) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
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
              {plan.speed.download} / {plan.speed.upload} Mbps
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(plan)}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(plan._id, plan.isActive)}
            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
          >
            {plan.isActive ? (
              <FiToggleRight className="w-5 h-5" />
            ) : (
              <FiToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onDelete(plan._id)}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
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
        } ${togglingEmail ? "opacity-50" : ""}`}
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

// ============================================================================
// Main Component
// ============================================================================
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("reports");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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

  // Report Modals State
  const [showApplicationReport, setShowApplicationReport] = useState(false);
  const [showBillingReport, setShowBillingReport] = useState(false);
  const [showPaymentReport, setShowPaymentReport] = useState(false);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [paymentGroups, setPaymentGroups] = useState<PaymentGroup[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingPaymentReport, setIsLoadingPaymentReport] = useState(false);

  // Debounced search
  const debouncedAppSearch = useDebounce(appSearchTerm, 300);
  const debouncedBuildingSearch = useDebounce(buildingSearchTerm, 300);
  const debouncedPlanSearch = useDebounce(planSearchTerm, 300);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================
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
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchEmailStatus = useCallback(async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      const value = result.data?.customerEmailAlertsEnabled;
      if (value !== undefined && value !== null) {
        setEmailEnabled(value);
      }
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

  // ==========================================================================
  // FIXED: Fetch customers with proper bill matching
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

      console.log(
        `🔍 DEBUG: ${users.length} users, ${apps.length} apps, ${bills.length} bills`,
      );

      // Sample a bill to see its structure (for debugging)
      if (bills.length > 0) {
        console.log("🔍 Sample bill structure:", bills[0]);
      }

      // Build a map of bills by customer identifier
      // A bill can reference a customer via: userId, applicationId, or email
      type BillRecord = { bill: any; identifier: string[] };

      const billsByIdentifier: Record<string, any[]> = {};

      bills.forEach((bill: any) => {
        // Collect ALL possible identifiers for this bill
        const identifiers: string[] = [];

        // userId (string or object)
        const userId = extractId(bill.userId);
        if (userId) identifiers.push(userId);

        // applicationId (string or object)
        const appId = extractId(bill.applicationId);
        if (appId) identifiers.push(appId);

        // billingCycleId
        const cycleId = extractId(bill.billingCycleId);
        if (cycleId) identifiers.push(cycleId);

        // Email fallback
        const email =
          extractEmail(bill.userId) || extractEmail(bill.customerEmail);
        if (email) identifiers.push(email.toLowerCase());

        // applicationId object email
        const appEmail = extractEmail(bill.applicationId);
        if (appEmail) identifiers.push(appEmail.toLowerCase());

        // Add bill to all its identifier buckets
        identifiers.forEach((id) => {
          if (!billsByIdentifier[id]) billsByIdentifier[id] = [];
          billsByIdentifier[id].push(bill);
        });
      });

      console.log(
        `🔍 Bills mapped to ${Object.keys(billsByIdentifier).length} unique identifiers`,
      );

      const isUnpaidStatus = (status: string) =>
        status === "unpaid" ||
        status === "pending" ||
        status === "overdue" ||
        status === "sent" ||
        status === "pending_confirmation";

      const getBillsForCustomer = (
        customerId: string,
        customerEmail?: string,
        applicationId?: string,
      ): any[] => {
        const seen = new Set<string>();
        const result: any[] = [];

        const addBills = (billsArr: any[] | undefined) => {
          if (!billsArr) return;
          billsArr.forEach((b) => {
            if (b._id && !seen.has(b._id)) {
              seen.add(b._id);
              result.push(b);
            }
          });
        };

        // Match by customer _id
        addBills(billsByIdentifier[customerId]);

        // Match by applicationId (string)
        if (applicationId) {
          addBills(billsByIdentifier[applicationId]);
        }

        // Match by email
        if (customerEmail) {
          addBills(billsByIdentifier[customerEmail.toLowerCase()]);
        }

        return result;
      };

      const customerItems: CustomerItem[] = [];

      // Process users
      users.forEach((user: any) => {
        if (user.role === "admin") return;

        const userAppId = user.applicationId || "";
        const allBills = getBillsForCustomer(user._id, user.email, userAppId);
        const unpaidBills = allBills.filter((b) => isUnpaidStatus(b.status));
        const overdueBills = unpaidBills.filter((b) => b.status === "overdue");
        const currentBalance = unpaidBills.reduce(
          (sum, b) => sum + Number(b.total || b.amount || 0),
          0,
        );

        customerItems.push({
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
          currentBalance,
          unpaidBills,
          overdueBills,
          billingCycle: user.billingCycle,
          applicationId: userAppId || user.username || "",
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

      // Process approved applications
      apps.forEach((app: any) => {
        if (app.status !== "approved") return;

        const appIdStr = app.applicationId || "";
        const allBills = getBillsForCustomer(app._id, app.email, appIdStr);
        const unpaidBills = allBills.filter((b) => isUnpaidStatus(b.status));
        const overdueBills = unpaidBills.filter((b) => b.status === "overdue");
        const currentBalance = unpaidBills.reduce(
          (sum, b) => sum + Number(b.total || b.amount || 0),
          0,
        );

        customerItems.push({
          _id: app._id,
          firstName: app.firstName || "",
          lastName: app.lastName || "",
          email: app.email || "",
          phoneNumber: app.phoneNumber || "",
          status: app.status || "active",
          type: "application",
          planName: app.planId?.name || "No Plan",
          planPrice: app.planId?.price || 0,
          currentBalance,
          unpaidBills,
          overdueBills,
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

      const withBalance = customerItems.filter((c) => c.currentBalance > 0);
      const withUnpaidBills = customerItems.filter(
        (c) => c.unpaidBills.length > 0,
      );

      console.log(
        `✅ Loaded ${customerItems.length} customers. ${withBalance.length} with balance, ${withUnpaidBills.length} with unpaid bills.`,
      );

      if (bills.length > 0 && withUnpaidBills.length === 0) {
        console.warn(
          "⚠️ May bills sa database pero walang nag-match. Check mo ang bill structure sa console para makita ang userId/applicationId fields.",
        );
      }

      setCustomerItems(customerItems);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Unable to load customer data");
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // ==========================================================================
  // Fetch Payment Groups
  // ==========================================================================
  const fetchPaymentGroups = useCallback(async () => {
    setIsLoadingPaymentReport(true);
    try {
      const result = await getAllPayments({
        forceRefresh: true,
        limit: 10000,
      });
      const payments = result.data || [];

      console.log(`💳 Loaded ${payments.length} payments`);
      if (payments.length > 0) {
        console.log("💳 Sample payment structure:", payments[0]);
      }

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

          const firstName = userObj?.firstName || appObj?.firstName || "";
          const lastName = userObj?.lastName || appObj?.lastName || "";
          const fullName =
            `${firstName} ${lastName}`.trim() ||
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
              name: fullName,
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

        if (p.status === "completed") {
          group.totalPaidAmount += Number(p.amount) || 0;
        } else if (p.status === "pending") {
          group.totalPendingAmount += Number(p.amount) || 0;
          group.hasPendingPayments = true;
        }

        if (new Date(p.createdAt) > new Date(group.lastPaymentDate)) {
          group.lastPaymentDate = p.createdAt;
        }
        if (new Date(p.createdAt) < new Date(group.firstPaymentDate)) {
          group.firstPaymentDate = p.createdAt;
        }
      });

      const groups = Array.from(groupsMap.values());
      console.log(`📊 Grouped into ${groups.length} customer payment groups`);
      setPaymentGroups(groups);
    } catch (error) {
      console.error("Failed to fetch payment groups:", error);
      toast.error("Unable to load payment data");
    } finally {
      setIsLoadingPaymentReport(false);
    }
  }, []);

  // ==========================================================================
  // INITIAL LOAD
  // ==========================================================================
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

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  const handleApproveApplication = async (id: string) => {
    try {
      await approveApplication(id);
      toast.success("Application approved");
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
    const includeInstallationFee = confirm("Include installation fee?");
    try {
      await startBillingForApplication(id, { includeInstallationFee });
      toast.success("Billing started");
      fetchApplications();
    } catch (error) {
      toast.error("Failed to start billing");
    }
  };

  const handleCreateBuilding = async () => {
    if (!buildingForm.buildingName || !buildingForm.city) {
      toast.error("Please fill in required fields");
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
      fetchBuildings();
    } catch (error) {
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
      fetchBuildings();
    } catch (error) {
      toast.error("Failed to update building");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm("Delete this building?")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted");
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

  const handleCreatePlan = async () => {
    if (!planForm.name || planForm.price <= 0) {
      toast.error("Please fill in required fields");
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
      fetchPlans();
    } catch (error) {
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
      fetchPlans();
    } catch (error) {
      toast.error("Failed to update plan");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    try {
      await deletePlan(id);
      toast.success("Plan deleted");
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

  const handleToggleEmail = async () => {
    setTogglingEmail(true);
    try {
      const newState = !emailEnabled;
      const result = await toggleCustomerEmailAlerts(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(`Email alerts ${newState ? "enabled" : "disabled"}`);
      }
    } catch (error) {
      toast.error("Failed to toggle email");
    } finally {
      setTogglingEmail(false);
    }
  };

  // ==========================================================================
  // REPORT HANDLERS
  // ==========================================================================
  const handleFetchAllApplications = useCallback(
    async (filters?: {
      buildingId?: string;
      status?: string;
      search?: string;
    }) => {
      const result = await getAllApplications({
        forceRefresh: true,
        limit: 10000,
        ...filters,
      });
      return (result.data || []) as Application[];
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
  // FILTERED DATA
  // ==========================================================================
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      debouncedAppSearch === "" ||
      `${app.firstName} ${app.lastName}`
        .toLowerCase()
        .includes(debouncedAppSearch.toLowerCase()) ||
      app.email.toLowerCase().includes(debouncedAppSearch.toLowerCase());
    const matchesStatus =
      appStatusFilter === "all" || app.status === appStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBuildings = buildings.filter(
    (b) =>
      debouncedBuildingSearch === "" ||
      b.buildingName
        .toLowerCase()
        .includes(debouncedBuildingSearch.toLowerCase()),
  );

  const filteredPlans = plans.filter(
    (p) =>
      debouncedPlanSearch === "" ||
      p.name.toLowerCase().includes(debouncedPlanSearch.toLowerCase()),
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <FiBarChart2 className="w-6 h-6 text-white" />
            <span className="text-white/70 text-sm font-mono">
              ADMIN DASHBOARD
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Admin Control Center
          </h1>
          <p className="text-white/60 mt-2">
            Manage reports, applications, buildings, and service plans
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={isLoadingStats ? "—" : stats.totalUsers.toLocaleString()}
            icon={FiUsers}
            color="blue"
          />
          <StatsCard
            title="Total Payments"
            value={isLoadingStats ? "—" : formatCurrency(stats.totalPayments)}
            icon={FiCreditCard}
            color="green"
          />
          <StatsCard
            title="Monthly Revenue"
            value={isLoadingStats ? "—" : formatCurrency(stats.monthlyRevenue)}
            icon={FiActivity}
            color="purple"
          />
          <StatsCard
            title="Pending Applications"
            value={
              isLoadingStats ? "—" : stats.pendingApplications.toLocaleString()
            }
            icon={FiUserCheck}
            color="amber"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-4">
            <div className="flex gap-1 py-2 overflow-x-auto">
              <TabButton
                label="Reports"
                icon={FiBarChart2}
                isActive={activeTab === "reports"}
                onClick={() => setActiveTab("reports")}
              />
              <TabButton
                label="Applications"
                icon={FiFileText}
                isActive={activeTab === "applications"}
                onClick={() => setActiveTab("applications")}
                count={stats.pendingApplications}
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

          <div className="p-6">
            {/* REPORTS TAB */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Application Report */}
                  <button
                    onClick={openApplicationReport}
                    className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all group"
                  >
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                      <FiFileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900 text-lg">
                        Application Report
                      </p>
                      <p className="text-sm text-gray-500">
                        Export applications as PDF or Excel
                      </p>
                    </div>
                    <FiChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Billing Report */}
                  <button
                    onClick={openBillingReport}
                    disabled={isLoadingCustomers}
                    className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all group disabled:opacity-50"
                  >
                    <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                      {isLoadingCustomers ? (
                        <FiLoader className="w-6 h-6 text-emerald-600 animate-spin" />
                      ) : (
                        <FiCreditCard className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900 text-lg">
                        Billing Report
                      </p>
                      <p className="text-sm text-gray-500">
                        Unpaid bills, overdue & installation fees
                      </p>
                    </div>
                    <FiChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Payment Report */}
                  <button
                    onClick={openPaymentReport}
                    disabled={isLoadingPaymentReport}
                    className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all group disabled:opacity-50"
                  >
                    <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                      {isLoadingPaymentReport ? (
                        <FiLoader className="w-6 h-6 text-purple-600 animate-spin" />
                      ) : (
                        <FiCreditCard className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900 text-lg">
                        Payment Report
                      </p>
                      <p className="text-sm text-gray-500">
                        Transaction history & analytics
                      </p>
                    </div>
                    <FiChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Email Toggle */}
                <EmailToggleCard
                  emailEnabled={emailEnabled}
                  togglingEmail={togglingEmail}
                  onToggle={handleToggleEmail}
                />
              </div>
            )}

            {/* APPLICATIONS TAB */}
            {activeTab === "applications" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search applications..."
                      value={appSearchTerm}
                      onChange={(e) => setAppSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    {["all", "pending", "approved", "rejected"].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => setAppStatusFilter(status)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            appStatusFilter === status
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </div>

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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            {/* BUILDINGS TAB */}
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
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => openBuildingModal()}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2"
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
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search plans..."
                      value={planSearchTerm}
                      onChange={(e) => setPlanSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => openPlanModal()}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2"
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

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FiServer className="w-3 h-3" />
              Live Database
            </span>
            <span>•</span>
            <span>Last sync: {new Date().toLocaleString()}</span>
          </div>
          <span className="font-mono">v3.3</span>
        </div>
      </div>

      {/* Building Modal */}
      {showBuildingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingBuilding ? "Edit Building" : "Add Building"}
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  Active
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setShowBuildingModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={
                  editingBuilding ? handleUpdateBuilding : handleCreateBuilding
                }
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
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
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingPlan ? "Edit Plan" : "Add Plan"}
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add feature..."
                  />
                  <button
                    onClick={addFeature}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
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
                      <button onClick={() => removeFeature(idx)}>
                        <FiXCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
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
                  Active
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              >
                {editingPlan ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Report Modals */}
      {/* ============================================================ */}

      {/* Application Report Modal */}
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
          status: appStatusFilter !== "all" ? appStatusFilter : undefined,
          search: appSearchTerm || undefined,
        }}
      />

      {/* Billing Report Modal */}
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

      {/* Payment Report Modal */}
      {showPaymentReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
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
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
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
