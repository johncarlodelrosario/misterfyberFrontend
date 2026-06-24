// isp-frontend/app/(dashboard)/admin/invoice/[id]/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import invoiceService, { Invoice } from "@/services/invoiceService";
import toast from "react-hot-toast";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice");
      router.push("/admin/invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!invoice) return;
    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });
      await invoiceService.generateInvoicePDF(invoice._id);
      toast.success("PDF generated successfully!", { id: "pdf-gen" });
      await invoiceService.downloadInvoicePDF(invoice._id);
      fetchInvoice();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { id: "pdf-gen" });
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    try {
      toast.loading("Sending invoice...", { id: "send-invoice" });
      const result = await invoiceService.sendInvoiceWithPDF(invoice._id);
      if (result.emailSent) {
        toast.success("Invoice sent successfully!", { id: "send-invoice" });
      } else {
        toast.error("Invoice created but email failed to send", {
          id: "send-invoice",
          icon: "⚠️",
        });
      }
      fetchInvoice();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice", { id: "send-invoice" });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    try {
      toast.loading("Marking as paid...", { id: "mark-paid" });
      await invoiceService.markInvoiceAsPaid(
        invoice._id,
        referenceNumber || undefined,
        paymentNotes || undefined,
      );
      toast.success("Invoice marked as paid!", { id: "mark-paid" });
      setShowMarkPaidModal(false);
      setReferenceNumber("");
      setPaymentNotes("");
      fetchInvoice();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Failed to mark invoice as paid", { id: "mark-paid" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      await invoiceService.downloadInvoicePDF(invoice._id);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      toast.loading("Deleting invoice...", { id: "delete-invoice" });
      await invoiceService.deleteInvoice(invoice._id);
      toast.success("Invoice deleted successfully", { id: "delete-invoice" });
      router.push("/admin/invoice");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice", { id: "delete-invoice" });
    }
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
      month: "long",
      day: "numeric",
    });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
        <Link
          href="/admin/invoice"
          className="text-indigo-600 hover:underline mt-2 inline-block"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/admin/invoice"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(invoice.status)}`}
              >
                {getStatusLabel(invoice.status)}
              </span>
              <span className="text-sm text-gray-500 capitalize">
                {invoice.invoiceType}
              </span>
              {invoice.isInstallationFee && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  Installation Fee
                </span>
              )}
              {invoice.isProRated && (
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  Pro-rated ({invoice.proRatedDays} days)
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.status === "draft" && (
              <>
                <button
                  onClick={handleGeneratePDF}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Generate PDF
                </button>
                <button
                  onClick={handleSendInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Send Invoice
                </button>
              </>
            )}
            {(invoice.status === "sent" || invoice.status === "overdue") && (
              <button
                onClick={() => setShowMarkPaidModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Mark as Paid
              </button>
            )}
            {invoice.pdfUrl && (
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Download PDF
              </button>
            )}
            {invoice.status !== "paid" && (
              <button
                onClick={handleDeleteInvoice}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Customer Information
            </h3>
            <p className="text-gray-900 font-medium">{invoice.customerName}</p>
            <p className="text-gray-600 text-sm">{invoice.customerAddress}</p>
            <p className="text-gray-600 text-sm">{invoice.customerEmail}</p>
            {invoice.customerPhone && (
              <p className="text-gray-600 text-sm">{invoice.customerPhone}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Invoice Information
            </h3>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Issue Date:</span>{" "}
              {formatDate(invoice.issuedDate)}
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Due Date:</span>{" "}
              {formatDate(invoice.dueDate)}
            </p>
            <p className="text-gray-600 text-sm">
              <span className="font-medium">Billing Period:</span>{" "}
              {formatDate(invoice.billingPeriod.start)} -{" "}
              {formatDate(invoice.billingPeriod.end)}
            </p>
            {invoice.planName && (
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Plan:</span> {invoice.planName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.description}
                    {item.type && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">
                        {item.type}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-3 text-sm font-medium text-gray-900 text-right"
                >
                  Subtotal:
                </td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              {invoice.discountAmount > 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-3 text-sm text-gray-600 text-right"
                  >
                    Discount:
                  </td>
                  <td className="px-6 py-3 text-sm text-red-600 text-right">
                    -{formatCurrency(invoice.discountAmount)}
                  </td>
                </tr>
              )}
              {invoice.taxAmount > 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-3 text-sm text-gray-600 text-right"
                  >
                    Tax ({invoice.taxRate}%):
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(invoice.taxAmount)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-300">
                <td
                  colSpan={3}
                  className="px-6 py-4 text-base font-bold text-gray-900 text-right"
                >
                  Total:
                </td>
                <td className="px-6 py-4 text-base font-bold text-indigo-600 text-right">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Payment Instructions
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Bank Name:</span>{" "}
            {invoice.bankName || "BDO"}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Account Name:</span>{" "}
            {invoice.accountName || "FYBERBLIZZ NETWORK CORPORATION"}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Account Number:</span>{" "}
            {invoice.accountNumber || "013448002421"}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Kindly send your proof of payment via Viber {invoice.companyContact}{" "}
            or at {invoice.companyEmail}
          </p>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Notes:</span> {invoice.notes}
          </p>
        </div>
      )}

      {/* Terms */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          <span className="font-medium">IMPORTANT NOTICE:</span>{" "}
          {invoice.termsAndConditions}
        </p>
      </div>

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowMarkPaidModal(false)}
            ></div>

            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mark Invoice as Paid
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Invoice:</strong> {invoice.invoiceNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Amount:</strong> {formatCurrency(invoice.total)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Customer:</strong> {invoice.customerName}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter reference number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter payment notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
