'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCourses } from '@/lib/hooks/useDatabase';

// Course interface from our Supabase database (imported via hook)

const CoursesGrid = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) => {
  const router = useRouter();

  // ✅ NEW: Use direct Supabase access instead of API
  const { courses, loading } = useCourses({ 
    query: search,
    published: true // Only show published courses
  });

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
      {loading ? (
        <div className="text-center text-gray-500 mt-8">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          {search ? 'No courses found matching your search.' : 'No courses available.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {courses.map((course: any) => (
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
                  Category: {course.category || 'N/A'}
                </p>
                <p className="text-gray-600 text-xs">
                  Course Code: {course.code || 'N/A'}
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
      )}
    </div>
  );
};

export default CoursesGrid;

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
