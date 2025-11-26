# server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
from pathlib import Path
import json

ROOT = Path(__file__).parent  # your mdedit folder

class Handler(SimpleHTTPRequestHandler):
    # Serve static files (index.html, JS, CSS) from the repo
    def translate_path(self, path):
        # Use SimpleHTTPRequestHandler's default, but rooted at ROOT
        path = super().translate_path(path)
        return str(ROOT / Path(path).relative_to(Path.cwd()))

    def do_GET(self):
        parsed = urlparse(self.path)

        # Our custom endpoint: /file?path=/absolute/path/to/file.md
        if parsed.path == "/file":
            qs = parse_qs(parsed.query)
            raw_path = qs.get("path", [""])[0]
            if not raw_path:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing path")
                return

            file_path = Path(unquote(raw_path))

            if not file_path.exists():
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"File not found")
                return

            data = file_path.read_bytes()

            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        # Otherwise, fall back to normal static file handling
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        # Save endpoint: POST /file?path=/absolute/path/to/file.md
        if parsed.path == "/file":
            qs = parse_qs(parsed.query)
            raw_path = qs.get("path", [""])[0]
            if not raw_path:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing path"}).encode())
                return

            file_path = Path(unquote(raw_path))

            # Security check: only allow saving .md or .markdown files
            if not file_path.suffix.lower() in ['.md', '.markdown']:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Only markdown files allowed"}).encode())
                return

            # Read the content from the request body
            content_length = int(self.headers.get('Content-Length', 0))
            content = self.rfile.read(content_length)

            try:
                # Write the content to the file
                file_path.write_bytes(content)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "path": str(file_path)}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not found")

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 4173), Handler)
    print("Serving on http://127.0.0.1:4173")
    server.serve_forever()