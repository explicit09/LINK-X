'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, User, Target } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function OnboardingPage() {
  const { user, completeOnboarding } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: user?.profile?.full_name || '',
    interests: '',
    goals: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Complete onboarding with minimal data
      await completeOnboarding({
        profile: {
          interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean),
          learning_goals: formData.goals.split(',').map(g => g.trim()).filter(Boolean)
        }
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">EduPlatform</span>
            </div>
            <div className="text-sm text-gray-600">
              Welcome, {formData.name || user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome to EduPlatform!
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                Let's quickly set up your learning profile
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    How should we call you?
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12"
                  />
                </div>

                {/* Interests */}
                <div className="space-y-2">
                  <Label htmlFor="interests" className="text-sm font-medium">
                    What are you interested in learning?
                  </Label>
                  <Input
                    id="interests"
                    type="text"
                    placeholder="e.g., JavaScript, React, Design (separate with commas)"
                    value={formData.interests}
                    onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    Separate multiple interests with commas
                  </p>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <Label htmlFor="goals" className="text-sm font-medium">
                    What are your learning goals?
                  </Label>
                  <Input
                    id="goals"
                    type="text"
                    placeholder="e.g., Build a website, Get a job, Personal growth"
                    value={formData.goals}
                    onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    What do you hope to achieve?
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Setting up your account...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </form>

              {/* Skip Option */}
              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await completeOnboarding({})
                      router.push('/dashboard')
                    } catch (error) {
                      console.error('Skip onboarding failed:', error)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip for now →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 
