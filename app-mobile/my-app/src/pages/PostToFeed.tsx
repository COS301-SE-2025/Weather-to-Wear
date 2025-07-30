import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowLeft, Upload, Check, Sun, Cloud, CloudRain, CloudSnow, Wind, ChevronDown } from "lucide-react";
import { useImage } from "../components/ImageContext";
import { uploadPostImage, createPost } from "../services/socialApi";
import { fetchWithAuth } from "../services/fetchWithAuth";

const PostToFeed = () => {
  const { image: uploadedImage, setImage } = useImage();
  const [content, setContent] = useState("");
  const [image, setLocalImage] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [showWeatherDropdown, setShowWeatherDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [showCameraPopup, setShowCameraPopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (stream && videoRef.current && !cameraPreview) {
      console.log("Assigning stream to video element...");
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video
        .play()
        .catch((err) => {
          console.error("Video play error:", err);
          setError("Failed to play camera feed.");
        });
    }
    return () => {
      if (stream) {
        console.log("Cleaning up stream on unmount...");
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };
  }, [stream, cameraPreview]);

  const startCamera = async () => {
    try {
      console.log("Starting camera...");
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      setShowCameraPopup(true);
      setError(null);
    } catch (err) {
      console.error("Camera start error:", err);
      setError("Failed to access camera. Please ensure camera permissions are granted.");
    }
  };

  const capturePhoto = () => {
    if (!stream || !videoRef.current || !canvasRef.current) return;
    console.log("Capturing photo...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/png");
    setCameraPreview(dataUrl);
    setLocalImage(dataUrl);
    setImage(dataUrl); // Store in ImageContext
  };

  const redoPhoto = () => {
    console.log("Redoing photo...");
    setCameraPreview(null);
    if (stream) {
      console.log("Stopping current stream...");
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      console.log("Resetting video source...");
      videoRef.current.srcObject = null;
    }
    setTimeout(() => {
      console.log("Attempting to restart camera...");
      startCamera();
    }, 100); // Minimal delay for browser compatibility
  };

  const handleDone = () => {
    console.log("Saving photo and closing popup...");
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCameraPopup(false);
  };

  const handleReset = () => {
    console.log("Resetting form...");
    setContent("");
    setLocalImage(null);
    setCameraPreview(null);
    setImage(null);
    setLocation(null);
    setWeather(null);
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
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLocalImage(result);
        setImage(result); // Store in ImageContext
      };
      reader.readAsDataURL(file);
    }
  };


const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  try {
    const formData = new FormData();
    if (uploadedImage || image) {
      const res = await fetch(uploadedImage || image || "");
      const blob = await res.blob();
      formData.append("image", blob, "post.png");
    }

    formData.append("caption", content);
    formData.append("location", location || "");
    formData.append("weather", JSON.stringify({ condition: weather }));

    const response = await fetchWithAuth("http://localhost:5001/api/social/posts", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("Post created:", result);

    navigate("/feed");
  } catch (err) {
    console.error("Failed to create post:", err);
    setError("Failed to share post.");
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
    setWeather(value);
    setShowWeatherDropdown(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div
        className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-48 -mt-2 mb-6"
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          marginTop: '-1rem'
        }}
      >
        <div className="px-6 py-2 border-2 border-white z-10">
          <h1
            className="text-2xl font-bodoni font-light text-center text-white"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            CREATE NEW POST
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      <div className="bg-white shadow-md rounded-lg">
        <div className="flex justify-center mb-4">
          <h1 className="text-xl border-2 border-black px-3 py-1">
            Share Your Outfit
          </h1>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <span className="block font-bold text-center text-gray-700" style={{ fontSize: '18px' }}>
                Add Photo
              </span>
              <div className="flex flex-col items-center space-y-4">

                <div className="flex gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors">
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Photo
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Take Photo
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                {(uploadedImage || image) && (
                  <div className="w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black">
                    <img
                      src={uploadedImage || image || ""}
                      alt="Selected or captured"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 space-y-0">
              <div className="w-3/4 space-y-2">
                <label htmlFor="location" className="block text-sm font-bold text-gray-700" style={{ fontSize: '18px' }}>
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  placeholder="Enter your location "
                  value={location || ""}
                  onChange={(e) => setLocation(e.target.value || null)}
                  className="w-full p-2 border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="w-1/4 space-y-2 relative">
                <label htmlFor="weather" className="block text-sm font-bold text-gray-700" style={{ fontSize: '18px' }}>
                  Weather
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowWeatherDropdown(!showWeatherDropdown)}
                    className="w-full p-2 border border-teal-300 rounded-md bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <span className="flex items-center">
                      {weather ? (
                        weatherOptions.find(opt => opt.value === weather)?.icon
                      ) : (
                        <span className="text-gray-400">Select weather</span>
                      )}
                    </span>
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  {showWeatherDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleWeatherSelect("")}
                        className="w-full p-2 text-left hover:bg-gray-100"
                      >
                        Select weather
                      </button>
                      {weatherOptions.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleWeatherSelect(option.value)}
                          className="w-full p-2 text-left hover:bg-teal-100 flex items-center"
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

            <div className="space-y-2">
              <label htmlFor="content" className="block text-sm text-center font-bold text-gray-700" style={{ fontSize: '18px' }}>
                Caption your Outfit
              </label>
              <textarea
                id="content"
                placeholder="Tell everyone about your outfit, the weather, or your style inspiration..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[100px] p-2 border border-teal-500 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-700"
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!content.trim()}
              >
                Share Post
              </button>
            </div>
          </form>
        </div>
      </div>

      {showCameraPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <div className="w-72 h-96 rounded-xl overflow-hidden border-4 border-black bg-black mb-4">
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
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => {
                  console.log("Canceling photo...");
                  setCameraPreview(null);
                  setLocalImage(null);
                  setImage(null);
                  if (stream) {
                    stream.getTracks().forEach((t) => t.stop());
                    setStream(null);
                  }
                  setShowCameraPopup(false);
                }}
                className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
              >
                Cancel
              </button>
              {stream && !cameraPreview && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center justify-center px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
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
                    className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
                  >
                    Redo
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="flex items-center justify-center px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-teal-600 transition-colors shadow-md"
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
    </div>
  );
};

export default PostToFeed;