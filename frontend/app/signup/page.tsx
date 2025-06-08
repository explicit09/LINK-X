'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AuthInput } from '@/components/auth/AuthInput'
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { GraduationCap, ArrowRight, CheckCircle, Mail, Users, Target, TrendingUp, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ValidationErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

interface SuccessCardProps {
  email: string
}

function SuccessCard({ email }: SuccessCardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-green-500/10">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit"
            >
              <CheckCircle className="h-8 w-8 text-green-600" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Check your email
            </CardTitle>
            <CardDescription className="text-gray-600">
              We've sent a confirmation link to<br />
              <span className="font-semibold text-gray-900">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Click the link in the email to complete your account setup.
                Check your spam folder if you don't see it.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/login">Back to login</Link>
                </Button>
                <Button asChild className="flex-1">
                  <a href={`mailto:${email.split('@')[1] === 'gmail.com' ? 'https://gmail.com' : `https://${email.split('@')[1]}`}`}>
                    Open Email
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  
  const { signUp, error, clearError, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])

  const validateForm = () => {
    const errors: ValidationErrors = {}
    
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    clearError()

    const { error } = await signUp(email, password)
    
    if (!error) {
      setSuccess(true)
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: 'email' | 'password' | 'confirmPassword', value: string) => {
    if (field === 'email') {
      setEmail(value)
      if (validationErrors.email) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, email: undefined }))
      }
    } else if (field === 'password') {
      setPassword(value)
      if (validationErrors.password) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, password: undefined }))
      }
      // Also clear confirm password error if passwords now match
      if (confirmPassword && value === confirmPassword && validationErrors.confirmPassword) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, confirmPassword: undefined }))
      }
    } else {
      setConfirmPassword(value)
      if (validationErrors.confirmPassword) {
        setValidationErrors((prev: ValidationErrors) => ({ ...prev, confirmPassword: undefined }))
      }
    }
    
    if (error) clearError()
  }

  if (success) {
    return <SuccessCard email={email} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 to-pink-600 p-12 text-white relative overflow-hidden">
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
                Start your learning journey today
              </h1>
              
              <p className="text-xl mb-8 text-purple-100 leading-relaxed">
                Join thousands of learners who are already building their skills with our innovative platform.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Target, text: 'Set personalized learning goals' },
                  { icon: TrendingUp, text: 'Track your progress in real-time' },
                  { icon: Users, text: 'Connect with a learning community' },
                  { icon: CheckCircle, text: 'Earn certificates and achievements' }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <feature.icon className="h-5 w-5 text-pink-300" />
                    <span className="text-purple-100">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="absolute bottom-20 right-32 w-24 h-24 bg-pink-300/20 rounded-full blur-lg" />
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="border-0 shadow-2xl shadow-purple-500/10">
              <CardHeader className="space-y-1 pb-8">
                <div className="flex justify-center mb-4 lg:hidden">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <GraduationCap className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Learn-X</span>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-gray-900">
                  Create your account
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  Join Learn-X to start your personalized learning journey
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
                
                <form onSubmit={handleSignup} className="space-y-5">
                  <AuthInput
                    id="signup-email"
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

                  <div className="space-y-3">
                    <AuthInput
                      id="signup-password"
                      label="Password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      error={validationErrors.password}
                      showToggle
                      disabled={loading}
                      required
                    />
                    
                    {password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        <PasswordStrengthIndicator password={password} />
                      </motion.div>
                    )}
                  </div>

                  <AuthInput
                    id="signup-confirm-password"
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    error={validationErrors.confirmPassword}
                    success={confirmPassword && password === confirmPassword && confirmPassword.length >= 8}
                    showToggle
                    disabled={loading}
                    required
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={loading || password !== confirmPassword}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Create Account
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
                  mode="register"
                  disabled={loading}
                />

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link 
                      href="/login" 
                      className="font-semibold text-purple-600 hover:text-purple-700 transition-colors duration-200 hover:underline"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="underline hover:text-gray-700">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-gray-700">
                    Privacy Policy
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