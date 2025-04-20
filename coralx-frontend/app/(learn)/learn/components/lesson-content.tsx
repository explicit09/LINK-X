"use client";
import ReactMarkdown from 'react-markdown';


interface LessonContentProps {
  title: string | null;
  content: string | null;
  isLoading: boolean;
}

const LessonContent = ({
  title,
  content,
  isLoading
}: {
  title: string | null;
  content: string | null;
  isLoading: boolean;
}) => {
  if (isLoading) return <p className="text-blue-foreground text-center text-xl font-semibold font-sans mt-10">Loading AI response...</p>;
  if (!content) return <p className="text-blue-foreground text-center text-xl font-semibold font-sans mt-10">Select a lesson to begin.</p>;

  return (
    <div className="prose prose-lg max-w-none dark:prose-invert markdown-content">
      <h1>{title}</h1>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default LessonContent;
