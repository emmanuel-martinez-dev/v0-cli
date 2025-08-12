# v0 CLI

A developer-friendly command-line tool to interact with the v0 Platform API.

## Installation

### Option 1: Local Installation (Recommended)

```bash
# Clone the repository
git clone git@github.com:manuel-soria/v0-cli.git
cd v0-cli

# Install CLI locally
./cli/install-local.sh
```

### Option 2: Global Installation (Requires administrator permissions)

```bash
# Install globally
npm install -g v0-cli

# Or use npx
npx v0-cli --help
```

### Option 3: Development

```bash
# Clone and setup for development
git clone git@github.com:manuel-soria/v0-cli.git
cd v0-cli

# Install dependencies
npm install

# Compile
npm run build

# Run directly
node dist/index.js --help
```

## Quick Start

Before using the CLI, configure your API key:

```bash
# Interactive setup
v0 config setup

# Or configure manually
v0 config set-api-key YOUR_API_KEY
```

Get your API key from: https://v0.dev/chat/settings/keys

## Usage

Key ideas:
- Global flags: `--api-key`, `--verbose`, `--output json|yaml|table`.
- Precedence for API key: `--api-key` > `V0_API_KEY` > saved config > interactive prompt.
- Output format hierarchy: per-command `--output` > global `--output` > saved config.

### Chats

#### Create a chat
```bash
# Create chat with message
v0 chat create "Create a React component with Tailwind CSS"

# Create interactive chat
v0 chat create

# With additional options
v0 chat create "Message" --system "You are a React expert" --privacy private --model v0-1.5-md --project-id PROJECT_ID --attachment https://example.com/a.png https://example.com/b.txt
```

#### List chats
```bash
# List all chats
v0 chat list

# List only favorites
v0 chat list --favorite

# Filter by project / privacy / name
v0 chat list --project-id PROJECT_ID --privacy private --name navbar

# Limit results
v0 chat list --limit 5
```

#### Get chat details
```bash
v0 chat get CHAT_ID
```

#### Send message to chat
```bash
# Send message
v0 chat message CHAT_ID "Add form validation"

# Send interactive message
v0 chat message CHAT_ID
```

#### Update chat
```
# Rename
v0 chat update CHAT_ID --name "New name"

# Change privacy
v0 chat update CHAT_ID --privacy public
```

#### Delete chat
```bash
# With confirmation
v0 chat delete CHAT_ID

# Without confirmation
v0 chat delete CHAT_ID --force
```

#### Favorites
```bash
# Add to favorites
v0 chat favorite CHAT_ID

# Remove from favorites
v0 chat favorite CHAT_ID --remove
```

### Projects

#### Create project
```bash
# Create project with name
v0 project create "My Project"

# Create interactive project
v0 project create

# With description
v0 project create "My Project" --description "An amazing project"
```

#### List projects
```bash
v0 project list
```

#### Get project details
```bash
v0 project get PROJECT_ID
```

#### Update project
```bash
v0 project update PROJECT_ID --name "New Name" --description "New description"
```

#### Assign chat to project
```bash
v0 project assign PROJECT_ID CHAT_ID
```

#### Get project by chat
```bash
v0 project get-by-chat CHAT_ID
```

### Deployments

#### List deployments
```bash
# Guided selection (recommended)
v0 deploy list

# Filter by project
v0 deploy list --project-id PROJECT_ID

# Filter by chat
v0 deploy list --chat-id CHAT_ID
```

#### Create deployment
```bash
# Interactive deployment (recommended)
v0 deploy create

# With specific IDs
v0 deploy create PROJECT_ID CHAT_ID VERSION_ID

# With project and chat names
v0 deploy create --project-name "My Project" --chat-name "My Chat"

# Force interactive mode
v0 deploy create --interactive
```

#### Quick deploy from chat
```bash
# Interactive chat selection
v0 deploy from-chat

# With chat ID
v0 deploy from-chat CHAT_ID

# With chat name
v0 deploy from-chat --chat-name "My Chat"
```

#### Quick deploy (create project, chat and deploy)
```bash
# Interactive mode
v0 deploy quick

# With message
v0 deploy quick "Create a React todo app"

# With project name and message
v0 deploy quick "Create a React todo app" --project-name "Todo App"
```

#### Get deployment details
```bash
v0 deploy get DEPLOYMENT_ID
```

#### Delete deployment
```bash
v0 deploy delete DEPLOYMENT_ID
```

#### View deployment logs
```bash
v0 deploy logs DEPLOYMENT_ID

# With timestamp
v0 deploy logs DEPLOYMENT_ID --since 1640995200000
```

