/**
 * TypeScript Configuration Validator for MCP Server Settings
 * 
 * This module provides comprehensive type safety for MCP server configurations,
 * preventing runtime errors through strict type checking and validation.
 */

// Core type definitions for MCP server configuration
interface MCPServerEnvironment {
  readonly [key: string]: string;
}

interface MCPServerConfig {
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: MCPServerEnvironment;
  readonly disabled?: boolean;
  readonly alwaysAllow?: readonly string[];
}

interface MCPServersConfig {
  readonly [serverName: string]: MCPServerConfig;
}

interface MCPConfiguration {
  readonly mcpServers: MCPServersConfig;
}

// Discriminated union types for different server types
type ServerType = 
  | 'github'
  | 'filesystem' 
  | 'octagon-deep-research-mcp'
  | 'youtube-transcript'
  | 'divide-and-conquer'
  | 'browsermcp'
  | 'n8n-docs'
  | 'slack'
  | 'spotify'
  | 'supabase'
  | 'openai'
  | 'memory'
  | 'sequential-thinking'
  | 'puppeteer'
  | 'clear-thought'
  | 'healthcare-mcp-public'
  | 'statpearls-mcp'
  | 'codeninja';

// Environment variable validation types
interface N8NEnvironment {
  readonly N8N_URL: string;
  readonly N8N_API_KEY: string;
  readonly N8N_WEBHOOK_URL?: string;
}

interface GitHubEnvironment {
  readonly GITHUB_PERSONAL_ACCESS_TOKEN: string;
}

interface SlackEnvironment {
  readonly SLACK_BOT_TOKEN: string;
  readonly SLACK_TEAM_ID: string;
}

interface SpotifyEnvironment {
  readonly SPOTIFY_CLIENT_ID: string;
  readonly SPOTIFY_CLIENT_SECRET: string;
}

interface OpenAIEnvironment {
  readonly OPENAI_API_KEY: string;
}

// Custom error types for configuration validation
abstract class ConfigurationError extends Error {
  abstract readonly errorCode: string;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidServerConfigError extends ConfigurationError {
  readonly errorCode = 'INVALID_SERVER_CONFIG';
  
  constructor(serverName: string, reason: string) {
    super(`Invalid configuration for server '${serverName}': ${reason}`);
  }
}

class MissingEnvironmentVariableError extends ConfigurationError {
  readonly errorCode = 'MISSING_ENV_VAR';
  
  constructor(serverName: string, envVar: string) {
    super(`Missing required environment variable '${envVar}' for server '${serverName}'`);
  }
}

class InvalidJSONError extends ConfigurationError {
  readonly errorCode = 'INVALID_JSON';
  
  constructor(filePath: string, parseError: string) {
    super(`Invalid JSON in configuration file '${filePath}': ${parseError}`);
  }
}

class SecurityViolationError extends ConfigurationError {
  readonly errorCode = 'SECURITY_VIOLATION';
  
