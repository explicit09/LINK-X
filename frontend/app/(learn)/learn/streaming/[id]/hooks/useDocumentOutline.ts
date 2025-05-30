import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface Subsection {
  id: string;
  title: string;
  estimatedTokens: number;
}

export interface Chapter {
  id: string;
  title: string;
  estimatedTokens: number;
  subsections: Subsection[];
  isExpanded: boolean;
}

export interface DocumentOutline {
  fileId: string;
  fileName: string;
  chapters: Chapter[];
}

export function useDocumentOutline(fileId: string | string[]) {
  const [outline, setOutline] = useState<DocumentOutline | null>(null);
  const [isLoadingOutline, setIsLoadingOutline] = useState(true);

  useEffect(() => {
    const fetchOutline = async () => {
      if (!fileId) return;
      
      setIsLoadingOutline(true);
      
      try {
        // Check existing generated content
        const existingResponse = await fetch(`http://localhost:8080/api/v2/files/${fileId}/existing-content`, {
          credentials: 'include',
        });
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          if (existingData.content && existingData.content.length > 0) {
            // Restore from existing content
            const restoredOutline: DocumentOutline = {
              fileId: Array.isArray(fileId) ? fileId[0] : fileId,
              fileName: existingData.fileName || 'Document',
              chapters: []
            };
            
            // Group content by chapters
            const chapterMap = new Map<string, any>();
            existingData.content.forEach((item: any) => {
              const [chapterId, subsectionId] = item.section_key.split('-');
              if (!chapterMap.has(chapterId)) {
                chapterMap.set(chapterId, {
                  id: chapterId,
                  title: item.chapter_title || `Chapter ${chapterId}`,
                  estimatedTokens: 0,
                  subsections: [],
                  isExpanded: true
                });
              }
              chapterMap.get(chapterId).subsections.push({
                id: subsectionId,
                title: item.subsection_title || `Section ${subsectionId}`,
                estimatedTokens: 300
              });
            });
            
            restoredOutline.chapters = Array.from(chapterMap.values());
            setOutline(restoredOutline);
            setIsLoadingOutline(false);
            return;
          }
        }
        
        // If no existing content, generate new outline
        const outlineResponse = await fetch(`http://localhost:8080/api/v2/files/${fileId}/outline`, {
          credentials: 'include',
        });
        
        if (!outlineResponse.ok) {
          throw new Error(`HTTP error! status: ${outlineResponse.status}`);
        }
        
        const outlineData = await outlineResponse.json();
        
        if (outlineData.outline) {
          const processedOutline: DocumentOutline = {
            fileId: Array.isArray(fileId) ? fileId[0] : fileId,
            fileName: outlineData.fileName || 'Document',
            chapters: outlineData.outline.chapters?.map((chapter: any) => ({
              ...chapter,
              isExpanded: true,
              subsections: chapter.subsections || []
            })) || []
          };
          
          setOutline(processedOutline);
        }
      } catch (error) {
        console.error('Error fetching outline:', error);
        toast.error('Failed to load document outline. Please try again.');
      } finally {
        setIsLoadingOutline(false);
      }
    };

    fetchOutline();
  }, [fileId]);

  const toggleChapter = (chapterId: string) => {
    setOutline(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        chapters: prev.chapters.map(chapter =>
          chapter.id === chapterId
            ? { ...chapter, isExpanded: !chapter.isExpanded }
            : chapter
        )
      };
    });
  };

  return {
    outline,
    isLoadingOutline,
    toggleChapter
  };
}