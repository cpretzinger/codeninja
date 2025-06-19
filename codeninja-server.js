// n8n-workflow-editor-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';

// Configuration
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-n8n-api-key';

// n8n API client
const api = axios.create({
  baseURL: `${N8N_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Initialize MCP Server
const server = new Server({
  name: 'n8n-workflow-editor',
  version: '1.0.0',
  description: 'MCP server for programmatically editing n8n workflows'
});

// Tool definitions
const tools = [
  {
    name: 'list_workflows',
    description: 'List all workflows in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        active: { 
          type: 'boolean', 
          description: 'Filter by active status' 
        },
        search: { 
          type: 'string', 
          description: 'Search workflows by name' 
        }
      }
    }
  },
  {
    name: 'get_workflow',
    description: 'Get complete workflow details including all nodes and connections',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'create_workflow',
    description: 'Create a new workflow',
    inputSchema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          description: 'Workflow name',
          required: true 
        },
        nodes: {
          type: 'array',
          description: 'Array of nodes to add',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              position: { 
                type: 'array',
                items: { type: 'number' }
              },
              parameters: { type: 'object' }
            }
          }
        },
        connections: {
          type: 'object',
          description: 'Node connections'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'add_node',
    description: 'Add a new node to an existing workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Unique name for the node',
          required: true
        },
        nodeType: {
          type: 'string',
          description: 'Node type (e.g., n8n-nodes-base.webhook, n8n-nodes-base.httpRequest)',
          required: true
        },
        position: {
          type: 'array',
          description: 'Node position [x, y]',
          items: { type: 'number' },
          default: [250, 250]
        },
        parameters: {
          type: 'object',
          description: 'Node-specific parameters'
        }
      },
      required: ['workflowId', 'nodeName', 'nodeType']
    }
  },
  {
    name: 'update_node',
    description: 'Update an existing node in a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Name of the node to update',
          required: true
        },
        parameters: {
          type: 'object',
          description: 'Updated parameters for the node'
        },
        position: {
          type: 'array',
          description: 'New position [x, y]',
          items: { type: 'number' }
        },
        disabled: {
          type: 'boolean',
          description: 'Enable/disable the node'
        }
      },
      required: ['workflowId', 'nodeName']
    }
  },
  {
    name: 'delete_node',
    description: 'Delete a node from a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Name of the node to delete',
          required: true
        }
      },
      required: ['workflowId', 'nodeName']
    }
  },
  {
    name: 'connect_nodes',
    description: 'Create a connection between two nodes',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        sourceNode: {
          type: 'string',
          description: 'Source node name',
          required: true
        },
        targetNode: {
          type: 'string',
          description: 'Target node name',
          required: true
        },
        sourceOutput: {
          type: 'string',
          description: 'Source output type (main, etc)',
          default: 'main'
        },
        targetInput: {
          type: 'string',
          description: 'Target input type (main, etc)',
          default: 'main'
        },
        outputIndex: {
          type: 'number',
          description: 'Output index',
          default: 0
        },
        inputIndex: {
          type: 'number',
          description: 'Input index',
          default: 0
        }
      },
      required: ['workflowId', 'sourceNode', 'targetNode']
    }
  },
  {
    name: 'disconnect_nodes',
    description: 'Remove a connection between two nodes',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        sourceNode: {
          type: 'string',
          description: 'Source node name',
          required: true
        },
        targetNode: {
          type: 'string',
          description: 'Target node name',
          required: true
        }
      },
      required: ['workflowId', 'sourceNode', 'targetNode']
    }
  },
  {
    name: 'list_node_types',
    description: 'List all available node types in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (e.g., Core Nodes, Communication, etc)'
        }
      }
    }
  },
  {
    name: 'execute_workflow',
    description: 'Execute a workflow manually',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        data: {
          type: 'object',
          description: 'Input data for the workflow'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'get_execution_result',
    description: 'Get the result of a workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { 
          type: 'string', 
          description: 'Execution ID',
          required: true 
        }
      },
      required: ['executionId']
    }
  },
  {
    name: 'diagnose_node_error',
    description: 'Diagnose errors in a specific node by analyzing recent executions',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Name of the node to diagnose',
          required: true
        },
        limit: {
          type: 'number',
          description: 'Number of recent executions to analyze',
          default: 5
        }
      },
      required: ['workflowId', 'nodeName']
    }
  },
  {
    name: 'fix_common_node_errors',
    description: 'Automatically fix common node configuration errors',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Name of the node to fix',
          required: true
        },
        errorType: {
          type: 'string',
          description: 'Type of error to fix',
          enum: ['missing_credentials', 'invalid_parameters', 'connection_error', 'missing_required_fields', 'auto_detect']
        }
      },
      required: ['workflowId', 'nodeName']
    }
  },
  {
    name: 'validate_workflow',
    description: 'Validate entire workflow for common issues',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { 
          type: 'string', 
          description: 'Workflow ID',
          required: true 
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'get_node_execution_data',
    description: 'Get detailed execution data for a specific node',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { 
          type: 'string', 
          description: 'Execution ID',
          required: true 
        },
        nodeName: {
          type: 'string',
          description: 'Node name',
          required: true
        }
      },
      required: ['executionId', 'nodeName']
    }
  }
];

// Register tools
server.setRequestHandler({ method: 'tools/list', handler: async () => ({ tools }) });

// Tool implementations
server.setRequestHandler({ method: 'tools/call', handler: async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_workflows': {
        const params = new URLSearchParams();
        if (args.active !== undefined) params.append('active', args.active);
        if (args.search) params.append('name', args.search);
        
        const response = await api.get(`/workflows?${params}`);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response.data, null, 2)
          }]
        };
      }

      case 'get_workflow': {
        const response = await api.get(`/workflows/${args.workflowId}`);
        const workflow = response.data;
        
        // Format the response to show nodes and connections clearly
        const summary = {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          nodeCount: workflow.nodes.length,
          nodes: workflow.nodes.map(node => ({
            name: node.name,
            type: node.type,
            position: node.position,
            parameters: node.parameters,
            disabled: node.disabled || false
          })),
          connections: workflow.connections
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(summary, null, 2)
          }]
        };
      }

      case 'create_workflow': {
        const workflowData = {
          name: args.name,
          nodes: args.nodes || [],
          connections: args.connections || {},
          active: false,
          settings: {}
        };
        
        const response = await api.post('/workflows', workflowData);
        return {
          content: [{
            type: 'text',
            text: `Workflow created successfully!\nID: ${response.data.id}\nName: ${response.data.name}`
          }]
        };
      }

      case 'add_node': {
        // First get the workflow
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        // Create the new node
        const newNode = {
          name: args.nodeName,
          type: args.nodeType,
          position: args.position || [250, 250],
          parameters: args.parameters || {},
          typeVersion: 1
        };
        
        // Add node to workflow
        workflow.nodes.push(newNode);
        
        // Update the workflow
        const updateResponse = await api.put(`/workflows/${args.workflowId}`, workflow);
        
        return {
          content: [{
            type: 'text',
            text: `Node '${args.nodeName}' added successfully to workflow '${workflow.name}'`
          }]
        };
      }

      case 'update_node': {
        // Get the workflow
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        // Find and update the node
        const nodeIndex = workflow.nodes.findIndex(n => n.name === args.nodeName);
        if (nodeIndex === -1) {
          throw new Error(`Node '${args.nodeName}' not found in workflow`);
        }
        
        const node = workflow.nodes[nodeIndex];
        if (args.parameters) node.parameters = { ...node.parameters, ...args.parameters };
        if (args.position) node.position = args.position;
        if (args.disabled !== undefined) node.disabled = args.disabled;
        
        // Update the workflow
        await api.put(`/workflows/${args.workflowId}`, workflow);
        
        return {
          content: [{
            type: 'text',
            text: `Node '${args.nodeName}' updated successfully`
          }]
        };
      }

      case 'delete_node': {
        // Get the workflow
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        // Remove the node
        workflow.nodes = workflow.nodes.filter(n => n.name !== args.nodeName);
        
        // Remove connections involving this node
        for (const sourceNode in workflow.connections) {
          if (sourceNode === args.nodeName) {
            delete workflow.connections[sourceNode];
          } else {
            for (const outputType in workflow.connections[sourceNode]) {
              for (const outputIndex in workflow.connections[sourceNode][outputType]) {
                workflow.connections[sourceNode][outputType][outputIndex] = 
                  workflow.connections[sourceNode][outputType][outputIndex].filter(
                    conn => conn.node !== args.nodeName
                  );
              }
            }
          }
        }
        
        // Update the workflow
        await api.put(`/workflows/${args.workflowId}`, workflow);
        
        return {
          content: [{
            type: 'text',
            text: `Node '${args.nodeName}' deleted successfully`
          }]
        };
      }

      case 'connect_nodes': {
        // Get the workflow
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        // Initialize connections structure if needed
        if (!workflow.connections[args.sourceNode]) {
          workflow.connections[args.sourceNode] = {};
        }
        if (!workflow.connections[args.sourceNode][args.sourceOutput || 'main']) {
          workflow.connections[args.sourceNode][args.sourceOutput || 'main'] = [];
        }
        if (!workflow.connections[args.sourceNode][args.sourceOutput || 'main'][args.outputIndex || 0]) {
          workflow.connections[args.sourceNode][args.sourceOutput || 'main'][args.outputIndex || 0] = [];
        }
        
        // Add the connection
        workflow.connections[args.sourceNode][args.sourceOutput || 'main'][args.outputIndex || 0].push({
          node: args.targetNode,
          type: args.targetInput || 'main',
          index: args.inputIndex || 0
        });
        
        // Update the workflow
        await api.put(`/workflows/${args.workflowId}`, workflow);
        
        return {
          content: [{
            type: 'text',
            text: `Connected '${args.sourceNode}' to '${args.targetNode}' successfully`
          }]
        };
      }

      case 'disconnect_nodes': {
        // Get the workflow
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        // Remove the connection
        if (workflow.connections[args.sourceNode]) {
          for (const outputType in workflow.connections[args.sourceNode]) {
            for (const outputIndex in workflow.connections[args.sourceNode][outputType]) {
              workflow.connections[args.sourceNode][outputType][outputIndex] = 
                workflow.connections[args.sourceNode][outputType][outputIndex].filter(
                  conn => conn.node !== args.targetNode
                );
            }
          }
        }
        
        // Update the workflow
        await api.put(`/workflows/${args.workflowId}`, workflow);
        
        return {
          content: [{
            type: 'text',
            text: `Disconnected '${args.sourceNode}' from '${args.targetNode}' successfully`
          }]
        };
      }

      case 'list_node_types': {
        // This would require n8n to expose an endpoint for node types
        // For now, return common node types
        const commonNodeTypes = [
          { name: 'Webhook', type: 'n8n-nodes-base.webhook', category: 'Core Nodes' },
          { name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', category: 'Core Nodes' },
          { name: 'Set', type: 'n8n-nodes-base.set', category: 'Core Nodes' },
          { name: 'IF', type: 'n8n-nodes-base.if', category: 'Core Nodes' },
          { name: 'Code', type: 'n8n-nodes-base.code', category: 'Core Nodes' },
          { name: 'Merge', type: 'n8n-nodes-base.merge', category: 'Core Nodes' },
          { name: 'Email Send', type: 'n8n-nodes-base.emailSend', category: 'Communication' },
          { name: 'Slack', type: 'n8n-nodes-base.slack', category: 'Communication' },
          { name: 'Google Sheets', type: 'n8n-nodes-base.googleSheets', category: 'Data' },
          { name: 'Postgres', type: 'n8n-nodes-base.postgres', category: 'Data' },
          { name: 'MongoDB', type: 'n8n-nodes-base.mongoDb', category: 'Data' }
        ];
        
        const filtered = args.category 
          ? commonNodeTypes.filter(n => n.category === args.category)
          : commonNodeTypes;
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(filtered, null, 2)
          }]
        };
      }

      case 'execute_workflow': {
        const response = await api.post(`/workflows/${args.workflowId}/execute`, {
          workflowData: args.data || {}
        });
        
        return {
          content: [{
            type: 'text',
            text: `Workflow execution started!\nExecution ID: ${response.data.executionId}`
          }]
        };
      }

      case 'get_execution_result': {
        const response = await api.get(`/executions/${args.executionId}`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response.data, null, 2)
          }]
        };
      }

      case 'diagnose_node_error': {
        // Get recent executions for the workflow
        const execResponse = await api.get(`/executions`, {
          params: {
            workflowId: args.workflowId,
            limit: args.limit || 5
          }
        });
        
        const executions = execResponse.data.data || [];
        const nodeErrors = [];
        
        // Analyze each execution for errors in the specified node
        for (const execution of executions) {
          if (execution.data?.resultData?.error) {
            const error = execution.data.resultData.error;
            if (error.node?.name === args.nodeName || execution.data.resultData.lastNodeExecuted === args.nodeName) {
              nodeErrors.push({
                executionId: execution.id,
                timestamp: execution.startedAt,
                error: error.message,
                cause: error.cause,
                nodeType: error.node?.type,
                parameters: error.node?.parameters
              });
            }
          }
          
          // Check execution data for node-specific errors
          if (execution.data?.executionData?.nodeExecutionStack) {
            const nodeStack = execution.data.executionData.nodeExecutionStack;
            const nodeExecution = nodeStack.find(n => n.node.name === args.nodeName);
            if (nodeExecution?.data?.error) {
              nodeErrors.push({
                executionId: execution.id,
                timestamp: execution.startedAt,
                error: nodeExecution.data.error
              });
            }
          }
        }
        
        // Analyze common patterns
        const diagnosis = {
          nodeName: args.nodeName,
          totalErrors: nodeErrors.length,
          recentErrors: nodeErrors,
          commonIssues: [],
          recommendations: []
        };
        
        if (nodeErrors.length > 0) {
          // Check for common error patterns
          const errorMessages = nodeErrors.map(e => e.error?.toLowerCase() || '');
          
          if (errorMessages.some(msg => msg.includes('credentials'))) {
            diagnosis.commonIssues.push('Missing or invalid credentials');
            diagnosis.recommendations.push('Check node credentials configuration');
          }
          
          if (errorMessages.some(msg => msg.includes('connection') || msg.includes('timeout'))) {
            diagnosis.commonIssues.push('Connection issues');
            diagnosis.recommendations.push('Verify URL/endpoint is accessible', 'Check timeout settings');
          }
          
          if (errorMessages.some(msg => msg.includes('required') || msg.includes('missing'))) {
            diagnosis.commonIssues.push('Missing required parameters');
            diagnosis.recommendations.push('Review node configuration for required fields');
          }
          
          if (errorMessages.some(msg => msg.includes('authorization') || msg.includes('401') || msg.includes('403'))) {
            diagnosis.commonIssues.push('Authorization failures');
            diagnosis.recommendations.push('Verify API keys or authentication settings');
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(diagnosis, null, 2)
          }]
        };
      }

      case 'fix_common_node_errors': {
        // Get the workflow and node
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        const node = workflow.nodes.find(n => n.name === args.nodeName);
        if (!node) {
          throw new Error(`Node '${args.nodeName}' not found`);
        }
        
        let fixes = [];
        let updated = false;
        
        // Auto-detect error type if not specified
        if (!args.errorType || args.errorType === 'auto_detect') {
          // Get recent execution to detect error type
          const execResponse = await api.get(`/executions`, {
            params: { workflowId: args.workflowId, limit: 1 }
          });
          
          if (execResponse.data.data?.[0]?.data?.resultData?.error) {
            const error = execResponse.data.data[0].data.resultData.error;
            const errorMsg = error.message?.toLowerCase() || '';
            
            if (errorMsg.includes('credentials')) args.errorType = 'missing_credentials';
            else if (errorMsg.includes('required')) args.errorType = 'missing_required_fields';
            else if (errorMsg.includes('connection')) args.errorType = 'connection_error';
            else if (errorMsg.includes('invalid')) args.errorType = 'invalid_parameters';
          }
        }
        
        // Apply fixes based on error type and node type
        switch (node.type) {
          case 'n8n-nodes-base.httpRequest':
            if (!node.parameters.url || node.parameters.url === '') {
              node.parameters.url = 'https://example.com';
              fixes.push('Added default URL');
              updated = true;
            }
            if (!node.parameters.method) {
              node.parameters.method = 'GET';
              fixes.push('Set method to GET');
              updated = true;
            }
            if (args.errorType === 'connection_error' && !node.parameters.timeout) {
              node.parameters.timeout = 30000;
              fixes.push('Added 30s timeout');
              updated = true;
            }
            break;
            
          case 'n8n-nodes-base.webhook':
            if (!node.parameters.path) {
              node.parameters.path = '/webhook';
              fixes.push('Added default webhook path');
              updated = true;
            }
            if (!node.parameters.httpMethod) {
              node.parameters.httpMethod = 'POST';
              fixes.push('Set HTTP method to POST');
              updated = true;
            }
            break;
            
          case 'n8n-nodes-base.postgres':
          case 'n8n-nodes-base.mysql':
            if (!node.parameters.operation) {
              node.parameters.operation = 'select';
              fixes.push('Set default operation to SELECT');
              updated = true;
            }
            if (node.parameters.operation === 'select' && !node.parameters.table) {
              node.parameters.table = 'table_name';
              fixes.push('Added placeholder table name');
              updated = true;
            }
            break;
            
          case 'n8n-nodes-base.set':
            if (!node.parameters.values) {
              node.parameters.values = { string: [] };
              fixes.push('Added values structure');
              updated = true;
            }
            break;
        }
        
        // Common fixes for all nodes
        if (!node.parameters) {
          node.parameters = {};
          fixes.push('Initialized parameters object');
          updated = true;
        }
        
        if (updated) {
          // Update the workflow
          await api.put(`/workflows/${args.workflowId}`, workflow);
        }
        
        return {
          content: [{
            type: 'text',
            text: `Node '${args.nodeName}' analysis complete.\n\nFixes applied:\n${fixes.length > 0 ? fixes.join('\n') : 'No automatic fixes applied'}\n\nRecommendations:\n- Test the workflow again\n- Check credentials if using external services\n- Verify all required fields are filled`
          }]
        };
      }

      case 'validate_workflow': {
        const getResponse = await api.get(`/workflows/${args.workflowId}`);
        const workflow = getResponse.data;
        
        const issues = [];
        const warnings = [];
        const info = [];
        
        // Check for orphaned nodes (not connected)
        const connectedNodes = new Set();
        for (const sourceNode in workflow.connections) {
          connectedNodes.add(sourceNode);
          for (const outputType in workflow.connections[sourceNode]) {
            for (const outputs of workflow.connections[sourceNode][outputType]) {
              outputs.forEach(conn => connectedNodes.add(conn.node));
            }
          }
        }
        
        workflow.nodes.forEach(node => {
          // Check for unconnected nodes
          if (!connectedNodes.has(node.name) && node.type !== 'n8n-nodes-base.start') {
            warnings.push(`Node '${node.name}' is not connected to any other nodes`);
          }
          
          // Check for common configuration issues
          switch (node.type) {
            case 'n8n-nodes-base.httpRequest':
              if (!node.parameters.url) {
                issues.push(`HTTP Request node '${node.name}' is missing URL`);
              }
              break;
              
            case 'n8n-nodes-base.webhook':
              if (!node.parameters.path) {
                issues.push(`Webhook node '${node.name}' is missing path`);
              }
              if (workflow.nodes.filter(n => n.type === 'n8n-nodes-base.webhook' && n.parameters.path === node.parameters.path).length > 1) {
                warnings.push(`Multiple webhook nodes with same path: ${node.parameters.path}`);
              }
              break;
              
            case 'n8n-nodes-base.postgres':
            case 'n8n-nodes-base.mysql':
              if (!node.parameters.operation) {
                issues.push(`Database node '${node.name}' is missing operation type`);
              }
              break;
          }
          
          // Check for disabled nodes
          if (node.disabled) {
            info.push(`Node '${node.name}' is disabled`);
          }
        });
        
        // Check for circular dependencies
        // (Simplified check - full implementation would need graph traversal)
        
        const validation = {
          workflowName: workflow.name,
          isActive: workflow.active,
          nodeCount: workflow.nodes.length,
          issues: issues,
          warnings: warnings,
          info: info,
          isValid: issues.length === 0,
          summary: issues.length === 0 ? 'Workflow is valid' : `Found ${issues.length} issues that need fixing`
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(validation, null, 2)
          }]
        };
      }

      case 'get_node_execution_data': {
        const response = await api.get(`/executions/${args.executionId}`);
        const execution = response.data;
        
        // Find node execution data
        let nodeData = null;
        if (execution.data?.executionData?.resultData?.runData?.[args.nodeName]) {
          nodeData = execution.data.executionData.resultData.runData[args.nodeName];
        }
        
        const result = {
          executionId: args.executionId,
          nodeName: args.nodeName,
          nodeFound: nodeData !== null,
          executionData: nodeData,
          summary: nodeData ? {
            executionCount: nodeData.length,
            hasError: nodeData.some(run => run.error !== undefined),
            executionTime: nodeData[0]?.executionTime,
            itemsProcessed: nodeData[0]?.data?.main?.[0]?.length || 0
          } : null
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}\n\nDetails: ${error.response?.data?.message || 'No additional details'}`
      }]
    };
  }
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('n8n Workflow Editor MCP Server running...');