s
/**
 * Connection Pool Management for HTTP Transport
 * 
 * Provides type-safe connection management for SSE connections with
 * automatic cleanup, timeout handling, and connection lifecycle tracking.
 * 
 * Key Features:
 * - Type-safe connection pool operations
 * - Automatic connection cleanup and timeout handling
 * - Connection lifecycle event tracking
 * - Memory-efficient connection storage
 * - Graceful shutdown with connection cleanup
 */

import type { Response } from 'express';
import type { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type {
  SSEConnection,
  ConnectionPool,
  ConnectionEvent,
  ConnectionPoolOperations,
  HTTPTransportConfig,
  ConnectionPoolFullError,
  ConnectionTimeoutError
} from '../types/http-transport.js';
import type { ClientInfo } from '../types/mcp-server.js';

/**
 * Implementation of connection pool for managing SSE connections
 */
export class SSEConnectionPool implements ConnectionPoolOperations {
  private readonly connections = new Map<string, SSEConnection>();
  private readonly connectionHistory: ConnectionEvent[] = [];
  private readonly config: HTTPTransportConfig;
  private readonly cleanupInterval: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: HTTPTransportConfig) {
    this.config = config;
    
    // Start periodic cleanup of inactive connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections().catch(error => {
        console.error('[ConnectionPool] Cleanup error:', error);
      });
    }, this.config.keepAliveTimeout);
  }

  /**
   * Add a new SSE connection to the pool
   */
  async addConnection(connection: SSEConnection): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    if (this.connections.size >= this.config.maxConnections) {
      const error = new (await import('../types/http-transport.js')).ConnectionPoolFullError(
        this.config.maxConnections,
        {
          maxConnections: this.config.maxConnections,
          currentConnections: this.connections.size
        }
      );
      
      this.addConnectionEvent({
        connectionId: connection.id,
        event: 'error',
        timestamp: new Date(),
        details: error.message
      });
      
      throw error;
    }

    this.connections.set(connection.id, connection);
    
    this.addConnectionEvent({
      connectionId: connection.id,
      event: 'connected',
      timestamp: new Date(),
      details: `Client: ${connection.clientInfo.version}`
    });

    console.log(`[ConnectionPool] Added connection ${connection.id} (${this.connections.size}/${this.config.maxConnections})`);
  }

  /**
   * Remove a connection from the pool
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Close the SSE connection gracefully
    try {
      if (connection.response && !connection.response.headersSent) {
        connection.response.end();
      }
    } catch (error) {
      console.warn(`[ConnectionPool] Error closing connection ${connectionId}:`, error);
    }

    this.connections.delete(connectionId);
    
    this.addConnectionEvent({
      connectionId,
      event: 'disconnected',
      timestamp: new Date()
    });

    console.log(`[ConnectionPool] Removed connection ${connectionId} (${this.connections.size}/${this.config.maxConnections})`);
  }

  /**
   * Get a specific connection by ID
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): readonly SSEConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get only active connections
   */
  getActiveConnections(): readonly SSEConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isActive);
  }

  /**
   * Clean up inactive connections that have timed out
   */
  async cleanupInactiveConnections(): Promise<number> {
    const now = new Date();
    const timeoutMs = this.config.connectionTimeout;
    const connectionsToRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > timeoutMs) {
        connectionsToRemove.push(connectionId);
        
        this.addConnectionEvent({
          connectionId,
          event: 'timeout',
          timestamp: now,
          details: `Timeout after ${timeSinceLastActivity}ms`
        });
      }
    }

    // Remove timed out connections
    for (const connectionId of connectionsToRemove) {
      await this.removeConnection(connectionId);
    }

    if (connectionsToRemove.length > 0) {
      console.log(`[ConnectionPool] Cleaned up ${connectionsToRemove.length} timed out connections`);
    }

    return connectionsToRemove.length;
  }

  /**
   * Get current pool state
   */
  getPoolState(): ConnectionPool {
    return {
      connections: new Map(this.connections),
      maxConnections: this.config.maxConnections,
      activeCount: this.getActiveConnections().length,
      totalConnections: this.connections.size,
      connectionHistory: [...this.connectionHistory]
    };
  }

  /**
   * Update connection activity timestamp
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Create updated connection object
      const updatedConnection: SSEConnection = {
        ...connection,
        lastActivity: new Date()
      };
      
      this.connections.set(connectionId, updatedConnection);
    }
  }

  /**
   * Gracefully shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    console.log('[ConnectionPool] Starting graceful shutdown...');
    this.isShuttingDown = true;

    // Clear the cleanup interval
    clearInterval(this.cleanupInterval);

    // Close all active connections
    const connectionIds = Array.from(this.connections.keys());
    const shutdownPromises = connectionIds.map(id => this.removeConnection(id));
    
    await Promise.allSettled(shutdownPromises);

    console.log(`[ConnectionPool] Shutdown complete. Closed ${connectionIds.length} connections.`);
  }

  /**
   * Add a connection event to the history
   */
  private addConnectionEvent(event: ConnectionEvent): void {
    this.connectionHistory.push(event);
    
    // Keep only the last 1000 events to prevent memory leaks
    if (this.connectionHistory.length > 1000) {
      this.connectionHistory.splice(0, this.connectionHistory.length - 1000);
    }
  }
}

/**
 * Create a new SSE connection object
 */
export function createSSEConnection(
  id: string,
  clientInfo: ClientInfo,
  transport: SSEServerTransport,
  response: Response
): SSEConnection {
  const now = new Date();
  
  return {
    id,
    clientInfo,
    connectedAt: now,
    lastActivity: now,
    transport,
    response,
    isActive: true
  };
}

/**
 * Generate a unique connection ID
 */
export function generateConnectionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `conn_${timestamp}_${randomPart}`;
}

/**
 * Validate SSE request headers
 */
export function validateSSERequest(headers: Record<string, string | string[] | undefined>): boolean {
  const accept = headers.accept;
  const cacheControl = headers['cache-control'];
  
  // Check for proper SSE headers
  const hasSSEAccept = typeof accept === 'string' && accept.includes('text/event-stream');
  const hasNoCache = typeof cacheControl === 'string' && cacheControl.includes('no-cache');
  
  return hasSSEAccept || hasNoCache; // Allow either header pattern
}

/**
 * Setup SSE response headers
 */
export function setupSSEHeaders(response: Response): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
}