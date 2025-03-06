#!/usr/bin/env node

// Webhook Testing Utility
// This script allows you to test the n8n webhook connection
// without going through the whole agent system

const fetch = require('node-fetch');

// Change this to your actual n8n webhook URL
const WEBHOOK_URL = 'https://n8n-railway-custom-production-953e.up.railway.app/webhook/realty-agent';

// Test payloads for different scenarios (used for POST requests)
const TEST_PAYLOADS = {
  // Test for locality lookup
  locality: {
    query_type: 'locality',
    search_term: 'Sector 150 Noida',
    filters: {},
    request_type: 'general_lookup'
  },
  
  // Test for project lookup
  project: {
    query_type: 'project',
    search_term: 'Green Valley',
    filters: {},
    request_type: 'general_lookup'
  },
  
  // Test for property details
  propertyDetails: {
    query_type: 'property',
    property_id: '123456',
    request_type: 'property_details'
  },
  
  // Test with property filters
  filtered: {
    query_type: 'property_type',
    search_term: 'apartment',
    filters: {
      min_price: 50,
      max_price: 100,
      bedrooms: 3
    },
    request_type: 'general_lookup'
  },
  
  // Minimal test payload (just to check if webhook is responding)
  minimal: {
    test: true
  }
};

// Query parameters for GET requests
const TEST_QUERY_PARAMS = {
  // Test for locality lookup (GET)
  locality: {
    contactMessage: JSON.stringify({
      query_type: 'locality',
      search_term: 'Sector 150 Noida',
      request_type: 'general_lookup'
    }),
    sessionId: 'test-session-1'
  },
  
  // Test for project lookup (GET)
  project: {
    contactMessage: JSON.stringify({
      query_type: 'project',
      search_term: 'Green Valley',
      request_type: 'general_lookup'
    }),
    sessionId: 'test-session-2'
  },
  
  // Test for property details (GET)
  propertyDetails: {
    contactMessage: JSON.stringify({
      query_type: 'property',
      property_id: '123456',
      request_type: 'property_details'
    }),
    sessionId: 'test-session-3'
  },
  
  // Minimal test query (GET)
  minimal: {
    contactMessage: JSON.stringify({
      test: 'true'
    }),
    sessionId: 'test-session-4'
  }
};

/**
 * Test the webhook with a given payload or query parameters
 * @param {string} testName - The name of the test
 * @param {object} payload - The payload to send (for POST) or query params (for GET)
 * @param {string} method - HTTP method to use (GET, POST, etc.)
 * @param {string} webhookUrl - The webhook URL to test
 */
async function testWebhook(testName, payload, method = 'POST', webhookUrl = WEBHOOK_URL) {
  console.log('\n' + '='.repeat(50));
  console.log(`Running test: ${testName} (${method})`);
  console.log('-'.repeat(50));
  
  let finalUrl = webhookUrl;
  
  // For GET requests, build URL with query parameters
  if (method === 'GET' && payload) {
    const url = new URL(webhookUrl);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    finalUrl = url.toString();
    console.log('URL with query params:', finalUrl);
  } else {
    console.log('URL:', webhookUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));
  }
  
  const startTime = Date.now();
  
  try {
    // Configure request options
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
      }
    };
    
    // Add payload for non-GET requests
    if (method !== 'GET' && payload) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    
    // Make the request to the webhook
    console.log('\nSending request...');
    const response = await fetch(finalUrl, options);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`\nResponse received in ${responseTime}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Log response headers
    console.log('\nResponse Headers:');
    response.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });
    
    // Log response body
    let responseData;
    try {
      responseData = await response.json();
      console.log('\nResponse JSON:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (e) {
      const text = await response.text();
      console.log('\nResponse Text:');
      console.log(text);
      responseData = { text };
    }
    
    // Return the test result
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTime,
      response: responseData
    };
    
  } catch (error) {
    console.error('\nError testing webhook:');
    console.error(error);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Run all tests or a specific test
 * @param {string} specificTest - Optional name of a specific test to run
 * @param {string} method - HTTP method to use (GET or POST)
 */
async function runTests(specificTest = null, method = 'POST') {
  console.log('Webhook Testing Utility');
  console.log('======================\n');
  console.log('Testing webhook URL:', WEBHOOK_URL);
  console.log('Using HTTP method:', method);
  
  const results = {};
  
  // Choose test data based on method
  const testData = method === 'GET' ? TEST_QUERY_PARAMS : TEST_PAYLOADS;
  
  const testsToRun = specificTest 
    ? { [specificTest]: testData[specificTest] }
    : testData;
  
  if (specificTest && !testData[specificTest]) {
    console.error(`Error: Test "${specificTest}" not found for ${method} method!`);
    console.log(`Available tests for ${method}:`, Object.keys(testData).join(', '));
    process.exit(1);
  }
  
  for (const [testName, payload] of Object.entries(testsToRun)) {
    results[testName] = await testWebhook(testName, payload, method);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`TEST SUMMARY (${method})`);
  console.log('='.repeat(50));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [testName, result] of Object.entries(results)) {
    if (result.success) {
      successCount++;
      console.log(`✅ ${testName}: SUCCESS (${result.status}, ${result.responseTime}ms)`);
    } else {
      failCount++;
      console.log(`❌ ${testName}: FAILED - ${result.error || `Status: ${result.status}`}`);
    }
  }
  
  console.log('\nResults:', `${successCount} passed, ${failCount} failed`);
}

// Handle command line arguments
const args = process.argv.slice(2);
let testName = null;
let method = 'POST';

// Process arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--method' || args[i] === '-m') {
    if (i + 1 < args.length) {
      method = args[i + 1].toUpperCase();
      i++; // Skip the next arg
    }
  } else if (args[i] === '--help' || args[i] === '-h') {
    showHelp();
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    testName = args[i];
  }
}

// Run the tests
runTests(testName, method);

// Help function
function showHelp() {
  console.log(`
Webhook Testing Utility
=======================

Usage:
  node test-webhook.js [test-name] [options]

Options:
  --method, -m <METHOD>  Specify the HTTP method (GET, POST, etc.)
  --help, -h             Show this help message

Available Tests for POST:
  ${Object.keys(TEST_PAYLOADS).join(', ')}

Available Tests for GET:
  ${Object.keys(TEST_QUERY_PARAMS).join(', ')}

Examples:
  node test-webhook.js                      Run all POST tests
  node test-webhook.js locality             Run the "locality" POST test
  node test-webhook.js --method GET         Run all GET tests
  node test-webhook.js locality --method GET Run the "locality" GET test
  `);
}

// NOTE: Before using this script:
// 1. Make sure to update the WEBHOOK_URL with your actual n8n webhook URL
// 2. Install node-fetch if not already installed: npm install node-fetch
// 3. Make the script executable: chmod +x test-webhook.js 