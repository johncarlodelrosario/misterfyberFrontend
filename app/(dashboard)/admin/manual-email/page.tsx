// frontend/app/manual-email/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import emailService, {
  Customer,
  Bill,
  EmailTemplate,
  EmailSentRecord,
} from "@/services/emailService";
import toast from "react-hot-toast";

// ==================== GLOBAL CACHE ====================
let globalCache: any = null;
let globalCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function ManualEmailPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "single" | "bulk" | "templates" | "sent"
  >("single");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerBills, setCustomerBills] = useState<Bill[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentRecords, setSentRecords] = useState<EmailSentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Email form state
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeBilling, setIncludeBilling] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState("");
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

  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  // ==================== HELPER FUNCTIONS ====================
  const getLocationFromBuildingName = (buildingName?: string): string => {
    if (!buildingName) {
      return "other";
    }
    const name = buildingName.toLowerCase().trim();
    if (name.includes("breeze")) {
      return "breeze";
    }
    if (name.includes("sil") || name.includes("silk")) {
      return "sil";
    }
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

  // ==================== UPDATE LOCATION WHEN CUSTOMER SELECTED ====================
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

  // ==================== LOAD FUNCTIONS WITH CACHING ====================
  const loadCustomers = useCallback(async (search?: string) => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    if (
      globalCache &&
      globalCache.customers &&
      now - globalCacheTimestamp < CACHE_TTL
    ) {
      setCustomers(globalCache.customers);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await emailService.getCustomers({ search });

      // Ensure each customer has buildingName property
      const processedData = (data || []).map((customer) => ({
        ...customer,
        buildingName: customer.buildingName || "",
      }));

      setCustomers(processedData);

      if (!globalCache) globalCache = {};
      globalCache.customers = processedData;
      globalCacheTimestamp = now;
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
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    if (
      globalCache &&
      globalCache.templates &&
      now - globalCacheTimestamp < CACHE_TTL
    ) {
      setTemplates(globalCache.templates);
      return;
    }

    try {
      const data = await emailService.getTemplates();
      setTemplates(data || []);

      if (!globalCache) globalCache = {};
      globalCache.templates = data || [];
      globalCacheTimestamp = now;
    } catch (error) {
      console.error("Failed to load templates:", error);
      setTemplates([]);
    }
  }, []);

  const loadSentRecords = useCallback(async () => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    if (
      globalCache &&
      globalCache.sentRecords &&
      now - globalCacheTimestamp < CACHE_TTL
    ) {
      setSentRecords(globalCache.sentRecords);
      return;
    }

    try {
      const data = await emailService.getSentRecords();
      setSentRecords(data || []);

      if (!globalCache) globalCache = {};
      globalCache.sentRecords = data || [];
      globalCacheTimestamp = now;
    } catch (error) {
      console.error("Failed to load sent records:", error);
      setSentRecords([]);
    }
  }, []);

  const loadCustomerBills = async (applicationId: string) => {
    try {
      const data = await emailService.getCustomerBills(applicationId);
      setCustomerBills(data?.bills || []);
    } catch (error) {
      console.error("Failed to load customer bills:", error);
      toast.error("Failed to load customer bills");
      setCustomerBills([]);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    isMountedRef.current = true;

    const loadAllData = async () => {
      await Promise.all([loadCustomers(), loadTemplates(), loadSentRecords()]);
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
      setSelectedBillId("");
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject || "");
      setMessage(template.message || "");
      setIncludeBilling(template.includeBillingDefault || false);
    }
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
        message,
        includeBilling,
        applicationId: selectedCustomer.applicationId,
        billId: includeBilling ? selectedBillId : undefined,
        useAdminSender: useAdminSender,
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

    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter subject and message");
      return;
    }

    if (includeBilling && !selectedBillId) {
      toast.error("Please select a bill to include");
      return;
    }

    try {
      setLoading(true);
      const result = await emailService.sendEmail({
        applicationId: selectedCustomer.applicationId,
        subject,
        message,
        includeBilling,
        billId: includeBilling ? selectedBillId : undefined,
        sendCopyToAdmin,
        useAdminSender: useAdminSender,
      });

      const senderDisplay = useAdminSender ? "Admin" : "Collection";
      const locationDisplay = customerLocation
        ? customerLocation.toUpperCase()
        : "Unknown";
      toast.success(
        `✅ Email sent via ${senderDisplay} to ${selectedCustomer.firstName} ${selectedCustomer.lastName} (${locationDisplay})`,
      );

      globalCache = null;
      globalCacheTimestamp = 0;
      await loadSentRecords();

      // Clear form
      setSubject("");
      setMessage("");
      setIncludeBilling(false);
      setSelectedBillId("");
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

    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter subject and message");
      return;
    }

    try {
      setLoading(true);
      const result = await emailService.sendBulkEmails({
        applicationIds: selectedCustomers.map((c) => c.applicationId),
        subject,
        message,
        includeBilling,
        billType: bulkBillType,
        sendCopyToAdmin,
        useAdminSender: useAdminSender,
      });

      const senderDisplay = useAdminSender ? "Admin" : "Collection";
      toast.success(
        `✅ Bulk emails sent via ${senderDisplay} - ${result.message}`,
      );

      globalCache = null;
      globalCacheTimestamp = 0;
      await loadSentRecords();

      // Clear selections
      setSelectedCustomers([]);
      setSubject("");
      setMessage("");
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

      globalCache = null;
      globalCacheTimestamp = 0;
      await loadSentRecords();
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

      globalCache = null;
      globalCacheTimestamp = 0;
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

      globalCache = null;
      globalCacheTimestamp = 0;
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

        globalCache = null;
        globalCacheTimestamp = 0;
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

        globalCache = null;
        globalCacheTimestamp = 0;
        await loadSentRecords();
      } catch (error) {
        console.error("Failed to delete record:", error);
        toast.error("Failed to delete record");
      }
    }
  };

  const handleRefresh = async () => {
    globalCache = null;
    globalCacheTimestamp = 0;
    await Promise.all([loadCustomers(), loadTemplates(), loadSentRecords()]);
    toast.success("All data refreshed!");
  };

  // ==================== FILTERS ====================
  const filteredCustomers = customers.filter(
    (c) =>
      (c.firstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (c.applicationId?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const filteredUnpaidCustomers = filteredCustomers.filter(
    (c) => c.hasUnpaidBills === true,
  );

  const displayCustomers = showUnpaidOnly
    ? filteredUnpaidCustomers
    : filteredCustomers;

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
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📧 Manual Email Management
            </h1>
            <p className="text-gray-500 mt-1">
              Send custom emails to customers based on their building location
              (Breeze or SIL)
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            🔄 Refresh All
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: "single", name: "Single Email", icon: "✉️" },
              { id: "bulk", name: "Bulk Email", icon: "👥" },
              { id: "templates", name: "Templates", icon: "📄" },
              { id: "sent", name: "Sent Records", icon: "📨" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Single Email Tab */}
        {activeTab === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Customer Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select Customer
              </h2>

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
                    onClick={() => loadCustomers()}
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
                      <p className="text-xs mt-1">
                        Make sure there are approved applications with email
                        addresses
                      </p>
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

              {/* Location Display */}
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
                <p className="text-xs text-gray-400 mt-2">
                  {useAdminSender
                    ? "📌 Email will be sent from the main admin email"
                    : customerLocation && customerLocation !== "other"
                      ? `📌 Email will be sent from ${customerLocation.toUpperCase()} collection email: ${collectionEmail}`
                      : "📌 No location detected. Please select a customer with a building."}
                </p>
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
                <textarea
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your email message here..."
                />
              </div>

              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={includeBilling}
                  onChange={(e) => setIncludeBilling(e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include Billing Information
                </span>
              </label>

              {includeBilling && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Bill
                  </label>
                  {customerBills.length > 0 ? (
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedBillId}
                      onChange={(e) => setSelectedBillId(e.target.value)}
                    >
                      <option value="">Select a bill...</option>
                      {customerBills.map((bill) => (
                        <option key={bill._id} value={bill._id}>
                          {bill.invoiceNumber || "N/A"} - ₱
                          {(bill.total || 0).toLocaleString()} -{" "}
                          {bill.status || "N/A"}
                          {bill.isInstallationBill && " (Installation Fee)"}
                          {bill.isProRated && " (Pro-rated)"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      No bills found for this customer. Please create a bill
                      first.
                    </p>
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
                    !selectedCustomer || !subject.trim() || !message.trim()
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
                    !message.trim()
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

        {/* Bulk Email Tab */}
        {activeTab === "bulk" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select Customers
              </h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    showUnpaidOnly
                      ? "bg-red-100 border-red-300 text-red-700"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {showUnpaidOnly ? "🔴 Unpaid Only" : "Show All"}
                </button>
              </div>

              {loading && customers.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {error && !loading && customers.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {displayCustomers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>
                        {showUnpaidOnly
                          ? "No unpaid customers found"
                          : "No customers found"}
                      </p>
                    </div>
                  ) : (
                    displayCustomers.map((customer) => {
                      const location = getLocationFromBuildingName(
                        customer.buildingName,
                      );
                      const locationDisplay = getLocationDisplay(location);
                      const badgeColor = getLocationBadgeColor(location);

                      return (
                        <label
                          key={customer._id || customer.applicationId}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedCustomers.some(
                              (c) => c.applicationId === customer.applicationId,
                            )
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedCustomers.some(
                              (c) => c.applicationId === customer.applicationId,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomers([
                                  ...selectedCustomers,
                                  customer,
                                ]);
                              } else {
                                setSelectedCustomers(
                                  selectedCustomers.filter(
                                    (c) =>
                                      c.applicationId !==
                                      customer.applicationId,
                                  ),
                                );
                              }
                            }}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {customer.firstName || ""}{" "}
                                  {customer.lastName || ""}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {customer.email || "No email"}
                                </p>
                                <p className="text-xs text-gray-400">
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
                            {customer.lastBillAmount > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Last Bill: ₱
                                {(
                                  customer.lastBillAmount || 0
                                ).toLocaleString()}{" "}
                                - {customer.lastBillStatus || "N/A"}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Selected: <strong>{selectedCustomers.length}</strong>{" "}
                  customer(s)
                  {selectedCustomers.filter((c) => c.hasUnpaidBills).length >
                    0 && (
                    <span className="ml-2 text-red-600">
                      (
                      {selectedCustomers.filter((c) => c.hasUnpaidBills).length}{" "}
                      unpaid)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {
                    selectedCustomers.filter(
                      (c) =>
                        getLocationFromBuildingName(c.buildingName) !== "other",
                    ).length
                  }{" "}
                  customers with location detected
                </p>
              </div>

              <button
                onClick={() => setShowReminderDialog(true)}
                className="w-full mt-4 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                ⚠️ Send Reminder to All Unpaid Customers
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Compose Bulk Email
              </h2>

              {/* Sender Type Selector for Bulk */}
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
                    <span className="text-xs text-gray-500">
                      Location-specific
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
                <p className="text-xs text-gray-400 mt-2">
                  {useAdminSender
                    ? "📌 All customers will receive from the main admin email"
                    : "📌 Each customer will receive from their location-specific collection email"}
                </p>
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
                <textarea
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your email message here... (will be sent to all selected customers)"
                />
              </div>

              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={includeBilling}
                  onChange={(e) => setIncludeBilling(e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include Billing Information
                </span>
              </label>

              {includeBilling && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Type to Include
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bulkBillType}
                    onChange={(e) => setBulkBillType(e.target.value as any)}
                  >
                    <option value="unpaid">Unpaid Bills Only</option>
                    <option value="latest">Latest Bill</option>
                    <option value="installation">
                      Unpaid Installation Fee
                    </option>
                  </select>
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
                  Send summary copy to admin
                </span>
              </label>

              <button
                onClick={handleSendBulkEmails}
                disabled={
                  loading ||
                  selectedCustomers.length === 0 ||
                  !subject.trim() ||
                  !message.trim()
                }
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>✉️</span> Send to {selectedCustomers.length}{" "}
                    Customer(s)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Templates Tab */}
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
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {(template.message || "").substring(0, 150)}...
                  </p>
                  <button
                    onClick={() => {
                      setSubject(template.subject || "");
                      setMessage(template.message || "");
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
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  📨 Sent Email Records
                </h2>
                <button
                  onClick={async () => {
                    globalCache = null;
                    globalCacheTimestamp = 0;
                    await loadSentRecords();
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              {loading && sentRecords.length === 0 && (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {!loading && sentRecords.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-4">📭</p>
                  <p>No sent email records found</p>
                  <p className="text-sm mt-2">Emails sent will appear here</p>
                </div>
              )}

              {!loading && sentRecords.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          To
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sender
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sentRecords.map((record) => {
                        const locationDisplay =
                          record.location && record.location !== "unknown"
                            ? getLocationDisplay(record.location)
                            : "📍 Unknown";
                        const badgeColor =
                          record.location && record.location !== "unknown"
                            ? getLocationBadgeColor(record.location)
                            : "bg-gray-100 text-gray-800 border-gray-300";

                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(record.sentAt)}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {record.customerName || "N/A"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.customerEmail || "N/A"}
                                </p>
                                <p className="text-xs text-gray-400">
                                  ID: {record.applicationId || "N/A"}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate">
                              {record.subject || ""}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  record.isBulk
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {record.isBulk ? "Bulk" : "Single"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full border ${badgeColor}`}
                              >
                                {locationDisplay}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  record.senderType === "admin"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {record.senderType === "admin"
                                  ? "Admin"
                                  : "Collection"}
                              </span>
                              {record.collectionEmail &&
                                record.senderType !== "admin" && (
                                  <p className="text-xs text-gray-400 mt-1 truncate max-w-[100px]">
                                    {record.collectionEmail}
                                  </p>
                                )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  record.status === "sent"
                                    ? "bg-green-100 text-green-700"
                                    : record.status === "failed"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {record.status || "unknown"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() =>
                                  handleDeleteSentRecord(record.id)
                                }
                                className="text-red-500 hover:text-red-700 transition-colors text-sm"
                                title="Delete record"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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

              {/* Sender type for reminder */}
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
