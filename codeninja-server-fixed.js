/**
 * Enhanced n8n Workflow Editor MCP Server
 * 
 * This is the fixed version that addresses the MODULE_NOT_FOUND error
 * and provides robust error handling for MCP connections.
 * 
 * Key Fixes:
 * - Explicit dotenv configuration loading
 * - Comprehensive error handling
 * - Proper module resolution
 * - Connection state management
 * - Graceful shutdown handling
 */

// CRITICAL FIX: Load environment variables first
import 'dotenv/config';

// Core MCP imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// HTTP client
import axios from 'axios';

// Agentic code generation utilities
import { generateCodeFromWorkflow, refactorGeneratedCode } from './workflow-codegen.js';

/**
 * Environment configuration with validation
 */
function loadEnvironmentConfig() {
  const config = {
    N8N_URL: process.env.N8N_URL || 'http://localhost:5678',
    N8N_API_KEY: process.env.N8N_API_KEY || '',
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };

  // Validate required environment variables
  if (!config.N8N_API_KEY) {
    throw new Error('N8N_API_KEY environment variable is required');
  }

  console.log('[ENV] Configuration loaded:', {
    N8N_URL: config.N8N_URL,
    NODE_ENV: config.NODE_ENV,
    HAS_API_KEY: !!config.N8N_API_KEY,
    HAS_OPENAI_KEY: !!config.OPENAI_API_KEY
  });

  return config;
}

/**
 * Create configured axios instance for N8N API
 */
function createAPIClient(config) {
  const client = axios.create({
    baseURL: `${config.N8N_URL}/api/v1`,
    timeout: 30000,
    headers: {
      'X-N8N-API-KEY': config.N8N_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'CodeNinja-MCP-Server/1.0.0'
    }
  });

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error.message);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      const endpoint = error.config?.url || 'unknown';
      const statusCode = error.response?.status;
      const responseBody = error.response?.data;
      
      console.error(`[API] Error ${statusCode} ${endpoint}:`, responseBody);
      
      // Create enhanced error with context
      const enhancedError = new Error(`N8N API Error: ${endpoint} (${statusCode})`);
      enhancedError.endpoint = endpoint;
      enhancedError.statusCode = statusCode;
      enhancedError.responseBody = responseBody;
      
      throw enhancedError;
    }
  );

  return client;
}

/**
 * Connection state management
 */
let connectionState = { 
  isConnected: false,
  clientVersion: null,
  protocolVersion: null,
  connectedAt: null,
  lastActivity: null
};

function updateConnectionState(updates) {
  connectionState = { ...connectionState, ...updates };
  console.log('[MCP] Connection state updated:', connectionState);
}

/**
 * Safe tool execution wrapper
 */
async function safeToolExecution(toolName, args, handler) {
  const startTime = Date.now();
  
  try {
    console.log(`[TOOL] Executing ${toolName} with args:`, args);
    const result = await handler(args);
    
    const duration = Date.now() - startTime;
    console.log(`[TOOL] ${toolName} completed successfully in ${duration}ms`);
    
    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }],
      isError: false
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TOOL] ${toolName} failed after ${duration}ms:`, error.message);
    
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error.message}`
      }],
      isError: true
    };
  }
}

/**
 * Retry mechanism for API calls
 */
