import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatisticsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  subtext?: string;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ title, value, icon: Icon, subtext }) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className="h-5 w-5 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
        {subtext && <p className="text-xs text-blue-500 mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;
