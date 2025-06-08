'use client'

// Authentication System - Demo Page
// Phase 2: Core Email Authentication
// File: app/(auth)/demo/page.tsx

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogOut, User, Shield, Users } from 'lucide-react'

export default function AuthDemoPage() {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    userRole, 
    signOut,
    hasPermission,
    hasRole 
  } = useAuth()
  
  const [activeTab, setActiveTab] = useState('login')

  // If user is authenticated, show dashboard
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Auth System Demo - Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to the authenticated area!
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Email:</label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">User ID:</label>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role:</label>
                  <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email Confirmed:</label>
                  <p className="text-sm text-muted-foreground">
                    {user.email_confirmed_at ? 'Yes' : 'No'}
                  </p>
                </div>
                {user.profile?.full_name && (
                  <div>
                    <label className="text-sm font-medium">Full Name:</label>
                    <p className="text-sm text-muted-foreground">{user.profile.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Permissions & Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Role Checks:</label>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Is Student:</span>
                      <span className={hasRole('student') ? 'text-green-600' : 'text-gray-400'}>
                        {hasRole('student') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Is Instructor:</span>
                      <span className={hasRole('instructor') ? 'text-green-600' : 'text-gray-400'}>
                        {hasRole('instructor') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Is Admin:</span>
                      <span className={hasRole('admin') ? 'text-green-600' : 'text-gray-400'}>
                        {hasRole('admin') ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Permission Checks:</label>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Read Profile:</span>
                      <span className={hasPermission('profile:read') ? 'text-green-600' : 'text-gray-400'}>
                        {hasPermission('profile:read') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Manage Users:</span>
                      <span className={hasPermission('users:manage') ? 'text-green-600' : 'text-gray-400'}>
                        {hasPermission('users:manage') ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin Access:</span>
                      <span className={hasPermission('admin:access') ? 'text-green-600' : 'text-gray-400'}>
                        {hasPermission('admin:access') ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Available Actions</CardTitle>
                <CardDescription>
                  Test different auth system features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => alert('Profile update functionality coming in Phase 2!')}
                  >
                    Update Profile
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => alert('Password change functionality coming in Phase 2!')}
                  >
                    Change Password
                  </Button>
                  
                  {hasPermission('admin:access') && (
                    <Button 
                      variant="outline"
                      onClick={() => alert('Admin panel functionality coming in Phase 5!')}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Button>
                  )}
                  
                  <Button 
                    variant="destructive"
                    onClick={signOut}
                    className="ml-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication state...</p>
        </div>
      </div>
    )
  }

  // Show auth forms
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Auth System Demo</h1>
          <p className="text-muted-foreground">
            Test the new unified Supabase authentication system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in or create a new account to test the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <LoginForm
                  onSuccess={() => {
                    console.log('Login successful!')
                  }}
                  onSignUpClick={() => setActiveTab('signup')}
                />
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <SignupForm
                  onSuccess={() => {
                    console.log('Signup successful!')
                  }}
                  onSignInClick={() => setActiveTab('login')}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Feature Info */}
        <div className="mt-8 text-center">
          <h2 className="text-lg font-semibold mb-4">Demo Features</h2>
          <div className="grid gap-4 text-sm">
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-2">✅ Implemented (Phase 2)</h3>
                <ul className="text-left space-y-1 text-muted-foreground">
                  <li>• Email/password authentication</li>
                  <li>• Google OAuth sign-in</li>
                  <li>• Magic link passwordless login</li>
                  <li>• User registration with email confirmation</li>
                  <li>• Session management & persistence</li>
                  <li>• Role-based access control</li>
                  <li>• Permission checking</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-2">🚧 Coming Soon</h3>
                <ul className="text-left space-y-1 text-muted-foreground">
                  <li>• Profile management (Phase 2)</li>
                  <li>• Password reset flow (Phase 2)</li>
                  <li>• Multi-factor authentication (Phase 6)</li>
                  <li>• Admin user management (Phase 5)</li>
                  <li>• Audit logging dashboard (Phase 6)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}