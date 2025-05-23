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

interface OnboardingData {
  name: string;
  job: string;
  traits: string;
  learningStyle: string;
  depth: string;
  topics: string;
  interests: string;
  schedule: string;
  quizzes: boolean;
}

interface AccountData {
  email: string;
  password: string;
}

const StudentSettings = () => {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const [isStudent, setIsStudent] = useState<boolean>(false);
  const [formData, setFormData] = useState<OnboardingData>({
    name: "",
    job: "",
    traits: "",
    learningStyle: "",
    depth: "",
    topics: "",
    interests: "",
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
        setFormData({
          name: data.name,
          job: data.onboard_answers?.job || "",
          traits: data.onboard_answers?.traits || "",
          learningStyle: data.onboard_answers?.learningStyle || "",
          depth: data.onboard_answers?.depth || "",
          topics: data.onboard_answers?.topics || "",
          interests: data.onboard_answers?.interests || "",
          schedule: data.onboard_answers?.schedule || "",
          quizzes: data.want_quizzes ?? false,
        });
        
      })
      .catch(err => console.error("Failed to load onboarding:", err));
  }, [API, isStudent]);
  

  // We already fetch /me below for email; No additional account endpoint needed.

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

  const handleUpdateOnboarding = async () => {
    const payload = {
      name: formData.name,
      onboard_answers: {
        job: formData.job,
        traits: formData.traits,
        learningStyle: formData.learningStyle,
        depth: formData.depth,
        topics: formData.topics,
        interests: formData.interests,
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
      if (!res.ok) throw new Error(await res.text());
      router.push("/dashboard");
    } catch (e) {
      console.error("❌", e);
    }
  };
  
  const updateEmailAndPassword = async (email: string, password?: string) => {
    if (password && password.length < 6) {
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
          email,
          password: password || undefined,  // Send password only if defined
        }),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
  
      router.push("/dashboard"); // Redirect to dashboard on success
    } catch (e) {
      console.error("❌ Failed to update account info:", e);
    }
  };
  
  const handleAccountUpdate = () => {
    updateEmailAndPassword(accountData.email, accountData.password);
  };
  

  const [notifications, setNotifications] = useState<boolean>(true);
  const [privacy, setPrivacy] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={true} />
      
      {/* Main Content Container */}
      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link 
                href="/dashboard" 
                className={cn(
                  "flex items-center gap-2 text-gray-600 hover:text-blue-600",
                  "transition-colors duration-200 canvas-small font-medium"
                )}
              >
                <ArrowLeft size={20} />
                Back to Dashboard
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="canvas-heading-1">Settings</h1>
                <p className="canvas-body text-gray-600">Customize your learning experience</p>
              </div>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="account" className="w-full">
            <TabsList className={cn(
              "grid mb-8 bg-white rounded-xl border border-gray-200",
              "canvas-card shadow-sm",
              isStudent && !loading ? "grid-cols-4" : "grid-cols-3"
            )}>
              <TabsTrigger 
                value="account" 
                className={cn(
                  "flex items-center justify-center gap-2 canvas-small font-medium",
                  "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700",
                  "data-[state=active]:border-blue-200 transition-all duration-200"
                )}
              >
                <UserCircle size={18} />
                Account
              </TabsTrigger>
              
              {isStudent && !loading && (
                <TabsTrigger 
                  value="onboarding" 
                  className={cn(
                    "flex items-center justify-center gap-2 canvas-small font-medium",
                    "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700",
                    "data-[state=active]:border-blue-200 transition-all duration-200"
                  )}
                >
                  <Brain size={18} />
                  AI Settings
                </TabsTrigger>
              )}
              
              <TabsTrigger 
                value="notifications" 
                className={cn(
                  "flex items-center justify-center gap-2 canvas-small font-medium",
                  "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700",
                  "data-[state=active]:border-blue-200 transition-all duration-200"
                )}
              >
                <Bell size={18} />
                Notifications
              </TabsTrigger>
              
              <TabsTrigger 
                value="privacy" 
                className={cn(
                  "flex items-center justify-center gap-2 canvas-small font-medium",
                  "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700",
                  "data-[state=active]:border-blue-200 transition-all duration-200"
                )}
              >
                <Shield size={18} />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* ACCOUNT TAB */}
            <TabsContent value="account">
              <Card className="canvas-card modern-hover">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="canvas-heading-3">Account Information</CardTitle>
                      <CardDescription className="canvas-small">
                        Update your email and password
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="canvas-body font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={accountData.email}
                      onChange={e =>
                        setAccountData(prev => ({ ...prev, email: e.target.value }))
                      }
                      className={cn(
                        "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                        "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="canvas-body font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-gray-500" />
                      New Password
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
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200 pr-10"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordError && (
                      <p className="text-red-500 canvas-small">{passwordError}</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="border-t border-gray-100 pt-6">
                  <Button 
                    onClick={handleAccountUpdate}
                    className={cn(
                      "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600",
                      "text-white shadow-sm hover:shadow-md transition-all duration-200 modern-hover button-pulse"
                    )}
                  >
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* AI SETTINGS / ONBOARDING TAB */}
            {isStudent && (
              <TabsContent value="onboarding">
                <Card className="canvas-card modern-hover">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="canvas-heading-3">AI Learning Preferences</CardTitle>
                        <CardDescription className="canvas-small">
                          Customize how the AI tutor responds to you
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Name Section */}
                    <div className="space-y-2">
                      <Label htmlFor="onboardingName" className="canvas-body font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        Preferred Name
                      </Label>
                      <Input
                        id="onboardingName"
                        type="text"
                        name="name"
                        value={formData.name || ""}
                        onChange={e => handleChange(e.target.value, "name")}
                        placeholder="What should the AI call you?"
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                        )}
                      />
                    </div>

                    {/* Role/Job Section */}
                    <div className="space-y-2">
                      <Label htmlFor="job" className="canvas-body font-medium flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        Your Role
                      </Label>
                      <Input
                        id="job"
                        type="text"
                        name="job"
                        placeholder="e.g., Student, Engineer, Teacher"
                        value={formData.job || ""}
                        onChange={e => handleChange(e.target.value, "job")}
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                        )}
                      />
                    </div>

                    {/* AI Personality */}
                    <div className="space-y-2">
                      <Label htmlFor="traits" className="canvas-body font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-500" />
                        AI Personality
                      </Label>
                      <Input
                        id="traits"
                        type="text"
                        name="traits"
                        placeholder="e.g., encouraging, witty, patient"
                        value={formData.traits || ""}
                        onChange={e => handleChange(e.target.value, "traits")}
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                        )}
                      />
                    </div>

                    {/* Two-column layout for selects */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Learning Style */}
                      <div className="space-y-2">
                        <Label className="canvas-body font-medium flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-gray-500" />
                          Learning Style
                        </Label>
                        <Select
                          value={formData.learningStyle}
                          onValueChange={v => handleChange(v, "learningStyle")}
                        >
                          <SelectTrigger className={cn(
                            "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                            "text-gray-900 transition-all duration-200"
                          )}>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent className="canvas-card border-gray-200">
                            <SelectItem value="visual">Visual Learner</SelectItem>
                            <SelectItem value="auditory">Auditory Learner</SelectItem>
                            <SelectItem value="games">Interactive/Games</SelectItem>
                            <SelectItem value="text-based">Text-Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Explanation Depth */}
                      <div className="space-y-2">
                        <Label className="canvas-body font-medium flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-500" />
                          Explanation Depth
                        </Label>
                        <Select
                          value={formData.depth}
                          onValueChange={v => handleChange(v, "depth")}
                        >
                          <SelectTrigger className={cn(
                            "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                            "text-gray-900 transition-all duration-200"
                          )}>
                            <SelectValue placeholder="Select depth" />
                          </SelectTrigger>
                          <SelectContent className="canvas-card border-gray-200">
                            <SelectItem value="concise">Concise Summaries</SelectItem>
                            <SelectItem value="detailed">In-depth Explanations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Topics of Interest */}
                    <div className="space-y-2">
                      <Label htmlFor="topics" className="canvas-body font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        Topics of Interest
                      </Label>
                      <Input
                        id="topics"
                        type="text"
                        name="topics"
                        placeholder="e.g., Computer Science, Biology, Finance"
                        value={formData.topics || ""}
                        onChange={e => handleChange(e.target.value, "topics")}
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                        )}
                      />
                    </div>

                    {/* Personal Interests */}
                    <div className="space-y-2">
                      <Label htmlFor="interests" className="canvas-body font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-500" />
                        Personal Interests
                      </Label>
                      <Input
                        id="interests"
                        type="text"
                        name="interests"
                        placeholder="e.g., Basketball, Music, Art, Gaming"
                        value={formData.interests || ""}
                        onChange={e => handleChange(e.target.value, "interests")}
                        className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                        )}
                      />
                    </div>

                    {/* Study Schedule */}
                    <div className="space-y-2">
                      <Label className="canvas-body font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        Study Schedule Preference
                      </Label>
                      <Select
                        value={formData.schedule}
                        onValueChange={v => handleChange(v, "schedule")}
                      >
                        <SelectTrigger className={cn(
                          "canvas-card border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                          "text-gray-900 transition-all duration-200"
                        )}>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent className="canvas-card border-gray-200">
                          <SelectItem value="daily">Daily Study Sessions</SelectItem>
                          <SelectItem value="weekly">Weekly Deep Dives</SelectItem>
                          <SelectItem value="flexible">Flexible Learning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quizzes Preference */}
                    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Checkbox
                        id="quizzes"
                        checked={formData.quizzes}
                        onCheckedChange={c => handleCheckboxChange(c, "quizzes")}
                        className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="quizzes" className="canvas-body font-medium text-blue-900 cursor-pointer">
                          Include Interactive Quizzes
                        </Label>
                        <p className="canvas-small text-blue-700">
                          Generate quizzes and practice questions to test your understanding
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-gray-100 pt-6">
                    <Button
                      onClick={handleUpdateOnboarding}
                      className={cn(
                        "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                        "text-white shadow-sm hover:shadow-md transition-all duration-200 modern-hover button-pulse"
                      )}
                    >
                      Update AI Preferences
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            )}

            {/* NOTIFICATIONS TAB */}
            <TabsContent value="notifications">
              <Card className="canvas-card modern-hover">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="canvas-heading-3">Notification Preferences</CardTitle>
                      <CardDescription className="canvas-small">
                        Control how and when you receive notifications
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="space-y-1">
                      <p className="canvas-body font-medium">Push Notifications</p>
                      <p className="canvas-small text-gray-600">Receive device alerts for important updates</p>
                    </div>
                    <Switch
                      checked={notifications}
                      onCheckedChange={checked => setNotifications(checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="space-y-1">
                      <p className="canvas-body font-medium">Email Notifications</p>
                      <p className="canvas-small text-gray-600">Get email updates about courses and assignments</p>
                    </div>
                    <Switch 
                      checked={true} 
                      onCheckedChange={() => {}}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <p className="canvas-body font-medium">Study Reminders</p>
                      <p className="canvas-small text-gray-600">Get reminded about upcoming study sessions and deadlines</p>
                    </div>
                    <Switch 
                      checked={true} 
                      onCheckedChange={() => {}}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PRIVACY TAB */}
            <TabsContent value="privacy">
              <Card className="canvas-card modern-hover">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="canvas-heading-3">Privacy & Security</CardTitle>
                      <CardDescription className="canvas-small">
                        Manage your data and privacy settings
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="space-y-1">
                      <p className="canvas-body font-medium">Profile Visibility</p>
                      <p className="canvas-small text-gray-600">Control who can see your profile information</p>
                    </div>
                    <Switch 
                      checked={privacy} 
                      onCheckedChange={c => setPrivacy(c)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  
                  <div className="space-y-3 py-3">
                    <div>
                      <p className="canvas-body font-medium">Data Usage</p>
                      <p className="canvas-small text-gray-600 mb-3">
                        We collect anonymized data to improve your learning experience and platform performance.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={cn(
                        "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
                        "transition-all duration-200"
                      )}
                    >
                      View Data Policy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default StudentSettings;