// src/pages/ClosetPage.tsx
import { useState, useEffect } from "react";
import { Heart, Search, X } from "lucide-react";


// Define the structure for items and tabs
type Item = {
  id: number;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: "items" | "outfits";
};

type TabType = "items" | "outfits" | "favourites";

// Mock data for items
const mockItems: Item[] = [
  { id: 1, name: "Shirt", image: "/images/shirt.jpg", favorite: false, category: "Shirts" },
];

// Mock data for outfits
const mockOutfits: Item[] = [
  { id: 3, name: "Party Look", image: "/images/image3.jpg", favorite: false, category: "Party" },
  { id: 4, name: "Casual Look", image: "/images/image4.jpg", favorite: false, category: "Casual" },
  { id: 5, name: "Sporty Look", image: "/images/image5.jpg", favorite: false, category: "Sporty" },
  { id: 6, name: "Party Look", image: "/images/image6.jpg", favorite: false, category: "Party" },
];

// Start with an empty favourites array; items will be added dynamically
const mockFavourites: Item[] = [];

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
    const token = localStorage.getItem("token");
    if (!token) return;
    const stored = localStorage.getItem(`closet-favs-${token}`);
    if (stored) {
      const favs: Item[] = JSON.parse(stored);
      setFavourites(favs);
      setItems(is =>
        is.map(i => ({
          ...i,
          favorite: favs.some(f => f.id === i.id && f.tab === "items"),
        }))
      );
      setOutfits(of =>
        of.map(o => ({
          ...o,
          favorite: favs.some(f => f.id === o.id && f.tab === "outfits"),
        }))
      );
    }
  }, []);

  const toggleFavorite = (item: Item, tab: "items" | "outfits") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const isFav = favourites.some(f => f.id === item.id && f.tab === tab);
    const newFavs = isFav
      ? favourites.filter(f => !(f.id === item.id && f.tab === tab))
      : [...favourites, { ...item, favorite: true, tab }];

    setFavourites(newFavs);
    localStorage.setItem(`closet-favs-${token}`, JSON.stringify(newFavs));

    const apply = (lst: Item[], fn: (v: Item[]) => void) =>
      fn(lst.map(x => (x.id === item.id ? { ...x, favorite: !x.favorite } : x)));

    if (tab === "items") apply(items, setItems);
    else apply(outfits, setOutfits);
  };

  const handleRemoveClick = (id: number, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      const { id, tab } = itemToRemove;
      if (tab === "items") setItems(it => it.filter(i => i.id !== id));
      if (tab === "outfits") setOutfits(of => of.filter(o => o.id !== id));
      if (tab === "favourites") setFavourites(f => f.filter(i => i.id !== id));
    }
    setShowModal(false);
  };

  const cancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  const getCurrentData = () => {
    const base = activeTab === "items" ? items : activeTab === "outfits" ? outfits : favourites;
    return base.filter(i =>
      (!activeCategory || i.category === activeCategory) &&
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getTabCategories = () => {
    const base = activeTab === "items" ? items : activeTab === "outfits" ? outfits : favourites;
    return Array.from(new Set(base.map(i => i.category)));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-gray-900">
      <h1
        className="text-4xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100"
        style={{ fontFamily: "'Bodoni Moda', serif" }}
      >
        My Closet
      </h1>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        { ["All", ...getTabCategories()].map((cat, i) => {
          const sel = (cat === "All" && !activeCategory) || activeCategory === cat;
          return (
            <button
              key={i}
              onClick={() => setActiveCategory(cat === "All" ? null : cat)}
              className={`
                px-4 py-1 rounded-full text-sm font-medium transition-colors duration-200
                ${ sel
                  ? "bg-black text-white"
                  : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 hover:bg-black hover:text-white"
                }
                border border-black dark:border-gray-700
              `}
            >
              {cat}
            </button>
          );
        }) }
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="
            pl-10 pr-4 py-2 w-full rounded-full
            bg-gray-200 dark:bg-gray-800
            text-gray-700 dark:text-gray-200
            focus:outline-none focus:ring-2 focus:ring-teal-500
          "
        />
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6 gap-8">
        {(["items", "outfits", "favourites"] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 rounded-full font-medium transition
              ${ activeTab === tab
                ? "bg-black text-white"
                : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 border border-black dark:border-gray-700 hover:bg-black hover:text-white"
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        { getCurrentData().map(item => (
          <div key={item.id} className="relative">
            <div className="h-48 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              <button
                onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-gray-800 shadow"
              >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
              <button
                onClick={() => {
                  const origin = activeTab === "favourites"
                    ? (favourites.find(f => f.id === item.id)?.tab || "items")
                    : (activeTab as "items" | "outfits");
                  toggleFavorite(item, origin);
                }}
                className="focus:outline-none"
              >
                <Heart
                  className={`h-5 w-5 ${ favourites.some(f => f.id === item.id)
                    ? "fill-red-500 text-red-500"
                    : "text-gray-400 dark:text-gray-400"
                  }`} />
              </button>
            </div>
          </div>
        )) }
      </div>

      {/* Remove Modal */}
      { showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg max-w-sm w-full">
            <h2 className="text-center mb-6 text-base font-normal text-gray-900 dark:text-gray-100">
              Remove “{itemToRemove?.name}”?
            </h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={cancelRemove}
                className="
                  px-4 py-2 rounded-full transition-colors
                  bg-white dark:bg-gray-800
                  text-black dark:text-gray-100
                  border border-black dark:border-gray-700
                  hover:bg-black hover:text-white dark:hover:bg-gray-700
                "
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
      ) }
    </div>
  );
};

export default ClosetPage;
