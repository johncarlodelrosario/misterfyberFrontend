// isp-frontend/components/InvoiceList.tsx

"use client";

import React, { useState, useEffect } from "react";
import invoiceService, { Invoice } from "@/services/invoiceService";
import toast from "react-hot-toast";

interface InvoiceListProps {
  applicationId: string;
  showActions?: boolean;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  applicationId,
  showActions = true,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchInvoices();
  }, [applicationId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getApplicationInvoices(applicationId);
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      await invoiceService.downloadInvoicePDF(invoiceId);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-200 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-500",
    };
    return colors[status] || "bg-gray-200 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: "Monthly",
      "pro-rated": "Pro-rated",
      installation: "Installation",
      combined: "Combined",
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredInvoices =
    filter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Filter */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="sent">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoice List */}
      <ul className="divide-y divide-gray-200">
        {filteredInvoices.map((invoice) => (
          <li key={invoice._id} className="p-4 hover:bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-indigo-600 text-sm">
                    {invoice.invoiceNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(invoice.status)}`}
                  >
                    {getStatusLabel(invoice.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getInvoiceTypeLabel(invoice.invoiceType)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span>Due: {formatDate(invoice.dueDate)}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invoice.pdfUrl && (
                  <button
                    onClick={() => handleDownloadPDF(invoice._id)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Download PDF
                  </button>
                )}
                {invoice.status === "sent" && showActions && (
                  <button className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InvoiceList;
