"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsHeaderProps {
  title?: string;
  description?: string;
}

export const SettingsHeader = ({ 
  title = "Settings", 
  description = "Manage your account and preferences" 
}: SettingsHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <Link 
          href="/dashboard" 
          className={cn(
            "flex items-center gap-2 text-gray-600 hover:text-blue-600",
            "transition-colors duration-200 canvas-small font-medium"
          )}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="canvas-heading-1">{title}</h1>
          <p className="canvas-body text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};