async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      console.log(`[RETRY] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

/**
 * Initialize environment and API client
 */
const envConfig = loadEnvironmentConfig();
const api = createAPIClient(envConfig);

/**
 * Tool Implementations
 */

// List Workflows Tool
async function listWorkflows(args) {
  const params = {};
  if (args.active !== undefined) params.active = args.active;
  if (args.search) params.search = args.search;

  const response = await withRetry(() => api.get('/workflows', { params }));
  const workflows = response.data.data || response.data;
  
  const summary = {
    total: workflows.length,
    active: workflows.filter(w => w.active).length,
    inactive: workflows.filter(w => !w.active).length,
    workflows: workflows.map(w => ({
      id: w.id,
      name: w.name,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }))
  };
  
  return `Found ${summary.total} workflows (${summary.active} active, ${summary.inactive} inactive)\n\n${JSON.stringify(summary, null, 2)}`;
}

// Get Workflow Tool
async function getWorkflow(args) {
  if (!args.workflowId) {
    throw new Error('workflowId is required');
  }

  const response = await withRetry(() => api.get(`/workflows/${args.workflowId}`));
  const workflow = response.data;
  
  const summary = {
    id: workflow.id,
    name: workflow.name,
    active: workflow.active,
    nodeCount: workflow.nodes?.length || 0,
    nodes: workflow.nodes?.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      disabled: node.disabled || false
    })) || [],
    connections: workflow.connections || {},
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  };
  
  return `Workflow Details:\n${JSON.stringify(summary, null, 2)}`;
}

// Create Workflow Tool
async function createWorkflow(args) {
  if (!args.name) {
    throw new Error('Workflow name is required');
  }

  const workflowData = {
    name: args.name,
    nodes: args.nodes || [],
    connections: args.connections || {},
    active: false
  };

  const response = await withRetry(() => api.post('/workflows', workflowData));
  const workflow = response.data;

  if (args.activate) {
    await withRetry(() => api.patch(`/workflows/${workflow.id}/activate`));
    workflow.active = true;
  }

  return `Created workflow "${workflow.name}" with ID: ${workflow.id}${args.activate ? ' (activated)' : ''}`;
}

// Activate Workflow Tool
async function activateWorkflow(args) {
  if (!args.workflowId) {
    throw new Error('workflowId is required');
  }

  await withRetry(() => api.patch(`/workflows/${args.workflowId}/activate`));
  return `Workflow ${args.workflowId} has been activated successfully`;
}

// Execute Workflow Tool
async function executeWorkflow(args) {
  if (!args.workflowId) {
    throw new Error('workflowId is required');
  }

  const response = await withRetry(() => api.post(`/workflows/${args.workflowId}/execute`, {
    data: args.data || {}
  }));
  
  const execution = response.data;
  return `Workflow execution started with ID: ${execution.id}\nStatus: ${execution.status}`;
}

// Validate Workflow Tool
async function validateWorkflow(args) {
  if (!args.workflowId) {
    throw new Error('workflowId is required');
  }

  const response = await withRetry(() => api.get(`/workflows/${args.workflowId}`));
  const workflow = response.data;

  const validation = {
    workflowId: workflow.id,
    name: workflow.name,
    isValid: true,
    errors: [],
    warnings: [],
    nodeCount: workflow.nodes?.length || 0
  };

  // Basic validation
  if (!workflow.nodes || workflow.nodes.length === 0) {
    validation.errors.push('Workflow has no nodes');
    validation.isValid = false;
  }

  workflow.nodes?.forEach(node => {
    if (!node.name) {
      validation.errors.push(`Node ${node.id} has no name`);
      validation.isValid = false;
    }
    if (!node.type) {
      validation.errors.push(`Node ${node.id} has no type`);
      validation.isValid = false;
    }
    if (node.disabled) {
      validation.warnings.push(`Node ${node.name} is disabled`);
    }
  });

  return `Workflow Validation Results:\n${JSON.stringify(validation, null, 2)}`;
}

/**
 * Tool Registry
 */
const tools = [
  {
    name: 'list_workflows',
    description: 'List all workflows in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
        search: { type: 'string', description: 'Search workflows by name' }
      }
    },
    handler: listWorkflows
  },
  {
    name: 'get_workflow',
    description: 'Get complete workflow details including all nodes and connections',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID' }
      },
      required: ['workflowId']
    },
    handler: getWorkflow
  },
  {
    name: 'create_workflow',
    description: 'Create a new workflow',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        nodes: { type: 'array', description: 'Array of nodes to add' },
        connections: { type: 'object', description: 'Node connections' },
        activate: { type: 'boolean', description: 'Activate the workflow after creation' }
      },
      required: ['name']
    },
    handler: createWorkflow
  },
  {
    name: 'activate_workflow',
    description: 'Activate (deploy) an existing workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID' }
      },
      required: ['workflowId']
    },
    handler: activateWorkflow
  },
  {
    name: 'execute_workflow',
    description: 'Execute a workflow manually',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID' },
        data: { type: 'object', description: 'Input data for the workflow' }
      },
      required: ['workflowId']
    },
    handler: executeWorkflow
  },
  {
    name: 'validate_workflow',
    description: 'Validate entire workflow for common issues',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID' }
      },
      required: ['workflowId']
    },
    handler: validateWorkflow
  }
];

/**
 * Initialize MCP Server
 */
async function initializeMCPServer() {
  try {
    console.log('[MCP] Initializing server...');
    
    const server = new Server({
      name: 'n8n-workflow-editor',
      version: '1.0.0',
      description: 'MCP server for programmatically editing n8n workflows'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[MCP] Listing available tools');
      return { 
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Register call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      console.log(`[MCP] Executing tool: ${name}`);
      updateConnectionState({ lastActivity: new Date() });
      
      const tool = tools.find(t => t.name === name);
      if (!tool) {
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true
        };
      }

      return await safeToolExecution(name, args || {}, tool.handler);
    });

    return server;
  } catch (error) {
    console.error('[MCP] Server initialization failed:', error);
    throw error;
  }
}

/**
 * Graceful Shutdown Handler
 */
function setupGracefulShutdown(server, transport) {
  const shutdown = async (signal) => {
    console.log(`[MCP] Received ${signal}, shutting down gracefully...`);
    
    try {
      updateConnectionState({ isConnected: false });
      await transport.close();
      console.log('[MCP] Server shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[MCP] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    console.error('[MCP] Uncaught exception:', error);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[MCP] Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Main Server Startup
 */
async function main() {
  try {
    console.log('[MCP] Starting CodeNinja MCP Server...');
    console.log('[MCP] Environment:', envConfig.NODE_ENV);
    console.log('[MCP] N8N URL:', envConfig.N8N_URL);
    
    // Test N8N connectivity
    console.log('[MCP] Testing N8N API connectivity...');
    await withRetry(() => api.get('/workflows?limit=1'), 3, 2000);
    console.log('[MCP] N8N API connectivity confirmed');

    // Initialize server
    const server = await initializeMCPServer();
    
    // Create transport
    const transport = new StdioServerTransport();
    
    // Setup graceful shutdown
    setupGracefulShutdown(server, transport);
    
    // Update connection state when client connects
    const originalConnect = server.connect.bind(server);
    server.connect = async (transport) => {
      const result = await originalConnect(transport);
      updateConnectionState({
        isConnected: true,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
      return result;
    };
    
    // Start server
    console.log('[MCP] Starting server transport...');
    await server.connect(transport);
    
    console.log('[MCP] 🥷 CodeNinja MCP Server is running and ready for connections!');
    console.log('[MCP] Available tools:', tools.map(t => t.name).join(', '));
    
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    
    if (error.endpoint) {
      console.error('[MCP] API Error details:', {
        endpoint: error.endpoint,
        statusCode: error.statusCode,
        responseBody: error.responseBody
      });
    }
    
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});