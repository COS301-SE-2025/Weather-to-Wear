import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  Check,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  ChevronDown,
  Shirt,
} from "lucide-react";
import { useImage } from "../components/ImageContext";
import { createPost } from "../services/socialApi";
import PostClothingPicker from "../components/PostClothingPicker";

const PostToFeed = () => {
  const { image: uploadedImage, setImage } = useImage();
  const [content, setContent] = useState("");
  const [image, setLocalImage] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("");
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [showWeatherDropdown, setShowWeatherDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [showCameraPopup, setShowCameraPopup] = useState(false);

  // Clothing picker state
  const [showClothingPicker, setShowClothingPicker] = useState(false);
  const [selectedClothingItems, setSelectedClothingItems] = useState<{
    id: string;
    name: string;
    category: string;
    layerCategory: string;
  }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  // Camera stream lifecycle
  useEffect(() => {
    if (stream && videoRef.current && !cameraPreview) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.play().catch(() => setError("Failed to play camera feed."));
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };
  }, [stream, cameraPreview]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      setShowCameraPopup(true);
      setError(null);
    } catch (err) {
      setError("Failed to access camera. Please ensure camera permissions are granted.");
    }
  };

  const capturePhoto = () => {
    if (!stream || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/png");
    setCameraPreview(dataUrl);
    setLocalImage(dataUrl);
    setImage(dataUrl);
  };

  const redoPhoto = () => {
    setCameraPreview(null);
    setLocalImage(null);
    setImage(null);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setTimeout(() => startCamera(), 100);
  };

  const handleDone = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCameraPopup(false);
  };

  const handleReset = () => {
    setContent("");
    setLocalImage(null);
    setCameraPreview(null);
    setImage(null);
    setLocation("");
    setWeather(null);
    setSelectedClothingItems([]);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB");
        return;
      }
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        setError("Only PNG or JPEG images are allowed");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLocalImage(result);
        setImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let imageFile: File | undefined;
      if (uploadedImage || image) {
        imageFile = dataURLtoFile(uploadedImage || image || "", "post.png");
      }

      await createPost({
        caption: content.trim() || undefined,
        location: location || undefined,
        image: imageFile,
        weather: weather || undefined,
        closetItemIds: selectedClothingItems.length > 0 
          ? selectedClothingItems.map(item => item.id)
          : undefined,
      });

      navigate("/feed");
    } catch (err: any) {
      console.error("Failed to create post:", err);
      setError(err.message || "Failed to share post.");
    }
  };

  const weatherOptions = [
    { value: "Sunny", icon: <Sun className="w-5 h-5" /> },
    { value: "Cloudy", icon: <Cloud className="w-5 h-5" /> },
    { value: "Rainy", icon: <CloudRain className="w-5 h-5" /> },
    { value: "Snowy", icon: <CloudSnow className="w-5 h-5" /> },
    { value: "Windy", icon: <Wind className="w-5 h-5" /> },
  ];

  const handleWeatherSelect = (value: string) => {
    setWeather(value ? { temp: 20, condition: value } : null);
    setShowWeatherDropdown(false);
  };

  // Allow caption-only OR photo-only
  const canSubmit = Boolean(
    (content && content.trim().length > 0) || uploadedImage || image
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 -mt-12 md:mt-0">
      <div className="px-3 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+90px)] md:pb-10 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="flex justify-center pt-6">
            <h2 className="text-lg md:text-xl font-livvic border-2 border-black dark:border-gray-100 px-4 py-1 text-black dark:text-gray-100">
              Share Your Outfit
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-center font-livvic text-gray-700 dark:text-gray-200 text-base">
                  Add Photo
                </p>

                <div className="mt-3 flex flex-col items-center gap-3">
                  <div className="flex w-full justify-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      <span className="inline-flex items-center px-4 py-2 rounded-full bg-black text-white hover:bg-[#2F6F6A] transition-colors font-livvic text-sm">
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Photo
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center px-4 py-2 rounded-full bg-black text-white hover:bg-[#2F6F6A] transition-colors font-livvic text-sm"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Take Photo
                    </button>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  {(uploadedImage || image) && (
                    <div className="w-full max-w-sm rounded-xl overflow-hidden border-4 border-black bg-black">
                      <img
                        src={uploadedImage || image || ""}
                        alt="Selected or captured"
                        className="w-full h-[360px] object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-livvic text-sm text-gray-700 dark:text-gray-200 mb-1">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    placeholder="Enter your location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-livvic text-sm text-gray-700 dark:text-gray-200 mb-1">
                    Weather
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWeatherDropdown((s) => !s)}
                      className="w-full px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                    >
                      <span className="flex items-center">
                        {weather ? (
                          <>
                            {weatherOptions.find((opt) => opt.value === weather.condition)?.icon}
                            <span className="ml-2">{weather.condition}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Select weather</span>
                        )}
                      </span>
                      <ChevronDown className="w-5 h-5" />
                    </button>

                    {showWeatherDropdown && (
                      <div className="absolute right-0 z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleWeatherSelect("")}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Clear
                        </button>
                        {weatherOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleWeatherSelect(option.value)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center text-sm"
                          >
                            {option.icon}
                            <span className="ml-2">{option.value}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-center font-livvic text-sm text-gray-700 dark:text-gray-200 mb-1">
                  Caption your Outfit
                </label>
                <textarea
                  id="content"
                  placeholder="Tell everyone about your outfit, the weather, or your style inspiration..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[110px] p-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                />
              </div>

              {/* Clothing Items Section */}
              <div>
                <label className="block text-center font-livvic text-sm text-gray-700 dark:text-gray-200 mb-3">
                  Tag Clothing Items
                </label>
                
                {selectedClothingItems.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {selectedClothingItems.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#e5f6f4] dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 text-sm font-medium shadow-sm"
                          title={`${item.layerCategory}: ${item.name}`}
                        >
                          {item.name}
                          <span className="ml-1 text-xs opacity-75">({item.layerCategory.replace('_', ' ')})</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                      Selected from {selectedClothingItems.length > 1 ? 'multiple layers' : selectedClothingItems[0]?.layerCategory.replace('_', ' ')}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowClothingPicker(true)}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-700 border-2 border-[#3F978F] text-[#3F978F] hover:bg-[#3F978F] hover:text-white transition-colors font-livvic text-sm"
                  >
                    <Shirt className="h-5 w-5 mr-2" />
                    {selectedClothingItems.length > 0 
                      ? `Edit Tagged Items (${selectedClothingItems.length})` 
                      : "Tag Clothing Items"
                    }
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2 px-4 rounded-full border border-black dark:border-gray-100 text-black dark:text-gray-100 hover:bg-black hover:text-white transition-colors font-livvic"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-full bg-[#3F978F] hover:bg-[#2F6F6A] text-white transition-colors font-livvic disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canSubmit}
                >
                  Share Post
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Camera modal */}
      {showCameraPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-full rounded-xl overflow-hidden border-4 border-black bg-black mb-4">
              {stream && !cameraPreview && (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-[360px] object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              )}
              {cameraPreview && (
                <img src={cameraPreview} alt="Captured" className="w-full h-[360px] object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCameraPreview(null);
                  setLocalImage(null);
                  setImage(null);
                  if (stream) {
                    stream.getTracks().forEach((t) => t.stop());
                    setStream(null);
                  }
                  setShowCameraPopup(false);
                }}
                className="px-5 py-2 rounded-full border border-black text-black hover:bg-black hover:text-white transition-colors font-livvic"
              >
                Cancel
              </button>

              {stream && !cameraPreview && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2 rounded-full bg-black text-white hover:bg-[#2F6F6A] transition-colors font-livvic inline-flex items-center"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take
                </button>
              )}

              {cameraPreview && (
                <>
                  <button
                    type="button"
                    onClick={redoPhoto}
                    className="px-5 py-2 rounded-full border border-black text-black hover:bg-black hover:text-white transition-colors font-livvic"
                  >
                    Redo
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="px-5 py-2 rounded-full bg-[#3F978F] hover:bg-[#2F6F6A] text-white transition-colors font-livvic inline-flex items-center"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clothing picker modal */}
      {showClothingPicker && (
        <PostClothingPicker
          visible={showClothingPicker}
          selectedItemIds={selectedClothingItems.map(item => item.id)}
          onClose={() => setShowClothingPicker(false)}
          onConfirm={(items) => {
            setSelectedClothingItems(items.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category,
              layerCategory: item.layerCategory,
            })));
          }}
        />
      )}
    </div>
  );
};

export default PostToFeed;
