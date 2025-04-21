import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const courses = [
  "Advanced Stock Trading",
  "Cryptocurrency Fundamentals",
  "Personal Finance Mastery",
];

const CoursesList = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isExpanded
          ? "fixed inset-0 bg-white z-50 flex items-center justify-center p-6"
          : "relative"
      )}
    >
      <Card
        className={cn(
          "bg-white border border-gray-200 shadow-lg transition-all duration-300",
          isExpanded
            ? "w-full max-w-4xl h-full p-6 overflow-auto"
            : "w-full"
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <CardHeader className="relative flex justify-between items-center">
          <CardTitle className="text-xl text-blue-600">
            Courses and Topics
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

          <ul className="space-y-4 mt-4">
            {courses.map((course, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-gray-100 p-3 rounded-lg"
              >
                <span className="text-gray-800">{course}</span>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/learn")}
                >
                  Learn <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoursesList;
