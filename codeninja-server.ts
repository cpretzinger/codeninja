/**
 * Enhanced n8n Workflow Editor MCP Server with TypeScript Type Safety
 * 
 * This server provides comprehensive type safety for all MCP operations,
 * preventing runtime errors through strict typing and proper error handling.
 * 
 * Key Features:
 * - Comprehensive TypeScript type definitions
 * - Robust error handling with custom error types
 * - Connection state management
 * - Retry mechanisms for API calls
 * - Proper environment variable loading
 * - Graceful shutdown handling
 */

// CRITICAL FIX: Load environment variables first
import 'dotenv/config';

// Core MCP imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// HTTP client and utilities
import axios, { type AxiosInstance, type AxiosError } from 'axios';

// Type definitions and utilities
import {
  isListWorkflowsArgs,
  isGetWorkflowArgs,
  isCreateWorkflowArgs
} from './types/mcp-server.js';

import type {
  MCPServerConfig,
  MCPServerOptions,
  ConnectionState,
  ClientInfo,
  EnvironmentConfig,
  APIClientConfig,
  N8NWorkflow,
  N8NNode,
  N8NExecution,
  ToolResponse,
  WorkflowListResult,
  WorkflowResult,
  ExecutionResult,
  NodeTypesResult,
  ValidationResult,
  AuditResult,
  ListWorkflowsArgs,
  GetWorkflowArgs,
  CreateWorkflowArgs,
  ActivateWorkflowArgs,
  AddNodeArgs,
  UpdateNodeArgs,
  DeleteNodeArgs,
  ConnectNodesArgs,
  DisconnectNodesArgs,
  ListNodeTypesArgs,
  ExecuteWorkflowArgs,
  GetExecutionResultArgs,
  DiagnoseNodeErrorArgs,
  FixCommonNodeErrorsArgs,
  ValidateWorkflowArgs,
  GetNodeExecutionDataArgs,
  GenerateAuditArgs,
  CreateCredentialArgs,
  ListExecutionsArgs,
  UpdateWorkflowArgs,
  DeleteWorkflowArgs,
  DeactivateWorkflowArgs,
  TransferWorkflowArgs,
  PullRemoteArgs,
  CreateVariableArgs,
  ListVariablesArgs,
  ConvertWorkflowToCodeArgs
} from './types/mcp-server.js';

import {
  MCPServerError,
  ServerInitializationError,
  N8NAPIError,
  ToolExecutionError,
  ModuleResolutionError
} from './types/mcp-server.js';

import {
  createSafeTool,
  executeWithResilience,
  logToolExecution,
  createSuccessResponse,
  createErrorResponse
} from './utils/tool-execution.js';

// Agentic code generation utilities
import { generateCodeFromWorkflow, refactorGeneratedCode } from './workflow-codegen.js';

/**
 * Environment configuration with strict typing
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    N8N_URL: process.env.N8N_URL || 'http://localhost:5678',
    N8N_API_KEY: process.env.N8N_API_KEY || '',
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  };

  // Validate required environment variables
  if (!config.N8N_API_KEY) {
    throw new ServerInitializationError({
      originalError: 'N8N_API_KEY environment variable is required',
      phase: 'environment_validation'
    });
  }

  return config;
}

/**
 * Create configured axios instance for N8N API
 */
