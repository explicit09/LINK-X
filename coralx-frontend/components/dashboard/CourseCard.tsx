import { Book, Edit, Eye, EyeOff, MoreHorizontal, Users, Upload } from "lucide-react";
import { useRef } from "react";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadPdf(course.id, file);
  };

  return (
    <Card className="flex flex-col justify-between h-full overflow-hidden rounded-xl shadow-md bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 min-h-[48px]">
              <Book className="h-5 w-5 text-primary" />
              <span className="line-clamp-2 leading-snug">{course.title}</span>
            </CardTitle>
            <CardDescription>
              {course.code} • {course.term}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-effect border-white/10">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit Course
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublishToggle(); }}>
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

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={course.published ? "default" : "outline"} className={course.published ? "purple-gradient" : ""}>
            {course.published ? "Published" : "Unpublished"}
          </Badge>
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" />
            {course.students} Students
          </Badge>
        </div>

        {showUploadButton && (
        <div className="flex flex-col items-start gap-1">
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
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
        </div>
      )}
      </CardContent>

      <CardFooter className="border-t border-border bg-muted/20 px-6 py-3">
        <div className="w-full flex justify-center">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:text-primary">
            View Course
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}