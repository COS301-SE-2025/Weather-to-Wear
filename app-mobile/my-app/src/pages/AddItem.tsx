import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AddItem.css";
import { useImage } from "../components/ImageContext"; 
import Toast from '../components/Toast';

const AddItem = () => {
  const { image: uploadedImage } = useImage(); 
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [store, setStore] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState("");
  const [materialOptions] = useState(["Nylon", "Wool", "Silk", "Leather", "Cotton", "Velvet", "Other"]);
  const [weatherOptions] = useState(["Sunny", "Raining", "Snowy", "Windy", "Cloudy"]);
  const [seasonOptions] = useState(["Summer", "Winter", "Autumn", "Spring"]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const navigate = useNavigate();

  const handleMultiSelect = (
    item: string,
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    current: string[]
  ) => {
    if (!current.includes(item)) {
      setState([...current, item]);
    }
  };

  const removeMultiSelect = (
    item: string,
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    current: string[]
  ) => {
    setState(current.filter((i) => i !== item));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (!name || !type || !color || selectedMaterials.length === 0 || selectedWeather.length === 0 || selectedSeasons.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }
    setShowPopup(true);
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowPopup(false);
      navigate("/dashboard");
    }, 3000);
  };

  return (
    <div className="add-item-container">
      <h1 className="add-item-title">Add Item</h1>
      <div className="add-item-form">
        <div className="image-upload">
          <label className="upload-box">
            {uploadedImage || image ? (
              <img src={uploadedImage || image} alt="Preview" className="preview" />
            ) : (
              <span>📷 Upload</span>
            )}
            <input type="file" onChange={handleImageChange} hidden />
          </label>
        </div>

        <div className="form-fields">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="" disabled hidden>Select Type</option>
            {["Shirt", "Pants", "Jacket", "Shoes", "Dresses"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>Color</label>
          <select value={color} onChange={(e) => setColor(e.target.value)} required>
            <option value="" disabled hidden>Select Color</option>
            {["Black", "White", "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Multicolored"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label>Material</label>
          <div className="dropdown-chip">
            <select onChange={(e) => handleMultiSelect(e.target.value, setSelectedMaterials, selectedMaterials)}>
              <option value="" disabled hidden>Select Material</option>
              {materialOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="chips">
              {selectedMaterials.map((item) => (
                <span className="chip" key={item}>
                  {item}
                  <button onClick={() => removeMultiSelect(item, setSelectedMaterials, selectedMaterials)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <label>Weather Conditions</label>
          <div className="dropdown-chip">
            <select onChange={(e) => handleMultiSelect(e.target.value, setSelectedWeather, selectedWeather)}>
              <option value="" disabled hidden>Select Condition</option>
              {weatherOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="chips">
              {selectedWeather.map((item) => (
                <span className="chip" key={item}>
                  {item}
                  <button onClick={() => removeMultiSelect(item, setSelectedWeather, selectedWeather)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <label>Season</label>
          <div className="dropdown-chip">
            <select onChange={(e) => handleMultiSelect(e.target.value, setSelectedSeasons, selectedSeasons)}>
              <option value="" disabled hidden>Select Season</option>
              {seasonOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="chips">
              {selectedSeasons.map((item) => (
                <span className="chip" key={item}>
                  {item}
                  <button onClick={() => removeMultiSelect(item, setSelectedSeasons, selectedSeasons)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <label>Store (optional)</label>
          <input value={store} onChange={(e) => setStore(e.target.value)} />

          <label>Tags (optional)</label>
          <div className="dropdown-chip">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tag.trim()) {
                  e.preventDefault();
                  setTags([...tags, tag.trim()]);
                  setTag("");
                }
              }}
              placeholder="Add tags and press enter"
            />
            <div className="chips">
              {tags.map((t) => (
                <span className="chip" key={t}>
                  {t}
                  <button onClick={() => setTags(tags.filter((i) => i !== t))}>×</button>
                </span>
              ))}
            </div>
          </div>

          <button className="submit-btn" onClick={handleSubmit}>Add Item to Closet</button>
        </div>
      </div>

      {/* {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">Item successfully added to the closet</div>
        </div>
      )} */}
            {showSuccessPopup && <Toast message="Preferences updated successfully!" />}
      
    </div>
  );
};

export default AddItem;