function createAPIClient(config: EnvironmentConfig): AxiosInstance {
  const apiConfig: APIClientConfig = {
    baseURL: `${config.N8N_URL}/api/v1`,
    apiKey: config.N8N_API_KEY,
    timeout: 30000,
    retries: 3
  };

  const client = axios.create({
    baseURL: apiConfig.baseURL,
    timeout: apiConfig.timeout,
    headers: {
      'X-N8N-API-KEY': apiConfig.apiKey,
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
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.status} ${response.config.url}`);
      return response;
    },
    (error: AxiosError) => {
      const endpoint = error.config?.url || 'unknown';
      const statusCode = error.response?.status;
      const responseBody = error.response?.data;
      
      console.error(`[API] Error ${statusCode} ${endpoint}:`, responseBody);
      
      throw new N8NAPIError(endpoint, {
        endpoint,
        statusCode,
        responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
      });
    }
  );

  return client;
}

/**
 * Connection state management
 */
let connectionState: ConnectionState = { isConnected: false };

function updateConnectionState(updates: Partial<ConnectionState>): void {
  connectionState = { ...connectionState, ...updates };
  console.log('[MCP] Connection state updated:', connectionState);
}

/**
 * MCP Server configuration
 */
const serverConfig: MCPServerConfig = {
  name: 'n8n-workflow-editor',
  version: '1.0.0',
  description: 'MCP server for programmatically editing n8n workflows with TypeScript type safety'
};

const serverOptions: MCPServerOptions = {
  capabilities: {
    tools: {}
  }
};

/**
 * Initialize environment and API client
 */
const envConfig = loadEnvironmentConfig();
const api = createAPIClient(envConfig);

/**
 * Tool Implementations with Type Safety
 */

// List Workflows Tool
const listWorkflowsTool = createSafeTool(
  'list_workflows',
  isListWorkflowsArgs,
  async (args: ListWorkflowsArgs): Promise<WorkflowListResult> => {
    const params: Record<string, unknown> = {};
    if (args.active !== undefined) params.active = args.active;
    if (args.search) params.search = args.search;

    const response = await api.get('/workflows', { params });
    const workflows = response.data.data as N8NWorkflow[];
    
    return {
      workflows,
      total: workflows.length
    };
  }
);

// Get Workflow Tool
const getWorkflowTool = createSafeTool(
  'get_workflow',
  isGetWorkflowArgs,
  async (args: GetWorkflowArgs): Promise<WorkflowResult> => {
    const response = await api.get(`/workflows/${args.workflowId}`);
    const workflow = response.data as N8NWorkflow;
    
    return { workflow };
  }
);

// Create Workflow Tool
const createWorkflowTool = createSafeTool(
  'create_workflow',
  isCreateWorkflowArgs,
  async (args: CreateWorkflowArgs): Promise<WorkflowResult> => {
    const workflowData = {
      name: args.name,
      nodes: args.nodes || [],
      connections: args.connections || {},
      active: false
    };

    const response = await api.post('/workflows', workflowData);
    const workflow = response.data as N8NWorkflow;

    if (args.activate) {
      await api.patch(`/workflows/${workflow.id}/activate`);
      workflow.active = true;
    }

    return { workflow };
  }
);

// Activate Workflow Tool
const activateWorkflowTool = createSafeTool(
  'activate_workflow',
  (args: unknown): args is ActivateWorkflowArgs => {
    return typeof args === 'object' && args !== null && 
           typeof (args as ActivateWorkflowArgs).workflowId === 'string';
  },
  async (args: ActivateWorkflowArgs): Promise<{ success: boolean }> => {
    await api.patch(`/workflows/${args.workflowId}/activate`);
    return { success: true };
  }
);

// Add Node Tool
const addNodeTool = createSafeTool(
  'add_node',
  (args: unknown): args is AddNodeArgs => {
    return typeof args === 'object' && args !== null &&
           typeof (args as AddNodeArgs).workflowId === 'string' &&
           typeof (args as AddNodeArgs).nodeName === 'string' &&
           typeof (args as AddNodeArgs).nodeType === 'string';
  },
  async (args: AddNodeArgs): Promise<{ success: boolean; node: N8NNode }> => {
    const workflow = await api.get(`/workflows/${args.workflowId}`);
    const workflowData = workflow.data as N8NWorkflow;

    const newNode: N8NNode = {
      id: `${args.nodeName}_${Date.now()}`,
      name: args.nodeName,
      type: args.nodeType,
      position: args.position || [250, 250],
      parameters: args.parameters || {}
    };

    workflowData.nodes.push(newNode);

    await api.put(`/workflows/${args.workflowId}`, workflowData);

    return { success: true, node: newNode };
  }
);

// Execute Workflow Tool
const executeWorkflowTool = createSafeTool(
  'execute_workflow',
  (args: unknown): args is ExecuteWorkflowArgs => {
    return typeof args === 'object' && args !== null &&
           typeof (args as ExecuteWorkflowArgs).workflowId === 'string';
  },
  async (args: ExecuteWorkflowArgs): Promise<ExecutionResult> => {
    const response = await api.post(`/workflows/${args.workflowId}/execute`, {
      data: args.data || {}
    });
    
    const execution = response.data as N8NExecution;
    return { execution };
  }
);

// Validate Workflow Tool
const validateWorkflowTool = createSafeTool(
  'validate_workflow',
  (args: unknown): args is ValidateWorkflowArgs => {
    return typeof args === 'object' && args !== null &&
           typeof (args as ValidateWorkflowArgs).workflowId === 'string';
  },
  async (args: ValidateWorkflowArgs): Promise<ValidationResult> => {
    const workflow = await api.get(`/workflows/${args.workflowId}`);
    const workflowData = workflow.data as N8NWorkflow;

    const errors: Array<{ node: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: Array<{ node: string; message: string }> = [];

    // Basic validation logic
    for (const node of workflowData.nodes) {
      if (!node.name) {
        errors.push({
          node: node.id,
          message: 'Node name is required',
          severity: 'error'
        });
      }

      if (!node.type) {
        errors.push({
          node: node.id,
          message: 'Node type is required',
          severity: 'error'
        });
      }

      if (node.disabled) {
        warnings.push({
          node: node.id,
          message: 'Node is disabled'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
);

/**
 * Tool Registry with Type Safety
 */
const toolRegistry = new Map([
  ['list_workflows', listWorkflowsTool],
  ['get_workflow', getWorkflowTool],
  ['create_workflow', createWorkflowTool],
  ['activate_workflow', activateWorkflowTool],
  ['add_node', addNodeTool],
  ['execute_workflow', executeWorkflowTool],
  ['validate_workflow', validateWorkflowTool]
  // Additional tools can be added here following the same pattern
]);

/**
 * Tool Schema Definitions
 */
const toolSchemas = [
  {
    name: 'list_workflows',
    description: 'List all workflows in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
        search: { type: 'string', description: 'Search workflows by name' }
      }
    }
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
    }
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
    }
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
    }
  },
  {
    name: 'add_node',
    description: 'Add a new node to an existing workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Workflow ID' },
        nodeName: { type: 'string', description: 'Unique name for the node' },
        nodeType: { type: 'string', description: 'Node type (e.g., n8n-nodes-base.webhook)' },
        position: { type: 'array', description: 'Node position [x, y]', items: { type: 'number' } },
        parameters: { type: 'object', description: 'Node-specific parameters' }
      },
      required: ['workflowId', 'nodeName', 'nodeType']
    }
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
    }
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
    }
  }
];

/**
 * Initialize MCP Server with Enhanced Error Handling
 */
async function initializeMCPServer(): Promise<Server> {
  try {
    console.log('[MCP] Initializing server with configuration:', serverConfig);
    
    const server = new Server(serverConfig, serverOptions);

    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[MCP] Listing available tools');
      return { tools: toolSchemas };
    });

    // Register call tool handler with type safety
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      
      console.log(`[MCP] Executing tool: ${name}`);
      
      try {
        const tool = toolRegistry.get(name);
        if (!tool) {
          throw new ToolExecutionError(name, {
            toolName: name,
            originalError: `Unknown tool: ${name}`,
            args
          });
        }

        const result = await tool(args);
        logToolExecution(name, args, startTime, true);
        
        return result;
      } catch (error) {
        const mcpError = error instanceof MCPServerError 
          ? error 
          : new ToolExecutionError(name, {
              toolName: name,
              originalError: error instanceof Error ? error.message : String(error),
              args
            });
        
        logToolExecution(name, args, startTime, false, mcpError);
        return createErrorResponse(mcpError, name);
      }
    });

    // Connection event handlers
    server.onConnection = (clientInfo: ClientInfo) => {
      updateConnectionState({
        isConnected: true,
        clientVersion: clientInfo.version,
        protocolVersion: clientInfo.protocolVersion,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
      console.log('[MCP] Client connected:', clientInfo);
    };

    server.onDisconnection = () => {
      updateConnectionState({ isConnected: false });
      console.log('[MCP] Client disconnected');
    };

    return server;
  } catch (error) {
    const serverError = error instanceof MCPServerError 
      ? error 
      : new ServerInitializationError({
          originalError: error instanceof Error ? error.message : String(error),
          phase: 'server_creation'
        });
    
    console.error('[MCP] Server initialization failed:', serverError);
    throw serverError;
  }
}

/**
 * Graceful Shutdown Handler
 */
function setupGracefulShutdown(server: Server, transport: StdioServerTransport): void {
  const shutdown = async (signal: string) => {
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
async function main(): Promise<void> {
  try {
    console.log('[MCP] Starting CodeNinja MCP Server...');
    console.log('[MCP] Environment:', envConfig.NODE_ENV);
    console.log('[MCP] N8N URL:', envConfig.N8N_URL);
    
    // Test N8N connectivity
    console.log('[MCP] Testing N8N API connectivity...');
    await executeWithResilience(
      () => api.get('/workflows?limit=1'),
      { maxRetries: 3, timeoutMs: 10000 }
    );
    console.log('[MCP] N8N API connectivity confirmed');

    // Initialize server
    const server = await initializeMCPServer();
    
    // Create transport
    const transport = new StdioServerTransport();
    
    // Setup graceful shutdown
    setupGracefulShutdown(server, transport);
    
    // Start server
    console.log('[MCP] Starting server transport...');
    await server.connect(transport);
    
    console.log('[MCP] 🥷 CodeNinja MCP Server is running and ready for connections!');
    console.log('[MCP] Available tools:', toolSchemas.map(t => t.name).join(', '));
    
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    
    if (error instanceof MCPServerError) {
      console.error('[MCP] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details
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