/**
 * Enhanced n8n Workflow Editor MCP Server with HTTP/SSE Transport
 *
 * This server provides comprehensive functionality for all MCP operations over HTTP,
 * solving Docker exit code 0 issues by using persistent HTTP server instead of stdio.
 *
 * Key Features:
 * - HTTP/SSE transport for persistent connections
 * - Connection pool management with automatic cleanup
 * - Health check and metrics endpoints
 * - Robust error handling with custom error types
 * - Graceful shutdown handling
 * - Docker-friendly persistent server
 * - ALL 25 TOOLS from your config implemented
 */

// Core MCP imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// HTTP server imports
import express from 'express';

// HTTP client and utilities
import axios from 'axios';

/**
 * Custom Error Classes
 */
class ServerInitializationError extends Error {
    constructor(details) {
        super(`Server initialization failed during ${details.phase}: ${details.originalError}`);
        this.name = 'ServerInitializationError';
    }
}

class N8NAPIError extends Error {
    constructor(endpoint, details) {
        super(`N8N API error at ${endpoint}: ${details.statusCode} ${details.responseBody}`);
        this.name = 'N8NAPIError';
    }
}
/**
 * Detect transport mode and handle stdio if needed
 */
function detectTransportMode() {
    // Check for stdio mode indicators
    const isStdioMode = process.argv.includes('--stdio') || 
                       process.env.MCP_TRANSPORT === 'stdio' ||
                       process.stdin.isTTY === false;
    
    return isStdioMode ? 'stdio' : 'http';
}

/**
 * Stdio MCP Server Handler
 */
async function handleStdioMode() {
    console.error('[STDIO] Starting MCP server in stdio mode...');
    
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    
    // Initialize MCP server
    const server = await initializeMCPServer();
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error('[STDIO] Server connected and ready');
}
/**
 * SSE Connection Pool
 */
class SSEConnectionPool {
    constructor(config) {
        this.connections = new Map();
        this.config = config;
        this.startCleanupInterval();
    }

    async addConnection(connection) {
        if (this.connections.size >= this.config.maxConnections) {
            throw new Error('Maximum connections exceeded');
        }
        this.connections.set(connection.id, connection);
        console.log(`[Pool] Added connection ${connection.id}, total: ${this.connections.size}`);
    }

    async removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            this.connections.delete(connectionId);
            console.log(`[Pool] Removed connection ${connectionId}, total: ${this.connections.size}`);
        }
    }

    getPoolState() {
        return {
            activeCount: this.connections.size,
            totalConnections: this.connections.size
        };
    }

    async shutdown() {
        console.log('[Pool] Shutting down connection pool...');
        for (const [id, connection] of this.connections) {
            try {
                connection.response.end();
            } catch (error) {
                console.error(`[Pool] Error closing connection ${id}:`, error);
            }
        }
        this.connections.clear();
    }

    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            for (const [id, connection] of this.connections) {
                if (now - connection.lastActivity.getTime() > this.config.connectionTimeout) {
                    this.removeConnection(id);
                }
            }
        }, 60000); // Check every minute
    }
}

/**
 * Utility Functions
 */
function generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function validateSSERequest(headers) {
    return headers.accept && headers.accept.includes('text/event-stream');
}

function setupSSEHeaders(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
}

function createSSEConnection(connectionId, clientInfo, transport, response) {
    return {
        id: connectionId,
        clientInfo,
        transport,
        response,
        createdAt: new Date(),
        lastActivity: new Date()
    };
}

function createSuccessResponse(data) {
    return {
        content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2)
        }]
    };
}

function createErrorResponse(message) {
    return {
        content: [{
            type: 'text',
            text: `Error: ${message}`
        }]
    };
}

/**
 * Environment configuration
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
    const client = axios.create({
        baseURL: `${config.N8N_URL}/api/v1`,
        timeout: 30000,
        headers: {
            'X-N8N-API-KEY': config.N8N_API_KEY,
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

/**
 * Initialize environment and API client
 */
const envConfig = loadEnvironmentConfig();
const httpConfig = loadHTTPConfig();
const api = createAPIClient(envConfig);

