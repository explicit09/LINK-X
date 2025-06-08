'use client'

// Authentication System - Login Form Component
// Phase 2: Core Email Authentication
// File: components/auth/LoginForm.tsx

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Chrome } from 'lucide-react'

interface LoginFormProps {
  onSuccess?: () => void
  onSignUpClick?: () => void
  className?: string
}

export function LoginForm({ onSuccess, onSignUpClick, className }: LoginFormProps) {
  const { signIn, signInWithGoogle, signInWithMagicLink, loading, error, clearError } = useAuth()
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [useEmailLink, setUseEmailLink] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!useEmailLink && !password) {
      errors.password = 'Password is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle email/password sign in
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    clearError()
    
    try {
      if (useEmailLink) {
        // Send magic link
        await signInWithMagicLink(email)
        alert('Magic link sent! Check your email to complete sign in.')
      } else {
        // Regular email/password sign in
        const response = await signIn({ email, password })
        
        if (response.user && !response.error) {
          onSuccess?.()
        }
      }
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    clearError()
    
    try {
      await signInWithGoogle()
      // OAuth redirects, so success will be handled on callback
    } catch (err) {
      console.error('Google sign in failed:', err)
    }
  }

  return (
    <div className={`w-full max-w-md mx-auto space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Google Sign In */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="mr-2 h-4 w-4" />
        )}
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {formErrors.email && (
            <p className="text-sm text-destructive">{formErrors.email}</p>
          )}
        </div>

        {/* Password Field (only if not using magic link) */}
        {!useEmailLink && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            {formErrors.password && (
              <p className="text-sm text-destructive">{formErrors.password}</p>
            )}
          </div>
        )}

        {/* Magic Link Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="magic-link"
            checked={useEmailLink}
            onChange={(e) => setUseEmailLink(e.target.checked)}
            className="rounded border-gray-300"
            disabled={loading}
          />
          <Label htmlFor="magic-link" className="text-sm">
            Send me a magic link instead
          </Label>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {useEmailLink ? 'Send Magic Link' : 'Sign In'}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="text-center text-sm space-y-2">
        <div>
          <span className="text-muted-foreground">Don't have an account? </span>
          <button
            type="button"
            onClick={onSignUpClick}
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </button>
        </div>
        
        <div>
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => {
              // TODO: Implement forgot password
              alert('Forgot password functionality coming soon!')
            }}
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginForm