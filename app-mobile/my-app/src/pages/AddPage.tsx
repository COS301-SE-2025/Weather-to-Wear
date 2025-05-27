// src/pages/AddPage.tsx

import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";
import { Camera, Upload } from "lucide-react";

const AddPage: React.FC = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("");

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
    <div className="flex flex-col min-h-screen bg-gray-50 p-6 md:p-12">
      {/* Header */}
    <div 
   className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-64 mb-6"
      style={{
        backgroundImage: `url(/background.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
          marginLeft: 'calc(-50vw + 50%)', // This centers the full-width element
        width: '100vw',
         marginTop: '-4rem'
      }}
    >
<div className="px-6 py-2 border-2 border-white z-10">
  <h1 
    className="text-2xl font-bodoni font-light text-center text-white"
    style={{
     // fontFamily: "'Bodoni Moda', serif",
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    }}
  >
    ADD AN ITEM
  </h1>
</div>


      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
    </div>
      {/* Content */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-10 max-w-5xl mx-auto">
        {/* CAMERA PANE */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-4 bg-white rounded-3xl border border-gray-300 shadow-md">
          <div className="relative w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black">
            {!stream && !cameraPreview && (
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-3 w-full h-full text-white bg-black hover:bg-teal-600 transition-colors rounded-xl font-semibold text-lg select-none"
              >
                <Camera className="w-6 h-6" />
                Take Photo
              </button>
            )}

            {stream && !cameraPreview && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}

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
            <div className="mt-6 flex flex-wrap justify-center gap-4 w-full">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-black rounded-full px-5 py-3 text-black bg-white font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 transition w-full max-w-xs"
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
                className="flex items-center justify-center p-3 rounded-full bg-black hover:bg-teal-600 transition-colors text-white shadow-md"
                title="Capture Photo"
              >
                <img src="/camera.png" alt="Capture" className="w-7 h-7" />
              </button>

              <button
                onClick={() => handleDone("camera")}
                disabled={!cameraPreview}
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                Done
              </button>

              <button
                onClick={() => setCameraPreview(null)}
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
              >
                Redo
              </button>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="hidden lg:block mx-6 h-96 border-l border-gray-300" />
        <div className="block lg:hidden w-3/4 border-t border-gray-300 my-8" />

        {/* UPLOAD PANE */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-4 bg-white rounded-3xl border border-gray-300 shadow-md">
          <div className="w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black flex items-center justify-center">
            {!uploadPreview ? (
              <label className="flex items-center justify-center gap-3 w-full h-full text-white bg-black hover:bg-teal-600 transition-colors rounded-xl cursor-pointer font-semibold text-lg select-none">
                <Upload className="w-6 h-6" />
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
            <div className="mt-6 flex flex-wrap justify-center gap-4 w-full">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-black rounded-full px-5 py-3 text-black bg-white font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 transition w-full max-w-xs"
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
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
              >
                Done
              </button>

              <button
                onClick={() => setUploadPreview(null)}
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
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
