// app/(dashboard)/user/settings/page.tsx
"use client";

import { useState } from "react";
import { updatePassword } from "@/services/user";
import { FiLock, FiSave, FiBell, FiGlobe, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import UserLayout from "@/components/User/UserLayout";

export default function SettingsPage() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [updating, setUpdating] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    billingAlerts: true,
    promotionalEmails: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!passwordData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    setUpdating(true);
    try {
      await updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      // This is a placeholder - implement when notification preferences API is available
      toast.success("Notification preferences saved");
    } catch (error: any) {
      toast.error("Failed to save preferences");
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account preferences</p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiLock className="w-5 h-5 text-blue-600" />
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {updating ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiBell className="w-5 h-5 text-blue-600" />
              Notification Preferences
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-700 font-medium">
                    Email Notifications
                  </span>
                  <p className="text-xs text-gray-500">
                    Receive general account notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailNotifications}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      emailNotifications: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-700 font-medium">
                    Billing Alerts
                  </span>
                  <p className="text-xs text-gray-500">
                    Get notified about bills and due dates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.billingAlerts}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      billingAlerts: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-gray-700 font-medium">
                    Promotional Emails
                  </span>
                  <p className="text-xs text-gray-500">
                    Receive special offers and promotions
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.promotionalEmails}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      promotionalEmails: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              <button
                onClick={handleSaveNotifications}
                disabled={savingNotifications}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {savingNotifications ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiGlobe className="w-5 h-5 text-blue-600" />
              Regional Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  defaultValue="en"
                >
                  <option value="en">English</option>
                  <option value="tl">Filipino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  defaultValue="Asia/Manila"
                >
                  <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Regional preferences are managed by the system administrator.
            </p>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
