"codeninja": {
      "command": "node",
      "args": ["path/to/your/codeninja-server.js", "--stdio"],
      "env": {
        "N8N_URL": "https://ai.thirdeyediagnostics.com",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Yjc1MzI2Ny0zZjMzLTQzZjItYmI0ZC1kNzlmMWIxMWJiYjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUwNDQzMjgxfQ.0V1PVfawqGUISn6RRSmu4tl4YMFLxhEFhxFo56KEL2E",
        "NODE_ENV": "development"
      }

      "codeninja": {
      "command": "ssh",
      "args": ["root@134.209.72.79", "cd /mnt/volume_nyc1_01/codeninja && node codeninja-server.js --stdio"],
      "env": {
        "N8N_URL": "https://ai.thirdeyediagnostics.com", 
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Yjc1MzI2Ny0zZjMzLTQzZjItYmI0ZC1kNzlmMWIxMWJiYjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUwNTI2ODY0fQ.f-SVRD2pmtJi1m-SUG0J2ybrRM1U1slKZQzOet4-VeQ",
        "NODE_ENV": "development"
      }
    }

    N8N_URL="https://ai.thirdeyediagnostics.com" X-N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Yjc1MzI2Ny0zZjMzLTQzZjItYmI0ZC1kNzlmMWIxMWJiYjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUwNTI2ODY0fQ.f-SVRD2pmtJi1m-SUG0J2ybrRM1U1slKZQzOet4-VeQ" npx @modelcontextprotocol/inspector node codeninja-server.js --stdio
