// frontend/services/emailService.ts
import api from "./api";

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  applicationId: string;
  status: string;
  hasBilling: boolean;
  hasUnpaidBills: boolean;
  lastBillAmount: number;
  lastBillStatus: string | null;
  buildingName?: string;
  buildingId?: string;
  location?: string;
}

export interface Bill {
  _id: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  status: string;
  isProRated: boolean;
  isInstallationBill: boolean;
  billingPeriod: {
    start: string;
    end: string;
  };
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
  recipientCount?: number;
  includeBilling: boolean;
  billType?: string;
  error?: string;
  senderType?: "admin" | "collection";
  location?: string;
  collectionEmail?: string;
}

export interface SendEmailParams {
  applicationId: string;
  subject: string;
  message: string;
  includeBilling: boolean;
  billId?: string;
  sendCopyToAdmin?: boolean;
  attachments?: any[];
  priority?: "low" | "normal" | "high";
  useAdminSender?: boolean;
}

export interface BulkEmailParams {
  applicationIds: string[];
  subject: string;
  message: string;
  includeBilling: boolean;
  billType?: "unpaid" | "latest" | "installation";
  sendCopyToAdmin?: boolean;
  useAdminSender?: boolean;
}

class EmailService {
  private baseUrl = "/manual-email";

  // Get customers for email selection
  async getCustomers(params?: {
    search?: string;
    status?: string;
    hasBilling?: boolean;
  }): Promise<Customer[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.hasBilling !== undefined)
        queryParams.append("hasBilling", String(params.hasBilling));

      const url = `${this.baseUrl}/customers${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await api.get(url);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      return [];
    }
  }

  // Get bills for a specific customer
  async getCustomerBills(
    applicationId: string,
  ): Promise<{ customer: Customer | null; bills: Bill[] }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/customers/${applicationId}/bills`,
      );
      return response.data.data || { customer: null, bills: [] };
    } catch (error) {
      console.error("Failed to fetch customer bills:", error);
      return { customer: null, bills: [] };
    }
  }

  // Send manual email to a single customer
  async sendEmail(params: SendEmailParams): Promise<any> {
    try {
      const response = await api.post(`${this.baseUrl}/send`, params);
      return response.data;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // Send bulk emails to multiple customers
  async sendBulkEmails(params: BulkEmailParams): Promise<any> {
    try {
      const response = await api.post(`${this.baseUrl}/send-bulk`, params);
      return response.data;
    } catch (error) {
      console.error("Failed to send bulk emails:", error);
      throw error;
    }
  }

  // Send reminder to all customers with unpaid bills
  async sendReminderToUnpaid(
    customMessage?: string,
    includeDueDateReminder?: boolean,
    useAdminSender?: boolean,
  ): Promise<any> {
    try {
      const response = await api.post(`${this.baseUrl}/send-reminder-unpaid`, {
        customMessage,
        includeDueDateReminder: includeDueDateReminder !== false,
        useAdminSender: useAdminSender || false,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to send unpaid reminders:", error);
      throw error;
    }
  }

  // Save email template
  async saveTemplate(
    template: Omit<EmailTemplate, "id" | "createdAt" | "updatedBy">,
  ): Promise<EmailTemplate> {
    try {
      const response = await api.post(`${this.baseUrl}/templates`, template);
      return response.data.data;
    } catch (error) {
      console.error("Failed to save template:", error);
      throw error;
    }
  }

  // Update email template
  async updateTemplate(
    templateId: string,
    template: Partial<Omit<EmailTemplate, "id" | "createdAt" | "updatedBy">>,
  ): Promise<EmailTemplate> {
    try {
      const response = await api.put(
        `${this.baseUrl}/templates/${templateId}`,
        template,
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  }

  // Get all email templates
  async getTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await api.get(`${this.baseUrl}/templates`);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      return [];
    }
  }

  // Delete email template
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/templates/${templateId}`);
    } catch (error) {
      console.error("Failed to delete template:", error);
      throw error;
    }
  }

  // Preview email before sending
  async previewEmail(params: {
    subject: string;
    message: string;
    includeBilling: boolean;
    applicationId?: string;
    billId?: string;
    useAdminSender?: boolean;
  }): Promise<{
    html: string;
    subject: string;
    message: string;
    location: string;
    senderInfo: string;
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/preview`, {
        ...params,
        useAdminSender: params.useAdminSender || false,
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to preview email:", error);
      throw error;
    }
  }

  // Get sent email records
  async getSentRecords(params?: {
    applicationId?: string;
    status?: string;
    isBulk?: boolean;
  }): Promise<EmailSentRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.applicationId)
        queryParams.append("applicationId", params.applicationId);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.isBulk !== undefined)
        queryParams.append("isBulk", String(params.isBulk));

      const url = `${this.baseUrl}/sent-records${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await api.get(url);
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch sent records:", error);
      return [];
    }
  }

  // Delete a sent record
  async deleteSentRecord(recordId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/sent-records/${recordId}`);
    } catch (error) {
      console.error("Failed to delete sent record:", error);
      throw error;
    }
  }
}

export default new EmailService();
