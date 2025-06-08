'use client'

import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

interface PasswordCriteria {
  label: string
  test: (password: string) => boolean
}

const criteria: PasswordCriteria[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /\d/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) }
]

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    const passedTests = criteria.filter(criterion => criterion.test(password)).length
    setStrength(passedTests)
  }, [password])

  if (!password) return null

  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500'
    if (strength === 3) return 'bg-yellow-500'
    if (strength === 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (strength <= 2) return 'Weak'
    if (strength === 3) return 'Fair'
    if (strength === 4) return 'Good'
    return 'Strong'
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength <= 2 ? 'text-red-600' : 
            strength === 3 ? 'text-yellow-600' : 
            strength === 4 ? 'text-blue-600' : 'text-green-600'
          )}>
            {getStrengthText()}
          </span>
        </div>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                'h-2 w-full rounded-full transition-colors duration-300',
                level <= strength ? getStrengthColor() : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-1">
        {criteria.map((criterion, index) => {
          const passed = criterion.test(password)
          return (
            <div key={index} className="flex items-center space-x-2 text-sm">
              {passed ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
              <span className={cn(
                'transition-colors',
                passed ? 'text-green-700' : 'text-gray-500'
              )}>
                {criterion.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}