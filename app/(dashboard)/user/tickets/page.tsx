"use client";

import { useState, useEffect } from "react";
import { getSupportTickets, createSupportTicket } from "@/services/user";
import {
  FiMessageSquare,
  FiPlus,
  FiMail,
  FiPhone,
  FiSend,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

interface Ticket {
  _id: string;
  subject: string;
  message: string;
  status: "open" | "in-progress" | "closed";
  createdAt: string;
  updatedAt: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getSupportTickets();
      setTickets(data || []);
    } catch (error: any) {
      console.error("Failed to load tickets:", error);
      toast.error(error.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket(formData);
      toast.success("Ticket created successfully!");
      setShowModal(false);
      setFormData({ subject: "", message: "" });
      loadTickets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: "bg-yellow-100 text-yellow-700",
      "in-progress": "bg-blue-100 text-blue-700",
      closed: "bg-green-100 text-green-700",
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading tickets...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Support Tickets
            </h1>
            <p className="text-gray-600">
              View and manage your support requests
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition"
          >
            <FiPlus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tickets yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create a support ticket and we'll get back to you
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Create Support Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start flex-wrap gap-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ticket.subject}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}
                  >
                    {ticket.status.charAt(0).toUpperCase() +
                      ticket.status.slice(1)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{ticket.message}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>
                    Created: {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Last updated:{" "}
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Support Contact */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">
            Need immediate assistance?
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            For urgent issues, please contact us directly
          </p>
          <div className="flex gap-4">
            <a
              href="tel:+63212345678"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FiPhone className="w-4 h-4" />
              <span>Call Support</span>
            </a>
            <a
              href="mailto:support@misterfyber.com"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FiMail className="w-4 h-4" />
              <span>Email Support</span>
            </a>
          </div>
        </div>

        {/* Create Ticket Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Create Support Ticket
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="Brief description of your issue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={5}
                    placeholder="Please provide details about your issue..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiSend className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
