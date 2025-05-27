"use client";

import React, { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Circle, CheckCircle, Clock, ChevronDown, ChevronUp, MessageSquare, X, Send, Loader2, BookOpen, ChevronRight, Sparkles, MessageCircle, Maximize2, Minimize2, User, Bot, Activity, ArrowLeft, Trophy, Flame, Star, Zap, Target, Award, TrendingUp } from "lucide-react";
import { VariableSizeList as List } from 'react-window';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Subsection {
  id: string;
  title: string;
  estimatedTokens: number;
}

interface Chapter {
  id: string;
  title: string;
  estimatedTokens: number;
  subsections: Subsection[];
  isExpanded: boolean;
}

interface DocumentOutline {
  fileId: string;
  fileName: string;
  chapters: Chapter[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function StreamingLearnPage() {
  const { id: fileId } = useParams();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const courseId = searchParams.get('courseId');
  
  const [outline, setOutline] = useState<DocumentOutline | null>(null);
  const [isLoadingOutline, setIsLoadingOutline] = useState(true);
  const [streamingContent, setStreamingContent] = useState<Map<string, string>>(new Map());
  const [streamingStates, setStreamingStates] = useState<Map<string, 'waiting' | 'streaming' | 'complete'>>(new Map());
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [focusedSectionKey, setFocusedSectionKey] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<string[]>([]);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChatSuggestions, setShowChatSuggestions] = useState(true);
  const [chatGenerationTime, setChatGenerationTime] = useState<number | null>(null);
  const [streamingChatContent, setStreamingChatContent] = useState("");
  
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const prefetchQueue = useRef<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const metricsRef = useRef<Map<string, { startTime: number; firstTokenTime?: number; completionTime?: number }>>(new Map());
  
  // Gamification state
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);
  const xpPerSection = 100;
  const xpForLevel = useCallback((level: number) => level * 500, []);
  const currentLevelXP = userXP % xpForLevel(userLevel);
  const levelProgress = (currentLevelXP / xpForLevel(userLevel)) * 100;
  
  // Calculate progress
  const totalSections = outline?.chapters.reduce((acc, ch) => acc + ch.subsections.length, 0) || 0;
  const completedCount = Array.from(streamingStates.values()).filter(state => state === 'complete').length;
  const streamingCount = Array.from(streamingStates.values()).filter(state => state === 'streaming').length;
  const progress = totalSections > 0 ? (completedCount / totalSections) * 100 : 0;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle sticky sidebar
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Create a ref to hold the streamSection function
  const streamSectionRef = useRef<((chapterId: string, subsectionId: string) => Promise<void>) | null>(null);

