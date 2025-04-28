"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  topic: string;
  expertise: string;
  content: any;
  createdAt: string;
  fileId: string | null;
}

const CoursesGrid = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("http://localhost:8080/courses", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Course[] = await res.json();
        setCourses(data);
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) =>
    course.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="flex justify-center">
        <Input
          type="text"
          placeholder="Search courses..."
          className="w-full max-w-md bg-gray-100 text-gray-900 border-gray-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card
            key={course.id}
            className="bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
            onClick={() => router.push(`/learn/${course.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-blue-600 text-lg truncate">
                {course.topic.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-gray-700 text-sm">
                Expertise: {course.expertise || "N/A"}
              </p>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white mt-auto w-full"
              >
                Learn <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Courses */}
      {filteredCourses.length === 0 && (
        <div className="text-center text-gray-500 mt-8">No courses found.</div>
      )}
    </div>
  );
};

export default CoursesGrid;
