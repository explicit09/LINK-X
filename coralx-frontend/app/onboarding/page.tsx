"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  BookOpen, 
  Heart, 
  Target, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Mic,
  Eye,
  Gamepad2,
  PenTool,
  Clock,
  Users,
  Zap,
  Search,
  Coffee
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface FormData {
  firstName: string;
  lastName: string;
  learningStyle: string;
  depth: string;
  schedule: string;
  tone: string;
  topics: string[];
  interests: string[];
}

const LEARNING_STYLES = [
  { value: "visual", label: "📊 Visual", icon: Eye, description: "Charts, diagrams, visual aids" },
  { value: "auditory", label: "🎧 Auditory", icon: Mic, description: "Explanations, discussions" },
  { value: "interactive", label: "🎮 Interactive", icon: Gamepad2, description: "Games, simulations" },
  { value: "text", label: "✍️ Text-based", icon: PenTool, description: "Reading, writing" }
];

const DEPTH_OPTIONS = [
  { value: "quick", label: "⚡ Quick & Concise", description: "Bullet summaries, key points" },
  { value: "detailed", label: "📋 Step-by-step", description: "Structured explanations" },
  { value: "deep", label: "🔍 Deep dive", description: "Comprehensive analysis" }
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "📅 Daily", description: "Regular daily sessions" },
  { value: "weekly", label: "📆 Weekly", description: "Weekly learning blocks" },
  { value: "flexible", label: "🔄 Flexible", description: "Learn at your own pace" }
];

const TONE_OPTIONS = [
  { value: "encouraging", label: "🎉 Encouraging", description: "Positive and motivating" },
  { value: "professional", label: "💼 Professional", description: "Formal and structured" },
  { value: "friendly", label: "😊 Friendly", description: "Casual and approachable" },
  { value: "witty", label: "😄 Witty", description: "Fun with humor" }
];

const TOPIC_SUGGESTIONS = [
  "AI & Machine Learning", "Data Science", "Programming", "Finance", "Marketing", 
  "Design", "History", "Science", "Health", "Psychology", "Business", "Art"
];

