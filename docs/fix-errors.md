# n8n Error Detection & Fixing Guide

## Error Diagnosis Commands

### 1. Basic Error Check
```
"Check what's wrong with the HTTP Request node in workflow abc123"
```

Claude will:
- Analyze recent executions
- Identify error patterns
- Provide specific recommendations

### 2. Fix Common Errors
```
"Fix the error in the Database node in workflow abc123"
```

Claude will automatically:
- Detect the error type
- Apply appropriate fixes
- Update the node configuration

### 3. Validate Entire Workflow
```
"Validate my Customer Processing workflow for any issues"
```

Claude will check for:
- Unconnected nodes
- Missing required parameters
- Configuration conflicts
- Disabled nodes

### 4. Debug Specific Execution
```
"Show me what went wrong in execution xyz789 at the Transform Data node"
```

## Common Error Fixes

### HTTP Request Node Errors

**Problem:** "Connection timeout"
```
"Fix the timeout error in the API Call node"
```
Claude will:
- Add or increase timeout setting
- Verify URL is valid
- Check authentication

**Problem:** "Invalid URL"
```
"The HTTP node is showing invalid URL error"
```
Claude will:
- Check URL format
- Add https:// if missing
- Validate endpoint accessibility

### Database Node Errors

**Problem:** "Missing operation"
```
"Fix the Postgres node that's showing missing operation error"
```
Claude will:
- Set default operation (SELECT)
- Add required table name
- Check credentials

### Webhook Node Errors

**Problem:** "Duplicate path"
```
"I'm getting duplicate webhook path errors"
```
Claude will:
- Identify conflicting webhooks
- Suggest unique paths
- Update configurations

### Authentication Errors

**Problem:** "401 Unauthorized"
```
"Fix the authentication error in my Slack node"
```
Claude will:
- Check credential configuration
- Verify API key placement
- Suggest credential updates

## Advanced Debugging

### 1. Pattern Analysis
```
"Analyze the last 10 executions of workflow abc123 and tell me which nodes are failing most often"
```

### 2. Bulk Fixes
```
"Fix all HTTP Request nodes in my API Integration workflow"
```

### 3. Conditional Debugging
```
"Check why the IF node is always going to the false branch"
```

### 4. Data Flow Analysis
```
"Show me what data the Transform node received in the last failed execution"
```

## Example Conversations

### Simple Fix
**You:** "The webhook in my Order Processing workflow isn't working"
**Claude:** 
- Diagnoses: Missing webhook path
- Fixes: Adds default path "/webhook"
- Validates: Checks for conflicts
- Result: "Fixed! Webhook now listening on /webhook"

### Complex Debugging
**You:** "My workflow fails at the database node but only sometimes"
**Claude:**
- Analyzes last 5 executions
- Finds pattern: Fails when data contains null values
- Fixes: Adds data validation before database insert
- Recommends: Add error handling branch

### Full Workflow Validation
**You:** "Can you check my entire Customer Onboarding workflow for issues?"
**Claude:**
- Issues found: 2
  - Email node missing recipient field
  - Database node has no table specified
- Warnings: 1
  - Webhook node not connected to error handler
- Fixes applied automatically
- Recommendations provided

## Error Prevention Tips

### 1. Always Validate After Building
```
"Validate the workflow I just created"
```

### 2. Test with Sample Data
```
"Run my workflow with test data and check for errors"
```

### 3. Add Error Handlers
```
"Add error handling to all external API calls in my workflow"
```

### 4. Regular Health Checks
```
"Check all my active workflows for recent failures"
```

## Troubleshooting Specific Node Types

### Email Nodes
- Missing recipient
- Invalid email format
- SMTP configuration

### API/HTTP Nodes
- Timeout settings
- Authentication headers
- Response parsing

### Database Nodes
- Connection strings
- Query syntax
- Table permissions

### Transform/Code Nodes
- JavaScript errors
- Missing variables
- Type mismatches

### File Operation Nodes
- Path permissions
- File format issues
- Encoding problems

## Quick Reference

| Error Type | Common Fix | Command Example |
|------------|------------|-----------------|
| Connection Timeout | Increase timeout | "Fix timeout in HTTP node" |
| Missing Required Field | Add default values | "Fix missing fields in Set node" |
| Authentication Failed | Check credentials | "Fix auth error in Slack node" |
| Invalid JSON | Fix formatting | "Fix JSON error in webhook response" |
| Node Not Connected | Create connections | "Connect the orphaned Email node" |
| Circular Dependency | Break loop | "Fix circular connection error" |