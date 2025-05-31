import { motion } from "framer-motion";
import { 
  Book, 
  Edit, 
  Eye, 
  EyeOff, 
  MoreHorizontal, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Trash2,
  ArrowUpRight
} from "lucide-react";
import { useState } from "react";

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

// Import design tokens
import { colors } from "@/src/styles/tokens";

interface Course {
  id: string;
  title: string;
  code: string;
  term: string;
  students: number;
  published: boolean;
  engagement?: number;
  engagementTrend?: number;
  lastUpdated?: string;
  modules?: number;
  assignments?: number;
  color?: string;
}

interface ProfessorCourseCardProps {
  course: Course;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublish?: () => void;
  index?: number;
}

export function ProfessorCourseCard({
  course,
  onSelect,
  onEdit,
  onDelete,
  onTogglePublish,
  index = 0,
}: ProfessorCourseCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Generate default values if not provided
  const engagement = course.engagement ?? Math.floor(Math.random() * 30) + 70;
  const engagementTrend = course.engagementTrend ?? Math.floor(Math.random() * 10) - 5;
  const modules = course.modules ?? 12;
  const assignments = course.assignments ?? 8;
  const lastUpdated = course.lastUpdated ?? "Recently";
  const courseColor = course.color ?? (course.published ? colors.primary.DEFAULT : colors.neutral[400]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.1,
        ease: [0.34, 1.56, 0.64, 1] // Spring easing
      }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      className="cursor-pointer"
    >
      <Card className={cn(
        "relative overflow-hidden border-0",
        "bg-white shadow-md hover:shadow-xl",
        "transition-all duration-150 group",
        "transform-gpu" // Enable GPU acceleration
      )}>
        {/* Course color accent bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0"
          style={{ backgroundColor: courseColor }}
          initial={{ height: 3 }}
          animate={{ height: isHovered ? 4 : 3 }}
          transition={{ duration: 0.15 }}
        />
        
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <motion.div 
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    course.published 
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-md" 
                      : "bg-gray-100 border border-gray-200"
                  )}
                  animate={{ rotate: isHovered ? 5 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Book className={cn(
                    "h-5 w-5",
                    course.published ? "text-white" : "text-gray-500"
                  )} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-semibold text-gray-900 line-clamp-1">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {course.code} • {course.term}
                  </CardDescription>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 opacity-0 group-hover:opacity-100",
                    "transition-all duration-150",
                    "hover:bg-gray-100 data-[state=open]:opacity-100"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" /> 
                    Edit Course
                  </DropdownMenuItem>
                )}
                {onTogglePublish && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
                    className="cursor-pointer"
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
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Course
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Students</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{course.students}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4" />
                <span>Engagement</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{engagement}%</p>
                {engagementTrend !== 0 && (
                  <span className={cn(
                    "text-sm font-medium flex items-center",
                    engagementTrend > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {engagementTrend > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(engagementTrend)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={course.published ? "default" : "outline"} 
              className={cn(
                "font-medium",
                course.published 
                  ? "bg-blue-600 text-white border-0 hover:bg-blue-700" 
                  : "border-gray-300 text-gray-600"
              )}
            >
              {course.published ? "Published" : "Draft"}
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0">
              {modules} modules • {assignments} assignments
            </Badge>
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {lastUpdated}</span>
            </div>
            <motion.div
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
            </motion.div>
          </div>

          {/* Hover indicator bar */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ originX: 0 }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}