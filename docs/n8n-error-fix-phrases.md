# n8n Error Fixing Phrasebook

## How to Ask Claude to Fix Errors

### Quick Fixes

| What You Say | What Claude Does |
|--------------|------------------|
| "Fix the error in node X" | Auto-detects and fixes the most recent error |
| "The webhook isn't working" | Checks path, method, and response configuration |
| "Database node is broken" | Verifies operation, table, and connection settings |
| "HTTP request times out" | Increases timeout and adds retry logic |
| "Fix all errors in workflow ABC" | Validates entire workflow and fixes all issues |

### Specific Error Messages

**"Cannot read property 'X' of undefined"**
- Say: "Fix the undefined property error in the Transform node"
- Claude: Adds null checks and default values

**"ECONNREFUSED"**
- Say: "The API node can't connect"
- Claude: Checks URL, adds error handling

**"401 Unauthorized"**
- Say: "Fix authentication error in Slack node"
- Claude: Reviews credentials configuration

**"Missing required parameter"**
- Say: "The Email node is missing required fields"
- Claude: Adds all required parameters with placeholders

### Diagnostic Requests

**Recent Failures:**
```
"Why did my Customer Import workflow fail last time?"
"Show me all errors from today"
"Which node fails most often?"
```

**Pattern Analysis:**
```
"Does the error happen every time or randomly?"
"Is it failing for specific data?"
"When did this start failing?"
```

**Data Inspection:**
```
"What data did the node receive before it failed?"
"Show me the error details"
"What was the actual error message?"
```

### Bulk Operations

**Fix All Nodes of a Type:**
```
"Fix all HTTP Request nodes in my workflow"
"Update all database nodes to use the new table"
"Add error handling to all external API calls"
```

**Workflow-Wide Fixes:**
```
"Add timeouts to all HTTP nodes"
"Enable error workflows for all nodes"
"Fix all connection issues"
```

### Preventive Maintenance

**Validation:**
```
"Check my workflow for potential issues"
"Validate before I activate this workflow"
"Are there any configuration problems?"
```

**Best Practices:**
```
"Add error handling to my workflow"
"Make my workflow more reliable"
"Add logging to debug issues"
```

## Common Scenarios

### Scenario 1: Webhook Not Receiving Data
**You:** "My webhook isn't getting any data"
**Claude checks:**
- Webhook path configuration
- HTTP method (GET/POST)
- Response mode settings
- Whether workflow is active

### Scenario 2: API Integration Failing
**You:** "The API calls keep failing"
**Claude checks:**
- Authentication headers
- Request format
- Timeout settings
- URL validity
- Error responses

### Scenario 3: Database Operations Error
**You:** "Can't save to database"
**Claude checks:**
- Operation type (INSERT/UPDATE)
- Table name
- Column mappings
- Data types
- Connection credentials

### Scenario 4: Workflow Stops Mid-Execution
**You:** "Workflow stops at the IF node"
**Claude checks:**
- Condition configuration
- Input data format
- Both output branches
- Connection integrity

### Scenario 5: Intermittent Failures
**You:** "Sometimes it works, sometimes it doesn't"
**Claude analyzes:**
- Pattern in failures
- Data differences
- Timing issues
- External dependencies

## Error Recovery Strategies

### Add Fallbacks
```
"Add a fallback if the API call fails"
"Create alternative path for errors"
"Add default values for missing data"
```

### Implement Retries
```
"Add retry logic to HTTP requests"
"Try 3 times before failing"
"Add exponential backoff"
```

### Error Notifications
```
"Send me an email when this fails"
"Add Slack notification for errors"
"Log errors to a file"
```

### Data Validation
```
"Check data before database insert"
"Validate email format"
"Ensure required fields exist"
```

## Quick Troubleshooting Guide

| Symptom | Say This | Claude Will |
|---------|----------|-------------|
| Node is red | "Fix the error in [node name]" | Diagnose and fix configuration |
| Workflow won't start | "Why won't my workflow activate?" | Check for validation errors |
| Partial execution | "Why does it stop at [node]?" | Check connections and conditions |
| No output data | "The [node] returns empty data" | Verify parameters and input |
| Slow execution | "Why is [node] so slow?" | Check timeouts and optimize |
| Random failures | "Fix intermittent errors" | Add error handling and retries |

## Pro Tips

1. **Be specific about which node:**
   - Good: "Fix the HTTP Request node called 'Fetch User Data'"
   - Less helpful: "Something's broken"

2. **Mention the error if you know it:**
   - Good: "Fix the timeout error in the API node"
   - Okay: "The API node isn't working"

3. **Ask for validation after fixes:**
   - "Fix the error and then validate the whole workflow"

4. **Request explanations:**
   - "Fix the error and explain what was wrong"

5. **Ask about prevention:**
   - "Fix this and tell me how to avoid it next time"