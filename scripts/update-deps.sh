#!/bin/bash

# Update Dependencies Script for Text Notifications App
# This script updates all dependencies across all workspaces in the monorepo

set -e  # Exit on any error

echo "🔄 Updating dependencies across all workspaces..."

# Function to update a workspace
update_workspace() {
    local workspace_path="$1"
    local workspace_name="$2"
    
    echo "📦 Updating $workspace_name..."
    
    # Check if package.json exists
    if [ ! -f "$workspace_path/package.json" ]; then
        echo "⚠️  No package.json found in $workspace_path, skipping..."
        return 0
    fi
    
    # Update dependencies
    (cd "$workspace_path" && npx npm-check-updates -u > /dev/null 2>&1 || echo "No updates available for $workspace_name")
    (cd "$workspace_path" && npm install --silent)
    
    echo "✅ $workspace_name updated"
}

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🏠 Root directory: $ROOT_DIR"

# Update all workspaces
update_workspace "frontend" "Frontend"
update_workspace "backend" "Backend"
update_workspace "shared" "Shared"
update_workspace "tests" "Tests"
update_workspace "backend/functions/signup-processor" "Signup Processor"
update_workspace "backend/functions/message-sender" "Message Sender"

# Update root workspace last
echo "📦 Updating Root workspace..."
npx npm-check-updates -u > /dev/null 2>&1 || echo "No updates available for Root"
npm install --silent

echo "✅ All workspaces updated successfully!"
echo "🔍 Running final check for outdated packages..."

# Check if any packages are still outdated
if npm outdated > /dev/null 2>&1; then
    echo "⚠️  Some packages may still be outdated. Run 'npm outdated' to check."
else
    echo "🎉 All packages are up to date!"
fi 