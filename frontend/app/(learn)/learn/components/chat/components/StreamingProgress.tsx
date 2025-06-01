'use client';

interface StreamingProgressProps {
  isLoading: boolean;
  streamingContent: string;
}

export const StreamingProgress: React.FC<StreamingProgressProps> = ({
  isLoading,
  streamingContent,
}) => {
  if (!isLoading) return null;

  const progress = streamingContent
    ? Math.min((streamingContent.length / 600) * 100, 95)
    : 5;

  return (
    <div className="px-4 pb-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1 text-center">
        {streamingContent
          ? `Generating response... ${Math.round(progress)}%`
          : 'Connecting to AI...'}
      </p>
    </div>
  );
};
