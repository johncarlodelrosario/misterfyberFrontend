// services/emailService.ts

import api from "./api";

export interface Customer {
  _id: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  buildingName?: string;
  buildingId?: string;
  status: string;
  hasBilling: boolean;
  hasUnpaidBills: boolean;
  lastBillAmount: number;
  lastBillStatus: string | null;
  location: string;
  _fetchedAt?: string;
}

export interface Bill {
  _id: string;
  applicationId: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  status: string;
  isInstallationBill: boolean;
  isProRated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
  includeBillingDefault: boolean;
  createdAt: string;
  updatedBy: string;
  createdBy: string;
}

export interface EmailSentRecord {
  id: string;
  applicationId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  richTextContent?: string;
  sentAt: string;
  status: "sent" | "failed" | "pending";
  isBulk: boolean;
  recipientCount: number;
  includeBilling: boolean;
  billType?: string;
  billCount: number;
  error?: string;
  senderType: "admin" | "collection";
  location: string;
  collectionEmail?: string;
  isScheduled: boolean;
  scheduleId?: string;
}

export interface ScheduledEmail {
  id: string;
  name: string;
  applicationIds: string[];
  subject: string;
  message: string;
  richTextContent?: string;
  includeBilling: boolean;
  billType?: "unpaid" | "latest" | "installation";
  sendCopyToAdmin: boolean;
  useAdminSender: boolean;
  scheduledFor: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  lastRunAt?: string;
  completedAt?: string;
  error?: string;
  createdBy: string;
  locationFilter?: "all" | "breeze" | "sil" | "other";
  recurring: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: string;
  };
  createdAt: string;
}

export interface ScheduleStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  totalRecipients: number;
  upcoming: Array<{
    id: string;
    name: string;
    scheduledFor: string;
    totalRecipients: number;
  }>;
}

class EmailService {
  // Customer methods
  async getCustomers(params?: {
    search?: string;
    status?: string;
    hasBilling?: string;
    forceRefresh?: boolean;
    location?: string;
  }): Promise<Customer[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.hasBilling)
        queryParams.append("hasBilling", params.hasBilling);
      if (params?.forceRefresh) queryParams.append("forceRefresh", "true");
      if (params?.location && params.location !== "all") {
        queryParams.append("location", params.location);
      }
      queryParams.append("_t", Date.now().toString());

