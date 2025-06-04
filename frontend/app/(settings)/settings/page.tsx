'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
//import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from '@/components/dashboard/AudioUpload';
import Footer from '@/components/landing/Footer';
import { useAuthUser } from '@/hooks/useAuthUser';
import ProfessorSettings from '@/components/settings/ProfessorSettings';
import StudentSettings from '@/components/settings/StudentSettings';

export default function Settings() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use centralized auth user hook
  const { user, isLoading } = useAuthUser();
  
  // Extract role from user data
  const role = (user?.role as 'student' | 'instructor' | 'admin') || 'student';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (role === 'instructor') {
    return <ProfessorSettings />;
  }

  if (role === 'student') {
    return <StudentSettings />;
  }
}
