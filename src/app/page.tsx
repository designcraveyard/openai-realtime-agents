"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Page() {
  // Function to test the webhook directly
  const testWebhook = async () => {
    console.log("🧪 Testing webhook directly...");
    try {
      const testMessage = "This is a test message from the home page";
      const url = `/api/realty?contactMessage=${encodeURIComponent(testMessage)}`;
      console.log(`🔗 Making test request to: ${url}`);
      
      const response = await fetch(url);
      console.log(`📊 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Test webhook response:", data);
        alert("Webhook test successful! Check console for details.");
      } else {
        const errorText = await response.text();
        console.error(`❌ Test webhook error: ${errorText}`);
        alert(`Webhook test failed with status ${response.status}. Check console for details.`);
      }
    } catch (error) {
      console.error("❌ Test webhook error:", error);
      alert(`Webhook test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 flex items-center">
        <Image
          src="/openai-logomark.svg"
          alt="OpenAI Logo"
          width={40}
          height={40}
          className="mr-3"
        />
        <h1 className="text-4xl font-bold">OpenAI Realtime Agents</h1>
      </div>
      
      <div className="mb-12 max-w-2xl text-center text-gray-600">
        <p>
          Explore different interfaces for interacting with OpenAI&apos;s Realtime API.
          Choose between the desktop experience or the mobile-optimized chat UI.
        </p>
      </div>
      
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link 
          href="/app" 
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 text-white shadow-md transition-colors hover:bg-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="3" rx="2"></rect>
            <line x1="8" x2="16" y1="21" y2="21"></line>
            <line x1="12" x2="12" y1="17" y2="21"></line>
          </svg>
          Desktop UI
        </Link>
        
        <Link 
          href="/chat" 
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white shadow-md transition-colors hover:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="10" height="16" x="7" y="4" rx="1"></rect>
            <path d="M11 5h2"></path>
            <path d="M12 17v.01"></path>
          </svg>
          Mobile Chat UI
        </Link>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-md mt-8">
        <Link href="/bot">
          <Button className="w-full">Start Chat</Button>
        </Link>
        
        <Link href="/chat">
          <Button variant="outline" className="w-full">Start Voice Chat</Button>
        </Link>
        
        {/* Test Webhook Button */}
        <Button 
          variant="secondary" 
          className="w-full mt-8"
          onClick={testWebhook}
        >
          Test Webhook Connection
        </Button>
      </div>
    </div>
  );
}
