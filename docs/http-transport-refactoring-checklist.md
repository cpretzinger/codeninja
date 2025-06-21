# MCP Server HTTP Transport Refactoring Checklist

## 🎯 Objective
Refactor MCP server from stdio transport to HTTP/SSE transport to solve Docker exit code 0 issues.

## ✅ Implementation Checklist

### Phase 1: Core HTTP Transport Setup
- [ ] Replace `StdioServerTransport` with `SSEServerTransport` in imports
- [ ] Add Express.js HTTP server setup
- [ ] Create `/sse` endpoint for MCP connections
- [ ] Add `/health` endpoint for Docker health checks
- [ ] Update main server initialization to use HTTP transport

### Phase 2: Type Safety Enhancements
- [ ] Add HTTP transport configuration types
- [ ] Create connection pool management types
- [ ] Add SSE connection state types
- [ ] Update error handling for HTTP-specific errors
- [ ] Add request/response validation types

### Phase 3: Connection Management
- [ ] Implement connection pool with Map<string, SSEConnection>
- [ ] Add connection lifecycle management (connect/disconnect)
- [ ] Create connection cleanup on server shutdown
- [ ] Add connection state tracking and metrics
- [ ] Implement connection timeout handling

### Phase 4: Docker Configuration
- [ ] Update Dockerfile to expose port 3000
- [ ] Add Docker health check using `/health` endpoint
- [ ] Update docker-compose.yml with port mapping
- [ ] Configure environment variables for HTTP server
- [ ] Test container startup and persistence

### Phase 5: Server Configuration
- [ ] Add HTTP server configuration (port, host, CORS)
- [ ] Configure Express.js middleware (JSON, CORS, logging)
- [ ] Add graceful shutdown for HTTP server
- [ ] Implement proper signal handling (SIGTERM, SIGINT)
- [ ] Add startup logging and diagnostics

### Phase 6: Testing & Validation
- [ ] Test HTTP server starts and stays alive
- [ ] Verify `/health` endpoint responds correctly
- [ ] Test MCP client connection via `/sse` endpoint
- [ ] Validate all existing tools work over HTTP transport
- [ ] Test Docker container doesn't exit with code 0
- [ ] Verify production deployment compatibility

## 🔧 Key Files to Modify

### Primary Files
- `codeninja-server.ts` - Main server implementation
- `types/mcp-server.ts` - Add HTTP transport types
- `Dockerfile` - Add port exposure and health check
- `docker-compose.yml` - Add port mapping

### New Files to Create
- `types/http-transport.ts` - HTTP-specific type definitions
- `utils/connection-pool.ts` - Connection management utilities

## 🚀 Quick Implementation Steps

1. **Import Changes**
   ```typescript
   // Replace
   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
   // With
   import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
   import express from 'express';
   ```

2. **Server Setup**
   ```typescript
   const app = express();
   app.post('/sse', async (req, res) => {
     const transport = new SSEServerTransport('/message', res);
     await server.connect(transport);
   });
   ```

3. **Docker Updates**
   ```dockerfile
   EXPOSE 3000
   HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
   ```

4. **Port Mapping**
   ```yaml
   ports:
     - "3000:3000"
   ```

## 🎯 Success Criteria
- [ ] Docker container stays alive (no exit code 0)
- [ ] HTTP server responds on port 3000
- [ ] MCP clients can connect via HTTP/SSE
- [ ] All existing tools function correctly
- [ ] Health checks pass
- [ ] Production deployment successful

## 🔄 Rollback Plan
- Keep `codeninja-server.js` as backup
- Create new `codeninja-server-http.ts` for HTTP version
- Test thoroughly before replacing main server
- Document connection string changes for clients