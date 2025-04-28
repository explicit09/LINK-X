import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const RecentlyCompletedCourses: React.FC = () => {
  const completedCourses = [
    "Introduction to Investing",
    "Financial Statement Analysis",
    "Risk Management Basics",
  ];

  return (
    <Card className="bg-white border border-gray-200 shadow-lg">
      <CardHeader className="relative flex justify-between items-center">
        <CardTitle className="text-xl text-blue-600">
          Recently Completed Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedCourses.map((course, index) => (
            <Card key={index} className="bg-gray-100 border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900">{course}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentlyCompletedCourses;
