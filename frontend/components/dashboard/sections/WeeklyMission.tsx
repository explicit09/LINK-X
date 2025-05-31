"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";

interface MissionItem {
  id: string;
  label: string;
  current: number;
  total: number;
  color: string;
}

interface WeeklyMissionProps {
  missions?: MissionItem[];
}

const defaultMissions: MissionItem[] = [
  { id: "1", label: "", current: 1, total: 2, color: "bg-gray-300" },
  { id: "2", label: "", current: 0, total: 1, color: "bg-gray-300" },
  { id: "3", label: "", current: 78, total: 150, color: "bg-blue-600" }
];

export function WeeklyMission({ missions = defaultMissions }: WeeklyMissionProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">This Week's Mission</h2>
        <Info className="h-4 w-4 text-gray-400" />
      </div>
      
      <div className="flex items-center space-x-8">
        {missions.map((mission, index) => (
          <div key={mission.id} className="flex flex-col items-center">
            <div className="relative w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-gray-200"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  d="M18 3 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30"
                />
                <path
                  className={mission.current === mission.total ? "stroke-blue-600" : "stroke-gray-300"}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(mission.current / mission.total) * 94}, 94`}
                  d="M18 3 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  ({mission.current}/{mission.total})
                </span>
              </div>
            </div>
            {index === 2 && (
              <span className="text-xs text-gray-500">({mission.current}/{mission.total})</span>
            )}
          </div>
        ))}
        
        {/* Progress bar for the last item */}
        <div className="flex-1 ml-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(missions[2]?.current / missions[2]?.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}