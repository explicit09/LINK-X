"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ArrowLeft, Bell, Shield, Globe, Moon, Sun, UserCircle } from 'lucide-react';
import Link from "next/link";
import { useRouter } from 'next/navigation';



const Settings = () => {
const router = useRouter();
const [formData, setFormData] = useState({
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
const handleChange = (value: string, name: string) => {
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};
const handleCheckboxChange = (checked: CheckedState, name: string) => {
  setFormData((prev) => ({
    ...prev,
    [name]: checked === true,
  }));
};
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:8080/onboarding", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      setFormData({
        name: data.name,
        job: data.answers[0],
        traits: data.answers[1],
        learningStyle: data.answers[2],
        depth: data.answers[3],
        topics: data.answers[4],
        interests: data.answers[5],
        schedule: data.answers[6],
        quizzes: data.quizzes,
      });
    } catch (err) {
      console.error("❌ Failed to load user data:", err);
    }
  };

  fetchData();
}, []);

const handleUpdate = async () => {
  const payload = {
    name: formData.name,
    answers: [
      formData.job,
      formData.traits,
      formData.learningStyle,
      formData.depth,
      formData.topics,
      formData.interests,
      formData.schedule,
    ],
    quizzes: formData.quizzes,
  };

  console.log("🔄 Updating onboarding data:", payload);

  try {
    const response = await fetch("http://localhost:8080/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to update onboarding data:", errorText);
      return;
    }

    console.log("✅ Onboarding data updated successfully!");
    router.push("/dashboard");
  } catch (error) {
    console.error("❌ Error while updating onboarding data:", error);
  }
};
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [privacy, setPrivacy] = useState(true);

  return (
    <div className="flex flex-col bg-black text-white min-h-screen w-full pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-[900px] mx-auto w-full">
        <div className="mb-8 flex items-center">
          <Link href="/" className="flex items-center text-gray-300 hover:text-blue-400 mr-4">
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="account" className="flex items-center justify-center gap-2">
              <UserCircle size={18} /> Account
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="flex items-center justify-center gap-2">
              <Moon size={18} /> Onboarding
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
              <Bell size={18} /> Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center justify-center gap-2">
              <Shield size={18} /> Privacy
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <input
                    id="email"
                    placeholder="Enter your email"
                    defaultValue="user@example.com"
                    className="w-full bg-muted rounded-md p-2 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Password</Label>
                 <input
                  id="password"
                  type="password"
                  placeholder="Change your password"
                  defaultValue=""
                  className="w-full bg-muted rounded-md p-2 text-foreground"
                    />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Display Name</Label>
                  <input
                    id="name"
                    placeholder="Enter your name"
                    defaultValue="John Doe"
                    className="w-full bg-muted rounded-md p-2 text-foreground"
                  />
                </div>
                
              </CardContent>
              <CardFooter>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="onboarding">
            <Card>
              <CardHeader>
                <CardTitle>
                  Edit Onboarding
                </CardTitle>
                <CardDescription>
                  Customize how the Link-X AI responds to your questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <h1 className="text-xl font-semibold mb-4 text-blue-400">
                            Personalized Learning Setup
                          </h1>
                
                          <label className="block mt-4 mb-2 text-gray-400">
                            What should Link-X call you?
                          </label>
                          <Input
                            className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg"
                            type="text"
                            name="name"
                            onChange={(e) => handleChange(e.target.value, "name")}
                          />
                
                          <label className="block mt-4 mb-2 text-gray-400">What do you do?</label>
                          <Input
                            className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg"
                            type="text"
                            name="job"
                            placeholder="e.g., Student, Engineer"
                            onChange={(e) => handleChange(e.target.value, "job")}
                          />
                
                          <label className="block mt-4 mb-2 text-gray-400">
                            What traits should Link-X have?
                          </label>
                          <Input
                            className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg"
                            type="textarea"
                            name="traits"
                            placeholder="e.g., witty, encouraging"
                            onChange={(e) => handleChange(e.target.value, "traits")}
                          />
                
                          <label className="block mb-2 text-gray-400">
                            Preferred Learning Style
                          </label>
                          <Select onValueChange={(value) => handleChange(value, "learningStyle")}>
                            <SelectTrigger className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg">
                              <SelectValue placeholder="Select a learning style" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg text-gray-100">
                              <SelectItem value="visual" className="hover:bg-gray-200 cursor-pointer">
                                Visual
                              </SelectItem>
                              <SelectItem value="auditory" className="hover:bg-gray-200 cursor-pointer">
                                Auditory
                              </SelectItem>
                              <SelectItem value="games" className="hover:bg-gray-200 cursor-pointer">
                                Games
                              </SelectItem>
                              <SelectItem value="text-based" className="hover:bg-gray-200 cursor-pointer">
                                Text-Based
                              </SelectItem>
                            </SelectContent>
                          </Select>
                
                          <label className="block mt-4 mb-2 text-gray-400">
                            Depth of Explanation
                          </label>
                          <Select onValueChange={(value) => handleChange(value, "depth")}>
                            <SelectTrigger className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg">
                              <SelectValue placeholder="Select depth" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg text-gray-100">
                              <SelectItem value="concise">Concise Summaries</SelectItem>
                              <SelectItem value="detailed">In-depth Explanations</SelectItem>
                            </SelectContent>
                          </Select>
                
                          <label className="block mt-4 mb-2 text-gray-400">Topics of Interest</label>
                          <Input
                            className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg"
                            type="text"
                            name="topics"
                            placeholder="e.g., Investing, Finance"
                            onChange={(e) => handleChange(e.target.value, "topics")}
                          />
                
                          <label className="block mt-4 mb-2 text-gray-400">
                            Interests, Values, or Preferences for Personalization
                          </label>
                          <Input
                            className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg"
                            type="text"
                            name="interests"
                            placeholder="e.g., Basketball, Video Games"
                            onChange={(e) => handleChange(e.target.value, "interests")}
                          />
                
                          <label className="block mt-4 mb-2 text-gray-400">
                            Preferred Study Schedule
                          </label>
                          <Select onValueChange={(value) => handleChange(value, "schedule")}>
                            <SelectTrigger className="bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg">
                              <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 shadow-lg text-gray-100">
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="flexible">Flexible</SelectItem>
                            </SelectContent>
                          </Select>
                
                          <div className="flex items-center mt-4">
                            <Checkbox
                              checked={formData.quizzes}
                              onCheckedChange={(checked) => handleCheckboxChange(checked, "quizzes")}
                            />
                            <label htmlFor="quizzes" className="ml-2">
                              Include quizzes for progress tracking
                            </label>
                          </div>
                
                          <Button
                          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleUpdate} // replace this with `handleSubmit` if it's onboarding
                          >
                            Update Preferences
                          </Button>

              {/* <Link href="/onboarding" passHref>
              <Button>Edit Onboarding</Button>
              </Link> */}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage your notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications on your device.</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email.</p>
                  </div>
                  <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Manage your privacy preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">Control who can see your profile information.</p>
                  </div>
                  <Switch checked={privacy} onCheckedChange={setPrivacy} />
                </div>
                <div className="space-y-1">
                  <Label>Data Usage</Label>
                  <p className="text-sm text-muted-foreground">We collect anonymized data to improve your experience.</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Manage Data Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
