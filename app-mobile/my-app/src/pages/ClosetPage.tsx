// src/pages/ClosetPage.tsx
import { useState, useEffect } from 'react';
import { Heart, Search, X, Pen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


import { fetchAllItems, deleteItem, toggleFavourite as apiToggleFavourite } from '../services/closetApi';
import { fetchAllOutfits, RecommendedOutfit } from '../services/outfitApi';
import { fetchWithAuth } from "../services/fetchWithAuth";

import { useUploadQueue } from '../context/UploadQueueContext';

const LAYER_OPTIONS = [
  { value: "", label: "Select Layer" },
  { value: "base_top", label: "Base Top" },
  { value: "base_bottom", label: "Base Bottom" },
  { value: "mid_top", label: "Mid Top" },
  { value: "outerwear", label: "Outerwear" },
  { value: "footwear", label: "Footwear" },
  { value: "headwear", label: "Headwear" },
  { value: 'mid_bottom', label: 'Mid Bottom' },
];

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
    { value: 'JACKET', label: 'Jacket' },
    { value: 'RAINCOAT', label: 'Raincoat' },
    // etc.
  ],
  footwear: [
    { value: 'SHOES', label: 'Shoes' },
    { value: 'BOOTS', label: 'Boots' },
  ],
  headwear: [
    { value: 'BEANIE', label: 'Beanie' },
    { value: 'HAT', label: 'Hat' },
  ],
  accessory: [
    { value: 'SCARF', label: 'Scarf' },
    { value: 'GLOVES', label: 'Gloves' },
  ],
};


const STYLE_OPTIONS = [
  { value: "", label: "Select Style" },
  { value: "Formal", label: "Formal" },
  { value: "Casual", label: "Casual" },
  { value: "Athletic", label: "Athletic" },
  { value: "Party", label: "Party" },
  { value: "Business", label: "Business" },
  { value: "Outdoor", label: "Outdoor" },
];

