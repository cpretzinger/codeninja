// workflow-codegen.js
// Agentic helper for translating n8n workflow JSON into raw JavaScript code.
// 🚧 Preflight check: no existing converter found. This module handles a
// limited subset of node types for demonstration. Extend as needed for
// additional coverage.

import axios from 'axios';

// Optional: use OpenAI for natural language driven refactoring
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function generateCodeFromWorkflow(workflow) {
  const lines = [];
  lines.push('// Auto-generated code from n8n workflow');
  lines.push("import axios from 'axios';");
  lines.push('');
  lines.push('async function main() {');

  for (const node of workflow.nodes) {
    lines.push(`  // ${node.name} (${node.type})`);
    switch (node.type) {
      case 'n8n-nodes-base.httpRequest': {
        const method = node.parameters.httpMethod || node.parameters.method || 'GET';
        const url = node.parameters.url || '';
        lines.push(`  const ${sanitize(node.name)} = await axios({ method: '${method}', url: \`${url}\` });`);
        break;
      }
      case 'n8n-nodes-base.set': {
        if (Array.isArray(node.parameters.values)) {
          for (const entry of node.parameters.values) {
            lines.push(`  const ${sanitize(entry.name)} = ${JSON.stringify(entry.value)};`);
          }
        }
        break;
      }
      case 'n8n-nodes-base.function': {
        if (node.parameters.functionCode) {
          const code = node.parameters.functionCode
            .split('\n')
            .map((l) => '  ' + l)
            .join('\n');
          lines.push(code);
        }
        break;
      }
      default:
        lines.push(`  // TODO: handle node type ${node.type}`);
    }
    lines.push('');
  }

  lines.push('}');
  lines.push('');
  lines.push('main().catch(console.error);');
  return lines.join('\n');
}

export async function aiRefactorGeneratedCode(code, intent) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a Node.js expert who refactors n8n generated code. Respond with the updated code only.'
        },
        {
          role: 'user',
          content: `Refactor according to: ${intent}\n\n${code}`
        }
      ],
      temperature: 0
    })
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`OpenAI API error: ${msg}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function refactorGeneratedCode(code, intent = '', useAI = true) {
  let result = code;
  if (!intent) return result;
  if (intent.includes('use const')) {
    result = result.replace(/\blet\b/g, 'const').replace(/\bvar\b/g, 'const');
  }
  if (useAI && OPENAI_API_KEY) {
    try {
      result = await aiRefactorGeneratedCode(result, intent);
    } catch (err) {
      console.error('AI refactor failed:', err.message);
    }
  }
  return result;
}

export async function fetchWorkflow(api, id) {
  const res = await api.get(`/workflows/${id}`);
  return res.data;
}
