/**
 * Script to test different message formats with the n8n webhook
 * This will help diagnose issues with the contactMessage parameter format
 */

// The actual webhook URL (update this with your n8n webhook URL)
const WEBHOOK_URL = 'https://n8n-railway-custom-production-953e.up.railway.app/webhook/realty-agent';

// Test different message formats to see which one works
const TEST_FORMATS = [
  // Simple string - known to work from logs
  'hello',
  
  // Simple property query
  'properties in Sector 150 Noida',
  
  // JSON object stringified
  JSON.stringify({
    query_type: 'locality',
    search_term: 'Sector 150 Noida',
    request_type: 'general_lookup'
  }),
  
  // JSON with text property
  JSON.stringify({
    text: 'properties in Sector 150 Noida'
  }),
  
  // More complex JSON structure
  JSON.stringify({
    query_type: 'locality',
    search_term: 'Sector 150 Noida',
    filters: {
      min_price: 5000000,
      max_price: 10000000,
      bedrooms: 3
    },
    request_type: 'general_lookup'
  })
];

/**
 * Test a specific message format with the webhook
 * @param {string} message - The message to test
 * @returns {Promise<object>} - The response data
 */
async function testMessageFormat(message) {
  console.log(`\n🧪 Testing message format: ${message}`);
  
  // Build the webhook URL with the contactMessage parameter
  const url = new URL(WEBHOOK_URL);
  url.searchParams.append('contactMessage', message);
  // Add a test session ID
  url.searchParams.append('sessionId', 'test-session-' + Date.now());
  const fullUrl = url.toString();
  
  console.log(`🔗 Request URL: ${fullUrl}`);
  
  const startTime = Date.now();
  
  try {
    // Make the request to the webhook
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const endTime = Date.now();
    console.log(`⏱️ Response time: ${endTime - startTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Error: Webhook responded with status ${response.status}`);
      try {
        const errorText = await response.text();
        console.error(`❌ Error response: ${errorText}`);
      } catch (e) {
        console.error(`❌ Could not read error response`);
      }
      return { success: false, status: response.status };
    }
    
    // Parse and log the response
    const data = await response.json();
    console.log(`✅ Response data:`, data);
    
    return {
      success: true,
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all the tests
 */
async function runTests() {
  console.log('🚀 Starting webhook format tests...');
  
  // Test each format
  for (let i = 0; i < TEST_FORMATS.length; i++) {
    const format = TEST_FORMATS[i];
    console.log(`\n📝 Test ${i+1}/${TEST_FORMATS.length}:`);
    await testMessageFormat(format);
  }
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Test script error:', err);
  process.exit(1);
}); 