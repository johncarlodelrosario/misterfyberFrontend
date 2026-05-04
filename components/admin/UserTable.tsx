'use client'

import { useState } from 'react'
import { FiEye, FiEdit2, FiCheckCircle, FiXCircle, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface User {
  _id: string
  username: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: string
  status: string
  planId?: { name: string; price: number }
  createdAt: string
}

interface UserTableProps {
  users: User[]
  loading: boolean
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  onView: (user: User) => void
  onEdit: (user: User) => void
  onApprove: (id: string) => void
  onSuspend: (id: string) => void
  onDelete: (id: string) => void
}

export default function UserTable({
  users,
  loading,
  totalPages,
  currentPage,
  onPageChange,
  onView,
  onEdit,
  onApprove,
  onSuspend,
  onDelete
}: UserTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
  }

  if (users.length === 0) {
    return <div className="text-center py-8 text-gray-500">No users found</div>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold text-sm">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNumber || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.planId?.name || 'No Plan'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button onClick={() => onView(user)} className="text-blue-600 hover:text-blue-800" title="View">
                      <FiEye />
                    </button>
                    <button onClick={() => onEdit(user)} className="text-gray-600 hover:text-gray-800" title="Edit">
                      <FiEdit2 />
                    </button>
                    {user.status === 'pending' && (
                      <button onClick={() => onApprove(user._id)} className="text-green-600 hover:text-green-800" title="Approve">
                        <FiCheckCircle />
                      </button>
                    )}
                    {user.status === 'active' && (
                      <button onClick={() => onSuspend(user._id)} className="text-yellow-600 hover:text-yellow-800" title="Suspend">
                        <FiXCircle />
                      </button>
                    )}
                    <button onClick={() => onDelete(user._id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </>
  )
}