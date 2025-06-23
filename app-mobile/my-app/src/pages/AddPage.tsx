// src/pages/AddPage.tsx

import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";
import { Camera, Upload } from "lucide-react";

const LAYER_OPTIONS = [
  { value: "", label: "Select Layer" },
  { value: "base_top", label: "Base Top" },
  { value: "base_bottom", label: "Base Bottom" },
  { value: "mid_top", label: "Mid Top" },
  // { value: "mid_bottom", label: "Mid Bottom" },
  { value: "outerwear", label: "Outerwear" },
  { value: "footwear", label: "Footwear" },
  { value: "headwear", label: "Headwear" },
  // { value: "accessory", label: "Accessory" },
];

const CATEGORY_BY_LAYER: Record<string, { value: string; label: string }[]> = {
  base_top: [
    { value: "TSHIRT", label: "T-shirt" },
    { value: "LONGSLEEVE", label: "Long Sleeve" },
  ],
  base_bottom: [
    { value: "PANTS", label: "Pants" },
    { value: "JEANS", label: "Jeans" },
    { value: "SHORTS", label: "Shorts" },
  ],
  mid_top: [
    { value: "SWEATER", label: "Sweater" },
    { value: "HOODIE", label: "Hoodie" },
  ],
  outerwear: [
    { value: "COAT", label: "Coat" },
    { value: "BLAZER", label: "Blazer" },
    { value: "JACKET", label: "Jacket" },
    { value: "RAINCOAT", label: "Raincoat" },
  ],
  footwear: [
    { value: "SHOES", label: "Shoes" },
    { value: "BOOTS", label: "Boots" },
  ],
  headwear: [
    { value: "BEANIE", label: "Beanie" },
    { value: "HAT", label: "Hat" },
  ],
  // accessory: [
  //   { value: "SCARF", label: "Scarf" },
  //   { value: "GLOVES", label: "Gloves" },
  //   { value: "UMBRELLA", label: "Umbrella" },
  // ],
  // mid_bottom: [],
};

const STYLE_OPTIONS = [
  { value: "", label: "Select Style" },
  { value: "Formal", label: "Formal" },
  { value: "Casual", label: "Casual" },
  { value: "Athletic", label: "Athletic" },
  { value: "Party", label: "Party" },
  { value: "Business", label: "Business" },
  { value: "Outdoor", label: "Outdoor" },
];


const AddPage: React.FC = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();

  const [layerCategory, setLayerCategory] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const [style, setStyle] = useState("");

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

  // Layer stuff added here 
  const handleLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayerCategory(e.target.value);
    setCategory(""); // reset category when layer changes
  };

  const categoryOptions =
    layerCategory && CATEGORY_BY_LAYER[layerCategory]
      ? CATEGORY_BY_LAYER[layerCategory]
      : [];



  const handleDone = async (type: "camera" | "upload") => {
    const finalImg = type === "camera" ? cameraPreview : uploadPreview;
    if (!finalImg || !category || !layerCategory) {
      alert("Please select a layer, category, and take/upload an image.");
      return;
    }

    const blob = await (await fetch(finalImg)).blob();
    const formData = new FormData();
    formData.append("image", blob, "upload.png");
    formData.append("layerCategory", layerCategory);
    formData.append("category", category);

    if (style) formData.append("style", style);


    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5001/api/closet/upload",
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      stream?.getTracks().forEach((t) => t.stop());
      setImage(finalImg);
      navigate("/closet");
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  return (
  <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12">
    {/* Header */}
    <div
      className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-64 mb-6"
      style={{
        backgroundImage: `url(/background.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1,
        marginLeft: 'calc(-50vw + 50%)',
        width: '100vw',
        marginTop: '-4rem'
      }}
    >
      <div className="px-6 py-2 border-2 border-white z-10">
        <h1
          className="text-2xl font-bodoni font-light text-center text-white"
          style={{
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
      <div className="flex flex-col items-center w-full lg:w-1/2 p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-300 dark:border-gray-700 shadow-md">
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
            {/* Layer Category Dropdown */}
            <select
              value={layerCategory}
              onChange={handleLayerChange}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
            >
              {LAYER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
              disabled={!layerCategory}
            >
              <option value="">Select Category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Style */}
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
      <div className="hidden lg:block mx-6 h-96 border-l border-gray-300 dark:border-gray-700" />
      <div className="block lg:hidden w-3/4 border-t border-gray-300 dark:border-gray-700 my-8" />

      {/* UPLOAD PANE */}
      <div className="flex flex-col items-center w-full lg:w-1/2 p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-300 dark:border-gray-700 shadow-md">
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
            {/* Layer Category Dropdown */}
            <select
              value={layerCategory}
              onChange={handleLayerChange}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
            >
              {LAYER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
              disabled={!layerCategory}
            >
              <option value="">Select Category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Style */}
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="border border-black dark:border-gray-600 rounded-full px-5 py-3 text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-400 dark:focus:ring-teal-500 transition w-full max-w-xs"
            >
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
