"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/dashboard/DashSidebar";
import StatisticsCard from "@/components/dashboard/StatisticsCard";
import MarketTrends from "@/components/dashboard/MarketTrends";
import CoursesList from "@/components/dashboard/CoursesList";
import AudioUpload from "@/components/dashboard/AudioUpload";
import RecentlyCompletedCourses from "@/components/dashboard/RecentCourses";
import Header from "@/components/link-x/Header";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { BookOpen, Clock, TrendingUp, GraduationCap } from "lucide-react";
import LearnPrompt from "@/components/dashboard/LearnPrompt";
import AccessCodeCard from "@/components/dashboard/AccessCodeCard";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();
  const handleCourseAdded = () => {
    setShowPopup(false);     // Close popup
    router.refresh();        // Refresh page content
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Sidebar onCollapseChange={(value) => setIsCollapsed(value)} userRole={"student"} />
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-14" : "ml-44")}>
        <main className={cn("pt-6 transition-all duration-300", isCollapsed ? "px-6 md:px-8 lg:px-12" : "px-4")}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-blue-600">Current Courses</h1>
              <h2 className="text-lg font-medium text-gray-700">
                Welcome back to Learn-X! Here's your current courses.
              </h2>
            </div>

            <div className="mt-4 sm:mt-0">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => setShowPopup(true)}
              >
                + Join Course
              </button>
            </div>
          </div>

          <AccessCodeCard open={showPopup} onClose={() => setShowPopup(false)} onSuccess={() => {
            setShowPopup(false);
            router.push('/dashboard'); // ✅ This will now work properly
          }} />

          <CoursesList search={search} setSearch={setSearch} />
        </main>
      </div>

      {/* Footer with adjusted styling */}
      <div className={cn(" transition-all duration-300 flex-shrink-0 h-[25vh]", isCollapsed ? "ml-14" : "ml-44")}>
        <Footer />
      </div>
    </div>
  );
}
