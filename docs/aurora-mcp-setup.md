# Aurora .env Vault and MCP Fileserver Setup

This document outlines how to run the `.env` uploader (Aurora) and a second MCP
server that exposes local directory access via SSH. Both services are containerized
with Docker and connect to your existing n8n orchestrator.

## 1. Aurora: the .env Vault

`Aurora` is a simple Express server that accepts `.env` uploads, parses them with
`dotenv`, and stores the file for other MCP tools. The sample server code lives in
`server.js`. To run it in Docker:

```Dockerfile
# Dockerfile for Aurora
FROM node:18-alpine
WORKDIR /app
COPY server.js package*.json ./
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t aurora-env-vault .
docker run -p 3000:3000 -v $(pwd)/uploads:/app/uploads aurora-env-vault
```

This exposes the uploader at `http://localhost:3000`. Uploaded files are kept in
the `uploads` volume.

### MCP connection config

Add to your MCP configuration (e.g. `.roo/mcp.json`):

```json
{
  "mcpServers": {
    "aurora": {
      "command": "docker",
      "args": ["run", "-p", "3000:3000", "aurora-env-vault"],
      "env": {
        "PORT": "3000"
      }
    }
  }
}
```

## 2. MCP Fileserver with SSH

The second server ("mcp-fileserver") allows an MCP client to read and write files
on a remote machine through an SSH tunnel. Docker compose is used to run an
`openssh-server` container and a small Node.js MCP server that proxies file
operations.

```yaml
# docker-compose.yml
version: "3"
services:
  fileserver:
    image: linuxserver/openssh-server
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
      - PUBLIC_KEY_FILE=/config/ssh/authorized_keys
    volumes:
      - ./ssh:/config
      - ./data:/data
    ports:
      - "2222:2222"
  mcp:
    build: ./mcp-fileserver
    environment:
      SSH_HOST: fileserver
      SSH_PORT: 2222
    volumes:
      - ./data:/data
```
```

Within `mcp-fileserver`, implement logic to connect via SSH using the provided
host key and expose MCP tools for file operations.

### Generating SSH keys

```bash
mkdir -p ssh
ssh-keygen -t ed25519 -f ssh/id_ed25519 -N ""
cp ssh/id_ed25519.pub ssh/authorized_keys
```

### MCP connection config

```json
{
  "mcpServers": {
    "mcp-fileserver": {
      "command": "docker-compose",
      "args": ["up"],
      "env": {
        "SSH_HOST": "fileserver",
        "SSH_PORT": "2222"
      }
    }
  }
}
```

## 3. Connecting to n8n orchestrator

Both servers can be listed in your global MCP configuration along with the
existing `codeninja` server. Example snippet:

```json
{
  "mcpServers": {
    "codeninja": {
      "command": "node",
      "args": ["/path/to/codeninja/codeninja-server.js"],
      "env": {
        "N8N_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-api-key"
      }
    },
    "aurora": { ... },
    "mcp-fileserver": { ... }
  }
}
```

Replace `...` with the respective config blocks from above. When your n8n
orchestrator starts these servers, they will be accessible as tools to your AI
assistants.

---

*Note:* fetching the full MCP documentation from
`modelcontextprotocol.io` was not possible in this environment, so these
instructions rely on existing knowledge of MCP server configuration.
