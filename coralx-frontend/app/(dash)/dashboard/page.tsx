"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/dashboard/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import Footer from "@/components/landing/Footer";
import ProfessorDashboard from "@/components/dashboard/ProfessorDash"; // 🚨 make sure path is correct
import { userAPI } from "@/lib/api"; // ✅ this will be a small API helper you create
import StudentDashboard from "@/components/dashboard/StudentDash";

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [role, setRole] = useState<"student" | "instructor" | "admin" | "unknown">("unknown");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = await userAPI.getMe();
        setRole(user.role || "unknown");
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login"); // maybe redirect if not logged in
      }
    };

    fetchUserRole();
  }, [router]);

  // Mock upload handlers
  const handleUpload = async (file: File) => {
    console.log("Uploading file:", file.name);
    // Mock upload implementation
  };

  if (role === "unknown") {
   
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (role === "instructor") {
   
    return <ProfessorDashboard />;
  }

  if (role === "student") {
   
    return <StudentDashboard />;
  }

  // Otherwise, default to Student Dashboard
  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar userRole={role} onCollapseChange={setIsCollapsed}/>
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-14" : "ml-44")}>
        <main className={cn("pt-6 transition-all duration-300", isCollapsed ? "px-6 md:px-8 lg:px-12" : "px-4")}>
          <h1 className="text-4xl font-bold mb-4 text-blue-600">Learning Dashboard</h1>
          <h2 className="text-lg font-medium mb-8 text-gray-700">
            Welcome back, {currentUser?.name || "Student"}! Here&apos;s your learning overview.
          </h2>

          {/* You can customize this part later for student-only */}
          <div className="grid grid-cols-1 gap-6 my-8">
            <AudioUpload 
              onUpload={handleUpload}
              uploading={false}
              moduleId="default"
            />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
