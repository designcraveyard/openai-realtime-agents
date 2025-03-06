import React, { Suspense } from "react";
import Link from "next/link";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import App from "../App";

// Loading component to show while App is loading
function AppLoading() {
  return <div className="flex h-full w-full items-center justify-center">Loading...</div>;
}

export default function AppPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with navigation */}
      <header className="border-b p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold">OpenAI Realtime Agents</h1>
          <nav>
            <Link 
              href="/chat" 
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Mobile Chat UI
            </Link>
          </nav>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        <TranscriptProvider>
          <EventProvider>
            <Suspense fallback={<AppLoading />}>
              <App />
            </Suspense>
          </EventProvider>
        </TranscriptProvider>
      </main>
    </div>
  );
} 