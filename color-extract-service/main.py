from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# def extract_dominant_colors(path: str, num_colors=3) -> List[str]:
#     image = Image.open(path).convert("RGBA")

#     background = Image.new("RGB", image.size, (255, 255, 255))
#     background.paste(image, mask=image.split()[3])  
#     image = background

#     image = image.resize((150, 150))

#     pixels = np.array(image).reshape(-1, 3)
#     if len(pixels) > 1000:
#         indices = np.random.choice(len(pixels), size=1000, replace=False)
#         pixels = pixels[indices]

#     kmeans = KMeans(n_clusters=num_colors)
#     kmeans.fit(pixels)

#     colors = kmeans.cluster_centers_.astype(int)
#     return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]

# Code with some debugging

def extract_dominant_colors(path: str, num_colors=3) -> List[str]:
    image = Image.open(path).convert("RGBA")
    print(f"[DEBUG] Opened image {path}, size: {image.size}, mode: {image.mode}")

    background = Image.new("RGB", image.size, (255, 255, 255))
    background.paste(image, mask=image.split()[3])
    image = background

    pixels = np.array(image).reshape(-1, 3)
    print(f"[DEBUG] Total pixels: {len(pixels)}")

    if len(pixels) == 0:
        print("[WARN] No pixels found")
        return []

    if np.all(pixels == pixels[0]):
        print(f"[WARN] All pixels are the same: {pixels[0]}")
        return []

    if len(pixels) > 1000:
        indices = np.random.choice(len(pixels), size=1000, replace=False)
        pixels = pixels[indices]

    print(f"[DEBUG] Sampled {len(pixels)} pixels for KMeans")

    try:
        kmeans = KMeans(n_clusters=num_colors, n_init="auto")
        kmeans.fit(pixels)
    except Exception as e:
        print(f"[ERROR] KMeans failed: {e}")
        return []

    colors = kmeans.cluster_centers_.astype(int)
    hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]
    print(f"[DEBUG] Extracted colors: {hex_colors}")
    return hex_colors


@app.post("/extract-colors")
async def extract_colors(file: UploadFile = File(...)):
    temp_path = f"temp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        colors = extract_dominant_colors(temp_path)
        return {"colors": colors}
    except Exception as e:
        return {"error": str(e)}
