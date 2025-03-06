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
 * Build a URL with query parameters for a GET request
 * @param baseUrl The base URL
 * @param message The message to send as the 'message' query parameter
 * @returns The complete URL with query parameters
 */
function buildWebhookUrl(baseUrl: string, message: string): string {
  // Create URL object for easy parameter manipulation
  const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  // Process the message before adding as query parameter
  let processedMessage = message;
  
  // If message is a complex object (in string form), make sure it's properly formatted
  try {
    // Try to parse it as JSON to see if it's a stringified object
    const parsedJson = JSON.parse(message);
    
    // If we successfully parsed it and it's an object, ensure it's properly stringified
    if (typeof parsedJson === 'object' && parsedJson !== null) {
      // For n8n, we need to match the exact format from the working example
      // Keep the message as simple as possible
      console.log(`📦 [REALTY-AGENT] Message is a JSON object, converting to proper format`);
      
      // If parsedJson has a text/query property, prioritize that as the message
      if (parsedJson.text) {
        processedMessage = parsedJson.text;
        console.log(`🔄 [REALTY-AGENT] Using 'text' property from JSON: ${processedMessage}`);
      } else if (parsedJson.query) {
        processedMessage = parsedJson.query;
        console.log(`🔄 [REALTY-AGENT] Using 'query' property from JSON: ${processedMessage}`);
      } else if (parsedJson.message) {
        processedMessage = parsedJson.message;
        console.log(`🔄 [REALTY-AGENT] Using 'message' property from JSON: ${processedMessage}`);
      } else {
        // Re-stringify the whole object, ensuring consistent format
        processedMessage = JSON.stringify(parsedJson);
        console.log(`🔄 [REALTY-AGENT] Using entire JSON object as message`);
      }
    }
  } catch {
    // Message is not JSON, use it as is
    console.log(`📝 [REALTY-AGENT] Message is not JSON, using as plain string`);
  }
  
  // Add the message parameter with proper encoding
  url.searchParams.append('message', processedMessage);
  console.log(`🔗 [REALTY-AGENT] Final message parameter: ${processedMessage}`);
  
  // Return the complete URL string
  return url.toString();
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
 * Function to make a GET request to the webhook with the message parameter
 * Adapted to match the AgentConfig toolLogic signature
 * 
 * @param args The arguments from the tool call
 * @param transcriptLogsFiltered Optional transcript logs
 * @returns The processed response data
 */
async function webhookRequestLookup(args: { message: string }, _transcriptLogsFiltered?: TranscriptItem[]) {
  try {
    // Log the function call and message content for debugging
    console.log(`📌 [REALTY-AGENT] Making webhook request with message: ${args.message}`);
    
    // Log the message structure to help debug JSON issues
    try {
      // If message is already a JSON string, parse it to see its structure
      const parsedMessage = JSON.parse(args.message);
      console.log(`📋 [REALTY-AGENT] Parsed message structure:`, parsedMessage);
    } catch {
      // If it's not JSON, that's fine - it might be a plain string
      console.log(`📝 [REALTY-AGENT] Message is not in JSON format, treating as plain string`);
    }
    
    // Base webhook URL 
    const baseUrl = '/api/realty'; // Use local API route to avoid CORS issues
    
    // Build the complete URL with the message query parameter
    const requestUrl = buildWebhookUrl(baseUrl, args.message);
    console.log(`🔗 [REALTY-AGENT] Built request URL: ${requestUrl}`);
    
    // Set up fetch options for a GET request
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };
    
    console.log(`🚀 [REALTY-AGENT] Sending GET request to: ${requestUrl}`);
    
    // Make the request with retry capability
    const response = await fetchWithRetry(requestUrl, fetchOptions);
    console.log(`📊 [REALTY-AGENT] Response status: ${response.status}`);
    
    // Process and return the response data
    const data = await processWebhookResponse(response);
    console.log('✅ [REALTY-AGENT] Webhook response data:', data);
    
    return data;
  } catch (error) {
    console.error('❌ [REALTY-AGENT] Error in webhookRequestLookup:', error);
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
    
    // Use the common webhook request function
    return await webhookRequestLookup({ message }, transcriptLogsFiltered);
  } catch (error) {
    console.error('Error in searchByAmenities:', error);
    throw new Error(`Failed to search by amenities: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Agent configuration
const realtyAgent: AgentConfig = {
  name: "Realty Agent",
  publicDescription: "An agent specializing in Noida real estate. Can search for properties, provide details about localities and projects.",
  instructions: `You are a knowledgeable real estate agent specializing in Noida, India. 
  You have extensive knowledge about different sectors, housing projects, and property options in Noida.
  You can help users find properties, understand locality features, and compare different options.
  Always be helpful, accurate, and provide detailed responses about real estate in Noida.`,
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
            description: "JSON format message with query details. Can include query_type (locality, project, property_type), search_term, filters, and request_type (general_lookup)"
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

export default realtyAgent; 