#!/bin/bash
# Install script for Claude Code AHE Plugin (TypeScript)

set -e

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
PLUGIN_NAME="claude-ahe-ts"

echo "🚀 Installing Claude Code AHE Plugin..."

# Create Claude Code directory if needed
mkdir -p "$CLAUDE_DIR"

# Build the plugin
echo "📦 Building plugin..."
cd "$PLUGIN_DIR"
pnpm install --silent
pnpm build

# Install hooks in settings.json
echo "🔧 Configuring hooks..."

# Create settings.json if it doesn't exist
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# Use Node.js to update settings.json (properly handles JSON)
node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = '$SETTINGS_FILE';
const pluginDir = '$PLUGIN_DIR';

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Initialize hooks if not present
if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
if (!settings.hooks.Stop) settings.hooks.Stop = [];

// Add trace collector hook (PostToolUse)
const traceCollector = {
  matcher: '.*',
  command: 'node ' + path.join(pluginDir, 'dist/hooks/trace-collector.js'),
  description: 'AHE: Collect tool execution traces'
};

// Remove existing AHE hooks
settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
  h => !h.description || !h.description.startsWith('AHE:')
);
settings.hooks.Stop = settings.hooks.Stop.filter(
  h => !h.description || !h.description.startsWith('AHE:')
);

// Add hooks
settings.hooks.PostToolUse.push(traceCollector);
settings.hooks.Stop.push({
  command: 'node ' + path.join(pluginDir, 'dist/hooks/session-summarizer.js'),
  description: 'AHE: Generate session summary'
});

// Write back
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Hooks configured');
"

# Create traces and analysis directories
mkdir -p "$CLAUDE_DIR/ahe/traces"
mkdir -p "$CLAUDE_DIR/ahe/analysis"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Usage:"
echo "  npx $PLUGIN_NAME analyze    - Analyze recent sessions"
echo "  npx $PLUGIN_NAME status     - Show collection status"
echo "  npx $PLUGIN_NAME report     - Generate report"
echo ""
echo "Skills:"
echo "  /ahe-analyze [n]            - Analyze last n sessions"
echo "  /ahe-status                 - Show collection status"
echo ""
echo "Traces will be stored in: $CLAUDE_DIR/ahe/traces"
