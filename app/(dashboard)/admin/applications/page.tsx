"use client";

import { useState, useEffect } from "react";
import {
  getAllApplications,
  approveApplication,
  rejectApplication,
} from "@/services/admin";
import toast from "react-hot-toast";
import {
  FiEye,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiImage,
  FiAlertCircle,
} from "react-icons/fi";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const PRODUCTION_URL = "https://misterfyberbackend.onrender.com";

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllApplications();
      console.log("Applications data:", data.data);
      setApplications(data.data || []);
    } catch (error: any) {
      console.error("Failed to load applications:", error);
      setError(error.message || "Failed to load applications");
      toast.error("Failed to load applications. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, adminNotes?: string) => {
    try {
      await approveApplication(id, adminNotes);
      toast.success("Application approved successfully");
      loadApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error("Failed to approve application");
    }
  };

  const handleReject = async (id: string, adminNotes?: string) => {
    try {
      await rejectApplication(id, adminNotes);
      toast.success("Application rejected");
      loadApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error("Failed to reject application");
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    if (imagePath.startsWith("data:image")) {
      return imagePath;
    }
    let cleanPath = imagePath.replace(/^\/+/, "");
    if (!cleanPath.startsWith("uploads/")) {
      cleanPath = `uploads/${cleanPath}`;
    }
    return `${PRODUCTION_URL}/${cleanPath}`;
  };

  const filteredApplications = applications.filter((app: any) => {
    const matchesSearch =
      app.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-gray-600">Review and manage customer applications</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={loadApplications}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No applications found
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app: any) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.applicationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.planId?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(app.status)}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (keep your existing modal code here) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Your existing modal content - unchanged */}
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedApp.status === "pending"
                      ? "Review Application"
                      : "Application Details"}
                  </h2>
                  {selectedApp.status !== "pending" && (
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedApp.status)}`}
                    >
                      {selectedApp.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">Name:</span>{" "}
                      {selectedApp.firstName} {selectedApp.lastName}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{" "}
                      {selectedApp.email}
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span>{" "}
                      {selectedApp.phoneNumber}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                  <div className="text-sm">
                    <p>
                      <span className="text-gray-500">Building:</span>{" "}
                      {selectedApp.buildingId?.buildingName || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Floor:</span>{" "}
                      {selectedApp.floor || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Unit Number:</span>{" "}
                      {selectedApp.unitNumber || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Plan Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">Plan:</span>{" "}
                      {selectedApp.planId?.name}
                    </p>
                    <p>
                      <span className="text-gray-500">Price:</span> ₱
                      {selectedApp.planId?.price}/month
                    </p>
                    <p>
                      <span className="text-gray-500">Speed:</span>{" "}
                      {selectedApp.planId?.speed?.download} Mbps
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">
                      ID Verification
                    </h3>
                    {selectedApp.idImage && (
                      <button
                        onClick={() => {
                          const imageUrl = getImageUrl(selectedApp.idImage);
                          if (imageUrl) {
                            setImagePreview(imageUrl);
                            setShowImageModal(true);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <FiImage className="w-4 h-4" />
                        View ID Image
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">ID Type:</span>{" "}
                      {selectedApp.idType}
                    </p>
                    <p>
                      <span className="text-gray-500">ID Number:</span>{" "}
                      {selectedApp.idNumber}
                    </p>
                  </div>
                </div>

                {selectedApp.status === "pending" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Notes
                      </label>
                      <textarea
                        id="adminNotes"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Add any notes about this application..."
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        onClick={() => setSelectedApp(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const notes = (
                            document.getElementById(
                              "adminNotes",
                            ) as HTMLTextAreaElement
                          ).value;
                          handleReject(selectedApp._id, notes);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <FiX /> Reject
                      </button>
                      <button
                        onClick={() => {
                          const notes = (
                            document.getElementById(
                              "adminNotes",
                            ) as HTMLTextAreaElement
                          ).value;
                          handleApprove(selectedApp._id, notes);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <FiCheck /> Approve
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && imagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => {
            setShowImageModal(false);
            setImagePreview(null);
          }}
        >
          <div className="relative max-w-4xl w-full mx-4">
            <button
              onClick={() => {
                setShowImageModal(false);
                setImagePreview(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <FiX className="w-8 h-8" />
            </button>
            <img
              src={imagePreview}
              alt="ID Document"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
