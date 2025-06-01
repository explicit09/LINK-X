'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { SmartRecommendations } from '@/components/ai/SmartRecommendations';

interface AISuggestionsWidgetProps {
  courseId: string;
}

export function AISuggestionsWidget({ courseId }: AISuggestionsWidgetProps) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-600" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <SmartRecommendations
          courseId={courseId}
          prioritizedLayout={true}
          className="text-sm"
        />
      </CardContent>
    </Card>
  );
}
