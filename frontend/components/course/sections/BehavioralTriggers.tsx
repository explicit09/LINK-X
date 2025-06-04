'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Module } from '@/hooks/course/useCourseModules';

interface BehavioralTriggersProps {
  modules: Module[];
  showInsightsModal: boolean;
  showWeakAreasDrawer: boolean;
  showEfficiencyModal: boolean;
  showScheduleDrawer: boolean;
  onCloseInsights: () => void;
  onCloseWeakAreas: () => void;
  onCloseEfficiency: () => void;
  onCloseSchedule: () => void;
}

export function BehavioralTriggers({
  modules,
  showInsightsModal,
  showWeakAreasDrawer,
  showEfficiencyModal,
  showScheduleDrawer,
  onCloseInsights,
  onCloseWeakAreas,
  onCloseEfficiency,
  onCloseSchedule,
}: BehavioralTriggersProps) {
  const handleScheduleConfirm = () => {
    toast.success('3 study sessions scheduled! Calendar updated.', {
      action: {
        label: 'Undo',
        onClick: () => toast.info('Schedule changes reverted'),
      },
    });
    onCloseSchedule();
  };

  return (
    <>
      {/* Insights Modal */}
      {showInsightsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold">Learning Insights</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseInsights}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-medium text-green-800 mb-2">
                  Great Progress! 🎉
                </div>
                <div className="text-sm text-green-700">
                  You've completed 68% of the course and maintained a 4-day learning streak.
                  Your efficiency has improved by 12% this week!
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-800 mb-2">
                  Recommendation
                </div>
                <div className="text-sm text-blue-700">
                  Focus on Neural Networks module next - it's due soon and will boost your rank significantly.
                </div>
              </div>
            </div>
            
            <Button
              onClick={onCloseInsights}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}

      {/* Schedule Drawer */}
      {showScheduleDrawer && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
          <div className="p-6 h-full overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Smart Schedule</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseSchedule}>
                ✕
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-800 mb-2">
                  Recommended Schedule
                </div>
                <div className="text-sm text-blue-700 mb-3">
                  Based on your learning patterns and deadlines
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">Today, 7:00 PM</div>
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Urgent
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Neural Networks Assignment
                  </div>
                  <div className="text-xs text-gray-500">
                    90 minutes • Due in 3 days
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">Tomorrow, 2:00 PM</div>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Continue
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Gradient Descent Lab
                  </div>
                  <div className="text-xs text-gray-500">
                    60 minutes • In progress
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">Friday, 3:30 PM</div>
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      Review
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Linear Regression Review
                  </div>
                  <div className="text-xs text-gray-500">
                    45 minutes • Weak area
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onCloseSchedule}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirm Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weak Areas Drawer */}
      {showWeakAreasDrawer && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
          <div className="p-6 h-full overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Weak Areas Review</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseWeakAreas}>
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              {modules
                .filter((m) => m.weaknessScore > 30)
                .map((module) => (
                  <div
                    key={module.id}
                    className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-orange-900">
                          {module.title}
                        </div>
                        <div className="text-sm text-orange-600">
                          {module.confidenceLevel}% confidence •{' '}
                          {module.weaknessScore}% weakness
                        </div>
                      </div>
                      <Badge className="bg-orange-500 text-white text-xs">
                        Needs Review
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Button
                        size="sm"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => {
                          toast.success(
                            `Starting focused review of ${module.title}...`
                          );
                          onCloseWeakAreas();
                        }}
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Start Focused Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => {
                          toast.success(
                            `Scheduling ${module.title} review for tomorrow...`
                          );
                        }}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule Review
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Modal */}
      {showEfficiencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Efficiency Tips</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseEfficiency}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-800 mb-2">
                  🎯 Focus Improvement
                </div>
                <div className="text-sm text-blue-700">
                  Try 25-minute focused study sessions with 5-minute breaks (Pomodoro Technique)
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="font-medium text-green-800 mb-2">
                  📝 Active Learning
                </div>
                <div className="text-sm text-green-700">
                  Take notes while watching videos and summarize key concepts in your own words
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="font-medium text-purple-800 mb-2">
                  🔄 Spaced Repetition
                </div>
                <div className="text-sm text-purple-700">
                  Review previous materials before starting new ones to strengthen retention
                </div>
              </div>
            </div>
            
            <Button
              onClick={onCloseEfficiency}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Tips
            </Button>
          </div>
        </div>
      )}
    </>
  );
}