const MATERIAL_OPTIONS = [
  { value: "", label: "Select Material" },
  { value: "Cotton", label: "Cotton" },
  { value: "Wool", label: "Wool" },
  { value: "Polyester", label: "Polyester" },
  { value: "Leather", label: "Leather" },
  { value: "Nylon", label: "Nylon" },
  { value: "Fleece", label: "Fleece" },
];
const COLOR_PALETTE = [
  { hex: "#E53935", label: "Red" },
  { hex: "#8E24AA", label: "Purple" },
  { hex: "#3949AB", label: "Blue" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#43A047", label: "Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#F4511E", label: "Orange" },
  { hex: "#6D4C41", label: "Brown" },
  { hex: "#757575", label: "Grey" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#000000", label: "Black" },
  { hex: "#FFFDD0", label: "Cream" },
];

interface ClosetApiItem {
  id: string;
  category: string;
  layerCategory: string;
  imageUrl: string;
}

type Item = {
  id: string;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  // newly‐editable fields:
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  style?: string;
  material?: string;
  layerCategory?: string;
  // which tab it came from:
  tab?: 'items' | 'outfits' | 'favourites';
};

type TabType = 'items' | 'outfits' | 'favourites';

type UIOutfit = RecommendedOutfit & {
  favorite: boolean;
  tab: 'outfits';
};



export default function ClosetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [items, setItems] = useState<Item[]>([]);
  //const [outfits, setOutfits] = useState<RecommendedOutfit[]>([]);
  const [outfits, setOutfits] = useState<UIOutfit[]>([]);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [layerFilter, setLayerFilter] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; tab: TabType; name: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [showEditSuccess, setShowEditSuccess] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item & { tab: TabType } | null>(null);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedColorHex, setEditedColorHex] = useState('');
  const [editedWarmthFactor, setEditedWarmthFactor] = useState(0);
  const [editedWaterproof, setEditedWaterproof] = useState(false);
  const [editedStyle, setEditedStyle] = useState('');
  const [editedMaterial, setEditedMaterial] = useState('');

  const { queueLength, justFinished, resetJustFinished } = useUploadQueue();





  // useEffect(() => {
  //   const fetchItems = async () => {
  //     try {
  //       const res = await fetchAllItems();
  //       const formattedItems: Item[] = res.data.map((item: any) => ({
  //         id: item.id,
  //         name: item.category,
  //         image: `http://localhost:5001${item.imageUrl}`,
  //         favorite: false,
  //         category: item.category,
  //       }));

  //       setItems(formattedItems);
  //     } catch (error) {
  //       console.error('Error fetching items:', error);
  //     }
  //   };

  //   fetchItems();
  // }, []);

  
useEffect(() => {
  const fetchItems = async () => {
    try {
      const res = await fetchAllItems();
      const formattedItems: Item[] = res.data.map((item: any) => ({
        id: item.id,
        name: item.category,
        image: `http://localhost:5001${item.imageUrl}`,
        favorite: false,
        category: item.category,
        layerCategory: item.layerCategory,
        tab: 'items',
      }));

      // Only overwrite if response has items, OR no uploads happening
      if (formattedItems.length > 0 || queueLength === 0) {
        setItems(formattedItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  fetchItems();
}, [justFinished]);  // Refresh after upload finishes




  // helper to prefix local uploads
  const prefixed = (url: string) =>
    url.startsWith('http') ? url : `http://localhost:5001${url}`;

  // Fetch closet items
  // useEffect(() => {
  //   fetchAllItems()
  //     .then(res => {
  //       setItems(
  //         res.data.map((i: ClosetApiItem) => ({
  //           id: i.id,
  //           name: i.category,
  //           image: prefixed(i.imageUrl),
  //           favorite: false,
  //           category: i.category,
  //           layerCategory: i.layerCategory,
  //           tab: 'items',
  //         }))
  //       );
  //     })
  //     .catch(console.error);
  // }, []);

  // Fetch saved outfits
  useEffect(() => {
    fetchAllOutfits()
      .then(raw => {
        const uiList: UIOutfit[] = raw.map(o => ({
          ...o,
          favorite: false,  // start un‐favorited
          tab: 'outfits',
        }));
        setOutfits(uiList);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const stored = localStorage.getItem(`closet-favs-${token}`);
    if (!stored) return;
    const parsedFavs: Item[] = JSON.parse(stored);
    setFavourites(parsedFavs);

    // mark favourites in items
    setItems(prev =>
      prev.map(x => ({
        ...x,
        favorite: parsedFavs.some(f => f.id === x.id && f.tab === x.tab),
      }))
    );

    // mark favourites in outfits
    setOutfits(prev =>
      prev.map(o => ({
        ...o,
        favorite: parsedFavs.some(f => f.id === o.id && f.tab === 'outfits'),
      }))
    );
  }, []);





  const toggleFavorite = async (item: Item, originTab: 'items' | 'outfits') => {
    const token = localStorage.getItem('token');
    if (!token) return;


    const isFav = favourites.some(f => f.id === item.id && f.tab === originTab);


    const nextFavs = isFav
      ? favourites.filter(f => !(f.id === item.id && f.tab === originTab))
      : [...favourites, { ...item, favorite: true, tab: originTab }];


    setFavourites(nextFavs);
    localStorage.setItem(`closet-favs-${token}`, JSON.stringify(nextFavs));

    setItems(prev =>
      prev.map(i =>
        i.id === item.id ? { ...i, favorite: !i.favorite } : i
      )
    );

    try {
      await apiToggleFavourite(Number(item.id));
    } catch (err) {
      console.error('Server toggle failed', err);

      setFavourites(favourites);
      setItems(items);
      setOutfits(outfits);
    }
  };


  const handleSaveEdit = async () => {
    if (!itemToEdit) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetchWithAuth(
        `http://localhost:5001/api/closet/${itemToEdit.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            layerCategory: itemToEdit.layerCategory,
            category: editedCategory,
            colorHex: editedColorHex,
            warmthFactor: editedWarmthFactor,
            waterproof: editedWaterproof,
            style: editedStyle,
            material: editedMaterial,
          }),
        }
      );
      // if (!res.ok) throw new Error(`Status ${res.status}`);

      if (!res.ok) {
        // try to parse any JSON error message
        let errMsg = `Status ${res.status}`;
        try {
          const body = await res.json();
          errMsg += ` — ${JSON.stringify(body)}`;
        } catch { }
        throw new Error(errMsg);
      }

      setShowEditSuccess(true);

      // update local state…
      const updated = {
        ...itemToEdit,
        layerCategory: itemToEdit.layerCategory,
        category: editedCategory,
        colorHex: editedColorHex,
        warmthFactor: editedWarmthFactor,
        waterproof: editedWaterproof,
        style: editedStyle,
        material: editedMaterial,
      };
      // for items & favourites
      const itemUpdater = (arr: Item[]) => arr.map(i => i.id === updated.id ? updated : i);

      // for outfits
      const outfitUpdater = (arr: UIOutfit[]) =>
        arr.map(o => o.id === updated.id
          ? {
            ...o,  // preserve all the RecommendedOutfit fields plus favorite & tab
            category: updated.category,
            colorHex: updated.colorHex,
            warmthRating: updated.warmthFactor,        // adapt field names if needed
            waterproof: updated.waterproof,
            overallStyle: updated.style,
            // …etc…
          }
          : o
        );

      if (itemToEdit.tab === 'items') {
        setItems(itemUpdater(items));
      } else if (itemToEdit.tab === 'outfits') {
        setOutfits(outfitUpdater(outfits));
      } else {
        setFavourites(itemUpdater(favourites));
      }

    } catch (err) {
      console.error("Save failed", err);
      alert("Could not save changes.");
    } finally {
      setShowEditModal(false);
      setItemToEdit(null);
    }
  };

  const handleRemoveClick = (id: string, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };


  const confirmRemove = async () => {
    if (!itemToRemove) return;
    const { id, tab } = itemToRemove;

    try {
      await deleteItem(id.toString());

      // Filter helpers:
      const filterItems = (arr: Item[]) => arr.filter(i => i.id !== id);
      const filterOutfits = (arr: UIOutfit[]) => arr.filter(o => o.id !== id);

      if (tab === 'items') {
        setItems(filterItems(items));
      } else if (tab === 'outfits') {
        setOutfits(filterOutfits(outfits));
      } else {
        setFavourites(filterItems(favourites));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setShowModal(false);
    }
  };


  const cancelRemove = () => setShowModal(false);

  // Filter & search
  function getCurrentData() {
    let data: any[] =
      activeTab === 'items'
        ? items
        : activeTab === 'favourites'
          ? favourites
          : outfits;


    if (activeCategory) {
      data = data.filter(i => i.category === activeCategory);
    }
    // Search by name
    if (searchQuery && activeTab !== 'outfits') {
      data = data.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return data;
  }

  // Build list of categories for the active layer
  const categoryOptions = layerFilter
    ? CATEGORY_BY_LAYER[layerFilter] || []
    : [];

  // Tab bar categories lowercased except first letter
  const titleCase = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();


  return (

    <div className="w-full max-w-screen-sm mx-auto px-2 sm:px-4">
      {/* Header Image Section */}
      <div
        className="w-screen -mx-4 sm:-mx-6 relative flex items-center justify-center h-48 -mt-2 mb-6"
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
          marginLeft: 'calc(-50vw + 50%)',
          width: '100vw',
          marginTop: '-1rem'
        }}
      >
        <div className="px-6 py-2 border-2 border-white z-10">
          <h1
            className="text-2xl font-bodoni font-light text-center text-white"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            MY CLOSET
          </h1>
        </div>


        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      <div className="max-w-screen-sm mx-auto px-4 pb-12">
        {/* Filters & Search */}
        {/* Layer → Category Filters */}
        <div className="flex flex-wrap justify-center gap-4 my-4">
          {/* Layer Selector */}
          <select
            value={layerFilter}
            onChange={e => {
              setLayerFilter(e.target.value);
              setActiveCategory(null);
            }}
            className="px-4 py-2 border border-black text-black rounded-full"          >
            {LAYER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Category Selector (only if a layer is chosen) */}
          <select
            value={activeCategory || ''}
            onChange={e => setActiveCategory(e.target.value || null)}
            disabled={!layerFilter}
            className="px-4 py-2 border border-black text-black rounded-full disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>



        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-full"

          />
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-6 mb-6">
          {(['items', 'outfits', 'favourites'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={
                `px-4 py-2 border border-black text-black rounded-full transition ` +
                (activeTab === tab
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100')
              }
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}

        </div>


        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {activeTab !== 'outfits'
            ? /* ITEMS & FAVOURITES: one map with edit + heart + remove */
            getCurrentData().map(item => (
              <div key={item.id} className="relative h-[200px] sm:h-[250px] md:h-[280px]">
                <div className="bg-gray-200 w-full h-full rounded-lg overflow-hidden flex flex-col text-xs sm:text-sm">
                  <div className="flex-grow relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      onClick={() => setPreviewImage(item.image)}
                      className="absolute inset-0 w-full h-full object-contain cursor-pointer bg-white"
                    />

                    <button
                      onClick={() => {
                        setItemToEdit({ ...item, tab: activeTab });
                        setEditedCategory(item.category);
                        setEditedColorHex(item.colorHex || '');
                        setEditedWarmthFactor(item.warmthFactor || 0);
                        setEditedWaterproof(item.waterproof || false);
                        setEditedStyle(item.style || '');
                        setEditedMaterial(item.material || '');
                        setShowEditModal(true);
                      }}
                      className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white rounded-full p-1 shadow z-10"
                    >
                      <Pen className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    </button>

                    <button
                      onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
                      className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 sm:p-2 bg-white">
                    <button
                      onClick={() =>
                        toggleFavorite(
                          item,
                          activeTab === 'favourites'
                            ? (favourites.find(f => f.id === item.id)!.tab as 'items' | 'outfits')
                            : activeTab
                        )
                      }
                    >
                      <Heart
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${favourites.some(f => f.id === item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))
            : /* OUTFITS: one map over UIOutfit[] */
            outfits.map(o => (
              <div key={o.id} className="border rounded-lg p-2 bg-white">
                <div className="space-y-1">
                  {/* headwear + accessory */}
                  <div
                    className={`flex justify-center space-x-1 ${o.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory))
                      ? ''
                      : 'hidden'
                      }`}
                  >
                    {o.outfitItems
                      .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                      .map(it => (
                        <img
                          key={it.closetItemId}
                          src={prefixed(it.imageUrl)}
                          className="w-16 h-16 object-contain rounded"
                        />
                      ))}
                  </div>

                  {/* tops */}
                  <div className="flex justify-center space-x-1">
                    {o.outfitItems
                      .filter(it => ['base_top', 'mid_top', 'outerwear'].includes(it.layerCategory))
                      .map(it => (
                        <img
                          key={it.closetItemId}
                          src={prefixed(it.imageUrl)}
                          className="w-16 h-16 object-contain rounded"
                        />
                      ))}
                  </div>

                  {/* bottoms */}
                  <div className="flex justify-center space-x-1">
                    {o.outfitItems
                      .filter(it => it.layerCategory === 'base_bottom')
                      .map(it => (
                        <img
                          key={it.closetItemId}
                          src={prefixed(it.imageUrl)}
                          className="w-16 h-16 object-contain rounded"
                        />
                      ))}
                  </div>

                  {/* footwear */}
                  <div className="flex justify-center space-x-1">
                    {o.outfitItems
                      .filter(it => it.layerCategory === 'footwear')
                      .map(it => (
                        <img
                          key={it.closetItemId}
                          src={prefixed(it.imageUrl)}
                          className="w-14 h-14 object-contain rounded"
                        />
                      ))}
                  </div>
                </div>
              </div>
            ))}
        </div>


        {/* Remove Confirmation */}
        <AnimatePresence>
          {showModal && itemToRemove && (
            <motion.div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <motion.div className="bg-white p-6 rounded-lg">
                <p className="mb-4">Remove “{itemToRemove.name}”?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelRemove} className="px-4 py-2 bg-gray-200 rounded-full">
                    Cancel
                  </button>
                  <button onClick={confirmRemove} className="px-4 py-2 bg-red-500 text-white rounded-full">
                    Remove
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Overlay */}
        <AnimatePresence>
          {previewImage && (
            <motion.div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
              <motion.img src={previewImage} className="max-w-3/4 max-h-3/4 object-contain" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white bg-gray-800 p-2 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEditModal && itemToEdit && (
            <motion.div
              key="edit-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-xl w-80 space-y-4"
              >
                <h2 className="text-xl font-semibold">Edit {itemToEdit.name}</h2>

                {/* Layer */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Layer</label>
                  <select
                    value={itemToEdit.layerCategory || ""}
                    onChange={e =>
                      setItemToEdit(prev => prev && { ...prev, layerCategory: e.target.value })
                    }
                    className="w-full border-black rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {LAYER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={editedCategory}
                    onChange={e => setEditedCategory(e.target.value)}
                    className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">Select Category</option>
                    {itemToEdit.layerCategory &&
                      CATEGORY_BY_LAYER[itemToEdit.layerCategory].map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Style & Material */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">Style</label>
                    <select
                      value={editedStyle}
                      onChange={e => setEditedStyle(e.target.value)}
                      className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {STYLE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">Material</label>
                    <select
                      value={editedMaterial}
                      onChange={e => setEditedMaterial(e.target.value)}
                      className="w-full border rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {MATERIAL_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Warmth & Waterproof */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Warmth Factor: <span className="font-semibold">{editedWarmthFactor}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={editedWarmthFactor}
                    onChange={e => setEditedWarmthFactor(+e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="waterproof"
                    type="checkbox"
                    checked={editedWaterproof}
                    onChange={e => setEditedWaterproof(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-teal-600"
                  />
                  <label htmlFor="waterproof" className="text-sm font-medium">Waterproof</label>
                </div>

                {/* Color Palette */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map(c => (
                      <button
                        key={c.hex}
                        title={c.label}
                        type="button"
                        onClick={() => setEditedColorHex(c.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition 
                  ${editedColorHex === c.hex
                            ? "border-teal-500 scale-110 shadow-lg"
                            : "border-gray-300"}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setItemToEdit(null);
                    }}
                    className="px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    // onClick={async () => {
                    //   if (!itemToEdit) return;
                    //   // … your PATCH logic here …
                    // }}
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {showEditSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                🎉 Saved Successfully! 🎉
              </h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Changes have been saved.
              </p>
              <button
                onClick={() => setShowEditSuccess(false)}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

