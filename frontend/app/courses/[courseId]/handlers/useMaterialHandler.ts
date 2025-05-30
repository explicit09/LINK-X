import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { studentAPI } from '@/lib/api';

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
  const [currentMaterial, setCurrentMaterial] = useState<Material | undefined>();

  const handleViewMaterial = (material: Material) => {
    try {
      if (!material || !material.id) {
        toast.error("Invalid material selected");
        return;
      }
      
      if (!currentUser) {
        toast.error("Please log in to view materials");
        return;
      }
      
      studentAPI.logActivity({
        type: 'file_view',
        fileId: material.id,
        courseId: courseId
      }).catch(error => {
        console.warn("Failed to log file view activity:", error);
      });
      
      setCurrentMaterial(material);
    } catch (error) {
      console.error("Error opening material:", error);
      toast.error("Failed to open material");
    }
  };

  const handleAskAI = async (material: Material) => {
    try {
      if (!material || !material.id) {
        toast.error("Invalid material selected");
        return;
      }
      
      if (!currentUser) {
        toast.error("Please log in to use AI features");
        return;
      }

      const loadingToast = toast.loading("Opening personalized learning experience...", {
        description: "Redirecting to your personalized content"
      });

      studentAPI.logActivity({
        type: 'personalized_view',
        fileId: material.id,
        courseId: courseId
      }).catch(error => {
        console.warn("Failed to log AI activity:", error);
      });

      setTimeout(() => {
        toast.dismiss(loadingToast);
        router.push(`/learn/streaming/${material.id}?courseId=${courseId}`);
      }, 500);

    } catch (error) {
      toast.dismiss();
      console.error("Error creating personalized content:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      if (errorMessage.includes("complete your onboarding")) {
        toast.error("Profile Required", {
          description: "Please complete your learning profile first to enable personalized content.",
          action: {
            label: "Complete Profile",
            onClick: () => router.push("/onboarding")
          }
        });
      } else {
        toast.error("Failed to Create Personalized Content", {
          description: errorMessage
        });
      }
    }
  };

  return {
    currentMaterial,
    setCurrentMaterial,
    handleViewMaterial,
    handleAskAI
  };
}