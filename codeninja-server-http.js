/**
 * Enhanced n8n Workflow Editor MCP Server with HTTP/SSE Transport
 *
 * This server provides comprehensive type safety for all MCP operations over HTTP,
 * solving Docker exit code 0 issues by using persistent HTTP server instead of stdio.
 *
 * Key Features:
 * - HTTP/SSE transport for persistent connections
 * - Connection pool management with automatic cleanup
 * - Health check and metrics endpoints
 * - Comprehensive TypeScript type definitions
 * - Robust error handling with custom error types
 * - Graceful shutdown handling
 * - Docker-friendly persistent server
 */
// CRITICAL FIX: Load environment variables first
import 'dotenv/config';
// Core MCP imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// HTTP server imports
import express from 'express';
// HTTP client and utilities
import axios from 'axios';
// Type definitions and utilities
import { isListWorkflowsArgs, isGetWorkflowArgs, isCreateWorkflowArgs } from './types/mcp-server.js';
import { ServerInitializationError, N8NAPIError } from './types/mcp-server.js';
import { createSafeTool, createSuccessResponse, createErrorResponse } from './utils/tool-execution.js';
import { SSEConnectionPool, createSSEConnection, generateConnectionId, validateSSERequest, setupSSEHeaders } from './utils/connection-pool.js';
/**
 * Environment configuration with strict typing
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
function createAPIClient(config) {
    const apiConfig = {
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
            'User-Agent': 'CodeNinja-MCP-Server-HTTP/1.0.0'
        }
    });
    // Add request interceptor for logging
    client.interceptors.request.use((config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    }, (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    });
    // Add response interceptor for error handling
    client.interceptors.response.use((response) => {
        console.log(`[API] ${response.status} ${response.config.url}`);
        return response;
    }, (error) => {
        const endpoint = error.config?.url || 'unknown';
        const statusCode = error.response?.status;
        const responseBody = error.response?.data;
        console.error(`[API] Error ${statusCode} ${endpoint}:`, responseBody);
        throw new N8NAPIError(endpoint, {
            endpoint,
            statusCode,
            responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
        });
    });
    return client;
}
/**
 * HTTP Transport Configuration
 */
function loadHTTPConfig() {
    return {
        port: parseInt(process.env.HTTP_PORT || '3000', 10),
        host: process.env.HTTP_HOST || '0.0.0.0',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100', 10),
        connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT || '300000', 10),
        keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '60000', 10)
    };
}
let serverState;
/**
 * MCP Server configuration
 */
const serverConfig = {
    name: 'n8n-workflow-editor-http',
    version: '1.0.0',
    description: 'MCP server for programmatically editing n8n workflows with HTTP transport'
};
const serverOptions = {
    capabilities: {
        tools: {}
    }
};
/**
 * Initialize environment and API client
 */
const envConfig = loadEnvironmentConfig();
const httpConfig = loadHTTPConfig();
const api = createAPIClient(envConfig);
/**
 * Tool Implementations with Type Safety (reusing existing implementations)
 */
