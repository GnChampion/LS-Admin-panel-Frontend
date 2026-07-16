"""
Simple HTTP server for admin panel
"""
import http.server
import socketserver
import os

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print("="*60)
    print("🌐 Land Scanner Admin Panel")
    print("="*60)
    print(f"\n✅ Server running at: http://localhost:{PORT}")
    print(f"\n📂 Serving from: {DIRECTORY}")
    print(f"\n🚀 Open in browser: http://localhost:{PORT}/index.html")
    print(f"\n⚠️  Make sure backend is running at: http://localhost:8000")
    print(f"\n Press Ctrl+C to stop\n")
    print("="*60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")
