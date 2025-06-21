/**
 * Comprehensive TypeScript type definitions for MCP Server
 * Provides strict type safety for all MCP operations, preventing runtime errors
 * and ensuring proper message handling between client and server.
 */
// Error Handling Types with Discriminated Unions
export class MCPServerError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class ModuleResolutionError extends MCPServerError {
    details;
    code = 'MODULE_RESOLUTION_ERROR';
    constructor(modulePath, details) {
        super(`Failed to resolve module: ${modulePath}`);
        this.details = details;
    }
}
export class ToolExecutionError extends MCPServerError {
    details;
    code = 'TOOL_EXECUTION_ERROR';
    constructor(toolName, details) {
        super(`Tool execution failed: ${toolName}`);
        this.details = details;
    }
}
export class ServerInitializationError extends MCPServerError {
    details;
    code = 'SERVER_INITIALIZATION_ERROR';
    constructor(details) {
        super('Failed to initialize MCP server');
        this.details = details;
    }
}
export class N8NAPIError extends MCPServerError {
    details;
    code = 'N8N_API_ERROR';
    constructor(endpoint, details) {
        super(`N8N API request failed: ${endpoint}`);
        this.details = details;
    }
}
/**
 * Type guard functions for runtime type checking
 * These prevent 'any' types and provide compile-time safety
 */
export function isListWorkflowsArgs(args) {
    return typeof args === 'object' && args !== null;
}
export function isGetWorkflowArgs(args) {
    return typeof args === 'object' && args !== null &&
        typeof args.workflowId === 'string';
}
export function isCreateWorkflowArgs(args) {
    return typeof args === 'object' && args !== null &&
        typeof args.name === 'string';
}
export function isMCPServerError(error) {
    return error instanceof MCPServerError;
}
export function isN8NWorkflow(obj) {
    return typeof obj === 'object' && obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.active === 'boolean' &&
        Array.isArray(obj.nodes);
}
export function createSuccess(data) {
    return { success: true, data };
}
export function createError(error) {
    return { success: false, error };
}
