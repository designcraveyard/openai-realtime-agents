import { NextRequest, NextResponse } from 'next/server';

// API route to test n8n webhook connectivity
// This route acts as a proxy with detailed logging

/**
 * Process requests to the webhook test endpoint
 * This function handles both POST and GET requests to webhooks
 * 
 * @param request - The incoming request object
 * @returns A response with the result of the webhook call
 */
export async function POST(request: NextRequest) {
  console.log('🔍 [WEBHOOK-TEST] Received test request');
  
  try {
    // Parse the incoming request body
    const body = await request.json();
    console.log('📦 [WEBHOOK-TEST] Request payload:', JSON.stringify(body, null, 2));
    
    // Extract URL and other parameters
    const { webhookUrl, payload, method = 'POST', queryParams } = body;
    
    if (!webhookUrl) {
      console.error('❌ [WEBHOOK-TEST] Missing webhook URL');
      return NextResponse.json(
        { error: 'Missing webhook URL', success: false },
        { status: 400 }
      );
    }
    
    // Build the final URL with query parameters for GET requests
    let finalUrl = webhookUrl;
    if (method === 'GET' && queryParams) {
      const url = new URL(webhookUrl);
      
      // Add query parameters to the URL
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      
      finalUrl = url.toString();
    }
    
    console.log(`🔗 [WEBHOOK-TEST] Forwarding ${method} request to: ${finalUrl}`);
    const startTime = Date.now();
    
    try {
      // Make the request to the webhook with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Configure the request based on the method
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      };
      
      // Only add body for POST, PUT, PATCH methods
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const actualPayload = payload || (method === 'POST' ? body : undefined);
        if (actualPayload) {
          fetchOptions.body = JSON.stringify(actualPayload);
        }
      }
      
      console.log('🚀 [WEBHOOK-TEST] Request options:', JSON.stringify({
        url: finalUrl,
        method,
        hasBody: !!fetchOptions.body,
      }));
      
      const response = await fetch(finalUrl, fetchOptions);
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`⏱️ [WEBHOOK-TEST] Response received in ${responseTime}ms`);
      console.log(`📊 [WEBHOOK-TEST] Status: ${response.status} ${response.statusText}`);
      
      // Extract response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log(`🔍 [WEBHOOK-TEST] Response headers:`, headers);
      
      // Try to get the response body as JSON first, then as text
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('📥 [WEBHOOK-TEST] Response body (JSON):', JSON.stringify(responseData, null, 2));
      } else {
        const text = await response.text();
        responseData = { text };
        console.log('📥 [WEBHOOK-TEST] Response body (Text):', text.length > 500 ? `${text.substring(0, 500)}...(truncated)` : text);
      }
      
      // Return the complete test results
      return NextResponse.json({
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers,
        responseTime,
        data: responseData,
        requestMethod: method,
        requestUrl: finalUrl
      });
      
    } catch (fetchError: any) {
      console.error(`❌ [WEBHOOK-TEST] Fetch error: ${fetchError.message}`);
      
      // Handle timeout and other fetch errors
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out after 10 seconds', success: false, timeout: true },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { error: fetchError.message, success: false, type: fetchError.name },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error(`❌ [WEBHOOK-TEST] Error processing request: ${error.message}`);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 400 }
    );
  }
}

/**
 * Handle GET requests to provide usage information
 */
export async function GET() {
  return NextResponse.json({
    info: "Webhook testing API endpoint",
    usage: {
      method: "POST",
      body: {
        webhookUrl: "https://your-n8n-webhook-url.com/webhook/path",
        method: "GET or POST",
        payload: {
          // Your webhook payload here (for POST requests)
        },
        queryParams: {
          // Your query parameters here (for GET requests)
        }
      }
    },
    supportedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
    note: "This API acts as a proxy for testing webhook connections with detailed logging"
  });
} 