// app/admin/email/page.tsx - PROFESSIONAL ENTERPRISE DESIGN

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import emailService, {
  Customer,
  EmailTemplate,
  EmailSentRecord,
  SenderType,
} from "@/services/emailService";
import { getActiveBuildings, Building } from "@/services/building";
import { getPlans, Plan } from "@/services/plan";
import RichTextEditor from "@/components/RichTextEditor";
import ScheduledEmailsTab from "@/components/ScheduledEmailsTab";
import toast from "react-hot-toast";

// ==================== SENDER OPTIONS ====================
const SENDER_OPTIONS: {
  value: SenderType;
  label: string;
  email: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "collection",
    label: "Collection",
    email: "Location-specific",
    icon: "📍",
    color: "emerald",
  },
  {
    value: "admin",
    label: "Admin",
    email: "admin@misterfyber.com",
    icon: "👤",
    color: "blue",
  },
  {
    value: "workselpueblo",
    label: "Workselpueblo",
    email: "workselpueblo@fyberblizz.com",
    icon: "🏢",
    color: "indigo",
  },
  {
    value: "fbsilkresidence",
    label: "FB Silk Residence",
    email: "fbsilkresidence@gmail.com",
    icon: "🏠",
    color: "orange",
  },
];

export default function ManualEmailPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "single" | "bulk" | "templates" | "sent" | "scheduled"
  >("single");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [totalEmailsSent, setTotalEmailsSent] = useState<number>(0);

  // ==================== BUILDINGS & PLANS STATE ====================
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);

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

  // ==================== SENDER TYPE STATE ====================
  const [senderType, setSenderType] = useState<SenderType>("collection");

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
  const [editTemplateData, setEditTemplateData] = useState({
    name: "",
    subject: "",
    message: "",
    richTextContent: "",
    category: "general",
    includeBillingDefault: false,
  });

  // Refs
  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // ==================== HELPER FUNCTIONS ====================
  const getLocationFromBuildingName = useCallback(
    (buildingName?: string): string => {
      if (!buildingName) return "other";
      const name = buildingName.toLowerCase().trim();
      if (name.includes("breeze")) return "breeze";
      if (name.includes("sil") || name.includes("silk")) return "sil";
      return "other";
    },
    [],
  );

  const getCollectionEmailForLocation = useCallback(
    (location: string): string => {
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
    },
    [],
  );

  const getLocationDisplay = useCallback((location: string): string => {
    if (location === "breeze") return "🌊 Breeze";
    if (location === "sil") return "🏢 SIL";
    return "📍 Other";
  }, []);

  const getLocationBadgeColor = useCallback((location: string): string => {
    if (location === "breeze")
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (location === "sil")
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  }, []);

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
  }, [
    selectedCustomer,
    getLocationFromBuildingName,
    getCollectionEmailForLocation,
  ]);

  // ==================== CALCULATE TOTAL EMAILS SENT ====================
  useEffect(() => {
    const total = sentRecords.filter(
      (record) => record.status === "sent",
    ).length;
    setTotalEmailsSent(total);
  }, [sentRecords]);

  // ==================== LOAD BUILDINGS ====================
  const loadBuildings = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return [];
    setBuildingsLoading(true);
    try {
      const data = await getActiveBuildings(forceRefresh);
      if (isMountedRef.current) {
        setBuildings(data || []);
      }
      return data || [];
    } catch (error) {
      console.error("Failed to load buildings:", error);
      if (isMountedRef.current) {
        setBuildings([]);
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setBuildingsLoading(false);
      }
    }
  }, []);

  // ==================== LOAD PLANS ====================
  const loadPlans = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return [];
    setPlansLoading(true);
    try {
      const data = await getPlans(forceRefresh);
      if (isMountedRef.current) {
        setPlans(data || []);
      }
      return data || [];
    } catch (error) {
      console.error("Failed to load plans:", error);
      if (isMountedRef.current) {
        setPlans([]);
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setPlansLoading(false);
      }
    }
  }, []);

  // ==================== LOAD FUNCTIONS ====================
  const loadCustomers = useCallback(
    async (
      search?: string,
      location?: string,
      building?: string,
      plan?: string,
    ): Promise<Customer[]> => {
      if (!isMountedRef.current) return [];

      try {
        setError(null);

        const data = await emailService.getCustomers({
          search,
          forceRefresh: true,
          location,
          building,
          plan,
        });

        const processedData = (data || []).map((customer) => ({
          ...customer,
          buildingName: customer.buildingName || "",
        }));

        if (isMountedRef.current) {
          setCustomers(processedData);
          setLastUpdated(new Date().toLocaleTimeString());
        }

        return processedData;
      } catch (error: any) {
        console.error("Failed to load customers:", error);
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Failed to load customers";
        if (isMountedRef.current) {
          setError(errorMsg);
        }
        return [];
      }
    },
    [],
  );

  const loadTemplates = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const data = await emailService.getTemplates();
      if (isMountedRef.current) {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      if (isMountedRef.current) {
        setTemplates([]);
      }
    }
  }, []);

  const loadSentRecords = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const data = await emailService.getSentRecords();
      if (isMountedRef.current) {
        setSentRecords(data || []);
      }
    } catch (error) {
      console.error("Failed to load sent records:", error);
      if (isMountedRef.current) {
        setSentRecords([]);
      }
    }
  }, []);

  const loadCustomerBills = useCallback(
    async (applicationId: string): Promise<any[]> => {
      try {
        const data = await emailService.getCustomerBills(applicationId);
        const bills = data?.bills || [];
        if (isMountedRef.current) {
          setCustomerBills(bills);
          setSelectedBillIds([]);
        }
        return bills;
      } catch (error) {
        console.error("Failed to load customer bills:", error);
        if (isMountedRef.current) {
          setCustomerBills([]);
          setSelectedBillIds([]);
        }
        return [];
      }
    },
    [],
  );

  // ==================== FULL SYSTEM REFRESH ====================
  const refreshAllData = useCallback(
    async (options?: {
      preserveSelectedCustomer?: boolean;
      preserveSelection?: boolean;
    }): Promise<Customer[]> => {
      const { preserveSelectedCustomer = false, preserveSelection = false } =
        options || {};

      try {
        setRefreshing(true);

        const [freshCustomers, freshSentRecords, freshTemplates] =
          await Promise.all([
            loadCustomers(
              searchTerm,
              buildingFilter !== "all" ? buildingFilter : undefined,
              buildingFilter !== "all" ? buildingFilter : undefined,
              planFilter !== "all" ? planFilter : undefined,
            ),
            loadSentRecords(),
            loadTemplates(),
          ]);

        if (preserveSelectedCustomer && selectedCustomer) {
          const updatedCustomer = freshCustomers.find(
            (c) => c.applicationId === selectedCustomer.applicationId,
          );
          if (updatedCustomer) {
            setSelectedCustomer(updatedCustomer);
            await loadCustomerBills(updatedCustomer.applicationId);
          }
        }

        if (preserveSelection && selectedCustomers.length > 0) {
          const updatedSelections = freshCustomers.filter((c) =>
            selectedCustomers.some(
              (sc) => sc.applicationId === c.applicationId,
            ),
          );
          setSelectedCustomers(updatedSelections);
        }

        setRefreshKey((prev) => prev + 1);
        return freshCustomers;
      } catch (error) {
        console.error("Refresh failed:", error);
        throw error;
      } finally {
        if (isMountedRef.current) {
          setRefreshing(false);
        }
      }
    },
    [
      searchTerm,
      buildingFilter,
      planFilter,
      selectedCustomer,
      selectedCustomers,
      loadCustomers,
      loadSentRecords,
      loadTemplates,
      loadCustomerBills,
    ],
  );

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    isMountedRef.current = true;

    if (!initialLoadDone.current) {
      const loadAllData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            loadCustomers(""),
            loadTemplates(),
            loadSentRecords(),
            loadBuildings(),
            loadPlans(),
          ]);
          initialLoadDone.current = true;
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };

      loadAllData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadCustomers, loadTemplates, loadSentRecords, loadBuildings, loadPlans]);

  // ✅ RELOAD CUSTOMERS WHEN BUILDING OR PLAN FILTER CHANGES
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (!isMountedRef.current) return;

    const reload = async () => {
      try {
        await loadCustomers(
          searchTerm,
          buildingFilter !== "all" ? buildingFilter : undefined,
          buildingFilter !== "all" ? buildingFilter : undefined,
          planFilter !== "all" ? planFilter : undefined,
        );
      } catch (err) {
        console.error("Filter reload failed:", err);
      }
    };

    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingFilter, planFilter]);

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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject || "");

      const templateMessage = template.message || "";
      const hasHtml = /<[a-z][\s\S]*>/i.test(templateMessage);

      if (hasHtml) {
        setRichTextContent(templateMessage);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateMessage;
        setMessage(tempDiv.textContent || "");
      } else {
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
        senderType,
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

  // ✅ FULL SYSTEM REFRESH AFTER SEND
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
        senderType,
      });

      const senderDisplay =
        SENDER_OPTIONS.find((s) => s.value === senderType)?.label || senderType;
      const locationDisplay = customerLocation
        ? customerLocation.toUpperCase()
        : "Unknown";
      toast.success(
        `✅ Email sent via ${senderDisplay} to ${selectedCustomer.firstName} ${selectedCustomer.lastName} (${locationDisplay})`,
      );

      await refreshAllData({ preserveSelectedCustomer: true });

      setSubject("");
      setMessage("");
      setRichTextContent("");
      setIncludeBilling(false);
      setSelectedBillIds([]);
      setSelectedTemplateId("");

      toast.success("✅ Data refreshed. Ready to send another email!");
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast.error(error.response?.data?.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FULL SYSTEM REFRESH AFTER BULK SEND
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
        senderType,
        locationFilter: buildingFilter !== "all" ? buildingFilter : undefined,
        buildingFilter: buildingFilter !== "all" ? buildingFilter : undefined,
        planFilter: planFilter !== "all" ? planFilter : undefined,
      });

      const senderDisplay =
        SENDER_OPTIONS.find((s) => s.value === senderType)?.label || senderType;
      toast.success(
        `✅ Bulk emails sent via ${senderDisplay} - ${result.message}`,
      );

      await refreshAllData({ preserveSelection: false });

      setSelectedCustomers([]);
      setSubject("");
      setMessage("");
      setRichTextContent("");
      setIncludeBilling(false);
      setSelectedTemplateId("");

      toast.success("✅ Data refreshed. Ready to send more emails!");
    } catch (error: any) {
      console.error("Failed to send bulk emails:", error);
      toast.error(
        error.response?.data?.message || "Failed to send bulk emails",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================== SAVE TEMPLATE (UPDATED) ====================
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

    const templateMessage = template.message || "";
    const hasHtml = /<[a-z][\s\S]*>/i.test(templateMessage);

    let richTextContent = templateMessage;
    let plainText = templateMessage;

    if (hasHtml) {
      richTextContent = templateMessage;
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = templateMessage;
      plainText = tempDiv.textContent || "";
    } else {
      richTextContent = templateMessage.replace(/\n/g, "<br>");
      plainText = templateMessage;
    }

    setEditTemplateData({
      name: template.name || "",
      subject: template.subject || "",
      message: plainText,
      richTextContent: richTextContent,
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

    if (
      !editTemplateData.name ||
      !editTemplateData.subject ||
      !editTemplateData.richTextContent
    ) {
      toast.error("Please fill in all template fields");
      return;
    }

    try {
      await emailService.updateTemplate(editingTemplate.id, {
        name: editTemplateData.name,
        subject: editTemplateData.subject,
        message: editTemplateData.richTextContent,
        category: editTemplateData.category,
        includeBillingDefault: editTemplateData.includeBillingDefault,
      });

      toast.success("Template updated successfully");
      setShowEditTemplateDialog(false);
      setEditingTemplate(null);
      setEditTemplateData({
        name: "",
        subject: "",
        message: "",
        richTextContent: "",
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

  // ✅ MANUAL REFRESH
  const handleRefresh = async () => {
    try {
      await refreshAllData({ preserveSelectedCustomer: true });
      toast.success("✅ All data refreshed from database!");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh data");
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
    } else if (buildingFilter !== "all") {
      const selectedBuilding = buildings.find(
        (b) => b._id === buildingFilter || b.buildingName === buildingFilter,
      );
      if (selectedBuilding) {
        matchesBuilding =
          (c.buildingName || "").toLowerCase() ===
          (selectedBuilding.buildingName || "").toLowerCase();
      }
    }

    let matchesPlan = true;
    if (planFilter !== "all") {
      const selectedPlan = plans.find((p) => p._id === planFilter);
      if (selectedPlan) {
        const cPlanId = (c.planId || "").toString().trim();
        const cPlanName = (c.planName || "").toString().trim().toLowerCase();
        const targetId = (selectedPlan._id || "").toString().trim();
        const targetName = (selectedPlan.name || "")
          .toString()
          .trim()
          .toLowerCase();

        if (cPlanId && cPlanId === targetId) {
          matchesPlan = true;
        } else if (cPlanName && targetName && cPlanName === targetName) {
          matchesPlan = true;
        } else {
          matchesPlan = false;
        }
      }
    }

    return matchesSearch && matchesBuilding && matchesPlan;
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

  // ==================== SENDER SELECTOR COMPONENT ====================
  const SenderSelector = () => (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        Send From (Choose Sender Email)
      </label>
      <div className="grid grid-cols-2 gap-3">
        {SENDER_OPTIONS.map((option) => {
          const isSelected = senderType === option.value;
          const isCollection = option.value === "collection";
          const disabled = isCollection && !customerLocation;

          const colorClasses: Record<string, string> = {
            emerald: isSelected
              ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
              : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50",
            blue: isSelected
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50",
            indigo: isSelected
              ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50",
            orange: isSelected
              ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
              : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50",
          };

          const displayEmail = isCollection
            ? customerLocation
              ? collectionEmail
              : "No location detected"
            : option.email;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && setSenderType(option.value)}
              disabled={disabled}
              className={`px-4 py-3 rounded-lg border text-left transition-all duration-200 ${
                disabled
                  ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                  : colorClasses[option.color]
              }`}
            >
              <span
                className={`block text-sm font-semibold ${isSelected ? "text-slate-900" : "text-slate-700"}`}
              >
                {option.icon} {option.label}
              </span>
              <span className="text-xs text-slate-500 truncate block mt-0.5">
                {displayEmail}
              </span>
            </button>
          );
        })}
      </div>
      {senderType === "collection" && customerLocation && (
        <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Using location-specific email: {collectionEmail}
        </p>
      )}
      {senderType === "workselpueblo" && (
        <p className="text-xs font-medium text-indigo-600 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Using workselpueblo@fyberblizz.com as sender
        </p>
      )}
      {senderType === "fbsilkresidence" && (
        <p className="text-xs font-medium text-orange-600 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          Using fbsilkresidence@gmail.com as sender
        </p>
      )}
      {senderType === "admin" && (
        <p className="text-xs font-medium text-blue-600 mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Using admin@misterfyber.com as sender
        </p>
      )}
    </div>
  );

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Manual Email Center
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage, compose, and schedule custom emails for your customers.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Updated: {lastUpdated || "Never"}
                </span>
                <span>•</span>
                <span>{customers.length} Customers</span>
                <span>•</span>
                <span>{buildings.length} Buildings</span>
                <span>•</span>
                <span>{plans.length} Plans</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                loading || refreshing
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {loading || refreshing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                  </svg>
                  Refresh Data
                </>
              )}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {customers.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sent
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {totalEmailsSent}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Breeze Customers
              </p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {breezeCount}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                SIL Customers
              </p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">
                {silCount}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-t-xl px-2 pt-2">
          <nav
            className="flex space-x-1 overflow-x-auto no-scrollbar"
            aria-label="Tabs"
          >
            {[
              { id: "single", name: "Single Email", icon: "✉️" },
              { id: "bulk", name: "Bulk Email", icon: "👥" },
              { id: "templates", name: "Templates", icon: "📄" },
              { id: "sent", name: "Sent Records", icon: "📨" },
              { id: "scheduled", name: "Scheduled", icon: "📅" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                    isActive
                      ? "border-blue-600 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.name}
                  {tab.id === "sent" && totalEmailsSent > 0 && (
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {totalEmailsSent}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Area */}
        <div className="bg-slate-50/50 pt-6" key={`content-${refreshKey}`}>
          {/* Single Email Tab */}
          {activeTab === "single" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Customer Selection */}
              <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Select Customer
                  </h2>
                  <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {displayCustomers.length} results
                  </span>
                </div>

                <div className="space-y-4 mb-4 shrink-0">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Building
                      </label>
                      <select
                        value={buildingFilter}
                        onChange={(e) => setBuildingFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Buildings</option>
                        {buildings.length > 0 && (
                          <optgroup label="Specific Buildings">
                            {buildings.map((building) => (
                              <option key={building._id} value={building._id}>
                                {building.buildingName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Plan
                      </label>
                      <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Plans</option>
                        {plans.map((plan) => (
                          <option key={plan._id} value={plan._id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        ></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search name, email, or ID..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {loading && customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <svg
                        className="animate-spin h-8 w-8 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="text-sm">Loading customers...</p>
                    </div>
                  ) : displayCustomers.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                        <svg
                          className="w-6 h-6 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          ></path>
                        </svg>
                      </div>
                      <p className="text-slate-500 font-medium">
                        No customers found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try changing your filters.
                      </p>
                    </div>
                  ) : (
                    displayCustomers.map((customer) => {
                      const location = getLocationFromBuildingName(
                        customer.buildingName,
                      );
                      const isSelected =
                        selectedCustomer?.applicationId ===
                        customer.applicationId;

                      return (
                        <button
                          key={customer._id || customer.applicationId}
                          onClick={() => handleCustomerSelect(customer)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {customer.firstName || ""}{" "}
                                {customer.lastName || ""}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {customer.email || "No email"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {customer.buildingName && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    🏢 {customer.buildingName}
                                  </span>
                                )}
                                {customer.planName && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    📦 {customer.planName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {location !== "other" && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${getLocationBadgeColor(location)}`}
                                >
                                  {location}
                                </span>
                              )}
                              {customer.hasUnpaidBills && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-red-50 text-red-700 border border-red-100">
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column - Compose Email */}
              <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100vh-250px)] min-h-[600px] overflow-y-auto custom-scrollbar">
                <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">
                  Compose Email
                </h2>

                {!selectedCustomer ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <svg
                      className="w-12 h-12 mb-3 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      No customer selected
                    </p>
                    <p className="text-xs mt-1">
                      Select a customer from the left to start composing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Context Banner */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Sending to: {selectedCustomer.firstName}{" "}
                          {selectedCustomer.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedCustomer.email}
                        </p>
                      </div>
                      {customerLocation !== "other" && (
                        <span
                          className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border ${getLocationBadgeColor(customerLocation)}`}
                        >
                          {getLocationDisplay(customerLocation)}
                        </span>
                      )}
                    </div>

                    {/* Templates */}
                    {templates.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Load Template
                        </label>
                        <select
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={selectedTemplateId}
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                        >
                          <option value="">— Start from scratch —</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Sender */}
                    <SenderSelector />

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Subject
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Important update regarding your account"
                      />
                    </div>

                    {/* Message Body */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Message Body
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
                        maxHeight="300px"
                      />
                    </div>

                    {/* Attachments / Billing */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          checked={includeBilling}
                          onChange={(e) => {
                            setIncludeBilling(e.target.checked);
                            if (!e.target.checked) setSelectedBillIds([]);
                          }}
                        />
                        <span className="ml-2 text-sm font-medium text-slate-800">
                          Include Billing Information
                        </span>
                      </label>

                      {includeBilling && (
                        <div className="mt-4 space-y-3">
                          {customerBills.length > 0 ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">
                                  {selectedBillIds.length} bill(s) selected
                                </span>
                                <div className="flex gap-2 text-xs">
                                  <button
                                    onClick={selectAllBills}
                                    className="text-blue-600 hover:underline"
                                  >
                                    Select All
                                  </button>
                                  <button
                                    onClick={deselectAllBills}
                                    className="text-slate-500 hover:underline"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {customerBills.map((bill) => (
                                  <label
                                    key={bill._id}
                                    className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${selectedBillIds.includes(bill._id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                      checked={selectedBillIds.includes(
                                        bill._id,
                                      )}
                                      onChange={() =>
                                        toggleBillSelection(bill._id)
                                      }
                                    />
                                    <div className="ml-2 flex-1 flex justify-between items-center">
                                      <span className="text-xs font-medium text-slate-700">
                                        {bill.invoiceNumber}
                                      </span>
                                      <span className="text-xs font-bold text-slate-900">
                                        ₱{(bill.total || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                              No bills found for this customer.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Admin Copy */}
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        checked={sendCopyToAdmin}
                        onChange={(e) => setSendCopyToAdmin(e.target.checked)}
                      />
                      <span className="ml-2 text-sm text-slate-700">
                        Send a copy to admin
                      </span>
                    </label>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-200 flex gap-3 sticky bottom-0 bg-white">
                      <button
                        onClick={handlePreview}
                        disabled={
                          !subject.trim() ||
                          !(message.trim() || richTextContent.trim())
                        }
                        className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          ></path>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          ></path>
                        </svg>
                        Preview
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={
                          loading ||
                          !subject.trim() ||
                          !(message.trim() || richTextContent.trim()) ||
                          (includeBilling && selectedBillIds.length === 0)
                        }
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              ></path>
                            </svg>
                            Send Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bulk Email Tab */}
          {activeTab === "bulk" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Customer Selection */}
              <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Select Recipients
                  </h2>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
                    {selectedCustomers.length} selected
                  </span>
                </div>

                <div className="space-y-4 mb-4 shrink-0">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Building
                      </label>
                      <select
                        value={buildingFilter}
                        onChange={(e) => setBuildingFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Buildings</option>
                        {buildings.length > 0 && (
                          <optgroup label="Specific Buildings">
                            {buildings.map((building) => (
                              <option key={building._id} value={building._id}>
                                {building.buildingName}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Plan
                      </label>
                      <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Plans</option>
                        {plans.map((plan) => (
                          <option key={plan._id} value={plan._id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        ></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search customers..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={showUnpaidOnly}
                      onChange={(e) => setShowUnpaidOnly(e.target.checked)}
                    />
                    <span className="text-sm text-slate-700">
                      Show unpaid only
                    </span>
                  </label>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar border-t border-slate-100 pt-4">
                  {loading && customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <svg
                        className="animate-spin h-8 w-8 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="text-sm">Loading...</p>
                    </div>
                  ) : displayCustomers.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-slate-500 font-medium">
                        No customers found
                      </p>
                    </div>
                  ) : (
                    displayCustomers.map((customer) => {
                      const isSelected = selectedCustomers.some(
                        (c) => c.applicationId === customer.applicationId,
                      );
                      return (
                        <label
                          key={customer._id || customer.applicationId}
                          className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-0.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedCustomers((prev) =>
                                  prev.filter(
                                    (c) =>
                                      c.applicationId !==
                                      customer.applicationId,
                                  ),
                                );
                              } else {
                                setSelectedCustomers((prev) => [
                                  ...prev,
                                  customer,
                                ]);
                              }
                            }}
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {customer.firstName || ""}{" "}
                              {customer.lastName || ""}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {customer.email || "No email"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {customer.hasUnpaidBills && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                                  Unpaid
                                </span>
                              )}
                              {customer.planName && (
                                <span className="text-[10px] text-slate-500 truncate">
                                  Plan: {customer.planName}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column - Compose Bulk Email */}
              <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100vh-250px)] min-h-[600px] overflow-y-auto custom-scrollbar">
                <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">
                  Compose Bulk Email
                </h2>

                <div className="space-y-5 flex-1">
                  {/* Summary Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Sending to {selectedCustomers.length} customer(s)
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        {buildingFilter !== "all" &&
                          `Building: ${buildings.find((b) => b._id === buildingFilter)?.buildingName || buildingFilter}`}
                        {buildingFilter !== "all" &&
                          planFilter !== "all" &&
                          " • "}
                        {planFilter !== "all" &&
                          `Plan: ${plans.find((p) => p._id === planFilter)?.name || planFilter}`}
                      </p>
                    </div>
                  </div>

                  <SenderSelector />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., System Maintenance Notice"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Message Body
                    </label>
                    <RichTextEditor
                      value={richTextContent || message}
                      onChange={(content) => {
                        setRichTextContent(content);
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = content;
                        setMessage(tempDiv.textContent || "");
                      }}
                      placeholder="Write your bulk email message here..."
                      minHeight="200px"
                      maxHeight="300px"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Billing Options
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={bulkBillType}
                      onChange={(e) => setBulkBillType(e.target.value as any)}
                    >
                      <option value="unpaid">Attach Unpaid Bills Only</option>
                      <option value="latest">Attach Latest Bill Only</option>
                      <option value="installation">
                        Attach Installation Bill Only
                      </option>
                    </select>
                  </div>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={sendCopyToAdmin}
                      onChange={(e) => setSendCopyToAdmin(e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-slate-700">
                      Send a copy to admin
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 mt-4 sticky bottom-0 bg-white">
                  <button
                    onClick={handleSendBulkEmails}
                    disabled={
                      loading ||
                      selectedCustomers.length === 0 ||
                      !subject.trim() ||
                      !(message.trim() || richTextContent.trim())
                    }
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          ></path>
                        </svg>
                        Send Bulk Emails ({selectedCustomers.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">
                  Saved Templates
                </h2>
                <button
                  onClick={() => setShowTemplateDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                  New Template
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    No templates yet
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Create reusable email templates to speed up your workflow
                    and maintain consistency.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow"
                    >
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-900 truncate pr-2">
                            {template.name || "Untitled"}
                          </h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-md shrink-0">
                            {template.category || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 truncate">
                          Subject: {template.subject || ""}
                        </p>
                        <div
                          className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-100"
                          dangerouslySetInnerHTML={{
                            __html: template.message || "",
                          }}
                        />
                      </div>
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-b-xl">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const templateMessage = template.message || "";
                              const hasHtml = /<[a-z][\s\S]*>/i.test(
                                templateMessage,
                              );
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
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Use Template
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              ></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Records Tab */}
          {activeTab === "sent" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">
                  Sent Records
                </h2>
                <span className="text-sm text-slate-500">
                  {sentRecords.length} total emails
                </span>
              </div>

              {sentRecords.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">No records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Date Sent</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Sender</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sentRecords.map((record) => {
                        const senderOption = SENDER_OPTIONS.find(
                          (s) => s.value === record.senderType,
                        );
                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                              {formatDate(record.sentAt)}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">
                                {record.customerName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {record.customerEmail}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-slate-700 max-w-[200px] truncate">
                              {record.subject}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                                {senderOption?.icon || "📍"}{" "}
                                {senderOption?.label || "Unknown"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                  record.status === "sent"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : record.status === "failed"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {record.status}
                              </span>
                              {record.isBulk && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                  Bulk
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  handleDeleteSentRecord(record.id)
                                }
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  ></path>
                                </svg>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Email Preview
                </h3>
                {previewLocation && previewLocation !== "unknown" && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>📍 {getLocationDisplay(previewLocation)}</span>
                    <span>•</span>
                    <span>{previewSenderInfo}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
              <div className="bg-white mx-auto shadow-sm max-w-3xl rounded-lg overflow-hidden border border-slate-200">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Save New Template
              </h3>
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Monthly Reminder"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Billing, Maintenance"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newTemplate.category}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        category: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newTemplate.subject}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={newTemplate.message}
                  onChange={(content) =>
                    setNewTemplate({ ...newTemplate, message: content })
                  }
                  placeholder="Write your template message here..."
                  minHeight="250px"
                  maxHeight="400px"
                />
              </div>

              <label className="flex items-center cursor-pointer p-3 border border-slate-200 rounded-lg bg-slate-50">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  checked={newTemplate.includeBillingDefault}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      includeBillingDefault: e.target.checked,
                    })
                  }
                />
                <span className="ml-2 text-sm font-medium text-slate-800">
                  Include billing by default when using this template
                </span>
              </label>

              {newTemplate.message && (
                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Live Preview
                  </div>
                  <div className="p-4 bg-white">
                    <div
                      className="text-sm text-slate-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: newTemplate.message }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  ></path>
                </svg>
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE DIALOG */}
      {showEditTemplateDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Template
              </h3>
              <button
                onClick={() => {
                  setShowEditTemplateDialog(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editTemplateData.name}
                    onChange={(e) =>
                      setEditTemplateData({
                        ...editTemplateData,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editTemplateData.category}
                    onChange={(e) =>
                      setEditTemplateData({
                        ...editTemplateData,
                        category: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editTemplateData.subject}
                  onChange={(e) =>
                    setEditTemplateData({
                      ...editTemplateData,
                      subject: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={editTemplateData.richTextContent}
                  onChange={(content) => {
                    setEditTemplateData({
                      ...editTemplateData,
                      richTextContent: content,
                      message: content,
                    });
                  }}
                  placeholder="Write your email message here..."
                  minHeight="250px"
                  maxHeight="400px"
                />
              </div>

              <label className="flex items-center cursor-pointer p-3 border border-slate-200 rounded-lg bg-slate-50">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  checked={editTemplateData.includeBillingDefault}
                  onChange={(e) =>
                    setEditTemplateData({
                      ...editTemplateData,
                      includeBillingDefault: e.target.checked,
                    })
                  }
                />
                <span className="ml-2 text-sm font-medium text-slate-800">
                  Include billing by default when using this template
                </span>
              </label>

              {editTemplateData.richTextContent && (
                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Live Preview
                  </div>
                  <div className="p-4 bg-white">
                    <div
                      className="text-sm text-slate-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: editTemplateData.richTextContent,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditTemplateDialog(false);
                  setEditingTemplate(null);
                }}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTemplate}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  ></path>
                </svg>
                Update Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
