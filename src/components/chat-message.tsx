"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import { Code, Terminal } from "lucide-react";

interface ChatMessageProps {
  message: TranscriptItem;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  // Check if this message appears to be a function call based on its content
  const isFunctionCall = !isUser && (
    message.title?.startsWith("Calling function:") || 
    message.title?.includes("Function") && message.title?.includes("completed successfully") ||
    message.title?.includes("Error executing function")
  );
  
  // Determine if this is a function error message
  const isFunctionError = isFunctionCall && message.title?.includes("Error executing function");

  // For user messages, we keep them contained in a card with max-width but remove the avatar
  if (isUser) {
    return (
      <div className="flex justify-end mb-4 px-4">
        <Card className="rounded-2xl rounded-tr-none px-4 py-2 bg-blue-100 text-black max-w-[80%]">
          <div className="prose prose-sm">
            <ReactMarkdown>{message.title || ""}</ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  }
  
  // For assistant messages, we use full width
  return (
    <div className="mb-4">
      {/* For function calls, we use a special card style */}
      {isFunctionCall ? (
        <div className="flex items-start gap-2 px-4">
          <Avatar className="h-8 w-8 shrink-0">
            <div className={`flex h-full w-full items-center justify-center ${
              isFunctionError ? "bg-red-600" : "bg-purple-700"
            } text-white`}>
              <Code size={16} />
            </div>
          </Avatar>
          
          <Card className={`w-full rounded-2xl px-4 py-2 ${
            isFunctionError 
              ? "bg-red-100 text-red-800 border border-red-300" 
              : "bg-purple-100 text-purple-800 border border-purple-300"
          }`}>
            {!isFunctionError ? (
              <div className="flex items-center gap-1 text-xs font-semibold mb-1 text-purple-600">
                <Terminal size={12} />
                <span>FUNCTION CALL</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-semibold mb-1 text-red-600">
                <Terminal size={12} />
                <span>FUNCTION ERROR</span>
              </div>
            )}
            <div className="prose prose-sm">
              <ReactMarkdown>{message.title || ""}</ReactMarkdown>
            </div>
          </Card>
        </div>
      ) : (
        /* For regular assistant messages, use full width with minimal styling */
        <div className="px-4 py-3 border-b">
          <div className="flex items-start gap-2 mb-2">
            <Avatar className="h-8 w-8 shrink-0">
              <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white">
                A
              </div>
            </Avatar>
            <span className="font-medium text-sm text-gray-600">Assistant</span>
          </div>
          <div className="prose prose-sm max-w-none ml-10">
            <ReactMarkdown>{message.title || ""}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
} 