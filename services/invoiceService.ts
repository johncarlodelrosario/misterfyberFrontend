// isp-frontend/services/invoiceService.ts

import api from "./api";

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  type?: "subscription" | "installation" | "pro-rated" | "discount" | "tax";
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: "monthly" | "pro-rated" | "installation" | "combined";
  applicationId: string;
  userId?: string;
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone?: string;
  companyName: string;
  companyAddress: string;
  companyVat: string;
  companyContact: string;
  companyEmail: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  dueDate: Date;
  issuedDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paidAt?: Date;
  paymentId?: string;
  billingId?: string;
  billingCycleId?: string;
  notes?: string;
  termsAndConditions?: string;
  isInstallationFee: boolean;
  isProRated: boolean;
  proRatedDays?: number;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  planName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceData {
  billingId?: string;
  applicationId?: string;
  dueDate?: string;
  customItems?: InvoiceItem[];
}

export interface InvoiceStats {
  totalRevenue: number;
  totalInvoices: number;
  monthlyRevenue: number;
  monthlyInvoices: number;
  byStatus: Array<{ _id: string; count: number; totalAmount: number }>;
  byType: Array<{ _id: string; count: number; totalAmount: number }>;
}

export interface InvoiceFilters {
  applicationId?: string;
  status?: string;
  invoiceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

class InvoiceService {
  private baseUrl = "/api/invoices";

  // Create invoice from billing
  async createInvoiceFromBilling(data: CreateInvoiceData): Promise<Invoice> {
    const response = await api.post(`${this.baseUrl}/create`, data);
    return response.data.data;
  }

  // Generate PDF for invoice
  async generateInvoicePDF(
    invoiceId: string,
  ): Promise<{ pdfUrl: string; invoice: Invoice }> {
    const response = await api.post(
      `${this.baseUrl}/${invoiceId}/generate-pdf`,
    );
    return response.data.data;
  }

  // Send invoice with PDF attachment
  async sendInvoiceWithPDF(
    invoiceId: string,
  ): Promise<{ invoice: Invoice; emailSent: boolean }> {
    const response = await api.post(`${this.baseUrl}/${invoiceId}/send`);
    return response.data.data;
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(
    invoiceId: string,
    referenceNumber?: string,
    notes?: string,
  ): Promise<{ invoice: Invoice; payment: any }> {
    const response = await api.put(`${this.baseUrl}/${invoiceId}/mark-paid`, {
      referenceNumber,
      notes,
    });
    return response.data.data;
  }

  // Get all invoices with filters
  async getInvoices(filters: InvoiceFilters = {}): Promise<{
    data: Invoice[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const queryParams = new URLSearchParams();
    if (filters.applicationId)
      queryParams.append("applicationId", filters.applicationId);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.invoiceType)
      queryParams.append("invoiceType", filters.invoiceType);
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.page) queryParams.append("page", filters.page.toString());
    if (filters.limit) queryParams.append("limit", filters.limit.toString());

    const url = queryParams.toString()
      ? `${this.baseUrl}?${queryParams}`
      : this.baseUrl;
    const response = await api.get(url);
    return response.data;
  }

  // Get single invoice
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await api.get(`${this.baseUrl}/${invoiceId}`);
    return response.data.data;
  }

  // Get invoice PDF
  async getInvoicePDF(invoiceId: string): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/${invoiceId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  }

  // Get application invoices
  async getApplicationInvoices(applicationId: string): Promise<Invoice[]> {
    const response = await api.get(
      `${this.baseUrl}/application/${applicationId}`,
    );
    return response.data.data;
  }

  // Update invoice
  async updateInvoice(
    invoiceId: string,
    data: Partial<Invoice>,
  ): Promise<Invoice> {
    const response = await api.put(`${this.baseUrl}/${invoiceId}`, data);
    return response.data.data;
  }

  // Delete invoice
  async deleteInvoice(invoiceId: string): Promise<{ message: string }> {
    const response = await api.delete(`${this.baseUrl}/${invoiceId}`);
    return response.data;
  }

  // Get invoice statistics
  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  // Helper: Download PDF
  async downloadInvoicePDF(
    invoiceId: string,
    fileName?: string,
  ): Promise<void> {
    try {
      const blob = await this.getInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      throw error;
    }
  }

  // Helper: Get status badge color
  getStatusBadgeColor(status: string): string {
    const colors: Record<string, string> = {
      draft: "bg-gray-500",
      sent: "bg-blue-500",
      paid: "bg-green-500",
      overdue: "bg-red-500",
      cancelled: "bg-gray-400",
    };
    return colors[status] || "bg-gray-500";
  }

  // Helper: Get status label
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  }

  // Helper: Get invoice type label
  getInvoiceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      "pro-rated": "Pro-rated",
      installation: "Installation",
      combined: "Combined",
    };
    return labels[type] || type;
  }

  // Helper: Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Helper: Format date
  formatDate(date: Date | string): string {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Helper: Format date with time
  formatDateTime(date: Date | string): string {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

export default new InvoiceService();