const INTEREST_SUGGESTIONS = [
  "Basketball", "Gaming", "Music", "Travel", "Photography", "Cooking", 
  "Reading", "Fitness", "Movies", "Technology", "Nature", "Writing"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    learningStyle: "",
    depth: "",
    schedule: "",
    tone: "",
    topics: [],
    interests: []
  });

  const [topicInput, setTopicInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = (type: 'topics' | 'interests', value: string) => {
    if (!value.trim()) return;
    
    const currentTags = formData[type];
    if (currentTags.length >= 5) {
      toast.error(`Maximum 5 ${type} allowed`);
      return;
    }
    
    if (!currentTags.includes(value.trim())) {
      updateField(type, [...currentTags, value.trim()]);
    }
    
    if (type === 'topics') setTopicInput("");
    if (type === 'interests') setInterestInput("");
  };

  const removeTag = (type: 'topics' | 'interests', value: string) => {
    updateField(type, formData[type].filter(item => item !== value));
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1: return formData.firstName.trim() !== "" && formData.lastName.trim() !== "";
      case 2: return formData.learningStyle !== "" && formData.depth !== "";
      case 3: return formData.schedule !== "";
      case 4: return formData.tone !== "";
      default: return false;
    }
  };

  const nextStep = () => {
    if (canProceed(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!canProceed(4)) return;

    setIsSubmitting(true);
    
    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      onboard_answers: {
        job: "", // Not collected in new flow
        traits: formData.tone,
        learningStyle: formData.learningStyle,
        depth: formData.depth,
        topics: formData.topics.join(", "),
        interests: formData.interests.join(", "),
        schedule: formData.schedule,
      },
      want_quizzes: true, // Default to true
    };
  
    try {
      console.log("🚀 Submitting onboarding data:", payload);
      const res = await fetch(`${API_URL}/student/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Failed to save onboarding:", errorText);
        toast.error("Failed to save your preferences. Please try again.");
        return;
      }
  
      console.log("✅ Onboarding saved successfully!");
      toast.success("Welcome to Learn-X! Your profile has been created.");
      router.push("/dashboard");
    } catch (err) {
      console.error("❌ Error saving onboarding:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
  return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Who You Are</h2>
              <p className="text-gray-600">Let's start with the basics</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">First Name *</Label>
          <Input
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && nextStep()}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Last Name *</Label>
          <Input
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && nextStep()}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-4">
              💡 Tip: Hit "Enter" or "Tab" to move quickly between fields
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How You Learn</h2>
              <p className="text-gray-600">Choose your preferred learning approach</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Learning Style *</Label>
                <Select onValueChange={(value: string) => updateField('learningStyle', value)}>
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
                    {LEARNING_STYLES.find(s => s.value === formData.learningStyle)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Explanation Depth *</Label>
                <Select onValueChange={(value: string) => updateField('depth', value)}>
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
                    {DEPTH_OPTIONS.find(d => d.value === formData.depth)?.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">When You Learn</h2>
              <p className="text-gray-600">Set your learning rhythm</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Study Rhythm *</Label>
                <Select onValueChange={(value: string) => updateField('schedule', value)}>
                  <SelectTrigger className="h-12 bg-white border-gray-200">
                    <SelectValue placeholder="When do you prefer to learn?" />
            </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
            </SelectContent>
          </Select>
                {formData.schedule && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {SCHEDULE_OPTIONS.find(s => s.value === formData.schedule)?.description}
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-6">
              💡 "Flexible" will auto-schedule around your habits later
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalization</h2>
              <p className="text-gray-600">Make your AI tutor uniquely yours</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Explanation Tone *</Label>
                <Select onValueChange={(value: string) => updateField('tone', value)}>
                  <SelectTrigger className="h-12 bg-white border-gray-200">
                    <SelectValue placeholder="Choose tone" />
            </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
            </SelectContent>
          </Select>
                {formData.tone && (
                  <p className="text-xs text-gray-500">
                    {TONE_OPTIONS.find(t => t.value === formData.tone)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Topics of Interest</Label>
                <div className="flex">
                  <Input
                    placeholder="Add a topic (max 5)"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('topics', topicInput);
                      }
                    }}
                    className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button 
                    type="button"
                    onClick={() => addTag('topics', topicInput)}
                    className="ml-2 h-12 px-4"
                    disabled={formData.topics.length >= 5}
                  >
                    +
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {TOPIC_SUGGESTIONS.slice(0, 6).map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => addTag('topics', topic)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                      disabled={formData.topics.includes(topic) || formData.topics.length >= 5}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                {formData.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                      >
                        {topic}
                        <button
                          type="button"
                          onClick={() => removeTag('topics', topic)}
                          className="ml-1 text-blue-200 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Hobbies & Interests</Label>
              <div className="flex">
                <Input
                  placeholder="Add a hobby (max 5)"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('interests', interestInput);
                    }
                  }}
                  className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button 
                  type="button"
                  onClick={() => addTag('interests', interestInput)}
                  className="ml-2 h-12 px-4"
                  disabled={formData.interests.length >= 5}
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {INTEREST_SUGGESTIONS.slice(0, 8).map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => addTag('interests', interest)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    disabled={formData.interests.includes(interest) || formData.interests.length >= 5}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.interests.map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-full"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeTag('interests', interest)}
                        className="ml-1 text-green-200 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              💡 Type and hit "Enter" to add tags quickly
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with Progress */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Learn-X
              </h1>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step < currentStep 
                        ? 'bg-green-500 text-white' 
                        : step === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && (
                      <div className={`w-8 h-1 mx-1 rounded-full ${
                        step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600">Step {currentStep} / 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardContent className="p-8">
            {renderStep()}
            
            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <Button
                onClick={prevStep}
                disabled={currentStep === 1}
                variant="outline"
                className="h-12 px-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep === 4 ? (
          <Button
            onClick={handleSubmit}
                  disabled={!canProceed(4) || isSubmitting}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating profile...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Start Learning</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed(currentStep)}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
              )}
            </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}