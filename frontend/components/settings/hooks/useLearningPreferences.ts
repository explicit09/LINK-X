import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface OnboardingFormData {
  firstName: string;
  lastName: string;
  learningStyle: string;
  learningDepth: string;
  schedule: string;
  tone: string;
  topics: string[];
  interests: string[];
  quizFrequency: string;
  enableQuizzes: boolean;
}

export function useLearningPreferences() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: '',
    lastName: '',
    learningStyle: 'visual',
    learningDepth: 'moderate',
    schedule: 'flexible',
    tone: 'friendly',
    topics: [],
    interests: [],
    quizFrequency: 'after_section',
    enableQuizzes: true,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topicSuggestions] = useState([
    'JavaScript',
    'Python',
    'React',
    'Machine Learning',
    'Data Science',
    'Web Development',
    'Mobile Development',
    'DevOps',
    'Cybersecurity',
    'Artificial Intelligence',
    'Database Design',
    'Cloud Computing',
  ]);

  const [interestSuggestions] = useState([
    'Technology',
    'Business',
    'Science',
    'Arts',
    'Health',
    'Education',
    'Finance',
    'Marketing',
    'Design',
    'Music',
    'Sports',
    'Travel',
  ]);

  const updateFormField = (field: keyof OnboardingFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = (field: 'topics' | 'interests', tag: string) => {
    if (!tag.trim()) return false;

    const currentTags = formData[field];
    const maxTags = field === 'topics' ? 10 : 8;

    if (currentTags.length >= maxTags) {
      toast.error(`Maximum ${maxTags} ${field} allowed`);
      return false;
    }

    if (currentTags.includes(tag.trim())) {
      toast.error(`${tag} is already added`);
      return false;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], tag.trim()],
    }));

    return true;
  };

  const removeTag = (field: 'topics' | 'interests', tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((tag) => tag !== tagToRemove),
    }));
  };

  const getSuggestions = (
    field: 'topics' | 'interests',
    query: string = '',
  ) => {
    const suggestions =
      field === 'topics' ? topicSuggestions : interestSuggestions;
    const currentTags = formData[field];

    return suggestions
      .filter(
        (suggestion) =>
          !currentTags.includes(suggestion) &&
          suggestion.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 5);
  };

  const loadUserPreferences = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/student/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          learningStyle: data.learningStyle || 'visual',
          learningDepth: data.learningDepth || 'moderate',
          schedule: data.schedule || 'flexible',
          tone: data.tone || 'friendly',
          topics: data.topics || [],
          interests: data.interests || [],
          quizFrequency: data.quizFrequency || 'after_section',
          enableQuizzes: data.enableQuizzes !== false,
        }));
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (): Promise<boolean> => {
    try {
      setSaving(true);

      // Validate required fields
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error('First name and last name are required');
        return false;
      }

      const response = await fetch('/api/student/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Learning preferences saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({
      firstName: formData.firstName, // Keep name fields
      lastName: formData.lastName,
      learningStyle: 'visual',
      learningDepth: 'moderate',
      schedule: 'flexible',
      tone: 'friendly',
      topics: [],
      interests: [],
      quizFrequency: 'after_section',
      enableQuizzes: true,
    });
    toast.info('Preferences reset to defaults');
  };

  // Load preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  return {
    formData,
    saving,
    loading,
    topicSuggestions,
    interestSuggestions,
    updateFormField,
    addTag,
    removeTag,
    getSuggestions,
    savePreferences,
    resetToDefaults,
    loadUserPreferences,
  };
}
