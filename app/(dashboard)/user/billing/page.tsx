"use client";

import { useState, useEffect } from "react";
import {
  getUserCurrentBilling,
  getUserBillingHistory,
  submitProRatedPayment,
  submitMonthlyPayment,
} from "@/services/billing";
import {
  FiClipboard,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiAlertTriangle,
  FiUpload,
  FiInfo,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function BillingPage() {
  const [billingData, setBillingData] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadBilling = async () => {
    setLoading(true);
    try {
      const [currentResult, historyResult] = await Promise.all([
        getUserCurrentBilling(),
        getUserBillingHistory({ page: 1, limit: 50 }),
      ]);

      console.log("✅ Current Billing:", currentResult);
      console.log("✅ Billing History:", historyResult);

      setBillingData(currentResult?.data || null);
      setBillingHistory(historyResult?.data?.billingHistory || []);
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

  const handleSubmitProRatedPayment = async (billId: string) => {
    if (!paymentReference) {
      toast.error("Please enter a reference number");
      return;
    }

    setSubmitting(true);
    try {
      await submitProRatedPayment({
        billId,
        referenceNumber: paymentReference,
        notes: paymentNotes,
      });

      toast.success("Payment submitted! Awaiting admin confirmation.");
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

  const handleSubmitMonthlyPayment = async (billId: string) => {
    if (!paymentReference) {
      toast.error("Please enter a reference number");
      return;
    }

    setSubmitting(true);
    try {
      await submitMonthlyPayment({
        billId,
        referenceNumber: paymentReference,
        notes: paymentNotes,
      });

      toast.success("Payment submitted! Awaiting admin confirmation.");
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
    if (normalizedStatus === "pending_confirmation") {
      return {
        color: "bg-yellow-100 text-yellow-700",
        text: "Pending Confirmation",
        icon: FiClock,
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
    return { color: "bg-blue-100 text-blue-700", text: "Sent", icon: FiClock };
  };

  // Get current bills from billingData and billingHistory
  const currentBill = billingData?.currentBill || null;
  const needsFirstPayment = billingData?.needsFirstPayment === true;
  const isAfterCutoff = billingData?.isAfterCutoff || false;
  const billingCycle = billingData?.billingCycle || null;

  // Filter unpaid bills from history (excluding the current bill if it's pro-rated and unpaid)
  const unpaidBills = billingHistory.filter(
    (bill: any) => bill.status !== "paid" && bill.status !== "cancelled",
  );

  const paidBills = billingHistory.filter(
    (bill: any) => bill.status === "paid",
  );

  const hasOverdue = unpaidBills.some((bill: any) => {
    const dueDate = bill.dueDate;
    if (dueDate) {
      const daysLeft = getDaysUntilDue(dueDate);
      return daysLeft !== null && daysLeft < 0;
    }
    return false;
  });

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
        {billingCycle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiCalendar className="text-blue-600" /> Current Billing Cycle
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Period Start</p>
                <p className="text-sm font-medium">
                  {billingCycle.billingStartDate
                    ? new Date(
                        billingCycle.billingStartDate,
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Billing</p>
                <p className="text-sm font-medium">
                  {billingCycle.nextBillingDate
                    ? new Date(
                        billingCycle.nextBillingDate,
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Rate</p>
                <p className="text-sm font-medium">
                  ₱{(billingCycle.monthlyRate || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    billingCycle.status === "active"
                      ? "bg-green-100 text-green-800"
                      : billingCycle.status === "pending_activation"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {billingCycle.status === "pending_activation"
                    ? "Awaiting First Payment"
                    : billingCycle.status || "Unknown"}
                </span>
              </div>
            </div>
            {isAfterCutoff && (
              <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  ℹ️ Your installation was after the cutoff date. Your first
                  bill is for next month's full monthly subscription.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Needs Pro-rated Payment Alert */}
        {needsFirstPayment && currentBill && currentBill.isProRated && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiInfo className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-purple-800">
                  📋 Pro-rated Payment Required
                </p>
                <p className="text-sm text-purple-600 mb-3">
                  Your pro-rated payment of ₱
                  {(currentBill.total || 0).toLocaleString()} is due on{" "}
                  {new Date(currentBill.dueDate).toLocaleDateString()}. Once
                  paid, your service will be fully activated.
                </p>
                <button
                  onClick={() => {
                    setSelectedBill(currentBill);
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <FiUpload className="w-4 h-4" /> Pay Pro-rated Amount Now
                </button>
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
                service interruption.
              </p>
            </div>
          </div>
        )}

        {/* Unpaid Bills (excluding pro-rated if separate) */}
        {unpaidBills.length > 0 && !needsFirstPayment && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pending Payments ({unpaidBills.length})
            </h2>
            <div className="space-y-4">
              {unpaidBills.map((bill: any) => {
                const daysLeft = bill.dueDate
                  ? getDaysUntilDue(bill.dueDate)
                  : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const statusInfo = getStatusBadge(bill.status, bill.dueDate);
                const StatusIcon = statusInfo.icon;
                const isPendingConfirmation =
                  bill.status === "pending_confirmation";

                return (
                  <div
                    key={bill._id}
                    className="bg-white rounded-xl shadow-sm border p-6"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          Invoice #{bill.invoiceNumber}
                        </p>
                        {bill.isProRated && (
                          <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1">
                            Pro-rated Bill
                          </span>
                        )}
                        {bill.includesProRatedAmount && (
                          <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 ml-2">
                            Includes Pro-rated Amount
                          </span>
                        )}
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          ₱{bill.total?.toLocaleString()}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.text}
                          </span>
                          {bill.dueDate && isOverdue && (
                            <span className="text-xs text-red-600">
                              Overdue by {Math.abs(daysLeft)} day(s)
                            </span>
                          )}
                          {bill.dueDate &&
                            !isOverdue &&
                            daysLeft !== null &&
                            daysLeft >= 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" /> Due in{" "}
                                {daysLeft} day(s)
                              </span>
                            )}
                        </div>
                        {bill.items && bill.items.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {bill.items.map((item: any, idx: number) => (
                              <p key={idx}>{item.description}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isPendingConfirmation && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowPaymentModal(true);
                          }}
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition flex items-center gap-2"
                        >
                          <FiUpload className="w-4 h-4" /> Submit Payment
                        </button>
                      )}
                      {isPendingConfirmation && (
                        <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg flex items-center gap-2">
                          <FiClock className="w-4 h-4" /> Waiting for
                          confirmation
                        </span>
                      )}
                    </div>

                    {isOverdue && daysLeft !== null && daysLeft <= -5 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4" />
                          <strong>URGENT:</strong> Your payment is 5+ days
                          overdue. Your service will be suspended if not paid.
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
                  {paidBills.map((bill: any) => (
                    <tr key={bill._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bill.updatedAt
                          ? new Date(bill.updatedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {bill.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bill.billingPeriod
                          ? `${new Date(bill.billingPeriod.start).toLocaleDateString()} - ${new Date(bill.billingPeriod.end).toLocaleDateString()}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₱{bill.total?.toLocaleString()}
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
              Invoice #{selectedBill.invoiceNumber} - ₱
              {selectedBill.total?.toLocaleString()}
            </p>
            {selectedBill.isProRated && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>Pro-rated Bill:</strong> This payment will activate
                  your service.
                </p>
              </div>
            )}

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
                  onClick={() => {
                    if (selectedBill.isProRated) {
                      handleSubmitProRatedPayment(selectedBill._id);
                    } else {
                      handleSubmitMonthlyPayment(selectedBill._id);
                    }
                  }}
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
