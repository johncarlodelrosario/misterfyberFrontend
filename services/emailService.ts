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
  // FIXED: Added timestamp for debugging
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
}

class EmailService {
  // FIXED: Added forceRefresh parameter
  async getCustomers(params?: {
    search?: string;
    status?: string;
    hasBilling?: string;
    forceRefresh?: boolean;
  }): Promise<Customer[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.hasBilling)
        queryParams.append("hasBilling", params.hasBilling);
      // FIXED: Pass forceRefresh to bypass cache
      if (params?.forceRefresh) queryParams.append("forceRefresh", "true");

      // FIXED: Add cache-busting timestamp
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
      // FIXED: Add cache-busting timestamp
      const response = await api.get(
        `/manual-email/customers/${applicationId}/bills?_t=${Date.now()}`,
      );
      return response.data.data || { customer: null, bills: [] };
    } catch (error) {
      console.error("Failed to get customer bills:", error);
      throw error;
    }
  }

  async sendEmail(data: {
    applicationId: string;
    subject: string;
    message: string;
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
    includeBilling: boolean;
    billType: "unpaid" | "latest" | "installation";
    sendCopyToAdmin?: boolean;
    useAdminSender?: boolean;
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

  async getTemplates(): Promise<EmailTemplate[]> {
    try {
      // FIXED: Add cache-busting timestamp
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

  async getSentRecords(): Promise<EmailSentRecord[]> {
    try {
      // FIXED: Add cache-busting timestamp
      const response = await api.get(
        `/manual-email/sent-records?_t=${Date.now()}`,
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

  async previewEmail(data: {
    subject: string;
    message: string;
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
}

export default new EmailService();
