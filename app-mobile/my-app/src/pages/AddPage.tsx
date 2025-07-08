import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";
import { Camera, Upload, Loader } from "lucide-react";



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

    const blob = await (await fetch(finalImg)).blob();
    const formData = new FormData();
    formData.append("image", blob, "upload.png");
    formData.append("layerCategory", layerCategory);
    formData.append("category", category);
    setIsLoading(true);

    if (style) formData.append("style", style);
    if (material) formData.append("material", material);
    if (warmthFactor !== "")
      formData.append("warmthFactor", warmthFactor.toString());
    formData.append("waterproof", waterproof.toString());
    if (color) formData.append("colorHex", color);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        "http://localhost:5001/api/closet/upload",
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      stream?.getTracks().forEach((t) => t.stop());
      setShowSuccess(true);

    } catch (error) {
      console.error("Error uploading image:", error);
      alert("There was an error uploading your item. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12">
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

                {/* Color */}
                <div className="flex flex-wrap gap-1 w-1/2">
                  {COLOR_PALETTE.map(({ hex, label }) => (
                    <button
                      key={hex}
                      title={label}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition
                      ${color === hex ? "border-teal-500 scale-110 shadow-lg" : "border-gray-300"}
                    `}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColor(hex)}
                    />
                  ))}

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

                {/* Color */}
                <div className="flex flex-wrap gap-1 w-1/2">
                  {COLOR_PALETTE.map(({ hex, label }) => (
                    <button
                      key={hex}
                      title={label}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition
                            ${color === hex ? "border-teal-500 scale-110 shadow-lg" : "border-gray-300"}
                          `}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColor(hex)}
                    />
                  ))}
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
          <div className="relative w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black">
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
                  setBatchItems((prev) => [...prev, ...newItems]);
                }}
              />
            </label>
          </div>

          <div className="overflow-y-auto max-h-[500px] w-full">
            {batchItems.map((item, index) => (
              <div key={item.id} className="border rounded-xl p-4 mb-4 bg-white dark:bg-gray-800 shadow-md">
                <img src={item.previewUrl} alt="Preview" className="w-full h-36 object-cover rounded mb-2 border" />

                <div className="grid grid-cols-2 gap-4">
                  <select value={item.layerCategory} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[index].layerCategory = val;
                      updated[index].category = "";
                      return updated;
                    });
                  }} className="input">
                    {LAYER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={item.category} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[index].category = val;
                      return updated;
                    });
                  }} disabled={!item.layerCategory} className="input">
                    <option value="">Select Category</option>
                    {(CATEGORY_BY_LAYER[item.layerCategory] || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={item.style} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[index].style = val;
                      return updated;
                    });
                  }} className="input">
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <select value={item.material} onChange={(e) => {
                    const val = e.target.value;
                    setBatchItems(items => {
                      const updated = [...items];
                      updated[index].material = val;
                      return updated;
                    });
                  }} className="input">
                    {MATERIAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <div className="col-span-2">
                    <label className="text-sm font-medium text-black dark:text-gray-100">Warmth: {item.warmthFactor}</label>
                    <input type="range" min={1} max={10} value={item.warmthFactor}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBatchItems(items => {
                          const updated = [...items];
                          updated[index].warmthFactor = val;
                          return updated;
                        });
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.waterproof}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setBatchItems(items => {
                          const updated = [...items];
                          updated[index].waterproof = val;
                          return updated;
                        });
                      }}
                    />
                    <label className="text-sm font-semibold">Waterproof</label>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {COLOR_PALETTE.map(({ hex, label }) => (
                      <button
                        key={hex}
                        title={label}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${item.colorHex === hex ? "border-teal-500 scale-110 shadow" : "border-gray-300"}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => {
                          setBatchItems(items => {
                            const updated = [...items];
                            updated[index].colorHex = hex;
                            return updated;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {batchItems.length > 0 && (
            <button
              className="mt-4 px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
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
                  // debug code: 
                  console.log("Uploading batch items:", batchItems);
                  console.log("Sending metadata:", JSON.stringify(itemsMeta));

                  const res = await fetch("http://localhost:5001/api/closet/upload/batch", {
                    method: "POST",
                    body: formData,
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  // more debug code:
                  if (!res.ok) {
                    const errorText = await res.text();
                    console.error("Upload failed. Server responded with:", res.status, errorText);
                    throw new Error(`Upload failed: ${res.status} ${errorText}`);
                  }
                  alert("Batch uploaded!");
                  setBatchItems([]);
                } catch (err) {
                  console.error(err);
                  alert("Upload failed");
                }
              }}
            >
              Submit All
            </button>
          )}
        </div>

      </div>

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
              Item added successfully.
            </p>
            <button
              onClick={() => navigate("/closet")}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddPage;