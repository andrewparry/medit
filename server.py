#!/usr/bin/env python3
"""
Simple HTTP server for mdedit
Serves static files and provides /file endpoint to read files from disk
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
from pathlib import Path
import os

ROOT = Path(__file__).parent.resolve()  # your mdedit folder

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)

        # Our custom endpoint: /file?path=/absolute/path/to/file.md
        if parsed.path == "/file":
            qs = parse_qs(parsed.query)
            raw_path = qs.get("path", [""])[0]
            
            # Debug logging
            print(f"[DEBUG] /file endpoint called")
            print(f"[DEBUG] Raw path from query: {raw_path}")
            
            if not raw_path:
                self.send_response(400)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"Missing path parameter")
                return

            try:
                unquoted_path = unquote(raw_path)
                print(f"[DEBUG] Unquoted path: {unquoted_path}")
                
                file_path = Path(unquoted_path).resolve()
                print(f"[DEBUG] Resolved path: {file_path}")
                print(f"[DEBUG] File exists: {file_path.exists()}")
                print(f"[DEBUG] Is file: {file_path.is_file() if file_path.exists() else 'N/A'}")

                # Security: Ensure file exists and is readable
                if not file_path.exists():
                    error_msg = f"File not found: {file_path}"
                    print(f"[ERROR] {error_msg}")
                    self.send_response(404)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(error_msg.encode('utf-8'))
                    return

                if not file_path.is_file():
                    self.send_response(400)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(f"Path is not a file: {file_path}".encode('utf-8'))
                    return

                # Read file content
                try:
                    data = file_path.read_bytes()
                    print(f"[DEBUG] Successfully read {len(data)} bytes")
                except PermissionError:
                    error_msg = f"Permission denied: {file_path}"
                    print(f"[ERROR] {error_msg}")
                    self.send_response(403)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(error_msg.encode('utf-8'))
                    return

                # Determine content type
                content_type = "text/plain; charset=utf-8"
                if file_path.suffix.lower() in ['.md', '.markdown']:
                    content_type = "text/markdown; charset=utf-8"

                print(f"[DEBUG] Sending file successfully, Content-Type: {content_type}")
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
                return

            except Exception as e:
                error_msg = f"Error: {str(e)}"
                print(f"[ERROR] Exception occurred: {error_msg}")
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(error_msg.encode('utf-8'))
                return

        # Otherwise, fall back to normal static file handling
        return super().do_GET()

    def log_message(self, format, *args):
        # Custom logging to show requests
        print(f"{self.address_string()} - {format % args}")

if __name__ == "__main__":
    port = 4173
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving mdedit on http://127.0.0.1:{port}")
    print(f"Root directory: {ROOT}")
    print(f"\nTo open a file, use: http://127.0.0.1:{port}/?path=/absolute/path/to/file.md")
    print("\nPress Ctrl+C to stop the server")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        server.shutdown()