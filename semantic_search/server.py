import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure we can import model_handler
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from model_handler import CLIPEmbeddingGenerator

# Try importing cv2 for video frame extraction
try:
    import cv2
except ImportError:
    cv2 = None

# Suppress warnings and logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import warnings
warnings.filterwarnings("ignore")

print("CLIP Server: Initializing CLIP Embedding Generator...")
generator = CLIPEmbeddingGenerator()
print("CLIP Server: Model loaded successfully.")

def extract_video_frame(video_path):
    if cv2 is None:
        raise ImportError("opencv-python is not installed. Video frame extraction requires cv2.")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file.")
    
    success, frame = cap.read()
    cap.release()
    
    if not success:
        raise ValueError("Could not read frame from video.")
    
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(frame_rgb)

class EmbedHTTPRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging request details to keep the console output clean
        pass

    def do_POST(self):
        if self.path != "/embed":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            req = json.loads(post_data.decode('utf-8'))
            action = req.get("action")
            filepath = req.get("filepath")
            filename = req.get("filename")
            query = req.get("query")

            embedding = None

            if action == "image":
                if not filepath or not os.path.exists(filepath):
                    if filename:
                        embedding = generator.get_text_embedding(filename)
                    else:
                        raise ValueError("Image filepath not provided or doesn't exist.")
                else:
                    try:
                        with Image.open(filepath) as img:
                            img_rgb = img.convert("RGB")
                            embedding = generator.get_image_embedding(img_rgb)
                    except Exception as img_err:
                        if filename:
                            embedding = generator.get_text_embedding(filename)
                        else:
                            raise img_err
            elif action == "video":
                if not filepath or not os.path.exists(filepath):
                    if filename:
                        embedding = generator.get_text_embedding(filename)
                    else:
                        raise ValueError("Video filepath not provided or doesn't exist.")
                else:
                    try:
                        img = extract_video_frame(filepath)
                        embedding = generator.get_image_embedding(img)
                    except Exception as vid_err:
                        if filename:
                            embedding = generator.get_text_embedding(filename)
                        else:
                            raise vid_err
            elif action == "text":
                if not query:
                    raise ValueError("Query string not provided.")
                embedding = generator.get_text_embedding(query)
            else:
                raise ValueError(f"Unknown action: {action}")

            if embedding is None:
                raise ValueError("Failed to generate embedding.")

            response_data = json.dumps({"success": True, "embedding": embedding})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(response_data.encode('utf-8'))

        except Exception as e:
            response_data = json.dumps({"success": False, "error": str(e)})
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(response_data.encode('utf-8'))

def run(port=5001):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, EmbedHTTPRequestHandler)
    print(f"CLIP Embedding Server running on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Stopping server...")
    httpd.server_close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5001)
    args = parser.parse_args()
    run(port=args.port)