      const response = await api.get(
        `/manual-email/customers?${queryParams.toString()}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to get customers:", error);
      throw error;
    }
  }

  async getCustomerBills(
    applicationId: string,
  ): Promise<{ customer: any; bills: Bill[] }> {
    try {
      const response = await api.get(
        `/manual-email/customers/${applicationId}/bills?_t=${Date.now()}`,
      );
      return response.data.data || { customer: null, bills: [] };
    } catch (error) {
      console.error("Failed to get customer bills:", error);
      throw error;
    }
  }

  // Send email methods
  async sendEmail(data: {
    applicationId: string;
    subject: string;
    message: string;
    richTextContent?: string;
    includeBilling: boolean;
    billIds?: string[];
    sendCopyToAdmin?: boolean;
    useAdminSender?: boolean;
  }): Promise<any> {
    try {
      const response = await api.post("/manual-email/send", data);
      return response.data;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  async sendBulkEmails(data: {
    applicationIds: string[];
    subject: string;
    message: string;
    richTextContent?: string;
    includeBilling: boolean;
    billType: "unpaid" | "latest" | "installation";
    sendCopyToAdmin?: boolean;
    useAdminSender?: boolean;
    locationFilter?: string;
  }): Promise<any> {
    try {
      const response = await api.post("/manual-email/send-bulk", data);
      return response.data;
    } catch (error) {
      console.error("Failed to send bulk emails:", error);
      throw error;
    }
  }

  async sendReminderToUnpaid(
    customMessage?: string,
    includeDueDateReminder?: boolean,
    useAdminSender?: boolean,
  ): Promise<any> {
    try {
      const response = await api.post("/manual-email/send-reminder-unpaid", {
        customMessage,
        includeDueDateReminder,
        useAdminSender,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to send reminders:", error);
      throw error;
    }
  }

  // Template methods
  async getTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await api.get(
        `/manual-email/templates?_t=${Date.now()}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to get templates:", error);
      throw error;
    }
  }

  async saveTemplate(data: {
    name: string;
    subject: string;
    message: string;
    category: string;
    includeBillingDefault: boolean;
  }): Promise<any> {
    try {
      const response = await api.post("/manual-email/templates", data);
      return response.data;
    } catch (error) {
      console.error("Failed to save template:", error);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      subject?: string;
      message?: string;
      category?: string;
      includeBillingDefault?: boolean;
    },
  ): Promise<any> {
    try {
      const response = await api.put(
        `/manual-email/templates/${templateId}`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<any> {
    try {
      const response = await api.delete(
        `/manual-email/templates/${templateId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to delete template:", error);
      throw error;
    }
  }

  // Sent records methods
  async getSentRecords(params?: {
    scheduleId?: string;
    isScheduled?: boolean;
  }): Promise<EmailSentRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.scheduleId)
        queryParams.append("scheduleId", params.scheduleId);
      if (params?.isScheduled !== undefined) {
        queryParams.append("isScheduled", params.isScheduled.toString());
      }
      queryParams.append("_t", Date.now().toString());

      const response = await api.get(
        `/manual-email/sent-records?${queryParams.toString()}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to get sent records:", error);
      throw error;
    }
  }

  async deleteSentRecord(recordId: string): Promise<any> {
    try {
      const response = await api.delete(
        `/manual-email/sent-records/${recordId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to delete sent record:", error);
      throw error;
    }
  }

  // Preview
  async previewEmail(data: {
    subject: string;
    message: string;
    richTextContent?: string;
    includeBilling: boolean;
    applicationId: string;
    billIds?: string[];
    useAdminSender?: boolean;
  }): Promise<any> {
    try {
      const response = await api.post("/manual-email/preview", data);
      return response.data.data || {};
    } catch (error) {
      console.error("Failed to preview email:", error);
      throw error;
    }
  }

  // Scheduling methods
  async scheduleEmail(data: {
    name: string;
    applicationIds: string[];
    subject: string;
    message: string;
    richTextContent?: string;
    includeBilling: boolean;
    billType?: "unpaid" | "latest" | "installation";
    sendCopyToAdmin?: boolean;
    useAdminSender?: boolean;
    scheduledFor: string;
    locationFilter?: "all" | "breeze" | "sil" | "other";
    recurring?: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
      interval: number;
      endDate?: string;
    };
  }): Promise<any> {
    try {
      const response = await api.post("/manual-email/schedule", data);
      return response.data;
    } catch (error) {
      console.error("Failed to schedule email:", error);
      throw error;
    }
  }

  async getScheduledEmails(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ScheduledEmail[]; total: number; totalPages: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status && params.status !== "all") {
        queryParams.append("status", params.status);
      }
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      queryParams.append("_t", Date.now().toString());

      const response = await api.get(
        `/manual-email/schedules?${queryParams.toString()}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get scheduled emails:", error);
      throw error;
    }
  }

  async updateScheduledEmail(
    scheduleId: string,
    data: {
      name?: string;
      subject?: string;
      message?: string;
      richTextContent?: string;
      includeBilling?: boolean;
      billType?: "unpaid" | "latest" | "installation";
      sendCopyToAdmin?: boolean;
      useAdminSender?: boolean;
      scheduledFor?: string;
      locationFilter?: "all" | "breeze" | "sil" | "other";
      recurring?: {
        enabled: boolean;
        frequency: "daily" | "weekly" | "monthly";
        interval: number;
        endDate?: string;
      };
    },
  ): Promise<any> {
    try {
      const response = await api.put(
        `/manual-email/schedules/${scheduleId}`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update scheduled email:", error);
      throw error;
    }
  }

  async cancelScheduledEmail(scheduleId: string): Promise<any> {
    try {
      const response = await api.post(
        `/manual-email/schedules/${scheduleId}/cancel`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to cancel scheduled email:", error);
      throw error;
    }
  }

  async deleteScheduledEmail(scheduleId: string): Promise<any> {
    try {
      const response = await api.delete(
        `/manual-email/schedules/${scheduleId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to delete scheduled email:", error);
      throw error;
    }
  }

  async getScheduleStats(): Promise<ScheduleStats> {
    try {
      const response = await api.get(`/manual-email/schedule-stats`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to get schedule stats:", error);
      throw error;
    }
  }
}

export default new EmailService();
