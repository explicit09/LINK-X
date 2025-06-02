/**
 * Messages Page - Route Handler
 * LOCKED during beta - will be available after beta launch
 */

'use client';

import { LockedPage } from '@/components/ui/locked-page';

export default function MessagesPage() {
  return (
    <LockedPage
      featureName="Messages & Chat"
      description="Direct messaging with instructors and classmates, group chats for study sessions, and notifications for important updates. Stay connected with your learning community."
      icon="schedule" // Using schedule icon since we don't have a messages icon option
      estimatedRelease="shortly after beta launch"
    />
  );
}