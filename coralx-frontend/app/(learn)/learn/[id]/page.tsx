"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/link-x/LearnSidebar";
import LessonContent from "../components/lesson-content";
import AIChatbot from "../components/ai-chatbot";

export default function LearnPage({ params }: { params: { id: string } }) {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLessonSelect = (title: string, content: string) => {
    setLessonTitle(title);
    setIsLoading(false);
    setAiContent(content);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden bg-background">
        <Sidebar
          courseId={params.id}
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
