'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: {
    id: string;
    name: string;
  };
  stats: {
    materials: number;
    modules: number;
    students: number;
  };
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
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
        const res = await fetch('http://localhost:8080/api/v2/courses', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('Courses API response:', data);
        setCourses(data.data || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };

    fetchCourses();
  }, [search]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase()),
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
                {course.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-gray-700 text-sm line-clamp-3">
                {course.description || 'No description available'}
              </p>
              <p className="text-gray-600 text-xs">
                Instructor: {course.instructor?.name || 'Unknown'}
              </p>
              <p className="text-gray-600 text-xs">
                Students: {course.stats?.students || 0} • Modules:{' '}
                {course.stats?.modules || 0}
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
      {filteredCourses.length === 0 && courses.length === 0 && (
        <div className="text-center text-gray-500 mt-8">Loading courses...</div>
      )}
      {filteredCourses.length === 0 && courses.length > 0 && (
        <div className="text-center text-gray-500 mt-8">
          No courses found matching your search.
        </div>
      )}
    </div>
  );
};

export default CoursesGrid;
