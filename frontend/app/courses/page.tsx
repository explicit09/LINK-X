"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { CanvasCoursesGrid } from '@/components/dashboard/CanvasCoursesGrid';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthUser } from '@/hooks/useAuthUser';
import { Search, Plus, Filter } from "lucide-react";
import AccessCodeCard from "@/components/dashboard/AccessCodeCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  id: string;
  title: string;
  code?: string;
  description?: string;
  category?: string;
  instructor: {
    id: string;
    name: string;
  };
  stats?: {
    materials: number;
    modules: number;
    students: number;
  };
  term?: string;
  credits?: number;
}

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const router = useRouter();
  const { user: currentUser } = useAuthUser();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v2/courses', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCourses(data.data || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCourseAdded = () => {
    setShowPopup(false);
    router.refresh();
  };

  // Filter courses based on search and filter
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
                         course.code?.toLowerCase().includes(search.toLowerCase()) ||
                         course.instructor?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "all" || 
                         (filter === "current" && course.term === "Fall 2024") ||
                         (filter === "past" && course.term !== "Fall 2024");
    
    return matchesSearch && matchesFilter;
  });

  return (
    <SharedDashboardLayout
      pageTitle="All Courses"
      showGamification={false}
      showFocusMode={false}
      currentUser={currentUser}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
            <p className="text-gray-600 mt-1">
              Browse and enroll in available courses
            </p>
          </div>

          <Button
            onClick={() => setShowPopup(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Join Course
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search courses, instructors, or course codes..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="current">Current Term</SelectItem>
              <SelectItem value="past">Past Terms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredCourses.length} of {courses.length} courses
            </p>
          </div>
          
          {/* Canvas-style Course Grid */}
          <CanvasCoursesGrid
            courses={filteredCourses}
            loading={loading}
            emptyMessage={
              search
                ? `No courses found matching "${search}"`
                : "No courses available"
            }
          />
        </div>

        {/* Access Code Modal */}
        <AccessCodeCard 
          open={showPopup} 
          onClose={() => setShowPopup(false)} 
          onSuccess={handleCourseAdded}
        />
      </div>
    </SharedDashboardLayout>
  );
}
