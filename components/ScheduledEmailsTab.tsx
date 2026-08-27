// components/ScheduledEmailsTab.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import emailService, {
  ScheduledEmail,
  ScheduleStats,
} from "@/services/emailService";
import RichTextEditor from "./RichTextEditor";
import toast from "react-hot-toast";

interface ScheduledEmailsTabProps {
  customers: any[];
  customersLoading: boolean;
  onRefresh: () => Promise<void>;
}

export default function ScheduledEmailsTab({
  customers,
  customersLoading,
  onRefresh,
}: ScheduledEmailsTabProps) {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledEmail[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    subject: "",
    message: "",
    richTextContent: "",
    includeBilling: false,
    billType: "unpaid" as "unpaid" | "latest" | "installation",
    sendCopyToAdmin: false,
    useAdminSender: false,
    scheduledFor: "",
    locationFilter: "all" as "all" | "breeze" | "sil" | "other",
    recurringEnabled: false,
    recurringFrequency: "weekly" as "daily" | "weekly" | "monthly",
    recurringInterval: 1,
    recurringEndDate: "",
    selectedCustomerIds: [] as string[],
  });

  // Load schedules
  const loadSchedules = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await emailService.getScheduledEmails({
        status: selectedStatus,
        page,
        limit: 20,
      });
      setSchedules(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error("Failed to load schedules:", error);
      toast.error("Failed to load scheduled emails");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, page]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await emailService.getScheduleStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    loadStats();
  }, [loadSchedules, loadStats]);

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: string) => {
    setScheduleForm((prev) => ({
      ...prev,
      selectedCustomerIds: prev.selectedCustomerIds.includes(customerId)
        ? prev.selectedCustomerIds.filter((id) => id !== customerId)
        : [...prev.selectedCustomerIds, customerId],
    }));
  };

  // Select all customers
  const selectAllCustomers = () => {
    const allIds = filteredCustomers.map((c) => c.applicationId);
    setScheduleForm((prev) => ({
      ...prev,
      selectedCustomerIds: allIds,
    }));
  };

  // Deselect all customers
  const deselectAllCustomers = () => {
    setScheduleForm((prev) => ({
      ...prev,
      selectedCustomerIds: [],
    }));
  };

  // Handle schedule creation
  const handleScheduleEmail = async () => {
    // Validation
    if (!scheduleForm.name.trim()) {
      toast.error("Please enter a schedule name");
      return;
    }

    if (!scheduleForm.subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!scheduleForm.message.trim() && !scheduleForm.richTextContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!scheduleForm.scheduledFor) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduleDate = new Date(scheduleForm.scheduledFor);
    if (scheduleDate <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    // Get selected customer IDs
    let applicationIds = scheduleForm.selectedCustomerIds;

    if (applicationIds.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }

    try {
      setLoading(true);
      const result = await emailService.scheduleEmail({
        name: scheduleForm.name,
        applicationIds,
        subject: scheduleForm.subject,
        message: scheduleForm.message,
        richTextContent: scheduleForm.richTextContent,
        includeBilling: scheduleForm.includeBilling,
        billType: scheduleForm.billType,
        sendCopyToAdmin: scheduleForm.sendCopyToAdmin,
        useAdminSender: scheduleForm.useAdminSender,
        scheduledFor: scheduleForm.scheduledFor,
        locationFilter: scheduleForm.locationFilter,
        recurring: {
          enabled: scheduleForm.recurringEnabled,
          frequency: scheduleForm.recurringFrequency,
          interval: scheduleForm.recurringInterval,
          endDate: scheduleForm.recurringEndDate || undefined,
        },
      });

      toast.success(
        `Email scheduled for ${new Date(scheduleForm.scheduledFor).toLocaleString()}`,
      );
      setShowScheduleDialog(false);
      resetForm();
      await loadSchedules();
      await loadStats();
      await onRefresh();
    } catch (error: any) {
      console.error("Failed to schedule email:", error);
      toast.error(error.response?.data?.message || "Failed to schedule email");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setScheduleForm({
      name: "",
      subject: "",
      message: "",
      richTextContent: "",
      includeBilling: false,
      billType: "unpaid",
      sendCopyToAdmin: false,
      useAdminSender: false,
      scheduledFor: "",
      locationFilter: "all",
      recurringEnabled: false,
      recurringFrequency: "weekly",
      recurringInterval: 1,
      recurringEndDate: "",
      selectedCustomerIds: [],
    });
  };

  // Handle cancel schedule
  const handleCancelSchedule = async (scheduleId: string) => {
    if (
      !window.confirm("Are you sure you want to cancel this scheduled email?")
    )
      return;

    try {
      await emailService.cancelScheduledEmail(scheduleId);
      toast.success("Scheduled email cancelled");
      await loadSchedules();
      await loadStats();
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
      toast.error("Failed to cancel schedule");
    }
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this scheduled email?")
    )
      return;

    try {
      await emailService.deleteScheduledEmail(scheduleId);
      toast.success("Scheduled email deleted");
      await loadSchedules();
      await loadStats();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  // Get location display
  const getLocationDisplay = (location: string): string => {
    if (location === "breeze") return "🌊 Breeze";
    if (location === "sil") return "🏢 SIL";
    return "📍 Other";
  };

  const getLocationBadgeColor = (location: string): string => {
    if (location === "breeze")
      return "bg-blue-100 text-blue-800 border-blue-300";
    if (location === "sil")
      return "bg-purple-100 text-purple-800 border-purple-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.firstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.applicationId?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    let matchesBuilding = true;
    if (buildingFilter === "breeze") {
      matchesBuilding = (c.buildingName || "").toLowerCase().includes("breeze");
    } else if (buildingFilter === "sil") {
      matchesBuilding =
        (c.buildingName || "").toLowerCase().includes("sil") ||
        (c.buildingName || "").toLowerCase().includes("silk");
    } else if (buildingFilter === "other") {
      matchesBuilding =
        !(c.buildingName || "").toLowerCase().includes("breeze") &&
        !(c.buildingName || "").toLowerCase().includes("sil") &&
        !(c.buildingName || "").toLowerCase().includes("silk");
    }

    return matchesSearch && matchesBuilding;
  });

  const breezeCount = customers.filter((c) =>
    (c.buildingName || "").toLowerCase().includes("breeze"),
  ).length;

  const silCount = customers.filter(
    (c) =>
      (c.buildingName || "").toLowerCase().includes("sil") ||
      (c.buildingName || "").toLowerCase().includes("silk"),
  ).length;

  const otherCount = customers.filter(
    (c) =>
      !(c.buildingName || "").toLowerCase().includes("breeze") &&
      !(c.buildingName || "").toLowerCase().includes("sil") &&
      !(c.buildingName || "").toLowerCase().includes("silk"),
  ).length;

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {stats?.pending || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Processing</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.processing || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Sent</p>
          <p className="text-2xl font-bold text-green-600">
            {stats?.sent || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Recipients</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.totalRecipients || 0}
          </p>
        </div>
      </div>

      {/* Upcoming Schedules */}
      {stats?.upcoming && stats.upcoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            ⏰ Upcoming Scheduled Emails
          </h3>
          <div className="space-y-1">
            {stats.upcoming.slice(0, 3).map((schedule) => (
              <div
                key={schedule.id}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-blue-700">{schedule.name}</span>
                <span className="text-blue-600">
                  {formatDate(schedule.scheduledFor)} (
                  {schedule.totalRecipients} recipients)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedStatus === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📋 All
          </button>
          <button
            onClick={() => setSelectedStatus("pending")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedStatus === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ⏳ Pending
          </button>
          <button
            onClick={() => setSelectedStatus("sent")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedStatus === "sent"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ✅ Sent
          </button>
        </div>
        <button
          onClick={() => setShowScheduleDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>📅</span> Schedule Email
        </button>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-gray-500">No scheduled emails found</p>
          <p className="text-sm text-gray-400 mt-2">
            Click "Schedule Email" to create one
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">
                      {schedule.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        schedule.status,
                      )}`}
                    >
                      {schedule.status.toUpperCase()}
                    </span>
                    {schedule.recurring?.enabled && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                        🔄 Recurring ({schedule.recurring.frequency})
                      </span>
                    )}
                    {schedule.locationFilter &&
                      schedule.locationFilter !== "all" && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          📍 {schedule.locationFilter.toUpperCase()}
                        </span>
                      )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Subject:</strong> {schedule.subject}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Scheduled:</strong>{" "}
                    {formatDate(schedule.scheduledFor)}
                    {schedule.status === "sent" && schedule.completedAt && (
                      <span className="ml-3">
                        <strong>Completed:</strong>{" "}
                        {formatDate(schedule.completedAt)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Recipients:</strong> {schedule.totalRecipients}{" "}
                    customers
                    {schedule.sentCount > 0 && (
                      <span className="ml-2 text-green-600">
                        ✅ {schedule.sentCount} sent
                      </span>
                    )}
                    {schedule.failedCount > 0 && (
                      <span className="ml-2 text-red-600">
                        ❌ {schedule.failedCount} failed
                      </span>
                    )}
                  </p>
                  {schedule.error && (
                    <p className="text-sm text-red-500 mt-1">
                      <strong>Error:</strong> {schedule.error}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Created by: {schedule.createdBy} •{" "}
                    {formatDate(schedule.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {schedule.status === "pending" && (
                    <button
                      onClick={() => handleCancelSchedule(schedule.id)}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  {(schedule.status === "pending" ||
                    schedule.status === "cancelled") && (
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Schedule Dialog with Customer Selection */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">📅 Schedule Email</h3>
                <button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Customer Selection */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Select Customers ({scheduleForm.selectedCustomerIds.length}{" "}
                    selected)
                  </h4>

                  {/* Building Filter */}
                  <div className="mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setBuildingFilter("all")}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          buildingFilter === "all"
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        All ({customers.length})
                      </button>
                      <button
                        onClick={() => setBuildingFilter("breeze")}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          buildingFilter === "breeze"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        🌊 Breeze ({breezeCount})
                      </button>
                      <button
                        onClick={() => setBuildingFilter("sil")}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          buildingFilter === "sil"
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        🏢 SIL ({silCount})
                      </button>
                      <button
                        onClick={() => setBuildingFilter("other")}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          buildingFilter === "other"
                            ? "bg-gray-600 text-white border-gray-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        📍 Other ({otherCount})
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  {/* Select All / Deselect All */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={selectAllCustomers}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllCustomers}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Customer List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {customersLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">
                        No customers found
                      </p>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const location = customer.buildingName
                          ?.toLowerCase()
                          .includes("breeze")
                          ? "breeze"
                          : customer.buildingName
                                ?.toLowerCase()
                                .includes("sil") ||
                              customer.buildingName
                                ?.toLowerCase()
                                .includes("silk")
                            ? "sil"
                            : "other";
                        const locationDisplay = getLocationDisplay(location);
                        const badgeColor = getLocationBadgeColor(location);

                        return (
                          <label
                            key={customer.applicationId}
                            className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                              scheduleForm.selectedCustomerIds.includes(
                                customer.applicationId,
                              )
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={scheduleForm.selectedCustomerIds.includes(
                                customer.applicationId,
                              )}
                              onChange={() =>
                                toggleCustomerSelection(customer.applicationId)
                              }
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {customer.firstName || ""}{" "}
                                    {customer.lastName || ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {customer.email || "No email"}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    ID: {customer.applicationId}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {location !== "other" && (
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${badgeColor}`}
                                    >
                                      {locationDisplay}
                                    </span>
                                  )}
                                  {customer.hasUnpaidBills && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                      ⚠️ Unpaid
                                    </span>
                                  )}
                                </div>
                              </div>
                              {customer.buildingName && (
                                <p className="text-xs text-gray-400">
                                  🏢 {customer.buildingName}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Selected:{" "}
                    <strong>{scheduleForm.selectedCustomerIds.length}</strong>{" "}
                    customers
                  </div>
                </div>

                {/* Right Column - Schedule Form */}
                <div className="space-y-4">
                  {/* Schedule Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Monthly Billing Reminder"
                      value={scheduleForm.name}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email subject..."
                      value={scheduleForm.subject}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          subject: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <RichTextEditor
                      value={
                        scheduleForm.richTextContent || scheduleForm.message
                      }
                      onChange={(content) => {
                        setScheduleForm({
                          ...scheduleForm,
                          richTextContent: content,
                          message: content.replace(/<[^>]*>/g, ""),
                        });
                      }}
                      placeholder="Write your email message here..."
                      minHeight="120px"
                      maxHeight="200px"
                    />
                  </div>

                  {/* Schedule Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={scheduleForm.scheduledFor}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          scheduledFor: e.target.value,
                        })
                      }
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>

                  {/* Options Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Sender Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Send From
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={
                          scheduleForm.useAdminSender ? "admin" : "collection"
                        }
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            useAdminSender: e.target.value === "admin",
                          })
                        }
                      >
                        <option value="collection">Collection</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Bill Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bill Type
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={scheduleForm.billType}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            billType: e.target.value as any,
                          })
                        }
                      >
                        <option value="unpaid">Unpaid Bills</option>
                        <option value="latest">Latest Bill</option>
                        <option value="installation">Installation Fee</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={scheduleForm.includeBilling}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            includeBilling: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Include Billing
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={scheduleForm.sendCopyToAdmin}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            sendCopyToAdmin: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Send copy to admin
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={scheduleForm.recurringEnabled}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            recurringEnabled: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Recurring
                      </span>
                    </label>
                  </div>

                  {/* Recurring Options */}
                  {scheduleForm.recurringEnabled && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
                          value={scheduleForm.recurringFrequency}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              recurringFrequency: e.target.value as any,
                            })
                          }
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Interval
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg"
                          value={scheduleForm.recurringInterval}
                          onChange={(e) =>
                            setScheduleForm({
                              ...scheduleForm,
                              recurringInterval: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="p-4 border-t mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleEmail}
                  disabled={
                    loading || scheduleForm.selectedCustomerIds.length === 0
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>📅</span> Schedule Email (
                      {scheduleForm.selectedCustomerIds.length} customers)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
