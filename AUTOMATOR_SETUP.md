# Automator Setup Guide

This guide explains how to set up macOS Automator to open .md files in mdedit.

## Prerequisites

1. Python 3 installed
2. The `server.py` file in your mdedit directory
3. A modern web browser (Chrome, Safari, or Arc)

## Step 1: Create the Automator Application

1. Open **Automator** (in Applications/Utilities)
2. Choose **New Document**
3. Select **Application** type and click "Choose"
4. In the search box, type "Run Shell Script"
5. Drag "Run Shell Script" action to the workflow area

## Step 2: Configure the Shell Script

1. At the top of the "Run Shell Script" action, set:
    - **Shell**: `/bin/bash`
    - **Pass input**: `as arguments`

2. **Copy and paste** the following script into the text area:

```bash
#!/bin/bash

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
  cd "$SERVER_ROOT" || exit 1
  nohup python3 "$SERVER_SCRIPT" >/tmp/mdedit_server.log 2>&1 &
  sleep 1
fi

# Base URL (note: just root path, no /index.html)
BASE_URL="http://localhost:${PORT}/"

# If you just click "Run" in Automator with no file:
if [ "$#" -eq 0 ]; then
  open -b "$BROWSER_BUNDLE_ID" "$BASE_URL"
  exit 0
fi

# For each file passed from Finder
for f in "$@"; do
  # Get absolute path
  ABS_PATH=$(cd "$(dirname "$f")" && pwd)/$(basename "$f")

  # URL encode the path
  ENCODED_PATH=$(encode "$ABS_PATH")

  # Construct URL with path parameter
  FILE_URL="${BASE_URL}?path=${ENCODED_PATH}"

  # Open in browser using bundle ID
  open -b "$BROWSER_BUNDLE_ID" "$FILE_URL"

  # Small delay between opening multiple files
  sleep 0.5
done
```

3. **Modify the configuration** section:
    - Update `SERVER_ROOT` to match your mdedit folder path
    - Change `BROWSER_BUNDLE_ID` to your preferred browser:
        - `"com.openai.atlas"` - ChatGPT Atlas (Arc-based)
        - `"com.google.Chrome"` - Google Chrome
        - `"com.apple.Safari"` - Safari
        - `"org.mozilla.firefox"` - Firefox

    **Tip**: To find a browser's bundle ID, run:

    ```bash
    osascript -e 'id of app "ChatGPT Atlas"'
    # or
    mdls -name kMDItemCFBundleIdentifier -r /Applications/YourApp.app
    ```

4. Save the Automator application:
    - **File → Save**
    - Name: `Open in mdedit` (or your preferred name)
    - Location: `Applications` folder (recommended)

## Step 3: Set as Default Application for .md Files

1. Find any `.md` file in Finder
2. Right-click → **Get Info**
3. In the "Open with:" section:
    - Click the dropdown
    - Select `Open in mdedit.app` (or whatever you named it)
    - Click **"Change All..."** to apply to all .md files
4. Click **"Continue"** to confirm

## Step 4: Test It

1. Double-click any `.md` file in Finder
2. The browser should open with the file loaded in mdedit
3. If it doesn't work, check:
    - `/tmp/mdedit_server.log` for server errors
    - Browser console (F12 → Console tab) for frontend errors

## Troubleshooting

### Server doesn't start

Check the log file:

```bash
cat /tmp/mdedit_server.log
```

Manually start the server to see errors:

```bash
cd /Users/andy/Documents/projects/mdedit
python3 server.py
```

### File doesn't load

1. Open the browser's Developer Console (F12)
2. Look for `[mdedit]` log messages
3. Check for any errors in red

### Wrong URL format

The URL should look like:

```
http://localhost:4173/?path=/Users/andy/Documents/notes/file.md
```

NOT like:

```
http://localhost:4173/index.html?path=...  ← Wrong!
```

### Port already in use

If port 4173 is already in use, change `PORT` in the script to another number (e.g., 4174, 4175).

## Manual Testing

You can test the setup manually:

1. Start the server:

```bash
cd /Users/andy/Documents/projects/mdedit
python3 server.py
```

2. Test opening a file:

```bash
# Replace with your actual file path
open "http://localhost:4173/?path=/Users/andy/Documents/test.md"
```

3. Or test the included test file:

```bash
open "http://localhost:4173/?path=/Users/andy/Documents/projects/mdedit/test-server.md"
```

## How It Works

1. **Automator** receives the double-clicked file path
2. **Script** starts `server.py` if not already running
3. **Script** constructs URL: `http://localhost:4173/?path=/full/path/to/file.md`
4. **Browser** opens the URL
5. **Frontend** reads the `path` query parameter
6. **Frontend** fetches file content from `/file?path=...` endpoint
7. **Server** reads the file from disk and returns content
8. **Frontend** loads content into the editor

## Debugging Tips

### Enable verbose logging

Add `set -x` at the top of the script (after `#!/bin/bash`) to see what commands are being run.

### Check if server is running

```bash
lsof -i:4173
```

### View server logs in real-time

```bash
tail -f /tmp/mdedit_server.log
```

### Test the /file endpoint directly

```bash
curl "http://localhost:4173/file?path=/Users/andy/Documents/test.md"
```

## Security Notes

- The server only accepts connections from localhost (127.0.0.1)
- It can read any file on your system (by design, for opening files anywhere)
- Don't expose this server to the network - it's for local use only