#### View deployment errors
```bash
v0 deploy errors DEPLOYMENT_ID
```

### User

#### User information
```bash
v0 user info
```

#### Plan and billing
```bash
v0 user plan
```

#### Detailed billing information
```bash
v0 user billing

# With specific scope
v0 user billing --scope SCOPE
```

#### User scopes
```bash
v0 user scopes
```

#### Rate limits
```bash
v0 user rate-limits

# With specific scope
v0 user rate-limits --scope SCOPE
```

### Configuration

#### Show current configuration
```bash
v0 config show
```

#### Configure API key
```bash
# With argument
v0 config set-api-key YOUR_API_KEY

# Interactive
v0 config set-api-key
```

#### Configure default project
```bash
v0 config set-default-project PROJECT_ID
```

#### Configure output format
```bash
v0 config set-output-format json
v0 config set-output-format table
v0 config set-output-format yaml
```

#### Clear configuration
```bash
v0 config clear
```

#### Complete interactive setup
```bash
v0 config setup
```

## Global Options

### Output Format
```bash
# JSON
v0 chat list --output json

# YAML
v0 project list --output yaml

# Table (default)
v0 user info --output table
```

### API Key
```bash
# Use specific API key
v0 chat create "Message" --api-key YOUR_API_KEY
```

### Verbose
```bash
# Enable detailed logs
v0 chat list --verbose
```

## Usage Examples

### Complete Development Workflow
```bash
# 1. Configure CLI
v0 config setup

# 2. Create project
v0 project create "My React App"

# 3. Create chat for the project
v0 chat create "Create a React todo app" --project-id PROJECT_ID

# 4. Send additional message
v0 chat message CHAT_ID "Add local persistence"

# 5. Create deployment
v0 deploy create PROJECT_ID CHAT_ID VERSION_ID

# 6. View deployment logs
v0 deploy logs DEPLOYMENT_ID
```

### Quick Deploy Workflow (Recommended)
```bash
# 1. Configure CLI
v0 config setup

# 2. Quick deploy everything in one command
v0 deploy quick "Create a React todo app with local storage"

# 3. Or deploy from existing chat
v0 deploy from-chat

# 4. View deployment logs
v0 deploy logs DEPLOYMENT_ID
```

### Automation
```bash
# Create chat and get URL
CHAT_URL=$(v0 chat create "Create a navbar" --output json | jq -r '.webUrl')
echo "Chat created: $CHAT_URL"

# List projects in JSON format
v0 project list --output json | jq '.[] | .name'

# Quick deploy with automation
DEPLOYMENT_URL=$(v0 deploy quick "Create a React component" --output json | jq -r '.deployment.webUrl')
echo "Deployment ready: $DEPLOYMENT_URL"
```

## Features

- ✅ **Persistent configuration**: API key and settings are saved automatically
- ✅ **Output formats**: JSON, YAML, and developer-friendly tables
- ✅ **Better errors**: Status/code/message, optional verbose body/stack
- ✅ **Interactive UX**: Guided prompts when data is missing
- ✅ **Smart deployments**: Project/chat/version resolution with fallbacks
- ✅ **Vercel integration**: List and create integration projects
- ✅ **Name-based selection**: Choose resources by name instead of IDs

## Development

### Install dependencies
```bash
cd cli
npm install
```

### Compile
```bash
npm run build
```

### Run in development
```bash
npm run dev -- --help
```

### Testing
```
pnpm test
pnpm test:coverage
```
```bash
npm test
```

## Troubleshooting

### Installation Issues

1. **Permission error when installing globally**
   ```bash
   # Use local installation instead
   ./cli/install-local.sh
   ```

2. **Incompatible Node.js version**
   ```bash
   # Update Node.js to version 18 or higher
   # Visit: https://nodejs.org/
   ```

3. **Dependency errors**
   ```bash
   # Clean and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Usage Issues

1. **Invalid API key**
   ```bash
   # Check configuration
   v0 config show
   
   # Reconfigure API key
   v0 config set-api-key NEW_API_KEY
   ```

2. **Rate limit exceeded**
   ```bash
   # Check rate limits
   v0 user rate-limits
   
   # Wait and retry
   sleep 60
   v0 chat create "Message"
   ```

3. **Deployment failed**
   ```bash
   # View deployment errors
   v0 deploy errors DEPLOYMENT_ID
   
   # View complete logs
   v0 deploy logs DEPLOYMENT_ID
   ```

### Debugging
```
v0 --verbose <command>
v0 --output json <command>
```

```bash
# Enable verbose mode
v0 chat list --verbose

# Use JSON format for debugging
v0 chat get CHAT_ID --output json | jq '.'

# View current configuration
v0 config show
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
