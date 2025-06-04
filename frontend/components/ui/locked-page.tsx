/**
 * Locked Page Component
 * Shows a professional "coming soon" message for locked features during beta
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LockedPageProps {
  featureName: string;
  description: string;
  icon?: 'schedule' | 'progress';
  estimatedRelease?: string;
}

export function LockedPage({ 
  featureName, 
  description, 
  icon = 'schedule',
  estimatedRelease = "after beta launch" 
}: LockedPageProps) {
  const router = useRouter();

  const IconComponent = icon === 'schedule' ? Calendar : TrendingUp;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {/* Lock Icon Overlay */}
          <div className="relative inline-block mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <IconComponent className="h-8 w-8 text-blue-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-orange-500 p-1.5 rounded-full">
              <Lock className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {featureName} Coming Soon
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {description}
          </p>

          {/* Beta Badge */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                BETA
              </span>
              <span className="text-sm font-medium text-gray-700">
                Currently in Development
              </span>
            </div>
            <p className="text-xs text-gray-600">
              This feature will be available {estimatedRelease}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/my-courses')}
              className="w-full"
            >
              Explore My Courses
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 mt-6">
            Want early access? Reach out to our team for beta testing opportunities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}