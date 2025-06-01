import { Skeleton } from '@/components/ui/skeleton';

export const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[95%]" />
      <Skeleton className="h-4 w-[90%]" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[93%]" />
      <Skeleton className="h-4 w-[88%]" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-[97%]" />
      <Skeleton className="h-4 w-[92%]" />
      <Skeleton className="h-4 w-[85%]" />
    </div>
  </div>
);
