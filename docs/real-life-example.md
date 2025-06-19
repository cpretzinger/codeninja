// Example: What happens when you say "Fix the error in the HTTP Request node"

// Step 1: Claude diagnoses the node
const diagnosis = await diagnoseNodeError({
  workflowId: "workflow_123",
  nodeName: "HTTP Request",
  limit: 5
});

/* Returns:
{
  "nodeName": "HTTP Request",
  "totalErrors": 3,
  "recentErrors": [
    {
      "executionId": "exec_456",
      "timestamp": "2024-01-20T10:30:00Z",
      "error": "RequestError: timeout of 5000ms exceeded",
      "cause": "ETIMEDOUT"
    },
    {
      "executionId": "exec_457",
      "timestamp": "2024-01-20T10:35:00Z",
      "error": "RequestError: timeout of 5000ms exceeded",
      "cause": "ETIMEDOUT"
    }
  ],
  "commonIssues": ["Connection issues"],
  "recommendations": [
    "Verify URL/endpoint is accessible",
    "Check timeout settings"
  ]
}
*/

// Step 2: Claude identifies the issue - timeout errors
// Step 3: Claude applies the fix
const fixResult = await fixCommonNodeErrors({
  workflowId: "workflow_123",
  nodeName: "HTTP Request",
  errorType: "connection_error"  // Auto-detected from diagnosis
});

/* What Claude actually does:
1. Gets the workflow
2. Finds the HTTP Request node
3. Updates the configuration:
   - Increases timeout from 5000ms to 30000ms
   - Verifies URL is properly formatted
   - Adds retry configuration
*/

// Step 4: Claude validates the fix
const validation = await validateWorkflow({
  workflowId: "workflow_123"
});

// Step 5: Claude's response to you:
/*
"I found and fixed the timeout issue in your HTTP Request node:

**Problem Detected:**
- The node was timing out after 5 seconds
- This happened in 3 recent executions

**Fix Applied:**
- Increased timeout to 30 seconds
- Added retry logic (3 attempts)
- Verified the URL is accessible

**Next Steps:**
1. Test the workflow again
2. If it still fails, the target server might be slow
3. Consider adding error handling for failed requests

Would you like me to add an error handler node after the HTTP Request?"
*/

// Example 2: Fixing missing required fields
// When you say: "The database node isn't working"

const dbDiagnosis = await diagnoseNodeError({
  workflowId: "workflow_789",
  nodeName: "Save to Database"
});

/* Returns error like:
"error": "Error: Table name is required for INSERT operation"
*/

// Claude's fix:
const dbFix = await fixCommonNodeErrors({
  workflowId: "workflow_789",
  nodeName: "Save to Database"
});

// What happens behind the scenes:
/*
1. Detects it's a postgres node with INSERT operation
2. Sees table name is missing
3. Adds placeholder: table = "table_name"
4. Adds comment about needing real table name
*/

// Claude's response:
/*
"I found the issue with your database node:

**Problem:** Missing table name for INSERT operation

**Fix Applied:**
- Added placeholder table name 'table_name'
- Set operation type to INSERT

**Action Required:**
You need to update the table name to your actual table. 
What table should this data be saved to?"
*/

// Example 3: Complex workflow validation
// When you say: "Check my entire Order Processing workflow"

const fullValidation = await validateWorkflow({
  workflowId: "workflow_order_process"
});

/* Returns:
{
  "workflowName": "Order Processing",
  "isActive": true,
  "nodeCount": 8,
  "issues": [
    "HTTP Request node 'Fetch Inventory' is missing URL",
    "Database node 'Save Order' is missing operation type"
  ],
  "warnings": [
    "Node 'Send Email' is not connected to any other nodes",
    "Multiple webhook nodes with same path: /order"
  ],
  "info": [
    "Node 'Debug Logger' is disabled"
  ],
  "isValid": false,
  "summary": "Found 2 issues that need fixing"
}
*/

// Claude then automatically fixes each issue:
for (const node of ['Fetch Inventory', 'Save Order']) {
  await fixCommonNodeErrors({
    workflowId: "workflow_order_process",
    nodeName: node,
    errorType: "auto_detect"
  });
}

// And provides a comprehensive response:
/*
"I've analyzed your Order Processing workflow and found several issues:

**Critical Issues (Fixed):**
1. ✅ HTTP Request 'Fetch Inventory' - Added default URL
2. ✅ Database 'Save Order' - Set operation to INSERT

**Warnings:**
1. ⚠️ 'Send Email' node is disconnected - Should I connect it after 'Save Order'?
2. ⚠️ Duplicate webhook paths - You have 2 webhooks on '/order'

**Info:**
- The 'Debug Logger' node is disabled (this might be intentional)

**Recommendations:**
1. Update the Fetch Inventory URL to your actual API endpoint
2. Specify the correct table name in Save Order node
3. Consider using different paths for your webhooks (/order/create, /order/update)

Would you like me to fix the connection issues as well?"
*/