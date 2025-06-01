/**
 * Learning Style Step Component
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
import { LEARNING_STYLES, DEPTH_OPTIONS } from '../constants/form-options';
import type { StepComponentProps } from '../types/onboarding';

export function LearningStyleStep({
  formData,
  updateField,
}: StepComponentProps) {
  return (
    <div className="space-y-6">
      <StepHeader step={2} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Learning Style *
          </Label>
          <Select
            onValueChange={(value: string) =>
              updateField('learningStyle', value)
            }
          >
            <SelectTrigger className="h-12 bg-white border-gray-200">
              <SelectValue placeholder="Choose your style" />
            </SelectTrigger>
            <SelectContent>
              {LEARNING_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex items-center space-x-2">
                    <span>{style.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.learningStyle && (
            <p className="text-xs text-gray-500">
              {
                LEARNING_STYLES.find((s) => s.value === formData.learningStyle)
                  ?.description
              }
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Explanation Depth *
          </Label>
          <Select
            onValueChange={(value: string) => updateField('depth', value)}
          >
            <SelectTrigger className="h-12 bg-white border-gray-200">
              <SelectValue placeholder="Choose depth" />
            </SelectTrigger>
            <SelectContent>
              {DEPTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.depth && (
            <p className="text-xs text-gray-500">
              {DEPTH_OPTIONS.find((d) => d.value === formData.depth)?.label}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Why this matters:</strong> We'll customize content delivery to
          match how you learn best, making your learning experience more
          effective and enjoyable.
        </p>
      </div>
    </div>
  );
}
