import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn-X | Financial Learning Platform',
  description: 'AI-powered personalized financial education',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
