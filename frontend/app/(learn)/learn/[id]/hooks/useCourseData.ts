import { useState, useEffect } from 'react';
import { Chapter } from '../types/learn.types';

export const useCourseData = (pfId: string | null) => {
  const [courseName, setCourseName] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [recommendedLesson, setRecommendedLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);

  useEffect(() => {
    if (!pfId) return;
  
    const fetchCourseData = async () => {
      try {
        const res = await fetch(`http://localhost:8080/student/personalized-files/${pfId}`, {
          credentials: "include",
        });
  
        if (!res.ok) {
          throw new Error(`Failed to fetch personalized file`);
        }
  
        const data = await res.json();
  
        if (data.content) {
          const parsedContent = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
          
          if (parsedContent.courseName || parsedContent.title) {
            setCourseName(parsedContent.courseName || parsedContent.title || "Course Materials");
          }
          
          if (parsedContent.chapters) {
            const formattedChapters: Chapter[] = parsedContent.chapters.map((ch: any, index: number) => ({
              chapterTitle: ch.chapterTitle,
              subsections: ch.subsections.map((sub: any, subIndex: number) => ({
                title: sub.title,
                fullText: sub.fullText,
                type: subIndex % 3 === 0 ? 'video' : subIndex % 3 === 1 ? 'quiz' : 'text',
                completed: Math.random() > 0.7,
                timeToComplete: Math.floor(Math.random() * 15) + 5,
                lastVisited: Math.random() > 0.5 ? `${Math.floor(Math.random() * 7)} days ago` : undefined,
                score: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 70 : undefined
              })),
              progress: Math.floor(Math.random() * 100)
            }));
            
            setChapters(formattedChapters);
            
            const total = formattedChapters.reduce((acc, chapter) => acc + chapter.subsections.length, 0);
            const completed = formattedChapters.reduce((acc, chapter) => 
              acc + chapter.subsections.filter(sub => sub.completed).length, 0);
            
            setTotalLessons(total);
            setCompletedLessons(completed);

            // Find recommended lesson (first incomplete)
            for (let i = 0; i < formattedChapters.length; i++) {
              for (let j = 0; j < formattedChapters[i].subsections.length; j++) {
                if (!formattedChapters[i].subsections[j].completed) {
                  setRecommendedLesson({ moduleIndex: i, lessonIndex: j });
                  return;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      }
    };
  
    fetchCourseData();
  }, [pfId]);

  return {
    courseName,
    chapters,
    totalLessons,
    completedLessons,
    recommendedLesson
  };
};