  constructor(issue: string) {
    super(`Security violation detected: ${issue}`);
  }
}

// Validation result types
interface ValidationSuccess {
  readonly success: true;
  readonly config: MCPConfiguration;
  readonly warnings: readonly string[];
}

interface ValidationFailure {
  readonly success: false;
  readonly errors: readonly ConfigurationError[];
  readonly warnings: readonly string[];
}

type ValidationResult = ValidationSuccess | ValidationFailure;

// Server-specific validation schemas
const SERVER_SCHEMAS: Record<ServerType, {
  readonly requiredArgs: readonly string[];
  readonly requiredEnv: readonly string[];
  readonly optionalEnv: readonly string[];
}> = {
  'github': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-github'],
    requiredEnv: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    optionalEnv: []
  },
  'filesystem': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-filesystem'],
    requiredEnv: [],
    optionalEnv: []
  },
  'octagon-deep-research-mcp': {
    requiredArgs: ['-y', 'octagon-deep-research-mcp@latest'],
    requiredEnv: ['OCTAGON_API_KEY'],
    optionalEnv: []
  },
  'youtube-transcript': {
    requiredArgs: ['-y', '@kimtaeyoon83/mcp-server-youtube-transcript'],
    requiredEnv: [],
    optionalEnv: []
  },
  'divide-and-conquer': {
    requiredArgs: ['-y', '@landicefu/divide-and-conquer-mcp-server'],
    requiredEnv: [],
    optionalEnv: []
  },
  'browsermcp': {
    requiredArgs: ['@browsermcp/mcp@latest'],
    requiredEnv: [],
    optionalEnv: []
  },
  'n8n-docs': {
    requiredArgs: ['mcp-remote', 'https://n8n-io.gitmcp.io/n8n'],
    requiredEnv: [],
    optionalEnv: []
  },
  'slack': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-slack'],
    requiredEnv: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    optionalEnv: []
  },
  'spotify': {
    requiredArgs: ['-y', '@thomaswawra/server-spotify'],
    requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
    optionalEnv: []
  },
  'supabase': {
    requiredArgs: ['-y', '@supabase/mcp-server-supabase@latest', '--access-token'],
    requiredEnv: [],
    optionalEnv: []
  },
  'openai': {
    requiredArgs: ['-y', '@mzxrai/mcp-openai@latest'],
    requiredEnv: ['OPENAI_API_KEY'],
    optionalEnv: []
  },
  'memory': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-memory'],
    requiredEnv: [],
    optionalEnv: []
  },
  'sequential-thinking': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    requiredEnv: [],
    optionalEnv: []
  },
  'puppeteer': {
    requiredArgs: ['-y', '@modelcontextprotocol/server-puppeteer'],
    requiredEnv: [],
    optionalEnv: []
  },
  'clear-thought': {
    requiredArgs: ['-y', '@waldzellai/clear-thought'],
    requiredEnv: [],
    optionalEnv: []
  },
  'healthcare-mcp-public': {
    requiredArgs: ['-y', '@smithery/cli@latest', 'run', '@Cicatriiz/healthcare-mcp-public', '--key'],
    requiredEnv: [],
    optionalEnv: []
  },
  'statpearls-mcp': {
    requiredArgs: ['-y', '@smithery/cli@latest', 'run', '@jpoles1/statpearls-mcp', '--key'],
    requiredEnv: [],
    optionalEnv: []
  },
  'codeninja': {
    requiredArgs: [],
    requiredEnv: ['N8N_URL', 'N8N_API_KEY'],
    optionalEnv: ['N8N_WEBHOOK_URL']
  }
};

/**
 * Type guard to check if a value is a valid MCP configuration
 */
function isMCPConfiguration(value: unknown): value is MCPConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const config = value as Record<string, unknown>;
  
  if (!('mcpServers' in config) || typeof config.mcpServers !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Type guard to check if a server config is valid
 */
function isValidServerConfig(config: unknown): config is MCPServerConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  const serverConfig = config as Record<string, unknown>;
  
  return (
    typeof serverConfig.command === 'string' &&
    Array.isArray(serverConfig.args) &&
    serverConfig.args.every((arg: unknown) => typeof arg === 'string')
  );
}

/**
 * Validates environment variables for security issues
 */
function validateSecurityConstraints(config: MCPConfiguration): readonly string[] {
  const warnings: string[] = [];
  
  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    if (serverConfig.env) {
      for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
        // Check for exposed API keys in configuration
        if (envKey.includes('API_KEY') || envKey.includes('TOKEN') || envKey.includes('SECRET')) {
          if (envValue.length > 10) { // Likely a real token/key
            warnings.push(`Potential security risk: ${envKey} for ${serverName} appears to contain a real API key/token`);
          }
        }
        
        // Check for hardcoded credentials
        if (envValue.startsWith('sk-') || envValue.startsWith('xoxb-') || envValue.startsWith('ghp_')) {
          warnings.push(`Security violation: Hardcoded credential detected in ${serverName}.${envKey}`);
        }
      }
    }
  }
  
  return warnings;
}

