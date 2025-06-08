import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Material {
  id: string;
  title: string;
  type: any;
}

interface User {
  id?: string;
  // Add other user properties as needed
}

export function useMaterialHandler(courseId: string, currentUser: User | null) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentMaterial, setCurrentMaterial] = useState<
    Material | undefined
  >();

  // ✅ NEW: Log activity to Supabase directly
  const logActivity = async (activityData: {
    type: string;
    fileId: string;
    courseId: string;
  }) => {
    try {
      if (!user) return;
      
      // Log to processing_queue or create a dedicated user_activities table
      await supabase.from('processing_queue').insert({
        job_type: 'user_activity',
        payload: {
          user_id: user.id,
          activity_type: activityData.type,
          file_id: activityData.fileId,
          course_id: activityData.courseId,
          timestamp: new Date().toISOString(),
        },
        status: 'completed', // Activity logging is immediate
      });
    } catch (error: any) {
      console.warn('Failed to log activity:', error);
    }
  };

  const handleViewMaterial = (material: Material) => {
    try {
      if (!material || !material.id) {
        toast.error('Invalid material selected');
        return;
      }

      if (!currentUser) {
        toast.error('Please log in to view materials');
        return;
      }

      // ✅ NEW: Use direct Supabase logging
      logActivity({
        type: 'file_view',
        fileId: material.id,
        courseId: courseId,
      });

      setCurrentMaterial(material);
    } catch (error) {
      console.error('Error opening material:', error);
      toast.error('Failed to open material');
    }
  };

  const handleAskAI = async (material: Material) => {
    try {
      if (!material || !material.id) {
        toast.error('Invalid material selected');
        return;
      }

      if (!currentUser) {
        toast.error('Please log in to use AI features');
        return;
      }

      const loadingToast = toast.loading(
        'Opening personalized learning experience...',
        {
          description: 'Redirecting to your personalized content',
        },
      );

      // ✅ NEW: Use direct Supabase logging
      logActivity({
        type: 'personalized_view',
        fileId: material.id,
        courseId: courseId,
      });

      setTimeout(() => {
        toast.dismiss(loadingToast);
        router.push(`/personalize/${material.id}?courseId=${courseId}`);
      }, 500);
    } catch (error) {
      toast.dismiss();
      console.error('Error creating personalized content:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('complete your onboarding')) {
        toast.error('Profile Required', {
          description:
            'Please complete your learning profile first to enable personalized content.',
          action: {
            label: 'Complete Profile',
            onClick: () => router.push('/onboarding'),
          },
        });
      } else {
        toast.error('Failed to Create Personalized Content', {
          description: errorMessage,
        });
      }
    }
  };

  return {
    currentMaterial,
    setCurrentMaterial,
    handleViewMaterial,
    handleAskAI,
  };
}
