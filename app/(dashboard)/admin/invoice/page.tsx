// isp-frontend/app/(dashboard)/admin/invoice/page.tsx

"use client";

import React from "react";
import InvoiceManagement from "@/components/admin/InvoiceManagement";

export default function InvoicePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage and track all customer invoices
        </p>
      </div>
      <InvoiceManagement />
    </div>
  );
}
