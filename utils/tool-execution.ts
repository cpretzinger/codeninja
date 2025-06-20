/**
 * Safe tool execution utilities with comprehensive error handling
 * Provides type-safe wrappers for all MCP tool operations
 */

import {
  MCPServerError,
  ToolExecutionError,
  N8NAPIError,
  createSuccess,
  createError
} from '../types/mcp-server.js';

import type {
  ToolHandler,
  ToolResponse,
  Result
} from '../types/mcp-server.js';

/**
 * Safe tool execution wrapper that catches and handles all errors
 * Prevents uncaught exceptions from crashing the MCP server
 */
export async function safeToolExecution<TArgs, TResult>(
  toolName: string,
  args: TArgs,
  handler: ToolHandler<TArgs, TResult>
): Promise<ToolResponse<TResult>> {
  try {
    const result = await handler(args);
    return result;
  } catch (error) {
    const mcpError = createMCPError(toolName, error, args);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Error executing ${toolName}: ${mcpError.message}`
      }],
      isError: true,
      metadata: {
        errorCode: mcpError.code,
        errorDetails: mcpError.details
      } as TResult
    };
  }
}

/**
 * Creates appropriate MCP error based on the original error type
 * Maintains error context while providing consistent error handling
 */
function createMCPError(toolName: string, error: unknown, args?: unknown): MCPServerError {
  if (error instanceof MCPServerError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Check if it's an axios error (N8N API error)
    if ('response' in error && typeof error.response === 'object' && error.response !== null) {
      const response = error.response as { status?: number; data?: unknown };
      return new N8NAPIError(toolName, {
        endpoint: toolName,
        statusCode: response.status,
        responseBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      });
    }
    
    return new ToolExecutionError(toolName, {
      toolName,
      originalError: error.message,
      args
    });
  }
  
  return new ToolExecutionError(toolName, {
    toolName,
    originalError: String(error),
    args
  });
}

/**
 * Validates tool arguments against expected schema
 * Provides runtime type checking for tool inputs
 */
export function validateToolArgs<T>(
  args: unknown,
  validator: (args: unknown) => args is T,
  toolName: string
): Result<T, ToolExecutionError> {
  if (!validator(args)) {
    return createError(new ToolExecutionError(toolName, {
      toolName,
      originalError: 'Invalid arguments provided',
      args
    }));
  }
  
  return createSuccess(args);
}

/**
 * Retry mechanism for transient failures
 * Useful for network requests to N8N API
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
}

/**
 * Timeout wrapper for long-running operations
 * Prevents tools from hanging indefinitely
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([operation, timeoutPromise]);
}

/**
 * Combines retry and timeout for robust operation execution
 */
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
    delayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, timeoutMs = 30000, delayMs = 1000 } = options;
  
  return withRetry(
    () => withTimeout(operation(), timeoutMs),
    maxRetries,
    delayMs
  );
}

/**
 * Logs tool execution for debugging and monitoring
 */
export function logToolExecution(
  toolName: string,
  args: unknown,
  startTime: number,
  success: boolean,
  error?: MCPServerError
): void {
  const duration = Date.now() - startTime;
  const logData = {
    tool: toolName,
    duration,
    success,
    timestamp: new Date().toISOString(),
    ...(error && { 
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    })
  };
  
  if (success) {
    console.log(`[MCP] Tool executed successfully: ${JSON.stringify(logData)}`);
  } else {
    console.error(`[MCP] Tool execution failed: ${JSON.stringify(logData)}`);
  }
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ToolResponse<T> {
  return {
    content: [{
      type: 'text' as const,
      text: message || JSON.stringify(data, null, 2)
    }],
    isError: false,
    metadata: data
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: MCPServerError,
  toolName: string
): ToolResponse<never> {
  return {
    content: [{
      type: 'text' as const,
      text: `Error in ${toolName}: ${error.message}`
    }],
    isError: true,
    metadata: {
      errorCode: error.code,
      errorDetails: error.details
    } as never
  };
}

/**
 * Type-safe tool wrapper that combines all safety mechanisms
 */
export function createSafeTool<TArgs, TResult>(
  toolName: string,
  validator: (args: unknown) => args is TArgs,
  handler: (args: TArgs) => Promise<TResult>
): ToolHandler<unknown, TResult> {
  return async (args: unknown): Promise<ToolResponse<TResult>> => {
    const startTime = Date.now();
    
    try {
      // Validate arguments
      const validationResult = validateToolArgs(args, validator, toolName);
      if (!validationResult.success) {
        logToolExecution(toolName, args, startTime, false, validationResult.error);
        return createErrorResponse(validationResult.error, toolName);
      }
      
      // Execute with resilience
      const result = await executeWithResilience(
        () => handler(validationResult.data),
        { maxRetries: 2, timeoutMs: 30000 }
      );
      
      logToolExecution(toolName, args, startTime, true);
      return createSuccessResponse(result);
      
    } catch (error) {
      const mcpError = createMCPError(toolName, error, args);
      logToolExecution(toolName, args, startTime, false, mcpError);
      return createErrorResponse(mcpError, toolName);
    }
  };
}