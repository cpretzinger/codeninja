#!/bin/bash
export N8N_URL="http://localhost:5678"
export N8N_API_KEY="$N8N_API_KEY"
export N8N_WEBHOOK_URL="http://localhost:5678"
echo "🥷 CodeNinja Connected to Third Eye Diagnostics!"
node codeninja-server.js
