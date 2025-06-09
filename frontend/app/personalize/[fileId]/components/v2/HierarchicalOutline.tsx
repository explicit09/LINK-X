'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle, Circle, RadioButtonChecked } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  completed: boolean;
  active?: boolean;
}

interface Topic {
  id: string;
  title: string;
  completed: boolean;
  active?: boolean;
  sections?: Section[];
}

interface HierarchicalOutlineProps {
  topics: Topic[];
  selectedTopic: string | null;
  selectedSection: string | null;
  onTopicSelect: (topicId: string) => void;
  onSectionSelect: (sectionId: string) => void;
}

export function HierarchicalOutline({
  topics,
  selectedTopic,
  selectedSection,
  onTopicSelect,
  onSectionSelect,
}: HierarchicalOutlineProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    new Set(topics.filter(t => t.active).map(t => t.id))
  );
  
  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };
  
  const getTopicIcon = (topic: Topic) => {
    if (topic.completed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (topic.active) {
      return <RadioButtonChecked className="h-4 w-4 text-blue-500" />;
    }
    return <Circle className="h-4 w-4 text-gray-400" />;
  };
  
  const getSectionIcon = (section: Section) => {
    if (section.completed) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    } else if (section.active) {
      return <RadioButtonChecked className="h-3 w-3 text-blue-500" />;
    }
    return <Circle className="h-3 w-3 text-gray-400" />;
  };
  
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
        Outline
      </h2>
      
      <div className="space-y-1">
        {topics.map((topic) => (
          <div key={topic.id}>
            <button
              onClick={() => {
                toggleTopic(topic.id);
                onTopicSelect(topic.id);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-sm",
                "hover:bg-gray-100",
                topic.active && "bg-blue-50 text-blue-700",
                selectedTopic === topic.id && "bg-gray-100"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedTopics.has(topic.id) && "rotate-90"
                )}
              />
              {getTopicIcon(topic)}
              <span className={cn(
                "text-left flex-1",
                topic.completed && "text-gray-500"
              )}>
                {topic.title}
              </span>
              {topic.active && topic.sections && (
                <span className="text-xs text-gray-500">
                  {topic.sections.filter(s => s.completed).length}/{topic.sections.length}
                </span>
              )}
            </button>
            
            {expandedTopics.has(topic.id) && topic.sections && (
              <div className="ml-6 mt-1 space-y-1">
                {topic.sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => onSectionSelect(section.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm",
                      "hover:bg-gray-100",
                      section.active && "bg-blue-50 text-blue-700",
                      selectedSection === section.id && "bg-gray-100"
                    )}
                  >
                    <div className="w-4" /> {/* Spacer for alignment */}
                    {getSectionIcon(section)}
                    <span className={cn(
                      "text-left flex-1",
                      section.completed && "text-gray-500"
                    )}>
                      {section.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Queue Section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">
          Queue
        </h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2 px-2">
            <span className="text-gray-400">•</span>
            <span>Examples</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <span className="text-gray-400">•</span>
            <span>Practice Problems</span>
          </div>
        </div>
      </div>
    </div>
  );
}