import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressOverviewProps {
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
}

export const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  progressPercentage,
  completedLessons,
  totalLessons,
}) => {
  return (
    <div className="p-4 border-b border-gray-700/50">
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Overall Progress</span>
              <span className="text-white font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-gray-700" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/10 rounded p-2 text-center">
                <div className="text-green-400 font-semibold">
                  {completedLessons}
                </div>
                <div className="text-gray-300">Completed</div>
              </div>
              <div className="bg-white/10 rounded p-2 text-center">
                <div className="text-blue-400 font-semibold">
                  {totalLessons - completedLessons}
                </div>
                <div className="text-gray-300">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
