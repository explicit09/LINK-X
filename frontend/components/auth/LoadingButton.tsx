'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (props, ref) => {
    const { loading, loadingText, children, disabled, className, ...buttonProps } = props
    
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative transition-all duration-200',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          loading && 'text-transparent',
          className
        )}
        {...buttonProps}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm font-medium">
              {loadingText || 'Loading...'}
            </span>
          </div>
        )}
        
        {/* Button Content */}
        <span className={cn(loading && 'invisible')}>
          {children}
        </span>
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'