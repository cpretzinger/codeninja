/**
 * Comprehensive TypeScript type definitions for MCP Server
 * Provides strict type safety for all MCP operations, preventing runtime errors
 * and ensuring proper message handling between client and server.
 */

// Core MCP Server Configuration Types
export interface MCPServerConfig {
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

export interface MCPCapabilities {
  readonly tools: Record<string, unknown>;
}

export interface MCPServerOptions {
  readonly capabilities: MCPCapabilities;
}

// Connection State Management
export interface ConnectionState {
  readonly isConnected: boolean;
  readonly clientVersion?: string;
  readonly protocolVersion?: string;
  readonly connectedAt?: Date;
  readonly lastActivity?: Date;
}

export interface ClientInfo {
  readonly version: string;
  readonly protocolVersion: string;
  readonly capabilities?: Record<string, unknown>;
}

// Error Handling Types with Discriminated Unions
export abstract class MCPServerError extends Error {
  abstract readonly code: string;
  abstract readonly details?: Record<string, unknown>;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ModuleResolutionError extends MCPServerError {
  readonly code = 'MODULE_RESOLUTION_ERROR' as const;
  
  constructor(
    modulePath: string, 
    public readonly details: { 
      readonly modulePath: string; 
      readonly originalError: string;
    }
  ) {
    super(`Failed to resolve module: ${modulePath}`);
  }
}

export class ToolExecutionError extends MCPServerError {
  readonly code = 'TOOL_EXECUTION_ERROR' as const;
  
  constructor(
    toolName: string,
    public readonly details: {
      readonly toolName: string;
      readonly originalError: string;
      readonly args?: unknown;
    }
  ) {
    super(`Tool execution failed: ${toolName}`);
  }
}

export class ServerInitializationError extends MCPServerError {
  readonly code = 'SERVER_INITIALIZATION_ERROR' as const;
  
  constructor(
    public readonly details: {
      readonly originalError: string;
      readonly phase?: string;
    }
  ) {
    super('Failed to initialize MCP server');
  }
}

export class N8NAPIError extends MCPServerError {
  readonly code = 'N8N_API_ERROR' as const;
  
