import { AgentConfig, TranscriptItem } from "@/app/types";

/**
 * Simple webhook request handler
 * @param args The arguments from the tool call
 * @param transcriptLogsFiltered Optional transcript logs
 * @returns A response message
 */
async function webhookRequestLookup(args: { message: string }, _transcriptLogsFiltered?: TranscriptItem[]) {
  console.log("📝 [SIMPLE-AGENT] Processing webhook request:", args.message);
  
  // Simple response generation
  const responses = [
    "I'm a simple example agent. I can help answer basic questions.",
    "That's an interesting question! Let me think about it...",
    "I understand your query. Here's what I can tell you:",
    "Thanks for your message. I'm processing your request.",
    "I appreciate your question. Here's my response:"
  ];
  
  // Get a random response prefix
  const prefix = responses[Math.floor(Math.random() * responses.length)];
  
  // Generate a more specific response based on the message
  let specificResponse = "";
  
  if (args.message.toLowerCase().includes("hello") || args.message.toLowerCase().includes("hi")) {
    specificResponse = "Hello! How can I assist you today?";
  } else if (args.message.toLowerCase().includes("help")) {
    specificResponse = "I can help you with basic information and answer questions about this demo.";
  } else if (args.message.toLowerCase().includes("weather")) {
    specificResponse = "I don't have access to real-time weather data, but I can tell you it's always sunny in the world of code!";
  } else if (args.message.toLowerCase().includes("time")) {
    specificResponse = `The current time is ${new Date().toLocaleTimeString()}.`;
  } else if (args.message.toLowerCase().includes("date")) {
    specificResponse = `Today's date is ${new Date().toLocaleDateString()}.`;
  } else if (args.message.toLowerCase().includes("name")) {
    specificResponse = "My name is Simple Agent. I'm a demonstration of the OpenAI Realtime Agents platform.";
  } else if (args.message.toLowerCase().includes("thank")) {
    specificResponse = "You're welcome! Is there anything else I can help with?";
  } else {
    specificResponse = `You said: "${args.message}". This is a simple echo response to demonstrate the webhook functionality.`;
  }
  
  // Combine the prefix and specific response
  const fullResponse = `${prefix} ${specificResponse}`;
  
  console.log("✅ [SIMPLE-AGENT] Generated response:", fullResponse);
  
  return fullResponse;
}

// Simple example agent configuration
const simpleExampleAgent: AgentConfig = {
  name: "Simple Example Agent",
  publicDescription: "A simple example agent that demonstrates basic functionality.",
  instructions: "You are a helpful assistant that responds to user queries with simple, friendly answers.",
  tools: [
    {
      type: "function",
      name: "webhookRequestLookup",
      description: "Process a webhook request and generate a response",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message from the user"
          }
        },
        required: ["message"]
      }
    }
  ],
  toolLogic: {
    webhookRequestLookup
  }
};

// Export an array with the agent configuration
const simpleExampleAgentConfig = [simpleExampleAgent];
export default simpleExampleAgentConfig;
