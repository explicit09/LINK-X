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
  Moon,
  UserCircle,
  Settings,
  Mail,
  Lock,
  Eye,
  EyeOff
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

const ProfessorSettings = () => {
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

  useEffect(() => {
    fetch(`http://localhost:8080/me`, {
      method: "GET",
      credentials: "include",
    }).then(res => {
      if (res.status === 200 || res.status === 404) {
        setIsStudent(true);
      } else {
        setIsStudent(false);
      }
    }).catch(() => {
      setIsStudent(false);
    }).finally(() => {
      setLoading(false);
    });
  }, [API]);
  

  // Determine role
  useEffect(() => {
    fetch(`http://localhost:8080/me`, {
      method: "GET",
      credentials: "include",
    }).then(res => {
      if (res.status === 200 || res.status === 404) {
        setIsStudent(true);
        // load onboarding later
        console.log("isStudent:", isStudent);
      } else {
        setIsStudent(false);
        console.log("isStudent:", isStudent);
      }
    }).catch(() => {
      setIsStudent(false);
    });
  }, [API]);

  // Fetch Onboarding (students only)
  useEffect(() => {
    if (!isStudent) return;
    fetch(`http://localhost:8080/student/profile`, {
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
          quizzes: data.want_quizzes,
        });
        
      })
      .catch(err => console.error("Failed to load onboarding:", err));
  }, [API, isStudent]);
  

  // Fetch Account
  useEffect(() => {
    const path = isStudent ? "/student/profile" : "/professor/profile";
    fetch(`http://localhost:8080${path}`, {
      method: "GET",
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAccountData({ email: data.email, password: "" });
      })
      .catch(err => console.error("Failed to load account:", err));
  }, [API, isStudent]);

  useEffect(() => {
    fetch(`http://localhost:8080/me`, {
      method: "GET",
      credentials: "include",
    })
      .then(async res => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAccountData({ email: data.email, password: "" });
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
      const res = await fetch(`http://localhost:8080/student/profile`, {
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
      const res = await fetch("http://localhost:8080/me", {
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
                <p className="canvas-body text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="account" className="w-full">
            <TabsList className={cn(
              "grid grid-cols-3 mb-8 bg-white rounded-xl border border-gray-200",
              "canvas-card shadow-sm"
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
                      <p className="canvas-body font-medium">Weekly Digest</p>
                      <p className="canvas-small text-gray-600">Summary of weekly activity and upcoming deadlines</p>
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

export default ProfessorSettings;