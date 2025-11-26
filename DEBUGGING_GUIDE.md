# Debugging Guide for mdedit File Loading

## Problem

When double-clicking a `.md` file from Finder (via Automator), the browser shows: "Unable to load the file from the server. HTTP 404: File not found"

## Root Cause Analysis

The server's `/file` endpoint works correctly (verified with `curl`), but the browser frontend may be experiencing:

1. **Browser caching** - Old JavaScript code cached
2. **Timing issues** - Modules not fully loaded
3. **URL encoding** - Path not encoded correctly

## Solutions Implemented

### 1. Enhanced Server Logging

**File**: `server.py`

Added detailed debug logging to track:

- Raw path from query parameter
- Unquoted/decoded path
- Resolved absolute path
- File existence check
- File read success/failure

**To view logs:**

```bash
tail -f /tmp/mdedit_server.log
```

### 2. Cache-Busting Headers

**File**: `index.html`

Added meta tags to prevent browser caching:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### 3. Enhanced Frontend Logging

**File**: `js/editor-init.js`

Added console logging for:

- Original path from query parameter
- Trimmed and encoded path
- Full fetch URL
- Response status and headers
- Error details

### 4. Bundle ID Usage

**File**: `open-md-file.sh`

Changed from app name to bundle ID for reliability:

```bash
BROWSER_BUNDLE_ID="com.openai.atlas"  # More reliable than "ChatGPT Atlas.app"
```

## Troubleshooting Steps

### Step 1: Verify Server is Running

```bash
lsof -i:4173
```

Should show Python process on port 4173.

### Step 2: Test Server Directly

```bash
curl "http://localhost:4173/file?path=/Users/andy/Library/CloudStorage/OneDrive-Personal/Techhub/AI%20Bootcamps/Bootcamp.md"
```

Should return file content.

### Step 3: Test in Browser

1. Open: `http://localhost:4173/test-query.html`
2. Click "Test /file endpoint directly" button
3. Should see file content

### Step 4: Test with Automator

1. **Hard refresh browser** (Cmd+Shift+R) to clear cache
2. Double-click a `.md` file
3. Open DevTools Console (Cmd+Option+J)
4. Look for `[mdedit]` log messages

### Step 5: Check Server Logs

```bash
tail -20 /tmp/mdedit_server.log
```

Look for:

- `[DEBUG]` messages showing file path resolution
- `[ERROR]` messages if file not found

## Common Issues

### Issue 1: Browser Shows Cached Version

**Symptom**: No `[mdedit]` console logs, or old error messages

**Solution**:

1. Hard refresh: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows/Linux)
2. Clear browser cache completely
3. Use Private/Incognito window

### Issue 2: Server Not Running

**Symptom**: "Failed to fetch" or "Connection refused"

**Solution**:

```bash
cd /Users/andy/Documents/projects/mdedit
python3 server.py
```

### Issue 3: Permission Denied

**Symptom**: Server log shows "Permission denied"

**Solution**:

- Check file permissions: `ls -l "path/to/file.md"`
- Ensure file is readable: `chmod +r "path/to/file.md"`

### Issue 4: File Not Found

**Symptom**: Server log shows "File not found"

**Solution**:

- Verify file exists: `ls -l "path/to/file.md"`
- Check for typos in path
- OneDrive files: Ensure file is synced locally (not online-only)

## OneDrive-Specific Issues

OneDrive files may be:

1. **Online-only** (cloud icon) - Not accessible to local processes
2. **Synced locally** (green checkmark) - Accessible

To make a file available locally:

1. Right-click file in Finder
2. Select "Always Keep on This Device"
3. Wait for sync to complete

## Testing Matrix

| Test                       | Expected Result      | How to Verify                                |
| -------------------------- | -------------------- | -------------------------------------------- |
| Server responds to `/file` | 200 OK with content  | `curl http://localhost:4173/file?path=...`   |
| Test page loads file       | Shows file content   | Open `http://localhost:4173/test-query.html` |
| Automator opens file       | Editor shows content | Double-click `.md` file                      |
| Console shows logs         | `[mdedit]` messages  | Browser DevTools → Console                   |
| Server logs requests       | `[DEBUG]` messages   | `tail -f /tmp/mdedit_server.log`             |

## Files Modified

1. `server.py` - Added debug logging
2. `index.html` - Added cache-busting meta tags
3. `js/editor-init.js` - Added detailed console logging
4. `open-md-file.sh` - Changed to use bundle ID
5. `AUTOMATOR_SETUP.md` - Updated with bundle ID instructions

## Next Steps

If issue persists after following all steps:

1. Check browser DevTools Console for exact error
2. Check server logs for what path it's receiving
3. Compare URL encoding between curl (working) and browser (not working)
4. Test with a simple file in `/tmp/` to rule out OneDrive issues

## Quick Test Command

```bash
# Test everything in one go
cd /Users/andy/Documents/projects/mdedit && \
python3 -c "
from pathlib import Path
path = '/Users/andy/Library/CloudStorage/OneDrive-Personal/Techhub/AI Bootcamps/Bootcamp.md'
print(f'File exists: {Path(path).exists()}')
print(f'Is file: {Path(path).is_file()}')
" && \
curl -s "http://localhost:4173/file?path=%2FUsers%2Fandy%2FLibrary%2FCloudStorage%2FOneDrive-Personal%2FTechhub%2FAI%20Bootcamps%2FBootcamp.md" | head -5
```

Expected output:

```
File exists: True
Is file: True
# Boot Camp notes
(file content...)
```
