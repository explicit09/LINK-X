"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Define interfaces for course data
interface Chapter {
  chapterTitle: string;
  metadata: string[];
}

interface CourseOutline {
  chapters: Chapter[];
}

interface Course {
  id: string;
  topic: string;
  expertise: string;
  content: CourseOutline;
  createdAt: string;
  fileId: string | null;
}

export default function LessonContent() {
  const searchParams = useSearchParams();

  if (!searchParams) {
    return <p>Error: Unable to read search parameters.</p>;
  }

  const courseId = searchParams.get("courseId");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) {
        setError("No course selected. Please choose a course.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`http://localhost:8080/courses/${courseId}`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch the selected course");
        }
        const courseData: Course = await res.json();
        setCourse(courseData);
      } catch (err: any) {
        setError(err.message || "Error fetching course");
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId]);

  if (loading) return <p>Loading course...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!course) return <p>No course available.</p>;

  const outline = course.content;

  return (
    <div className="max-w-5xl w-full p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-foreground">
        {course.topic || "Course Outline"}
      </h1>
      {outline && outline.chapters ? (
        outline.chapters.map((chapter: Chapter, index: number) => (
          <div key={index} className="mb-6">
            <h2 className="text-2xl font-semibold mt-8 mb-4 text-blue-muted">
              {chapter.chapterTitle}
            </h2>
            {chapter.metadata && chapter.metadata.length > 0 ? (
              <ul className="list-disc pl-6 mb-6 space-y-2 text-foreground">
                {chapter.metadata.map((point: string, idx: number) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            ) : (
              <p>No metadata available for this chapter.</p>
            )}
          </div>
        ))
      ) : (
        <p>No outline available</p>
      )}
    </div>
  );
}