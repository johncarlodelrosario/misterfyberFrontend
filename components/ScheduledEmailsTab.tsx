// components/ScheduledEmailsTab.tsx - COMPLETE WITH DELETE & LATEST FIRST
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import emailService, {
  ScheduledEmail,
  ScheduleStats,
  SenderType,
  EmailTemplate,
  Bill,
} from "@/services/emailService";
import RichTextEditor from "./RichTextEditor";
import toast from "react-hot-toast";

const SENDER_OPTIONS: {
  value: SenderType;
  label: string;
  email: string;
  icon: string;
}[] = [
  {
    value: "collection",
    label: "Collection",
    email: "Location-specific",
    icon: "📍",
  },
  {
    value: "admin",
    label: "Admin",
    email: "admin@misterfyber.com",
    icon: "👤",
  },
  {
    value: "workselpueblo",
    label: "Workselpueblo",
    email: "workselpueblo@fyberblizz.com",
    icon: "🏢",
  },
  {
    value: "fbsilkresidence",
    label: "FB Silk Residence",
    email: "fbsilkresidence@gmail.com",
    icon: "🏠",
  },
];

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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const isMounted = useRef(false);
  const schedulesFetchInFlight = useRef(false);
  const statsFetchInFlight = useRef(false);

  const [customerBills, setCustomerBills] = useState<Record<string, Bill[]>>(
    {},
  );
  const [selectedBillsPerCustomer, setSelectedBillsPerCustomer] = useState<
    Record<string, string[]>
  >({});
  const [loadingBillsFor, setLoadingBillsFor] = useState<string | null>(null);
  const [expandedCustomerBills, setExpandedCustomerBills] = useState<
    string | null
  >(null);

  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    subject: "",
    message: "",
    richTextContent: "",
    includeBilling: false,
    billType: "unpaid" as "unpaid" | "latest" | "installation",
    sendCopyToAdmin: false,
    senderType: "collection" as SenderType,
    scheduledFor: "",
    locationFilter: "all" as "all" | "breeze" | "sil" | "other",
    recurringEnabled: false,
    recurringFrequency: "weekly" as "daily" | "weekly" | "monthly",
    recurringInterval: 1,
    recurringEndDate: "",
    selectedCustomerIds: [] as string[],
  });

  const fetchSchedules = useCallback(async () => {
    if (schedulesFetchInFlight.current) return;
    schedulesFetchInFlight.current = true;
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
      schedulesFetchInFlight.current = false;
    }
  }, [selectedStatus, page]);

  const fetchStats = useCallback(async () => {
    if (statsFetchInFlight.current) return;
    statsFetchInFlight.current = true;
    try {
      const statsData = await emailService.getScheduleStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      statsFetchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSchedules(), fetchStats(), loadTemplates()]);
      setLoading(false);
    };
    init();

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;

    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      fetchSchedules().finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedStatus, page, fetchSchedules]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await emailService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }, []);

  const loadBillsForCustomer = useCallback(
    async (applicationId: string) => {
      if (customerBills[applicationId]) {
        setExpandedCustomerBills(
          expandedCustomerBills === applicationId ? null : applicationId,
        );
        return;
      }

      setLoadingBillsFor(applicationId);
      try {
        const result = await emailService.getCustomerBills(applicationId);
        setCustomerBills((prev) => ({
          ...prev,
          [applicationId]: result.bills || [],
        }));
        setExpandedCustomerBills(applicationId);
      } catch (error) {
        console.error("Failed to load bills:", error);
        toast.error("Failed to load customer bills");
      } finally {
        setLoadingBillsFor(null);
      }
    },
    [customerBills, expandedCustomerBills],
  );

  const toggleBillSelection = (applicationId: string, billId: string) => {
    setSelectedBillsPerCustomer((prev) => {
      const current = prev[applicationId] || [];
      const updated = current.includes(billId)
        ? current.filter((id) => id !== billId)
        : [...current, billId];
      return { ...prev, [applicationId]: updated };
    });
  };

  const selectAllBillsForCustomer = (applicationId: string) => {
    const bills = customerBills[applicationId] || [];
    setSelectedBillsPerCustomer((prev) => ({
      ...prev,
      [applicationId]: bills.map((b) => b._id),
    }));
  };

  const deselectAllBillsForCustomer = (applicationId: string) => {
    setSelectedBillsPerCustomer((prev) => ({ ...prev, [applicationId]: [] }));
  };

  const toggleCustomerSelection = (customerId: string) => {
    setScheduleForm((prev) => {
      const isSelected = prev.selectedCustomerIds.includes(customerId);
      const newSelectedIds = isSelected
        ? prev.selectedCustomerIds.filter((id) => id !== customerId)
        : [...prev.selectedCustomerIds, customerId];

      if (isSelected) {
        setSelectedBillsPerCustomer((billPrev) => {
          const updated = { ...billPrev };
          delete updated[customerId];
          return updated;
        });
        if (expandedCustomerBills === customerId)
          setExpandedCustomerBills(null);
      }

      return { ...prev, selectedCustomerIds: newSelectedIds };
    });
  };

  const selectAllCustomers = () => {
    const allIds = filteredCustomers.map((c) => c.applicationId);
    setScheduleForm((prev) => ({ ...prev, selectedCustomerIds: allIds }));
  };

  const deselectAllCustomers = () => {
    setScheduleForm((prev) => ({ ...prev, selectedCustomerIds: [] }));
    setSelectedBillsPerCustomer({});
    setExpandedCustomerBills(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setScheduleForm((prev) => ({
        ...prev,
        subject: template.subject,
        message: template.message,
        richTextContent: template.message,
        includeBilling: template.includeBillingDefault,
      }));
      toast.success(`Template "${template.name}" applied`);
    }
  };

  const convertLocalToUTC = (localDatetime: string): string => {
    const localDate = new Date(localDatetime);
    return localDate.toISOString();
  };

  const handleScheduleEmail = async () => {
    if (!scheduleForm.name.trim())
      return toast.error("Please enter a schedule name");
    if (!scheduleForm.subject.trim())
      return toast.error("Please enter a subject");
    if (!scheduleForm.message.trim() && !scheduleForm.richTextContent.trim())
      return toast.error("Please enter a message");
    if (!scheduleForm.scheduledFor)
      return toast.error("Please select a date and time");

    const localDate = new Date(scheduleForm.scheduledFor);
    if (localDate <= new Date())
      return toast.error("Scheduled time must be in the future");

    const applicationIds = scheduleForm.selectedCustomerIds;
    if (applicationIds.length === 0)
      return toast.error("Please select at least one customer");

    const allSelectedBillIds: string[] = [];
    Object.values(selectedBillsPerCustomer).forEach((billIds) => {
      allSelectedBillIds.push(...billIds);
    });

    if (scheduleForm.includeBilling && allSelectedBillIds.length === 0) {
      return toast.error(
        "Please select at least one bill for at least one customer, or uncheck 'Include Billing'",
      );
    }

    try {
      setLoading(true);
      const utcISOString = convertLocalToUTC(scheduleForm.scheduledFor);

      await emailService.scheduleEmail({
        name: scheduleForm.name,
        applicationIds,
        subject: scheduleForm.subject,
        message: scheduleForm.message,
        richTextContent: scheduleForm.richTextContent,
        includeBilling: scheduleForm.includeBilling,
        billIds: allSelectedBillIds.length > 0 ? allSelectedBillIds : undefined,
        billType: scheduleForm.billType,
        sendCopyToAdmin: scheduleForm.sendCopyToAdmin,
        senderType: scheduleForm.senderType,
        scheduledFor: utcISOString,
        locationFilter: scheduleForm.locationFilter,
        recurring: {
          enabled: scheduleForm.recurringEnabled,
          frequency: scheduleForm.recurringFrequency,
          interval: scheduleForm.recurringInterval,
          endDate: scheduleForm.recurringEndDate || undefined,
        },
      });

      const senderLabel =
        SENDER_OPTIONS.find((s) => s.value === scheduleForm.senderType)
          ?.label || scheduleForm.senderType;
      toast.success(
        `Email scheduled for ${localDate.toLocaleString()} via ${senderLabel}`,
      );
      setShowScheduleDialog(false);
      resetForm();
      await fetchSchedules();
      await fetchStats();
      await onRefresh();
    } catch (error: any) {
      console.error("Failed to schedule email:", error);
      toast.error(error.response?.data?.message || "Failed to schedule email");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setScheduleForm({
      name: "",
      subject: "",
      message: "",
      richTextContent: "",
      includeBilling: false,
      billType: "unpaid",
      sendCopyToAdmin: false,
      senderType: "collection",
      scheduledFor: "",
      locationFilter: "all",
      recurringEnabled: false,
      recurringFrequency: "weekly",
      recurringInterval: 1,
      recurringEndDate: "",
      selectedCustomerIds: [],
    });
    setSelectedBillsPerCustomer({});
    setCustomerBills({});
    setExpandedCustomerBills(null);
    setSelectedTemplateId("");
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    if (
      !window.confirm("Are you sure you want to cancel this scheduled email?")
    )
      return;
    try {
      await emailService.cancelScheduledEmail(scheduleId);
      toast.success("Scheduled email cancelled");
      await fetchSchedules();
      await fetchStats();
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
      toast.error("Failed to cancel schedule");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to PERMANENTLY DELETE this scheduled email?",
      )
    )
      return;
    try {
      await emailService.deleteScheduledEmail(scheduleId);
      toast.success("Scheduled email deleted");
      await fetchSchedules();
      await fetchStats();
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

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

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        (c.firstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (c.applicationId?.toLowerCase() || "").includes(
          searchTerm.toLowerCase(),
        );

      let matchesBuilding = true;
      if (buildingFilter === "breeze") {
        matchesBuilding = (c.buildingName || "")
          .toLowerCase()
          .includes("breeze");
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
  }, [customers, searchTerm, buildingFilter]);

  const breezeCount = useMemo(
    () =>
      customers.filter((c) =>
        (c.buildingName || "").toLowerCase().includes("breeze"),
      ).length,
    [customers],
  );
  const silCount = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.buildingName || "").toLowerCase().includes("sil") ||
          (c.buildingName || "").toLowerCase().includes("silk"),
      ).length,
    [customers],
  );
  const otherCount = useMemo(
    () =>
      customers.filter(
        (c) =>
          !(c.buildingName || "").toLowerCase().includes("breeze") &&
          !(c.buildingName || "").toLowerCase().includes("sil") &&
          !(c.buildingName || "").toLowerCase().includes("silk"),
      ).length,
    [customers],
  );

  const totalSelectedBills = useMemo(() => {
    return Object.values(selectedBillsPerCustomer).reduce(
      (sum, ids) => sum + ids.length,
      0,
    );
  }, [selectedBillsPerCustomer]);

  return (
    <div>
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

      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {["all", "pending", "sent"].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedStatus === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s === "all"
                ? "📋 All"
                : s === "pending"
                  ? "⏳ Pending"
                  : "✅ Sent"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowScheduleDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>📅</span> Schedule Email
        </button>
      </div>

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
          {schedules.map((schedule) => {
            const senderOption = SENDER_OPTIONS.find(
              (s) => s.value === (schedule.senderType || "collection"),
            );
            const senderLabel = senderOption?.label || "Collection";
            const senderIcon = senderOption?.icon || "📍";

            return (
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
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(schedule.status)}`}
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
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {senderIcon} {senderLabel}
                      </span>
                      {schedule.billIds && schedule.billIds.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                          📋 {schedule.billIds.length} specific bill(s)
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

                    {schedule.status !== "processing" && (
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
            );
          })}

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

      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">📅 Schedule Email</h3>
                <button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Select Customers ({scheduleForm.selectedCustomerIds.length}{" "}
                    selected
                    {totalSelectedBills > 0 && ` • ${totalSelectedBills} bills`}
                    )
                  </h4>
                  <div className="mb-3">
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          key: "all",
                          label: `All (${customers.length})`,
                          cls: "bg-gray-800 text-white border-gray-800",
                        },
                        {
                          key: "breeze",
                          label: `🌊 Breeze (${breezeCount})`,
                          cls: "bg-blue-600 text-white border-blue-600",
                        },
                        {
                          key: "sil",
                          label: `🏢 SIL (${silCount})`,
                          cls: "bg-purple-600 text-white border-purple-600",
                        },
                        {
                          key: "other",
                          label: `📍 Other (${otherCount})`,
                          cls: "bg-gray-600 text-white border-gray-600",
                        },
                      ].map((b) => (
                        <button
                          key={b.key}
                          onClick={() => setBuildingFilter(b.key)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            buildingFilter === b.key
                              ? b.cls
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={selectAllCustomers}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllCustomers}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg p-2">
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
                        const isSelected =
                          scheduleForm.selectedCustomerIds.includes(
                            customer.applicationId,
                          );
                        const isExpanded =
                          expandedCustomerBills === customer.applicationId;
                        const customerBillList =
                          customerBills[customer.applicationId] || [];
                        const customerSelectedBills =
                          selectedBillsPerCustomer[customer.applicationId] ||
                          [];

                        return (
                          <div
                            key={customer.applicationId}
                            className={`rounded-lg border transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start p-2">
                              <input
                                type="checkbox"
                                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={isSelected}
                                onChange={() =>
                                  toggleCustomerSelection(
                                    customer.applicationId,
                                  )
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
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    🏢 {customer.buildingName}
                                  </p>
                                )}

                                {isSelected && scheduleForm.includeBilling && (
                                  <div className="mt-2">
                                    <button
                                      onClick={() =>
                                        loadBillsForCustomer(
                                          customer.applicationId,
                                        )
                                      }
                                      disabled={
                                        loadingBillsFor ===
                                        customer.applicationId
                                      }
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                      {loadingBillsFor ===
                                      customer.applicationId ? (
                                        <>
                                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                          Loading bills...
                                        </>
                                      ) : (
                                        <>
                                          {isExpanded ? "▼" : "▶"} Select bills
                                          {customerSelectedBills.length > 0 &&
                                            ` (${customerSelectedBills.length} selected)`}
                                        </>
                                      )}
                                    </button>

                                    {isExpanded && (
                                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200 p-2">
                                        {customerBillList.length === 0 ? (
                                          <p className="text-xs text-gray-400 text-center py-2">
                                            No bills found for this customer
                                          </p>
                                        ) : (
                                          <>
                                            <div className="flex gap-2 mb-2 pb-2 border-b border-gray-100">
                                              <button
                                                onClick={() =>
                                                  selectAllBillsForCustomer(
                                                    customer.applicationId,
                                                  )
                                                }
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                              >
                                                Select All
                                              </button>
                                              <button
                                                onClick={() =>
                                                  deselectAllBillsForCustomer(
                                                    customer.applicationId,
                                                  )
                                                }
                                                className="text-xs text-red-600 hover:text-red-800"
                                              >
                                                Clear
                                              </button>
                                            </div>
                                            {customerBillList.map((bill) => (
                                              <label
                                                key={bill._id}
                                                className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={customerSelectedBills.includes(
                                                    bill._id,
                                                  )}
                                                  onChange={() =>
                                                    toggleBillSelection(
                                                      customer.applicationId,
                                                      bill._id,
                                                    )
                                                  }
                                                  className="w-3.5 h-3.5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex justify-between items-start gap-2">
                                                    <span className="text-xs font-medium text-gray-800 truncate">
                                                      {bill.invoiceNumber ||
                                                        "N/A"}
                                                    </span>
                                                    <span className="text-xs font-bold text-red-600 whitespace-nowrap">
                                                      ₱
                                                      {(
                                                        bill.total || 0
                                                      ).toLocaleString(
                                                        undefined,
                                                        {
                                                          minimumFractionDigits: 2,
                                                          maximumFractionDigits: 2,
                                                        },
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <span className="text-[10px] text-gray-500">
                                                      Due:{" "}
                                                      {bill.dueDate
                                                        ? new Date(
                                                            bill.dueDate,
                                                          ).toLocaleDateString()
                                                        : "N/A"}
                                                    </span>
                                                    <span
                                                      className={`text-[10px] px-1 rounded ${
                                                        bill.status === "paid"
                                                          ? "bg-green-100 text-green-700"
                                                          : bill.status ===
                                                              "overdue"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                      }`}
                                                    >
                                                      {bill.status}
                                                    </span>
                                                    {bill.isInstallationBill && (
                                                      <span className="text-[10px] px-1 rounded bg-orange-100 text-orange-700">
                                                        Installation
                                                      </span>
                                                    )}
                                                    {bill.isProRated && (
                                                      <span className="text-[10px] px-1 rounded bg-purple-100 text-purple-700">
                                                        Pro-rated
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </label>
                                            ))}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Selected:{" "}
                    <strong>{scheduleForm.selectedCustomerIds.length}</strong>{" "}
                    customers
                    {totalSelectedBills > 0 && (
                      <>
                        {" "}
                        • <strong>{totalSelectedBills}</strong> bills selected
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📝 Use Template (optional)
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                    >
                      <option value="">-- Select a template --</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </option>
                      ))}
                    </select>
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Date & Time * (Philippines Time)
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
                    <p className="text-xs text-gray-500 mt-1">
                      🕐 Timezone:{" "}
                      {Intl.DateTimeFormat().resolvedOptions().timeZone} (UTC
                      {new Date().getTimezoneOffset() <= 0 ? "+" : "-"}
                      {Math.abs(new Date().getTimezoneOffset() / 60)})
                    </p>
                    {scheduleForm.scheduledFor && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Will be sent at:{" "}
                        {new Date(scheduleForm.scheduledFor).toLocaleString(
                          "en-PH",
                          {
                            timeZone: "Asia/Manila",
                            dateStyle: "full",
                            timeStyle: "short",
                          },
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📧 Send From
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SENDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setScheduleForm({
                              ...scheduleForm,
                              senderType: option.value,
                            })
                          }
                          className={`px-3 py-2 rounded-lg border text-xs transition-colors text-left ${
                            scheduleForm.senderType === option.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-300 hover:border-gray-400 text-gray-700"
                          }`}
                        >
                          <span className="block font-medium">
                            {option.icon} {option.label}
                          </span>
                          <span className="text-xs text-gray-500 truncate block">
                            {option.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Filter
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={scheduleForm.locationFilter}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            locationFilter: e.target.value as any,
                          })
                        }
                      >
                        <option value="all">All Locations</option>
                        <option value="breeze">🌊 Breeze</option>
                        <option value="sil">🏢 SIL</option>
                        <option value="other">📍 Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={scheduleForm.includeBilling}
                        onChange={(e) => {
                          const newIncludeBilling = e.target.checked;
                          setScheduleForm({
                            ...scheduleForm,
                            includeBilling: newIncludeBilling,
                          });
                          if (!newIncludeBilling) {
                            setSelectedBillsPerCustomer({});
                            setExpandedCustomerBills(null);
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Include Billing
                        {scheduleForm.includeBilling && (
                          <span className="text-xs text-blue-600 ml-2">
                            (Select bills per customer on the left)
                          </span>
                        )}
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
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
                    <label className="flex items-center cursor-pointer">
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

                  {scheduleForm.includeBilling && totalSelectedBills > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-800">
                        📋 {totalSelectedBills} bill(s) selected across{" "}
                        {
                          Object.keys(selectedBillsPerCustomer).filter(
                            (k) => selectedBillsPerCustomer[k].length > 0,
                          ).length
                        }{" "}
                        customer(s)
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Only these specific bills will be included in the
                        scheduled emails.
                      </p>
                    </div>
                  )}
                </div>
              </div>

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
                      {scheduleForm.selectedCustomerIds.length} customers
                      {totalSelectedBills > 0 &&
                        `, ${totalSelectedBills} bills`}
                      )
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
