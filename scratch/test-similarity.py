import numpy as np
import sys
sys.path.append("semantic_search")
from model_handler import CLIPEmbeddingGenerator
from PIL import Image

def dot_product(a, b):
    return np.dot(a, b)

generator = CLIPEmbeddingGenerator()

# 1. Generate text query embedding
query_emb = generator.get_text_embedding("rice")

# 2. Text embedding of filenames
car_name_emb = generator.get_text_embedding("car.jpg")
profile_name_emb = generator.get_text_embedding("profile1.jpeg")

print(f"Similarity (rice vs text 'car.jpg'): {dot_product(query_emb, car_name_emb):.4f}")
print(f"Similarity (rice vs text 'profile1.jpeg'): {dot_product(query_emb, profile_name_emb):.4f}")

# 3. If images exist locally, check image embeddings
import os
for img_path in ["car.jpg", "profile1.jpeg"]:
    # Let's find if these exist anywhere or check them
    print(f"Checking for {img_path}...")
