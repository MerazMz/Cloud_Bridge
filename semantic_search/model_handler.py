import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import os

class CLIPEmbeddingGenerator:
    """
    A helper class to load and generate embeddings using OpenAI's CLIP model.
    By default, it uses 'openai/clip-vit-base-patch32'.
    """
    def __init__(self, model_id: str = "openai/clip-vit-base-patch32"):
        # Default to CPU for ultra-low latency on single query/upload CLI executions.
        # MPS warm-up/shader compilation takes 30-50s per process startup, whereas CPU starts instantly.
        self.device = os.environ.get("CLIP_DEVICE", "cpu")
        print(f"Initializing CLIP model '{model_id}' on device: {self.device}...")
        
        self.model = CLIPModel.from_pretrained(model_id).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_id)
        self.model.eval()

    def get_image_embedding(self, image: Image.Image) -> list[float]:
        """
        Generates a normalized L2 CLIP embedding for a PIL image.
        """
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
            
        features = outputs.pooler_output if hasattr(outputs, "pooler_output") else outputs
        # Normalize vectors for cosine similarity space
        features = features / features.norm(p=2, dim=-1, keepdim=True)
        return features[0].cpu().numpy().tolist()

    def get_text_embedding(self, text: str) -> list[float]:
        """
        Generates a normalized L2 CLIP embedding for a text query.
        """
        inputs = self.processor(text=[text], return_tensors="pt", padding=True).to(self.device)
        with torch.no_grad():
            outputs = self.model.get_text_features(**inputs)
            
        features = outputs.pooler_output if hasattr(outputs, "pooler_output") else outputs
        # Normalize vectors for cosine similarity space
        features = features / features.norm(p=2, dim=-1, keepdim=True)
        return features[0].cpu().numpy().tolist()

