"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import emailService, {
  Customer,
  Bill,
  EmailTemplate,
  EmailSentRecord,
} from "@/services/emailService";
import toast from "react-hot-toast";

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

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

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

  // Load customers and templates on mount
  useEffect(() => {
    loadCustomers();
    loadTemplates();
    loadSentRecords();
  }, []);

  const loadCustomers = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Loading customers with search:", search);
      const data = await emailService.getCustomers({ search });
      console.log("Customers loaded:", data);
      console.log("Number of customers:", data?.length || 0);

      if (data && data.length > 0) {
        console.log("First customer:", data[0]);
      } else {
        console.warn("No customers returned from API");
        setError(
          "No customers found. Please check if there are approved applications.",
        );
      }

      setCustomers(data || []);
    } catch (error: any) {
      console.error("Failed to load customers:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load customers";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await emailService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadSentRecords = async () => {
    try {
      const data = await emailService.getSentRecords();
      setSentRecords(data);
    } catch (error) {
      console.error("Failed to load sent records:", error);
    }
  };

  const loadCustomerBills = async (applicationId: string) => {
    try {
      const data = await emailService.getCustomerBills(applicationId);
      setCustomerBills(data.bills);
    } catch (error) {
      console.error("Failed to load customer bills:", error);
      toast.error("Failed to load customer bills");
    }
  };

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
      setSubject(template.subject);
      setMessage(template.message);
      setIncludeBilling(template.includeBillingDefault);
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
      });
      setPreviewHtml(preview.html);
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
      await emailService.sendEmail({
        applicationId: selectedCustomer.applicationId,
        subject,
        message,
        includeBilling,
        billId: includeBilling ? selectedBillId : undefined,
        sendCopyToAdmin,
      });
      toast.success(
        `Email sent successfully to ${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
      );
      await loadSentRecords();
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
      });
      toast.success(result.message);
      await loadSentRecords();
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
      );
      toast.success(result.message);
      setShowReminderDialog(false);
      setReminderMessage("");
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
      await loadTemplates();
    } catch (error: any) {
      console.error("Failed to save template:", error);
      toast.error(error.response?.data?.message || "Failed to save template");
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      message: template.message,
      category: template.category,
      includeBillingDefault: template.includeBillingDefault,
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            📧 Manual Email Management
          </h1>
          <p className="text-gray-500 mt-1">
            Send custom emails to customers with or without billing information
            attached
          </p>
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

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name, email, or application ID..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
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

              {/* Customer List */}
              {!loading && !error && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No customers found</p>
                      <p className="text-xs mt-1">
                        Make sure there are approved applications with email
                        addresses
                      </p>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer._id}
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
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {customer.email}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              ID: {customer.applicationId}
                            </p>
                          </div>
                          {customer.hasUnpaidBills && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Customer
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    <strong>
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedCustomer.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    Phone: {selectedCustomer.phoneNumber || "N/A"}
                  </p>
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

              {/* Templates Dropdown */}
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
                        {template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
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

              {/* Message */}
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

              {/* Include Billing Checkbox */}
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

              {/* Bill Selection */}
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
                          {bill.invoiceNumber} - ₱{bill.total.toLocaleString()}{" "}
                          - {bill.status}
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

              {/* Send Copy to Admin */}
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

              {/* Buttons */}
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
            {/* Left Column - Customer Selection */}
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

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {error && !loading && (
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
                    displayCustomers.map((customer) => (
                      <label
                        key={customer._id}
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
                                    c.applicationId !== customer.applicationId,
                                ),
                              );
                            }
                          }}
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {customer.email}
                              </p>
                              <p className="text-xs text-gray-400">
                                ID: {customer.applicationId}
                              </p>
                            </div>
                            {customer.hasUnpaidBills && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                ⚠️ Unpaid
                              </span>
                            )}
                          </div>
                          {customer.lastBillAmount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last Bill: ₱
                              {customer.lastBillAmount.toLocaleString()} -{" "}
                              {customer.lastBillStatus || "N/A"}
                            </p>
                          )}
                        </div>
                      </label>
                    ))
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
              </div>

              <button
                onClick={() => setShowReminderDialog(true)}
                className="w-full mt-4 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                ⚠️ Send Reminder to All Unpaid Customers
              </button>
            </div>

            {/* Right Column - Compose Bulk Email */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Compose Bulk Email
              </h2>

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
                      {template.name}
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
                    Category: {template.category}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Subject: {template.subject}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {template.message.substring(0, 150)}...
                  </p>
                  <button
                    onClick={() => {
                      setSubject(template.subject);
                      setMessage(template.message);
                      setIncludeBilling(template.includeBillingDefault);
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
                  onClick={loadSentRecords}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              {loading && (
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
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sentRecords.map((record) => (
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
                                {record.customerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.customerEmail}
                              </p>
                              <p className="text-xs text-gray-400">
                                ID: {record.applicationId}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate">
                            {record.subject}
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
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                record.status === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : record.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteSentRecord(record.id)}
                              className="text-red-500 hover:text-red-700 transition-colors text-sm"
                              title="Delete record"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
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
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
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
