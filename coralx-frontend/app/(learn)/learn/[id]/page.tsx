"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/link-x/LearnSidebar";
import LessonContent from "../components/lesson-content";
import AIChatbot from "../components/ai-chatbot";

export default function LearnPage() {
  const params = useParams();
  const pfId = typeof params?.id === "string" ? params.id : null;


  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLessonSelect = (title: string, content: string) => {
    setLessonTitle(title);
    setIsLoading(false);
    setAiContent(content);
  };

  if (!pfId) return <p className="p-4 text-center text-red-500">Missing personalized file ID.</p>;

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden bg-background">
        <Sidebar
          pfId={pfId}
          onCollapseChange={setIsCollapsed}
          onLessonSelect={handleLessonSelect}
          onLoadingStart={() => {
            setIsLoading(true);
            setAiContent(null);
          }}
        />

        <div
          className={cn(
            "flex flex-grow h-full transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed ? "ml-16" : "ml-64"
          )}
        >
          <main className="flex-grow overflow-y-auto p-6 pr-96">
            <LessonContent
              title={lessonTitle}
              content={aiContent}
              isLoading={isLoading}
            />
          </main>

          <div className="fixed top-0 right-0 h-screen z-40">
            <AIChatbot />
          </div>
        </div>
      </div>
    </div>
  );
}
