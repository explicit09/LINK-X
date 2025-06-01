import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen, GraduationCap, Lightbulb } from 'lucide-react';

interface RecentActivity {
  id: string;
  type: 'upload' | 'quiz' | 'ai_chat' | 'completion' | 'grade' | 'announcement';
  course: string;
  title: string;
  timestamp: string;
}

interface RecentActivitySectionProps {
  recentActivity: RecentActivity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'upload':
      return BookOpen;
    case 'grade':
      return GraduationCap;
    case 'announcement':
      return Lightbulb;
    default:
      return BookOpen;
  }
};

export const RecentActivitySection = ({
  recentActivity,
}: RecentActivitySectionProps) => {
  return (
    <Card className="bg-green-50 border-l-4 border-green-500 shadow-lg border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shadow-md">
            <Clock className="h-4 w-4 text-white" />
          </div>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-40 overflow-y-auto">
          {!recentActivity ||
          !Array.isArray(recentActivity) ||
          recentActivity.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Your actions will appear here</p>
            </div>
          ) : (
            (Array.isArray(recentActivity) ? recentActivity : [])
              .slice(0, 3)
              .map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200"
                  >
                    <IconComponent className="h-4 w-4 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm sidebar-text">{activity.title}</p>
                      <p className="text-xs sidebar-text-muted">
                        {activity.course} • {activity.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
