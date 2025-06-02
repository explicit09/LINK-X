'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';

interface AIAssistantPanelProps {
  className?: string;
}

/**
 * AIAssistantPanel - AI-powered suggestions and actions
 * EXTRACTED from ModernDashboardV2.tsx sidebar to enable reuse
 */
export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  className,
}) => {
  const suggestions = [
    'Review struggling students in CS201',
    'Create quiz for WEB101 Module 5',
    'Schedule office hours for ML101',
    'Update course materials for next week',
  ];

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-[#2563EB]" />
        AI Assistant
      </h3>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-medium text-gray-900 mb-4">Suggested Actions</h4>
        <ul className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="p-1 bg-[#2563EB] rounded">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-gray-700 flex-1">{suggestion}</span>
            </motion.li>
          ))}
        </ul>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Get More Suggestions
        </motion.button>
      </div>
    </div>
  );
};