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

def extract_dominant_colors(path: str, num_colors=3) -> List[str]:
    image = Image.open(path).convert("RGB")
    image = image.resize((150, 150))  
    pixels = np.array(image).reshape(-1, 3)

    kmeans = KMeans(n_clusters=num_colors)
    kmeans.fit(pixels)

    colors = kmeans.cluster_centers_.astype(int)
    return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]

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
