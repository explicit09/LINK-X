"use client";

import { SimpleStreamingChat } from "@/components/SimpleStreamingChat";

export default function TestStreamingPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold mb-4">Test Streaming Chat</h1>
      <div className="h-[600px] border rounded-lg overflow-hidden">
        <SimpleStreamingChat />
      </div>
    </div>
  );
}