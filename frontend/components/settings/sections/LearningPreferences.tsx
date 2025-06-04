import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  User,
  BookOpen,
  Clock,
  MessageCircle,
  Hash,
  Heart,
  Save,
  RotateCcw,
} from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { TagInput } from '../ui/TagInput';
import { SettingToggle } from '../ui/SettingToggle';
import { useLearningPreferences } from '../hooks/useLearningPreferences';

export function LearningPreferences() {
  const {
    formData,
    saving,
    loading,
    updateFormField,
    addTag,
    removeTag,
    getSuggestions,
    savePreferences,
    resetToDefaults,
  } = useLearningPreferences();

  const handleSave = async () => {
    await savePreferences();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <SettingCard key={i} title="Loading..." description="Please wait...">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </SettingCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <SettingCard
        title="Personal Information"
        description="Basic information for personalized learning experience"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>First Name</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => updateFormField('firstName', e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Last Name</span>
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => updateFormField('lastName', e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>
      </SettingCard>

      {/* Learning Style */}
      <SettingCard
        title="Learning Preferences"
        description="Customize how you prefer to learn and receive content"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Learning Style</span>
            </Label>
            <Select
              value={formData.learningStyle}
              onValueChange={(value) => updateFormField('learningStyle', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="auditory">Auditory</SelectItem>
                <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                <SelectItem value="reading">Reading/Writing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Learning Depth</span>
            </Label>
            <Select
              value={formData.learningDepth}
              onValueChange={(value) => updateFormField('learningDepth', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="deep">Deep Dive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Schedule</span>
            </Label>
            <Select
              value={formData.schedule}
              onValueChange={(value) => updateFormField('schedule', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingCard>

      {/* Communication Style */}
      <SettingCard
        title="Communication Style"
        description="Choose how the AI should communicate with you"
      >
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>Tone</span>
          </Label>
          <Select
            value={formData.tone}
            onValueChange={(value) => updateFormField('tone', value)}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="encouraging">Encouraging</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingCard>

      {/* Topics */}
      <SettingCard
        title="Learning Topics"
        description="Add topics you're interested in learning about"
      >
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Hash className="h-4 w-4" />
            <span>Topics</span>
          </Label>
          <TagInput
            tags={formData.topics}
            suggestions={getSuggestions('topics')}
            onAddTag={(tag) => addTag('topics', tag)}
            onRemoveTag={(tag) => removeTag('topics', tag)}
            placeholder="Add learning topics..."
            maxTags={10}
          />
        </div>
      </SettingCard>

      {/* Interests */}
      <SettingCard
        title="Personal Interests"
        description="Add your personal interests to make learning more engaging"
      >
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span>Interests</span>
          </Label>
          <TagInput
            tags={formData.interests}
            suggestions={getSuggestions('interests')}
            onAddTag={(tag) => addTag('interests', tag)}
            onRemoveTag={(tag) => removeTag('interests', tag)}
            placeholder="Add personal interests..."
            maxTags={8}
          />
        </div>
      </SettingCard>

      {/* Quiz Preferences */}
      <SettingCard
        title="Quiz Preferences"
        description="Configure how and when you receive quizzes"
      >
        <div className="space-y-4">
          <SettingToggle
            id="enableQuizzes"
            label="Enable Quizzes"
            description="Allow the system to generate quizzes to test your understanding"
            checked={formData.enableQuizzes}
            onCheckedChange={(checked) =>
              updateFormField('enableQuizzes', checked)
            }
          />

          {formData.enableQuizzes && (
            <div className="space-y-2">
              <Label>Quiz Frequency</Label>
              <Select
                value={formData.quizFrequency}
                onValueChange={(value) =>
                  updateFormField('quizFrequency', value)
                }
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_section">
                    After Each Section
                  </SelectItem>
                  <SelectItem value="after_module">
                    After Each Module
                  </SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SettingCard>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 sm:flex-none"
        >
          {saving ? (
            <>
              <Save className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
        <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
