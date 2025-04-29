"use client"

import { Book, Edit, Eye, EyeOff, MoreHorizontal, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CourseCardProps {
  course: {
    id: string
    title: string
    code: string
    term: string
    students: number
    published: boolean
    lastUpdated: string
  }
  onEdit: () => void
  onPublishToggle: () => void
}

export function CourseCard({ course, onEdit, onPublishToggle }: CourseCardProps) {
  return (
    <Card className="overflow-hidden glass-effect border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              {course.title}
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
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Course
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPublishToggle}>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge
            variant={course.published ? "default" : "outline"}
            className={course.published ? "purple-gradient" : ""}
          >
            {course.published ? "Published" : "Unpublished"}
          </Badge>
          <Badge variant="secondary">
            <Users className="mr-1 h-3 w-3" />
            {course.students} Students
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border bg-muted/20 px-6 py-3">
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>Last updated: {course.lastUpdated}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:text-primary">
            View Course
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
