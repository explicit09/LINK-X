"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
//import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import Footer from "@/components/landing/Footer";
import ProfessorDashboard from "@/components/dashboard/ProfessorDash"; // 🚨 make sure path is correct
import { getMe } from "@/lib/api"; // ✅ this will be a small API helper you create
import StudentDashboard from "@/components/dashboard/StudentDash";
import ProfessorSettings from "@/components/settings/ProfessorSettings";
import StudentSettings from "@/components/settings/StudentSettings";

export default function Settings() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [role, setRole] = useState<"student" | "instructor" | "admin" | "unknown">("unknown");
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = await getMe();
        setRole(user.role || "unknown");
      } catch (error) {
        console.error("Failed to fetch user:", error);
        //router.push("/login"); // maybe redirect if not logged in
      }
    };

    fetchUserRole();
  }, [router]);

  if (role === "unknown") {
   
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (role === "instructor") {
   
    return <ProfessorSettings />;
  }

  if (role === "student") {
   
    return <StudentSettings />;
  }


}
