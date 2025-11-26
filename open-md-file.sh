#!/bin/bash

# Automator script to open .md files in mdedit
# Save this as an Application in Automator:
# 1. New Document → Application
# 2. Add "Run Shell Script" action
# 3. Pass input: "as arguments"
# 4. Paste this script

# --- configuration ---
SERVER_ROOT="/Users/andy/Documents/projects/mdedit"
PORT=4173
# Use browser bundle ID (more reliable than app name)
BROWSER_BUNDLE_ID="com.openai.atlas"  # ChatGPT Atlas
# Other options:
# BROWSER_BUNDLE_ID="com.google.Chrome"
# BROWSER_BUNDLE_ID="com.apple.Safari"
# BROWSER_BUNDLE_ID="org.mozilla.firefox"
SERVER_SCRIPT="$SERVER_ROOT/server.py"
# ---------------------

# Function to URL-encode a path
encode() {
  python3 - "$1" << 'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
}

# Start server if not already running on this port
if ! lsof -i:"$PORT" >/dev/null 2>&1; then
  echo "Starting server on port $PORT..."
  cd "$SERVER_ROOT" || exit 1
  nohup python3 "$SERVER_SCRIPT" >/tmp/mdedit_server.log 2>&1 &
  
  # Wait for server to start
  sleep 1
  
  # Check if it actually started
  if ! lsof -i:"$PORT" >/dev/null 2>&1; then
    echo "ERROR: Failed to start server"
    cat /tmp/mdedit_server.log
    exit 1
  fi
  echo "Server started successfully"
else
  echo "Server already running on port $PORT"
fi

# Base URL (note: no /index.html, just root path)
BASE_URL="http://localhost:${PORT}/"

# If you just click "Run" in Automator with no file:
if [ "$#" -eq 0 ]; then
  echo "Opening editor without file..."
  open -b "$BROWSER_BUNDLE_ID" "$BASE_URL"
  exit 0
fi

# For each file passed from Finder
for f in "$@"; do
  echo "Opening file: $f"
  
  # Get absolute path
  ABS_PATH=$(cd "$(dirname "$f")" && pwd)/$(basename "$f")
  
  # URL encode the path
  ENCODED_PATH=$(encode "$ABS_PATH")
  
  # Construct URL with path parameter
  FILE_URL="${BASE_URL}?path=${ENCODED_PATH}"
  
  echo "URL: $FILE_URL"
  
  # Open in browser using bundle ID
  open -b "$BROWSER_BUNDLE_ID" "$FILE_URL"
  
  # Small delay between opening multiple files
  sleep 0.5
done

echo "Done!"

