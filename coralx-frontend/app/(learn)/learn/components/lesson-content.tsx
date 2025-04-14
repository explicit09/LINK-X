"use client";

interface LessonContentProps {
  title: string | null;
  content: string | null;
  isLoading: boolean;
}

export default function LessonContent({ title, content, isLoading }: LessonContentProps) {
  if (isLoading) {
    return (
      <div className="max-w-5xl w-full p-8 text-foreground">
        <div className="mb-4 flex items-center space-x-2 text-blue-muted">
          <span>Loading AI response</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!title || !content) {
    return (
      <div className="max-w-5xl w-full p-8 text-foreground">
        <h1 className="text-2xl font-semibold text-blue-muted">No lesson selected</h1>
        <p className="mt-2 text-muted-foreground">Click a topic in the sidebar to begin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-foreground">{title}</h1>
      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
