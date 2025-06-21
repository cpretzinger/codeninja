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

import type { Response } from 'express';
import type { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { ClientInfo } from './mcp-server.js';

// HTTP Server Configuration Types
export interface HTTPTransportConfig {
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: readonly string[];
  readonly maxConnections: number;
  readonly connectionTimeout: number;
  readonly keepAliveTimeout: number;
}

export interface HTTPServerOptions {
  readonly config: HTTPTransportConfig;
  readonly enableHealthCheck: boolean;
  readonly enableMetrics: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// SSE Connection Management Types
export interface SSEConnection {
  readonly id: string;
  readonly clientInfo: ClientInfo;
  readonly connectedAt: Date;
  readonly lastActivity: Date;
  readonly transport: SSEServerTransport;
  readonly response: Response;
  readonly isActive: boolean;
}

export interface ConnectionPool {
  readonly connections: ReadonlyMap<string, SSEConnection>;
  readonly maxConnections: number;
  readonly activeCount: number;
  readonly totalConnections: number;
  readonly connectionHistory: readonly ConnectionEvent[];
}

export interface ConnectionEvent {
  readonly connectionId: string;
  readonly event: 'connected' | 'disconnected' | 'error' | 'timeout';
  readonly timestamp: Date;
  readonly details?: string;
}

// Connection Pool Operations
export interface ConnectionPoolOperations {
  addConnection(connection: SSEConnection): Promise<void>;
  removeConnection(connectionId: string): Promise<void>;
  getConnection(connectionId: string): SSEConnection | undefined;
  getAllConnections(): readonly SSEConnection[];
  getActiveConnections(): readonly SSEConnection[];
  cleanupInactiveConnections(): Promise<number>;
  shutdown(): Promise<void>;
}

// HTTP Request/Response Types
export interface HealthCheckResponse {
  readonly status: 'healthy' | 'unhealthy';
  readonly timestamp: string;
  readonly uptime: number;
  readonly connections: {
    readonly active: number;
    readonly total: number;
  };
  readonly memory: {
    readonly used: number;
    readonly total: number;
  };
  readonly version: string;
}

export interface MetricsResponse {
  readonly server: {
    readonly uptime: number;
    readonly startTime: string;
    readonly version: string;
  };
  readonly connections: {
    readonly active: number;
    readonly total: number;
    readonly maxConcurrent: number;
    readonly averageLifetime: number;
  };
  readonly requests: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
    readonly averageResponseTime: number;
  };
  readonly memory: {
    readonly heapUsed: number;
    readonly heapTotal: number;
    readonly external: number;
    readonly rss: number;
  };
}

// HTTP-Specific Error Types
export abstract class HTTPTransportError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly details?: Record<string, unknown>;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConnectionPoolFullError extends HTTPTransportError {
  readonly code = 'CONNECTION_POOL_FULL' as const;
  readonly statusCode = 503;
  
  constructor(
    maxConnections: number,
    public readonly details: {
      readonly maxConnections: number;
      readonly currentConnections: number;
    }
  ) {
    super(`Connection pool full. Maximum ${maxConnections} connections allowed.`);
  }
}

export class InvalidSSERequestError extends HTTPTransportError {
  readonly code = 'INVALID_SSE_REQUEST' as const;
  readonly statusCode = 400;
  
  constructor(
    reason: string,
    public readonly details: {
      readonly reason: string;
      readonly headers?: Record<string, string>;
    }
  ) {
    super(`Invalid SSE request: ${reason}`);
  }
}

export class ConnectionTimeoutError extends HTTPTransportError {
  readonly code = 'CONNECTION_TIMEOUT' as const;
  readonly statusCode = 408;
  
  constructor(
    connectionId: string,
    timeout: number,
    public readonly details: {
      readonly connectionId: string;
      readonly timeout: number;
      readonly lastActivity: string;
    }
  ) {
    super(`Connection ${connectionId} timed out after ${timeout}ms`);
  }
}

export class ServerShutdownError extends HTTPTransportError {
  readonly code = 'SERVER_SHUTDOWN' as const;
  readonly statusCode = 503;
  
  constructor(
    public readonly details: {
      readonly reason: string;
      readonly activeConnections: number;
    }
  ) {
    super('Server is shutting down');
  }
}

// Type Guards for HTTP Transport
export function isHTTPTransportConfig(obj: unknown): obj is HTTPTransportConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as HTTPTransportConfig).port === 'number' &&
    typeof (obj as HTTPTransportConfig).host === 'string' &&
    Array.isArray((obj as HTTPTransportConfig).corsOrigins) &&
    typeof (obj as HTTPTransportConfig).maxConnections === 'number' &&
    typeof (obj as HTTPTransportConfig).connectionTimeout === 'number' &&
    typeof (obj as HTTPTransportConfig).keepAliveTimeout === 'number'
  );
}

export function isSSEConnection(obj: unknown): obj is SSEConnection {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SSEConnection).id === 'string' &&
    typeof (obj as SSEConnection).connectedAt === 'object' &&
    typeof (obj as SSEConnection).lastActivity === 'object' &&
    typeof (obj as SSEConnection).isActive === 'boolean'
  );
}

// Default Configuration
export const DEFAULT_HTTP_CONFIG: HTTPTransportConfig = {
  port: 3000,
  host: '0.0.0.0',
  corsOrigins: ['*'],
  maxConnections: 100,
  connectionTimeout: 300000, // 5 minutes
  keepAliveTimeout: 60000     // 1 minute
} as const;

export const DEFAULT_HTTP_OPTIONS: HTTPServerOptions = {
  config: DEFAULT_HTTP_CONFIG,
  enableHealthCheck: true,
  enableMetrics: true,
  logLevel: 'info'
} as const;