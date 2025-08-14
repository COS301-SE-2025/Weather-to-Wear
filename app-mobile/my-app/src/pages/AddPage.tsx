import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";
import { Camera, Upload, Loader } from "lucide-react";
import { fetchWithAuth } from "../services/fetchWithAuth";
import { useUploadQueue } from "../context/UploadQueueContext";
import { API_BASE } from '../config';



interface BatchUploadItem {
  id: string;
  file: File;
  previewUrl: string;

  layerCategory: string;
  category: string;
  style: string;
  material: string;
  warmthFactor: number;
  waterproof: boolean;
  colorHex: string;
}


const LAYER_OPTIONS = [
  { value: "", label: "Select Layer" },
  { value: "base_top", label: "Base Top" },
  { value: "base_bottom", label: "Base Bottom" },
  { value: "mid_top", label: "Mid Top" },
  { value: "outerwear", label: "Outerwear" },
  { value: "footwear", label: "Footwear" },
  { value: "headwear", label: "Headwear" },
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

const MATERIAL_OPTIONS = [
  { value: "", label: "Select Material" },
  { value: "Cotton", label: "Cotton" },
  { value: "Wool", label: "Wool" },
  { value: "Polyester", label: "Polyester" },
  { value: "Leather", label: "Leather" },
  { value: "Nylon", label: "Nylon" },
  { value: "Fleece", label: "Fleece" },
];

const COLOR_PALETTE = [
  { hex: "#E53935", label: "Red" },
  { hex: "#8E24AA", label: "Purple" },
  { hex: "#3949AB", label: "Blue" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#43A047", label: "Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#F4511E", label: "Orange" },
  { hex: "#6D4C41", label: "Brown" },
  { hex: "#757575", label: "Grey" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#000000", label: "Black" },
  { hex: "#FFFDD0", label: "Cream" },
  // more colours to be added
];

const AddPage: React.FC = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSuccessBatch, setShowSuccessBatch] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [layerCategory, setLayerCategory] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const [style, setStyle] = useState("");
  const [material, setMaterial] = useState("");
  const [warmthFactor, setWarmthFactor] = useState<number | "">("");
  const [waterproof, setWaterproof] = useState(false);
  const [color, setColor] = useState("");


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);


  const [batchItems, setBatchItems] = useState<BatchUploadItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);


  const { addToQueue, queueLength, isProcessing, progressPercent } = useUploadQueue();

  // const [uploadQueue, setUploadQueue] = useState<FormData[]>([]);
  // const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  // const [queueProgress, setQueueProgress] = useState(0);
  const [showQueueToast, setShowQueueToast] = useState(false);
  // const [totalItemsToProcess, setTotalItemsToProcess] = useState(0);
  // const [processedItems, setProcessedItems] = useState(0);
  // percentage calculation
  // const progressPercent = totalItemsToProcess > 0
  //   ? Math.round((processedItems / totalItemsToProcess) * 100)
  //   : 0;

  const [ellipsis, setEllipsis] = useState("");

  const { justFinished, resetJustFinished } = useUploadQueue();

  useEffect(() => {
    if (justFinished) {
      setShowSuccess(true);
      resetJustFinished();
    }
  }, [justFinished]);


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


  // draft persistence
  useEffect(() => {
    const state = {
      layerCategory,
      category,
      style,
      material,
      warmthFactor,
      waterproof,
      color,
      cameraPreview,
      uploadPreview,
    };
    localStorage.setItem("addPageDraft", JSON.stringify(state));
  }, [layerCategory, category, style, material, warmthFactor, waterproof, color, cameraPreview, uploadPreview]);

  useEffect(() => {
    const saved = localStorage.getItem("addPageDraft");
    if (saved) {
      const {
        layerCategory,
        category,
        style,
        material,
        warmthFactor,
        waterproof,
        color,
        cameraPreview,
        uploadPreview,
      } = JSON.parse(saved);

      setLayerCategory(layerCategory);
      setCategory(category);
      setStyle(style);
      setMaterial(material);
      setWarmthFactor(warmthFactor);
      setWaterproof(waterproof);
      setColor(color);
      setCameraPreview(cameraPreview);
      setUploadPreview(uploadPreview);
    }
  }, []);


  useEffect(() => {
    if (batchItems.length > 0) {
      const metaOnly = batchItems.map(({ id, previewUrl, ...meta }) => ({
        id,
        previewUrl,
        ...meta,
      }));
      localStorage.setItem("batchDraft", JSON.stringify(metaOnly));
    }
  }, [batchItems]);

  useEffect(() => {
    const savedBatch = localStorage.getItem("batchDraft");
    if (savedBatch) {
      const metaOnly = JSON.parse(savedBatch);
      setBatchItems(metaOnly); // will show previews and metadata, just no `file` field
      setCurrentIndex(0);
    }
  }, []);


  useEffect(() => {
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3
      setEllipsis(".".repeat(dotCount));
    }, 500); // every 0.5s

    return () => clearInterval(interval);
  }, []);


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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // flip horizontally:
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // draw the (now un-mirrored) frame:
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // restore normal state
    ctx.restore();

    setCameraPreview(canvas.toDataURL());
  };

  const handleLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayerCategory(e.target.value);
    setCategory("");
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

    const blob = await (await fetchWithAuth(finalImg)).blob();
    const formData = new FormData();
    formData.append("image", blob, "upload.png");
    formData.append("layerCategory", layerCategory);
    formData.append("category", category);
    if (style) formData.append("style", style);
    if (material) formData.append("material", material);
    if (warmthFactor !== "") formData.append("warmthFactor", warmthFactor.toString());
    formData.append("waterproof", waterproof.toString());
    if (color) formData.append("colorHex", color);

    // setUploadQueue(prev => [...prev, formData]);
    // setTotalItemsToProcess(prev => prev + 1);
    addToQueue(formData);
    setShowQueueToast(true);

    localStorage.removeItem("addPageDraft");
    localStorage.removeItem("batchDraft");

    // Reset form visuals
    setUploadPreview(null);
    setCameraPreview(null);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);

    setTimeout(() => setShowQueueToast(false), 3000);
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12 -mt-10">
      {/* Header */}
      <div
        className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-48 mb-6"
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
                style={{ transform: "scaleX(-1)" }}
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

              <div className="flex gap-4 w-full max-w-xs">
                {/* Style */}
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-1/2 border border-black dark:border-gray-600 rounded-full px-4 py-3 text-sm text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 transition"
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Material */}
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-1/2 border border-black dark:border-gray-600 rounded-full px-4 py-3 text-sm text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 transition"
                >
                  {MATERIAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full max-w-xs flex flex-col items-start">
                <label className="font-semibold text-black dark:text-gray-200 mb-1">
                  Warmth Factor: {warmthFactor}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={warmthFactor}
                  onChange={(e) => setWarmthFactor(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                />
              </div>


              <div className="flex gap-4 w-full max-w-xs items-center">
                {/* Waterproof */}
                <div className="flex items-center gap-2 w-1/2">
                  <input
                    type="checkbox"
                    checked={waterproof}
                    onChange={(e) => setWaterproof(e.target.checked)}
                    className="form-checkbox text-teal-600"
                  />
                  <label className="text-sm text-black dark:text-gray-200 font-semibold">
                    Waterproof
                  </label>
                </div>

              </div>


              <div className="flex justify-center gap-4 w-full">
                <button
                  onClick={() => setCameraPreview(null)}
                  className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
                >
                  Redo
                </button>

                <button
                  onClick={() => handleDone("camera")}
                  disabled={!cameraPreview}
                  className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  Done
                </button>

                <button
                  onClick={capturePhoto}
                  className="flex items-center justify-center px-4 py-3 rounded-full bg-black hover:bg-teal-600 transition-colors text-white font-semibold shadow-md"
                  title="Capture Photo"
                >
                  <img src="/camera.png" alt="Capture" className="w-5 h-5 mr-2" />
                  Take
                </button>
              </div>

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

              <div className="flex gap-4 w-full max-w-xs">
                {/* Style */}
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-1/2 border border-black dark:border-gray-600 rounded-full px-4 py-3 text-sm text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 transition"
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Material */}
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-1/2 border border-black dark:border-gray-600 rounded-full px-4 py-3 text-sm text-black dark:text-gray-200 bg-white dark:bg-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 transition"
                >
                  {MATERIAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full max-w-xs flex flex-col items-start">
                <label className=" font-semibold text-black dark:text-gray-200 mb-1">
                  Warmth Factor: {warmthFactor}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={warmthFactor}
                  onChange={(e) => setWarmthFactor(Number(e.target.value))}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                />
              </div>

              <div className="flex gap-4 w-full max-w-xs items-center">
                {/* Waterproof */}
                <div className="flex items-center gap-2 w-1/2">
                  <input
                    type="checkbox"
                    checked={waterproof}
                    onChange={(e) => setWaterproof(e.target.checked)}
                    className="form-checkbox text-teal-600"
                  />
                  <label className="text-sm text-black dark:text-gray-200 font-semibold">
                    Waterproof
                  </label>
                </div>     
              </div>

              <button
                onClick={() => setUploadPreview(null)}
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
              >
                Redo
              </button>

              <button
                onClick={() => handleDone("upload")}
                className="px-8 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
              >
                Done
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:block mx-6 h-96 border-l border-gray-300 dark:border-gray-700" />
        <div className="block lg:hidden w-3/4 border-t border-gray-300 dark:border-gray-700 my-8" />

        {/* BATCH UPLOAD PANEL */}
        <div className="flex flex-col items-center w-full lg:w-1/2 p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-300 dark:border-gray-700 shadow-md">
          <div className="relative w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black mb-4">
            <label className="flex items-center justify-center gap-3 w-full h-full text-white bg-black hover:bg-teal-600 transition-colors rounded-xl cursor-pointer font-semibold text-lg select-none">
              <Upload className="w-6 h-6" />
              Upload batch
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const newItems = files.map((file) => {
                    const id = crypto.randomUUID();
                    return {
                      id,
                      file,
                      previewUrl: URL.createObjectURL(file),
                      layerCategory: "",
                      category: "",
                      style: "",
                      material: "",
                      warmthFactor: 1,
                      waterproof: false,
                      colorHex: "",
                    };
                  });
                  setBatchItems(newItems);
                  setCurrentIndex(0);
                }}
              />
            </label>
          </div>

          {batchItems.length > 0 && (
            <>
              <div className="w-full max-w-md mb-4">
                <img src={batchItems[currentIndex].previewUrl} alt="Preview" className="w-full h-64 object-cover rounded-xl border mb-4" />

                <div className="grid grid-cols-2 gap-4">
                  <select value={batchItems[currentIndex].layerCategory} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[currentIndex].layerCategory = val;
                      updated[currentIndex].category = "";
                      return updated;
                    });
                  }} className="input">
                    {LAYER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={batchItems[currentIndex].category} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[currentIndex].category = val;
                      return updated;
                    });
                  }} disabled={!batchItems[currentIndex].layerCategory} className="input">
                    <option value="">Select Category</option>
                    {(CATEGORY_BY_LAYER[batchItems[currentIndex].layerCategory] || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={batchItems[currentIndex].style} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[currentIndex].style = val;
                      return updated;
                    });
                  }} className="input">
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={batchItems[currentIndex].material} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[currentIndex].material = val;
                      return updated;
                    });
                  }} className="input">
                    {MATERIAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-black dark:text-gray-100">Warmth: {batchItems[currentIndex].warmthFactor}</label>
                    <input type="range" min={1} max={10} value={batchItems[currentIndex].warmthFactor}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBatchItems(items => {
                          const updated = [...items];
                          updated[currentIndex].warmthFactor = val;
                          return updated;
                        });
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchItems[currentIndex].waterproof}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setBatchItems(items => {
                          const updated = [...items];
                          updated[currentIndex].waterproof = val;
                          return updated;
                        });
                      }}
                    />
                    <label className="text-sm font-semibold">Waterproof</label>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col items-center justify-center w-full max-w-md mb-4 gap-2">
                {/* Buttons */}
                <div className="flex items-center justify-between w-full">
                  <button
                    className="text-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full border border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    onClick={() => setCurrentIndex(i => i - 1)}
                    disabled={currentIndex === 0}
                  >
                    ◀ Prev
                  </button>

                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Image {currentIndex + 1} of {batchItems.length}
                  </span>

                  <button
                    className="text-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full border border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    onClick={() => setCurrentIndex(i => i + 1)}
                    disabled={currentIndex === batchItems.length - 1}
                  >
                    Next ▶
                  </button>
                </div>

                <div className="w-1/2 h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${((currentIndex + 1) / batchItems.length) * 100}%`,
                      backgroundColor: "teal"
                    }}
                  ></div>
                </div>
              </div>

              <button
                className="mt-2 px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
                onClick={async () => {
                  const formData = new FormData();
                  const itemsMeta = batchItems.map(item => ({
                    filename: item.id,
                    category: item.category,
                    layerCategory: item.layerCategory,
                    style: item.style,
                    material: item.material,
                    warmthFactor: item.warmthFactor,
                    waterproof: item.waterproof,
                    colorHex: item.colorHex,
                  }));
                  formData.append("items", JSON.stringify(itemsMeta));
                  batchItems.forEach(item => {
                    formData.append(item.id, item.file);
                  });

                  const token = localStorage.getItem("token");
                  try {
                    console.log("Uploading batch items:", batchItems);
                    console.log("Sending metadata:", JSON.stringify(itemsMeta));

                    const res = await fetchWithAuth(`${API_BASE}/api/closet/upload/batch`, {
                      method: "POST",
                      body: formData,
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });

                    if (!res.ok) {
                      const errorText = await res.text();
                      console.error("Upload failed. Server responded with:", res.status, errorText);
                      throw new Error(`Upload failed: ${res.status} ${errorText}`);
                    }

                    setShowSuccessBatch(true);
                    setBatchItems([]);
                  } catch (err) {
                    console.error(err);
                    alert("Upload failed");
                  }
                }}
              >
                Submit All
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem("addPageDraft");
                  localStorage.removeItem("batchDraft");
                  window.location.reload();
                }}
                className="mt-2 text-sm text-gray-500 hover:text-teal-600 transition-colors underline font-medium"
              >
                Clear Draft
              </button>
            </>
          )}
        </div>

      </div>

      {queueLength > 0 && (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-200"
              />

              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="100"
                strokeDashoffset={`${100 - progressPercent}`}
                className="text-teal-500 transition-all duration-700 ease-out"
                transform="rotate(-90 18 18)"  // <- rotate to start from top
              />
            </svg>


            {/* Centered percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                {progressPercent}%
              </span>
            </div>
          </div>

          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1 font-mono">
            Uploading<span className="inline-block w-4">{ellipsis}</span>
          </span>
        </div>
      )}

      {showQueueToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-6 py-3 rounded-full shadow-lg z-50">
          Item added to queue
        </div>
      )}


      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <Loader className="w-16 h-16 animate-spin text-teal-600" />
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              🎉 Success! 🎉
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Items added successfully.
            </p>
            <button
              // onClick={() => navigate("/closet")}
              onClick={() => { setShowSuccess(false) }}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}


      {
        showSuccessBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                🎉 Success! 🎉
              </h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Batch Uploaded successfully.
              </p>
              <button
                // onClick={() => navigate("/closet")}
                onClick={() => { setShowSuccessBatch(false) }}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
              >
                OK
              </button>
            </div>
          </div>
        )
      }

    </div>
  );
};

export default AddPage;


