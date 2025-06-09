'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function EnhancedPersonalizePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get IDs from params and search params
  const fileId = params?.fileId as string || '';
  const courseId = searchParams?.get('courseId') || '';
  const moduleId = searchParams?.get('moduleId') || '';
  const courseTitle = searchParams?.get('courseTitle') || '';
  
  // Redirect to the new personalize-v2 page
  useEffect(() => {
    if (fileId) {
      const queryParams = new URLSearchParams();
      if (courseId) queryParams.append('courseId', courseId);
      if (moduleId) queryParams.append('moduleId', moduleId);
      if (courseTitle) queryParams.append('courseTitle', courseTitle);
      
      const queryString = queryParams.toString();
      const redirectUrl = `/personalize-v2/${fileId}${queryString ? `?${queryString}` : ''}`;
      
      router.replace(redirectUrl);
    }
  }, [fileId, courseId, moduleId, courseTitle, router]);
  
  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to enhanced personalization...</p>
      </div>
    </div>
  );
}