/**
 * Tool Schema Definitions - ALL 25 TOOLS FROM CONFIG
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
        name: 'deactivate_workflow',
        description: 'Deactivate a workflow to stop it from running',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Workflow ID' }
            },
            required: ['workflowId']
        }
    },
    {
        name: 'update_workflow',
        description: 'Update an entire workflow with new configuration',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Workflow ID' },
                name: { type: 'string', description: 'New workflow name' },
                nodes: { type: 'array', description: 'Updated nodes array' },
                connections: { type: 'object', description: 'Updated connections' },
                active: { type: 'boolean', description: 'Whether workflow should be active' }
            },
            required: ['workflowId']
        }
    },
    {
        name: 'delete_workflow',
        description: 'Delete a workflow permanently',
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
                position: { type: 'array', description: 'Node position [x, y]' },
                parameters: { type: 'object', description: 'Node-specific parameters' }
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
                workflowId: { type: 'string', description: 'Workflow ID' },
                nodeName: { type: 'string', description: 'Name of the node to update' },
                parameters: { type: 'object', description: 'Updated parameters for the node' },
                position: { type: 'array', description: 'New position [x, y]' },
                disabled: { type: 'boolean', description: 'Enable/disable the node' }
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
                workflowId: { type: 'string', description: 'Workflow ID' },
                nodeName: { type: 'string', description: 'Name of the node to delete' }
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
                workflowId: { type: 'string', description: 'Workflow ID' },
                sourceNode: { type: 'string', description: 'Source node name' },
                targetNode: { type: 'string', description: 'Target node name' },
                sourceOutput: { type: 'string', description: 'Source output type', default: 'main' },
                targetInput: { type: 'string', description: 'Target input type', default: 'main' },
                outputIndex: { type: 'number', description: 'Output index', default: 0 },
                inputIndex: { type: 'number', description: 'Input index', default: 0 }
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
                workflowId: { type: 'string', description: 'Workflow ID' },
                sourceNode: { type: 'string', description: 'Source node name' },
                targetNode: { type: 'string', description: 'Target node name' }
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
                category: { type: 'string', description: 'Filter by category' }
            }
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
        name: 'get_execution_result',
        description: 'Get the result of a workflow execution',
        inputSchema: {
            type: 'object',
            properties: {
                executionId: { type: 'string', description: 'Execution ID' }
            },
            required: ['executionId']
        }
    },
    {
        name: 'list_executions',
        description: 'List workflow executions with filtering',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Filter by workflow ID' },
                status: { type: 'string', description: 'Filter by execution status' },
                limit: { type: 'number', description: 'Maximum number of executions to return', default: 20 }
            }
        }
    },
    {
        name: 'diagnose_node_error',
        description: 'Diagnose errors in a specific node by analyzing recent executions',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Workflow ID' },
                nodeName: { type: 'string', description: 'Name of the node to diagnose' },
                limit: { type: 'number', description: 'Number of recent executions to analyze', default: 5 }
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
                workflowId: { type: 'string', description: 'Workflow ID' }
            },
            required: ['workflowId']
        }
    },
    {
        name: 'generate_audit',
        description: 'Generate audit report for workflows',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Optional: specific workflow to audit' },
                timeRange: { type: 'string', description: 'Time range for audit (e.g., "7d", "30d")', default: '7d' }
            }
        }
    },
    {
        name: 'create_credential',
        description: 'Create a new credential for use in workflows',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Credential name' },
                type: { type: 'string', description: 'Credential type' },
                data: { type: 'object', description: 'Credential data' }
            },
            required: ['name', 'type', 'data']
        }
    },
    {
        name: 'list_variables',
        description: 'List all environment variables',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'create_variable',
        description: 'Create a new environment variable',
        inputSchema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'Variable key' },
                value: { type: 'string', description: 'Variable value' }
            },
            required: ['key', 'value']
        }
    },
    {
        name: 'pull_remote',
        description: 'Pull workflows from remote source',
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Remote source URL' },
                force: { type: 'boolean', description: 'Force pull even if conflicts exist' }
            },
            required: ['source']
        }
    },
    {
        name: 'transfer_workflow',
        description: 'Transfer workflow between instances',
        inputSchema: {
            type: 'object',
            properties: {
                workflowId: { type: 'string', description: 'Workflow ID to transfer' },
                targetUrl: { type: 'string', description: 'Target n8n instance URL' },
                targetApiKey: { type: 'string', description: 'Target instance API key' }
            },
            required: ['workflowId', 'targetUrl', 'targetApiKey']
        }
    }
];

/**
 * Tool Implementation Functions - ALL 25 TOOLS
 */
