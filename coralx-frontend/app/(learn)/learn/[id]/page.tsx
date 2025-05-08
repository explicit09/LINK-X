"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/link-x/LearnSidebar";
import LessonContent from "../components/lesson-content";
import AIChatbot from "../components/ai-chatbot";

export default function LearnPage() {
  const params = useParams();
  const pfId = typeof params?.id === "string" ? params.id : null;

  const [fileId, setFileId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLessonSelect = (title: string, content: string) => {
    setLessonTitle(title);
    setIsLoading(false);
    setAiContent(content);
  };

  useEffect(() => {
    if (!pfId) return;
  
    const fetchOriginalFileId = async () => {
      try {
        const res = await fetch(`http://localhost:8080/student/personalized-files/${pfId}`, {
          credentials: "include",
        });
  
        if (!res.ok) {
          const text = await res.text(); // <-- show error message
          throw new Error(`Failed to fetch personalized file: ${text}`);
        }
  
        const data = await res.json();
  
        if (data.originalFileId) {
          setFileId(data.originalFileId);
        } else {
          console.warn("No original file linked to this personalized file.");
        }
      } catch (err) {
        console.error("Error fetching original file ID:", err);
      }
    };
  
    fetchOriginalFileId();
  }, [pfId]);

  if (!pfId) {
    return <p className="p-4 text-center text-red-500">Missing personalized file ID.</p>;
  }

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

          {fileId && (
            <div className="fixed top-0 right-0 h-screen z-40">
              <AIChatbot fileId={fileId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
