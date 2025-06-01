'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, X } from 'lucide-react';
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

const CoursesList = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v2/courses', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('CoursesList API response:', data);
        setCourses(data.data || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase()),
  );

  const visibleCourses = showAll
    ? filteredCourses
    : filteredCourses.slice(0, 5);

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isExpanded
          ? 'fixed inset-0 bg-white z-50 flex items-center justify-center p-6'
          : 'relative',
      )}
    >
      <Card
        className={cn(
          'bg-white border border-gray-200 shadow-lg transition-all duration-300',
          isExpanded ? 'w-full max-w-4xl h-full p-6 overflow-auto' : 'w-full',
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <CardHeader className="relative flex justify-between items-center">
          <CardTitle className="text-xl text-blue-600">
            Enrolled Courses ({courses.length})
          </CardTitle>
          {isExpanded && (
            <Button
              variant="ghost"
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder="Search courses..."
              className="bg-gray-100 text-gray-900 border-gray-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {courses.length === 0 ? (
            <div className="text-center text-gray-500 mt-4">
              Loading your courses...
            </div>
          ) : (
            <>
              <ul className="space-y-4 mt-4">
                {visibleCourses.map((course) => (
                  <li
                    key={course.id}
                    className="flex items-center justify-between bg-gray-100 p-3 rounded-lg border border-gray-300"
                  >
                    <div>
                      <div className="font-semibold text-black">
                        {course.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {course.category} • Instructor:{' '}
                        {course.instructor?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {course.description || 'No description'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => router.push(`/learn/${course.id}`)}
                    >
                      Learn <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              {filteredCourses.length > 5 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    className="text-blue-400 border-blue-400 hover:bg-blue-700 hover:text-white"
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll ? 'See Less' : 'See More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursesList;
