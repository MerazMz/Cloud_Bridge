import os
import sys
import argparse
import json

# Suppress transformers and torch logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import warnings
warnings.filterwarnings("ignore")

# Redirect stdout to stderr for clean importing and initialization
old_stdout = sys.stdout
sys.stdout = sys.stderr

try:
    from PIL import Image
    from model_handler import CLIPEmbeddingGenerator
    
    # Try importing cv2 for video frame extraction
    try:
        import cv2
    except ImportError:
        cv2 = None
except Exception as e:
    sys.stdout = old_stdout
    print(json.dumps({"success": False, "error": f"Import failed: {str(e)}"}))
    sys.exit(1)

# Initialize CLIP generator on detected device (MPS or CPU)
try:
    generator = CLIPEmbeddingGenerator()
finally:
    # Restore stdout
    sys.stdout = old_stdout


def extract_video_frame(video_path):
    """
    Extracts the first frame of a video using OpenCV as a PIL Image.
    """
    if cv2 is None:
        raise ImportError("opencv-python is not installed. Falling back to filename embedding.")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Could not open video file.")
    
    success, frame = cap.read()
    cap.release()
    
    if not success:
        raise ValueError("Could not read frame from video.")
    
    # Convert BGR (OpenCV) to RGB (PIL)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(frame_rgb)


def main():
    parser = argparse.ArgumentParser(description="CLIP Embedding Generator CLI")
    parser.add_argument("--action", choices=["image", "video", "text"], required=True)
    parser.add_argument("--filepath", help="Path to image or video file")
    parser.add_argument("--filename", help="Filename of the uploaded item (for text fallbacks)")
    parser.add_argument("--query", help="Query string for text search")
    
    args = parser.parse_args()
    embedding = None
    
    try:
        if args.action == "image":
            if not args.filepath or not os.path.exists(args.filepath):
                # Fallback to filename
                if args.filename:
                    embedding = generator.get_text_embedding(args.filename)
                else:
                    raise ValueError("Image filepath not provided or doesn't exist.")
            else:
                try:
                    with Image.open(args.filepath) as img:
                        # Convert to RGB to ensure compatibility
                        img_rgb = img.convert("RGB")
                        embedding = generator.get_image_embedding(img_rgb)
                except Exception as img_err:
                    # Fallback to filename on image read failure
                    if args.filename:
                        sys.stderr.write(f"Image read error ({str(img_err)}), falling back to filename.\n")
                        embedding = generator.get_text_embedding(args.filename)
                    else:
                        raise img_err
                        
        elif args.action == "video":
            if not args.filepath or not os.path.exists(args.filepath):
                # Fallback to filename
                if args.filename:
                    embedding = generator.get_text_embedding(args.filename)
                else:
                    raise ValueError("Video filepath not provided or doesn't exist.")
            else:
                try:
                    img = extract_video_frame(args.filepath)
                    embedding = generator.get_image_embedding(img)
                except Exception as vid_err:
                    # Fallback to filename on video read failure
                    if args.filename:
                        sys.stderr.write(f"Video frame extraction failed ({str(vid_err)}), falling back to filename.\n")
                        embedding = generator.get_text_embedding(args.filename)
                    else:
                        raise vid_err
                        
        elif args.action == "text":
            if not args.query:
                raise ValueError("Query string not provided.")
            embedding = generator.get_text_embedding(args.query)
            
        if embedding is None:
            raise ValueError("Failed to generate embedding.")
            
        # Output result to stdout
        print(json.dumps({"success": True, "embedding": embedding}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
