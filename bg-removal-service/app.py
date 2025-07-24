from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import io
import subprocess

app = FastAPI(title="Background Removal Service")


@app.post("/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    if file.content_type.split("/")[0] != "image":
        raise HTTPException(400, "Please upload an image")
    data = await file.read()
    # spawn rembg CLI
    proc = subprocess.Popen(
        ["rembg", "i"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    out, err = proc.communicate(data)
    if proc.returncode != 0:
        raise HTTPException(500, f"rembg failed: {err.decode()}")
    return StreamingResponse(io.BytesIO(out), media_type="image/png")
