import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Plus, Upload, Lightbulb } from 'lucide-react';

interface EmptyModuleStateProps {
  onCreateModule: () => void;
  canCreateModule?: boolean;
  className?: string;
}

export function EmptyModuleState({
  onCreateModule,
  canCreateModule = false,
  className = '',
}: EmptyModuleStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="text-center py-12">
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-blue-50 rounded-full">
              <BookOpen className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              No modules yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {canCreateModule
                ? 'Create your first module to organize course materials and make them accessible to students.'
                : "Your instructor hasn't created any modules yet. Check back later for course materials."}
            </p>
          </div>

          {/* Action Button */}
          {canCreateModule && (
            <div>
              <Button onClick={onCreateModule} size="lg" className="mx-auto">
                <Plus className="h-5 w-5 mr-2" />
                Create First Module
              </Button>
            </div>
          )}

          {/* Tips */}
          {canCreateModule && (
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3 text-left">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-medium text-blue-900 mb-1">Pro Tips:</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Organize content by topics or weeks</li>
                    <li>• Upload PDFs, documents, audio, and video files</li>
                    <li>
                      • Students can ask AI questions about uploaded materials
                    </li>
                    <li>• Use descriptive module names for easy navigation</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Student View */}
          {!canCreateModule && (
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3 text-left">
                <Upload className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-medium text-gray-900 mb-1">
                    When modules are available:
                  </h4>
                  <ul className="text-gray-700 space-y-1">
                    <li>• Access course materials organized by topic</li>
                    <li>• Download files for offline study</li>
                    <li>• Ask AI questions about any uploaded content</li>
                    <li>• Track your progress through the course</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