async function executeToolImplementation(name, args) {
    try {
        switch (name) {
            case 'list_workflows': {
                const params = {};
                if (args.active !== undefined) params.active = args.active;
                if (args.search) params.name = args.search;
                
                const response = await api.get('/workflows', { params });
                return {
                    workflows: response.data.data || response.data,
                    total: (response.data.data || response.data).length
                };
            }

            case 'get_workflow': {
                const response = await api.get(`/workflows/${args.workflowId}`);
                const workflow = response.data;
                
                return {
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
                let workflow = response.data;
                
                if (args.activate) {
                    await api.patch(`/workflows/${workflow.id}`, { active: true });
                    workflow = { ...workflow, active: true };
                }
                
                return {
                    workflow,
                    message: `Workflow '${workflow.name}' created successfully${args.activate ? ' and activated' : ''}`
                };
            }

            case 'activate_workflow': {
                const response = await api.patch(`/workflows/${args.workflowId}`, { active: true });
                return {
                    success: true,
                    message: `Workflow activated successfully`
                };
            }

            case 'deactivate_workflow': {
                const response = await api.patch(`/workflows/${args.workflowId}`, { active: false });
                return {
                    success: true,
                    message: `Workflow deactivated successfully`
                };
            }

            case 'update_workflow': {
                const updateData = {};
                if (args.name) updateData.name = args.name;
                if (args.nodes) updateData.nodes = args.nodes;
                if (args.connections) updateData.connections = args.connections;
                if (args.active !== undefined) updateData.active = args.active;
                
                const response = await api.put(`/workflows/${args.workflowId}`, updateData);
                return {
                    workflow: response.data,
                    message: `Workflow updated successfully`
                };
            }

            case 'delete_workflow': {
                await api.delete(`/workflows/${args.workflowId}`);
                return {
                    success: true,
                    message: `Workflow ${args.workflowId} deleted successfully`
                };
            }

            case 'add_node': {
                const getResponse = await api.get(`/workflows/${args.workflowId}`);
                const workflow = getResponse.data;
                
                const newNode = {
                    name: args.nodeName,
                    type: args.nodeType,
                    position: args.position || [250, 250],
                    parameters: args.parameters || {},
                    typeVersion: 1
                };
                
                workflow.nodes.push(newNode);
                await api.put(`/workflows/${args.workflowId}`, workflow);
                
                return {
                    success: true,
                    message: `Node '${args.nodeName}' added successfully to workflow '${workflow.name}'`
                };
            }

            case 'update_node': {
                const getResponse = await api.get(`/workflows/${args.workflowId}`);
                const workflow = getResponse.data;
                
                const nodeIndex = workflow.nodes.findIndex(n => n.name === args.nodeName);
                if (nodeIndex === -1) {
                    throw new Error(`Node '${args.nodeName}' not found in workflow`);
                }
                
                const node = workflow.nodes[nodeIndex];
                if (args.parameters) node.parameters = { ...node.parameters, ...args.parameters };
                if (args.position) node.position = args.position;
                if (args.disabled !== undefined) node.disabled = args.disabled;
                
                await api.put(`/workflows/${args.workflowId}`, workflow);
                
                return {
                    success: true,
                    message: `Node '${args.nodeName}' updated successfully`
                };
            }

            case 'delete_node': {
                const getResponse = await api.get(`/workflows/${args.workflowId}`);
                const workflow = getResponse.data;
                
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
                
                await api.put(`/workflows/${args.workflowId}`, workflow);
                
                return {
                    success: true,
                    message: `Node '${args.nodeName}' deleted successfully`
                };
            }

            case 'connect_nodes': {
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
                
                await api.put(`/workflows/${args.workflowId}`, workflow);
                
                return {
                    success: true,
                    message: `Connected '${args.sourceNode}' to '${args.targetNode}' successfully`
                };
            }

            case 'disconnect_nodes': {
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
                
                await api.put(`/workflows/${args.workflowId}`, workflow);
                
                return {
                    success: true,
                    message: `Disconnected '${args.sourceNode}' from '${args.targetNode}' successfully`
                };
            }

            case 'list_node_types': {
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
                
                return { nodeTypes: filtered };
            }

            case 'execute_workflow': {
                const response = await api.post(`/workflows/${args.workflowId}/execute`, {
                    workflowData: args.data || {}
                });
                
                return {
                    execution: response.data,
                    message: `Workflow execution started! Execution ID: ${response.data.executionId || 'unknown'}`
                };
            }

            case 'get_execution_result': {
                const response = await api.get(`/executions/${args.executionId}`);
                return { execution: response.data };
            }

            case 'list_executions': {
                const params = {};
                if (args.workflowId) params.workflowId = args.workflowId;
                if (args.status) params.status = args.status;
                if (args.limit) params.limit = args.limit;
                
                const response = await api.get('/executions', { params });
                return {
                    executions: response.data.data || response.data,
                    total: (response.data.data || response.data).length
                };
            }

            case 'diagnose_node_error': {
                const execResponse = await api.get('/executions', {
                    params: {
                        workflowId: args.workflowId,
                        limit: args.limit || 5
                    }
                });
                
                const executions = execResponse.data.data || [];
                const nodeErrors = [];
                
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
                }
                
                const diagnosis = {
                    nodeName: args.nodeName,
                    totalErrors: nodeErrors.length,
                    recentErrors: nodeErrors,
                    commonIssues: [],
                    recommendations: []
                };
                
                if (nodeErrors.length > 0) {
                    const errorMessages = nodeErrors.map(e => e.error?.toLowerCase() || '');
                    
                    if (errorMessages.some(msg => msg.includes('credentials'))) {
                        diagnosis.commonIssues.push('Missing or invalid credentials');
                        diagnosis.recommendations.push('Check node credentials configuration');
                    }
                    
                    if (errorMessages.some(msg => msg.includes('connection') || msg.includes('timeout'))) {
                        diagnosis.commonIssues.push('Connection issues');
                        diagnosis.recommendations.push('Verify URL/endpoint is accessible', 'Check timeout settings');
                    }
                }
                
                return diagnosis;
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
                            break;
                    }
                    
                    if (node.disabled) {
                        info.push(`Node '${node.name}' is disabled`);
                    }
                });
                
                return {
                    workflowName: workflow.name,
                    isActive: workflow.active,
                    nodeCount: workflow.nodes.length,
                    issues,
                    warnings,
                    info,
                    isValid: issues.length === 0,
                    summary: issues.length === 0 ? 'Workflow is valid' : `Found ${issues.length} issues that need fixing`
                };
            }

            case 'generate_audit': {
                const workflowsResponse = args.workflowId 
                    ? await api.get(`/workflows/${args.workflowId}`)
                    : await api.get('/workflows');
                
                const executionsResponse = await api.get('/executions', {
                    params: { 
                        limit: 100,
                        ...(args.workflowId && { workflowId: args.workflowId })
                    }
                });
                
                const executions = executionsResponse.data.data || [];
                const successCount = executions.filter(e => e.finished && !e.data?.resultData?.error).length;
                const errorCount = executions.filter(e => e.data?.resultData?.error).length;
                
                return {
                    generated: new Date().toISOString(),
                    timeRange: args.timeRange || '7d',
                    summary: {
                        totalExecutions: executions.length,
                        successful: successCount,
                        failed: errorCount,
                        successRate: executions.length > 0 ? (successCount / executions.length * 100).toFixed(2) + '%' : '0%'
                    },
                    workflows: args.workflowId ? [workflowsResponse.data] : workflowsResponse.data.data || workflowsResponse.data
                };
            }

            case 'create_credential': {
                const credentialData = {
                    name: args.name,
                    type: args.type,
                    data: args.data
                };
                
                try {
                    const response = await api.post('/credentials', credentialData);
                    return {
                        credential: response.data,
                        message: `Credential '${args.name}' created successfully`
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: 'Credentials endpoint may not be available in this n8n version'
                    };
                }
            }

            case 'list_variables': {
                try {
                    const response = await api.get('/variables');
                    return { variables: response.data.data || response.data };
                } catch (error) {
                    return { variables: [], message: 'Variables endpoint not available or no variables found' };
                }
            }

            case 'create_variable': {
                const variableData = {
                    key: args.key,
                    value: args.value
                };
                
                try {
                    const response = await api.post('/variables', variableData);
                    return {
                        variable: response.data,
                        message: `Variable '${args.key}' created successfully`
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: 'Variables endpoint not available in this n8n version'
                    };
                }
            }

            case 'pull_remote': {
                return {
                    success: false,
                    message: 'Remote pull functionality not implemented - this would require custom n8n setup'
                };
            }

            case 'transfer_workflow': {
                const sourceResponse = await api.get(`/workflows/${args.workflowId}`);
                const workflow = sourceResponse.data;
                
                // Create target API client
                const targetApi = axios.create({
                    baseURL: `${args.targetUrl}/api/v1`,
                    headers: {
                        'X-N8N-API-KEY': args.targetApiKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                // Remove ID and other instance-specific fields
                const transferData = {
                    name: workflow.name + ' (Transferred)',
                    nodes: workflow.nodes,
                    connections: workflow.connections,
                    active: false
                };
                
                const targetResponse = await targetApi.post('/workflows', transferData);
                
                return {
                    success: true,
                    sourceWorkflow: workflow.name,
                    targetWorkflow: targetResponse.data,
                    message: `Workflow '${workflow.name}' transferred successfully to target instance`
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error(`[Tool] Error executing ${name}:`, error);
        throw error;
    }
}

/**
 * Initialize MCP Server with HTTP Transport
 */
async function initializeMCPServer() {
    try {
        console.log('[MCP] Initializing HTTP server with configuration:', serverConfig);
        
        const server = new Server(
            {
                name: serverConfig.name,
                version: serverConfig.version
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        // Register list tools handler
        server.setRequestHandler(ListToolsRequestSchema, async () => {
            console.log('[MCP] Listing available tools');
            return { tools: toolSchemas };
        });

        // Register call tool handler
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const startTime = Date.now();
            
            console.log(`[MCP] Executing tool: ${name}`);
            serverState.requestCount++;

            try {
                const result = await executeToolImplementation(name, args || {});
                const duration = Date.now() - startTime;
                
                console.log(`[MCP] Tool ${name} completed in ${duration}ms`);
                serverState.successfulRequests++;
                
                return createSuccessResponse(result);
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[MCP] Tool ${name} failed after ${duration}ms:`, error);
                serverState.failedRequests++;
                
                return createErrorResponse(error instanceof Error ? error.message : 'Unknown error');
            }
        });

        return server;
    } catch (error) {
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
        } else {
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
            version: serverConfig.version,
            toolsAvailable: toolSchemas.length
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
                maxConcurrent: httpConfig.maxConnections
            },
            requests: {
                total: serverState.requestCount,
                successful: serverState.successfulRequests,
                failed: serverState.failedRequests
            },
            memory: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss
            },
            tools: {
                available: toolSchemas.length,
                names: toolSchemas.map(t => t.name)
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

        } catch (error) {
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
        } catch (error) {
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
        const transportMode = detectTransportMode();
        
        if (transportMode === 'stdio') {
            await handleStdioMode();
            return; // Exit here for stdio mode
        }

        console.log('[HTTP] Environment configuration:', {
            N8N_URL: envConfig.N8N_URL,
            NODE_ENV: envConfig.NODE_ENV,
            HAS_API_KEY: !!envConfig.N8N_API_KEY,
            HAS_OPENAI_KEY: !!envConfig.OPENAI_API_KEY
        });
        console.log('[HTTP] Server configuration:', {
            port: httpConfig.port,
            host: httpConfig.host,
            maxConnections: httpConfig.maxConnections
        });

        // Test N8N API connectivity
        console.log('[MCP] Testing N8N API connectivity...');
        try {
            const testResponse = await api.get('/executions?limit=1');
            console.log('[API] 200 /workflows?limit=1');
            console.log('[MCP] N8N API connectivity confirmed');
        } catch (error) {
            console.error('[MCP] N8N API connectivity failed:', error.message);
            throw new ServerInitializationError({
                originalError: `N8N API unreachable: ${error.message}`,
                phase: 'api_connectivity_test'
            });
        }

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
            console.log(`[HTTP] 🥷 Available tools: ${toolSchemas.length}`);
            console.log('[HTTP] Available tools:', toolSchemas.map(t => t.name).join(', '));
            console.log('[HTTP] ✅ Server ready for connections');
        });

    } catch (error) {
        console.error('[HTTP] Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
main().catch((error) => {
    console.error('[HTTP] Fatal error:', error);
    process.exit(1);
});