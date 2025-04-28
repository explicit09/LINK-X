"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProfessorDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const handleCreateCourse = () => {
    // TODO: connect to backend create_course
    console.log("Creating course:", courseTitle, courseDescription);
    setCourseTitle("");
    setCourseDescription("");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar onCollapseChange={(value) => setIsCollapsed(value)} />
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-14" : "ml-44")}>
        <main className={cn("pt-6 transition-all duration-300", isCollapsed ? "px-6 md:px-8 lg:px-12" : "px-4")}>
          <h1 className="text-4xl font-bold mb-4 text-blue-600">Professor Dashboard</h1>
          <h2 className="text-lg font-medium mb-8 text-gray-700">
            Welcome! Manage your courses and materials here.
          </h2>

          <div className="grid grid-cols-1 gap-6 mb-8">
            {/* Create Course Card */}
            <Card>
              <CardHeader>
                <CardTitle>Create a New Course</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  type="text"
                  placeholder="Course Title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="bg-white border-gray-300 shadow-sm"
                />
                <Input
                  type="text"
                  placeholder="Course Description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="bg-white border-gray-300 shadow-sm"
                />
                <Button onClick={handleCreateCourse} disabled={!courseTitle} className="self-start">
                  Create Course
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Audio Upload Section */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <AudioUpload />
          </div>
        </main>
      </div>
    </div>
  );
}
