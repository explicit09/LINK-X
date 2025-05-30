/**
 * Personal Information Step Component
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepHeader } from './StepHeader';
import type { StepComponentProps } from '../types/onboarding';

export function PersonalInfoStep({ formData, updateField, onNext }: StepComponentProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader step={1} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">First Name *</Label>
          <Input
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Last Name *</Label>
          <Input
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-500 text-center mt-4">
        💡 Tip: Hit "Enter" or "Tab" to move quickly between fields
      </p>
    </div>
  );
}