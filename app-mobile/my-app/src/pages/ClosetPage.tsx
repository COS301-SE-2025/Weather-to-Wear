import { useState } from "react";
import { Heart, Search, X } from "lucide-react";
import ClosetTabs from "../components/ClosetTabs";

// Mock data
const categories = ["Category", "Category", "Category", "Category", "Category"];

const mockItems = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Item`,
  favorite: false,
}));

const ClosetPage = () => {
  const [items, setItems] = useState(mockItems);
  const [activeTab, setActiveTab] = useState("items");

  const toggleFavorite = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">My Closet</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category, index) => (
          <button
            key={index}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            {category}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          className="pl-10 pr-4 py-2 bg-gray-200 text-gray-700 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Search items..."
          aria-label="Search items"
        />
      </div>

      <ClosetTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <div className="bg-gray-200 h-48 rounded-lg flex items-center justify-center">
              <button className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-700">{item.name}</span>
              <button
                onClick={() => toggleFavorite(item.id)}
                className="focus:outline-none"
              >
                <Heart
                  className={`h-5 w-5 ${
                    item.favorite ? "fill-red-500 text-red-500" : "text-gray-400"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClosetPage;