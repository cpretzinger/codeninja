/**
 * HTTP Transport Type Definitions for MCP Server
 *
 * Provides comprehensive type safety for HTTP/SSE transport implementation,
 * including connection management, server configuration, and error handling.
 *
 * Key Features:
 * - Strict typing for HTTP server configuration
 * - Connection pool management with type safety
 * - SSE connection state tracking
 * - HTTP-specific error types
 * - Request/response validation
 */
// HTTP-Specific Error Types
export class HTTPTransportError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class ConnectionPoolFullError extends HTTPTransportError {
    details;
    code = 'CONNECTION_POOL_FULL';
    statusCode = 503;
    constructor(maxConnections, details) {
        super(`Connection pool full. Maximum ${maxConnections} connections allowed.`);
        this.details = details;
    }
}
export class InvalidSSERequestError extends HTTPTransportError {
    details;
    code = 'INVALID_SSE_REQUEST';
    statusCode = 400;
    constructor(reason, details) {
        super(`Invalid SSE request: ${reason}`);
        this.details = details;
    }
}
export class ConnectionTimeoutError extends HTTPTransportError {
    details;
    code = 'CONNECTION_TIMEOUT';
    statusCode = 408;
    constructor(connectionId, timeout, details) {
        super(`Connection ${connectionId} timed out after ${timeout}ms`);
        this.details = details;
    }
}
export class ServerShutdownError extends HTTPTransportError {
    details;
    code = 'SERVER_SHUTDOWN';
    statusCode = 503;
    constructor(details) {
        super('Server is shutting down');
        this.details = details;
    }
}
// Type Guards for HTTP Transport
export function isHTTPTransportConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.port === 'number' &&
        typeof obj.host === 'string' &&
        Array.isArray(obj.corsOrigins) &&
        typeof obj.maxConnections === 'number' &&
        typeof obj.connectionTimeout === 'number' &&
        typeof obj.keepAliveTimeout === 'number');
}
export function isSSEConnection(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'string' &&
        typeof obj.connectedAt === 'object' &&
        typeof obj.lastActivity === 'object' &&
        typeof obj.isActive === 'boolean');
}
// Default Configuration
export const DEFAULT_HTTP_CONFIG = {
    port: 3000,
    host: '0.0.0.0',
    corsOrigins: ['*'],
    maxConnections: 100,
    connectionTimeout: 300000, // 5 minutes
    keepAliveTimeout: 60000 // 1 minute
};
export const DEFAULT_HTTP_OPTIONS = {
    config: DEFAULT_HTTP_CONFIG,
    enableHealthCheck: true,
    enableMetrics: true,
    logLevel: 'info'
};
