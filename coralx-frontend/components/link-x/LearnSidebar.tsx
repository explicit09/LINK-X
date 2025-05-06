"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseconfig";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const Avatar = () => (
  <div className="h-10 w-10 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center overflow-hidden">
    <User className="h-5 w-5 text-sidebar-primary" />
  </div>
);

interface Subsection {
  title: string;
  fullText: string;
}

interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
}

interface OnboardingData {
  name: string;
  job: string;
  traits: string;
  learningStyle: string;
  depth: string;
  topics: string;
  interests: string;
  schedule: string;
  quizzes: boolean;
}

interface OnboardingResponse {
  name: string;
  answers: string[];
  quizzes: boolean;
}

interface SidebarProps {
  className?: string;
  onLessonSelect?: (title: string, response: string) => void;
  onLoadingStart?: () => void;
  onCollapseChange?: (value: boolean) => void;
  courseId?: string;
  pfId?: string;
}

const Sidebar = ({
  className,
  onLessonSelect,
  onLoadingStart,
  onCollapseChange,
  courseId,
  pfId,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const isMobile = useIsMobile();
  const router = useRouter();

  const fetchOnboarding = async (): Promise<OnboardingData | null> => {
    try {
      const res = await fetch("http://localhost:8080/onboarding", {
        method: "GET",
        credentials: "include",
      });

      const data: OnboardingResponse = await res.json();

      if (res.status !== 200) {
        console.error("Failed to fetch onboarding:", data);
        return null;
      }

      const [job, traits, learningStyle, depth, topics, interests, schedule] =
        data.answers;

      const onboarding: OnboardingData = {
        name: data.name,
        job,
        traits,
        learningStyle,
        depth,
        topics,
        interests,
        schedule,
        quizzes: data.quizzes,
      };

      return onboarding;
    } catch (err) {
      console.error("Error loading onboarding data:", err);
      return null;
    }
  };

  useEffect(() => {
    setMounted(true);
    if (isMobile) setCollapsed(true);

    async function fetchChapters() {
      try {
        let url = "";
        if (pfId) {
          url = `http://localhost:8080/student/personalized-files/${pfId}`;
        } else if (courseId) {
          url = `http://localhost:8080/courses/${courseId}`;
        } else {
          console.warn("No courseId or pfId provided.");
          return;
        }

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expecting { id, content }
        const content = data.content || data?.content?.chapters;
        const parsed =
          typeof content === "string" ? JSON.parse(content) : content;

        if (parsed?.chapters) {
          const formattedChapters: Chapter[] = parsed.chapters.map(
            (ch: any) => ({
              chapterTitle: ch.chapterTitle,
              subsections: ch.subsections.map((sub: any) => ({
                title: sub.title,
                fullText: sub.fullText,
              })),
            })
          );

          setChapters(formattedChapters);
          console.log(
            "Loaded personalized chapters with fullText:",
            formattedChapters
          );
        } else {
          console.warn("No chapters found in personalized file content.");
        }
      } catch (err) {
        console.error("Failed to load content:", err);
      }
    }

    fetchChapters();
  }, [isMobile, courseId, pfId]);

  const toggleSidebar = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    onCollapseChange?.(newValue);
  };

  const handleChatClick = async (title: string, fullText: string) => {
    onLoadingStart?.();
  
    // OPTIONAL: if you want to send the title to AI for enhancement
    // const onboarding = await fetchOnboarding();
    // if (!onboarding) return;
  
    // setMessages([...]) if you're using the AI chat
  
    // For now, just send the raw content
    onLessonSelect?.(title, fullText);
  };
  

  // const handleChatClick = async (message: string) => {
  //   if (!message.trim()) return;
  //   onLoadingStart?.();

  //   const onboarding = await fetchOnboarding();
  //   if (!onboarding) return;

  //   const userProfile = {
  //     role: onboarding.job,
  //     traits: onboarding.traits,
  //     learningStyle: onboarding.learningStyle,
  //     depth: onboarding.depth,
  //     interests: onboarding.topics,
  //     personalization: onboarding.interests,
  //     schedule: onboarding.schedule,
  //   };

  //   const payload = {
  //     message,
  //     name: onboarding.name,
  //     expertise: "advanced",
  //     userProfile,
  //     courseId,
  //   };

  //   try {
  //     const response = await fetch("http://localhost:8080/chatwithpersona", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       credentials: "include",
  //       body: JSON.stringify(payload),
  //     });

  //     const data = await response.json();
  //     console.log("AI response:", data);

  //     if (data.response) {
  //       setMessages((prev) => [
  //         ...prev,
  //         { role: "user", content: message },
  //         { role: "assistant", content: data.response },
  //       ]);
  //       onLessonSelect?.(message, data.response);
  //     }
  //   } catch (err) {
  //     console.error("Chat request failed:", err);
  //   }
  // };

  if (!mounted) return null;

  return (
    <>
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-50 flex flex-col sidebar-gradient border-r border-sidebar-border/30",
          collapsed ? "w-16" : "w-64",
          isMobile && collapsed ? "translate-x-[-100%]" : "translate-x-0",
          "transition-all duration-300 ease-in-out",
          className
        )}
      >
        {/* Header */}
        <div className="h-[10vh] px-3 flex items-center justify-between border-b border-sidebar-border/30 relative">
          {!collapsed && (
            <Link href="/" className="flex items-center h-full relative pl-1">
              <Image
                src="/images/LearnXLogo.png"
                alt="Logo"
                width={288}
                height={197}
                className="max-h-[9vh] w-auto object-contain"
                priority
              />
            </Link>
          )}

          <div
            className={cn("absolute right-3", collapsed && "static mx-auto")}
          >
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="rounded-full h-8 w-8 min-w-[2rem] bg-sidebar-accent border-sidebar-border/50 hover:bg-sidebar-primary/20 hover:text-sidebar-primary"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto py-4 px-2 hide-scrollbar">
          <nav className="space-y-2">
            {chapters.map((chapter, chapterIdx) => (
              <div key={chapterIdx}>
                {!collapsed && (
                  <div className="text-blue-foreground font-bold text-sidebar-foreground mb-3 ml-2 tracking-wide uppercase">
                    {chapter.chapterTitle}
                  </div>
                )}
                {chapter.subsections.map((sub, itemIdx) => (
                  <div
                    key={itemIdx}
                    className={cn(
                      "transition-all duration-200 ease-in-out px-4 py-2 rounded-md cursor-pointer",
                      "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      collapsed
                        ? "flex justify-center"
                        : "text-[15px] font-medium text-sidebar-foreground/70"
                    )}
                    onClick={() => handleChatClick(sub.title, sub.fullText)}
                  >
                    {collapsed ? (
                      <div className="w-2 h-2 rounded-full bg-sidebar-foreground/50" />
                    ) : (
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {sub.title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border/30">
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            Exit to Dashboard
          </Button>
        </div>
      </aside>

      {isMobile && collapsed && (
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg border border-blue-400/30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </>
  );
};

export default Sidebar;
