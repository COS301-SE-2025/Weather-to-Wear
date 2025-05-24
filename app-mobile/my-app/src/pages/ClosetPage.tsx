import { useState } from "react";
import { Heart, Search, X } from "lucide-react";
import ClosetTabs from "../components/ClosetTabs";

// Mock data with unique IDs across all tabs
const mockItems = [
  { id: 1, name: "Shirt", image: "../images/shirt.jpg", favorite: false, category: "Shirts" },
  { id: 2, name: "Jeans", image: "/images/jeans.jpg", favorite: false, category: "Pants" },
  { id: 3, name: "Jacket", image: "/images/jacket.jpg", favorite: false, category: "Jackets" },
  { id: 4, name: "Shoes", image: "/images/shoes.jpg", favorite: false, category: "Shoes" },
  { id: 5, name: "Shirt", image: "/images/shirt2.jpg", favorite: false, category: "Shirts" },
  { id: 6, name: "Skirt", image: "/images/skirt.jpg", favorite: false, category: "Pants" },
];

const mockOutfits = [
  { id: 101, name: "Casual Look", image: "/images/image1.jpg", favorite: false, category: "Casual" },
  { id: 102, name: "Formal Look", image: "/images/image2.jpg", favorite: false, category: "Formal" },
  { id: 103, name: "Party Look", image: "/images/image3.jpg", favorite: false, category: "Party" },
  { id: 104, name: "Casual Look", image: "/images/image4.jpg", favorite: false, category: "Casual" },
  { id: 105, name: "Sporty Look", image: "/images/image5.jpg", favorite: false, category: "Sporty" },
  { id: 106, name: "Party Look", image: "/images/image6.jpg", favorite: false, category: "Party" },
];

// Start with an empty favourites array, as items will be added dynamically
const mockFavourites: { id: number; name: string; image: string; favorite: boolean; category: string }[] = [];

const ClosetPage = () => {
  const [activeTab, setActiveTab] = useState("items");
  const [items, setItems] = useState(mockItems);
  const [outfits, setOutfits] = useState(mockOutfits);
  const [favourites, setFavourites] = useState(mockFavourites);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: number; tab: string; name: string } | null>(null);

  const toggleFavorite = (id: number, tab: string) => {
    // Helper to update the favorite state in a given dataset
    const updateFavorite = (data: any[], setter: (val: any[]) => void) => {
      const updatedData = data.map((item) => {
        if (item.id === id) {
          const newFavorite = !item.favorite;
          // If hearted in items or outfits, add to favourites
          if (tab !== "favourites" && newFavorite) {
            const existsInFavourites = favourites.some((fav) => fav.id === id);
            if (!existsInFavourites) {
              setFavourites([...favourites, { ...item, favorite: true }]);
              console.log(`Added to favourites: ${item.name} (ID: ${id})`);
            }
          }
          return { ...item, favorite: newFavorite };
        }
        return item;
      });
      setter(updatedData);
    };

    // Update favourites tab specifically
    const updateFavourites = () => {
      const updatedFavourites = favourites.map((item) => {
        if (item.id === id) {
          const newFavorite = !item.favorite;
          // If unhearted in favourites, remove it
          if (!newFavorite) {
            setFavourites(favourites.filter((fav) => fav.id !== id));
            console.log(`Removed from favourites: ${item.name} (ID: ${id})`);
          }
          return { ...item, favorite: newFavorite };
        }
        return item;
      });
      setFavourites(updatedFavourites);

      // Also update the source tab (items or outfits) to reflect the unheart
      if (tab === "favourites") {
        if (items.some((item) => item.id === id)) {
          updateFavorite(items, setItems);
        } else if (outfits.some((item) => item.id === id)) {
          updateFavorite(outfits, setOutfits);
        }
      }
    };

    if (tab === "items") updateFavorite(items, setItems);
    else if (tab === "outfits") updateFavorite(outfits, setOutfits);
    else if (tab === "favourites") updateFavourites();
  };

  const handleRemoveClick = (id: number, tab: string, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      const { id, tab } = itemToRemove;
      const filterOut = (data: any[]) => data.filter((item) => item.id !== id);

      if (tab === "items") {
        setItems(filterOut(items));
        // Remove from favourites if present
        setFavourites(favourites.filter((fav) => fav.id !== id));
      } else if (tab === "outfits") {
        setOutfits(filterOut(outfits));
        // Remove from favourites if present
        setFavourites(favourites.filter((fav) => fav.id !== id));
      } else if (tab === "favourites") {
        setFavourites(filterOut(favourites));
        // Also update the source tab to reflect removal
        if (items.some((item) => item.id === id)) {
          setItems(filterOut(items));
        } else if (outfits.some((item) => item.id === id)) {
          setOutfits(filterOut(outfits));
        }
      }
    }
    setShowModal(false);
    setItemToRemove(null);
  };

  const cancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  const getCurrentData = () => {
    const data = activeTab === "items" ? items : activeTab === "outfits" ? outfits : favourites;
    return data.filter((item) => {
      const matchCategory = !activeCategory || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  };

  const uniqueCategories = Array.from(new Set([...items, ...outfits, ...favourites].map((item) => item.category)));

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-900" style={{ fontFamily: "'Bodoni Moda', serif" }}>
        My Closet
      </h1>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {["All", ...uniqueCategories].map((category, index) => {
          const isActive = activeCategory === category || (category === "All" && activeCategory === null);
          return (
            <button
              key={index}
              onClick={() => setActiveCategory(category === "All" ? null : category)}
              className={`px-4 py-1 border border-black rounded-full text-sm font-medium transition-colors duration-200
                ${isActive ? "bg-black text-white" : "bg-white text-black hover:bg-black hover:text-white"}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-2 bg-gray-200 text-gray-700 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Search items..."
          aria-label="Search items"
        />
      </div>

      <div className="flex justify-center mb-6 gap-8">
        {["items", "outfits", "favourites"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="relative pb-2 text-lg font-medium text-gray-700 hover:text-teal-600 transition-colors duration-300"
          >
            <span className={`${activeTab === tab ? "text-black" : ""}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-teal-500 transition-all duration-300 ${
                activeTab === tab ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {getCurrentData().map((item) => (
          <div key={item.id} className="relative">
            <div className="bg-gray-200 h-48 rounded-lg overflow-hidden">
              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              <button
                onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-700">{item.name}</span>
              <button onClick={() => toggleFavorite(item.id, activeTab)} className="focus:outline-none">
                <Heart
                  className={`h-5 w-5 ${item.favorite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-center text-base font-normal text-gray-900 mb-6">
              Are you sure you want to remove "{itemToRemove?.name}"?
            </h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={cancelRemove}
                className="px-4 py-2 border border-black text-black bg-white rounded-full hover:bg-black hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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