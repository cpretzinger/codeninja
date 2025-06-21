/**
 * JavaScript Configuration Validator for MCP Server Settings
 * 
 * This module provides comprehensive validation for MCP server configurations,
 * preventing runtime errors through strict validation and error handling.
 */

const fs = require('fs');

// Custom error classes for configuration validation
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class InvalidServerConfigError extends ConfigurationError {
  constructor(serverName, reason) {
    super(`Invalid configuration for server '${serverName}': ${reason}`);
    this.errorCode = 'INVALID_SERVER_CONFIG';
  }
}

class MissingEnvironmentVariableError extends ConfigurationError {
  constructor(serverName, envVar) {
    super(`Missing required environment variable '${envVar}' for server '${serverName}'`);
    this.errorCode = 'MISSING_ENV_VAR';
  }
}

class InvalidJSONError extends ConfigurationError {
  constructor(filePath, parseError) {
    super(`Invalid JSON in configuration file '${filePath}': ${parseError}`);
    this.errorCode = 'INVALID_JSON';
  }
}

class SecurityViolationError extends ConfigurationError {
  constructor(issue) {
    super(`Security violation detected: ${issue}`);
    this.errorCode = 'SECURITY_VIOLATION';
  }
}

// Server-specific validation schemas
const SERVER_SCHEMAS = {
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
function isMCPConfiguration(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  if (!('mcpServers' in value) || typeof value.mcpServers !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Type guard to check if a server config is valid
 */
function isValidServerConfig(config) {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  return (
    typeof config.command === 'string' &&
    Array.isArray(config.args) &&
    config.args.every((arg) => typeof arg === 'string')
  );
}

/**
 * Validates environment variables for security issues
 */
function validateSecurityConstraints(config) {
  const warnings = [];
  
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
function validateServerConfig(serverName, config, serverType) {
  const errors = [];
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
 * Main configuration validator with comprehensive validation
 */
function validateMCPConfiguration(configData) {
  const errors = [];
  const warnings = [];
  
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
    const serverType = serverName.replace(/\s+/g, '-').toLowerCase();
    
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
function safeParseJSON(jsonString, filePath) {
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
 * Export functions and classes for external use
 */
module.exports = {
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
 * ```javascript
 * const { validateMCPConfiguration, safeParseJSON } = require('./config-validator');
 * const fs = require('fs');
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