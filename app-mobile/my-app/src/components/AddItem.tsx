// src/components/AddItem.tsx
import React, { useState } from 'react';
import axios from 'axios';

const AddItem = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !category) {
      alert('Please select an image and category');
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('category', category);

    try {
      const response = await axios.post('/api/closet/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Upload success:', response.data);
      alert('Upload successful!');
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
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="block mt-2 border p-1"
      >
        <option value="">Select Category</option>
        <option value="SHIRT">Shirt</option>
        <option value="HOODIE">Hoodie</option>
        <option value="PANTS">Pants</option>
        <option value="SHORTS">Shorts</option>
        <option value="SHOES">Shoes</option>
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
