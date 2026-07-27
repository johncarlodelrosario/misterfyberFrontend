// components/admin/BillingStats.tsx
import React, { memo } from "react";
import {
  FiUser,
  FiDollarSign,
  FiAlertCircle,
  FiClock,
  FiActivity,
  FiPause,
  FiFileText,
  FiHome,
} from "react-icons/fi";

interface BillingStatsProps {
  stats: {
    totalCustomers: number;
    totalBalance: number;
    customersWithBalance: number;
    overdueCustomers: number;
    activeCycles: number;
    pausedCycles: number;
    pendingPaymentsCount: number;
    applicationsWithoutBilling: number;
    totalInstallationFeesDue: number;
    installationFeesPaid: number;
  };
  loading?: boolean;
}

const BillingStats: React.FC<BillingStatsProps> = memo(
  ({ stats, loading = false }) => {
    const statCards = [
      {
        label: "Total Customers",
        value: stats.totalCustomers,
        icon: FiUser,
        color: "blue",
        subtitle: `${stats.totalCustomers} active`,
      },
      {
        label: "Total Balance",
        value: `₱${stats.totalBalance.toLocaleString()}`,
        icon: FiDollarSign,
        color: "red",
        subtitle: `${stats.customersWithBalance} customers with balance`,
      },
      {
        label: "Overdue",
        value: stats.overdueCustomers,
        icon: FiAlertCircle,
        color: "orange",
        subtitle: "Customers with overdue bills",
      },
      {
        label: "Active Cycles",
        value: stats.activeCycles,
        icon: FiActivity,
        color: "green",
        subtitle: `${stats.pausedCycles} paused`,
      },
      {
        label: "Pending Payments",
        value: stats.pendingPaymentsCount,
        icon: FiClock,
        color: "purple",
        subtitle: "Awaiting confirmation",
      },
      {
        label: "Installation Fees Due",
        value: `₱${stats.totalInstallationFeesDue.toLocaleString()}`,
        icon: FiFileText,
        color: "amber",
        subtitle: `${stats.installationFeesPaid} paid`,
      },
      {
        label: "Applications",
        value: stats.totalCustomers - stats.totalCustomers, // Placeholder
        icon: FiHome,
        color: "indigo",
        subtitle: "Active applications",
      },
      {
        label: "Without Billing",
        value: stats.applicationsWithoutBilling,
        icon: FiAlertCircle,
        color: "gray",
        subtitle: "Need billing setup",
      },
    ];

    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-24 mt-1"></div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-sm p-3 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <p className={`text-lg font-bold text-${stat.color}-600`}>
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-[10px] text-gray-400 truncate">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div
                  className={`flex-shrink-0 w-8 h-8 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 text-${stat.color}-500`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

BillingStats.displayName = "BillingStats";

export default BillingStats;