  // Define streamSection function first to avoid ReferenceError
  const streamSection = useCallback(async (chapterId: string, subsectionId: string, regenerate: boolean = false) => {
    const sectionKey = `${chapterId}-${subsectionId}`;

    // Don't stream if already streaming (unless regenerating)
    const currentState = streamingStates.get(sectionKey);
    if (currentState === 'streaming' || (!regenerate && currentState === 'complete')) {
      return;
    }
    
    // Abort any existing controller for this section
    const existingController = abortControllers.current.get(sectionKey);
    if (existingController) {
      existingController.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllers.current.set(sectionKey, abortController);
    
    // Update state to streaming
    setStreamingStates((prev: Map<string, 'waiting' | 'streaming' | 'complete'>) => 
      new Map(prev).set(sectionKey, 'streaming')
    );
    setActiveSectionKey(sectionKey);
    
    const startTime = Date.now();
    metricsRef.current.set(sectionKey, { startTime });
    
    try {
      // Include previously generated content for context
      const previousSections = generatedSections
        .filter((key: string) => key !== sectionKey)
        .map((key: string) => ({
          section: key,
          content: streamingContent.get(key)?.slice(0, 200) || ''
        }));
      
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') as string;
      const response = await fetch(`${apiUrl}/api/personalize/${fileId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({
          chapterId,
          subsectionId,
          previousSections: previousSections.slice(-3), // Send last 3 sections for context
          regenerate: regenerate || false
        })
      });

      if (!response.ok) throw new Error('Streaming failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let buffer = '';
        let accumulatedContent = '';
        let firstTokenTime: number | null = null;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const data = JSON.parse(line.trim().slice(6));
                
                if (data.type === 'token') {
                  if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                    const latency = firstTokenTime - startTime;
                    console.log(`First token for ${sectionKey} in ${latency}ms`);
                    
                    // Update metrics
                    const metrics = metricsRef.current.get(sectionKey);
                    if (metrics) {
                      metrics.firstTokenTime = latency;
                    }
                  }
                  accumulatedContent += data.content;
                  setStreamingContent((prev: Map<string, string>) => new Map(prev).set(sectionKey, accumulatedContent));
                } else if (data.type === 'complete') {
                  const completeTime = Date.now();
                  const totalTime = completeTime - startTime;
                  console.log(`Section ${sectionKey} complete in ${totalTime}ms`);
                  
                  // Update metrics
                  const metrics = metricsRef.current.get(sectionKey);
                  if (metrics) {
                    metrics.completionTime = totalTime;
                  }
                  
                  setStreamingStates((prev: Map<string, 'waiting' | 'streaming' | 'complete'>) => new Map(prev).set(sectionKey, 'complete'));
                  setActiveSectionKey(null);
                  setGeneratedSections((prev: string[]) => [...prev, sectionKey]);
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
        
        reader.releaseLock();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Streaming error:', error);
        setStreamingStates((prev: Map<string, 'waiting' | 'streaming' | 'complete'>) => new Map(prev).set(sectionKey, 'waiting'));
      }
    } finally {
      abortControllers.current.delete(sectionKey);
    }
  }, [fileId, streamingStates, generatedSections, streamingContent]);

  // Update the ref when streamSection changes
  useEffect(() => {
    streamSectionRef.current = streamSection;
  }, [streamSection]);

  // Setup IntersectionObserver for auto-prefetch
  useEffect(() => {
    if (!outline) return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const sectionKey = entry.target.getAttribute('data-section-key');
        if (!sectionKey) return;

        if (entry.isIntersecting) {
          setVisibleSections(prev => new Set(prev).add(sectionKey));
          
          // Auto-prefetch next 2 sections when this section becomes visible
          const allSections: string[] = [];
          outline.chapters.forEach(ch => {
            ch.subsections.forEach(sub => {
              allSections.push(`${ch.id}-${sub.id}`);
            });
          });

          const currentIndex = allSections.indexOf(sectionKey);
          if (currentIndex !== -1) {
            // Prefetch next 2 sections
            for (let i = 1; i <= 2; i++) {
              const nextIndex = currentIndex + i;
              if (nextIndex < allSections.length) {
                const nextSectionKey = allSections[nextIndex];
                const state = streamingStates.get(nextSectionKey);
                
                // Only prefetch if not already started
                if (state === 'waiting' && !prefetchQueue.current.includes(nextSectionKey)) {
                  prefetchQueue.current.push(nextSectionKey);
                  const [chapterId, subsectionId] = nextSectionKey.split('-');
                  
                  // Delay prefetch slightly to prioritize current content
                  setTimeout(() => {
                    if (streamSectionRef.current) {
                      streamSectionRef.current(chapterId, subsectionId);
                    }
                    prefetchQueue.current = prefetchQueue.current.filter(k => k !== nextSectionKey);
                  }, 500 * i);
                }
              }
            }
          }
        } else {
          setVisibleSections(prev => {
            const newSet = new Set(prev);
            newSet.delete(sectionKey);
            return newSet;
          });
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    // Observe all content sections
    contentRefs.current.forEach((ref, key) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [outline, streamingStates]);

  // Load outline and check for existing content immediately
  useEffect(() => {
    loadOutline();
    checkExistingContent();
  }, [fileId]);

  // Auto-navigate to first section after outline loads
  useEffect(() => {
    if (outline && outline.chapters.length > 0 && !focusedSectionKey && generatedSections.length === 0) {
      const firstChapter = outline.chapters[0];
      const firstSection = firstChapter.subsections[0];
      if (firstSection) {
        handleSectionClick(firstChapter.id, firstSection.id);
      }
    }
  }, [outline]);

  const loadOutline = async () => {
    const startTime = Date.now();
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') as string;
      const response = await fetch(`${apiUrl}/api/personalize/${fileId}/outline`, {
        credentials: 'include'
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`Outline loaded in ${loadTime}ms`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to load outline');
      }
      
      const data = await response.json();
      const enhancedData = {
        ...data,
        chapters: data.chapters.map((ch: any, idx: number) => ({
          ...ch,
          isExpanded: true
        }))
      };
      
      setOutline(enhancedData);
      
      // Initialize all sections as waiting
      const states = new Map();
      enhancedData.chapters.forEach((ch: Chapter) => {
        ch.subsections.forEach((sub: Subsection) => {
          states.set(`${ch.id}-${sub.id}`, 'waiting');
        });
      });
      setStreamingStates(states);
      
    } catch (error) {
      console.error('Error loading outline:', error);
      toast.error('Failed to load document outline', {
        description: 'Please try refreshing the page'
      });
    } finally {
      setIsLoadingOutline(false);
    }
  };

  const checkExistingContent = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') as string;
      const response = await fetch(`${apiUrl}/api/personalize/${fileId}/check`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.content) {
          // Load existing personalized content
          const content = data.content;
          
          // Populate streamingContent and streamingStates from saved content
          Object.entries(content).forEach(([sectionKey, sectionContent]: [string, any]) => {
            streamingContent.set(sectionKey, sectionContent as string);
            streamingStates.set(sectionKey, 'complete');
            generatedSections.push(sectionKey);
          });
          
          setStreamingContent(new Map(streamingContent));
          setStreamingStates(new Map(streamingStates));
          setGeneratedSections([...generatedSections]);
          
          toast.success('Loaded your personalized content', {
            description: 'Continue learning where you left off'
          });
        }
      }
    } catch (error) {
      console.error('Error checking existing content:', error);
    }
  };

  const savePersonalizedContent = async () => {
    try {
      // Convert Map to plain object for JSON
      const contentObj: Record<string, string> = {};
      streamingContent.forEach((value: string, key: string) => {
        if (streamingStates.get(key) === 'complete') {
          contentObj[key] = value;
        }
      });
      
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') as string;
      await fetch(`${apiUrl}/api/personalize/${fileId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: contentObj
        })
      });
    } catch (error) {
      console.error('Error saving personalized content:', error);
    }
  };

