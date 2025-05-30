import React from 'react';
import { User } from "lucide-react";

export const Avatar: React.FC = () => (
  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
    <User className="h-5 w-5 text-white" />
  </div>
);