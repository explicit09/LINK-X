import { Book, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    code: string;
    term: string;
    students: number;
    published: boolean;
    lastUpdated: string;
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col justify-between h-full overflow-hidden rounded-xl shadow-md bg-white">
      <CardHeader className="pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 min-h-[48px]">
            <Book className="h-5 w-5 text-primary" />
            <span className="line-clamp-2 leading-snug">{course.title}</span>
          </CardTitle>

          <CardDescription>
            {course.code} • {course.term}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2">
          {/* <Badge
            variant={course.published ? "default" : "outline"}
            className={course.published ? "purple-gradient" : ""}
          >
            {course.published ? "Published" : "Unpublished"}
          </Badge> */}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border bg-muted/20 px-6 py-3">
        <div className="w-full flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:text-primary"
          >
            View Course
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
