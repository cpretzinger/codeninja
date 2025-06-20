# 🥷 CodeNinja

<div align="center">
  
  [![Made with Love in Encinitas](https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F%20in-Encinitas%2C%20CA-ff69b4?style=for-the-badge)](https://github.com/cpretzinger/codeninjmaster)
  [![Garage Built](https://img.shields.io/badge/100%25-Garage%20Built-orange?style=for-the-badge)](https://github.com/cpretzinger/codeninjmaster)
  [![Powered by n8n](https://img.shields.io/badge/Powered%20by-n8n-ff6d00?style=for-the-badge)](https://n8n.io)
  [![AI Enhanced](https://img.shields.io/badge/AI-Enhanced-purple?style=for-the-badge)](https://github.com/cpretzinger/codeninjmaster)
  
  <br/>
  
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ninja.png" alt="Ninja" width="200" height="200" />
  
  ### 🌊 Surfing the automation wave from Encinitas, CA 🏄‍♂️
  
  **Build n8n workflows at the speed of thought using natural language and AI**
  
</div>

---

## 🚀 What is CodeNinja?

Born in a garage in **Encinitas, California** 🌴, CodeNinja is an MCP (Model Context Protocol) server that gives AI assistants like Claude supernatural powers over n8n workflows. 

Now **supercharged with AI** thanks to prompted365's contributions, CodeNinja lets you:
- 🗣️ Build complex workflows using natural language
- 🤖 Convert workflows to reusable code automatically
- 🔧 Fix workflow errors with one command
- 🚀 Generate entire automations from descriptions

**Translation:** You can literally talk to Claude and build complex automations by just describing what you want. No more clicking through UIs like a peasant.

```
You: "Yo CodeNinja, build me a workflow that monitors crypto prices and texts me when Bitcoin moons"
CodeNinja: "Say no more fam" *creates entire workflow in 2.3 seconds*
```

---

## 🎯 Features That Slap

### ⚡ Original CodeNinja Features
- 🗣️ **Natural Language** → Working Automation
- 🔧 **Auto-Error Fixing** → "Fix that broken node" → ✅ Done
- 🏗️ **Complex Workflows** → Built in seconds, not hours
- 📊 **Workflow Analysis** → "Which nodes fail the most?"
- 🔍 **Smart Debugging** → "Why did my workflow crash?"
- 🔄 **Bulk Operations** → "Add error handling to everything"

### 🤖 NEW AI-Powered Features (v2.0)
- 🧠 **AI Workflow Generation** → Describe it, get it built
- 💻 **Code Conversion** → Turn any workflow into JavaScript/TypeScript
- 🔄 **Workflow Refactoring** → Modernize legacy automations
- 📝 **Natural Language Processing** → Complex requirements → Perfect workflows
- 🎨 **Smart Templates** → AI learns your patterns and suggests improvements

---

## 🏄‍♂️ Quick Start (Encinitas Speed Run)

### Prerequisites
- 🟢 **Node.js** 16+ (Like a good IPA, aged just right)
- 🟠 **n8n** running (locally or in the cloud)
- 🔵 **Claude Desktop** (or API access)
- 🤖 **OpenAI API Key** (for AI features)
- ☕ **Coffee** (or kombucha, we don't judge)

### 1. Clone this bad boy
```bash
git clone https://github.com/cpretzinger/codeninjmaster.git
cd codeninja
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set your environment
```bash
cat > .env << 'EOF'
N8N_URL=https://ai.thirdeyediagnostics.com
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://ai.thirdeyediagnostics.com/api/v1/webhook
OPENAI_API_KEY=your-openai-api-key  # For AI features
EOF
```

### 4. Choose Your Fighter

#### Option A: Original MCP Server
```bash
node codeninja-server.js
# or
./start-ninja.sh 🥷
```

#### Option B: AI Workflow Converter
```bash
node workflow-codegen-server.js
```

#### Option C: Docker (Run Everything)
```bash
docker-compose up -d
```

### 5. Configure Claude Desktop
```json
{
  "mcpServers": {
    "codeninja": {
      "command": "node",
      "args": ["/path/to/codeninja/codeninja-server.js"],
      "env": {
        "N8N_URL": "https://ai.thirdeyediagnostics.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## 🎮 Usage Examples

### Basic Ninja Moves
```
"List all my workflows"
"Create a webhook that posts to Slack"
"Fix the error in my HTTP Request node"
"Show me what went wrong in the last execution"
```

### Advanced AI Jutsu (NEW!)
```
"Build a complete customer onboarding automation with:
 - Webhook receiver
 - Email validation
 - Database storage
 - Welcome email sequence
 - Slack notifications"

"Convert my Order Processing workflow to TypeScript"

"Create a workflow that:
 - Monitors RSS feeds every hour
 - Uses AI to summarize articles
 - Posts summaries to Discord
 - Stores in Google Sheets"
```

### Money Printer Mode 💸
```
"Create an invoice automation that integrates with Stripe"
"Build a lead capture system with automatic CRM updates"
"Make a social media scheduler with AI-generated content"
```

---

## 🐳 Docker Deployment

### Quick Start with Docker
```bash
# Build and run everything
docker-compose up -d

# Run only the MCP server
docker-compose up -d codeninja

# Run only the AI converter
docker-compose up -d codeninja-ai

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Management Script
```bash
./manage-ninja.sh start    # Start all services
./manage-ninja.sh stop     # Stop all services
./manage-ninja.sh restart  # Restart services
./manage-ninja.sh logs     # View logs
./manage-ninja.sh status   # Check status
./manage-ninja.sh test     # Test n8n connection
```

---

## 🛠️ API Documentation

<details>
<summary><b>📋 Workflow Management</b></summary>

- `list_workflows` - List all workflows
- `get_workflow` - Get workflow details
- `create_workflow` - Create new workflow
- `execute_workflow` - Run a workflow

</details>

<details>
<summary><b>🔧 Node Operations</b></summary>

- `add_node` - Add node to workflow
- `update_node` - Update node parameters
- `delete_node` - Remove node
- `connect_nodes` - Connect two nodes
- `disconnect_nodes` - Remove connection

</details>

<details>
<summary><b>🐛 Debugging Tools</b></summary>

- `diagnose_node_error` - Analyze node failures
- `fix_common_node_errors` - Auto-fix issues
- `validate_workflow` - Check for problems
- `get_execution_result` - View execution data

</details>

<details>
<summary><b>🤖 AI Features (NEW!)</b></summary>

- Natural language workflow generation
- Workflow to code conversion
- Intelligent error fixing
- Pattern recognition and optimization

</details>

---

## 🌴 The Encinitas Story

Built in a garage with views of the Pacific, fueled by California burritos and the dream of making automation accessible to everyone. We believe workflows should be as easy to create as ordering fish tacos at Lolita's.

**Version 2.0 Update:** Enhanced with AI superpowers by the amazing prompted365, because even ninjas need upgrades. Now you can speak your automations into existence with the power of AI! 🤖

---

## 🤝 Contributing

Got ideas? We're as open as the Pacific Coast Highway.

1. Fork it
2. Branch it (`git checkout -b feature/radical-feature`)
3. Commit it (`git commit -am 'Add some radness'`)
4. Push it (`git push origin feature/radical-feature`)
5. PR it

Special thanks to **prompted365** for the AI enhancements that took CodeNinja to the next level! 🙏

---

## 📁 Project Structure

```
codeninja/
├── codeninja-server.js       # Original MCP server (the OG)
├── workflow-codegen-server.js # AI workflow converter (the new hotness)
├── workflow-codegen.js       # AI conversion logic
├── config-validator.ts       # TypeScript config validation
├── docker-compose.yml        # Docker orchestration
├── Dockerfile               # Container definition
├── start-ninja.sh           # Quick start script
├── manage-ninja.sh          # Docker management
├── .env.example             # Environment template
├── package.json             # Dependencies
└── docs/                    # Documentation
    ├── fix-errors.md        # Error fixing guide
    ├── n8n-error-fix-phrases.md
    ├── real-life-example.md
    └── workflow-examples.md
```

---

## 🏆 What's New in v2.0

- **AI Workflow Generation** - Describe complex workflows in plain English
- **Code Export** - Convert any workflow to JavaScript/TypeScript
- **Smart Error Detection** - AI-powered error analysis and fixes
- **Docker Support** - Production-ready containerization
- **Enhanced Documentation** - Because good ninjas document their jutsu
- **TypeScript Support** - For type-safe ninja operations

---

## 📜 License

MIT License - Free as the ocean breeze 🌊

---

## 🙏 Acknowledgments

- **n8n** - For being the automation GOAT
- **Claude** - For understanding our chaotic requests
- **prompted365** - For the incredible AI enhancements
- **Encinitas** - For the inspiration and fish tacos
- **That One Garage** - Where it all began
- **The Pacific Ocean** - For the debugging sessions

---

## 📞 Support

Running into issues? Here's how to get help:

1. **Check the docs** - We actually have good ones now!
2. **Ask Claude** - "CodeNinja, help me debug this"
3. **Open an issue** - We actually read them
4. **Check the logs** - `docker-compose logs` or `./manage-ninja.sh logs`

---

<div align="center">
  
  ### 🌊 Made with salt water and syntax errors in Encinitas, CA 🏄‍♂️
  
  **Now with 200% more AI! 🤖**
  
  **If you're not automating, you're procrastinating**
  
  <br/>
  
  ⭐ Star us on GitHub - it feeds our ego and helps others discover CodeNinja
  
</div>

---

<div align="center">
  <img src="https://img.shields.io/badge/Garage-Approved-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Fish%20Taco-Powered-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Enhanced-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Surf%20Break-Compatible-blue?style=for-the-badge" />
</div>