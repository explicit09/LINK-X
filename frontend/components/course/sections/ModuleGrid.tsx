'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  FileText,
  Video,
  Target,
  Zap,
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Module, Material } from '@/hooks/course/useCourseModules';

interface ModuleGridProps {
  modules: Module[];
  searchQuery: string;
  activeModule: string | null;
  onModuleSelect: (moduleId: string) => void;
  expandedMaterials: { [key: string]: boolean };
  onMaterialExpand: (moduleId: string) => void;
}

export function ModuleGrid({
  modules,
  searchQuery,
  activeModule,
  onModuleSelect,
  expandedMaterials,
  onMaterialExpand,
}: ModuleGridProps) {
  const handleQuickAction = (action: string, moduleTitle?: string) => {
    switch (action) {
      case 'next_urgent':
        toast.success(`Starting urgent task...`);
        break;
      case 'continue_learning':
        toast.success(`Continuing with ${moduleTitle}...`);
        break;
      case 'start_review':
        toast.success(`Starting focused review of ${moduleTitle}...`);
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  const handleMaterialClick = (material: Material, moduleId: string) => {
    if (material.completed) {
      toast.info(`Reviewing: ${material.title}`);
    } else if (material.urgent) {
      toast.success(`Starting urgent material: ${material.title}`);
    } else {
      toast.success(`Opening: ${material.title}`);
    }
  };

  // Filter modules based on search query
  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.materials_list.some(material =>
      material.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {filteredModules.map((module) => (
        <Card
          key={module.id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            module.status === 'urgent'
              ? 'border-red-300 bg-red-50 urgent-pulse'
              : module.status === 'completed'
                ? 'border-green-300 bg-green-50'
                : module.status === 'in-progress'
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
          } ${activeModule === module.id ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => onModuleSelect(module.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{module.title}</h3>
                  {module.status === 'urgent' && (
                    <Badge variant="destructive" className="text-xs">
                      URGENT
                    </Badge>
                  )}
                  {module.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {module.status === 'locked' && (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span>{module.completed}/{module.materials} materials</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {module.timeSpent} / {module.estimatedTime}
                  </span>
                </div>
                <Progress value={module.progress} className="mb-2" />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{module.progress}% complete</span>
                  {module.weaknessScore > 30 && (
                    <span className="text-orange-600 font-medium">
                      {module.confidenceLevel}% confidence
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {module.status !== 'locked' && (
              <div className="flex gap-2 mt-3">
                {module.status === 'urgent' && (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('next_urgent', module.title);
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Start Now
                  </Button>
                )}
                {module.status === 'in-progress' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('continue_learning', module.title);
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Continue
                  </Button>
                )}
                {module.weaknessScore > 30 && module.status !== 'locked' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('start_review', module.title);
                    }}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    Review
                  </Button>
                )}
              </div>
            )}

            {/* Expandable Material List */}
            {activeModule === module.id && module.materials_list.length > 0 && (
              <div className="border-t border-gray-200 bg-white mt-4 -mx-4 -mb-4">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      Materials
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMaterialExpand(module.id);
                      }}
                      className="text-xs"
                    >
                      {expandedMaterials[module.id] ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {expandedMaterials[module.id] ? 'Collapse' : 'Expand All'}
                    </Button>
                  </div>

                  {module.materials_list.map((material) => (
                    <div
                      key={material.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm ${
                        material.urgent
                          ? 'bg-red-50 border border-red-200 urgent-pulse'
                          : material.completed
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMaterialClick(material, module.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {material.type === 'video' && (
                          <Video className="h-4 w-4 text-red-500" />
                        )}
                        {material.type === 'pdf' && (
                          <FileText className="h-4 w-4 text-blue-500" />
                        )}
                        {material.type === 'assignment' && (
                          <Target className="h-4 w-4 text-orange-500" />
                        )}

                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {material.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {material.timeSpent || material.estimatedTime}
                            {material.urgent && ' • URGENT'}
                            {material.completed && ' • Completed'}
                          </div>
                        </div>
                      </div>

                      {material.completed && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {material.urgent && !material.completed && (
                        <Badge variant="destructive" className="text-xs">
                          URGENT
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}