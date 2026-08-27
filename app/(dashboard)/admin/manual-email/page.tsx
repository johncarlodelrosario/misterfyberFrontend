// app/admin/email/page.tsx (Updated Templates Tab)

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import emailService, {
  Customer,
  EmailTemplate,
  EmailSentRecord,
} from "@/services/emailService";
import RichTextEditor from "@/components/RichTextEditor";
import ScheduledEmailsTab from "@/components/ScheduledEmailsTab";
import toast from "react-hot-toast";

export default function ManualEmailPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "single" | "bulk" | "templates" | "sent" | "scheduled"
  >("single");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerBills, setCustomerBills] = useState<any[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentRecords, setSentRecords] = useState<EmailSentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [totalEmailsSent, setTotalEmailsSent] = useState<number>(0);

  // Email form state
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [richTextContent, setRichTextContent] = useState("");
  const [includeBilling, setIncludeBilling] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [sendCopyToAdmin, setSendCopyToAdmin] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Bulk email state
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [bulkBillType, setBulkBillType] = useState<
    "unpaid" | "latest" | "installation"
  >("unpaid");
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  // Sender type state
  const [useAdminSender, setUseAdminSender] = useState(false);

  // Location state
  const [customerLocation, setCustomerLocation] = useState<string>("");
  const [collectionEmail, setCollectionEmail] = useState<string>("");

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLocation, setPreviewLocation] = useState("");
  const [previewSenderInfo, setPreviewSenderInfo] = useState("");

  // Template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    message: "",
    category: "general",
    includeBillingDefault: false,
  });

  // Edit Template dialog
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );

  // Reminder dialog
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [includeDueDateReminder, setIncludeDueDateReminder] = useState(true);

  // Refs
  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ==================== HELPER FUNCTIONS ====================
  const getLocationFromBuildingName = (buildingName?: string): string => {
    if (!buildingName) return "other";
    const name = buildingName.toLowerCase().trim();
    if (name.includes("breeze")) return "breeze";
    if (name.includes("sil") || name.includes("silk")) return "sil";
    return "other";
  };

  const getCollectionEmailForLocation = (location: string): string => {
    if (location === "breeze") {
      return (
        process.env.NEXT_PUBLIC_COLLECTION_EMAIL_BREEZE ||
        "collection.breeze@misterfyber.com"
      );
    } else if (location === "sil") {
      return (
        process.env.NEXT_PUBLIC_COLLECTION_EMAIL_SIL ||
        "collection.silk@misterfyber.com"
      );
    }
    return (
      process.env.NEXT_PUBLIC_COLLECTION_EMAIL_DEFAULT ||
      "admin@misterfyber.com"
    );
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

  // ==================== UPDATE LOCATION ====================
  useEffect(() => {
    if (selectedCustomer) {
      const location = getLocationFromBuildingName(
        selectedCustomer.buildingName,
      );
      const email = getCollectionEmailForLocation(location);
      setCustomerLocation(location);
      setCollectionEmail(email);
    } else {
      setCustomerLocation("");
      setCollectionEmail("");
    }
  }, [selectedCustomer]);

  // ==================== CALCULATE TOTAL EMAILS SENT ====================
  useEffect(() => {
    const total = sentRecords.filter(
      (record) => record.status === "sent",
    ).length;
    setTotalEmailsSent(total);
  }, [sentRecords]);

  // ==================== LOAD FUNCTIONS ====================
  const loadCustomers = useCallback(
    async (search?: string, forceRefresh = false, location?: string) => {
      if (!isMountedRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const data = await emailService.getCustomers({
          search,
          forceRefresh,
          location,
        });

        const processedData = (data || []).map((customer) => ({
          ...customer,
          buildingName: customer.buildingName || "",
        }));

        setCustomers(processedData);
      } catch (error: any) {
        console.error("Failed to load customers:", error);
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Failed to load customers";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const loadTemplates = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const data = await emailService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setTemplates([]);
    }
  }, []);

  const loadSentRecords = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const data = await emailService.getSentRecords();
      setSentRecords(data || []);
    } catch (error) {
      console.error("Failed to load sent records:", error);
      setSentRecords([]);
    }
  }, []);

  const loadCustomerBills = async (applicationId: string) => {
    try {
      const data = await emailService.getCustomerBills(applicationId);
      setCustomerBills(data?.bills || []);
      setSelectedBillIds([]);
    } catch (error) {
      console.error("Failed to load customer bills:", error);
      toast.error("Failed to load customer bills");
      setCustomerBills([]);
      setSelectedBillIds([]);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    isMountedRef.current = true;

    const loadAllData = async () => {
      await Promise.all([
        loadCustomers("", true),
        loadTemplates(),
        loadSentRecords(),
      ]);
      initialLoadDone.current = true;
    };

    loadAllData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadCustomers, loadTemplates, loadSentRecords]);

  // ==================== HANDLERS ====================
  const handleCustomerSelect = async (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      await loadCustomerBills(customer.applicationId);
    } else {
      setCustomerBills([]);
      setSelectedBillIds([]);
    }
  };

  // FIXED: Load template with proper formatting preservation
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Set subject
      setSubject(template.subject || "");

      // Set message - PRESERVE THE EXACT FORMATTING
      const templateMessage = template.message || "";

      // Check if the message already has HTML formatting
      const hasHtml = /<[a-z][\s\S]*>/i.test(templateMessage);

      if (hasHtml) {
        // If it has HTML, use it directly as rich text content
        setRichTextContent(templateMessage);
        // Extract plain text for the message field
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateMessage;
        setMessage(tempDiv.textContent || "");
      } else {
        // If it's plain text, convert to HTML with line breaks preserved
        const htmlContent = templateMessage.replace(/\n/g, "<br>");
        setRichTextContent(htmlContent);
        setMessage(templateMessage);
      }

      setIncludeBilling(template.includeBillingDefault || false);
    }
  };

  const toggleBillSelection = (billId: string) => {
    setSelectedBillIds((prev) => {
      if (prev.includes(billId)) {
        return prev.filter((id) => id !== billId);
      } else {
        return [...prev, billId];
      }
    });
  };

  const selectAllBills = () => {
    const allBillIds = customerBills.map((bill) => bill._id);
    setSelectedBillIds(allBillIds);
  };

  const deselectAllBills = () => {
    setSelectedBillIds([]);
  };

  const handlePreview = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer first");
      return;
    }

    try {
      setLoading(true);
      const preview = await emailService.previewEmail({
        subject,
        message: richTextContent || message,
        richTextContent: richTextContent || message,
        includeBilling,
        applicationId: selectedCustomer.applicationId,
        billIds: includeBilling ? selectedBillIds : undefined,
        useAdminSender,
      });
      setPreviewHtml(preview.html || "");
      setPreviewLocation(preview.location || "unknown");
      setPreviewSenderInfo(preview.senderInfo || "");
      setPreviewOpen(true);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      toast.error("Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (!subject.trim() || !(message.trim() || richTextContent.trim())) {
      toast.error("Please enter subject and message");
      return;
    }

    if (includeBilling && selectedBillIds.length === 0) {
      toast.error("Please select at least one bill to include");
      return;
    }

    try {
      setLoading(true);
      const result = await emailService.sendEmail({
        applicationId: selectedCustomer.applicationId,
        subject,
        message: richTextContent || message,
        richTextContent: richTextContent || message,
        includeBilling,
        billIds: includeBilling ? selectedBillIds : undefined,
        sendCopyToAdmin,
        useAdminSender,
      });

      const senderDisplay = useAdminSender ? "Admin" : "Collection";
      const locationDisplay = customerLocation
        ? customerLocation.toUpperCase()
        : "Unknown";
      toast.success(
        `✅ Email sent via ${senderDisplay} to ${selectedCustomer.firstName} ${selectedCustomer.lastName} (${locationDisplay})`,
      );

      await Promise.all([loadSentRecords(), loadCustomers(searchTerm, true)]);

      setSubject("");
      setMessage("");
      setRichTextContent("");
      setIncludeBilling(false);
      setSelectedBillIds([]);
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error(error.response?.data?.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkEmails = async () => {
    if (selectedCustomers.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }

    if (!subject.trim() || !(message.trim() || richTextContent.trim())) {
      toast.error("Please enter subject and message");
      return;
    }

    try {
      setLoading(true);
      const result = await emailService.sendBulkEmails({
        applicationIds: selectedCustomers.map((c) => c.applicationId),
        subject,
        message: richTextContent || message,
        richTextContent: richTextContent || message,
        includeBilling,
        billType: bulkBillType,
        sendCopyToAdmin,
        useAdminSender,
        locationFilter: buildingFilter !== "all" ? buildingFilter : undefined,
      });

      const senderDisplay = useAdminSender ? "Admin" : "Collection";
      toast.success(
        `✅ Bulk emails sent via ${senderDisplay} - ${result.message}`,
      );

      await Promise.all([loadSentRecords(), loadCustomers(searchTerm, true)]);

      setSelectedCustomers([]);
      setSubject("");
      setMessage("");
      setRichTextContent("");
    } catch (error: any) {
      console.error("Failed to send bulk emails:", error);
      toast.error(
        error.response?.data?.message || "Failed to send bulk emails",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminderToUnpaid = async () => {
    try {
      setLoading(true);
      const result = await emailService.sendReminderToUnpaid(
        reminderMessage,
        includeDueDateReminder,
        useAdminSender,
      );

      const senderDisplay = useAdminSender ? "Admin" : "Collection";
      toast.success(
        `✅ Reminders sent via ${senderDisplay} - ${result.message}`,
      );

      setShowReminderDialog(false);
      setReminderMessage("");

      await Promise.all([loadSentRecords(), loadCustomers(searchTerm, true)]);
    } catch (error: any) {
      console.error("Failed to send reminders:", error);
      toast.error(error.response?.data?.message || "Failed to send reminders");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.message) {
      toast.error("Please fill in all template fields");
      return;
    }

    try {
      await emailService.saveTemplate(newTemplate);
      toast.success("Template saved successfully");
      setShowTemplateDialog(false);
      setNewTemplate({
        name: "",
        subject: "",
        message: "",
        category: "general",
        includeBillingDefault: false,
      });
      await loadTemplates();
    } catch (error: any) {
      console.error("Failed to save template:", error);
      toast.error(error.response?.data?.message || "Failed to save template");
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name || "",
      subject: template.subject || "",
      message: template.message || "",
      category: template.category || "general",
      includeBillingDefault: template.includeBillingDefault || false,
    });
    setShowEditTemplateDialog(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) {
      toast.error("No template selected for editing");
      return;
    }

    if (!newTemplate.name || !newTemplate.subject || !newTemplate.message) {
      toast.error("Please fill in all template fields");
      return;
    }

    try {
      await emailService.updateTemplate(editingTemplate.id, newTemplate);
      toast.success("Template updated successfully");
      setShowEditTemplateDialog(false);
      setEditingTemplate(null);
      setNewTemplate({
        name: "",
        subject: "",
        message: "",
        category: "general",
        includeBillingDefault: false,
      });
      await loadTemplates();
    } catch (error: any) {
      console.error("Failed to update template:", error);
      toast.error(error.response?.data?.message || "Failed to update template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        await emailService.deleteTemplate(templateId);
        toast.success("Template deleted successfully");
        await loadTemplates();
      } catch (error) {
        console.error("Failed to delete template:", error);
        toast.error("Failed to delete template");
      }
    }
  };

  const handleDeleteSentRecord = async (recordId: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await emailService.deleteSentRecord(recordId);
        toast.success("Record deleted successfully");
        await loadSentRecords();
      } catch (error) {
        console.error("Failed to delete record:", error);
        toast.error("Failed to delete record");
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCustomers("", true),
        loadTemplates(),
        loadSentRecords(),
      ]);
      setRefreshKey((prev) => prev + 1);
      toast.success("✅ All data refreshed successfully!");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTERS ====================
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

  const filteredUnpaidCustomers = filteredCustomers.filter(
    (c) => c.hasUnpaidBills === true,
  );
  const displayCustomers = showUnpaidOnly
    ? filteredUnpaidCustomers
    : filteredCustomers;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📧 Manual Email Management
              </h1>
              <p className="text-gray-500 mt-1">
                Send custom emails to customers with rich text formatting and
                scheduling
              </p>
              <p className="text-xs text-gray-400 mt-1">
                🔄 Last updated: {new Date().toLocaleTimeString()}
                {customers.length > 0 &&
                  ` • ${customers.length} customers loaded`}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Refreshing...
                </>
              ) : (
                <>🔄 Refresh All</>
              )}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">📧 Total Emails Sent</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalEmailsSent}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">🌊 Breeze Customers</p>
              <p className="text-2xl font-bold text-blue-600">{breezeCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">🏢 SIL Customers</p>
              <p className="text-2xl font-bold text-purple-600">{silCount}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: "single", name: "Single Email", icon: "✉️" },
              { id: "bulk", name: "Bulk Email", icon: "👥" },
              { id: "templates", name: "Templates", icon: "📄" },
              { id: "sent", name: "Sent Records", icon: "📨" },
              { id: "scheduled", name: "📅 Scheduled", icon: "📅" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
                {tab.id === "sent" && totalEmailsSent > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {totalEmailsSent}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div key={`content-${refreshKey}`}>
          {/* Single Email Tab - same as before */}
          {activeTab === "single" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Customer Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Customer
                </h2>

                {/* Building Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Building
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setBuildingFilter("all")}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        buildingFilter === "all"
                          ? "bg-gray-800 text-white border-gray-800"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      All ({customers.length})
                    </button>
                    <button
                      onClick={() => setBuildingFilter("breeze")}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        buildingFilter === "breeze"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      🌊 Breeze ({breezeCount})
                    </button>
                    <button
                      onClick={() => setBuildingFilter("sil")}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        buildingFilter === "sil"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50"
                      }`}
                    >
                      🏢 SIL ({silCount})
                    </button>
                    <button
                      onClick={() => setBuildingFilter("other")}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        buildingFilter === "other"
                          ? "bg-gray-600 text-white border-gray-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      📍 Other ({otherCount})
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Search by name, email, or application ID..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {loading && customers.length === 0 && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {error && !loading && customers.length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600 text-sm">{error}</p>
                    <button
                      onClick={() => loadCustomers(searchTerm, true)}
                      className="mt-2 text-sm text-red-700 underline"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!loading && !error && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {displayCustomers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No customers found</p>
                        <button
                          onClick={() => loadCustomers("", true)}
                          className="mt-2 text-sm text-blue-600 underline"
                        >
                          🔄 Refresh customer list
                        </button>
                      </div>
                    ) : (
                      displayCustomers.map((customer) => {
                        const location = getLocationFromBuildingName(
                          customer.buildingName,
                        );
                        const locationDisplay = getLocationDisplay(location);
                        const badgeColor = getLocationBadgeColor(location);

                        return (
                          <button
                            key={customer._id || customer.applicationId}
                            onClick={() => handleCustomerSelect(customer)}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${
                              selectedCustomer?.applicationId ===
                              customer.applicationId
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {customer.firstName || ""}{" "}
                                  {customer.lastName || ""}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {customer.email || "No email"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  ID: {customer.applicationId || "N/A"}
                                </p>
                                {customer.buildingName && (
                                  <p className="text-xs text-gray-400">
                                    🏢 {customer.buildingName}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {location !== "other" && (
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full border ${badgeColor}`}
                                  >
                                    {locationDisplay}
                                  </span>
                                )}
                                {customer.hasUnpaidBills && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                    ⚠️ Unpaid
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      Selected Customer
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      <strong>
                        {selectedCustomer.firstName || ""}{" "}
                        {selectedCustomer.lastName || ""}
                      </strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer.email || "No email"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {selectedCustomer.phoneNumber || "N/A"}
                    </p>
                    {selectedCustomer.buildingName && (
                      <p className="text-sm text-gray-600">
                        🏢 Building: {selectedCustomer.buildingName}
                      </p>
                    )}
                    {customerLocation && customerLocation !== "other" && (
                      <div className="mt-2">
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full border ${getLocationBadgeColor(customerLocation)}`}
                        >
                          📍 {getLocationDisplay(customerLocation)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Collection: {collectionEmail}
                        </span>
                      </div>
                    )}
                    {selectedCustomer.hasUnpaidBills && (
                      <span className="inline-flex items-center mt-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        ⚠️ Has Unpaid Bills
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Compose Email */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Compose Email
                </h2>

                {selectedCustomer &&
                  customerLocation &&
                  customerLocation !== "other" && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>📍 Location Detected:</strong>{" "}
                        {getLocationDisplay(customerLocation)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Collection Email: {collectionEmail}
                      </p>
                      <p className="text-xs text-blue-600">
                        Building: {selectedCustomer.buildingName || "N/A"}
                      </p>
                    </div>
                  )}

                {/* Template Selector - FIXED */}
                {templates.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Load Template
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                    >
                      <option value="">None</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name || "Unnamed"} (
                          {template.category || "general"})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Loading a template will preserve all formatting (bold,
                      italic, highlight, lists, spacing)
                    </p>
                  </div>
                )}

                {/* Sender Type Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📧 Send From
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUseAdminSender(false)}
                      className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                        !useAdminSender
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400 text-gray-700"
                      }`}
                    >
                      <span className="block font-medium">Collection</span>
                      <span className="text-xs text-gray-500 truncate">
                        {selectedCustomer &&
                        customerLocation &&
                        customerLocation !== "other"
                          ? collectionEmail
                          : "No location detected"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseAdminSender(true)}
                      className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                        useAdminSender
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400 text-gray-700"
                      }`}
                    >
                      <span className="block font-medium">Admin</span>
                      <span className="text-xs text-gray-500">
                        admin@misterfyber.com
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <RichTextEditor
                    value={richTextContent || message}
                    onChange={(content) => {
                      setRichTextContent(content);
                      const tempDiv = document.createElement("div");
                      tempDiv.innerHTML = content;
                      setMessage(tempDiv.textContent || "");
                    }}
                    placeholder="Write your email message here..."
                    minHeight="200px"
                    maxHeight="350px"
                  />
                </div>

                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={includeBilling}
                    onChange={(e) => {
                      setIncludeBilling(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedBillIds([]);
                      }
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include Billing Information
                  </span>
                </label>

                {includeBilling && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Bills ({selectedBillIds.length} selected)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllBills}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllBills}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {customerBills.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {customerBills.map((bill) => (
                          <label
                            key={bill._id}
                            className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                              selectedBillIds.includes(bill._id)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedBillIds.includes(bill._id)}
                              onChange={() => toggleBillSelection(bill._id)}
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {bill.invoiceNumber || "N/A"}
                                </span>
                                <span className="text-sm font-bold text-red-600">
                                  ₱{(bill.total || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    bill.status === "paid"
                                      ? "bg-green-100 text-green-700"
                                      : bill.status === "overdue"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {bill.status || "N/A"}
                                </span>
                                {bill.isInstallationBill && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    Installation
                                  </span>
                                )}
                                {bill.isProRated && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                    Pro-rated
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  Due:{" "}
                                  {new Date(bill.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                        No bills found for this customer. Please create a bill
                        first.
                      </p>
                    )}

                    {selectedBillIds.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Selected {selectedBillIds.length} bill(s)
                        </p>
                        <p className="text-xs text-gray-500">
                          Total: ₱
                          {customerBills
                            .filter((b) => selectedBillIds.includes(b._id))
                            .reduce((sum, b) => sum + (b.total || 0), 0)
                            .toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={sendCopyToAdmin}
                    onChange={(e) => setSendCopyToAdmin(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Send copy to admin
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={
                      !selectedCustomer ||
                      !subject.trim() ||
                      !(message.trim() || richTextContent.trim())
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔍 Preview
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={
                      loading ||
                      !selectedCustomer ||
                      !subject.trim() ||
                      !(message.trim() || richTextContent.trim()) ||
                      (includeBilling && selectedBillIds.length === 0)
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>✉️</span> Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Email Tab - same as before */}
          {activeTab === "bulk" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ... bulk email content ... */}
            </div>
          )}

          {/* TEMPLATES TAB - FIXED with proper formatting display */}
          {activeTab === "templates" && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setShowTemplateDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <span>💾</span> Save Current as Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {template.name || "Unnamed"}
                      </h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                          title="Edit template"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Delete template"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Category: {template.category || "general"}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Subject: {template.subject || ""}
                    </p>
                    {/* FIXED: Display template with preserved formatting */}
                    <div
                      className="text-sm text-gray-600 mb-4 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg"
                      dangerouslySetInnerHTML={{
                        __html:
                          (template.message || "").length > 200
                            ? (template.message || "").substring(0, 200) + "..."
                            : template.message || "",
                      }}
                    />
                    <button
                      onClick={() => {
                        // FIXED: Load template with proper formatting preservation
                        const templateMessage = template.message || "";
                        const hasHtml = /<[a-z][\s\S]*>/i.test(templateMessage);

                        setSubject(template.subject || "");

                        if (hasHtml) {
                          setRichTextContent(templateMessage);
                          const tempDiv = document.createElement("div");
                          tempDiv.innerHTML = templateMessage;
                          setMessage(tempDiv.textContent || "");
                        } else {
                          const htmlContent = templateMessage.replace(
                            /\n/g,
                            "<br>",
                          );
                          setRichTextContent(htmlContent);
                          setMessage(templateMessage);
                        }

                        setIncludeBilling(
                          template.includeBillingDefault || false,
                        );
                        setActiveTab("single");
                      }}
                      className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Load & Use
                    </button>
                  </div>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-700">
                    No templates saved yet. Create your first template using the
                    button above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sent Records Tab */}
          {activeTab === "sent" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* ... sent records content ... */}
            </div>
          )}

          {/* Scheduled Emails Tab */}
          {activeTab === "scheduled" && (
            <ScheduledEmailsTab
              customers={customers}
              customersLoading={loading}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Email Preview</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {previewLocation && previewLocation !== "unknown" && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-700">
                  📍 Location: {getLocationDisplay(previewLocation)}
                </p>
                <p className="text-xs text-blue-600">{previewSenderInfo}</p>
              </div>
            )}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-160px)]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Save Email Template</h3>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Template Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Category"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, category: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.subject}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, subject: e.target.value })
                }
              />
              <textarea
                rows={4}
                placeholder="Message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.message}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, message: e.target.value })
                }
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  checked={newTemplate.includeBillingDefault}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      includeBillingDefault: e.target.checked,
                    })
                  }
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include billing by default
                </span>
              </label>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Dialog */}
      {showEditTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Email Template</h3>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Template Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Category"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, category: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Subject"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.subject}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, subject: e.target.value })
                }
              />
              <textarea
                rows={4}
                placeholder="Message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={newTemplate.message}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, message: e.target.value })
                }
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  checked={newTemplate.includeBillingDefault}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      includeBillingDefault: e.target.checked,
                    })
                  }
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include billing by default
                </span>
              </label>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowEditTemplateDialog(false);
                  setEditingTemplate(null);
                  setNewTemplate({
                    name: "",
                    subject: "",
                    message: "",
                    category: "general",
                    includeBillingDefault: false,
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Dialog */}
      {showReminderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                Send Reminder to Unpaid Customers
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                This will send payment reminders to all customers with unpaid
                bills.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📧 Send From
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUseAdminSender(false)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      !useAdminSender
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700"
                    }`}
                  >
                    <span className="block font-medium">Collection</span>
                    <span className="text-xs text-gray-500">
                      Location-specific
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAdminSender(true)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      useAdminSender
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400 text-gray-700"
                    }`}
                  >
                    <span className="block font-medium">Admin</span>
                    <span className="text-xs text-gray-500">
                      admin@misterfyber.com
                    </span>
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Custom Message (Optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  checked={includeDueDateReminder}
                  onChange={(e) => setIncludeDueDateReminder(e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include due date information
                </span>
              </label>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowReminderDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminderToUnpaid}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Send Reminders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
