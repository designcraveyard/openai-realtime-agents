"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface SettingsPanelProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  isConnected: boolean;
  onToggleConnection: () => void;
  enableAudio: boolean;
  onToggleAudio: () => void;
  realtyAgentPrompt?: string;
  onRealtyAgentPromptChange?: (value: string) => void;
}

export default function SettingsPanel({
  systemPrompt,
  onSystemPromptChange,
  isConnected,
  onToggleConnection,
  enableAudio,
  onToggleAudio,
  realtyAgentPrompt,
  onRealtyAgentPromptChange
}: SettingsPanelProps) {
  const [prompt, setPrompt] = useState(systemPrompt);
  const [realtyPrompt, setRealtyPrompt] = useState(realtyAgentPrompt || '');
  
  // Handler for saving all prompts
  const handleSave = () => {
    // Log the action
    console.log("💾 Saving system prompt:", prompt);
    
    // Call the save handlers
    onSystemPromptChange(prompt);
    
    // Save realty agent prompt if handler exists
    if (onRealtyAgentPromptChange) {
      console.log("💾 Saving realty agent prompt:", realtyPrompt);
      onRealtyAgentPromptChange(realtyPrompt);
    }
  };
  
  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };
  
  const handleRealtyPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRealtyPrompt(e.target.value);
  };
  
  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Connection toggle */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Connection</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="connection-toggle" className="text-sm text-gray-500">
            {isConnected ? "Connected" : "Disconnected"}
          </Label>
          <Button
            onClick={onToggleConnection}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
          >
            {isConnected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Audio playback toggle */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Audio Playback</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="audio-toggle" className="text-sm text-gray-500">
            Enable audio responses
          </Label>
          <Switch
            id="audio-toggle"
            checked={enableAudio}
            onCheckedChange={onToggleAudio}
          />
        </div>
      </div>
      
      <Separator />
      
      {/* System prompt */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">System Prompt</h3>
        <p className="text-xs text-gray-500">
          Customize the instructions for the AI assistant.
        </p>
        <Textarea
          value={prompt}
          onChange={handleSystemPromptChange}
          className="min-h-[150px] resize-none"
          placeholder="Enter system prompt..."
        />
      </div>
      
      {/* Realty Agent prompt - only show if the handler exists */}
      {onRealtyAgentPromptChange && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Realty Agent Prompt</h3>
            <p className="text-xs text-gray-500">
              Customize the instructions for the Noida Realty Agent.
            </p>
            <Textarea
              value={realtyPrompt}
              onChange={handleRealtyPromptChange}
              className="min-h-[150px] resize-none"
              placeholder="Enter realty agent prompt..."
            />
          </div>
        </>
      )}
      
      <Button onClick={handleSave} className="mt-2">
        Save Changes
      </Button>
    </div>
  );
} 