import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useImage } from "../components/ImageContext";

const AddPage = () => {
  const { setImage } = useImage();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);

  const startCamera = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = s;
      setStream(s);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL();
      setCameraPreview(dataUrl);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDone = (type: "camera" | "upload") => {
    const finalImage = type === "camera" ? cameraPreview : uploadPreview;
    if (finalImage) {
      setImage(finalImage);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      navigate("/add-item");
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>Add Item</h1>
      <div style={{ display: "flex", justifyContent: "space-around", marginTop: "2rem", flexWrap: "wrap" }}>
        {/* Camera Section */}
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "#ddd", borderRadius: "2rem", width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {cameraPreview ? (
              <img src={cameraPreview} alt="Captured" style={{ width: "100%", height: "100%", borderRadius: "2rem" }} />
            ) : (
              <video ref={videoRef} autoPlay playsInline style={{ borderRadius: "2rem" }} />
            )}
          </div>
          <button onClick={startCamera} style={buttonStyle}>Take Photo</button>
          <button onClick={() => handleDone("camera")} style={doneStyle}>Done</button>
          <button onClick={() => { setCameraPreview(null); if (videoRef.current) videoRef.current.srcObject = null; }} style={redoStyle}>Redo</button>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* Upload Section */}
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "#ddd", borderRadius: "2rem", width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {uploadPreview ? (
              <img src={uploadPreview} alt="Uploaded" style={{ width: "100%", height: "100%", borderRadius: "2rem" }} />
            ) : (
              <label style={buttonStyle}>
                Upload Image
                <input type="file" accept="image/*" onChange={handleUpload} hidden />
              </label>
            )}
          </div>
          <button onClick={() => handleDone("upload")} style={doneStyle}>Done</button>
          <button onClick={() => setUploadPreview(null)} style={redoStyle}>Redo</button>
        </div>
      </div>
    </div>
  );
};

const buttonStyle = {
  backgroundColor: "#222",
  color: "white",
  border: "none",
  borderRadius: "2rem",
  padding: "0.5rem 1.5rem",
  marginTop: "1rem",
  cursor: "pointer"
};

const doneStyle = {
  ...buttonStyle,
  backgroundColor: "#26968A"
};

const redoStyle = {
  ...buttonStyle,
  backgroundColor: "darkred"
};

export default AddPage;
