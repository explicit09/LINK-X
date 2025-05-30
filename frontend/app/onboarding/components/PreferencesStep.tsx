/**
 * Learning Preferences Step Component
 */

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { StepHeader } from './StepHeader';
import { SCHEDULE_OPTIONS, TONE_OPTIONS } from '../constants/form-options';
import type { StepComponentProps } from '../types/onboarding';

export function PreferencesStep({ formData, updateField }: StepComponentProps) {
  return (
    <div className="space-y-6">
      <StepHeader step={3} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Learning Schedule *</Label>
          <Select onValueChange={(value: string) => updateField('schedule', value)}>
            <SelectTrigger className="h-12 bg-white border-gray-200">
              <SelectValue placeholder="Choose schedule" />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Communication Tone *</Label>
          <Select onValueChange={(value: string) => updateField('tone', value)}>
            <SelectTrigger className="h-12 bg-white border-gray-200">
              <SelectValue placeholder="Choose tone" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-purple-900 mb-2">Personalization Preview</h4>
        <div className="space-y-2 text-sm text-purple-800">
          {formData.schedule && (
            <p>• <strong>Schedule:</strong> {SCHEDULE_OPTIONS.find(s => s.value === formData.schedule)?.label}</p>
          )}
          {formData.tone && (
            <p>• <strong>Tone:</strong> {TONE_OPTIONS.find(t => t.value === formData.tone)?.label}</p>
          )}
        </div>
      </div>
    </div>
  );
}