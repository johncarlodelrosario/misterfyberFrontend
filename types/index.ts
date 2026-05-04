export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: 'user' | 'admin' | 'staff'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  profilePicture?: string
  address?: {
    street: string
    city: string
    province: string
    zipCode: string
  }
  createdAt: string
  updatedAt: string
}

export interface Plan {
  _id: string
  name: string
  description: string
  price: number
  speed: {
    download: number
    upload: number
  }
  features: string[]
  duration: number
  isActive: boolean
}

export interface Payment {
  _id: string
  userId: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  referenceNumber?: string
  transactionId?: string
  createdAt: string
}

export interface Billing {
  _id: string
  userId: string
  invoiceNumber: string
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  createdAt: string
}

export interface Application {
  _id: string
  applicationId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: 'pending' | 'approved' | 'rejected'
  planId: Plan
  createdAt: string
}