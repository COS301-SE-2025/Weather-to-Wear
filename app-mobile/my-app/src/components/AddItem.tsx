// src/components/AddItem.tsx
import React, { useState } from 'react';
import axios from 'axios';

// Layer options (enum LayerCategory)
const LAYER_OPTIONS = [
  { value: '', label: 'Select Layer' },
  { value: 'base_top', label: 'Base Top' },
  { value: 'base_bottom', label: 'Base Bottom' },
  { value: 'mid_top', label: 'Mid Top' },
  // { value: 'mid_bottom', label: 'Mid Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'headwear', label: 'Headwear' },
  // { value: 'accessory', label: 'Accessory' },
];

// Categories, grouped by layer
const CATEGORY_BY_LAYER: Record<string, { value: string; label: string }[]> = {
  base_top: [
    { value: 'TSHIRT', label: 'T-shirt' },
    { value: 'LONGSLEEVE', label: 'Long Sleeve' },
  ],
  base_bottom: [
    { value: 'PANTS', label: 'Pants' },
    { value: 'JEANS', label: 'Jeans' },
    { value: 'SHORTS', label: 'Shorts' },
  ],
  mid_top: [
    { value: 'SWEATER', label: 'Sweater' },
    { value: 'HOODIE', label: 'Hoodie' },
  ],
  outerwear: [
    { value: 'COAT', label: 'Coat' },
    { value: 'BLAZER', label: 'Blazer' },
    { value: 'JACKET', label: 'Jacket' },
    { value: 'RAINCOAT', label: 'Raincoat' },
  ],
  footwear: [
    { value: 'SHOES', label: 'Shoes' },
    { value: 'BOOTS', label: 'Boots' },
  ],
  headwear: [
    { value: 'BEANIE', label: 'Beanie' },
    { value: 'HAT', label: 'Hat' },
  ],
};

const AddItem = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [layerCategory, setLayerCategory] = useState('');
  const [category, setCategory] = useState('');

  const categoryOptions = layerCategory
    ? CATEGORY_BY_LAYER[layerCategory] || []
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayerCategory(e.target.value);
    setCategory(''); // reset category when layer changes
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
  };

  const handleUpload = async () => {
    if (!imageFile || !category) {
      alert('Please select an image and category');
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('category', category);
    formData.append('layerCategory', layerCategory);

    try {
      const response = await axios.post('/api/closet/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Upload successful!');
      setImageFile(null);
      setCategory('');
      setLayerCategory('');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Add Item to Closet</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <select
        value={layerCategory}
        onChange={handleLayerChange}
        className="block mt-2 border p-1"
      >
        {LAYER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={category}
        onChange={handleCategoryChange}
        className="block mt-2 border p-1"
        disabled={!layerCategory}
      >
        <option value="">Select Category</option>
        {categoryOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={handleUpload}
        className="mt-3 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Upload
      </button>
    </div>
  );
};

export default AddItem;
