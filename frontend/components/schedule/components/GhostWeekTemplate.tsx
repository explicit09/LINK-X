/**
 * Ghost Week Template - Shows sample schedule overlay
 * Inspires users and reduces blank-page anxiety
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GhostWeekTemplate() {
  const [showTemplate, setShowTemplate] = useState(true);

  const templateSessions = [
    { day: 1, time: '9:00 AM', title: 'CS229 Problem Set', duration: '1h 30m', color: '#3B82F6' },
    { day: 1, time: '2:00 PM', title: 'Study Group - Algorithms', duration: '45m', color: '#10B981' },
    { day: 2, time: '10:00 AM', title: 'Linear Algebra Review', duration: '1h', color: '#8B5CF6' },
    { day: 2, time: '3:00 PM', title: 'Lab Report Writing', duration: '2h', color: '#F59E0B' },
    { day: 3, time: '9:30 AM', title: 'CS224N Assignment', duration: '1h 15m', color: '#EF4444' },
    { day: 4, time: '11:00 AM', title: 'Research Paper Reading', duration: '45m', color: '#06B6D4' },
    { day: 4, time: '4:00 PM', title: 'Office Hours Prep', duration: '30m', color: '#84CC16' },
    { day: 5, time: '10:00 AM', title: 'Final Project Work', duration: '2h', color: '#F97316' },
  ];

  if (!showTemplate) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Overlay with low opacity */}
      <div className="absolute inset-0 bg-white/80"></div>
      
      {/* Ghost calendar grid */}
      <div className="relative h-full p-6">
        <div className="bg-white/90 rounded-lg border border-gray-200 overflow-hidden shadow-lg">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/90">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">This is what a balanced week looks like</h3>
              <button 
                onClick={() => setShowTemplate(false)}
                className="text-gray-400 hover:text-gray-600 pointer-events-auto"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sample week view */}
          <div className="p-4">
            <div className="grid grid-cols-5 gap-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, dayIndex) => (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 text-center pb-2 border-b">
                    {day}
                  </div>
                  
                  {templateSessions
                    .filter(session => session.day === dayIndex + 1)
                    .map((session, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-md text-xs opacity-70 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: session.color + '20', borderLeft: `3px solid ${session.color}` }}
                      >
                        <div className="font-medium text-gray-800">{session.time}</div>
                        <div className="text-gray-700">{session.title}</div>
                        <div className="text-gray-500">{session.duration}</div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Call to action */}
          <div className="p-4 bg-blue-50/90 border-t border-blue-200">
            <div className="text-center">
              <p className="text-sm text-blue-700 mb-3">
                💡 <strong>Smart tip:</strong> This balanced schedule includes breaks, mixed cognitive loads, and realistic time blocks.
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white pointer-events-auto"
                onClick={() => {
                  // TODO: Implement copy template functionality
                  console.log('Copy template clicked');
                  setShowTemplate(false);
                }}
              >
                🚀 Copy This Template
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}