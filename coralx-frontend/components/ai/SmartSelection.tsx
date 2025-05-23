"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from 'sonner';

interface SmartSelectionProps {
  onAskAI?: (selectedText: string, action: string) => void;
  courseId?: string;
  materialId?: string;
}

interface SelectionPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SmartSelection({ onAskAI, courseId, materialId }: SmartSelectionProps) {
  const [selectedText, setSelectedText] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState<SelectionPosition>({ x: 0, y: 0, width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowTooltip(false);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3) {
        setShowTooltip(false);
        return;
      }

      // Get selection bounds
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Only show tooltip for meaningful text selections
      if (text.length >= 3 && text.split(' ').length >= 2) {
        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          width: rect.width,
          height: rect.height
        });
        setShowTooltip(true);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAIAction = async (action: string) => {
    if (!selectedText) return;

    setIsProcessing(true);
    
    try {
      // Call the parent component's AI handler
      onAskAI?.(selectedText, action);
      
      // Show success feedback
      sonnerToast.success(`AI is ${action === 'explain' ? 'explaining' : action === 'define' ? 'defining' : 'helping with'} the selected text`);
      
      // Clear selection and hide tooltip
      window.getSelection()?.removeAllRanges();
      setShowTooltip(false);
      setSelectedText("");
    } catch (error) {
      sonnerToast.error("Failed to process AI request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText);
    sonnerToast.success("Text copied to clipboard");
  };

  const handleClose = () => {
    window.getSelection()?.removeAllRanges();
    setShowTooltip(false);
    setSelectedText("");
  };

  if (!showTooltip || !selectedText) {
    return null;
  }

  // Calculate tooltip position to ensure it stays within viewport
  const tooltipX = Math.min(Math.max(position.x - 150, 10), window.innerWidth - 310);
  const tooltipY = position.y > 200 ? position.y - 80 : position.y + position.height + 10;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
      }}
    >
      <Card className="w-72 shadow-xl border-2 border-purple-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Ask AI about this text</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected text preview */}
          <div className="bg-gray-50 rounded-lg p-2 mb-3 border">
            <p className="text-xs text-gray-600 line-clamp-2 italic">
              &quot;{selectedText}&quot;
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="justify-start text-xs h-8"
              onClick={() => handleAIAction('explain')}
              disabled={isProcessing}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Explain
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start text-xs h-8"
              onClick={() => handleAIAction('define')}
              disabled={isProcessing}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Define
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start text-xs h-8"
              onClick={() => handleAIAction('examples')}
              disabled={isProcessing}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Examples
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-start text-xs h-8"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
              <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              Sending to AI tutor...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pointer triangle */}
      <div
        className="absolute w-3 h-3 bg-white border-l border-t border-purple-200 transform rotate-45"
        style={{
          left: "50%",
          top: position.y > 200 ? "100%" : "-6px",
          transform: position.y > 200 ? "translateX(-50%) rotate(225deg)" : "translateX(-50%) rotate(45deg)",
          marginLeft: position.y > 200 ? "0px" : "0px",
        }}
      />
    </div>
  );
} 