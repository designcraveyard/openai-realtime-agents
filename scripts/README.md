# Webhook Testing Tools

This directory contains tools for testing webhook connectivity with the n8n server.

## Browser-based Testing Tool

A web interface is available at `/webhook-test` in your application. This provides an easy-to-use UI with the following features:

- Test webhooks directly from your browser using GET or POST methods
- Send custom payloads for POST or query parameters for GET
- View detailed response information
- Track test history
- Choose between direct requests or server-side proxy (to avoid CORS issues)

### Using the Browser Tool

1. Navigate to `/webhook-test` in your application
2. Enter the webhook URL
3. Select the HTTP method from the dropdown (GET, POST, PUT, etc.)
4. For GET requests:
   - Add query parameters using the key-value form
   - Use the sample buttons to load predefined parameters
5. For POST requests:
   - Enter a JSON payload or use the sample buttons
6. Enable "Use server-side proxy" to avoid CORS issues
7. Click "Test Request" to send the request
8. View the results in the right panel

## Command-line Testing Tool

For more advanced testing or for use in CI/CD environments, you can use the Node.js script:

### Setup

1. Install dependencies:
   ```bash
   npm install node-fetch
   ```

2. Make the script executable:
   ```bash
   chmod +x test-webhook.js
   ```

### Usage

```bash
# Run all POST tests (default)
node test-webhook.js

# Run a specific POST test
node test-webhook.js locality

# Run all GET tests
node test-webhook.js --method GET

# Run a specific GET test
node test-webhook.js locality --method GET

# Show help
node test-webhook.js --help
```

### Customizing Tests

- Edit the `TEST_PAYLOADS` object in `test-webhook.js` to customize POST request tests
- Edit the `TEST_QUERY_PARAMS` object to customize GET request tests

### Important Notes

- Always update the `WEBHOOK_URL` in the script to point to your actual n8n webhook URL
- For non-JSON responses, the script will display the first 500 characters of text
- The script includes timeout handling (10 seconds) to avoid hanging indefinitely

## Server-side Proxy API

If you need to integrate webhook testing into your own components or scripts, you can use the server-side proxy API directly:

### Endpoint

```
POST /api/webhook-test
```

### Request Body

```json
{
  "webhookUrl": "https://your-n8n-webhook-url.com/webhook/path",
  "method": "GET", // or "POST", "PUT", etc.
  "payload": {
    // Your JSON payload for POST requests
  },
  "queryParams": {
    // Your query parameters for GET requests
  }
}
```

### Response

The API returns detailed information about the request, including:
- Success status
- HTTP status code
- Response headers
- Response time in milliseconds
- Response data
- Request method and URL

## Troubleshooting Common Issues

### 404 Errors
- Verify that the webhook URL is correct
- Check that the n8n workflow is activated
- Confirm the webhook path matches what's configured in n8n

### CORS Issues
- Use the server-side proxy method in the browser tool
- Use the Node.js script which doesn't have CORS restrictions

### Timeout Errors
- Verify that the n8n server is running
- Check if your n8n workflow is processing correctly
- Consider extending the timeout period for complex workflows 