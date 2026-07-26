export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const PAYMENT_METHODS = {
  PAYMONGO: "paymongo",
  GCASH: "gcash",
  MAYA: "maya",
  BANK_TRANSFER: "bank_transfer",
} as const;

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
  STAFF: "staff",
} as const;

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  PENDING: "pending",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const BILLING_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;
