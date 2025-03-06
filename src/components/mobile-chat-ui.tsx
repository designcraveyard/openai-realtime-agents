"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Settings, Mic, Send, X } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
import { AgentConfig, SessionStatus, TranscriptItem } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "@/app/hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "@/app/lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

// Components
import ChatMessage from "@/components/chat-message";
import VoiceWaveform from "@/components/voice-waveform";
import SettingsPanel from "@/components/settings-panel";

// Add TypeScript declaration for the window.__pageLoadTime property
declare global {
  interface Window {
    __pageLoadTime?: number;
  }
}

// Store page load time when component is first loaded
if (typeof window !== 'undefined' && !window.__pageLoadTime) {
  window.__pageLoadTime = Date.now();
}

// Define the props interface for MobileChatUI
interface MobileChatUIProps {
  useMobileRealty?: boolean;
  sessionId?: string;
}

export default function MobileChatUI({ useMobileRealty = false, sessionId = "" }: MobileChatUIProps) {
  // Debug flag to track voice mode activation
  const DEBUG_VOICE_MODE = true;
  console.log("🐞 DEBUG: MobileChatUI component initialized");
  // Added useMobileRealty prop logging
  console.log(`🏠 DEBUG: Using mobile realty mode: ${useMobileRealty}`);

  // Context hooks
  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  // State for text input
  const [textInput, setTextInput] = useState("");
  const [isTextChatLoading, setIsTextChatLoading] = useState(false);
  
  // State for voice mode - explicitly force to false (text mode is default)
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // State for settings
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [enableAudio, setEnableAudio] = useState(true);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  
  // State for agent configuration
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);

  // State for WebRTC connection
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");

  // State for UI
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  console.log("🐞 DEBUG: Initial voiceMode state:", voiceMode);

  // Add a custom setter that logs mode changes for debugging
  const setVoiceModeWithLogging = (newMode: boolean) => {
    console.log(`🎙️ Voice mode changing from ${voiceMode} to ${newMode}`);
    // Include stack trace to identify where this is being called from
    if (DEBUG_VOICE_MODE && newMode === true) {
      console.log("🐞 DEBUG: Voice mode being activated. Stack trace:");
      console.trace();
    }
    
    // For debugging: if we're trying to auto-activate voice mode on page load, prevent it
    // Use a more reliable method for detecting page load
    const pageLoadTime = window.__pageLoadTime || Date.now();
    const isPageLoad = Date.now() - pageLoadTime < 10000; // Within 10 seconds of page load
    
    if (DEBUG_VOICE_MODE && newMode === true && isPageLoad) {
      console.warn("🚫 PREVENTING automatic voice mode activation during page load");
      return; // Don't set voice mode to true during page load
    }
    
    setVoiceMode(newMode);
  };

  // Function to send client events to the server
  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    // Only try to use data channel if it's available
    if (dcRef.current && dcRef.current.readyState === "open") {
      try {
        // Log the event for debugging
        console.log(`📤 Sending client event: ${eventObj.type}`);
        
        // Log the event to the event context
        logClientEvent(eventObj, eventNameSuffix);
        
        // Send the event to the server
        dcRef.current.send(JSON.stringify(eventObj));
      } catch (error) {
        // Handle any errors that occur during sending
        console.warn(`⚠️ Error sending ${eventObj.type} event:`, error);
        logClientEvent(
          { attemptedEvent: eventObj.type, error: String(error) },
          "error.send_failed"
        );
      }
    } else {
      // Only log warnings for critical events, don't treat as errors
      const isCriticalEvent = eventObj.type.includes("session") || 
                               eventObj.type.includes("tool_call");
      
      if (isCriticalEvent) {
        console.warn(`⚠️ Cannot send ${eventObj.type} - no data channel available`);
      } else {
        console.log(`ℹ️ Skipping ${eventObj.type} event - no data channel available`);
      }
      
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "info.data_channel_not_open"
      );
    }
  };

  // Handle server events
  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  // Handle function calling from the agent
  const handleFunctionCall = async (functionName: string, args: any, callId: string) => {
    console.log(`🛠️ Handling function call: ${functionName}`, args);
    console.log(`🔍 DEBUG: Function call ID: ${callId}`);
    console.log(`🔍 DEBUG: Current session status: ${sessionStatus}`);
    console.log(`🔍 DEBUG: Data channel state: ${dcRef.current?.readyState}`);
    
    // Create a unique function call ID for transcript
    const functionCallId = uuidv4();
    
    try {
      // Add a message to the transcript to show the function being called
      addTranscriptMessage(
        functionCallId,
        "assistant", 
        `Calling function: ${functionName}...`, 
        true
      );
      
      // Log all available tools for debugging
      const currentAgentSet = allAgentSets[selectedAgentConfigSet?.[0].name || defaultAgentSetKey];
      const currentAgent = currentAgentSet?.[0];
      console.log(`🔍 DEBUG: Available tools for current agent:`, 
        currentAgent?.tools?.map(t => t.name) || 'No tools available');
      
      let functionResponse;
      
      // Call the appropriate realty agent function based on the function name
      if (functionName === "webhookRequestLookup") {
        console.log(`📝 DEBUG: Calling webhookRequestLookup with args:`, args);
        
        // Ensure 'message' is properly formatted
        if (typeof args.message !== 'string') {
          args.message = JSON.stringify(args.message);
          console.log(`📝 DEBUG: Converted message to string:`, args.message);
        }
        
        // Use a try-catch specifically for the fetch to get better error details
        try {
          const response = await fetch(
            new URL(`/api/realty?message=${encodeURIComponent(args.message)}`, window.location.origin).toString(),
            {
              method: "GET",
              headers: { "Accept": "application/json" },
            }
          );
          
          // Check if the response is OK
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status} ${response.statusText}`);
          }
          
          functionResponse = await response.json();
          console.log(`📊 DEBUG: webhookRequestLookup response:`, functionResponse);
        } catch (fetchError) {
          console.error(`❌ Fetch error in webhookRequestLookup:`, fetchError);
          throw new Error(`Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
      } 
      else if (functionName === "getPropertyDetails") {
        console.log(`📝 DEBUG: Calling getPropertyDetails with args:`, args);
        const message = JSON.stringify({
          request_type: 'property_details',
          property_id: args.propertyId
        });
        
        try {
          const response = await fetch(
            new URL(`/api/realty?message=${encodeURIComponent(message)}`, window.location.origin).toString(),
            {
              method: "GET",
              headers: { "Accept": "application/json" },
            }
          );
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status} ${response.statusText}`);
          }
          
          functionResponse = await response.json();
          console.log(`📊 DEBUG: getPropertyDetails response:`, functionResponse);
        } catch (fetchError) {
          console.error(`❌ Fetch error in getPropertyDetails:`, fetchError);
          throw new Error(`Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
      } 
      else if (functionName === "compareProperties") {
        const message = JSON.stringify({
          request_type: 'compare_properties',
          property_ids: args.properties
        });
        
        const response = await fetch(
          new URL(`/api/realty?message=${encodeURIComponent(message)}`, window.location.origin).toString(),
          {
            method: "GET",
            headers: { "Accept": "application/json" },
          }
        );
        functionResponse = await response.json();
      } 
      else if (functionName === "searchByAmenities") {
        const message = JSON.stringify({
          request_type: 'search_by_amenities',
          amenities: args.amenities,
          location: args.location || ""
        });
        
        const response = await fetch(
          new URL(`/api/realty?message=${encodeURIComponent(message)}`, window.location.origin).toString(),
          {
            method: "GET",
            headers: { "Accept": "application/json" },
          }
        );
        functionResponse = await response.json();
      } else {
        throw new Error(`Unknown function: ${functionName}`);
      }
      
      console.log(`✅ Function call ${functionName} result:`, functionResponse);
      
      // Send the function call result back to the server
      console.log(`📤 DEBUG: Sending function result back to server for call ID: ${callId}`);
      sendClientEvent({
        type: "tool_call.result",
        id: callId,
        result: functionResponse
      });
      
      // Update the function call message in the transcript
      addTranscriptMessage(
        functionCallId,
        "assistant", 
        `Function ${functionName} completed successfully.`, 
        false
      );
    } catch (error) {
      console.error(`❌ Error executing function ${functionName}:`, error);
      
      // Send the error back to the server
      sendClientEvent({
        type: "tool_call.result",
        id: callId,
        error: {
          message: `Error executing function ${functionName}: ${error instanceof Error ? error.message : String(error)}`
        }
      });
      
      // Add error message to the transcript
      const errorMessageId = uuidv4();
      addTranscriptMessage(
        errorMessageId,
        "assistant",
        `Error executing function ${functionName}: ${error instanceof Error ? error.message : String(error)}`,
        false
      );
    }
  };

  // Override the handleServerEvent hook to handle function calls
  const originalHandleServerEvent = handleServerEventRef.current;
  handleServerEventRef.current = (event: any) => {
    // Add debug logging for all server events
    console.log("🐞 DEBUG: Server event received:", event.type, event);
    
    // Check for session events that might be activating voice mode
    if (event.type && (event.type.includes('session') || event.type.includes('modality'))) {
      console.log("⚠️ Received server session event. Current voiceMode:", voiceMode);
      
      // If voice mode is active after a session event, force it back to false
      if (voiceMode) {
        console.warn("🚫 Voice mode was set to true after session event - forcing back to text mode");
        setVoiceModeWithLogging(false);
      }
    }
    
    // Process tool calls from the server - improved with clearer logging
    if (event.type === "tool_call.create") {
      const functionName = event.tool?.name;
      const args = event.tool?.parameters;
      const callId = event.id;
      
      console.log(`🔍 DEBUG: Received tool_call.create event for function "${functionName}":`, event);
      console.log(`🔍 DEBUG: Function parameters:`, args);
      
      if (!functionName) {
        console.error("❌ Missing function name in tool_call.create event");
        return;
      }
      
      // Check if this function is available
      const currentAgentSet = allAgentSets[selectedAgentConfigSet?.[0].name || defaultAgentSetKey];
      const currentAgent = currentAgentSet?.[0];
      const functionExists = currentAgent?.tools?.some(t => t.name === functionName);
      
      if (!functionExists) {
        console.error(`❌ Function "${functionName}" not found in agent tools`);
        
        // Send error back to server
        sendClientEvent({
          type: "tool_call.result",
          id: callId,
          error: {
            message: `Function "${functionName}" is not available`
          }
        });
        
        return;
      }

      handleFunctionCall(
        functionName,
        args,
        callId
      );
    }
    
    // Process function calls from response.done events
    if (event.type === "response.done" && event.response?.output) {
      console.log("🔍 DEBUG: Checking response.done for function calls:", event.response.output);
      // Look for function_call type output items
      const functionCalls = event.response.output.filter((item: any) => item.type === "function_call");
      if (functionCalls.length > 0) {
        console.log("🔍 DEBUG: Found function calls in response.done:", functionCalls);
        functionCalls.forEach((call: any) => {
          if (call.name && call.arguments) {
            handleFunctionCall(
              call.name,
              JSON.parse(call.arguments),
              call.call_id
            );
          }
        });
      }
    }
    
    // Process all other events with the original handler
    originalHandleServerEvent(event);
    
    // After processing any event, verify voice mode hasn't been activated without user action
    if (voiceMode) {
      // Double check this wasn't a user-initiated voice mode change from mic button
      const userInitiatedActions = [
        "handleMicButtonClick", 
        "mic button click", 
        "voice mode button"
      ];
      
      // Get the last message from the console to check if this was user-initiated
      const recentLogs = getRecentConsoleMessages();
      const wasUserInitiated = userInitiatedActions.some(action => 
        recentLogs.some((log: string) => log.includes(action))
      );
      
      if (!wasUserInitiated) {
        console.warn("🚫 Detected unauthorized voice mode activation after server event - forcing back to text mode");
        setVoiceModeWithLogging(false);
      }
    }
  };
  
  // Helper function to check recent console messages (stub - won't actually work)
  const getRecentConsoleMessages = (): string[] => {
    return []; // This would need browser console API access to actually implement
  };

  // Initialize agent configuration
  useEffect(() => {
    // Force voice mode to false on initialization
    setVoiceModeWithLogging(false);
    console.log("🐞 DEBUG: Forced voice mode to FALSE in initialization useEffect");
    
    // Set the agent configuration based on useMobileRealty prop
    // If useMobileRealty is true, use the mobile-specific realty agent, otherwise use the standard realty agent
    const finalAgentConfig = useMobileRealty ? 'realtyMobileAgent' : 'realtyAgent';
    
    // Log which agent configuration is being used
    console.log(`🏠 DEBUG: Using ${useMobileRealty ? 'mobile-optimized' : 'standard'} realty agent: ${finalAgentConfig}`);
    
    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    console.log("🏠 Setting up Real Estate Agent as default");
    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);

    // Load system prompt from localStorage if available
    const savedPrompt = localStorage.getItem("systemPrompt");
    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
    } else {
      // Set default system prompt from the agent config
      const defaultPrompt = agents[0]?.instructions || "";
      setSystemPrompt(defaultPrompt);
    }

    // Add initial welcome message
    const welcomeMessageId = uuidv4();
    addTranscriptMessage(
      welcomeMessageId,
      "assistant",
      "👋 Welcome to the Real Estate Agent! I can help you with:\n\n" +
      "• Finding properties in Noida\n" +
      "• Getting details about specific properties\n" +
      "• Comparing different properties\n" +
      "• Searching for properties with specific amenities\n\n" +
      "How can I assist with your real estate needs today?"
    );

    // Don't automatically connect to realtime
    console.log("⚙️ Using webhook-first approach for reliability");
    
  }, []);

  // Remove automatic connection when agent is selected
  useEffect(() => {
    // No automatic connection on agent selection
  }, [selectedAgentName]);

  // Update session when connected
  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      // Use scrollHeight and scrollTo for more reliable scrolling
      const scrollContainer = chatContainerRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcriptItems, isTextChatLoading]);

  // Fetch ephemeral key for realtime connection
  const fetchEphemeralKey = async (): Promise<string | null> => {
    console.log("🔑 Fetching ephemeral key");
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    
    try {
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();
      logServerEvent(data, "fetch_session_token_response");

      if (!data.client_secret?.value) {
        console.error("❌ No ephemeral key provided by the server");
        logClientEvent(data, "error.no_ephemeral_key");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      console.log("✅ Ephemeral key received");
      return data.client_secret.value;
    } catch (error) {
      console.error("❌ Error fetching ephemeral key:", error);
      setSessionStatus("DISCONNECTED");
      return null;
    }
  };

  // Connect to realtime API
  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    
    console.log("🐞 DEBUG: Starting connectToRealtime, current voiceMode:", voiceMode);
    
    // Ensure we're in text mode when connecting
    if (voiceMode) {
      console.log("⚠️ Forcing text mode during connection");
      setVoiceModeWithLogging(false);
    }
    
    console.log("🔄 Connecting to realtime API");
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      console.log("📡 Creating WebRTC connection");
      
      // Add more detailed logging
      console.log("🔍 Browser details:", {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webRTCSupport: 'RTCPeerConnection' in window
      });
      
      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        console.log("📢 Data channel opened");
        logClientEvent({}, "data_channel.open");
        setSessionStatus("CONNECTED");
        
        // Ensure we remain in text mode when data channel opens
        console.log("🐞 DEBUG: Data channel opened, current voiceMode:", voiceMode);
        if (voiceMode) {
          console.log("⚠️ Forcing text mode after data channel open");
          setVoiceModeWithLogging(false);
        }
        
        // Don't add another welcome message since we already have one from initialization
        console.log("ℹ️ Data channel open, connection established");
      });
      
      dc.addEventListener("close", () => {
        console.log("🔒 Data channel closed");
        logClientEvent({}, "data_channel.close");
      });
      
      dc.addEventListener("error", (err: any) => {
        // Enhanced error logging with detailed information
        console.error("❌ Data channel error:", err);
        
        // Log specific error properties if available
        if (err) {
          console.error("Error details:", {
            message: err.message,
            errorCode: err.errorCode,
            description: err.description,
            type: err.type
          });
        }
        
        // Dump complete error information for troubleshooting
        console.error("Complete error information:");
        console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        console.error("Connection state:", pcRef.current?.connectionState);
        console.error("ICE connection state:", pcRef.current?.iceConnectionState);
        console.error("ICE gathering state:", pcRef.current?.iceGatheringState);
        console.error("Data channel ready state:", dc.readyState);
        
        // Notify user of connection issue
        const errorMessageId = uuidv4();
        addTranscriptMessage(
          errorMessageId,
          "assistant",
          "There was a connection issue. The system will continue to work using text mode."
        );
        
        // Log the event
        logClientEvent({ 
          error: err ? {
            message: err.message,
            errorCode: err.errorCode,
            description: err.description,
            type: err.type
          } : "Unknown error" 
        }, "data_channel.error");
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (sessionStatus !== "DISCONNECTED") {
            console.log("🔄 Attempting to reconnect after data channel error");
            disconnectFromRealtime();
            setTimeout(() => {
              connectToRealtime();
            }, 2000);
          }
        }, 1000);
      });
      
      dc.addEventListener("message", (e: MessageEvent) => {
        console.log("📩 Message received from server");
        handleServerEventRef.current(JSON.parse(e.data));
      });

      setDataChannel(dc);
      console.log("✅ Connected to realtime API");
    } catch (err) {
      console.error("❌ Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  // Disconnect from realtime API
  const disconnectFromRealtime = () => {
    console.log("🔄 Disconnecting from realtime API");
    
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsUserSpeaking(false);
    
    logClientEvent({}, "disconnected");
    console.log("✅ Disconnected from realtime API");
  };

  // Send a message to the agent via realtime API
  const sendSimulatedUserMessage = (text: string) => {
    console.log(`💬 Sending user message via realtime: ${text}`);
    
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, false);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  // Function to send message to webhook
  const sendWebhookMessage = async (messageText: string) => {
    console.log("Sending message to webhook:", messageText);
    console.log("Using sessionId:", sessionId);
    
    // Note: Don't add user message here as it's already added in handleSendTextMessage
    // This prevents message duplication
    
    try {
      setIsTextChatLoading(true);
      
      // Create URL with both message and sessionId parameters
      const webhookUrl = new URL(`/api/realty`, window.location.origin);
      webhookUrl.searchParams.append('message', messageText);
      
      // Add sessionId to the request if available
      if (sessionId) {
        webhookUrl.searchParams.append('sessionId', sessionId);
      }
      
      // Use the realty agent's API endpoint instead of the generic chat endpoint
      const response = await fetch(
        webhookUrl.toString(),
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Realty agent response:", data);
      
      // Add assistant response to transcript
      const assistantMessageId = uuidv4();
      
      // Handle the response based on its structure
      let assistantMessage = "";
      
      // The realty API might return data in different formats depending on the function called
      if (data.output) {
        assistantMessage = typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2);
      } else if (data.response) {
        assistantMessage = typeof data.response === 'string' ? data.response : JSON.stringify(data.response, null, 2);
      } else {
        // Fallback to the entire data object if no recognized format
        assistantMessage = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      }
      
      addTranscriptMessage(assistantMessageId, "assistant", assistantMessage);
    } catch (error) {
      console.error("Error sending message to realty webhook:", error);
      
      // Add error message to transcript
      const errorMessageId = uuidv4();
      addTranscriptMessage(
        errorMessageId,
        "assistant",
        "Sorry, I encountered an error processing your real estate query. Please try again."
      );
    } finally {
      setIsTextChatLoading(false);
    }
  };

  // Update the session configuration
  const updateSession = (shouldTriggerResponse: boolean = false) => {
    console.log("🔄 Updating session configuration");
    
    // CRITICAL CHECK: Ensure we're in text mode when updating session
    if (voiceMode) {
      console.warn("⚠️ Voice mode was active during session update - forcing to text mode");
      setVoiceModeWithLogging(false);
    }
    
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );
    
    console.log("🔍 DEBUG: Selected agent:", currentAgent);

    // Configure turn detection for voice mode
    const turnDetection = voiceMode
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };

    // Use custom system prompt if available, otherwise use agent instructions
    const instructions = systemPrompt || currentAgent?.instructions || "";
    
    // Always configure realty agent tools for function calling
    console.log("📋 Configuring realty agent tools for function calling");
    const tools = [
      {
        type: "function",
        function: {
          name: "webhookRequestLookup",
          description: "Look up information about localities and projects in Noida",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "JSON format message with query details. Can include query_type (locality, project, property_type), search_term, filters, and request_type (general_lookup)"
              }
            },
            required: ["message"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getPropertyDetails",
          description: "Get detailed information about a specific property",
          parameters: {
            type: "object",
            properties: {
              propertyId: {
                type: "string",
                description: "ID of the property to get details for"
              }
            },
            required: ["propertyId"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "compareProperties",
          description: "Compare multiple properties",
          parameters: {
            type: "object",
            properties: {
              properties: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of property IDs to compare"
              }
            },
            required: ["properties"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "searchByAmenities",
          description: "Search for properties by amenities",
          parameters: {
            type: "object",
            properties: {
              amenities: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "List of amenities to search for"
              },
              location: {
                type: "string",
                description: "Optional location to filter by"
              }
            },
            required: ["amenities"]
          }
        }
      }
    ];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    // Log the configured tools for debugging
    console.log("🔧 Configured session tools:", JSON.stringify(tools, null, 2));
    console.log("📤 DEBUG: Sending session update event:", JSON.stringify(sessionUpdateEvent, null, 2));

    sendClientEvent(sessionUpdateEvent);
    console.log("✅ Session updated");

    if (shouldTriggerResponse) {
      console.log("🔍 DEBUG: Triggering initial response with 'hi' message");
      sendSimulatedUserMessage("hi");
    }
  };

  // Cancel assistant speech
  const cancelAssistantSpeech = async () => {
    console.log("🔄 Cancelling assistant speech");
    
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("⚠️ Can't cancel, no recent assistant message found");
      return;
    }
    
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("ℹ️ No truncation needed, message is DONE");
      return;
    }

    // Only try to send client events if data channel is available
    if (dcRef.current && dcRef.current.readyState === "open") {
      // Log for debugging
      console.log("📤 Sending cancel events through WebRTC data channel");
      
      try {
        sendClientEvent({
          type: "conversation.item.truncate",
          item_id: mostRecentAssistantMessage?.itemId,
          content_index: 0,
          audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
        });
        
        sendClientEvent(
          { type: "response.cancel" },
          "(cancel due to user interruption)"
        );
        
        console.log("✅ Assistant speech cancelled via WebRTC");
      } catch (error) {
        // Log errors for debugging
        console.warn("⚠️ Error sending cancel events via WebRTC:", error);
      }
    } else {
      // Log that we're skipping WebRTC operations
      console.log("ℹ️ Skipping WebRTC cancel events - data channel not available");
      // We could implement a webhook fallback here if needed
    }
  };

  // Handle text message submission
  const handleSendTextMessage = () => {
    if (!textInput.trim()) return;
    
    console.log("📤 Sending text message: " + textInput);
    
    // Always cancel any ongoing speech
    cancelAssistantSpeech();
    
    // Add user message to the transcript
    const userMessageId = uuidv4();
    addTranscriptMessage(userMessageId, "user", textInput);
    
    // Clear the text input
    setTextInput("");
    
    // Always use the real estate webhook for processing
    // This avoids WebRTC data channel issues
    console.log("🏠 Using Real Estate agent webhook for reliable processing");
    setIsTextChatLoading(true);
    
    // Process the message with the realty webhook
    sendWebhookMessage(textInput);
  };

  // Handle voice chat start - improved to ensure reliable functionality
  const handleVoiceStart = () => {
    // First check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("❌ Browser does not support getUserMedia API");
      alert("Your browser doesn't support microphone access. Please use a modern browser like Chrome or Firefox.");
      return;
    }
    
    // Always allow switching to voice mode, even if WebRTC is not connected
    console.log("🎤 Starting voice chat");
    
    // Cancel any ongoing assistant speech
    cancelAssistantSpeech();

    // Check connection status for reliable operation
    if (sessionStatus !== "CONNECTED") {
      console.log("📡 Establishing WebRTC connection for voice chat");
      
      // Connect to realtime if not already connected
      if (sessionStatus === "DISCONNECTED") {
        console.log("🔌 Connecting to realtime before starting voice mode");
        connectToRealtime().then(() => {
          console.log("✅ Connected to realtime, now enabling voice mode");
          // Continue with voice mode after connected
          setVoiceModeWithLogging(true);
          setIsUserSpeaking(true);
        }).catch(err => {
          console.error("❌ Failed to connect to realtime:", err);
          alert("Could not connect to voice service. Using text mode instead.");
        });
        return;
      }
    }

    // Switch to voice mode
    setVoiceModeWithLogging(true);
    setIsUserSpeaking(true);
    
    // Only try to clear audio buffer if WebRTC is connected
    if (sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open") {
      console.log("🔊 Clearing audio buffer via WebRTC");
      sendClientEvent({ type: "input_audio_buffer.clear" }, "clear voice buffer");
    } else {
      console.log("ℹ️ WebRTC not available, using voice mode with fallback");
    }
  };

  // Handle voice chat stop
  const handleVoiceStop = () => {
    // Always allow stopping voice mode, even if WebRTC is not connected
    console.log("🎤 Stopping voice chat");
    
    // Switch back to text mode
    setVoiceModeWithLogging(false);
    setIsUserSpeaking(false);
    
    // Only try to send WebRTC events if connected
    if (sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open" && isUserSpeaking) {
      console.log("🔊 Committing voice input via WebRTC");
      sendClientEvent({ type: "input_audio_buffer.commit" }, "commit voice");
      sendClientEvent({ type: "response.create" }, "trigger response voice");
    } else {
      console.log("ℹ️ WebRTC not available, returning to text mode");
    }
  };

  // Handle connection toggle
  const handleConnectionToggle = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
    } else {
      connectToRealtime();
    }
  };

  // Handle input focus (switch to text mode)
  const handleInputFocus = () => {
    if (voiceMode) {
      console.log("🔄 Switching from voice to text mode due to input focus");
      handleVoiceStop();
      setVoiceModeWithLogging(false);
    }
  };

  // Text input button click handler for voice mode
  const handleTextModeButtonClick = () => {
    console.log("🔄 User clicked Text Mode button");
    handleVoiceStop();
    setVoiceModeWithLogging(false);
  };

  // Mic button click handler
  const handleMicButtonClick = () => {
    console.log("🔄 User clicked Mic button");
    
    // Check if connection exists before activating voice mode
    if (sessionStatus !== "CONNECTED") {
      console.log("📲 Connecting to realtime for voice mode...");
      console.log("🔍 DEBUG: Current session status:", sessionStatus);
      connectToRealtime().then(() => {
        console.log("🎙️ Connection established, activating voice mode");
        console.log("🔍 DEBUG: New session status:", sessionStatus);
        console.log("🔍 DEBUG: Data channel state:", dcRef.current?.readyState);
        setVoiceModeWithLogging(true);
        handleVoiceStart();
      }).catch(error => {
        console.error("❌ Failed to connect to realtime for voice mode:", error);
        console.log("🔍 DEBUG: Session status after error:", sessionStatus);
        // Show error message to user
        const errorMessageId = uuidv4();
        addTranscriptMessage(
          errorMessageId,
          "assistant",
          "Unable to activate voice mode. Please try again."
        );
      });
    } else {
      // Already connected, just activate voice mode
      console.log("🔍 DEBUG: Already connected, activating voice mode directly");
      console.log("🔍 DEBUG: Current session status:", sessionStatus);
      console.log("🔍 DEBUG: Data channel state:", dcRef.current?.readyState);
      setVoiceModeWithLogging(true);
      handleVoiceStart();
    }
  };

  // Save system prompt
  const handleSaveSystemPrompt = (prompt: string) => {
    console.log("💾 Saving system prompt");
    setSystemPrompt(prompt);
    localStorage.setItem("systemPrompt", prompt);
    
    // Update session with new prompt if connected
    if (sessionStatus === "CONNECTED") {
      updateSession(false);
    }
    
    setIsSettingsOpen(false);
  };

  // Filter messages to show only user and assistant messages
  const chatMessages = transcriptItems.filter(
    item => item.type === "MESSAGE" && !item.isHidden
  );

  // Function to toggle connection
  const toggleConnection = () => {
    setIsConnected(!isConnected);
    // Add actual connection logic here
  };

  // Function to toggle audio
  const toggleAudio = () => {
    setEnableAudio(!enableAudio);
  };

  // Function to toggle listening
  const toggleListening = () => {
    setIsListening(!isListening);
    // Add actual listening logic here
  };

  // Effect to update session when connection is established
  useEffect(() => {
    if (sessionStatus === "CONNECTED" && selectedAgentName) {
      console.log("🔄 Connection established, updating session with Real Estate agent config");
      
      // Add agent information to transcript
      const currentAgent = selectedAgentConfigSet?.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      
      // Update the session with the real estate agent configuration
      // Don't set shouldTriggerResponse to true to avoid duplicate welcome message
      updateSession(false);
    }
  }, [sessionStatus, selectedAgentName]);

  return (
    <div className="flex h-[100svh] items-center justify-center bg-gray-100">
      {/* Responsive chat container - full screen on mobile, fixed width on larger screens */}
      <div className="relative mx-auto h-full w-full overflow-hidden bg-white sm:h-[90vh] sm:max-w-[600px] sm:rounded-lg sm:shadow-lg">
        {/* Chat UI with flexbox layout to ensure sticky elements work correctly */}
        <div className="flex h-full flex-col">
          {/* Chat header - sticky at the top */}
          <div className="flex items-center justify-between border-b p-4 sticky top-0 bg-white z-10 shadow-sm">
            <h1 className="text-lg font-semibold">Real Estate Agent</h1>
            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="shrink-0 rounded-full h-10 w-10 flex items-center justify-center border-gray-300"
                >
                  <Settings className="h-4 w-4 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SettingsPanel
                  systemPrompt={systemPrompt}
                  onSystemPromptChange={setSystemPrompt}
                  isConnected={sessionStatus === "CONNECTED"}
                  onToggleConnection={handleConnectionToggle}
                  enableAudio={isAudioPlaybackEnabled}
                  onToggleAudio={() => setIsAudioPlaybackEnabled(!isAudioPlaybackEnabled)}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Chat messages - scrollable area that fills available space */}
          <div className="flex-1 overflow-auto pb-20" ref={chatContainerRef}>
            <div>
              {chatMessages.map((message) => (
                <ChatMessage key={message.itemId} message={message} />
              ))}
              {isTextChatLoading && (
                <div className="bg-gray-50 px-4 py-3 border-y">
                  <div className="flex items-start gap-2 mb-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white">
                        A
                      </div>
                    </Avatar>
                    <span className="font-medium text-sm text-gray-600">Assistant</span>
                  </div>
                  <div className="ml-10 flex items-center">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voice mode UI - position absolute at the bottom */}
          {voiceMode && (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center space-y-4 border-t bg-gray-50 p-6 z-20 shadow-md">
              <VoiceWaveform isActive={isUserSpeaking} />
              <div className="flex gap-4">
                <Button
                  variant={isUserSpeaking ? "destructive" : "default"}
                  size="lg"
                  className="rounded-full h-14 w-14 shadow-md"
                  onClick={isUserSpeaking ? handleVoiceStop : handleVoiceStart}
                >
                  {isUserSpeaking ? <X className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                  onClick={handleTextModeButtonClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Text Mode
                </Button>
              </div>
            </div>
          )}

          {/* Text input - position absolute at the bottom */}
          {!voiceMode && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center space-x-2 border-t p-4 bg-white z-20 shadow-md">
              <Input
                placeholder="Type a message..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTextMessage();
                  }
                }}
                className="flex-1"
              />
              <Button 
                size="icon" 
                onClick={handleSendTextMessage} 
                disabled={!textInput.trim()}
                className="shrink-0 rounded-full h-10 w-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleMicButtonClick} 
                className="shrink-0 rounded-full h-10 w-10 flex items-center justify-center border-gray-300"
                size="icon"
              >
                <Mic className="h-4 w-4 text-gray-700" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 