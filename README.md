# 🥷 CodeNinja

<div align="center">
  
  [![Made with Love in Encinitas](https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F%20in-Encinitas%2C%20CA-ff69b4?style=for-the-badge)](https://github.com/yourusername/codeninja)
  [![Garage Built](https://img.shields.io/badge/100%25-Garage%20Built-orange?style=for-the-badge)](https://github.com/yourusername/codeninja)
  [![Powered by n8n](https://img.shields.io/badge/Powered%20by-n8n-ff6d00?style=for-the-badge)](https://n8n.io)
  [![Ninja Level](https://img.shields.io/badge/Ninja%20Level-Over%209000-red?style=for-the-badge)](https://github.com/yourusername/codeninja)
  
  <br/>
  
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ninja.png" alt="Ninja" width="200" height="200" />
  
  ### 🌊 Surfing the automation wave from Encinitas, CA 🏄‍♂️
  
  **Build n8n workflows at the speed of thought using natural language**
  
</div>

---

## 🚀 What is CodeNinja?

Born in a garage in **Encinitas, California** 🌴, CodeNinja is an MCP (Model Context Protocol) server that gives AI assistants like Claude supernatural powers over n8n workflows. 

**Translation:** You can literally talk to Claude and build complex automations by just describing what you want. No more clicking through UIs like a peasant.

```
You: "Yo CodeNinja, build me a workflow that monitors crypto prices and texts me when Bitcoin moons"
CodeNinja: "Say no more fam" *creates entire workflow in 2.3 seconds*
```

---

## 🎯 Features That Slap

### ⚡ Lightning Fast Workflow Creation
- 🗣️ **Natural Language** → Working Automation
- 🔧 **Auto-Error Fixing** → "Fix that broken node" → ✅ Done
- 🏗️ **Complex Workflows** → Built in seconds, not hours

### 🧠 Big Brain Capabilities
- 📊 **Workflow Analysis** → "Which nodes fail the most?"
- 🔍 **Smart Debugging** → "Why did my workflow crash?"
- 🔄 **Bulk Operations** → "Add error handling to everything"
- 🎯 **Pattern Detection** → Finds issues before they happen
- 📝 **Workflow → Code** → Convert n8n flows into runnable scripts

### 💰 Money Printer Features
- 🤖 **API Integrations** → Connect anything to anything
- 📧 **Email Automation** → Spam responsibly
- 📊 **Data Pipelines** → ETL without the tears
- 🔔 **Smart Alerts** → Know everything, always

---

## 🏄‍♂️ Quick Start (Encinitas Speed Run)

### Prerequisites
- 🟢 **Node.js** 16+ (Like a good IPA, aged just right)
- 🟠 **n8n** running (locally or in the cloud)
- 🔵 **Claude Desktop** (or API access)
- ☕ **Coffee** (or kombucha, we don't judge)

### 1. Clone this bad boy
```bash
git clone https://github.com/yourusername/codeninja.git
cd codeninja
```

### 2. Install dependencies
```bash
npm install
# or if you're fancy
pnpm install
```

### 3. Set your environment
```bash
export N8N_URL="http://localhost:5678"
export N8N_API_KEY="your-n8n-api-key"
export OPENAI_API_KEY="your-openai-key" # optional for AI refactoring
```

### 4. Configure Claude Desktop
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
    }
  }
}
```

### 5. Start the server
```bash
npm start
# or
./start-ninja.sh 🥷
```

### 6. Start the CodeGen server (optional)
```bash
node workflow-codegen-server.js
```

---

## 🎮 Usage Examples

### Basic Ninja Moves
```
"List all my workflows"
"Create a webhook that posts to Slack"
"Fix the error in my HTTP Request node"
```

### Advanced Jutsu
```
"Build a complete customer onboarding automation with email sequences"
"Create a data pipeline that syncs PostgreSQL to Google Sheets every hour"
"Set up a monitoring system that alerts me when any workflow fails"
"Convert workflow xyz to code and use AI to apply my refactoring hints"
```

### Money Printer Mode 💸
```
"Create an invoice automation that integrates with Stripe"
"Build a lead capture system with automatic CRM updates"
"Make a social media scheduler with AI-generated content"
```

---

## 🛠️ API Documentation

<details>
<summary><b>📋 Workflow Management</b></summary>

- `list_workflows` - List all workflows
- `get_workflow` - Get workflow details
- `create_workflow` - Create new workflow
- `activate_workflow` - Deploy and activate a workflow
- `deactivate_workflow` - Disable a workflow
- `update_workflow` - Update an existing workflow
- `delete_workflow` - Delete a workflow
- `transfer_workflow` - Move a workflow to another project
- `execute_workflow` - Run a workflow
- `list_executions` - Query past executions
- `generate_audit` - Run an instance security audit

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
<summary><b>🗄️ Instance Tools</b></summary>

- `create_credential` - Add credentials for nodes
- `pull_remote` - Pull latest workflows from repo
- `create_variable` - Create an instance variable
- `list_variables` - List stored variables

</details>

<details>
<summary><b>🐛 Debugging Tools</b></summary>

- `diagnose_node_error` - Analyze node failures
- `fix_common_node_errors` - Auto-fix issues
- `validate_workflow` - Check for problems
- `get_execution_result` - View execution data

</details>

---

## 🌴 The Encinitas Story

Built in a garage with views of the Pacific, fueled by California burritos and the dream of making automation accessible to everyone. We believe workflows should be as easy to create as ordering fish tacos at Lolita's.

**Why CodeNinja?** Because clicking through UI buttons is for tourists. Real locals speak their automations into existence.

---

## 🤝 Contributing

Got ideas? We're as open as the Pacific Coast Highway.

1. Fork it
2. Branch it (`git checkout -b feature/radical-feature`)
3. Commit it (`git commit -am 'Add some radness'`)
4. Push it (`git push origin feature/radical-feature`)
5. PR it

Bonus points if your commit messages include surf conditions.

---

## 🏆 Hall of Fame

- **First Workflow Created:** "Surf Report Automation" (obvs)
- **Most Complex Workflow:** 47 nodes, still runs faster than PCH traffic
- **Bugs Fixed:** Over 9000
- **Coffee Consumed:** ∞

---

## 📜 License

MIT License - Free as the ocean breeze 🌊

---

## 🙏 Acknowledgments

- **n8n** - For being the automation GOAT
- **Claude** - For understanding our chaotic requests
- **Encinitas** - For the inspiration and fish tacos
- **That One Garage** - You know who you are

---

## 📞 Support

Running into issues? Here's how to get help:

1. **Check the docs** (you're reading them)
2. **Ask Claude** - "CodeNinja, help me debug this"
3. **Open an issue** - We actually read them
4. **Tweet at us** - @CodeNinjaIO (jk, we're too busy surfing)

---

<div align="center">
  
  ### 🌊 Made with salt water and syntax errors in Encinitas, CA 🏄‍♂️
  
  **If you're not automating, you're procrastinating**
  
  <br/>
  
  ⭐ Star us on GitHub - it feeds our ego and helps others discover CodeNinja
  
</div>

---

<div align="center">
  <img src="https://img.shields.io/badge/Garage-Approved-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Fish%20Taco-Powered-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Surf%20Break-Compatible-blue?style=for-the-badge" />
</div>