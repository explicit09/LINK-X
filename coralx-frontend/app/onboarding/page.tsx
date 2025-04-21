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
    //studentOrEducator: "",
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

  const handleSubmit = async () => {
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

    console.log("🚀 Submitting onboarding data:", payload);

    try {
      const response = await fetch("http://localhost:8080/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Failed to save onboarding data:", errorText);
        return;
      }

      console.log("✅ Onboarding data saved successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("❌ Error while saving onboarding data:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-900 bg-gray-100 p-6">
      <Header isLoggedIn={false} showAuthButton={false} />
      <Card className="w-full max-w-lg p-6 relative bg-white border border-blue-200 shadow-md">
        <CardContent>
          <h1 className="text-xl font-semibold mb-4 text-blue-600">
            Personalized Learning Setup
          </h1>

          <label className="block mt-4 mb-2 text-gray-700">
            What should Link-X call you?
          </label>
          <Input
            className="bg-white border border-gray-300 shadow-sm"
            type="text"
            name="name"
            onChange={(e) => handleChange(e.target.value, "name")}
          />

          <label className="block mt-4 mb-2 text-gray-700">What do you do?</label>
          <Input
            className="bg-white border border-gray-300 shadow-sm"
            type="text"
            name="job"
            placeholder="e.g., Student, Engineer"
            onChange={(e) => handleChange(e.target.value, "job")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            What traits should Link-X have?
          </label>
          <Input
            className="bg-white border border-gray-300 shadow-sm"
            type="textarea"
            name="traits"
            placeholder="e.g., witty, encouraging"
            onChange={(e) => handleChange(e.target.value, "traits")}
          />

          <label className="block mb-2 text-gray-700">
            Preferred Learning Style
          </label>
          <Select onValueChange={(value) => handleChange(value, "learningStyle")}>
            <SelectTrigger className="bg-white border border-gray-300 shadow-sm">
              <SelectValue placeholder="Select a learning style" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md text-gray-900">
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="auditory">Auditory</SelectItem>
              <SelectItem value="games">Games</SelectItem>
              <SelectItem value="text-based">Text-Based</SelectItem>
            </SelectContent>
          </Select>

          <label className="block mt-4 mb-2 text-gray-700">
            Depth of Explanation
          </label>
          <Select onValueChange={(value) => handleChange(value, "depth")}>
            <SelectTrigger className="bg-white border border-gray-300 shadow-sm">
              <SelectValue placeholder="Select depth" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md text-gray-900">
              <SelectItem value="concise">Concise Summaries</SelectItem>
              <SelectItem value="detailed">In-depth Explanations</SelectItem>
            </SelectContent>
          </Select>

          <label className="block mt-4 mb-2 text-gray-700">Topics of Interest</label>
          <Input
            className="bg-white border border-gray-300 shadow-sm"
            type="text"
            name="topics"
            placeholder="e.g., Investing, Finance"
            onChange={(e) => handleChange(e.target.value, "topics")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            Interests, Values, or Preferences for Personalization
          </label>
          <Input
            className="bg-white border border-gray-300 shadow-sm"
            type="text"
            name="interests"
            placeholder="e.g., Basketball, Video Games"
            onChange={(e) => handleChange(e.target.value, "interests")}
          />

          <label className="block mt-4 mb-2 text-gray-700">
            Preferred Study Schedule
          </label>
          <Select onValueChange={(value) => handleChange(value, "schedule")}>
            <SelectTrigger className="bg-white border border-gray-300 shadow-sm">
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md text-gray-900">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>

          {/* <label className="block mt-4 mb-2 text-gray-700">
            Student or Educator
          </label>
          <Select onValueChange={(value) => handleChange(value, "studentOrEducator")}>
            <SelectTrigger className="bg-white border border-gray-300 shadow-sm">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md text-gray-900">
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="educator">Educator</SelectItem>
            </SelectContent>
          </Select> */}

          <div className="flex items-center mt-4">
            <Checkbox
              checked={formData.quizzes}
              onCheckedChange={(checked) => handleCheckboxChange(checked, "quizzes")}
            />
            <label htmlFor="quizzes" className="ml-2 text-gray-800">
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
