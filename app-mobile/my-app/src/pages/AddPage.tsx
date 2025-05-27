// src/pages/AddPage.tsx

import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";
import { Camera, Upload } from 'lucide-react';
//const [category, setCategory] = useState<string>('');


const AddPage: React.FC = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();
    const [category, setCategory] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    if (stream && videoRef.current && !cameraPreview) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video
        .play()
        .catch(() => {
          /* ignore autoplay errors */
        });
    }
  }, [stream, cameraPreview]);

  const startCamera = async () => {
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      console.error("camera error", err);
    }
  };

  const capturePhoto = () => {
    if (!stream || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCameraPreview(canvas.toDataURL());
  };

const handleDone = async (type: "camera" | "upload") => {
  const finalImg = type === "camera" ? cameraPreview : uploadPreview;
  if (!finalImg || !category) {
    alert("Please select a category and take/upload an image.");
    return;
  }

  const blob = await (await fetch(finalImg)).blob();
  const formData = new FormData();
  formData.append("image", blob, "upload.png");
  formData.append("category", category);

  try {
    const response = await fetch("http://localhost:5001/api/closet/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    console.log("Uploaded:", data);

    stream?.getTracks().forEach((t) => t.stop());
    setImage(finalImg);
    navigate("/closet");
  } catch (error) {
    console.error("Error uploading image:", error);
  }
};


  return (
    <div className="flex flex-col min-h-screen bg-white p-4 md:p-8">
      {/* Header moved up with reduced margin */}
      <div className="w-full max-w-2xl mx-auto mt-0 mb-0"> {/* Reduced mt and mb */}
        <h1 className="text-4xl md:text-4xl font-bold font-bodoni tracking-wide text-center">Add New Item</h1>
      </div>

      {/* Content moved up with reduced gap */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-4"> {/* Reduced gap */}
        {/* ── CAMERA PANE ────────────────────────────────────────── */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-2"> {/* Reduced padding */}
          <div className="bg-white border-2 border-black rounded-xl md:rounded-2xl w-64 h-80 flex items-center justify-center overflow-hidden relative">
            {/* 1) initial Take Photo button */}
            {!stream && !cameraPreview && (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 font-medium"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
            )}

            {/* 2) live feed */}
            {stream && !cameraPreview && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* 3) captured still */}
            {cameraPreview && (
              <img
                src={cameraPreview}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera controls */}
          {stream && (
            <div className="mt-4 flex items-center justify-center space-x-4"> {/* Reduced margin-top */}
              
<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="border border-black rounded-full px-6 py-2 text-black bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#3F978F] transition"
>
  <option value="">Select Category</option>
  <option value="SHIRT">Shirt</option>
  <option value="HOODIE">Hoodie</option>
  <option value="PANTS">Pants</option>
  <option value="SHORTS">Shorts</option>
  <option value="SHOES">Shoes</option>
</select>

              <button
                onClick={capturePhoto}
                className="bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full p-2"
              >
                <img src="/camera.png" alt="Capture" className="w-6 h-6" />
              </button>

              <button
                onClick={() => handleDone("camera")}
                disabled={!cameraPreview}
                className="bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 disabled:opacity-50 font-medium"
              >
                Done
              </button>

              <button
                onClick={() => setCameraPreview(null)}
                className="bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 font-medium"
              >
                Redo
              </button>
            </div>
          )}
        </div>

        {/* ── DIVIDER ────────────────────────────────────────────── */}
        <div className="hidden lg:block mx-4 h-64 border-l border-gray-300" /> {/* Reduced margin */}
        <div className="block lg:hidden w-3/4 border-t border-gray-300 my-2" /> {/* Reduced margin */}

        {/* ── UPLOAD PANE ────────────────────────────────────────── */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-2"> {/* Reduced padding */}
          <div className="bg-white border-2 border-black rounded-xl md:rounded-2xl w-64 h-80 flex items-center justify-center overflow-hidden">
            {!uploadPreview ? (
              <label className="flex items-center gap-2 bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 cursor-pointer font-medium">
                <Upload className="w-5 h-5" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setUploadPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            ) : (
              <img
                src={uploadPreview}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {uploadPreview && (
            <div className="mt-4 flex items-center justify-center space-x-4"> {/* Reduced margin-top */}
<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="border border-black rounded-full px-6 py-2 text-black bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#3F978F] transition"
>
  <option value="">Select Category</option>
  <option value="SHIRT">Shirt</option>
  <option value="HOODIE">Hoodie</option>
  <option value="PANTS">Pants</option>
  <option value="SHORTS">Shorts</option>
  <option value="SHOES">Shoes</option>
</select>

              
              <button
                onClick={() => handleDone("upload")}
                className="bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 font-medium"
              >
                Done
              </button>
              <button
                onClick={() => setUploadPreview(null)}
                className="bg-black text-white hover:bg-[#3F978F] transition-colors rounded-full px-6 py-2 font-medium"
              >
                Redo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPage;