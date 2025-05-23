import { Book, Edit, Eye, EyeOff, MoreHorizontal, Users, Upload, Clock } from "lucide-react";
import { useRef, useState } from "react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  uploading: boolean;
  onEdit: () => void;
  onPublishToggle: () => void;
  onUploadPdf: (courseId: string, file: File) => Promise<void>;
  showUploadButton?: boolean;
}

export function CourseCard({
  course,
  uploading,
  onEdit,
  onPublishToggle,
  onUploadPdf,
  showUploadButton,
}: CourseCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadPdf(course.id, file);
  };

  return (
    <Card 
      className={cn(
        "flex flex-col justify-between h-full overflow-hidden transition-all duration-300",
        "canvas-card modern-hover group",
        isHovered ? "shadow-lg border-blue-200 transform scale-[1.02]" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Course Color Bar */}
      <div className={cn(
        "h-1 w-full transition-all duration-300 bg-gradient-to-r",
        course.published ? "from-blue-500 to-purple-500" : "from-gray-300 to-gray-400",
        isHovered ? "h-2" : "h-1"
      )} />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="flex items-center gap-3 min-h-[48px]">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                course.published 
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-md" 
                  : "bg-gray-100 border border-gray-200"
              )}>
                <Book className={cn(
                  "h-5 w-5 transition-colors duration-300",
                  course.published ? "text-white" : "text-gray-500"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="canvas-heading-3 line-clamp-2 leading-tight">{course.title}</span>
              </div>
            </CardTitle>
            <CardDescription className="canvas-small flex items-center gap-2">
              <span className="font-medium">{course.code}</span>
              <span>•</span>
              <span>{course.term}</span>
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300",
                  "hover:bg-gray-100 data-[state=open]:opacity-100"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="canvas-card border-gray-200 shadow-lg">
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
              >
                <Edit className="mr-2 h-4 w-4" /> 
                Edit Course
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onPublishToggle(); }}
                className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50"
              >
                {course.published ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Status and Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant={course.published ? "default" : "outline"} 
            className={cn(
              "font-medium",
              course.published 
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0" 
                : "border-gray-300 text-gray-600"
            )}
          >
            {course.published ? "Published" : "Draft"}
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
            <Users className="mr-1 h-3 w-3" />
            {course.students} Students
          </Badge>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          Last updated {course.lastUpdated}
        </div>

        {/* Upload Section */}
        {showUploadButton && (
          <div className="pt-2 border-t border-gray-100">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "w-full border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700",
                "transition-all duration-200 disabled:opacity-50"
              )}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload PDF"}
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 py-4">
        <div className="w-full flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "canvas-small font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50",
              "transition-all duration-200 modern-hover"
            )}
          >
            View Course Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}