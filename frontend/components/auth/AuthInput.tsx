'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
  showToggle?: boolean
  description?: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, success, showToggle, description, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    return (
      <div className="space-y-2">
        <Label 
          htmlFor={props.id} 
          className={cn(
            'text-sm font-medium transition-colors',
            error ? 'text-red-600' : success ? 'text-green-600' : 'text-gray-700'
          )}
        >
          {label}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            type={inputType}
            className={cn(
              'pr-10 transition-all duration-200',
              'border-2 focus:border-2',
              error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                : success
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : isFocused
                ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-200',
              className
            )}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
          
          {/* Status Icon */}
          <div className="absolute inset-y-0 right-3 flex items-center">
            {isPassword && showToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        </div>

        {/* Helper Text */}
        {(error || description) && (
          <div className="text-sm">
            {error ? (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </span>
            ) : description ? (
              <span className="text-gray-500">{description}</span>
            ) : null}
          </div>
        )}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'