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
import { fetchWeather, geocodeCity } from "../services/weatherApi";

const formatNsfwLabel = (raw?: string) => {
  const key = (raw || "").toLowerCase();
  const map: Record<string, string> = {
    explicit: "explicit content",
    suggestive: "suggestive content",
    offensive_any: "offensive content",
    explicit_image: "explicit content",
    sexual: "sexual content",
    insulting: "insulting language",
    toxic: "toxic language",
    discriminatory: "discriminatory language",
    violent: "violent content",
    hasprofanity: "profanity",
    profanity: "profanity",
    profanity_text: "profanity",
    nsfw: "inappropriate content",
  };
  return map[key] || key || "inappropriate content";
};

const mapWeatherCondition = (apiCondition: string): string => {
  const cond = apiCondition.toLowerCase();
  if (cond.includes("clear") || cond.includes("sunny")) return "Sunny";
  if (cond.includes("cloud") || cond.includes("overcast")) return "Cloudy";
  if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower")) return "Rainy";
  if (cond.includes("snow") || cond.includes("sleet")) return "Snowy";
  if (cond.includes("wind") || cond.includes("storm") || cond.includes("thunderstorm")) return "Windy";
  if (cond.includes("fog")) return "Cloudy";
  return "Cloudy"; // default fallback
};

