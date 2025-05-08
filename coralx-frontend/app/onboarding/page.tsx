"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import Header from "@/components/link-x/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function OnboardingPage() {
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: CheckedState, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: checked === true }));
  };

  const handleSubmit = async () => {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        console.error("Failed to save onboarding:", await res.text());
        return;
      }
  
      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving onboarding:", err);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-900 bg-gray-100 p-6">
      <Header isLoggedIn={false} showAuthButton={false} />
      <Card className="w-full max-w-lg p-6 bg-white border border-blue-200 shadow-md">
        <CardContent>
          <h1 className="text-xl font-semibold mb-4 text-blue-600">
            Personalized Learning Setup
          </h1>

          <label className="block mt-4 mb-2 text-gray-700">
            What should Learn‑X call you?
          </label>
          <Input
            className="bg-white border-gray-300 shadow-sm"
            type="text"
            onChange={(e) => handleChange(e.target.value, "name")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            What do you do?
          </label>
          <Input
            className="bg-white border-gray-300 shadow-sm"
            type="text"
            placeholder="e.g., Student, Engineer"
            onChange={(e) => handleChange(e.target.value, "job")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            What traits should Learn‑X have?
          </label>
          <Input
            className="bg-white border-gray-300 shadow-sm"
            type="text"
            placeholder="e.g., witty, encouraging"
            onChange={(e) => handleChange(e.target.value, "traits")}
          />

          <label className="block mb-2 text-gray-700">
            Preferred Learning Style
          </label>
          <Select onValueChange={(v) => handleChange(v, "learningStyle")}>
            <SelectTrigger className="bg-white border-gray-300 shadow-sm">
              <SelectValue placeholder="Select a learning style" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-md">
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="auditory">Auditory</SelectItem>
              <SelectItem value="games">Games</SelectItem>
              <SelectItem value="text-based">Text‑Based</SelectItem>
            </SelectContent>
          </Select>

          <label className="block mt-4 mb-2 text-gray-700">
            Depth of Explanation
          </label>
          <Select onValueChange={(v) => handleChange(v, "depth")}>
            <SelectTrigger className="bg-white border-gray-300 shadow-sm">
              <SelectValue placeholder="Select depth" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-md">
              <SelectItem value="concise">Concise Summaries</SelectItem>
              <SelectItem value="detailed">In‑depth Explanations</SelectItem>
            </SelectContent>
          </Select>

          <label className="block mt-4 mb-2 text-gray-700">
            Topics of Interest
          </label>
          <Input
            className="bg-white border-gray-300 shadow-sm"
            type="text"
            placeholder="e.g., Investing, Finance"
            onChange={(e) => handleChange(e.target.value, "topics")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            Interests, Preferences
          </label>
          <Input
            className="bg-white border-gray-300 shadow-sm"
            type="text"
            placeholder="e.g., Basketball, Video Games"
            onChange={(e) => handleChange(e.target.value, "interests")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            Preferred Study Schedule
          </label>
          <Select onValueChange={(v) => handleChange(v, "schedule")}>
            <SelectTrigger className="bg-white border-gray-300 shadow-sm">
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 shadow-md">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center mt-4">
            <Checkbox
              checked={formData.quizzes}
              onCheckedChange={(c) => handleCheckboxChange(c, "quizzes")}
            />
            <label className="ml-2 text-gray-800">
              Include quizzes for progress tracking
            </label>
          </div>

          <Button
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmit}
          >
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}