// List Workflows Tool
const listWorkflowsTool = createSafeTool('list_workflows', isListWorkflowsArgs, async (args) => {
    const params = {};
    if (args.active !== undefined)
        params.active = args.active;
    if (args.search)
        params.search = args.search;
    const response = await api.get('/workflows', { params });
    const workflows = response.data.data;
    return {
        workflows,
        total: workflows.length
    };
});
// Get Workflow Tool
const getWorkflowTool = createSafeTool('get_workflow', isGetWorkflowArgs, async (args) => {
    const response = await api.get(`/workflows/${args.workflowId}`);
    const workflow = response.data;
    return { workflow };
});
// Create Workflow Tool
const createWorkflowTool = createSafeTool('create_workflow', isCreateWorkflowArgs, async (args) => {
    const workflowData = {
        name: args.name,
        nodes: args.nodes || [],
        connections: args.connections || {},
        active: false
    };
    const response = await api.post('/workflows', workflowData);
    let workflow = response.data;
    if (args.activate) {
        await api.patch(`/workflows/${workflow.id}/activate`);
        workflow = { ...workflow, active: true };
    }
    return { workflow };
});
// Activate Workflow Tool
const activateWorkflowTool = createSafeTool('activate_workflow', (args) => {
    return typeof args === 'object' && args !== null &&
        typeof args.workflowId === 'string';
}, async (args) => {
    await api.patch(`/workflows/${args.workflowId}/activate`);
    return { success: true };
});
// Execute Workflow Tool
const executeWorkflowTool = createSafeTool('execute_workflow', (args) => {
    return typeof args === 'object' && args !== null &&
        typeof args.workflowId === 'string';
}, async (args) => {
    const response = await api.post(`/workflows/${args.workflowId}/execute`, {
        data: args.data || {}
    });
    const execution = response.data;
    return { execution };
});
// Validate Workflow Tool
const validateWorkflowTool = createSafeTool('validate_workflow', (args) => {
    return typeof args === 'object' && args !== null &&
        typeof args.workflowId === 'string';
}, async (args) => {
    const workflow = await api.get(`/workflows/${args.workflowId}`);
    const workflowData = workflow.data;
    const errors = [];
    const warnings = [];
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
});
/**
 * Tool Registry with Type Safety
 */
