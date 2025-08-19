# color-extract-service/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from PIL import Image
from io import BytesIO
import numpy as np
from sklearn.cluster import KMeans

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_dominant_colors_from_image(img: Image.Image, num_colors: int = 3) -> List[str]:
    # Normalize mode & composite onto white if there’s transparency
    if img.mode in ("RGBA", "LA"):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        img = background
    else:
        img = img.convert("RGB")

    # Downscale for speed/consistency
    img = img.resize((150, 150))
    pixels = np.array(img).reshape(-1, 3)

    if pixels.size == 0:
        return []

    # If all pixels are identical, nothing to cluster
    if np.unique(pixels, axis=0).shape[0] < 2:
        return []

    # Sample for performance if huge
    if len(pixels) > 1000:
        idx = np.random.choice(len(pixels), size=1000, replace=False)
        pixels = pixels[idx]

    # scikit-learn compatible across versions
    kmeans = KMeans(n_clusters=num_colors, n_init=10, random_state=42)
    kmeans.fit(pixels)
    centers = kmeans.cluster_centers_.astype(int)
    return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in centers]

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/extract-colors")
async def extract_colors(file: UploadFile = File(...)):
    # Basic guardrails
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {file.content_type}")

    # Read bytes into memory; no filesystem writes
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(BytesIO(data))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    try:
        colors = extract_dominant_colors_from_image(img, num_colors=3)
        return {"colors": colors}
    except Exception as e:
        # Bubble up real error for logs, but return a clean 500 payload
        raise HTTPException(status_code=500, detail=f"Color extraction failed: {e}")
