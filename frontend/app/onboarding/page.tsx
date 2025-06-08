'use client';

/**
 * Refactored Onboarding Page - Modular and maintainable
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { BookOpen, User, Settings, Target, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRequireAuthOnly } from '@/hooks/useAuthGuard'
import { ONBOARDING_STEPS, USER_JOURNEY_ROUTES, OnboardingCompletionData, OnboardingStep } from '@/lib/auth/types'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OnboardingPage() {
  // Protect this route (auth required, but onboarding not required)
  const { canAccess, shouldShowLogin } = useRequireAuthOnly()
  
  const { user, onboardingStep, updateOnboardingStep, completeOnboarding, needsOnboarding } = useAuth()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(ONBOARDING_STEPS.WELCOME)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data for each step
  const [formData, setFormData] = useState<OnboardingCompletionData>({
    profile: {
      bio: '',
      interests: [],
      learning_goals: []
    },
    preferences: {
      theme: 'light',
      notifications: true,
      language: 'en'
    },
    settings: {
      email_notifications: true,
      marketing_emails: false,
      weekly_digest: true
    }
  })

  // Initialize current step from user's onboarding progress
  useEffect(() => {
    if (user && onboardingStep > 0 && onboardingStep < ONBOARDING_STEPS.COMPLETE) {
      setCurrentStep(onboardingStep)
    }
  }, [user, onboardingStep])

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (!needsOnboarding) {
      router.push(USER_JOURNEY_ROUTES.DASHBOARD)
    }
  }, [needsOnboarding, router])

  // Don't render if not authenticated
  if (shouldShowLogin) {
    return null
  }

  const handleNext = async () => {
    try {
      setLoading(true)
      setError(null)

      // Save current step data
      await updateOnboardingStep(currentStep, {
        step: currentStep,
        data: formData,
        completed: true
      })

      // Move to next step or complete onboarding
      if (currentStep === ONBOARDING_STEPS.LEARNING_GOALS) {
        // Complete onboarding
        await completeOnboarding(formData)
        router.push(USER_JOURNEY_ROUTES.DASHBOARD)
      } else {
        const nextStep = getNextStep(currentStep)
        setCurrentStep(nextStep)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const prevStep = getPrevStep(currentStep)
    if (prevStep) {
      setCurrentStep(prevStep)
    }
  }

  const getNextStep = (step: OnboardingStep): OnboardingStep => {
    switch (step) {
      case ONBOARDING_STEPS.WELCOME: return ONBOARDING_STEPS.PROFILE_SETUP
      case ONBOARDING_STEPS.PROFILE_SETUP: return ONBOARDING_STEPS.PREFERENCES
      case ONBOARDING_STEPS.PREFERENCES: return ONBOARDING_STEPS.LEARNING_GOALS
      default: return step
    }
  }

  const getPrevStep = (step: OnboardingStep): OnboardingStep | null => {
    switch (step) {
      case ONBOARDING_STEPS.PROFILE_SETUP: return ONBOARDING_STEPS.WELCOME
      case ONBOARDING_STEPS.PREFERENCES: return ONBOARDING_STEPS.PROFILE_SETUP
      case ONBOARDING_STEPS.LEARNING_GOALS: return ONBOARDING_STEPS.PREFERENCES
      default: return null
    }
  }

  const getStepProgress = (): number => {
    const steps: OnboardingStep[] = [
      ONBOARDING_STEPS.WELCOME,
      ONBOARDING_STEPS.PROFILE_SETUP,
      ONBOARDING_STEPS.PREFERENCES,
      ONBOARDING_STEPS.LEARNING_GOALS
    ]
    const currentIndex = steps.indexOf(currentStep)
    return ((currentIndex + 1) / steps.length) * 100
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return true
      case ONBOARDING_STEPS.PROFILE_SETUP:
        return !!formData.profile?.bio && (formData.profile?.interests?.length || 0) > 0
      case ONBOARDING_STEPS.PREFERENCES:
        return !!formData.preferences?.theme && !!formData.preferences?.language
      case ONBOARDING_STEPS.LEARNING_GOALS:
        return (formData.profile?.learning_goals?.length || 0) > 0
      default:
        return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to EduPlatform!
              </h2>
              <p className="text-gray-600">
                Let's set up your account to personalize your learning experience. 
                This will only take a few minutes.
              </p>
            </div>
          </div>
        )

      case ONBOARDING_STEPS.PROFILE_SETUP:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
              <p className="text-gray-600">Help us understand your background and interests</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Brief bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself, your background, or what you're hoping to learn..."
                  value={formData.profile?.bio || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, bio: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>What are your interests? (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Technology', 'Science', 'Arts', 'Business', 'Languages', 'Math', 'History', 'Health'].map((interest) => (
                    <div key={interest} className="flex items-center space-x-2">
                      <Checkbox
                        id={interest}
                        checked={formData.profile?.interests?.includes(interest) || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              profile: {
                                ...prev.profile,
                                interests: [...(prev.profile?.interests || []), interest]
                              }
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              profile: {
                                ...prev.profile,
                                interests: prev.profile?.interests?.filter(i => i !== interest) || []
                              }
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={interest} className="text-sm">{interest}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case ONBOARDING_STEPS.PREFERENCES:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Set your preferences</h2>
              <p className="text-gray-600">Customize your learning environment</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Theme preference</Label>
                <RadioGroup
                  value={formData.preferences?.theme}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, theme: value }
                  }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light">Light theme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark">Dark theme</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium">Language</Label>
                <RadioGroup
                  value={formData.preferences?.language}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, language: value }
                  }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="en" />
                    <Label htmlFor="en">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="es" id="es" />
                    <Label htmlFor="es">Spanish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fr" id="fr" />
                    <Label htmlFor="fr">French</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Notification preferences</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email_notifications"
                      checked={formData.settings?.email_notifications || false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, email_notifications: !!checked }
                      }))}
                    />
                    <Label htmlFor="email_notifications" className="text-sm">Email notifications for course updates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekly_digest"
                      checked={formData.settings?.weekly_digest || false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, weekly_digest: !!checked }
                      }))}
                    />
                    <Label htmlFor="weekly_digest" className="text-sm">Weekly progress digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marketing_emails"
                      checked={formData.settings?.marketing_emails || false}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, marketing_emails: !!checked }
                      }))}
                    />
                    <Label htmlFor="marketing_emails" className="text-sm">Marketing emails and promotions</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case ONBOARDING_STEPS.LEARNING_GOALS:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">What are your learning goals?</h2>
              <p className="text-gray-600">Help us recommend the best content for you</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Select your primary learning goals (choose at least one)</Label>
                <div className="space-y-2 mt-2">
                  {[
                    'Learn new skills for career advancement',
                    'Prepare for certification exams',
                    'Personal enrichment and hobby learning',
                    'Academic study support',
                    'Professional development',
                    'Start a new career path'
                  ].map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={formData.profile?.learning_goals?.includes(goal) || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              profile: {
                                ...prev.profile,
                                learning_goals: [...(prev.profile?.learning_goals || []), goal]
                              }
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              profile: {
                                ...prev.profile,
                                learning_goals: prev.profile?.learning_goals?.filter(g => g !== goal) || []
                              }
                            }))
                          }
                        }}
                      />
                      <Label htmlFor={goal} className="text-sm">{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
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
              Welcome, {user?.profile?.full_name || user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Setup Progress</span>
            <span className="text-sm text-gray-600">{Math.round(getStepProgress())}% Complete</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {renderStep()}

              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <div>
                  {getPrevStep(currentStep) && (
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                
                <Button
                  onClick={handleNext}
                  disabled={loading || !canProceed()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    'Saving...'
                  ) : currentStep === ONBOARDING_STEPS.LEARNING_GOALS ? (
                    <>
                      Complete Setup
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