const toolRegistry = new Map([
    ['list_workflows', listWorkflowsTool],
    ['get_workflow', getWorkflowTool],
    ['create_workflow', createWorkflowTool],
    ['activate_workflow', activateWorkflowTool],
    ['execute_workflow', executeWorkflowTool],
    ['validate_workflow', validateWorkflowTool]
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
 * Initialize MCP Server with HTTP Transport
 */
async function initializeMCPServer() {
    try {
        console.log('[MCP] Initializing HTTP server with configuration:', serverConfig);
        const server = new Server({
            name: serverConfig.name,
            version: serverConfig.version
        }, serverOptions);
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
            serverState.requestCount++;
            try {
                const tool = toolRegistry.get(name);
                if (!tool) {
                    serverState.failedRequests++;
                    return createErrorResponse(`Unknown tool: ${name}`);
                }
                const result = await tool.execute(args || {});
                const duration = Date.now() - startTime;
                console.log(`[MCP] Tool ${name} completed in ${duration}ms`);
                serverState.successfulRequests++;
                return createSuccessResponse(result);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[MCP] Tool ${name} failed after ${duration}ms:`, error);
                serverState.failedRequests++;
                return createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
            }
        });
        return server;
    }
    catch (error) {
        console.error('[MCP] Server initialization failed:', error);
        throw new ServerInitializationError({
            originalError: error instanceof Error ? error.message : 'Unknown error',
            phase: 'mcp_server_init'
        });
    }
}
/**
 * Create Express HTTP Server
 */
function createHTTPServer() {
    const app = express();
    // Middleware
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        }
        else {
            next();
        }
    });
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    // Request logging middleware
    app.use((req, res, next) => {
        console.log(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
        next();
    });
    // Health check endpoint
    app.get('/health', (req, res) => {
        const uptime = Date.now() - serverState.startTime.getTime();
        const memoryUsage = process.memoryUsage();
        const poolState = serverState.connectionPool.getPoolState();
        const healthResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime,
            connections: {
                active: poolState.activeCount,
                total: poolState.totalConnections
            },
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal
            },
            version: serverConfig.version
        };
        res.json(healthResponse);
    });
    // Metrics endpoint
    app.get('/metrics', (req, res) => {
        const uptime = Date.now() - serverState.startTime.getTime();
        const memoryUsage = process.memoryUsage();
        const poolState = serverState.connectionPool.getPoolState();
        const metricsResponse = {
            server: {
                uptime,
                startTime: serverState.startTime.toISOString(),
                version: serverConfig.version
            },
            connections: {
                active: poolState.activeCount,
                total: poolState.totalConnections,
                maxConcurrent: httpConfig.maxConnections,
                averageLifetime: 0 // TODO: Calculate from connection history
            },
            requests: {
                total: serverState.requestCount,
                successful: serverState.successfulRequests,
                failed: serverState.failedRequests,
                averageResponseTime: 0 // TODO: Track response times
            },
            memory: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss
            }
        };
        res.json(metricsResponse);
    });
    // SSE endpoint for MCP connections
    app.post('/sse', async (req, res) => {
        try {
            console.log('[SSE] New connection request');
            // Validate SSE request
            if (!validateSSERequest(req.headers)) {
                res.status(400).json({ error: 'Invalid SSE request headers' });
                return;
            }
            // Setup SSE headers
            setupSSEHeaders(res);
            // Create connection ID and client info
            const connectionId = generateConnectionId();
            const clientInfo = {
                version: req.headers['user-agent'] || 'unknown',
                protocolVersion: '1.0.0',
                capabilities: {}
            };
            // Create SSE transport
            const transport = new SSEServerTransport('/message', res);
            // Create connection object
            const connection = createSSEConnection(connectionId, clientInfo, transport, res);
            // Add to connection pool
            await serverState.connectionPool.addConnection(connection);
            // Connect MCP server to transport
            await serverState.mcpServer.connect(transport);
            console.log(`[SSE] Connection ${connectionId} established`);
            // Handle connection cleanup on close
            res.on('close', async () => {
                console.log(`[SSE] Connection ${connectionId} closed`);
                await serverState.connectionPool.removeConnection(connectionId);
            });
        }
        catch (error) {
            console.error('[SSE] Connection error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to establish SSE connection' });
            }
        }
    });
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({ error: 'Endpoint not found' });
    });
    // Error handler
    app.use((error, req, res, next) => {
        console.error('[HTTP] Unhandled error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    return app;
}
/**
 * Graceful Shutdown Handler
 */
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        console.log(`[HTTP] Received ${signal}, shutting down gracefully...`);
        try {
            serverState.isRunning = false;
            // Shutdown connection pool
            await serverState.connectionPool.shutdown();
            console.log('[HTTP] Server shutdown complete');
            process.exit(0);
        }
        catch (error) {
            console.error('[HTTP] Error during shutdown:', error);
            process.exit(1);
        }
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
        console.error('[HTTP] Uncaught exception:', error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        console.error('[HTTP] Unhandled rejection:', reason);
        shutdown('unhandledRejection');
    });
}
/**
 * Main server initialization
 */
async function main() {
    try {
        console.log('[HTTP] 🥷 CodeNinja MCP Server starting with HTTP transport...');
        console.log('[HTTP] Configuration:', {
            port: httpConfig.port,
            host: httpConfig.host,
            maxConnections: httpConfig.maxConnections,
            environment: envConfig.NODE_ENV
        });
        // Initialize connection pool
        const connectionPool = new SSEConnectionPool(httpConfig);
        // Initialize MCP server
        const mcpServer = await initializeMCPServer();
        // Create HTTP server
        const httpServer = createHTTPServer();
        // Initialize server state
        serverState = {
            isRunning: true,
            startTime: new Date(),
            connectionPool,
            mcpServer,
            httpServer,
            requestCount: 0,
            successfulRequests: 0,
            failedRequests: 0
        };
        // Setup graceful shutdown
        setupGracefulShutdown();
        // Start HTTP server
        httpServer.listen(httpConfig.port, httpConfig.host, () => {
            console.log(`[HTTP] 🚀 Server listening on http://${httpConfig.host}:${httpConfig.port}`);
            console.log(`[HTTP] 🔗 SSE endpoint: http://${httpConfig.host}:${httpConfig.port}/sse`);
            console.log(`[HTTP] ❤️  Health check: http://${httpConfig.host}:${httpConfig.port}/health`);
            console.log(`[HTTP] 📊 Metrics: http://${httpConfig.host}:${httpConfig.port}/metrics`);
            console.log('[HTTP] ✅ Server ready for connections');
        });
    }
    catch (error) {
        console.error('[HTTP] Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
main().catch((error) => {
    console.error('[HTTP] Fatal error:', error);
    process.exit(1);
});
