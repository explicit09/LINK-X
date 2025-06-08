'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AuthInput } from '@/components/auth/AuthInput'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { GraduationCap, ArrowRight, CheckCircle, Mail, Lock, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ValidationErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  
  const { signIn, error, clearError, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo || '/dashboard')
    }
  }, [isAuthenticated, router, redirectTo])

  const validateForm = () => {
    const errors: ValidationErrors = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    clearError()

    const { error } = await signIn(email, password)
    
    if (!error) {
      router.replace(redirectTo || '/dashboard')
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value)
      if (validationErrors.email) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, email: undefined }))
      }
    } else {
      setPassword(value)
      if (validationErrors.password) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, password: undefined }))
      }
    }
    
    if (error) clearError()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col justify-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <span className="text-2xl font-bold">Learn-X</span>
              </div>
              
              <h1 className="text-4xl font-bold mb-6 leading-tight">
                Welcome back to your learning journey
              </h1>
              
              <p className="text-xl mb-8 text-blue-100 leading-relaxed">
                Continue building your skills with our personalized learning platform designed for modern learners.
              </p>
              
              <div className="space-y-4">
                {[
                  'Personalized learning paths',
                  'Progress tracking & analytics',
                  'Interactive content & exercises',
                  'Community-driven learning'
                ].map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span className="text-blue-100">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-20 right-32 w-24 h-24 bg-cyan-300/20 rounded-full blur-lg" />
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="border-0 shadow-2xl shadow-blue-500/10">
              <CardHeader className="space-y-1 pb-8">
                <div className="flex justify-center mb-4 lg:hidden">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GraduationCap className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Learn-X</span>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-gray-900">
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Enter your credentials to access your dashboard
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">
                        {error.message}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <AuthInput
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={validationErrors.email}
                    success={email && !validationErrors.email && email.includes('@')}
                    disabled={loading}
                    required
                  />

                  <AuthInput
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={validationErrors.password}
                    success={password.length >= 6 && !validationErrors.password}
                    showToggle
                    disabled={loading}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Sign In
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </div>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <Separator className="my-6" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500 font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>

                <GoogleAuthButton
                  mode="login"
                  disabled={loading}
                />

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link 
                      href="/signup" 
                      className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 hover:underline"
                    >
                      Create one now
                    </Link>
                  </p>
                </div>

                <div className="text-center">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}