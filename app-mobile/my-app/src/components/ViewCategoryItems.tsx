// src/components/ViewCategoryItems.tsx
import React, { useState } from 'react';
import axios from 'axios';

const ViewCategoryItems = () => {
  const [category, setCategory] = useState('');
  const [items, setItems] = useState([]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`/api/closet/category/${category}`);
      setItems(response.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load items');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">View Items by Category</h2>
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="block border p-1"
      >
        <option value="">Select Category</option>
        <option value="SHIRT">Shirt</option>
        <option value="HOODIE">Hoodie</option>
        <option value="PANTS">Pants</option>
        <option value="SHORTS">Shorts</option>
        <option value="SHOES">Shoes</option>
      </select>
      <button
        onClick={fetchItems}
        className="mt-3 bg-green-500 text-white px-4 py-2 rounded"
      >
        Load Items
      </button>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {items.map((item: any) => (
          <img
            key={item.id}
            src={item.imageUrl}
            alt={item.category}
            className="w-full h-auto rounded shadow"
          />
        ))}
      </div>
    </div>
  );
};

export default ViewCategoryItems;
