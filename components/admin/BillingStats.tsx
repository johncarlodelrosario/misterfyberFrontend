import React, { memo } from "react";
import {
  FiUser,
  FiDollarSign,
  FiAlertCircle,
  FiClock,
  FiActivity,
  FiFileText,
  FiHome,
} from "react-icons/fi";

interface BillingStatsProps {
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
  loading?: boolean;
  realtimeUpdate?: number;
  lastUpdated?: Date | null;
}

const BillingStats: React.FC<BillingStatsProps> = memo(
  ({ stats, loading = false, realtimeUpdate = 0, lastUpdated = null }) => {
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
        subtitle: `${stats.customersWithBalanceCount} with balance`,
      },
      {
        label: "Overdue",
        value: stats.overdueCustomersCount,
        icon: FiAlertCircle,
        color: "orange",
        subtitle: "Need payment",
      },
      {
        label: "Active Cycles",
        value: stats.activeCyclesCount,
        icon: FiActivity,
        color: "green",
        subtitle: `${stats.pausedCyclesCount} paused`,
      },
      {
        label: "Pending",
        value:
          stats.pendingPaymentsCount +
          stats.pendingProRatedCount +
          stats.pendingActivationsCount +
          stats.pendingInstallationBillsCount,
        icon: FiClock,
        color: "purple",
        subtitle: "Awaiting action",
      },
      {
        label: "Install Fees Due",
        value: `₱${stats.totalInstallationFeesDue.toLocaleString()}`,
        icon: FiFileText,
        color: "amber",
        subtitle: `${stats.installationFeesPaidCount} paid`,
      },
      {
        label: "Without Billing",
        value: stats.applicationsWithoutBilling,
        icon: FiHome,
        color: "gray",
        subtitle: "Need setup",
      },
    ];

    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
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
      <div>
        {lastUpdated && (
          <div className="text-right text-xs text-gray-400 mb-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
            {realtimeUpdate > 0 && (
              <span className="ml-2 text-green-500">
                Live ({realtimeUpdate} updates)
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            const colors: Record<
              string,
              { text: string; bg: string; icon: string }
            > = {
              blue: {
                text: "text-blue-600",
                bg: "bg-blue-50",
                icon: "text-blue-500",
              },
              red: {
                text: "text-red-600",
                bg: "bg-red-50",
                icon: "text-red-500",
              },
              orange: {
                text: "text-orange-600",
                bg: "bg-orange-50",
                icon: "text-orange-500",
              },
              green: {
                text: "text-green-600",
                bg: "bg-green-50",
                icon: "text-green-500",
              },
              purple: {
                text: "text-purple-600",
                bg: "bg-purple-50",
                icon: "text-purple-500",
              },
              amber: {
                text: "text-amber-600",
                bg: "bg-amber-50",
                icon: "text-amber-500",
              },
              gray: {
                text: "text-gray-600",
                bg: "bg-gray-50",
                icon: "text-gray-500",
              },
            };
            const colorClass = colors[stat.color] || colors.gray;

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
                    <p className={`text-lg font-bold ${colorClass.text}`}>
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-[10px] text-gray-400 truncate">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex-shrink-0 w-8 h-8 ${colorClass.bg} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${colorClass.icon}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

BillingStats.displayName = "BillingStats";
export default BillingStats;
