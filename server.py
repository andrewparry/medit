# server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
from pathlib import Path

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
            self.end_headers()
            self.wfile.write(data)
            return

        # Otherwise, fall back to normal static file handling
        return super().do_GET()

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 4173), Handler)
    print("Serving on http://127.0.0.1:4173")
    server.serve_forever()