const PostToFeed = () => {
  const { image: uploadedImage, setImage } = useImage();
  const [content, setContent] = useState("");
  const [image, setLocalImage] = useState<string | null>(null);
  const [location, setLocation] = useState<string>(
    localStorage.getItem("selectedCity") || ""
  );
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [showWeatherDropdown, setShowWeatherDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<
    Array<{ label: string; city: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [showCameraPopup, setShowCameraPopup] = useState(false);

  const [showClothingPicker, setShowClothingPicker] = useState(false);
  const [selectedClothingItems, setSelectedClothingItems] = useState<{
    id: string;
    name: string;
    category: string;
    layerCategory: string;
    imageUrl?: string;
  }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();
  const [nsfwPostNotice, setNsfwPostNotice] =
    useState<{ displayLabel: string; score: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const weatherOptions = [
    { value: "Sunny", icon: <Sun className="w-5 h-5" /> },
    { value: "Cloudy", icon: <Cloud className="w-5 h-5" /> },
    { value: "Rainy", icon: <CloudRain className="w-5 h-5" /> },
    { value: "Snowy", icon: <CloudSnow className="w-5 h-5" /> },
    { value: "Windy", icon: <Wind className="w-5 h-5" /> },
  ];

  // Fetch user's location and weather on mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      setIsFetchingLocation(true);
      let loc = localStorage.getItem("selectedCity") || "";
      let storedWeather = localStorage.getItem("selectedWeather");
      try {
        if (storedWeather) {
          const parsedWeather = JSON.parse(storedWeather);
          if (parsedWeather.location === loc) {
            setWeather(parsedWeather.weather);
            setIsFetchingLocation(false);
            return;
          }
        }

        if (!loc) {
          const weatherData = await fetchWeather("");
          loc = weatherData.location !== "Pretoria" ? weatherData.location : "";
          setLocation(loc);
          localStorage.setItem("selectedCity", loc);
        }
        if (loc) {
          await fetchWeatherForLocation(loc);
        }
      } catch (err) {
        console.error("Failed to fetch location or weather:", err);
        // Do not set error in UI
      } finally {
        setIsFetchingLocation(false);
      }
    };

    fetchUserLocation();
  }, []);

  // Fetch city suggestions on location input change
  useEffect(() => {
    const q = location.trim();
    if (!q || q.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const suggestions = await geocodeCity(q, 6);
        setCitySuggestions(suggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Failed to fetch city suggestions:", err);
        // Do not set error in UI
      }
    }, 350);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [location]);

  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (suggestionsBoxRef.current && !suggestionsBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setCitySuggestions([]);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch weather for a given location silently
  const fetchWeatherForLocation = async (loc: string) => {
    setIsFetchingWeather(true);
    try {
      const weatherData = await fetchWeather(loc);
      let newWeather = null;
      if (weatherData.summary) {
        const condition = mapWeatherCondition(weatherData.summary.mainCondition);
        newWeather = {
          temp: weatherData.summary.avgTemp,
          condition,
        };
        setWeather(newWeather);
        localStorage.setItem("selectedWeather", JSON.stringify({ location: loc, weather: newWeather }));
      } else {
        setWeather({ temp: 20, condition: "Cloudy" });
      }
    } catch (err) {
      console.error("Failed to fetch weather for location:", err);
      setWeather({ temp: 20, condition: "Cloudy" });
    } finally {
      setIsFetchingWeather(false);
    }
  };

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
    setLocation(localStorage.getItem("selectedCity") || "");
    setWeather(null);
    setSelectedClothingItems([]);
    setCitySuggestions([]);
    setShowSuggestions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setError(null);
    // Refetch weather for reset location
    const loc = localStorage.getItem("selectedCity") || "";
    if (loc) {
      fetchWeatherForLocation(loc);
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

      navigate("/feed", { state: { postSuccess: true } });
    } catch (err: any) {
      const data = err?.data || err?.response?.data;

      if (data?.error === "NSFW_BLOCKED") {
        handleReset();
        const scores = (data?.scores ?? {}) as Record<string, number>;
        const entries = Object.entries(scores).filter(([, v]) => typeof v === "number");

        let rawLabel = data?.label || "nsfw";
        let topScore = 0;

        if (entries.length) {
          const [k, v] = entries.reduce((a, b) => (Number(b[1]) > Number(a[1]) ? b : a));
          rawLabel = k;
          topScore = Number(v);
        }

        setNsfwPostNotice({
          displayLabel: formatNsfwLabel(rawLabel),
          score: topScore,
        });
        return;
      }

      console.error("Failed to create post:", err);
      setError("Failed to share post.");
    }
  };

  const handleWeatherSelect = (value: string) => {
    setWeather(value ? { temp: weather?.temp || 20, condition: value } : null);
    setShowWeatherDropdown(false);
  };

  const handleCitySelect = (city: string) => {
    setLocation(city);
    localStorage.setItem("selectedCity", city);
    setShowSuggestions(false);
    setCitySuggestions([]);
    fetchWeatherForLocation(city);
  };

  const canSubmit = Boolean(
    (content && content.trim().length > 0) || uploadedImage || image
  );

  return (
    <div
      className="ml-[calc(-50vw+50%)] flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0"
      style={{ paddingTop: 0 }}
    >
      {/* Header Image Section */}
      <div className="relative w-full h-32 sm:h-56 md:h-64 lg:h-48 mb-6 mt-0 !mt-0">
        <div
          className="absolute inset-0 bg-cover bg-top md:bg-center"
          style={{ backgroundImage: `url(/postheader1.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex h-full items-center justify-center px-0">
          <div className="px-6 py-2 border-2 border-white">
            <h1 className="text-2xl font-bodoni font-light text-center text-white">
              MAKE A POST
            </h1>
          </div>
        </div>
      </div>
      <div className="px-3 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+90px)] md:pb-10 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="mt-3 flex flex-col items-center gap-3">
                  <div className="flex w-full justify-center gap-2">
                    <label className="cursor-pointer">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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
                <div className="sm:col-span-2 relative">
                  <label className="block font-livvic text-sm text-gray-700 dark:text-gray-200 mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      id="location"
                      type="text"
                      placeholder={isFetchingLocation ? "Detecting location..." : "Enter your location"}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setCitySuggestions([]);
                          setShowSuggestions(false);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                      aria-autocomplete="list"
                      aria-controls="city-suggestions"
                      aria-expanded={showSuggestions}
                      role="combobox"
                    />
                    {isFetchingLocation && (
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-5 w-5 text-gray-400"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    )}
                  </div>
                  {showSuggestions && citySuggestions.length > 0 && (
                    <div
                      id="city-suggestions"
                      ref={suggestionsBoxRef}
                      className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto"
                      role="listbox"
                    >
                      {citySuggestions.map((opt, index) => (
                        <button
                          key={`${opt.city}-${index}`}
                          type="button"
                          onClick={() => handleCitySelect(opt.city)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          role="option"
                          aria-selected={false}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-livvic text-sm text-gray-700 dark:text-gray-200 mb-1">Weather</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWeatherDropdown((s) => !s)}
                      className="w-full px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                      aria-label="Select weather condition"
                      aria-expanded={showWeatherDropdown}
                    >
                      <span className="flex items-center">
                        {isFetchingWeather ? (
                          <svg
                            className="animate-spin h-5 w-5 text-gray-400"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : weather ? (
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

              <div>
                <label className="block text-center font-livvic text-sm text-gray-700 dark:text-gray-200 mb-3">
                  Tag Clothing Items
                </label>

                {selectedClothingItems.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-3 justify-center items-center">
                      {selectedClothingItems.map((item) => (
                        item.imageUrl ? (
                          <img
                            key={item.id}
                            src={item.imageUrl}
                            alt={item.name}
                            title={`${item.layerCategory.replace('_', ' ')}: ${item.name}`}
                            className="w-16 h-16 object-contain rounded-md border border-gray-200 dark:border-gray-700 bg-white"
                          />
                        ) : (
                          <span
                            key={item.id}
                            className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#e5f6f4] dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 text-sm font-medium shadow-sm"
                            title={`${item.layerCategory}: ${item.name}`}
                          >
                            {item.name}
                            <span className="ml-1 text-xs opacity-75">({item.layerCategory.replace('_', ' ')})</span>
                          </span>
                        )
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
                  disabled={!canSubmit || isFetchingLocation}
                >
                  Share Post
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

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

      {showClothingPicker && (
        <PostClothingPicker
          visible={showClothingPicker}
          selectedItemIds={selectedClothingItems.map(item => item.id)}
          onClose={() => setShowClothingPicker(false)}
          onConfirm={(items) => {
            setSelectedClothingItems(items.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              layerCategory: item.layerCategory,
              imageUrl: (item?.imageUrl ?? item?.image ?? item?.thumbnailUrl) as string | undefined,
            })));
          }}
        />
      )}
      {nsfwPostNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <button
              type="button"
              onClick={() => setNsfwPostNotice(null)}
              className="absolute top-3 right-3 text-2xl leading-none text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
              aria-label="Close"
            >
              ×
            </button>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Post Blocked
              </h3>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                Your post was blocked due to{" "}
                <span className="font-medium">{nsfwPostNotice.displayLabel}</span>
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNsfwPostNotice(null)}
                  className="px-4 py-2 rounded-full bg-[#3F978F] text-white hover:opacity-95"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostToFeed;