import { AgentConfig, TranscriptItem } from "@/app/types";

/**
 * Function to retry a fetch request with exponential backoff
 * @param url The URL to fetch
 * @param options Fetch options
 * @param retries Number of retries
 * @param backoff Initial backoff time in ms
 * @returns Promise with the fetch response
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 300) {
  try {
    // Attempt the fetch
    const response = await fetch(url, options);
    
    // If successful, return the response
    if (response.ok) {
      return response;
    }
    
    // If we're out of retries, throw an error
    if (retries <= 0) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    
    // Wait for backoff time
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Retry with increased backoff time
    console.log(`Retrying request, ${retries} attempts left`);
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    // Wait for backoff time
    await new Promise(resolve => setTimeout(resolve, backoff));
    
    // Retry with increased backoff time
    console.log(`Request failed with error, retrying. ${retries} attempts left`);
    console.error(error);
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

/**
 * Helper function to process the webhook response and extract the output
 * @param response The response from the webhook
 * @returns The extracted output data
 */
async function processWebhookResponse(response: Response) {
  // Parse the response as JSON
  const data = await response.json();
  
  // Check if the response contains the expected output property
  if (data && data.output) {
    console.log('Successfully received webhook response with output property');
    return data.output;
  }
  
  // If output property isn't found, log and return the whole data
  console.warn('Webhook response missing expected "output" property, returning full response');
  return data;
}

/**
 * Function to send a message to the webhook and get response data
 * 
 * @param args The arguments from the tool call
 * @param _transcriptLogsFiltered Optional transcript logs
 * @returns The processed response data
 */
async function webhookRequestLookup(args: { message: string, sessionId?: string, contactMessage?: string }, _transcriptLogsFiltered?: TranscriptItem[]) {
  try {
    // Log the function call and message content for debugging
    console.log(`📌 [REALTY-MOBILE-AGENT] Making webhook request with message: ${args.message}`);
    
    // For debugging, log the actual contactMessage value if provided separately
    if (args.contactMessage) {
      console.log(`📱 [REALTY-MOBILE-AGENT] Original contactMessage value: ${args.contactMessage}`);
    }
    
    // Log the message structure to help debug JSON issues
    try {
      // If message is already a JSON string, parse it to see its structure
      const parsedMessage = JSON.parse(args.message);
      console.log(`📋 [REALTY-MOBILE-AGENT] Parsed message structure:`, parsedMessage);
    } catch {
      // If it's not JSON, that's fine - it might be a plain string
      console.log(`📝 [REALTY-MOBILE-AGENT] Message is not in JSON format, treating as plain string`);
    }
    
    // Log session ID if provided
    if (args.sessionId) {
      console.log(`🔑 [REALTY-MOBILE-AGENT] Using sessionId: ${args.sessionId}`);
    }
    
    // Base webhook URL 
    const baseUrl = '/api/realty'; // Use local API route to avoid CORS issues
    
    // Create URL object for easy parameter manipulation
    const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Process the message before adding as query parameter
    let processedMessage = args.message;
    
    // If message is a complex object (in string form), process it
    try {
      // Try to parse it as JSON to see if it's a stringified object
      const parsedJson = JSON.parse(args.message);
      
      // If we successfully parsed it and it's an object, extract the relevant content
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        console.log(`📦 [REALTY-MOBILE-AGENT] Message is a JSON object, extracting content`);
        
        // Extract the message content based on available properties
        if (parsedJson.text) {
          processedMessage = parsedJson.text;
        } else if (parsedJson.query) {
          processedMessage = parsedJson.query;
        } else if (parsedJson.message) {
          processedMessage = parsedJson.message;
        } else {
          // Keep the whole JSON if no specific property found
          processedMessage = JSON.stringify(parsedJson);
        }
      }
    } catch {
      // Message is not JSON, use it as is
      console.log(`📝 [REALTY-MOBILE-AGENT] Message is not JSON, using as plain string`);
    }
    
    // Add query parameters to the URL
    url.searchParams.append('contactMessage', processedMessage);
    console.log(`🔗 [REALTY-MOBILE-AGENT] Added contactMessage parameter: ${processedMessage}`);
    
    // Add sessionId parameter if provided
    if (args.sessionId) {
      url.searchParams.append('sessionId', args.sessionId);
      console.log(`🔑 [REALTY-MOBILE-AGENT] Added sessionId parameter: ${args.sessionId}`);
    }
    
    // Get the final URL
    const requestUrl = url.toString();
    console.log(`🔗 [REALTY-MOBILE-AGENT] Final request URL: ${requestUrl}`);
    
    // Set up fetch options for a GET request
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };
    
    console.log(`🚀 [REALTY-MOBILE-AGENT] Sending GET request to: ${requestUrl}`);
    
    // Make the request with retry capability
    const response = await fetchWithRetry(requestUrl, fetchOptions);
    console.log(`📊 [REALTY-MOBILE-AGENT] Response status: ${response.status}`);
    
    // Process and return the response data
    const data = await processWebhookResponse(response);
    console.log('✅ [REALTY-MOBILE-AGENT] Webhook response data:', data);
    
    return data;
  } catch (error) {
    console.error('❌ [REALTY-MOBILE-AGENT] Error in webhookRequestLookup:', error);
    throw new Error(`Failed to fetch data from webhook: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get property details using the webhook
 * Adapted to match the AgentConfig toolLogic signature
 * 
 * @param args The arguments from the tool call
 * @param transcriptLogsFiltered Optional transcript logs
 * @returns The property details from the webhook
 */
async function getPropertyDetails(args: { propertyId: string }, transcriptLogsFiltered?: TranscriptItem[]) {
  try {
    // Create a message for property details request
    const message = JSON.stringify({
      request_type: 'property_details',
      property_id: args.propertyId
    });
    
    console.log(`🏠 [REALTY-MOBILE-AGENT] Getting property details for ID: ${args.propertyId}`);
    
    // Use the common webhook request function
    return await webhookRequestLookup({ message }, transcriptLogsFiltered);
  } catch (error) {
    console.error('Error in getPropertyDetails:', error);
    throw new Error(`Failed to get property details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Compare properties using the webhook
 * Adapted to match the AgentConfig toolLogic signature
 * 
 * @param args The arguments from the tool call
 * @param transcriptLogsFiltered Optional transcript logs
 * @returns Comparison data from the webhook
 */
async function compareProperties(args: { properties: string[] }, transcriptLogsFiltered?: TranscriptItem[]) {
  try {
    // Create a message for property comparison request
    const message = JSON.stringify({
      request_type: 'compare_properties',
      property_ids: args.properties
    });
    
    console.log(`🏠 [REALTY-MOBILE-AGENT] Comparing properties: ${args.properties.join(', ')}`);
    
    // Use the common webhook request function
    return await webhookRequestLookup({ message }, transcriptLogsFiltered);
  } catch (error) {
    console.error('Error in compareProperties:', error);
    throw new Error(`Failed to compare properties: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search properties by amenities using the webhook
 * Adapted to match the AgentConfig toolLogic signature
 * 
 * @param args The arguments from the tool call
 * @param transcriptLogsFiltered Optional transcript logs
 * @returns Search results from the webhook
 */
async function searchByAmenities(args: { amenities: string[], location?: string }, transcriptLogsFiltered?: TranscriptItem[]) {
  try {
    // Create a message for amenity search request
    const message = JSON.stringify({
      request_type: 'search_by_amenities',
      amenities: args.amenities,
      location: args.location || ""
    });
    
    console.log(`🏠 [REALTY-MOBILE-AGENT] Searching for properties with amenities: ${args.amenities.join(', ')}`);
    
    // Use the common webhook request function
    return await webhookRequestLookup({ message }, transcriptLogsFiltered);
  } catch (error) {
    console.error('Error in searchByAmenities:', error);
    throw new Error(`Failed to search by amenities: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Default instructions used if no custom prompt is provided in settings
const DEFAULT_INSTRUCTIONS = `Your Role

You are a real estate agent in Noida with 10+ years of experience, having helped 1,000+ buyers find their dream home.

What Sets You Apart:
	•	Expert Knowledge: You have deep expertise in Noida's localities, societies, and real estate trends.
	•	Buyer-Centric Approach: You understand how overwhelming home buying can be, so you take the time to listen, ask questions, and clarify preferences.
	•	Tailored Recommendations: You never give generic suggestions—you match homes based on what truly matters to each buyer.
	•	Iterative Process: After sharing recommendations, you gather feedback to refine the search and ensure buyers find the best possible home.

Your role is not just to sell properties but to guide buyers through a seamless, confident, and well-informed home-buying journey.

Context: Buyer Journey

Buyers are at different stages, and your approach should adapt accordingly:
	1.	Early Stage: Buyers are exploring all options, often feeling confused and overwhelmed. They need market insights and clarity.
	2.	Mid Stage: Buyers have preferences (e.g., budget, BHK type, location) and specific must-haves/must-not-haves but are still open to options.
	3.	Late Stage: Buyers have shortlisted properties, strict budget constraints, and are focused on final comparisons, deal evaluation, and verification.

Buyer Preferences
	•	Budget & Financing: Some buyers have fixed budgets, while others are flexible. Be mindful of price brackets.
	•	Location & Society Preferences: Some buyers prefer specific localities or societies, while others are open to suggestions.
	•	Amenities & Features: Common must-haves include parking, swimming pool, clubhouse, security, Vastu compliance, and floor preference.
	•	Builder Reputation & Project Type: Some buyers prefer reputed builders and ready-to-move properties, while others are open to under-construction projects for cost benefits.
	•	Resale vs. New Property: Some prefer new projects with modern amenities, while others look for resale properties in established localities.

Your Task
	•	Ask Only One Question at a Time. 🚨 Strict Rule: Never ask multiple questions in one response. Ask one, wait for the answer, then ask the next.
	•	Clarify Before Recommending. If details are missing, ask a follow-up question before suggesting properties.
	•	Prioritize Key Questions First. Start with budget and location, then move to specific preferences like amenities, builder reputation, and floor preference.
	•	Adapt to Buyer's Stage. Educate early-stage buyers, refine searches for mid-stage buyers, and focus on comparisons and final deals for late-stage buyers.
	•	Use Simple Language. Avoid jargon and make complex real estate terms easy to understand.
`;

// Function to create the agent config with dynamic instructions from settings
export function createRealtyMobileAgent(customInstructions?: string): AgentConfig {
  // If custom instructions are provided, use them; otherwise, use the default
  const instructions = customInstructions || DEFAULT_INSTRUCTIONS;
  
  // Log the instructions being used
  console.log(`🏠 [REALTY-MOBILE-AGENT] Creating agent with instructions: ${instructions.substring(0, 50)}...`);
  
  return {
    name: "Realty Mobile Agent",
    publicDescription: "An agent specializing in Noida real estate. Can search for properties, provide details about localities and projects.",
    instructions,
    tools: [
      {
        type: "function",
        name: "webhookRequestLookup",
        description: "Look up information about localities and projects in Noida",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message or query to send to the webhook (this will be sent as 'contactMessage' parameter)"
            },
            sessionId: {
              type: "string",
              description: "Optional session ID to identify the conversation"
            }
          },
          required: ["message"]
        }
      },
      {
        type: "function",
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
      },
      {
        type: "function",
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
      },
      {
        type: "function",
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
    ],
    toolLogic: {
      webhookRequestLookup,
      getPropertyDetails,
      compareProperties,
      searchByAmenities
    }
  };
}

// Create default instance with no custom instructions
const realtyMobileAgent = createRealtyMobileAgent();

export default realtyMobileAgent; 