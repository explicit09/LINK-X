'use client'

// Authentication System - Google OAuth Button Component
// Phase 3: Social OAuth Integration
// File: components/auth/GoogleOAuthButton.tsx

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Chrome, AlertCircle } from 'lucide-react'

interface GoogleOAuthButtonProps {
  mode?: 'signin' | 'signup' | 'link'
  className?: string
  disabled?: boolean
  onError?: (error: string) => void
  onSuccess?: () => void
}

export function GoogleOAuthButton({ 
  mode = 'signin', 
  className,
  disabled,
  onError,
  onSuccess 
}: GoogleOAuthButtonProps) {
  const { signInWithGoogle, loading: globalLoading, error: globalError, clearError } = useAuth()
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const loading = globalLoading || localLoading
  const error = localError || globalError?.message

  const handleGoogleOAuth = async () => {
    try {
      setLocalLoading(true)
      setLocalError(null)
      clearError()

      const response = await signInWithGoogle()
      
      if (response.error) {
        const errorMessage = response.error.message || 'Google authentication failed'
        setLocalError(errorMessage)
        onError?.(errorMessage)
      } else {
        onSuccess?.()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setLocalError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLocalLoading(false)
    }
  }

  const getButtonText = () => {
    switch (mode) {
      case 'signin':
        return 'Continue with Google'
      case 'signup':
        return 'Sign up with Google'
      case 'link':
        return 'Link Google Account'
      default:
        return 'Continue with Google'
    }
  }

  const getIcon = () => {
    if (loading) {
      return <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    }
    return <Chrome className="mr-2 h-4 w-4" />
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className={`w-full ${className}`}
        onClick={handleGoogleOAuth}
        disabled={loading || disabled}
        type="button"
      >
        {getIcon()}
        {getButtonText()}
      </Button>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default GoogleOAuthButton