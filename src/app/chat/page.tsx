"use client";

import React, { useEffect, useState } from "react";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import MobileChatUI from "@/components/mobile-chat-ui";
// Import UUID v4 for generating random IDs
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
  // State to store the sessionId
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    console.log("🔊 DEBUG: Chat page mounted");
    
    // Generate and store a new sessionId when the component mounts
    const generateSessionId = () => {
      // Check if there's already a sessionId in localStorage
      const existingSessionId = localStorage.getItem('chatSessionId');
      
      if (existingSessionId) {
        // Use existing sessionId if available
        console.log(`🔑 DEBUG: Using existing sessionId: ${existingSessionId}`);
        setSessionId(existingSessionId);
      } else {
        // Generate a new sessionId if none exists
        const newSessionId = uuidv4();
        console.log(`🔑 DEBUG: Generated new sessionId: ${newSessionId}`);
        localStorage.setItem('chatSessionId', newSessionId);
        setSessionId(newSessionId);
      }
    };
    
    generateSessionId();
    
    const hasAudioSupport = typeof window !== 'undefined' && 
      'AudioContext' in window && 
      'MediaRecorder' in window &&
      'getUserMedia' in navigator.mediaDevices;
    
    console.log(`🎤 DEBUG: Browser audio support detected: ${hasAudioSupport}`);
    
    const hasWebRTCSupport = typeof window !== 'undefined' && 
      'RTCPeerConnection' in window;
    
    console.log(`🌐 DEBUG: Browser WebRTC support detected: ${hasWebRTCSupport}`);
    
    // Log that we're using the realtyMobileAgent for this page
    console.log("🏠 DEBUG: Using realtyMobileAgent specifically for mobile chat interface");
    
    if (hasAudioSupport) {
      console.log("🎙️ DEBUG: Requesting audio permissions early");
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("✅ DEBUG: Audio permissions granted");
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error("❌ DEBUG: Audio permission error:", err);
        });
    }
    
    return () => {
      console.log("🔊 DEBUG: Chat page unmounted");
    };
  }, []);
  
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://api.openai.com';
      document.head.appendChild(preconnectLink);
      
      const dnsPrefetchLink = document.createElement('link');
      dnsPrefetchLink.rel = 'dns-prefetch';
      dnsPrefetchLink.href = 'https://api.openai.com';
      document.head.appendChild(dnsPrefetchLink);
      
      return () => {
        document.head.removeChild(preconnectLink);
        document.head.removeChild(dnsPrefetchLink);
      };
    }
  }, []);
  
  return (
    <TranscriptProvider>
      <EventProvider>
        <MobileChatUI sessionId={sessionId} />
      </EventProvider>
    </TranscriptProvider>
  );
} 