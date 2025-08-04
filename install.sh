#!/bin/bash

# v0 CLI Installer
# This script installs the v0 CLI globally

set -e

echo "🚀 Installing v0 CLI..."

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

# Create global symbolic link
echo "🔗 Creating global link..."
npm link

# Check if CLI is available
if command -v v0 &> /dev/null; then
    echo "✅ v0 CLI installed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Configure your API key: v0 config setup"
    echo "2. Get your API key from: https://v0.dev/chat/settings/keys"
    echo "3. Test the CLI: v0 --help"
    echo ""
    echo "🎉 Ready to use!"
else
    echo "⚠️  CLI installed but you may need to restart your terminal"
    echo "   Or run: source ~/.bashrc (or ~/.zshrc)"
fi 