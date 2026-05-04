'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UseApiOptions {
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
  errorMessage?: string
}

export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (
      apiCall: () => Promise<T>,
      options: UseApiOptions = {}
    ): Promise<T | null> => {
      const {
        showSuccessToast = false,
        showErrorToast = true,
        successMessage = 'Operation completed successfully',
        errorMessage = 'Operation failed',
      } = options

      setLoading(true)
      setError(null)

      try {
        const result = await apiCall()
        setData(result)
        
        if (showSuccessToast) {
          toast.success(successMessage)
        }
        
        return result
      } catch (err: any) {
        const message = err.response?.data?.message || errorMessage
        setError(message)
        
        if (showErrorToast) {
          toast.error(message)
        }
        
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { data, loading, error, execute, setData }
}