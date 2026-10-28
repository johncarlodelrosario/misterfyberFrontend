// app/(dashboard)/user/transactions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getBillingHistory } from "@/services/billing";
import {
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

interface Transaction {
  id: string;
  paidDate: string;
  month: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  invoiceNumber: string;
  isProRated: boolean;
  billingPeriod?: {
    start: string;
    end: string;
  };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await getBillingHistory({ page: 1, limit: 100 });
      console.log("Billing history response:", response);

      const billingHistory = response?.billingHistory || response?.data || [];

      const formattedTransactions: Transaction[] = billingHistory.map(
        (bill: any) => ({
          id: bill._id,
          paidDate: bill.paidAt || bill.updatedAt || bill.createdAt,
          month: bill.billingPeriod
            ? `${new Date(bill.billingPeriod.start).toLocaleDateString()} - ${new Date(bill.billingPeriod.end).toLocaleDateString()}`
            : "Monthly Subscription",
          amount: bill.total || 0,
          status:
            bill.status === "paid"
              ? "paid"
              : bill.status === "pending_confirmation"
                ? "pending"
                : bill.status === "cancelled"
                  ? "failed"
                  : "pending",
          invoiceNumber: bill.invoiceNumber || "N/A",
          isProRated: bill.isProRated || false,
          billingPeriod: bill.billingPeriod,
        }),
      );

      // Sort by date descending
      formattedTransactions.sort(
        (a, b) =>
          new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime(),
      );

      setTransactions(formattedTransactions);
    } catch (error: any) {
      console.error("Failed to load transactions:", error);
      toast.error(
        error.response?.data?.message || "Failed to load transactions",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleDownloadInvoice = async (transaction: Transaction) => {
    setDownloading(transaction.id);
    try {
      // Create a simple text invoice
      const invoiceContent = `
===========================================
           INVOICE
===========================================
Invoice Number: ${transaction.invoiceNumber}
Date: ${new Date(transaction.paidDate).toLocaleDateString()}
Period: ${transaction.month}
${transaction.isProRated ? "Type: Pro-rated Bill\n" : ""}
-------------------------------------------
Amount: ₱${transaction.amount.toLocaleString()}
Status: ${transaction.status.toUpperCase()}
-------------------------------------------
Thank you for your payment!
===========================================
      `.trim();

      const blob = new Blob([invoiceContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${transaction.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Invoice ${transaction.invoiceNumber} downloaded!`);
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error("Failed to download invoice");
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "paid") {
      return {
        color: "bg-green-100 text-green-700",
        text: "Completed",
        icon: FiCheckCircle,
      };
    }
    if (status === "pending") {
      return {
        color: "bg-yellow-100 text-yellow-700",
        text: "Pending",
        icon: FiClock,
      };
    }
    return {
      color: "bg-red-100 text-red-700",
      text: "Failed/Cancelled",
      icon: FiX,
    };
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading transactions...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600">View your payment history</p>
            </div>
            <button
              onClick={loadTransactions}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No transactions yet
            </h3>
            <p className="text-gray-500">
              Your payment history will appear here once you make a payment
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((transaction) => {
                    const statusInfo = getStatusBadge(transaction.status);
                    const StatusIcon = statusInfo.icon;
                    const isDownloading = downloading === transaction.id;

                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {transaction.paidDate
                            ? new Date(
                                transaction.paidDate,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {transaction.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transaction.month}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₱{transaction.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.text}
                          </span>
                          {transaction.isProRated && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              Pro-rated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDownloadInvoice(transaction)}
                            disabled={isDownloading}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDownloading ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <FiDownload className="w-3 h-3" />
                                Invoice
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-wrap gap-2">
              <p className="text-sm text-gray-500">
                Total: {transactions.length} transaction(s)
              </p>
              <p className="text-sm font-semibold text-gray-900">
                Total Paid: ₱
                {transactions
                  .filter((t) => t.status === "paid")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
