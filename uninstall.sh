#!/bin/bash
# Uninstall script for Claude Code AHE Plugin (TypeScript)

set -e

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "🗑️  Uninstalling Claude Code AHE Plugin..."

# Remove hooks from settings.json
if [ -f "$SETTINGS_FILE" ]; then
  echo "🔧 Removing hooks from settings.json..."

  node -e "
const fs = require('fs');
const settingsPath = '$SETTINGS_FILE';

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

// Remove AHE hooks
if (settings.hooks) {
  if (settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
      h => !h.description || !h.description.startsWith('AHE:')
    );
  }
  if (settings.hooks.Stop) {
    settings.hooks.Stop = settings.hooks.Stop.filter(
      h => !h.description || !h.description.startsWith('AHE:')
    );
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Hooks removed');
"
fi

echo ""
echo "✅ Uninstallation complete!"
echo ""
echo "Note: Trace data is preserved at $CLAUDE_DIR/ahe/"
echo "To remove all data, run: rm -rf $CLAUDE_DIR/ahe/"
