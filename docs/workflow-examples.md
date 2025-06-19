// Example: How Claude would programmatically build a complete workflow
// This shows what happens behind the scenes when you ask Claude to create a workflow

// Step 1: Create the workflow
const workflow = await createWorkflow({
  name: "Customer Data Processor"
});
// Returns: { id: "workflow_123", name: "Customer Data Processor" }

// Step 2: Add webhook node
await addNode({
  workflowId: "workflow_123",
  nodeName: "Customer Webhook",
  nodeType: "n8n-nodes-base.webhook",
  position: [250, 300],
  parameters: {
    httpMethod: "POST",
    path: "/customer-data",
    responseMode: "onReceived",
    responseData: "success"
  }
});

// Step 3: Add validation node (IF)
await addNode({
  workflowId: "workflow_123",
  nodeName: "Validate Data",
  nodeType: "n8n-nodes-base.if",
  position: [450, 300],
  parameters: {
    conditions: {
      boolean: [
        {
          value1: "={{ $json.email !== undefined && $json.name !== undefined }}",
          value2: true
        }
      ]
    }
  }
});

// Step 4: Add database node (for valid data)
await addNode({
  workflowId: "workflow_123",
  nodeName: "Save to Database",
  nodeType: "n8n-nodes-base.postgres",
  position: [650, 200],
  parameters: {
    operation: "insert",
    table: "customers",
    columns: "email,name,created_at",
    additionalFields: {}
  }
});

// Step 5: Add error handler (for invalid data)
await addNode({
  workflowId: "workflow_123",
  nodeName: "Error Response",
  nodeType: "n8n-nodes-base.respondToWebhook",
  position: [650, 400],
  parameters: {
    respondWith: "json",
    responseBody: JSON.stringify({
      error: "Missing required fields",
      required: ["email", "name"]
    }),
    responseCode: 400
  }
});

// Step 6: Add success response
await addNode({
  workflowId: "workflow_123",
  nodeName: "Success Response",
  nodeType: "n8n-nodes-base.respondToWebhook",
  position: [850, 200],
  parameters: {
    respondWith: "json",
    responseBody: JSON.stringify({
      message: "Customer saved successfully",
      id: "={{ $json.id }}"
    }),
    responseCode: 200
  }
});

// Step 7: Connect all nodes
// Webhook -> Validate
await connectNodes({
  workflowId: "workflow_123",
  sourceNode: "Customer Webhook",
  targetNode: "Validate Data"
});

// Validate -> Save (true branch)
await connectNodes({
  workflowId: "workflow_123",
  sourceNode: "Validate Data",
  targetNode: "Save to Database",
  sourceOutput: "main",
  outputIndex: 0  // True branch
});

// Validate -> Error (false branch)
await connectNodes({
  workflowId: "workflow_123",
  sourceNode: "Validate Data",
  targetNode: "Error Response",
  sourceOutput: "main",
  outputIndex: 1  // False branch
});

// Save -> Success
await connectNodes({
  workflowId: "workflow_123",
  sourceNode: "Save to Database",
  targetNode: "Success Response"
});

// Result: A complete workflow that:
// 1. Accepts customer data via webhook
// 2. Validates required fields
// 3. Saves valid data to PostgreSQL
// 4. Returns appropriate success/error responses

// You can ask Claude things like:
// "Create a workflow that processes customer registrations with validation"
// "Add email notification after saving to database"
// "Update the validation to also check email format"
// "Show me how the workflow is connected"