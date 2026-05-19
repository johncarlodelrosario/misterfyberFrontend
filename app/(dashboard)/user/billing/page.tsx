// app/(dashboard)/user/billing/page.tsx - COMPLETE WORKING BILLING PAGE
"use client";

import { useState, useEffect } from "react";
import {
  getUserBillingHistory,
  getUserBillingCycle,
  getCurrentBill,
} from "@/services/user";
import { createPayment } from "@/services/payment";
import {
  FiClipboard,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiAlertTriangle,
  FiUpload,
  FiInfo,
  FiDownload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function BillingPage() {
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<any>(null);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadBilling = async () => {
    setLoading(true);
    try {
      const [billingSummary, cycleData, billData] = await Promise.all([
        getUserBillingHistory(),
        getUserBillingCycle(),
        getCurrentBill(),
      ]);

      console.log("✅ Billing Summary:", billingSummary);
      console.log("✅ Billing Cycle:", cycleData);
      console.log("✅ Current Bill:", billData);

      // Extract billing history from the response
      const bills = billingSummary?.billingHistory || [];
      console.log("📋 Bills found:", bills.length);

      setBillingHistory(bills);
      setBillingCycle(cycleData);
      setCurrentBill(billData);
    } catch (error: any) {
      console.error("Failed to load billing:", error);
      toast.error(error.response?.data?.message || "Failed to load billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleSubmitPayment = async (billId: string, amount: number) => {
    if (!paymentReference) {
      toast.error(
        "Please enter a reference number (e.g., GCash Ref No., Bank Ref No.)",
      );
      return;
    }

    setSubmitting(true);
    try {
      await createPayment({
        amount,
        paymentMethod: "manual",
        billingId: billId,
        paymentType: "subscription",
        referenceNumber: paymentReference,
        notes: paymentNotes,
      });

      toast.success("Payment submitted! Please wait for admin confirmation.");
      setShowPaymentModal(false);
      setPaymentReference("");
      setPaymentNotes("");
      setSelectedBill(null);
      loadBilling();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string, dueDate?: string) => {
    const normalizedStatus = status?.toLowerCase() || "pending";

    if (normalizedStatus === "paid") {
      return {
        color: "bg-green-100 text-green-700",
        text: "Paid",
        icon: FiCheckCircle,
      };
    }
    if (normalizedStatus === "overdue") {
      return {
        color: "bg-red-100 text-red-700",
        text: "Overdue",
        icon: FiAlertTriangle,
      };
    }
    if (dueDate) {
      const daysLeft = getDaysUntilDue(dueDate);
      if (daysLeft !== null && daysLeft <= 1 && daysLeft >= 0) {
        return {
          color: "bg-orange-100 text-orange-700",
          text: "Due Soon",
          icon: FiClock,
        };
      }
      if (daysLeft !== null && daysLeft < 0) {
        return {
          color: "bg-red-100 text-red-700",
          text: "Overdue",
          icon: FiAlertTriangle,
        };
      }
    }
    return {
      color: "bg-yellow-100 text-yellow-700",
      text: "Pending",
      icon: FiClock,
    };
  };

  const getBillAmount = (bill: any) => bill.total || bill.amount || 0;
  const getBillDueDate = (bill: any) => bill.dueDate;
  const getBillStatus = (bill: any) => bill.status || "pending";
  const getBillInvoiceNumber = (bill: any) =>
    bill.invoiceNumber || bill._id?.slice(-8);
  const getBillId = (bill: any) => bill._id;

  const getBillPeriod = (bill: any) => {
    if (bill.billingPeriod && typeof bill.billingPeriod === "object") {
      const start = bill.billingPeriod.start
        ? new Date(bill.billingPeriod.start).toLocaleDateString()
        : "";
      const end = bill.billingPeriod.end
        ? new Date(bill.billingPeriod.end).toLocaleDateString()
        : "";
      if (start && end) return `${start} - ${end}`;
    }
    if (typeof bill.billingPeriod === "string") return bill.billingPeriod;
    if (bill.period) return bill.period;
    if (bill.month) return bill.month;
    return "-";
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading billing information...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  // Filter bills
  const unpaidBills = billingHistory.filter(
    (bill: any) => getBillStatus(bill) !== "paid",
  );
  const paidBills = billingHistory.filter(
    (bill: any) => getBillStatus(bill) === "paid",
  );

  const hasOverdue = unpaidBills.some((bill: any) => {
    const dueDate = getBillDueDate(bill);
    if (dueDate) {
      const daysLeft = getDaysUntilDue(dueDate);
      return daysLeft !== null && daysLeft < 0;
    }
    return false;
  });

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
              <p className="text-gray-600">
                Manage your payments and view invoices
              </p>
            </div>
            <button
              onClick={loadBilling}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Billing Cycle Info */}
        {billingCycle?.billingCycle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiCalendar className="text-blue-600" /> Current Billing Cycle
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Period Start</p>
                <p className="text-sm font-medium">
                  {billingCycle.billingCycle.billingStartDate
                    ? new Date(
                        billingCycle.billingCycle.billingStartDate,
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Billing</p>
                <p className="text-sm font-medium">
                  {billingCycle.billingCycle.nextBillingDate
                    ? new Date(
                        billingCycle.billingCycle.nextBillingDate,
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Rate</p>
                <p className="text-sm font-medium">
                  ₱
                  {(
                    billingCycle.billingCycle.monthlyRate || 0
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    billingCycle.billingCycle.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {billingCycle.billingCycle.status || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Alert */}
        {hasOverdue && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <FiAlertTriangle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">⚠️ Overdue Payment</p>
              <p className="text-sm text-red-600">
                You have overdue bill(s). Please pay immediately to avoid
                service interruption. You have a 5-day grace period before
                service is suspended.
              </p>
            </div>
          </div>
        )}

        {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pending Payments ({unpaidBills.length})
            </h2>
            <div className="space-y-4">
              {unpaidBills.map((bill: any, index: number) => {
                const amount = getBillAmount(bill);
                const dueDate = getBillDueDate(bill);
                const invoiceNumber = getBillInvoiceNumber(bill);
                const billId = getBillId(bill);
                const daysLeft = dueDate ? getDaysUntilDue(dueDate) : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const statusInfo = getStatusBadge(getBillStatus(bill), dueDate);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={billId || index}
                    className="bg-white rounded-xl shadow-sm border p-6"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          Invoice #{invoiceNumber}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          ₱{amount.toLocaleString()}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.text}
                          </span>
                          {dueDate && isOverdue && (
                            <span className="text-xs text-red-600">
                              Overdue by {Math.abs(daysLeft)} day(s)
                            </span>
                          )}
                          {dueDate &&
                            !isOverdue &&
                            daysLeft !== null &&
                            daysLeft >= 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" /> Due in{" "}
                                {daysLeft} day(s)
                              </span>
                            )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedBill(bill);
                          setShowPaymentModal(true);
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center gap-2"
                      >
                        <FiUpload className="w-4 h-4" /> Submit Payment
                      </button>
                    </div>

                    {isOverdue && daysLeft !== null && daysLeft <= -5 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4" />
                          <strong>URGENT:</strong> Your payment is 5+ days
                          overdue. Your service will be suspended immediately if
                          not paid.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 p-6 border-b">
            Payment History {paidBills.length > 0 && `(${paidBills.length})`}
          </h2>
          {paidBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paidBills.map((bill: any, index: number) => (
                    <tr key={bill._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bill.paidDate
                          ? new Date(bill.paidDate).toLocaleDateString()
                          : bill.updatedAt
                            ? new Date(bill.updatedAt).toLocaleDateString()
                            : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getBillInvoiceNumber(bill)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {getBillPeriod(bill)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₱{getBillAmount(bill).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <FiCheckCircle className="w-3 h-3" /> Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FiClipboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No payment history found</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>📌 Billing Information:</strong> Bills are generated at the
            end of each month. You have a 5-day grace period after the due date
            to make your payment. If payment is not received within 5 days, your
            service will be automatically suspended.
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Submit Payment
            </h2>
            <p className="text-gray-600 mb-4">
              Invoice #{getBillInvoiceNumber(selectedBill)} - ₱
              {getBillAmount(selectedBill).toLocaleString()}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number *
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., GCash Ref No., Bank Reference No."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the reference number from your payment transaction
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional information about your payment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> Your payment will be pending until
                  confirmed by an admin. You will receive an email once your
                  payment is verified.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedBill(null);
                    setPaymentReference("");
                    setPaymentNotes("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleSubmitPayment(
                      getBillId(selectedBill),
                      getBillAmount(selectedBill),
                    )
                  }
                  disabled={submitting || !paymentReference}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <FiUpload className="w-4 h-4" />
                      Submit Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
