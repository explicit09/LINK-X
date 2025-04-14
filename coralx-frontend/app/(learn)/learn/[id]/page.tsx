"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/link-x/LearnSidebar";
import LessonContent from "../components/lesson-content";
import AIChatbot from "../components/ai-chatbot";

export default function LearnPage() {
  const params = useParams();
  const [courseId, setCourseId] = useState<string | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Safely set courseId once available
  useEffect(() => {
    if (params?.id && typeof params.id === "string") {
      setCourseId(params.id);
    }
  }, [params]);

  const handleLessonSelect = (title: string, content: string) => {
    setLessonTitle(title);
    setIsLoading(false);
    setAiContent(content);
  };

  if (!courseId) return null; // or show <Loading />

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden bg-background">
        <Sidebar
          courseId={courseId}
          onCollapseChange={setIsCollapsed}
          onLessonSelect={handleLessonSelect}
          onLoadingStart={() => {
            setIsLoading(true);
            setAiContent(null); // clear old message
          }}
        />

        <div
          className={cn(
            "flex flex-grow h-full transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed ? "ml-16" : "ml-64"
          )}
        >
          <main className="flex-grow overflow-y-auto p-6 pr-96">
            <LessonContent title={lessonTitle} content={aiContent} isLoading={isLoading} />
          </main>

          <div className="fixed top-0 right-0 h-screen z-40">
            <AIChatbot />
          </div>
        </div>
      </div>
    </div>
  );
}
