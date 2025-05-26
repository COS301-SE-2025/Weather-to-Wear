import { useState, useEffect } from "react";
import { Heart, Search, X } from "lucide-react";

// Define types for your items
type Item = {
  id: number;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: "items" | "outfits"; // Only these two values are allowed
};

type TabType = "items" | "outfits" | "favourites";

const mockItems: Item[] = [
  { id: 1, name: "Shirt", image: "/images/shirt.jpg", favorite: false, category: "Shirts" },
  { id: 2, name: "Jeans", image: "/images/jeans.jpg", favorite: false, category: "Pants" },
  { id: 3, name: "Jacket", image: "/images/jacket.jpg", favorite: false, category: "Jackets" },
  { id: 4, name: "Shoes", image: "/images/shoes.jpg", favorite: false, category: "Shoes" },
  { id: 5, name: "Shirt", image: "/images/shirt2.jpg", favorite: false, category: "Shirts" },
  { id: 6, name: "Skirt", image: "/images/skirt.jpg", favorite: false, category: "Pants" },
];

const mockOutfits: Item[] = [
  //{ id: 1, name: "Casual Look", image: "/images/image1.jpg", favorite: false, category: "Casual" },

  { id: 3, name: "Party Look", image: "/images/image3.jpg", favorite: false, category: "Party" },
  { id: 4, name: "Casual Look", image: "/images/image4.jpg", favorite: false, category: "Casual" },
  { id: 5, name: "Sporty Look", image: "/images/image5.jpg", favorite: false, category: "Sporty" },
  { id: 6, name: "Party Look", image: "/images/image6.jpg", favorite: false, category: "Party" },
];

const ClosetPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [items, setItems] = useState<Item[]>(mockItems);
  const [outfits, setOutfits] = useState<Item[]>(mockOutfits);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: number; tab: TabType; name: string } | null>(null);

useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const storedFavs = localStorage.getItem(`closet-favs-${token}`);
  if (storedFavs) {
    const parsedFavs: Item[] = JSON.parse(storedFavs);
    setFavourites(parsedFavs);

    setItems(prevItems =>
      prevItems.map(item => {
        const isFav = parsedFavs.some(fav => fav.id === item.id && fav.tab === "items");
        return { ...item, favorite: isFav };
      })
    );

    setOutfits(prevOutfits =>
      prevOutfits.map(outfit => {
        const isFav = parsedFavs.some(fav => fav.id === outfit.id && fav.tab === "outfits");
        return { ...outfit, favorite: isFav };
      })
    );
  }
}, []);

const toggleFavorite = (item: Item, tab: "items" | "outfits") => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const isFav = favourites.some(fav => fav.id === item.id && fav.tab === tab);

  let updatedFavs: Item[];
  if (isFav) {
    updatedFavs = favourites.filter(fav => !(fav.id === item.id && fav.tab === tab));
  } else {
    const newFav: Item = { ...item, favorite: true, tab };
    updatedFavs = [...favourites, newFav];
  }

  setFavourites(updatedFavs);
  localStorage.setItem(`closet-favs-${token}`, JSON.stringify(updatedFavs));

  const toggleInList = (list: Item[], setter: (val: Item[]) => void) =>
    setter(list.map(el => (el.id === item.id ? { ...el, favorite: !el.favorite } : el)));

  if (tab === "items") toggleInList(items, setItems);
  else toggleInList(outfits, setOutfits);
};

  const handleRemoveClick = (id: number, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      const { id, tab } = itemToRemove;
      const filterOut = (data: Item[]) => data.filter((item) => item.id !== id);

      if (tab === "items") setItems(filterOut(items));
      else if (tab === "outfits") setOutfits(filterOut(outfits));
      else if (tab === "favourites") setFavourites(filterOut(favourites));
    }
    setShowModal(false);
    setItemToRemove(null);
  };

  const cancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  const getCurrentData = (): Item[] => {
    const data =
      activeTab === "items"
        ? items
        : activeTab === "outfits"
        ? outfits
        : favourites;
    return data.filter((item) => {
      const matchCategory = !activeCategory || item.category === activeCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  };

  const getTabCategories = () => {
    const data = activeTab === "items" ? items : activeTab === "outfits" ? outfits : favourites;
    return Array.from(new Set(data.map((item) => item.category)));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-6 text-gray-900" style={{ fontFamily: "'Bodoni Moda', serif" }}>
        My Closet
      </h1>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {["All", ...getTabCategories()].map((category, index) => {
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

      {/* <div className="flex justify-center mb-6 gap-8">
        {(["items", "outfits", "favourites"] as TabType[]).map((tab) => (
<button 
  onClick={() => {
    const originalTab = activeTab === "favourites"
      ? favourites.find(fav => fav.id === item.id)?.tab || "items"
      : activeTab;
    toggleFavorite(item, originalTab as "items" | "outfits");
  }}
  className="focus:outline-none"
>
  <Heart
    className={`h-5 w-5 ${
      favourites.some(fav => fav.id === item.id && fav.tab === (activeTab === "favourites"
        ? favourites.find(f => f.id === item.id)?.tab
        : activeTab))
        ? "fill-red-500 text-red-500"
        : "text-gray-400"
    }`}
  />
</button>

        ))}
      </div> */}


      <div className="flex justify-center mb-6 gap-8">
  {(["items", "outfits", "favourites"] as TabType[]).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-full font-medium transition ${
        activeTab === tab ? "bg-black text-white" : "bg-white text-black border border-black"
      }`}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              <button 
                onClick={() => {
                  const tab = activeTab === "favourites" 
                    ? favourites.find(fav => fav.id === item.id)?.tab || "items" 
                    : activeTab as "items" | "outfits";
                  toggleFavorite(item, tab);
                }} 
                className="focus:outline-none"
              >
                <Heart
                  className={`h-5 w-5 ${
                    favourites.some((fav: Item) => fav.id === item.id)
                      ? "fill-red-500 text-red-500"
                      : "text-gray-400"
                  }`}
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