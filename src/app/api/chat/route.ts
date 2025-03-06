import { NextRequest, NextResponse } from "next/server";
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

export async function POST(request: NextRequest) {
  console.log("📥 Received chat webhook request");
  
  try {
    // Parse the request body
    const body = await request.json();
    const { message, sessionId } = body;
    
    // Validate the message
    if (!message) {
      console.error("❌ Missing message in request body");
      return NextResponse.json(
        { error: "Missing message in request body" },
        { status: 400 }
      );
    }
    
    console.log(`💬 Processing message: ${message}`);
    if (sessionId) {
      console.log(`🔑 With sessionId: ${sessionId}`);
    }
    
    // Get the agent configuration
    const agentSet = allAgentSets[defaultAgentSetKey];
    const agent = agentSet?.[0];
    
    if (!agent) {
      console.error("❌ No agent configuration found");
      return NextResponse.json(
        { error: "No agent configuration found" },
        { status: 500 }
      );
    }
    
    if (!agent.toolLogic?.webhookRequestLookup) {
      console.error("❌ Agent does not support webhook");
      return NextResponse.json(
        { error: "Agent does not support webhook" },
        { status: 500 }
      );
    }
    
    // Call the agent's webhook function
    console.log("🤖 Calling agent webhook");
    const response = await agent.toolLogic.webhookRequestLookup({ message, sessionId }, []);
    console.log(`✅ Agent response: ${response}`);
    
    // Return the response
    return NextResponse.json({ response });
  } catch (error) {
    console.error("❌ Error processing webhook request:", error);
    return NextResponse.json(
      { error: "Error processing webhook request" },
      { status: 500 }
    );
  }
} 