  // Save content when a new section is completed
  useEffect(() => {
    const completedCount = Array.from(streamingStates.values()).filter(state => state === 'complete').length;
    if (completedCount > 0) {
      // Debounce saving to avoid too many requests
      const timer = setTimeout(() => {
        savePersonalizedContent();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [streamingStates]);

  // Update the ref when streamSection is defined
  useEffect(() => {
    streamSectionRef.current = streamSection;
  }, [streamSection]);

  const handleSectionClick = useCallback((chapterId: string, subsectionId: string, regenerate: boolean = false) => {
    const sectionKey = `${chapterId}-${subsectionId}`;
    
    // Set as focused section (show only this one)
    setFocusedSectionKey(sectionKey);
    
    // Stream if not already complete or if regenerating
    if (regenerate || streamingStates.get(sectionKey) !== 'complete') {
      streamSection(chapterId, subsectionId, regenerate);
    }
    
    // Scroll to top of content area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [streamSection, streamingStates]);

  const regenerateSection = useCallback((chapterId: string, subsectionId: string) => {
    const sectionKey = `${chapterId}-${subsectionId}`;
    
    // Clear existing content
    setStreamingContent((prev: Map<string, string>) => {
      const newMap = new Map(prev);
      newMap.delete(sectionKey);
      return newMap;
    });
    
    // Reset state to waiting
    setStreamingStates((prev: Map<string, 'waiting' | 'streaming' | 'complete'>) => new Map(prev).set(sectionKey, 'waiting'));
    
    // Remove from generated sections
    setGeneratedSections((prev: string[]) => prev.filter(key => key !== sectionKey));
    
    // Regenerate with new content
    handleSectionClick(chapterId, subsectionId, true);
  }, [handleSectionClick]);

  const toggleChapter = (chapterId: string) => {
    setOutline(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter: Chapter) => 
          chapter.id === chapterId ? { ...chapter, isExpanded: !chapter.isExpanded } : chapter
        )
      };
    });
  };

  const getStatusIcon = (state: 'waiting' | 'streaming' | 'complete' | undefined) => {
    switch (state) {
      case 'complete':
        return (
          <div className="relative">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
        );
      case 'streaming':
        return (
          <div className="relative">
            <MessageCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 bg-blue-600 rounded-full animate-ping opacity-30" />
            </div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
          </div>
        );
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, messageContent?: string) => {
    if (e) e.preventDefault();
    const content = messageContent || chatInput.trim();
    if (!content || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date()
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);
    setShowChatSuggestions(false);
    setStreamingChatContent("");
    setChatGenerationTime(null);

    // Add optimistic assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setChatMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);

    try {
      // Get context from current/focused section
      let context = "";
      if (focusedSectionKey) {
        const content = streamingContent.get(focusedSectionKey);
        if (content) {
          context = `Current section: ${focusedSectionKey}\nContent: ${content.slice(0, 1000)}...\n\n`;
        }
      }

      const startTime = Date.now();
      const response = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') as string}/ai-chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userMessage: content,
          fileId: fileId,
          messages: chatMessages.slice(-10),
          context: context + `Document: ${outline?.fileName || 'Unknown'}`
        })
      });

      if (!response.ok) throw new Error('Chat streaming failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let buffer = '';
        let accumulatedContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const data = JSON.parse(line.trim().slice(6));
                
                if (data.type === 'token') {
                  accumulatedContent += data.content;
                  setStreamingChatContent(accumulatedContent);
                  
                  // Update message content
                  setChatMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) => 
                    msg.id === assistantId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                } else if (data.type === 'done') {
                  const elapsed = (Date.now() - startTime) / 1000;
                  setChatGenerationTime(elapsed);
                }
              } catch (e) {
                console.error('SSE parse error:', e);
              }
            }
          }
        }
        
        reader.releaseLock();
      }
      
      setStreamingChatContent("");
    } catch (error) {
      console.error('Chat streaming error:', error);
      
      // Remove the optimistic message and show error
      setChatMessages((prev: ChatMessage[]) => prev.filter((msg: ChatMessage) => msg.id !== assistantId));
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages((prev: ChatMessage[]) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Chat suggestion buttons
  const chatSuggestions = [
    {
      id: "explain",
      text: "Explain this section",
      icon: Sparkles,
      color: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100",
      prompt: "Can you explain this section in simple terms?"
    },
    {
      id: "examples",
      text: "Give examples",
      icon: BookOpen,
      color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
      prompt: "Can you provide practical examples for this content?"
    },
    {
      id: "quiz",
      text: "Quick quiz",
      icon: MessageSquare,
      color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
      prompt: "Create a quick quiz to test my understanding"
    },
    {
      id: "summarize",
      text: "Summarize",
      icon: Activity,
      color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
      prompt: "Summarize the key points from this section"
    }
  ];

  const StreamingText = ({ sectionKey }: { sectionKey: string }) => {
    const content = streamingContent.get(sectionKey);
    const state = streamingStates.get(sectionKey);
    const [showCaret, setShowCaret] = useState(true);
    
    // Blink caret animation
    useEffect(() => {
      if (state === 'streaming') {
        const interval = setInterval(() => {
          setShowCaret(prev => !prev);
        }, 530);
        return () => clearInterval(interval);
      }
    }, [state]);
    
    if (!content && state === 'waiting') {
      return (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Click this section to generate personalized content</p>
        </div>
      );
    }
    
    if (!content && state === 'streaming') {
      return (
        <div className="space-y-3 py-4">
          {/* Skeleton lines that disappear as content arrives */}
          <div className="h-5 bg-gray-100 rounded animate-pulse" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-[95%]" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-[90%]" />
          <div className="h-5 bg-gray-100 rounded animate-pulse w-[85%]" />
        </div>
      );
    }
    
    // Process content to add paragraph breaks every 3-5 sentences
    const processedContent = content ? content.split('\n\n').map((paragraph, idx) => {
      // Split into sentences and group them
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      const groups = [];
      
      for (let i = 0; i < sentences.length; i += 4) {
        groups.push(sentences.slice(i, i + 4).join(' ').trim());
      }
      
      return groups.join('\n\n');
    }).join('\n\n') : '';
    
    return (
      <div className="prose prose-gray max-w-none">
        <div className="text-gray-700 leading-[1.75] whitespace-pre-wrap break-words" style={{ maxWidth: '680px' }}>
          {processedContent}
          {state === 'streaming' && (
            <span 
              className={cn(
                "inline-block w-[2px] h-5 bg-blue-600 ml-0.5 align-middle transition-opacity duration-100",
                showCaret ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </div>
      </div>
    );
  };

  if (isLoadingOutline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading document structure...</p>
        </div>
      </div>
    );
  }

  // Performance Metrics Dashboard
  const PerformanceMetrics = () => {
    const [frameStats, setFrameStats] = useState({ dropped: 0, total: 0 });
    const [memoryUsage, setMemoryUsage] = useState(0);
    
    useEffect(() => {
      if (!showMetrics) return;
      
      let frameCount = 0;
      let droppedFrames = 0;
      let lastFrameTime = performance.now();
      let rafId: number;
      
      const checkPerformance = () => {
        frameCount++;
        const now = performance.now();
        const frameDuration = now - lastFrameTime;
        
        if (frameDuration > 16.67) {
          droppedFrames++;
        }
        
        setFrameStats({ dropped: droppedFrames, total: frameCount });
        
        // Check memory if available
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          setMemoryUsage(Math.round(memory.usedJSHeapSize / 1048576));
        }
        
        lastFrameTime = now;
        rafId = requestAnimationFrame(checkPerformance);
      };
      
      rafId = requestAnimationFrame(checkPerformance);
      return () => cancelAnimationFrame(rafId);
    }, [showMetrics]);
    
    const allMetrics = Array.from(metricsRef.current.entries());
    const avgFirstToken = allMetrics.filter(([_, m]) => m.firstTokenTime).reduce((acc, [_, m]) => acc + (m.firstTokenTime || 0), 0) / allMetrics.filter(([_, m]) => m.firstTokenTime).length || 0;
    const p95Completion = allMetrics.filter(([_, m]) => m.completionTime)
      .map(([_, m]) => m.completionTime || 0)
      .sort((a, b) => a - b)[Math.floor(allMetrics.length * 0.95)] || 0;
    
    const getColor = (metric: string, value: number) => {
      switch (metric) {
        case 'firstToken': return value < 300 ? 'text-green-600' : value < 500 ? 'text-yellow-600' : 'text-red-600';
        case 'completion': return value < 4000 ? 'text-green-600' : value < 6000 ? 'text-yellow-600' : 'text-red-600';
        case 'frames': return value < 5 ? 'text-green-600' : value < 10 ? 'text-yellow-600' : 'text-red-600';
        case 'memory': return value < 150 ? 'text-green-600' : value < 200 ? 'text-yellow-600' : 'text-red-600';
        default: return 'text-gray-600';
      }
    };
    
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-lg bg-white/95 backdrop-blur z-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Performance Metrics</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowMetrics(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Avg First Token</span>
              <span className={`font-mono ${getColor('firstToken', avgFirstToken)}`}>
                {avgFirstToken.toFixed(0)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>P95 Completion</span>
              <span className={`font-mono ${getColor('completion', p95Completion)}`}>
                {p95Completion.toFixed(0)}ms
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Dropped Frames</span>
              <span className={`font-mono ${getColor('frames', (frameStats.dropped / frameStats.total) * 100)}`}>
                {frameStats.total > 0 ? ((frameStats.dropped / frameStats.total) * 100).toFixed(1) : 0}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Memory Usage</span>
              <span className={`font-mono ${getColor('memory', memoryUsage)}`}>
                {memoryUsage}MB
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Update XP when sections complete
  useEffect(() => {
    const completed = Array.from(streamingStates.values()).filter(state => state === 'complete').length;
    const newXP = completed * xpPerSection;
    
    if (newXP > userXP) {
      const xpGained = newXP - userXP;
      setUserXP(newXP);
      setLastXPGain(xpGained);
      setShowXPAnimation(true);
      
      // Hide XP animation after 2 seconds
      setTimeout(() => setShowXPAnimation(false), 2000);
      
      // Check for level up
      const newLevel = Math.floor(newXP / 500) + 1;
      if (newLevel > userLevel) {
        setUserLevel(newLevel);
        toast.success(`Level Up! You're now level ${newLevel}!`, {
          description: `Keep learning to reach level ${newLevel + 1}`,
          icon: <Trophy className="h-4 w-4 text-yellow-500" />
        });
      }
      
      // Achievement checks
      if (completed === 1 && !achievements.includes('first_section')) {
        setAchievements([...achievements, 'first_section']);
        toast.success('Achievement Unlocked: First Steps!', {
          description: 'You completed your first section',
          icon: <Star className="h-4 w-4 text-yellow-500" />
        });
      }
      
      if (completed === totalSections && !achievements.includes('complete_doc')) {
        setAchievements([...achievements, 'complete_doc']);
        toast.success('Achievement Unlocked: Document Master!', {
          description: 'You completed all sections',
          icon: <Award className="h-4 w-4 text-purple-500" />
        });
      }
    }
  }, [streamingStates, userXP, userLevel, achievements, totalSections, xpForLevel, xpPerSection]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Gamification Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Left: Level & XP */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className={cn(
                    "w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300",
                    "group-hover:scale-110 group-hover:shadow-xl"
                  )}>
                    {userLevel}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center animate-bounce">
                    <Trophy className="h-3 w-3 text-yellow-900" />
                  </div>
                  {/* Level up animation ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-30" />
                  
                  {/* XP Gain Animation */}
                  {showXPAnimation && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                      <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        +{lastXPGain} XP
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500">Level {userLevel}</div>
                  <div className="flex items-center gap-2">
                    <Progress value={levelProgress} className="w-24 h-2" />
                    <span className="text-xs text-gray-600">{currentLevelXP}/{xpForLevel(userLevel)} XP</span>
                  </div>
                </div>
              </div>
              
              {/* Streak */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
                  <Flame className={cn(
                    "h-4 w-4 text-orange-500 transition-all",
                    streak > 0 && "animate-pulse"
                  )} />
                  <span className="text-sm font-medium text-orange-700">{streak || 1} day streak</span>
                </div>
                {streak >= 7 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
            </div>
            
            {/* Center: Progress Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{completedCount}</div>
                <div className="text-xs text-gray-500">Sections Done</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalSections - completedCount}</div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(progress)}%</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
            
            {/* Right: Achievements & Motivation */}
            <div className="flex items-center gap-4">
              {/* Recent Achievement */}
              {achievements.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">{achievements.length} Achievements</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View all your achievements</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {/* Motivational Message */}
              <div className="text-sm text-gray-600 font-medium flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                {progress < 25 ? "Great start! Keep going!" :
                 progress < 50 ? "You're making progress!" :
                 progress < 75 ? "More than halfway there!" :
                 progress < 100 ? "Almost done, finish strong!" :
                 "Congratulations! 🎉"}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1">
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          "w-80 bg-white border-r border-gray-200 transition-all duration-300",
          isSticky ? "fixed top-0 left-0 h-screen z-10 shadow-lg" : "relative"
        )}
      >
        <div className="p-6 border-b border-gray-200 bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (courseId) {
                router.push(`/courses/${courseId}`);
              } else {
                router.back();
              }
            }}
            className="mb-3 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">{outline?.fileName}</h2>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{completedCount} of {totalSections} sections</span>
              {streamingCount > 0 && (
                <span className="text-blue-600 font-medium">Generating...</span>
              )}
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4">
            {outline?.chapters.map((chapter: Chapter) => (
              <div key={chapter.id} className="mb-4">
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {chapter.isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{chapter.title}</span>
                  </div>
                </button>
                
                {chapter.isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {chapter.subsections.map((subsection: Subsection) => {
                      const sectionKey = `${chapter.id}-${subsection.id}`;
                      const state = streamingStates.get(sectionKey);
                      const isFocused = focusedSectionKey === sectionKey;
                      
                      return (
                        <button
                          key={subsection.id}
                          onClick={() => handleSectionClick(chapter.id, subsection.id)}
                          className={cn(
                            "w-full text-left p-2 rounded-md transition-all duration-200 flex items-center gap-2 group",
                            isFocused && "bg-blue-100 text-blue-700 font-medium",
                            state === 'streaming' && !isFocused && "bg-blue-50 text-blue-700",
                            state === 'complete' && !isFocused && "text-gray-700 hover:bg-gray-50",
                            state === 'waiting' && !isFocused && "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                          )}
                        >
                          {getStatusIcon(state)}
                          <span className="text-sm flex-1">{subsection.title}</span>
                          {state === 'waiting' && (
                            <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - with margin when sidebar is sticky */}
      <div className={cn("flex-1", isSticky && "ml-80", isChatOpen && "mr-96")}>
        <div className="max-w-[680px] mx-auto p-8">
          {/* Show focused section or instructions */}
          {focusedSectionKey ? (
            <div>
              {outline?.chapters.map((chapter: Chapter, moduleIndex: number) => (
                chapter.subsections.map((subsection: Subsection) => {
                  const sectionKey = `${chapter.id}-${subsection.id}`;
                  if (sectionKey !== focusedSectionKey) return null;
                  
                  const state = streamingStates.get(sectionKey);
                  
                  return (
                    <div 
                      key={subsection.id} 
                      className="scroll-mt-24"
                      data-section-key={sectionKey}
                      ref={(el: HTMLDivElement) => {
                        if (el) contentRefs.current.set(sectionKey, el);
                      }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          {getStatusIcon(state)}
                          {subsection.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {state === 'complete' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => regenerateSection(chapter.id, subsection.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Regenerate
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Generate new personalized content</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setFocusedSectionKey(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Show all
                          </Button>
                        </div>
                      </div>
                      
                      <Card className="overflow-hidden border-gray-200 shadow-sm">
                        <CardContent className="p-6">
                          <StreamingText sectionKey={sectionKey} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                })
              ))}
            </div>
          ) : (
            <div>
              <div className="mb-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Personalized Learning Experience
                </h1>
                <p className="text-lg text-gray-600">
                  Click on any section in the sidebar to generate personalized content tailored to your learning style.
                </p>
              </div>

              {/* Show all generated sections with virtualization */}
              {generatedSections.length > 10 ? (
                // Use virtualization for more than 10 sections
                <List
                  height={window.innerHeight - 200}
                  itemCount={generatedSections.length}
                  itemSize={(index: number) => 300} // Estimated height, will be measured
                  width="100%"
                  itemData={generatedSections}
                >
                  {({ index, style }: { index: number; style: CSSProperties }) => {
                    const sectionKey = generatedSections[index];
                    const [chapterId, subsectionId] = sectionKey.split('-');
                    const chapter = outline?.chapters.find((ch: Chapter) => ch.id === chapterId);
                    const subsection = chapter?.subsections.find((sub: Subsection) => sub.id === subsectionId);
                    const state = streamingStates.get(sectionKey);
                    
                    if (!subsection) return null;
                    
                    return (
                      <div style={style}>
                        <div 
                          className="mb-8 px-4"
                          data-section-key={sectionKey}
                          ref={(el: HTMLDivElement) => {
                            if (el) contentRefs.current.set(sectionKey, el);
                          }}
                        >
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            {getStatusIcon(state)}
                            {subsection.title}
                          </h3>
                          
                          <Card className="overflow-hidden border-gray-200 shadow-sm">
                            <CardContent className="p-6">
                              <StreamingText sectionKey={sectionKey} />
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  }}
                </List>
              ) : (
                // Regular rendering for fewer sections
                <div className="space-y-6">
                  {generatedSections.map((sectionKey: string) => {
                    const [chapterId, subsectionId] = sectionKey.split('-');
                    const chapter = outline?.chapters.find((ch: Chapter) => ch.id === chapterId);
                    const subsection = chapter?.subsections.find((sub: Subsection) => sub.id === subsectionId);
                    const state = streamingStates.get(sectionKey);
                    
                    if (!subsection) return null;
                    
                    return (
                      <div 
                        key={sectionKey} 
                        className="mb-8 scroll-mt-24"
                        data-section-key={sectionKey}
                        ref={(el) => {
                          if (el) contentRefs.current.set(sectionKey, el);
                        }}
                      >
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          {getStatusIcon(state)}
                          {subsection.title}
                        </h3>
                        
                        <Card className="overflow-hidden border-gray-200 shadow-sm">
                          <CardContent className="p-6">
                            <StreamingText sectionKey={sectionKey} />
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern Chat Panel */}
      {isChatOpen && (
        <div className={cn(
          "fixed right-0 top-[73px] h-[calc(100vh-73px)] w-[420px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col transition-all duration-300",
          isChatMinimized && "h-16 overflow-hidden"
        )}>
          {/* Enhanced Chat Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
            <div className="relative p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                </div>
                {!isChatMinimized && (
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Study Assistant</h3>
                    <p className="text-xs text-white/80">Always here to help you learn</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsChatMinimized(!isChatMinimized)}
                        className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-lg transition-all"
                      >
                        {isChatMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isChatMinimized ? 'Expand' : 'Minimize'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsChatOpen(false)}
                        className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close chat</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {!isChatMinimized && (
            <>
              {/* Chat Messages Area */}
              <ScrollArea className="flex-1 bg-gray-50/50" ref={chatScrollRef}>
                <div className="p-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                        <Bot className="h-10 w-10 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Welcome to your AI tutor!</h4>
                      <p className="text-sm text-gray-600 max-w-xs mx-auto">
                        I'm here to help you understand the content, answer questions, and guide your learning journey.
                      </p>
                      
                      {/* Suggestion Cards */}
                      {showChatSuggestions && (
                        <div className="mt-6 space-y-2">
                          <p className="text-xs text-gray-500 font-medium mb-3">Quick actions:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {chatSuggestions.map((suggestion: { id: string; text: string; icon: any; color: string; prompt: string }) => {
                              const IconComponent = suggestion.icon;
                              return (
                                <button
                                  key={suggestion.id}
                                  onClick={() => handleChatSubmit(undefined, suggestion.prompt)}
                                  className={cn(
                                    "flex items-center gap-2 p-3 rounded-lg border text-left transition-all hover:scale-[1.02]",
                                    suggestion.color
                                  )}
                                >
                                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs font-medium">{suggestion.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message: ChatMessage, index: number) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                            message.role === 'user' && "justify-end"
                          )}
                        >
                          {message.role === 'assistant' && (
                            <Avatar className="h-9 w-9 border-2 border-blue-100 shadow-sm flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600">
                                <Bot className="h-5 w-5 text-white" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                              message.role === 'user' 
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white" 
                                : "bg-white border border-gray-200"
                            )}
                          >
                            {message.content ? (
                              <div className={cn(
                                "text-sm leading-relaxed",
                                message.role === 'user' ? "text-white" : "text-gray-700"
                              )}>
                                {message.content}
                                {isChatLoading && index === chatMessages.length - 1 && message.role === 'assistant' && (
                                  <span className="inline-block w-0.5 h-4 bg-gray-600 animate-pulse ml-1 align-middle" />
                                )}
                              </div>
                            ) : (
                              // Loading skeleton for empty assistant messages
                              isChatLoading && index === chatMessages.length - 1 && (
                                <div className="space-y-2">
                                  <Skeleton className="h-3 w-full" />
                                  <Skeleton className="h-3 w-[90%]" />
                                  <Skeleton className="h-3 w-[70%]" />
                                </div>
                              )
                            )}
                            <div className={cn(
                              "text-[10px] mt-2 opacity-60",
                              message.role === 'user' ? "text-blue-100" : "text-gray-500"
                            )}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {chatGenerationTime && index === chatMessages.length - 1 && message.role === 'assistant' && (
                                <span className="ml-2">• {chatGenerationTime.toFixed(1)}s</span>
                              )}
                            </div>
                          </div>

                          {message.role === 'user' && (
                            <Avatar className="h-9 w-9 border-2 border-green-100 shadow-sm flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600">
                                <User className="h-5 w-5 text-white" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                    {isChatLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </ScrollArea>

              {/* Enhanced Input Area */}
              <div className="border-t border-gray-200 bg-white p-4">
                <form onSubmit={handleChatSubmit} className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything about this lesson..."
                      className="w-full min-h-[90px] max-h-[150px] resize-none pr-12 rounded-xl border-gray-200 
                                 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all 
                                 placeholder:text-gray-400 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSubmit(e);
                        }
                      }}
                      disabled={isChatLoading}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isChatLoading || !chatInput.trim()}
                      className="absolute bottom-3 right-3 h-9 w-9 p-0 rounded-lg 
                                 bg-gradient-to-r from-blue-600 to-purple-600 
                                 hover:from-blue-700 hover:to-purple-700 
                                 disabled:opacity-50 disabled:cursor-not-allowed 
                                 transition-all shadow-md"
                    >
                      {isChatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        AI-powered
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-500" />
                        Instant help
                      </span>
                    </div>
                    <span className="text-gray-400">Enter to send</span>
                  </div>
                </form>

                {/* Quick Actions for existing conversations */}
                {chatMessages.length > 0 && showChatSuggestions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chatSuggestions.slice(0, 2).map((suggestion: { id: string; text: string; icon: any; color: string; prompt: string }) => {
                      const IconComponent = suggestion.icon;
                      return (
                        <button
                          key={suggestion.id}
                          onClick={() => handleChatSubmit(undefined, suggestion.prompt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 
                                     hover:bg-gray-200 text-xs font-medium text-gray-700 transition-all"
                        >
                          <IconComponent className="h-3 w-3" />
                          {suggestion.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Chat Button (when closed) */}
      {!isChatOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Open Study Assistant</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Performance Metrics Toggle (Dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <Button
          onClick={() => setShowMetrics(!showMetrics)}
          className="fixed bottom-6 left-6 h-10 px-4 shadow-lg bg-gray-800 hover:bg-gray-900 text-white"
          size="sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Metrics
        </Button>
      )}
      
      {/* Performance Metrics Dashboard */}
      {showMetrics && <PerformanceMetrics />}
      </div>
    </div>
  );
}