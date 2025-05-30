/**
 * Interests Step Component
 */

import { StepHeader } from './StepHeader';
import { TagInput } from './TagInput';
import { TOPIC_SUGGESTIONS, INTEREST_SUGGESTIONS } from '../constants/form-options';
import type { StepComponentProps } from '../types/onboarding';

export function InterestsStep({ formData, updateField }: StepComponentProps) {
  return (
    <div className="space-y-6">
      <StepHeader step={4} />
      
      <div className="space-y-6">
        <TagInput
          type="topics"
          formData={formData}
          updateField={updateField}
          suggestions={TOPIC_SUGGESTIONS}
          placeholder="Add a topic (max 5)"
          maxTags={5}
          label="Learning Topics *"
          colorScheme="blue"
        />

        <TagInput
          type="interests"
          formData={formData}
          updateField={updateField}
          suggestions={INTEREST_SUGGESTIONS}
          placeholder="Add a hobby (max 5)"
          maxTags={5}
          label="Hobbies & Interests"
          colorScheme="green"
        />
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-orange-900 mb-2">🎯 Why we collect this</h4>
        <p className="text-sm text-orange-800">
          Your topics and interests help us create personalized examples, analogies, and learning paths 
          that connect new concepts to things you already know and care about.
        </p>
      </div>

      {formData.topics.length === 0 && (
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> Add at least one learning topic to get started with personalized content!
          </p>
        </div>
      )}
    </div>
  );
}