  constructor(
    endpoint: string,
    public readonly details: {
      readonly endpoint: string;
      readonly statusCode?: number;
      readonly responseBody?: string;
    }
  ) {
    super(`N8N API request failed: ${endpoint}`);
  }
}

// Tool Response Types with Strict Typing
export interface ToolResponse<T = unknown> {
  readonly content: ReadonlyArray<{
    readonly type: 'text';
    readonly text: string;
  }>;
  readonly isError?: boolean;
  readonly metadata?: T;
}

export type ToolHandler<TArgs, TResult> = (
  args: TArgs
) => Promise<ToolResponse<TResult>>;

// N8N Workflow Types
export interface N8NWorkflow {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly nodes: ReadonlyArray<N8NNode>;
  readonly connections: Record<string, Record<string, ReadonlyArray<ReadonlyArray<N8NConnection>>>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly versionId?: string;
}

export interface N8NNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly position: readonly [number, number];
  readonly parameters: Record<string, unknown>;
  readonly disabled?: boolean;
  readonly notes?: string;
  readonly webhookId?: string;
}

export interface N8NConnection {
  readonly node: string;
  readonly type: string;
  readonly index: number;
}

export interface N8NExecution {
  readonly id: string;
  readonly workflowId: string;
  readonly mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  readonly status: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly data?: Record<string, unknown>;
}

// Tool Argument Types with Strict Validation
export interface ListWorkflowsArgs {
  readonly active?: boolean;
  readonly search?: string;
}

export interface GetWorkflowArgs {
  readonly workflowId: string;
}

export interface CreateWorkflowArgs {
  readonly name: string;
  readonly nodes?: ReadonlyArray<Partial<N8NNode>>;
  readonly connections?: Record<string, Record<string, ReadonlyArray<ReadonlyArray<N8NConnection>>>>;
  readonly activate?: boolean;
}

export interface ActivateWorkflowArgs {
  readonly workflowId: string;
}

export interface AddNodeArgs {
  readonly workflowId: string;
  readonly nodeName: string;
  readonly nodeType: string;
  readonly position?: readonly [number, number];
  readonly parameters?: Record<string, unknown>;
}

export interface UpdateNodeArgs {
  readonly workflowId: string;
  readonly nodeName: string;
  readonly parameters?: Record<string, unknown>;
  readonly position?: readonly [number, number];
  readonly disabled?: boolean;
}

export interface DeleteNodeArgs {
  readonly workflowId: string;
  readonly nodeName: string;
}

export interface ConnectNodesArgs {
  readonly workflowId: string;
  readonly sourceNode: string;
  readonly targetNode: string;
  readonly sourceOutput?: string;
  readonly targetInput?: string;
  readonly outputIndex?: number;
  readonly inputIndex?: number;
}

export interface DisconnectNodesArgs {
  readonly workflowId: string;
  readonly sourceNode: string;
  readonly targetNode: string;
}

export interface ListNodeTypesArgs {
  readonly category?: string;
}

export interface ExecuteWorkflowArgs {
  readonly workflowId: string;
  readonly data?: Record<string, unknown>;
}

export interface GetExecutionResultArgs {
  readonly executionId: string;
}

export interface DiagnoseNodeErrorArgs {
  readonly workflowId: string;
  readonly nodeName: string;
  readonly limit?: number;
}

export interface FixCommonNodeErrorsArgs {
  readonly workflowId: string;
  readonly nodeName: string;
  readonly errorType?: 'missing_credentials' | 'invalid_parameters' | 'connection_error' | 'missing_required_fields' | 'auto_detect';
}

export interface ValidateWorkflowArgs {
  readonly workflowId: string;
}

export interface GetNodeExecutionDataArgs {
  readonly executionId: string;
  readonly nodeName: string;
}

export interface GenerateAuditArgs {
  readonly additionalOptions?: {
    readonly daysAbandonedWorkflow?: number;
    readonly categories?: ReadonlyArray<'credentials' | 'database' | 'nodes' | 'filesystem' | 'instance'>;
  };
}

export interface CreateCredentialArgs {
  readonly credential: Record<string, unknown>;
}

export interface ListExecutionsArgs {
  readonly includeData?: boolean;
  readonly status?: string;
  readonly workflowId?: string;
  readonly projectId?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface UpdateWorkflowArgs {
  readonly workflowId: string;
  readonly workflow: Record<string, unknown>;
}

export interface DeleteWorkflowArgs {
  readonly workflowId: string;
}

export interface DeactivateWorkflowArgs {
  readonly workflowId: string;
}

export interface TransferWorkflowArgs {
  readonly workflowId: string;
  readonly destinationProjectId: string;
}

export interface PullRemoteArgs {
  readonly options?: Record<string, unknown>;
}

export interface CreateVariableArgs {
  readonly variable: Record<string, unknown>;
}

export interface ListVariablesArgs {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface ConvertWorkflowToCodeArgs {
  readonly workflowId: string;
  readonly intent?: string;
  readonly useAI?: boolean;
}

// Discriminated Union for All Tool Arguments
export type ToolArgs = 
  | { name: 'list_workflows'; args: ListWorkflowsArgs }
  | { name: 'get_workflow'; args: GetWorkflowArgs }
  | { name: 'create_workflow'; args: CreateWorkflowArgs }
  | { name: 'activate_workflow'; args: ActivateWorkflowArgs }
  | { name: 'add_node'; args: AddNodeArgs }
  | { name: 'update_node'; args: UpdateNodeArgs }
  | { name: 'delete_node'; args: DeleteNodeArgs }
  | { name: 'connect_nodes'; args: ConnectNodesArgs }
  | { name: 'disconnect_nodes'; args: DisconnectNodesArgs }
  | { name: 'list_node_types'; args: ListNodeTypesArgs }
  | { name: 'execute_workflow'; args: ExecuteWorkflowArgs }
  | { name: 'get_execution_result'; args: GetExecutionResultArgs }
  | { name: 'diagnose_node_error'; args: DiagnoseNodeErrorArgs }
  | { name: 'fix_common_node_errors'; args: FixCommonNodeErrorsArgs }
  | { name: 'validate_workflow'; args: ValidateWorkflowArgs }
  | { name: 'get_node_execution_data'; args: GetNodeExecutionDataArgs }
  | { name: 'generate_audit'; args: GenerateAuditArgs }
  | { name: 'create_credential'; args: CreateCredentialArgs }
  | { name: 'list_executions'; args: ListExecutionsArgs }
  | { name: 'update_workflow'; args: UpdateWorkflowArgs }
  | { name: 'delete_workflow'; args: DeleteWorkflowArgs }
  | { name: 'deactivate_workflow'; args: DeactivateWorkflowArgs }
  | { name: 'transfer_workflow'; args: TransferWorkflowArgs }
  | { name: 'pull_remote'; args: PullRemoteArgs }
  | { name: 'create_variable'; args: CreateVariableArgs }
  | { name: 'list_variables'; args: ListVariablesArgs }
  | { name: 'convert_workflow_to_code'; args: ConvertWorkflowToCodeArgs };

// Tool Result Types
export interface WorkflowListResult {
  readonly workflows: ReadonlyArray<N8NWorkflow>;
  readonly total: number;
}

export interface WorkflowResult {
  readonly workflow: N8NWorkflow;
}

export interface ExecutionResult {
  readonly execution: N8NExecution;
  readonly data?: Record<string, unknown>;
}

export interface NodeTypesResult {
  readonly nodeTypes: ReadonlyArray<{
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly category: string;
  }>;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<{
    readonly node: string;
    readonly message: string;
    readonly severity: 'error' | 'warning';
  }>;
  readonly warnings: ReadonlyArray<{
    readonly node: string;
    readonly message: string;
  }>;
}

export interface AuditResult {
  readonly summary: {
    readonly totalWorkflows: number;
    readonly activeWorkflows: number;
    readonly abandonedWorkflows: number;
    readonly credentialsCount: number;
  };
  readonly issues: ReadonlyArray<{
    readonly category: string;
    readonly severity: 'high' | 'medium' | 'low';
    readonly message: string;
    readonly recommendation: string;
  }>;
}

// Environment Configuration Types
export interface EnvironmentConfig {
  readonly N8N_URL: string;
  readonly N8N_API_KEY: string;
  readonly N8N_WEBHOOK_URL?: string;
  readonly OPENAI_API_KEY?: string;
  readonly OPENAI_MODEL?: string;
  readonly NODE_ENV?: 'development' | 'production' | 'test';
}

// API Client Configuration
export interface APIClientConfig {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * Type guard functions for runtime type checking
 * These prevent 'any' types and provide compile-time safety
 */
export function isListWorkflowsArgs(args: unknown): args is ListWorkflowsArgs {
  return typeof args === 'object' && args !== null;
}

export function isGetWorkflowArgs(args: unknown): args is GetWorkflowArgs {
  return typeof args === 'object' && args !== null && 
         typeof (args as GetWorkflowArgs).workflowId === 'string';
}

export function isCreateWorkflowArgs(args: unknown): args is CreateWorkflowArgs {
  return typeof args === 'object' && args !== null && 
         typeof (args as CreateWorkflowArgs).name === 'string';
}

export function isMCPServerError(error: unknown): error is MCPServerError {
  return error instanceof MCPServerError;
}

export function isN8NWorkflow(obj: unknown): obj is N8NWorkflow {
  return typeof obj === 'object' && obj !== null &&
         typeof (obj as N8NWorkflow).id === 'string' &&
         typeof (obj as N8NWorkflow).name === 'string' &&
         typeof (obj as N8NWorkflow).active === 'boolean' &&
         Array.isArray((obj as N8NWorkflow).nodes);
}

/**
 * Utility types for enhanced type safety
 */
export type NonEmptyArray<T> = [T, ...T[]];
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Result wrapper type for operations that can fail
 * Provides Railway-oriented programming pattern
 */
export type Result<T, E = MCPServerError> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export function createSuccess<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function createError<E extends MCPServerError>(error: E): Result<never, E> {
  return { success: false, error };
}