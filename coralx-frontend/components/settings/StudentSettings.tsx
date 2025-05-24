"use client";
import Header from "@/components/link-x/Header";
import Footer from "@/components/landing/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import {
  ArrowLeft,
  Bell,
  Shield,
  Brain,
  UserCircle,
  Settings,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Lightbulb,
  User,
  BookOpen,
  Target,
  Heart,
  Calendar,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OnboardingData {
  firstName: string;
  lastName: string;
  tone: string;
  learningStyle: string;
  depth: string;
  topics: string[];
  interests: string[];
  schedule: string;
  quizzes: boolean;
}

interface AccountData {
  email: string;
  password: string;
}

const LEARNING_STYLES = [
  { value: "visual", label: "📊 Visual", description: "Charts, diagrams, visual aids" },
  { value: "auditory", label: "🎧 Auditory", description: "Explanations, discussions" },
  { value: "interactive", label: "🎮 Interactive", description: "Games, simulations" },
  { value: "text", label: "✍️ Text-based", description: "Reading, writing" }
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

const StudentSettings = () => {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const [isStudent, setIsStudent] = useState<boolean>(false);
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    tone: "",
    learningStyle: "",
    depth: "",
    topics: [],
    interests: [],
    schedule: "",
    quizzes: false,
  });
  const [accountData, setAccountData] = useState<AccountData>({
    email: "",
    password: "",
  });
  const [passwordError, setPasswordError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [privacy, setPrivacy] = useState({
    profileVisibility: false,
    activityTracking: false,
    dataSharing: false
  });

  const [topicInput, setTopicInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  // Determine user role only once when component mounts
  useEffect(() => {
    const determineRole = async () => {
      try {
        const res = await fetch(`${API}/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          // If the user is not authenticated or the endpoint failed, default to professor
          setIsStudent(false);
          return;
        }

        const data = await res.json(); // expected shape: { id, email, role, ... }

        if (data?.role === "student") {
          setIsStudent(true);
        } else {
          setIsStudent(false);
        }
      } catch (err) {
        console.error("Failed to determine role:", err);
        setIsStudent(false);
      } finally {
        setLoading(false);
      }
    };

    determineRole();
  }, [API]);

  // Fetch Onboarding (students only)
  useEffect(() => {
    if (!isStudent) return;
    fetch(`${API}/student/profile`, {
      method: "GET",
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        // Parse name into firstName and lastName
        const fullName = data.name || "";
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        // Parse topics and interests from comma-separated strings to arrays
        const topicsString = data.onboard_answers?.topics || "";
        const interestsString = data.onboard_answers?.interests || "";
        
        const topics = topicsString ? topicsString.split(",").map((t: string) => t.trim()).filter((t: string) => t) : [];
        const interests = interestsString ? interestsString.split(",").map((i: string) => i.trim()).filter((i: string) => i) : [];
        
        setFormData({
          firstName,
          lastName,
          tone: data.onboard_answers?.traits || "",
          learningStyle: data.onboard_answers?.learningStyle || "",
          depth: data.onboard_answers?.depth || "",
          topics,
          interests,
          schedule: data.onboard_answers?.schedule || "",
          quizzes: data.want_quizzes ?? false,
        });
        
      })
      .catch(err => console.error("Failed to load onboarding:", err));
  }, [API, isStudent]);

  useEffect(() => {
    fetch(`${API}/me`, {
      method: "GET",
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAccountData({ email: data.email ?? "", password: "" });
      })
      .catch(err => console.error("Failed to load email:", err));
  }, []);

  const handleChange = (value: string, name: keyof OnboardingData) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: CheckedState, name: keyof OnboardingData) => {
    setFormData(prev => ({ ...prev, [name]: checked === true }));
  };

  const addTag = (type: 'topics' | 'interests', value: string) => {
    if (!value.trim()) return;
    
    const currentTags = formData[type];
    if (currentTags.length >= 5) {
      toast.error(`Maximum 5 ${type} allowed`);
      return;
    }
    
    if (!currentTags.includes(value.trim())) {
      setFormData(prev => ({ ...prev, [type]: [...currentTags, value.trim()] }));
    }
    
    if (type === 'topics') setTopicInput("");
    if (type === 'interests') setInterestInput("");
  };

  const removeTag = (type: 'topics' | 'interests', value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [type]: prev[type].filter(item => item !== value) 
    }));
  };

  const handleUpdateOnboarding = async () => {
    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      onboard_answers: {
        job: "", // Not used in new flow
        traits: formData.tone,
        learningStyle: formData.learningStyle,
        depth: formData.depth,
        topics: formData.topics.join(", "),
        interests: formData.interests.join(", "),
        schedule: formData.schedule,
      },
      want_quizzes: formData.quizzes,
    };
  
    try {
      const res = await fetch(`${API}/student/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      toast.success("Preferences updated successfully!");
    } catch (e) {
      console.error("❌", e);
      toast.error("Failed to update preferences. Please try again.");
    }
  };

  const handleAccountUpdate = async () => {
    if (accountData.password && accountData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setPasswordError("");

    try {
      const res = await fetch(`${API}/me`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: accountData.email,
          password: accountData.password || undefined,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      toast.success("Account updated successfully!");
    } catch (e) {
      console.error("❌ Failed to update account info:", e);
      toast.error("Failed to update account. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header isLoggedIn={true} />
      <div className="max-w-4xl mx-auto p-6 pt-32">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and learning preferences</p>
          </div>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Account
              </TabsTrigger> 
            {isStudent && (
              <TabsTrigger value="onboarding" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Learning
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
              </TabsTrigger>
            </TabsList>

            {/* ACCOUNT */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account information and preferences.</CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Address
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={accountData.email}
                      onChange={e =>
                        setAccountData(prev => ({ ...prev, email: e.target.value }))
                      }
                      className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      This email will be used for account notifications and login
                    </p>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Change Password
                    </Label>
                    <div className="relative">
                    <Input
                      id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password (leave blank to keep current)"
                      value={accountData.password}
                      onChange={e =>
                        setAccountData(prev => ({ ...prev, password: e.target.value }))
                      }
                        className="h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    {passwordError && (
                      <p className="text-red-500 text-sm flex items-center gap-2">
                        <span className="text-red-500">⚠</span> {passwordError}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  </div>
                </CardContent>
                <CardFooter>
                <Button 
                  onClick={handleAccountUpdate}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Update Account Settings
                </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ONBOARDING */}
            {isStudent && (
              <TabsContent value="onboarding">
                <Card>
                  <CardHeader>
                  <CardTitle>Learning Preferences</CardTitle>
                  <CardDescription>Customize how your AI tutor responds to you.</CardDescription>
                  </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                    <Input
                          id="firstName"
                          placeholder="Enter your first name"
                          value={formData.firstName}
                          onChange={e => handleChange(e.target.value, "firstName")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                    <Input
                          id="lastName"
                          placeholder="Enter your last name"
                          value={formData.lastName}
                          onChange={e => handleChange(e.target.value, "lastName")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Learning Style */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Learning Style
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preferred Learning Style</Label>
                    <Select
                      value={formData.learningStyle}
                           onValueChange={(v: string) => handleChange(v, "learningStyle")}
                    >
                      <SelectTrigger>
                            <SelectValue placeholder="Choose your style" />
                      </SelectTrigger>
                          <SelectContent>
                            {LEARNING_STYLES.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                {style.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Explanation Depth</Label>
                    <Select
                      value={formData.depth}
                           onValueChange={(v: string) => handleChange(v, "depth")}
                    >
                      <SelectTrigger>
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
                      </div>
                    </div>

                    <div className="space-y-2">
                    <Label>Study Schedule</Label>
                    <Select
                      value={formData.schedule}
                      onValueChange={v => handleChange(v, "schedule")}
                    >
                      <SelectTrigger>
                          <SelectValue placeholder="When do you prefer to learn?" />
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
                  </div>

                  {/* Personalization */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Personalization
                    </h3>
                    
                    <div className="space-y-2">
                      <Label>AI Tutor Tone</Label>
                      <Select
                        value={formData.tone}
                        onValueChange={v => handleChange(v, "tone")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose personality tone" />
                      </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((tone) => (
                            <SelectItem key={tone.value} value={tone.value}>
                              {tone.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Topics of Interest</Label>
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
                          className="mr-2"
                        />
                        <Button 
                          type="button"
                          onClick={() => addTag('topics', topicInput)}
                          disabled={formData.topics.length >= 5}
                        >
                          Add
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

                    <div className="space-y-2">
                      <Label>Hobbies & Interests</Label>
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
                          className="mr-2"
                        />
                        <Button 
                          type="button"
                          onClick={() => addTag('interests', interestInput)}
                          disabled={formData.interests.length >= 5}
                        >
                          Add
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
                  </div>

                  {/* Learning Features */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Learning Features
                    </h3>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <Checkbox
                        checked={formData.quizzes}
                        onCheckedChange={c => handleCheckboxChange(c, "quizzes")}
                        className="w-5 h-5"
                      />
                      <div>
                        <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                          Include interactive quizzes and progress tracking
                      </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Get personalized quizzes to test your understanding and track your learning progress
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                    <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={handleUpdateOnboarding}
                    >
                    Update Learning Preferences
                    </Button>
                </CardFooter>
                </Card>
              </TabsContent>
            )}

            {/* NOTIFICATIONS */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Control how and when you receive notifications.</CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                {/* Learning Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Learning Notifications
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mt-1">
                          <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Push Notifications</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Get instant alerts for new courses, assignments, and learning milestones
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications}
                        onCheckedChange={(checked: boolean) => setNotifications(checked)}
                        className="ml-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mt-1">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                    <div>
                          <p className="font-medium text-gray-900">Email Digest</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Weekly summary of your learning progress and recommended content
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications}
                        onCheckedChange={(checked: boolean) => setNotifications(checked)}
                        className="ml-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mt-1">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Study Reminders</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Smart reminders based on your learning schedule and goals
                          </p>
                        </div>
                    </div>
                    <Switch
                      checked={notifications}
                        onCheckedChange={(checked: boolean) => setNotifications(checked)}
                        className="ml-4"
                    />
                    </div>
                  </div>
                </div>

                {/* System Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Notifications
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-900">Security Alerts</p>
                        <p className="text-sm text-gray-600">Login attempts and security updates</p>
                      </div>
                      <Switch
                        checked={true}
                        disabled={true}
                        className="ml-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Product Updates</p>
                        <p className="text-sm text-gray-600">New features and improvements</p>
                    </div>
                    <Switch
                      checked={notifications}
                        onCheckedChange={(checked: boolean) => setNotifications(checked)}
                        className="ml-4"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    💡 <strong>Note:</strong> Security alerts cannot be disabled to keep your account safe
                  </p>
                  </div>
                </CardContent>
                <CardFooter>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Save Notification Preferences
                </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* PRIVACY */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your privacy and data preferences to personalize your experience.</CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Privacy */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    Profile Privacy
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mt-1">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                    <div>
                          <p className="font-medium text-gray-900">Profile Visibility</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Allow other students and instructors to see your profile and learning progress
                          </p>
                        </div>
                    </div>
                    <Switch
                      checked={privacy.profileVisibility}
                        onCheckedChange={(checked: boolean) => 
                          setPrivacy(prev => ({ ...prev, profileVisibility: checked }))
                        }
                        className="ml-4"
                    />
                    </div>
                  </div>
                </div>

                {/* Learning Analytics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Learning Analytics
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mt-1">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                    <div>
                          <p className="font-medium text-gray-900">Activity Tracking</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Track your learning activities to provide personalized recommendations and insights
                          </p>
                        </div>
                    </div>
                    <Switch
                      checked={privacy.activityTracking}
                        onCheckedChange={(checked: boolean) => 
                          setPrivacy(prev => ({ ...prev, activityTracking: checked }))
                        }
                        className="ml-4"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mt-1">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Anonymous Data Sharing</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Share anonymized learning data to help improve the platform for everyone
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={privacy.dataSharing}
                        onCheckedChange={(checked: boolean) => 
                          setPrivacy(prev => ({ ...prev, dataSharing: checked }))
                        }
                        className="ml-4"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                        <Lightbulb className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Why we track learning data?</p>
                        <p className="text-xs text-gray-600 mt-1">
                          This helps us understand how you learn best, suggest relevant content, 
                          and adapt the AI tutor to your personal learning style for better outcomes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Data Management
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Download Your Data</p>
                          <p className="text-sm text-gray-600 mt-1">Get a copy of all your learning data and progress</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                    <div>
                          <p className="font-medium text-red-900">Delete Account</p>
                          <p className="text-sm text-red-600 mt-1">Permanently delete your account and all associated data</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-100">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                </CardContent>
                <CardFooter>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Save Privacy Preferences
                </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      <Footer />
    </div>
  );
};

export default StudentSettings;
