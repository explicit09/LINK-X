import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardHeaderProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const DashboardHeader = ({
  currentUser,
  searchQuery,
  setSearchQuery,
}: DashboardHeaderProps) => {
  const router = useRouter();

  return (
    <div className="bg-white border-b border-gray-200 flex-shrink-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="canvas-heading-1">Dashboard</h1>
            <p className="canvas-body mt-1">
              Welcome back, {currentUser?.name || 'Student'}! Here's your
              learning overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" size="icon" className="modern-hover">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push('/courses?action=join')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 button-pulse shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Join Course
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
