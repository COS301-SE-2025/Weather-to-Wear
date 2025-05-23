import { useState } from "react";
import { Heart, Search, X } from "lucide-react";
import ClosetTabs from "../components/ClosetTabs";

// Mock data with specific images
const mockItems = [
  { id: 1, name: "Shirt", image: "../images/shirt.jpg", favorite: false, category: "Shirts" },
  { id: 2, name: "Jeans", image: "/images/jeans.jpg", favorite: false, category: "Pants" },
  { id: 3, name: "Jacket", image: "/images/jacket.jpg", favorite: false, category: "Jackets" },
  { id: 4, name: "Shoes", image: "/images/shoes.jpg", favorite: false, category: "Shoes" },
  { id: 5, name: "Shirt", image: "/images/shirt2.jpg", favorite: false, category: "Shirts" },
  { id: 6, name: "Skirt", image: "/images/skirt.jpg", favorite: false, category: "Pants" },
];

const mockOutfits = [
  { id: 1, name: "Casual Look", image: "/images/image1.jpg", favorite: false, category: "Casual" },
  { id: 2, name: "Formal Look", image: "/images/image2.jpg", favorite: false, category: "Formal" },
  { id: 3, name: "Party Look", image: "/images/image3.jpg", favorite: false, category: "Party" },
  { id: 4, name: "Casual Look", image: "/images/image4.jpg", favorite: false, category: "Casual" },
  { id: 5, name: "Sporty Look", image: "/images/image5.jpg", favorite: false, category: "Sporty" },
  { id: 6, name: "Party Look", image: "/images/image6.jpg", favorite: false, category: "Party" },
];

const mockFavourites = [
  { id: 1, name: "Shirt", image: "/images/shirt2.jpg", favorite: false, category: "Shirts" },
  { id: 2, name: "Jeans", image: "/images/image6.jpg", favorite: false, category: "Pants" },
  { id: 3, name: "Jacket", image: "/images/shoes.jpg", favorite: false, category: "Jackets" },
  { id: 4, name: "Shoes", image: "/images/jacket.jpg", favorite: false, category: "Shoes" },
  { id: 5, name: "Formal Outift", image: "/images/image2.jpg", favorite: false, category: "Formal" },
  { id: 6, name: "Casual Outfit", image: "/images/image1.jpg", favorite: false, category: "Casual" },
];

const ClosetPage = () => {
  const [activeTab, setActiveTab] = useState("items");
  const [items, setItems] = useState(mockItems);
  const [outfits, setOutfits] = useState(mockOutfits);
  const [favourites, setFavourites] = useState(mockFavourites);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false); // Control modal visibility
  const [itemToRemove, setItemToRemove] = useState<{
    id: number;
    tab: string;
    name: string;
  } | null>(null); // Track item to remove

  const toggleFavorite = (id: number, tab: string) => {
    if (tab === "items") {
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, favorite: !item.favorite } : item
        )
      );
    } else if (tab === "outfits") {
      setOutfits(
        outfits.map((item) =>
          item.id === id ? { ...item, favorite: !item.favorite } : item
        )
      );
    } else if (tab === "favourites") {
      setFavourites(
        favourites.map((item) =>
          item.id === id ? { ...item, favorite: !item.favorite } : item
        )
      );
    }
  };

  const handleRemoveClick = (id: number, tab: string, name: string) => {
    setItemToRemove({ id, tab, name }); // Store item details
    setShowModal(true); // Show the modal
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      const { id, tab } = itemToRemove;
      if (tab === "items") {
        setItems(items.filter((item) => item.id !== id));
      } else if (tab === "outfits") {
        setOutfits(outfits.filter((item) => item.id !== id));
      } else if (tab === "favourites") {
        setFavourites(favourites.filter((item) => item.id !== id));
      }
    }
    setShowModal(false); // Close the modal
    setItemToRemove(null); // Clear the item to remove
  };

  const cancelRemove = () => {
    setShowModal(false); // Close the modal
    setItemToRemove(null); // Clear the item to remove
  };

  // Get the current tab's data based on activeTab
  const currentData =
    activeTab === "items"
      ? items
      : activeTab === "outfits"
      ? outfits
      : favourites;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">My Closet</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {["Shirts", "Pants", "Shoes", "Jackets"].map((category, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-gray-700 rounded-full text-sm font-medium transition-colors ${
              activeCategory === category ? "bg-gray-400" : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setActiveCategory(category)}
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
        {currentData.map((item) => (
          <div key={item.id} className="relative">
            <div className="bg-gray-200 h-48 rounded-lg overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-700">{item.name}</span>
              <button
                onClick={() => toggleFavorite(item.id, activeTab)}
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

      {/* Custom Pop-up Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Are you sure you want to remove "{itemToRemove?.name}"?
            </h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelRemove}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosetPage;