// components/admin/billingTable.tsx - COMPLETE VERSION
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FiRefreshCw,
  FiPlay,
  FiPause,
  FiX,
  FiSettings,
  FiUser,
  FiActivity,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiBell,
  FiCalendar,
  FiInfo,
  FiUserPlus,
  FiMail,
  FiFileText,
  FiTrash2,
  FiCalendar as FiCalendarIcon,
  FiPrinter,
  FiMoreVertical,
  FiArrowUp,
  FiArrowDown,
  FiHome,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";

// ==================== TYPES ====================
export interface CustomerItem {
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

export interface Building {
  _id: string;
  buildingName: string;
  streetAddress: string;
  city: string;
  isActive: boolean;
}

export type SortField =
  | "name"
  | "plan"
  | "balance"
  | "status"
  | "installationFee";
export type SortDirection = "asc" | "desc";

interface BillingTableProps {
  customers: CustomerItem[];
  billingCycles: any[];
  bills: any[];
  pendingPayments: any[];
  loading: boolean;
  refreshing: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  buildingFilter: string;
  setBuildingFilter: (value: string) => void;
  buildingsList: Building[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setPagination: (value: any) => void;
  sortField: SortField;
  setSortField: (value: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
  stats: {
    totalCustomers: number;
    totalBalance: number;
    customersWithBalanceCount: number;
    overdueCustomersCount: number;
    activeCyclesCount: number;
    pausedCyclesCount: number;
    pendingProRatedCount: number;
    pendingActivationsCount: number;
    pendingPaymentsCount: number;
    pendingInstallationBillsCount: number;
    applicationsWithoutBilling: number;
    totalInstallationFeesDue: number;
    installationFeesPaidCount: number;
  };
  onAction: (action: string, customer: CustomerItem, data?: any) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenManualCustomer: () => void;
  onOpenBackdated: () => void;
  onOpenExistingCustomers: () => void;
  onOpenPending: () => void;
  onOpenReports: () => void;
  totalPendingCount: number;
  customersWithoutAccounts: any[];
  applicationsWithoutBillingCount: number;
}

// ==================== HELPERS ====================
function formatDateFixed(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function formatBillingPeriod(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "-";
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}/${start.getUTCFullYear()} - ${end.getUTCMonth() + 1}/${end.getUTCDate()}/${end.getUTCFullYear()}`;
}

function getBuildingDisplay(customer: CustomerItem): string {
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

// ==================== MEMOIZED ROW COMPONENT ====================
const CustomerRow = React.memo(
  ({
    customer,
    index,
    onAction,
  }: {
    customer: CustomerItem;
    index: number;
    onAction: (action: string, customer: CustomerItem, data?: any) => void;
  }) => {
    const hasUnpaidBills =
      customer.unpaidBills && customer.unpaidBills.length > 0;
    const hasBillingCycle = !!customer.billingCycle;
    const isActive = customer.billingCycle?.status === "active";
    const isPaused = customer.billingCycle?.status === "paused";
    const isPendingActivation =
      customer.billingCycle?.status === "pending_activation";
    const hasUnpaidInstallationFee =
      customer.type === "application" &&
      (customer.installationFee ?? 0) > 0 &&
      !customer.installationFeePaid;

    const getStatusBadge = () => {
      if (hasUnpaidInstallationFee) return "bg-amber-100 text-amber-800";
      if (customer.type === "application") {
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        )
          return "bg-purple-100 text-purple-800";
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        )
          return "bg-green-100 text-green-800";
        if (customer.billingCycle?.status === "active")
          return "bg-green-100 text-green-800";
        if (customer.billingCycle?.status === "paused")
          return "bg-yellow-100 text-yellow-800";
        if (customer.status === "billing_started")
          return "bg-indigo-100 text-indigo-800";
        return "bg-blue-100 text-blue-800";
      }
      if (customer.billingCycle?.status === "paused")
        return "bg-yellow-100 text-yellow-800";
      if (customer.status === "active") return "bg-green-100 text-green-800";
      if (customer.status === "suspended") return "bg-red-100 text-red-800";
      if (customer.status === "pending_activation")
        return "bg-purple-100 text-purple-800";
      return "bg-gray-100 text-gray-800";
    };

    const getStatusText = () => {
      if (hasUnpaidInstallationFee) return "Installation Fee Due";
      if (customer.type === "application") {
        if (
          customer.billingCycle?.status === "pending_activation" &&
          hasUnpaidBills
        )
          return "Awaiting Payment";
        if (
          customer.billingCycle?.status === "pending_activation" &&
          !hasUnpaidBills
        )
          return "Active";
        if (customer.billingCycle?.status === "active") return "Active";
        if (customer.billingCycle?.status === "paused") return "Paused";
        if (customer.status === "billing_started") return "Billing Started";
        return "Approved";
      }
      if (customer.billingCycle?.status === "paused") return "Paused";
      if (customer.status === "active") return "Active";
      if (customer.status === "suspended") return "Suspended";
      if (customer.status === "pending_activation") return "Pending Activation";
      return customer.status || "Inactive";
    };

    const getBalanceColor = (balance: number) => {
      if (balance === 0) return "text-green-600";
      if (balance > 1000) return "text-red-600 font-bold";
      return "text-orange-600";
    };

    return (
      <tr
        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
      >
        <td className="px-3 py-2 border-r border-gray-200 text-center bg-white sticky left-0 z-10">
          <span className="text-sm font-medium text-gray-500">{index + 1}</span>
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          <div className="flex items-center gap-2">
            {customer.type === "application" ? (
              <FiFileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            ) : (
              <FiUser className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-xs text-gray-500">{customer.email}</p>
              {customer.applicationId && (
                <p className="text-[10px] text-gray-400 font-mono break-all">
                  {customer.applicationId}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {customer.planName}
          </p>
          <p className="text-xs text-gray-500">
            ₱{customer.planPrice.toLocaleString()}/mo
          </p>
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          <p
            className={`text-sm font-bold ${getBalanceColor(customer.currentBalance)}`}
          >
            ₱{customer.currentBalance.toLocaleString()}
          </p>
          {customer.unpaidBills.length > 0 && (
            <p className="text-[10px] text-red-500">
              {customer.unpaidBills.length} unpaid
            </p>
          )}
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge()}`}
          >
            {getStatusText()}
          </span>
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          {customer.type === "application" &&
          (customer.installationFee ?? 0) > 0 ? (
            <div>
              <p className="text-sm font-medium">
                ₱{(customer.installationFee ?? 0).toLocaleString()}
              </p>
              <p
                className={`text-[10px] ${customer.installationFeePaid ? "text-green-600" : "text-red-600"}`}
              >
                {customer.installationFeePaid ? "Paid" : "Unpaid"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </td>
        <td className="px-3 py-2 border-r border-gray-200">
          <div className="flex items-center gap-1">
            <FiHome className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {getBuildingDisplay(customer)}
            </span>
            {customer.unitNumber && (
              <span className="text-xs text-gray-400">
                (Unit {customer.unitNumber})
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onAction("view", customer)}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <FiEye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAction("email", customer)}
              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
              title="Send Email"
            >
              <FiMail className="w-3.5 h-3.5" />
            </button>
            {customer.type === "application" && hasBillingCycle && (
              <button
                onClick={() => onAction("recover", customer)}
                className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                title="Recover Missing Bills"
              >
                <FiCalendar className="w-3.5 h-3.5" />
              </button>
            )}
            {customer.type === "application" && (
              <>
                {!hasBillingCycle && (
                  <button
                    onClick={() => onAction("start", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Start Billing"
                  >
                    <FiPlay className="w-3.5 h-3.5" />
                  </button>
                )}
                {isActive && (
                  <button
                    onClick={() => onAction("pause", customer)}
                    className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                    title="Pause Billing"
                  >
                    <FiPause className="w-3.5 h-3.5" />
                  </button>
                )}
                {isPaused && (
                  <button
                    onClick={() => onAction("resume", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Resume Billing"
                  >
                    <FiPlay className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isActive || isPendingActivation) && (
                  <button
                    onClick={() => onAction("disconnect", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Disconnect"
                  >
                    <FiWifiOff className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.status === "suspended" && (
                  <button
                    onClick={() => onAction("reconnect", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Reconnect"
                  >
                    <FiWifi className="w-3.5 h-3.5" />
                  </button>
                )}
                {hasBillingCycle && (
                  <button
                    onClick={() => onAction("stop", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Cancel Subscription"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
                {hasBillingCycle && (
                  <button
                    onClick={() => onAction("delete", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Delete Billing Cycle"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {customer.type === "user" && (
              <>
                {(!customer.billingCycle ||
                  customer.billingCycle?.status === "cancelled") && (
                  <button
                    onClick={() => onAction("start", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Start Billing"
                  >
                    <FiPlay className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.billingCycle?.status === "active" && (
                  <button
                    onClick={() => onAction("pause", customer)}
                    className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                    title="Pause Billing"
                  >
                    <FiPause className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.billingCycle?.status === "paused" && (
                  <button
                    onClick={() => onAction("resume", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Resume Billing"
                  >
                    <FiPlay className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.billingCycle?.status === "active" && (
                  <button
                    onClick={() => onAction("stop", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Cancel Subscription"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.status === "active" && (
                  <button
                    onClick={() => onAction("disconnect", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Disconnect"
                  >
                    <FiWifiOff className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.status === "suspended" && (
                  <button
                    onClick={() => onAction("reconnect", customer)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                    title="Reconnect"
                  >
                    <FiWifi className="w-3.5 h-3.5" />
                  </button>
                )}
                {customer.billingCycle && (
                  <button
                    onClick={() => onAction("delete", customer)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Delete Billing Cycle"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

CustomerRow.displayName = "CustomerRow";

// ==================== MAIN TABLE COMPONENT ====================
export default function BillingTable({
  customers,
  billingCycles,
  bills,
  pendingPayments,
  loading,
  refreshing,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  buildingFilter,
  setBuildingFilter,
  buildingsList,
  pagination,
  setPagination,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  stats,
  onAction,
  onRefresh,
  onOpenSettings,
  onOpenManualCustomer,
  onOpenBackdated,
  onOpenExistingCustomers,
  onOpenPending,
  onOpenReports,
  totalPendingCount,
  customersWithoutAccounts,
  applicationsWithoutBillingCount,
}: BillingTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const checkScrollPosition = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  const scrollLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.applicationId &&
          customer.applicationId
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      let matchesBuilding = true;
      if (buildingFilter !== "all") {
        const customerBuildingId = customer.building?._id || null;
        matchesBuilding = customerBuildingId === buildingFilter;
      }

      if (!matchesSearch || !matchesBuilding) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "has_balance") return customer.currentBalance > 0;
      if (statusFilter === "overdue") return customer.overdueBills.length > 0;
      if (statusFilter === "active") return customer.status === "active";
      if (statusFilter === "suspended") return customer.status === "suspended";
      if (statusFilter === "paused")
        return customer.billingCycle?.status === "paused";
      if (statusFilter === "pending_activation") {
        const hasUnpaid =
          customer.unpaidBills && customer.unpaidBills.length > 0;
        return (
          customer.billingCycle?.status === "pending_activation" && hasUnpaid
        );
      }
      if (statusFilter === "applications")
        return customer.type === "application";
      if (statusFilter === "installation_fee_due") {
        return (
          customer.type === "application" &&
          (customer.installationFee ?? 0) > 0 &&
          !customer.installationFeePaid
        );
      }
      return true;
    });
  }, [customers, searchTerm, statusFilter, buildingFilter]);

  const sortedAndFilteredCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "plan":
          aValue = a.planName.toLowerCase();
          bValue = b.planName.toLowerCase();
          break;
        case "balance":
          aValue = a.currentBalance;
          bValue = b.currentBalance;
          break;
        case "status":
          const getStatusText = (c: CustomerItem) => {
            if (
              c.type === "application" &&
              (c.installationFee ?? 0) > 0 &&
              !c.installationFeePaid
            )
              return "Installation Fee Due";
            if (c.type === "application")
              return c.billingCycle?.status || "Approved";
            return c.status || "Inactive";
          };
          aValue = getStatusText(a);
          bValue = getStatusText(b);
          break;
        case "installationFee":
          aValue = a.type === "application" ? a.installationFee || 0 : -1;
          bValue = b.type === "application" ? b.installationFee || 0 : -1;
          break;
        default:
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredCustomers, sortField, sortDirection]);

  const paginatedCustomers = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return sortedAndFilteredCustomers.slice(start, end);
  }, [sortedAndFilteredCustomers, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((prev: any) => ({
      ...prev,
      total: sortedAndFilteredCustomers.length,
      totalPages: Math.ceil(sortedAndFilteredCustomers.length / prev.limit),
    }));
  }, [sortedAndFilteredCustomers, setPagination]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev: any) => ({ ...prev, page: newPage }));
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      checkScrollPosition();
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [checkScrollPosition]);

  useEffect(() => {
    setTimeout(checkScrollPosition, 100);
  }, [customers, checkScrollPosition]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <FiArrowUp className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <FiArrowUp className="w-3 h-3" />
    ) : (
      <FiArrowDown className="w-3 h-3" />
    );
  };

  const compactStatsCards = [
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: FiUser,
      color: "blue",
    },
    {
      label: "Total Balance",
      value: `₱${stats.totalBalance.toLocaleString()}`,
      color: "red",
    },
    {
      label: "With Balance",
      value: stats.customersWithBalanceCount,
      icon: FiAlertCircle,
      color: "orange",
    },
    {
      label: "Overdue",
      value: stats.overdueCustomersCount,
      icon: FiClock,
      color: "red",
    },
    {
      label: "Active Cycles",
      value: stats.activeCyclesCount,
      icon: FiActivity,
      color: "green",
    },
    {
      label: "Paused Cycles",
      value: stats.pausedCyclesCount,
      icon: FiPause,
      color: "yellow",
    },
    {
      label: "Pending Payments",
      value: stats.pendingPaymentsCount,
      icon: FiClock,
      color: "purple",
    },
    {
      label: "Applications",
      value: customers.filter((c) => c.type === "application").length,
      icon: FiFileText,
      color: "indigo",
    },
    {
      label: "Installation Fees Due",
      value: `₱${stats.totalInstallationFeesDue.toLocaleString()}`,
      sub: "Unpaid",
      icon: FiAlertCircle,
      color: "amber",
    },
    {
      label: "Pending Install Bills",
      value: stats.pendingInstallationBillsCount,
      icon: FiFileText,
      color: "amber",
    },
  ];

  // Skeleton loading UI
  if (loading && customers.length === 0) {
    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen ml-0 md:ml-0">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse mt-1"></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm p-3 border border-gray-100"
            >
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300">
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen ml-0 md:ml-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Billing Management
            </h1>
            <p className="text-sm text-gray-500">
              Manage customer balances, bills, payments, and subscriptions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenReports}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <FiFileText className="w-3.5 h-3.5" /> Reports
            </button>
            <button
              onClick={onOpenBackdated}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiCalendarIcon className="w-3.5 h-3.5" /> Backdated
            </button>
            <button
              onClick={onOpenManualCustomer}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiUserPlus className="w-3.5 h-3.5" /> Add
            </button>
            {(customersWithoutAccounts.length > 0 ||
              applicationsWithoutBillingCount > 0) && (
              <button
                onClick={onOpenExistingCustomers}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiUser className="w-3.5 h-3.5" /> Existing (
                {customersWithoutAccounts.length +
                  applicationsWithoutBillingCount}
                )
              </button>
            )}
            {totalPendingCount > 0 && (
              <button
                onClick={onOpenPending}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FiBell className="w-3.5 h-3.5" /> Pending ({totalPendingCount})
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiSettings className="w-3.5 h-3.5" /> Settings
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {compactStatsCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm p-3 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold text-${stat.color}-600`}>
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-[10px] text-gray-400">{stat.sub}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name, email, or application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="all">🏢 All Buildings</option>
            {buildingsList.map((building) => (
              <option key={building._id} value={building._id}>
                🏢 {building.buildingName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Customers</option>
            <option value="has_balance">With Balance</option>
            <option value="overdue">Overdue</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="suspended">Suspended</option>
            <option value="pending_activation">Awaiting Payment</option>
            <option value="applications">Applications Only</option>
            <option value="installation_fee_due">Installation Fee Due</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="relative" id="table-section">
        <div
          ref={tableContainerRef}
          onScroll={checkScrollPosition}
          className="overflow-x-auto scrollbar-always-visible"
          style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
        >
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-300 min-w-[1100px]">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr className="border-b border-gray-300">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 bg-gray-100 sticky left-0 z-20"></th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Customer <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("plan")}
                  >
                    <div className="flex items-center gap-1">
                      Plan <SortIcon field="plan" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center gap-1">
                      Balance <SortIcon field="balance" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort("installationFee")}
                  >
                    <div className="flex items-center gap-1">
                      Install Fee <SortIcon field="installationFee" />
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    <div className="flex items-center gap-1">
                      <FiHome className="w-3 h-3" /> Building
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-gray-500 text-sm border-t border-gray-200"
                    >
                      No customers found
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer, idx) => (
                    <CustomerRow
                      key={`${customer.type}-${customer._id}`}
                      customer={customer}
                      index={(pagination.page - 1) * pagination.limit + idx}
                      onAction={onAction}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-4 py-2 bg-white rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} customers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Scroll buttons */}
        {!isMobile && (
          <>
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`fixed left-[80px] top-1/2 transform -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg p-3 transition-all duration-200 border border-gray-300 ${canScrollLeft ? "hover:bg-gray-100 cursor-pointer opacity-100" : "opacity-0 pointer-events-none"}`}
              title="Scroll left"
            >
              <FiChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={scrollRight}
              disabled={!canScrollRight}
              className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-50 bg-white rounded-lg shadow-lg p-3 transition-all duration-200 border border-gray-300 ${canScrollRight ? "hover:bg-gray-100 cursor-pointer opacity-100" : "opacity-0 pointer-events-none"}`}
              title="Scroll right"
            >
              <FiChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </>
        )}
      </div>

      <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-b-lg text-xs text-gray-500">
        Showing {paginatedCustomers.length} of{" "}
        {sortedAndFilteredCustomers.length} customers (
        {customers.filter((c) => c.type === "user").length} users,{" "}
        {customers.filter((c) => c.type === "application").length} applications)
        - Sorted by {sortField} (
        {sortDirection === "asc" ? "Ascending" : "Descending"})
        {buildingFilter !== "all" && (
          <span className="ml-2 text-blue-600">
            - Filtered by building:{" "}
            {buildingsList.find((b) => b._id === buildingFilter)?.buildingName}
          </span>
        )}
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        .scrollbar-always-visible {
          scrollbar-width: thin;
        }
        .scrollbar-always-visible::-webkit-scrollbar {
          height: 10px;
          display: block;
        }
        .scrollbar-always-visible::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .scrollbar-always-visible::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .scrollbar-always-visible::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
}
