#!/bin/bash

# v0 CLI Local Installer
# This script installs the v0 CLI locally without requiring administrator permissions

set -e

echo "🚀 Installing v0 CLI locally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Navigate to CLI directory
cd "$(dirname "$0")"

# Get absolute path of CLI directory
CLI_DIR="$(pwd)"

# Clean previous installations
echo "🧹 Cleaning previous installations..."
rm -rf node_modules package-lock.json dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "❌ Error installing dependencies. Check your internet connection and npm."
    exit 1
fi

# Compile the project
echo "🔨 Compiling..."
npm run build

# Check if compilation was successful
if [ $? -ne 0 ]; then
    echo "❌ Error compiling the project."
    exit 1
fi

# Create local alias
echo "🔗 Creating local alias..."
ALIAS_SCRIPT="$HOME/.v0-cli.sh"

# Create alias script with correct absolute path
cat > "$ALIAS_SCRIPT" << EOF
#!/bin/bash
# v0 CLI wrapper script
cd "$CLI_DIR"
node dist/index.js "\$@"
EOF

chmod +x "$ALIAS_SCRIPT"

# Detect shell and configure alias
SHELL_PROFILE=""
SHELL_TYPE=""

if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
    SHELL_TYPE="zsh"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_PROFILE="$HOME/.bashrc"
    SHELL_TYPE="bash"
elif [[ "$SHELL" == *"fish"* ]]; then
    SHELL_PROFILE="$HOME/.config/fish/config.fish"
    SHELL_TYPE="fish"
fi

if [ -n "$SHELL_PROFILE" ]; then
    # Create directory if it doesn't exist (for fish)
    mkdir -p "$(dirname "$SHELL_PROFILE")"
    
    # Check if alias already exists
    if ! grep -q "alias v0=" "$SHELL_PROFILE" 2>/dev/null; then
        echo "" >> "$SHELL_PROFILE"
        echo "# v0 CLI alias" >> "$SHELL_PROFILE"
        if [ "$SHELL_TYPE" = "fish" ]; then
            echo "alias v0='$ALIAS_SCRIPT'" >> "$SHELL_PROFILE"
        else
            echo "alias v0='$ALIAS_SCRIPT'" >> "$SHELL_PROFILE"
        fi
        echo "✅ Alias added to $SHELL_PROFILE"
    else
        echo "ℹ️  Alias already exists in $SHELL_PROFILE"
    fi
else
    echo "⚠️  Could not detect shell profile. Add manually:"
    echo "   alias v0='$ALIAS_SCRIPT'"
fi

echo "✅ v0 CLI installed locally!"
echo ""
echo "📝 Next steps:"
if [ -n "$SHELL_PROFILE" ]; then
    echo "1. Restart your terminal or run: source $SHELL_PROFILE"
else
    echo "1. Add manually: alias v0='$ALIAS_SCRIPT'"
fi
echo "2. Configure your API key: v0 config setup"
echo "3. Get your API key from: https://v0.dev/chat/settings/keys"
echo "4. Test the CLI: v0 --help"
echo ""
echo "🎉 Ready to use!"

# Test the CLI
echo ""
echo "🧪 Testing the CLI..."
node dist/index.js --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ CLI works correctly!"
else
    echo "❌ Error testing the CLI"
    exit 1
fi 