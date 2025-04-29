"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/link-x/DashSidebar";
import StatisticsCard from "@/components/dashboard/StatisticsCard";
import MarketTrends from "@/components/dashboard/MarketTrends";
import CoursesList from "@/components/dashboard/CoursesList";
import CoursesGrid from "@/components/dashboard/CoursesGrid";
import AudioUpload from "@/components/dashboard/AudioUpload";
import RecentlyCompletedCourses from "@/components/dashboard/RecentCourses";
import Header from "@/components/link-x/Header";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Clock,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import LearnPrompt from "@/components/dashboard/LearnPrompt";

export default function StudentDash() {
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar onCollapseChange={(value) => setIsCollapsed(value)} />
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-14" : "ml-44")}>
        <main className={cn("pt-6 transition-all duration-300", isCollapsed ? "px-6 md:px-8 lg:px-12" : "px-4")}>
          <h1 className="text-4xl font-bold mb-4 text-blue-600">Learning Dashboard</h1>
          <h2 className="text-lg font-medium mb-8 text-gray-700">
            Welcome back to Learn-X! Here's an overview of your learning journey.
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {/* <LearnPrompt /> */}
            <CoursesGrid search={search} setSearch={setSearch} />
          </div>

          <div className="grid grid-cols-1 gap-6 my-8">
            {/* <AudioUpload /> */}
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
