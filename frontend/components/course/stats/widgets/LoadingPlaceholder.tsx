"use client";

import { BookOpen } from "lucide-react";

export function LoadingPlaceholder() {
  return (
    <div className="p-6 h-full flex items-center justify-center">
      <div className="text-center text-gray-500">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Course information loading...</p>
      </div>
    </div>
  );
}