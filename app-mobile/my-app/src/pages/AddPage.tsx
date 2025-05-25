// src/pages/AddPage.tsx

import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";

const AddPage: React.FC = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Bind stream to the video element whenever stream starts
  // or whenever we clear a preview (redo) so the <video> remount
  // picks up the stream again.
  useEffect(() => {
    if (stream && videoRef.current && !cameraPreview) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true; // allow autoplay
      video
        .play()
        .catch(() => {
          /* ignore autoplay errors */
        });
    }
  }, [stream, cameraPreview]);

  // Start camera on "Take Photo"
  const startCamera = async () => {
    if (stream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      console.error("camera error", err);
    }
  };

  // Capture a frame to canvas & set preview
  const capturePhoto = () => {
    if (!stream || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setCameraPreview(canvas.toDataURL());
  };

  // Finalize image and navigate
  const handleDone = (type: "camera" | "upload") => {
    const finalImg = type === "camera" ? cameraPreview : uploadPreview;
    if (!finalImg) return;
    // stop the camera tracks now that we're done
    stream?.getTracks().forEach((t) => t.stop());
    setImage(finalImg);
    navigate("/add-item");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-center">Add Item</h1>

      <div className="mt-8 flex flex-col lg:flex-row items-center justify-center">
        {/* ── CAMERA PANE ────────────────────────────────────────── */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-4">
          <div className="bg-gray-200 rounded-2xl w-64 h-64 flex items-center justify-center overflow-hidden relative">
            {/* 1) initial Take Photo button */}
            {!stream && !cameraPreview && (
              <button
                onClick={startCamera}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2"
              >
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
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={capturePhoto}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full p-2"
              >
                <img src="/camera.png" alt="Capture" className="w-6 h-6" />
              </button>

              <button
                onClick={() => handleDone("camera")}
                disabled={!cameraPreview}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2 disabled:opacity-50"
              >
                Done
              </button>

              <button
                onClick={() => setCameraPreview(null)}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2"
              >
                Redo
              </button>
            </div>
          )}
        </div>

        {/* ── DIVIDER ────────────────────────────────────────────── */}
        <div className="hidden lg:block mx-8 h-80 border-l border-gray-300" />
        <hr className="block lg:hidden w-full my-8 border-gray-300" />

        {/* ── UPLOAD PANE ────────────────────────────────────────── */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-4">
          <div className="bg-gray-200 rounded-2xl w-64 h-64 flex items-center justify-center overflow-hidden">
            {!uploadPreview ? (
              <label className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2 cursor-pointer">
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
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={() => handleDone("upload")}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2"
              >
                Done
              </button>
              <button
                onClick={() => setUploadPreview(null)}
                className="bg-black text-white hover:bg-[#304946] transition-colors rounded-full px-6 py-2"
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
