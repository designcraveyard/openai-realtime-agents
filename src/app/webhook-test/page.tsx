'use client';

import React, { useState } from 'react';

export default function WebhookTester() {
  const [webhookUrl, setWebhookUrl] = useState('https://n8n-railway-custom-production-953e.up.railway.app/webhook/realty-agent');
  const [method, setMethod] = useState<string>('POST');
  const [payload, setPayload] = useState(JSON.stringify({
    query_type: 'locality',
    search_term: 'Sector 150 Noida',
    filters: {},
    request_type: 'general_lookup'
  }, null, 2));
  const [queryParams, setQueryParams] = useState<{key: string; value: string}[]>([
    { key: 'query_type', value: 'locality' },
    { key: 'search_term', value: 'Sector 150 Noida' }
  ]);
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [useProxy, setUseProxy] = useState(true);

  // HTTP methods
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

  // Sample payloads for quick testing
  const samplePayloads = {
    locality: {
      query_type: 'locality',
      search_term: 'Sector 150 Noida',
      filters: {},
      request_type: 'general_lookup'
    },
    project: {
      query_type: 'project',
      search_term: 'Green Valley',
      filters: {},
      request_type: 'general_lookup'
    },
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
    minimal: {
      test: true
    }
  };

  // Sample query parameters for GET requests
  const sampleQueryParams = {
    locality: [
      { key: 'query_type', value: 'locality' },
      { key: 'search_term', value: 'Sector 150 Noida' },
      { key: 'request_type', value: 'general_lookup' }
    ],
    project: [
      { key: 'query_type', value: 'project' },
      { key: 'search_term', value: 'Green Valley' },
      { key: 'request_type', value: 'general_lookup' }
    ],
    property: [
      { key: 'query_type', value: 'property' },
      { key: 'property_id', value: '12345' },
      { key: 'request_type', value: 'property_details' }
    ],
    minimal: [
      { key: 'test', value: 'true' }
    ]
  };

  // Add a query parameter row
  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  // Remove a query parameter row
  const removeQueryParam = (index: number) => {
    const updatedParams = [...queryParams];
    updatedParams.splice(index, 1);
    setQueryParams(updatedParams);
  };

  // Update a query parameter
  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const updatedParams = [...queryParams];
    updatedParams[index][field] = value;
    setQueryParams(updatedParams);
  };

  // Convert query parameters to an object for the request
  const getQueryParamsObject = () => {
    const paramsObject: Record<string, string> = {};
    queryParams.forEach(param => {
      if (param.key.trim()) {
        paramsObject[param.key.trim()] = param.value;
      }
    });
    return paramsObject;
  };

  // Test the webhook with the current payload
  const testWebhook = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setStatus('Sending request...');
    
    const startTime = Date.now();
    
    try {
      // Prepare request data based on method
      let parsedPayload: any = null;
      let queryParamsObject: Record<string, string> = {};
      
      if (method === 'GET') {
        // For GET requests, use query parameters
        queryParamsObject = getQueryParamsObject();
        console.log(`Testing ${method} webhook at: ${webhookUrl}`);
        console.log('Query params:', queryParamsObject);
      } else {
        // For other methods, parse the JSON payload
        try {
          parsedPayload = JSON.parse(payload);
          console.log(`Testing ${method} webhook at: ${webhookUrl}`);
          console.log('Payload:', parsedPayload);
        } catch (e) {
          setError(`Invalid JSON payload: ${e instanceof Error ? e.message : String(e)}`);
          setLoading(false);
          return;
        }
      }
      
      console.log('Using proxy:', useProxy);
      
      let responseData;
      let statusText;
      
      // Make the request - either directly or through our proxy
      if (useProxy) {
        // Use the proxy API route
        const proxyResponse = await fetch('/api/webhook-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookUrl,
            method,
            payload: parsedPayload,
            queryParams: queryParamsObject
          }),
        });
        
        const endTime = Date.now();
        setResponseTime(endTime - startTime);
        
        statusText = `${proxyResponse.status} ${proxyResponse.statusText}`;
        setStatus(statusText);
        
        // Get response data
        const proxyData = await proxyResponse.json();
        
        if (proxyData.success) {
          responseData = proxyData.data;
          console.log('Proxy successful, data:', responseData);
        } else {
          setError(proxyData.error || 'Failed to get a valid response from the webhook');
          responseData = proxyData;
          console.error('Proxy error:', proxyData);
        }
      } else {
        // Direct request to webhook
        if (method === 'GET') {
          // For GET requests, append query parameters to the URL
          const url = new URL(webhookUrl);
          Object.entries(queryParamsObject).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });
          
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          const endTime = Date.now();
          setResponseTime(endTime - startTime);
          
          statusText = `${response.status} ${response.statusText}`;
          setStatus(statusText);
          
          // Try to get JSON response
          try {
            responseData = await response.json();
          } catch {
            const text = await response.text();
            responseData = { text };
          }
        } else {
          // For other methods (POST, PUT, etc.)
          const response = await fetch(webhookUrl, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: payload,
          });
          
          const endTime = Date.now();
          setResponseTime(endTime - startTime);
          
          statusText = `${response.status} ${response.statusText}`;
          setStatus(statusText);
          
          // Try to get JSON response
          try {
            responseData = await response.json();
          } catch {
            const text = await response.text();
            responseData = { text };
          }
        }
      }
      
      // Set response data
      setResponse(responseData);
      
      // Add to history
      setTestHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          url: webhookUrl,
          method,
          payload: method === 'GET' ? null : parsedPayload,
          queryParams: method === 'GET' ? queryParamsObject : null,
          status: statusText,
          response: responseData,
          responseTime: responseTime,
          useProxy
        },
        ...prev.slice(0, 9) // Keep last 10 tests
      ]);
      
    } catch (error) {
      console.error('Error testing webhook:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setStatus('Error');
      
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
    } finally {
      setLoading(false);
    }
  };

  // Load a sample payload for POST requests
  const loadSample = (key: keyof typeof samplePayloads) => {
    setPayload(JSON.stringify(samplePayloads[key], null, 2));
  };

  // Load a sample query parameters for GET requests
  const loadQueryParamsSample = (key: keyof typeof sampleQueryParams) => {
    setQueryParams([...sampleQueryParams[key]]);
  };

  // Clear response and history
  const clearResults = () => {
    setResponse(null);
    setStatus('');
    setError(null);
    setResponseTime(null);
  };

  const clearHistory = () => {
    setTestHistory([]);
  };

  // Handle method change
  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    
    // Reset state as needed when switching methods
    setError(null);
    setResponse(null);
    
    // Set default payload or query params based on method
    if (newMethod === 'GET' && queryParams.length === 0) {
      loadQueryParamsSample('locality');
    } else if (['POST', 'PUT', 'PATCH'].includes(newMethod) && !payload) {
      loadSample('locality');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Webhook Testing Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Test inputs */}
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">HTTP Method</label>
            <select 
              value={method}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {httpMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          {/* Conditional rendering based on method */}
          {method === 'GET' ? (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Query Parameters</label>
                <button 
                  onClick={addQueryParam}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  Add Parameter
                </button>
              </div>
              
              {queryParams.length === 0 ? (
                <div className="text-sm text-gray-500 mb-2">No query parameters added</div>
              ) : (
                <div className="space-y-2 mb-2">
                  {queryParams.map((param, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                        className="flex-1 p-2 border rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                        className="flex-1 p-2 border rounded text-sm"
                      />
                      <button
                        onClick={() => removeQueryParam(index)}
                        className="p-2 text-red-500 rounded hover:bg-red-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 flex flex-wrap gap-2">
                <button 
                  onClick={() => loadQueryParamsSample('locality')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Locality Sample
                </button>
                <button 
                  onClick={() => loadQueryParamsSample('project')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Project Sample
                </button>
                <button 
                  onClick={() => loadQueryParamsSample('property')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Property Sample
                </button>
                <button 
                  onClick={() => loadQueryParamsSample('minimal')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Minimal Sample
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Payload (JSON)</label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={10}
                className="w-full p-2 border rounded font-mono text-sm"
              />
              
              <div className="mt-2 flex flex-wrap gap-2">
                <button 
                  onClick={() => loadSample('locality')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Locality Sample
                </button>
                <button 
                  onClick={() => loadSample('project')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Project Sample
                </button>
                <button 
                  onClick={() => loadSample('filtered')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Filtered Sample
                </button>
                <button 
                  onClick={() => loadSample('minimal')} 
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Minimal Sample
                </button>
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useProxy}
                onChange={(e) => setUseProxy(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm">
                Use server-side proxy (avoids CORS, provides better error handling)
              </span>
            </label>
          </div>
          
          <div className="mb-6">
            <button
              onClick={testWebhook}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing...' : `Test ${method} Request`}
            </button>
            
            <button
              onClick={clearResults}
              className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
          
          {/* Instructions */}
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-bold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Enter the n8n webhook URL</li>
              <li>Select the HTTP method (GET, POST, etc.)</li>
              <li>{method === 'GET' ? 'Add query parameters' : 'Enter a JSON payload'}</li>
              <li>Select whether to use the server-side proxy (recommended)</li>
              <li>Click &quot;Test {method} Request&quot; to send the request</li>
            </ol>
          </div>
        </div>
        
        {/* Right column - Results */}
        <div className="bg-gray-50 p-4 rounded">
          <h2 className="text-xl font-bold mb-4">Test Results</h2>
          
          {loading && (
            <div className="animate-pulse text-center py-4">
              Testing webhook... Please wait
            </div>
          )}
          
          {status && (
            <div className="mb-4">
              <div className="font-semibold">Status:</div>
              <div className={`px-3 py-2 rounded ${status.startsWith('2') ? 'bg-green-100' : 'bg-red-100'}`}>
                {status}
              </div>
            </div>
          )}
          
          {responseTime !== null && (
            <div className="mb-4">
              <div className="font-semibold">Response Time:</div>
              <div className="px-3 py-2 rounded bg-gray-100">
                {responseTime}ms
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4">
              <div className="font-semibold">Error:</div>
              <div className="px-3 py-2 rounded bg-red-100 text-sm">
                {error}
              </div>
            </div>
          )}
          
          {response && (
            <div>
              <div className="font-semibold mb-2">Response:</div>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Troubleshooting tips */}
          {error && (
            <div className="mt-4 bg-yellow-50 p-3 rounded text-sm">
              <p className="font-semibold">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                {error.includes('Failed to fetch') && (
                  <li>Try using the server-side proxy option to avoid CORS issues</li>
                )}
                {error.includes('404') || status?.includes('404') ? (
                  <>
                    <li>Check that the webhook URL is correct</li>
                    <li>Verify that the n8n workflow is activated</li>
                    <li>Confirm that the webhook node in n8n has the correct path</li>
                  </>
                ) : null}
                {error.includes('timeout') || error.includes('Timeout') ? (
                  <li>The webhook server might be down or taking too long to respond</li>
                ) : null}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Test History</h2>
            <button
              onClick={clearHistory}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Clear History
            </button>
          </div>
          
          <div className="space-y-4">
            {testHistory.map((test, index) => (
              <div key={index} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold">{new Date(test.timestamp).toLocaleString()}</div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-full text-xs ${test.status?.startsWith('2') ? 'bg-green-100' : 'bg-red-100'}`}>
                      {test.status}
                    </div>
                    <div className="text-xs bg-blue-100 px-2 py-1 rounded">
                      {test.method}
                    </div>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {test.useProxy ? 'via proxy' : 'direct'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{test.responseTime}ms</div>
                <div className="text-sm font-mono truncate mb-2">{test.url}</div>
                <details>
                  <summary className="cursor-pointer text-sm text-blue-500">View Details</summary>
                  <div className="mt-2 space-y-2">
                    {test.method === 'GET' && test.queryParams && (
                      <div>
                        <div className="text-xs font-semibold">Query Parameters:</div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(test.queryParams, null, 2)}
                        </pre>
                      </div>
                    )}
                    {test.method !== 'GET' && test.payload && (
                      <div>
                        <div className="text-xs font-semibold">Payload:</div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(test.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold">Response:</div>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(test.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 