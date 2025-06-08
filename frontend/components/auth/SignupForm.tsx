'use client'

// Authentication System - Signup Form Component
// Phase 2: Core Email Authentication
// File: components/auth/SignupForm.tsx

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { GoogleOAuthButton } from './GoogleOAuthButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, CheckCircle } from 'lucide-react'

interface SignupFormProps {
  onSuccess?: () => void
  onSignInClick?: () => void
  className?: string
}

export function SignupForm({ onSuccess, onSignInClick, className }: SignupFormProps) {
  const { signUp, loading, error, clearError } = useAuth()
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Password validation
  const validatePassword = (password: string) => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('At least 8 characters')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('One number')
    }
    
    return errors
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name (at least 2 characters)'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else {
      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        errors.password = `Password must include: ${passwordErrors.join(', ')}`
      }
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    clearError()
    
    try {
      const response = await signUp({
        email,
        password,
        full_name: fullName.trim(),
        metadata: {
          signup_method: 'email',
        }
      })
      
      if (response.user && !response.error) {
        setShowSuccess(true)
        // Clear form
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setFullName('')
        
        // Call success callback after a delay
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      }
    } catch (err) {
      console.error('Signup failed:', err)
    }
  }

  // Show success message
  if (showSuccess) {
    return (
      <div className={`w-full max-w-md mx-auto space-y-6 ${className}`}>
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold tracking-tight">Check your email!</h1>
          <p className="text-muted-foreground">
            We've sent you a confirmation link at <strong>{email}</strong>. 
            Click the link to verify your account and complete your registration.
          </p>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Didn't receive the email? Check your spam folder.</p>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="text-primary hover:underline"
            >
              Use a different email address
            </button>
          </div>
        </div>
      </div>
    )
  }

  const passwordErrors = password ? validatePassword(password) : []

  return (
    <div className={`w-full max-w-md mx-auto space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground">
          Join LEARN-X to start your learning journey
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

      {/* Google Sign Up */}
      <GoogleOAuthButton
        mode="signup"
        disabled={loading}
        onError={(error) => {
          console.error('Google OAuth signup error:', error)
        }}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {formErrors.fullName && (
            <p className="text-sm text-destructive">{formErrors.fullName}</p>
          )}
        </div>

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

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {/* Password Requirements */}
          {password && (
            <div className="text-xs space-y-1">
              {passwordErrors.map((error, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">{error}</span>
                </div>
              ))}
              {passwordErrors.length === 0 && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">Password meets requirements</span>
                </div>
              )}
            </div>
          )}
          {formErrors.password && (
            <p className="text-sm text-destructive">{formErrors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {formErrors.confirmPassword && (
            <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create Account
        </Button>
      </form>

      {/* Terms and Privacy */}
      <div className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our{' '}
        <a href="/terms" className="underline hover:text-primary">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </a>
      </div>

      {/* Footer Links */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <button
          type="button"
          onClick={onSignInClick}
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}

export default SignupForm