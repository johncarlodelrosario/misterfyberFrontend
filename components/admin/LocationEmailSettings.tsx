import React, { useState, useEffect } from "react";
import emailLocationService, {
  LocationEmails,
} from "../../services/emailLocationService";

const LocationEmailSettings: React.FC = () => {
  const [emails, setEmails] = useState<LocationEmails | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    location: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<"breeze" | "sil">(
    "breeze",
  );
  const [customEmail, setCustomEmail] = useState("");

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const data = await emailLocationService.getLocationEmails();
      setEmails(data);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emails) return;
    try {
      setTesting(true);
      setTestResult(null);

      const collectionEmail =
        customEmail ||
        emailLocationService.getLocationEmail(selectedLocation, emails);

      const result = await emailLocationService.testLocationEmail(
        selectedLocation,
        collectionEmail,
      );

      setTestResult({
        location: selectedLocation,
        success: result.success,
        message: result.success
          ? `Test email sent to ${collectionEmail} for ${selectedLocation} location`
          : `Failed to send test email: ${result.message}`,
      });
    } catch (error: any) {
      setTestResult({
        location: selectedLocation,
        success: false,
        message: error.message || "Failed to send test email",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!emails) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load email settings</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        📍 Location-Based Collection Emails
      </h2>

      <div className="space-y-4">
        <div
          className={`p-4 rounded-lg border ${selectedLocation === "breeze" ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Breeze Location
              </h3>
              <p className="text-gray-600 font-mono text-sm mt-1">
                {emails.breeze}
              </p>
            </div>
            <button
              onClick={() => setSelectedLocation("breeze")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedLocation === "breeze"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Select
            </button>
          </div>
        </div>

        <div
          className={`p-4 rounded-lg border ${selectedLocation === "sil" ? "bg-purple-50 border-purple-300" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Sil Location
              </h3>
              <p className="text-gray-600 font-mono text-sm mt-1">
                {emails.sil}
              </p>
            </div>
            <button
              onClick={() => setSelectedLocation("sil")}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedLocation === "sil"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Select
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <h3 className="font-semibold text-gray-700">Default Location</h3>
          <p className="text-gray-600 font-mono text-sm mt-1">
            {emails.default}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-4">📧 Test Email</h3>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) =>
                  setSelectedLocation(e.target.value as "breeze" | "sil")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="breeze">Breeze</option>
                <option value="sil">Sil</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Email (Optional)
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Leave empty to use default"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleTestEmail}
            disabled={testing}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {testing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending Test Email...
              </span>
            ) : (
              "Send Test Email"
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
          >
            <p
              className={testResult.success ? "text-green-700" : "text-red-700"}
            >
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">ℹ️ How It Works</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            💡 <strong>Breeze Location:</strong> Bills sent to users with
            location "Breeze" will be BCC'd to{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-blue-600">
              {emails.breeze}
            </code>
          </p>
          <p>
            💡 <strong>Sil Location:</strong> Bills sent to users with location
            "Sil" will be BCC'd to{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-purple-600">
              {emails.sil}
            </code>
          </p>
          <p>
            💡 <strong>Default:</strong> Bills with no location will use{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {emails.default}
            </code>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Location is determined from the user's building or application data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationEmailSettings;
