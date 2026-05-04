"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { checkApplicationStatus } from "@/services/application";
import toast from "react-hot-toast";

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [applicationId, setApplicationId] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const initialAppId = searchParams.get("applicationId");

  useEffect(() => {
    if (initialAppId) {
      setApplicationId(initialAppId);
      handleCheckStatus(initialAppId);
    }
  }, [initialAppId]);

  const handleCheckStatus = async (id?: string) => {
    const appId = id || applicationId;
    if (!appId) {
      toast.error("Please enter your Application ID");
      return;
    }

    setLoading(true);
    try {
      const response = await checkApplicationStatus(appId);
      setStatus(response.data);
      setChecked(true);
    } catch (error: any) {
      console.error("Status check error:", error);
      toast.error(
        error.response?.data?.message || "Failed to check application status",
      );
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-900/50 text-yellow-300 border border-yellow-700">
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-900/50 text-green-300 border border-green-700">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-900/50 text-red-300 border border-red-700">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-800 text-gray-300 border border-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Application Status
          </h1>
          <p className="text-gray-400 mt-2">
            Check the status of your internet application
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 md:p-8 border border-gray-700">
          {/* Search Form */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Application ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                placeholder="e.g., SLK2603123456"
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
              />
              <button
                onClick={() => handleCheckStatus()}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? "Checking..." : "Check"}
              </button>
            </div>
          </div>

          {/* Status Result */}
          {checked && status && (
            <div className="border-t border-gray-700 pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Application ID:</span>
                  <span className="font-mono font-semibold text-white">
                    {status.applicationId}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Status:</span>
                  {getStatusBadge(status.status)}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Plan:</span>
                  <span className="font-semibold text-white">
                    {status.plan?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Building:</span>
                  <span className="font-semibold text-white">
                    {status.building?.buildingName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Submitted:</span>
                  <span className="text-gray-300">
                    {new Date(status.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {status.adminNotes && (
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 font-medium mb-1">
                      Admin Notes:
                    </p>
                    <p className="text-sm text-gray-300">{status.adminNotes}</p>
                  </div>
                )}
              </div>

              {status.status === "approved" && (
                <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
                  <p className="text-green-300 text-sm">
                    ✅ Your application has been approved! You can now create
                    your account using your Application ID.
                  </p>
                  <button
                    onClick={() => router.push("/register")}
                    className="mt-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                  >
                    Create Account Now
                  </button>
                </div>
              )}

              {status.status === "rejected" && (
                <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">
                    ❌ Your application has been rejected. Please contact
                    support for more information.
                  </p>
                </div>
              )}

              {status.status === "pending" && (
                <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    ⏳ Your application is pending review. You will receive an
                    email once approved.
                  </p>
                </div>
              )}
            </div>
          )}

          {checked && !status && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No application found with that ID</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}