/**
 * Validates a single server configuration against its schema
 */
function validateServerConfig(
  serverName: string, 
  config: MCPServerConfig, 
  serverType: ServerType
): readonly ConfigurationError[] {
  const errors: ConfigurationError[] = [];
  const schema = SERVER_SCHEMAS[serverType];
  
  // Validate required arguments
  for (const requiredArg of schema.requiredArgs) {
    if (!config.args.includes(requiredArg)) {
      errors.push(new InvalidServerConfigError(
        serverName, 
        `Missing required argument: ${requiredArg}`
      ));
    }
  }
  
  // Validate required environment variables
  for (const requiredEnv of schema.requiredEnv) {
    if (!config.env || !(requiredEnv in config.env)) {
      errors.push(new MissingEnvironmentVariableError(serverName, requiredEnv));
    }
  }
  
  return errors;
}

/**
 * Main configuration validator with comprehensive type checking
 */
function validateMCPConfiguration(configData: unknown): ValidationResult {
  const errors: ConfigurationError[] = [];
  const warnings: string[] = [];
  
  // Type guard validation
  if (!isMCPConfiguration(configData)) {
    errors.push(new InvalidJSONError('configuration', 'Invalid MCP configuration structure'));
    return { success: false, errors, warnings };
  }
  
  // Validate each server configuration
  for (const [serverName, serverConfig] of Object.entries(configData.mcpServers)) {
    if (!isValidServerConfig(serverConfig)) {
      errors.push(new InvalidServerConfigError(
        serverName, 
        'Invalid server configuration structure'
      ));
      continue;
    }
    
    // Map server name to type (with fallback handling)
    const serverType = serverName.replace(/\s+/g, '-').toLowerCase() as ServerType;
    
    if (serverType in SERVER_SCHEMAS) {
      const serverErrors = validateServerConfig(serverName, serverConfig, serverType);
      errors.push(...serverErrors);
    } else {
      warnings.push(`Unknown server type: ${serverName} - skipping validation`);
    }
  }
  
  // Security validation
  const securityWarnings = validateSecurityConstraints(configData);
  warnings.push(...securityWarnings);
  
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }
  
  return { success: true, config: configData, warnings };
}

/**
 * Utility function to safely parse JSON with proper error handling
 */
function safeParseJSON(jsonString: string, filePath: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new InvalidJSONError(
      filePath, 
      error instanceof Error ? error.message : 'Unknown parsing error'
    );
  }
}

/**
 * Export types and functions for external use
 */
export {
  // Types
  type MCPConfiguration,
  type MCPServerConfig,
  type MCPServersConfig,
  type ValidationResult,
  type ValidationSuccess,
  type ValidationFailure,
  type ServerType,
  
  // Error classes
  ConfigurationError,
  InvalidServerConfigError,
  MissingEnvironmentVariableError,
  InvalidJSONError,
  SecurityViolationError,
  
  // Validation functions
  validateMCPConfiguration,
  isMCPConfiguration,
  isValidServerConfig,
  safeParseJSON,
  
  // Constants
  SERVER_SCHEMAS
};

/**
 * Example usage:
 * 
 * ```typescript
 * import { validateMCPConfiguration, safeParseJSON } from './config-validator';
 * 
 * const configJson = fs.readFileSync('.roo/mcp.json', 'utf8');
 * const configData = safeParseJSON(configJson, '.roo/mcp.json');
 * const result = validateMCPConfiguration(configData);
 * 
 * if (result.success) {
 *   console.log('Configuration is valid!');
 *   if (result.warnings.length > 0) {
 *     console.warn('Warnings:', result.warnings);
 *   }
 * } else {
 *   console.error('Configuration errors:', result.errors);
 * }
 * ```
 */