import React from 'react';
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  collapsed: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ collapsed }) => {
  const router = useRouter();

  if (collapsed) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
        Quick Actions
      </h3>
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10"
          onClick={() => router.push('/courses')}
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
      </div>
    </div>
  );
};