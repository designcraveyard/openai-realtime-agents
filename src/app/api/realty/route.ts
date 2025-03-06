import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n-railway-custom-production-953e.up.railway.app/webhook/realty-agent';

/**
 * Handle GET requests by forwarding the message parameter to the n8n webhook
 * 
 * @param request The incoming request
 * @returns Response from the webhook
 */
export async function GET(request: NextRequest) {
  console.log('🔄 [API] Handling GET request to /api/realty');
  
  // Get the message and other parameters from the URL query
  const { searchParams } = new URL(request.url);
  
  // Check for both 'contactMessage' and 'message' parameters
  const contactMessage = searchParams.get('contactMessage');
  const messageParam = searchParams.get('message');
  const message = contactMessage || messageParam; // Use contactMessage if available, otherwise use message
  const sessionId = searchParams.get('sessionId');
  
  console.log(`📬 [API] Received message parameter: ${message}`);
  console.log(`📬 [API] Request URL: ${request.url}`);
  console.log(`📬 [API] All search params:`, Object.fromEntries(searchParams.entries()));
  
  if (!message) {
    console.error('⚠️ [API] Missing required message parameter in GET request');
    return NextResponse.json({ error: 'Missing required message parameter (use "contactMessage" or "message")' }, { status: 400 });
  }
  
  // Try to parse the message if it's JSON
  let parsedMessageForLogs;
  try {
    parsedMessageForLogs = JSON.parse(message);
    console.log(`📋 [API] Parsed contactMessage as JSON:`, parsedMessageForLogs);
  } catch {
    console.log(`📝 [API] Message is not in JSON format, treating as plain string`);
  }
  
  try {
    console.log(`🔗 [API] Forwarding GET request to n8n webhook with contactMessage: ${message}`);
    
    // Create the full webhook URL with the contactMessage parameter
    let webhookUrl = `${WEBHOOK_URL}?contactMessage=${encodeURIComponent(message)}`;
    
    // Add sessionId if provided
    if (sessionId) {
      webhookUrl += `&sessionId=${encodeURIComponent(sessionId)}`;
      console.log(`🔑 [API] Added sessionId to webhook URL: ${sessionId}`);
    }
    
    console.log(`🌐 [API] Full webhook URL: ${webhookUrl}`);
    
    // Forward the request to the n8n webhook with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended 15 second timeout
    
    try {
      console.log(`⏳ [API] Starting fetch to webhook at ${new Date().toISOString()}`);
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      console.log(`✅ [API] Completed fetch to webhook at ${new Date().toISOString()}`);
      
      clearTimeout(timeoutId);
      
      console.log(`📊 [API] Webhook response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [API] Error from webhook: ${errorText}`);
        return NextResponse.json({ 
          error: `Error from webhook (${response.status})`, 
          details: errorText
        }, { status: 502 });
      }
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      // Process response based on content type
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log(`✅ [API] Got JSON response from webhook:`, responseData);
      } else {
        const textResponse = await response.text();
        console.log(`✅ [API] Got text response from webhook: ${textResponse}`);
        
        // Try to parse the text as JSON in case content-type is wrong
        try {
          responseData = JSON.parse(textResponse);
          console.log(`🔄 [API] Parsed text response as JSON`);
        } catch {
          // If we can't parse as JSON, return as is
          responseData = { response: textResponse };
        }
      }
      
      return NextResponse.json(responseData);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ [API] Request to webhook timed out after 15 seconds');
        return NextResponse.json({ 
          error: 'Webhook request timed out', 
          details: 'The external service took too long to respond'
        }, { status: 504 });
      }
      
      console.error(`❌ [API] Error during fetch to webhook:`, fetchError);
      return NextResponse.json({ 
        error: 'Error during fetch to webhook', 
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`❌ [API] Error processing webhook request:`, error);
    return NextResponse.json({ 
      error: 'Error processing webhook request', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Handle POST requests by forwarding the JSON body to the n8n webhook
 * 
 * @param request The incoming request
 * @returns Response from the webhook
 */
export async function POST(request: NextRequest) {
  console.log('Handling POST request to /api/realty');
  
  try {
    // Get the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Forward the request to the n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`Webhook responded with status: ${response.status}`);
      return NextResponse.json(
        { error: `Webhook responded with status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    console.log('Webhook response:', data);
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error forwarding POST request to webhook:', error);
    return NextResponse.json(
      { error: `Error forwarding request: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// Test function to manually check status of the n8n webhook
export async function DEBUG_testWebhook() {
  try {
    console.log(`🧪 [API] Testing webhook connectivity to: ${WEBHOOK_URL}`);
    
    const response = await fetch(`${WEBHOOK_URL}?contactMessage=test`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`🧪 [API] Test response status: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ [API] Webhook test successful`);
      return true;
    } else {
      console.error(`❌ [API] Webhook test failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [API] Error testing webhook:`, error);
    return false;
  }
} 