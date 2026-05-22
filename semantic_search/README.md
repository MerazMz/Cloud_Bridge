# CloudBridge Semantic Search Microservice

This folder contains the Python microservice responsible for generating **CLIP (Contrastive Language-Image Pretraining)** embeddings. It powers the semantic image/text search in CloudBridge, aligning user queries with uploaded image and video assets.

---

## 📂 Folder Structure & Components

- **`model_handler.py`**: Declares the `CLIPEmbeddingGenerator` class. It downloads/loads the `openai/clip-vit-base-patch32` model, executes evaluations, and normalizes output vectors using $L_2$ normalization so that Cosine Similarity is equivalent to a simple dot product.
- **`server.py`**: A persistent HTTP server (running on port `5001` by default) built on Python's built-in `HTTPServer`. It provides high-performance, low-latency API access to the loaded CLIP model.
- **`embed.py`**: A CLI entry point to generate embeddings. It is used as a self-healing fallback by Next.js if the persistent server is offline or starting up.
- **`requirements.txt`**: Specifies the Python dependencies needed to run the CLIP model and the server.

---

## 🛠️ Installation & Setup

1. **Python Requirement**: Make sure you have **Python 3.8+** installed.
2. **Install Dependencies**: Run the following command from the root of the project (or inside this directory):
   ```bash
   pip3 install -r requirements.txt
   ```

*(Dependencies include: `transformers`, `torch`, `pillow`, `numpy`, and optionally `opencv-python` if you want video frame extraction support)*.

---

## ⚡ Integration with Next.js

You do **not** need to manually start this Python server. Next.js automatically orchestrates it:
1. When Next.js starts or handles a search/upload, the backend (`SemanticSearchService`) checks if the Python server is responding to a lightweight ping request on port `5001`.
2. If it is down, Node.js automatically spawns `python3 semantic_search/server.py --port 5001` in the background as a detached process.
3. While the server is starting up or in case of unexpected crashes, the Next.js backend falls back to using the CLI script (`embed.py`) to prevent service interruption, while initiating background self-healing.

---

## 📡 HTTP API Specifications

The server runs on **`http://127.0.0.1:5001`** and exposes a single `/embed` POST route.

### Endpoint: `POST /embed`

#### Request Schema
```json
{
  "action": "image" | "video" | "text",
  "filepath": "/absolute/path/to/media/file.jpg",
  "filename": "original_filename.jpg",
  "query": "query string"
}
```

- **`action: "text"`**: Requires `query`. Returns the text embedding vector.
- **`action: "image"`**: Requires `filepath`. If the file doesn't exist or fails to open, it automatically falls back to generating a text embedding for `filename`.
- **`action: "video"`**: Requires `filepath`. Uses OpenCV to extract the first frame and embeds it. Falls back to `filename` on error.

#### Response Schema
```json
{
  "success": true,
  "embedding": [0.0123, -0.0456, 0.789, ...]
}
```
*(The response contains a 512-dimension vector array)*.

---

## 🧪 Testing & Debugging

### Manually Running the HTTP Server
If you want to view logs directly or test the server manually:
```bash
python3 server.py --port 5001
```

### Manually Running the CLI Fallback
To test embedding generation output via the command line:
```bash
python3 embed.py --action text --query "a photorealistic image of a sunset"
```
*(Outputs the raw JSON object containing the 512-dimension vector to `stdout`)*.
