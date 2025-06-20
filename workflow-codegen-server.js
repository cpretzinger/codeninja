// workflow-codegen-server.js
// Standalone MCP server exposing workflow -> code conversion utilities.
// 🧠 Implementation notes: uses workflow-codegen.js for the heavy lifting.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { generateCodeFromWorkflow, refactorGeneratedCode, fetchWorkflow } from './workflow-codegen.js';

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-n8n-api-key';

const api = axios.create({
  baseURL: `${N8N_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

const server = new Server(
  { name: 'workflow-codegen', version: '1.0.0', description: 'n8n to code conversion MCP server' },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: 'convert_workflow_to_code',
    description: 'Return Node.js code representing the workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', required: true },
        intent: { type: 'string', description: 'Optional refactoring intent' },
        useAI: { type: 'boolean', description: 'Use LLM to refactor code' }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'refactor_generated_code',
    description: 'Refactor generated code according to intent',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', required: true },
        intent: { type: 'string' }
      },
      required: ['code']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'convert_workflow_to_code': {
        const workflow = await fetchWorkflow(api, args.workflowId);
        let code = generateCodeFromWorkflow(workflow);
        if (args.intent) code = await refactorGeneratedCode(code, args.intent, args.useAI);
        return { content: [{ type: 'text', text: code }] };
      }
      case 'refactor_generated_code': {
        const code = await refactorGeneratedCode(args.code, args.intent, args.useAI);
        return { content: [{ type: 'text', text: code }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Workflow CodeGen MCP Server running...');
