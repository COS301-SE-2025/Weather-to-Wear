// src/pages/ClosetPage.tsx
import { useState, useEffect } from 'react';
import { Heart, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllItems, deleteItem } from '../services/closetApi';
import { fetchAllOutfits, RecommendedOutfit } from '../services/outfitApi';

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
  layerCategory: string;
  tab?: 'items' | 'outfits';
};
type TabType = 'items' | 'outfits' | 'favourites';

const LAYER_OPTIONS = [
  { value: '', label: 'All Layers' },
  { value: 'base_top',   label: 'Base Top' },
  { value: 'base_bottom',label: 'Base Bottom' },
  { value: 'mid_top',    label: 'Mid Top' },
  { value: 'mid_bottom', label: 'Mid Bottom' },  // ← added!
  { value: 'outerwear',  label: 'Outerwear' },
  { value: 'footwear',   label: 'Footwear' },
  { value: 'headwear',   label: 'Headwear' },
  { value: 'accessory',  label: 'Accessory' },
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


export default function ClosetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<RecommendedOutfit[]>([]);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [layerFilter, setLayerFilter] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; tab: TabType; name: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // helper to prefix local uploads
  const prefixed = (url: string) =>
    url.startsWith('http') ? url : `http://localhost:5001${url}`;

  // Fetch closet items
  useEffect(() => {
    fetchAllItems()
      .then(res => {
        setItems(
          res.data.map((i: ClosetApiItem) => ({
            id: i.id,
            name: i.category,
            image: prefixed(i.imageUrl),
            favorite: false,
            category: i.category,
            layerCategory: i.layerCategory,
            tab: 'items',
          }))
        );
      })
      .catch(console.error);
  }, []);

  // Fetch saved outfits
  useEffect(() => {
    fetchAllOutfits()
      .then(setOutfits)
      .catch(console.error);
  }, []);

  // Load favourites
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const stored = localStorage.getItem(`closet-favs-${token}`);
    if (!stored) return;
    const favs: Item[] = JSON.parse(stored);
    setFavourites(favs);
    const markFavs = (list: Item[]) =>
      list.map(x => ({
        ...x,
        favorite: favs.some(f => f.id === x.id && f.tab === x.tab),
      }));
    setItems(markFavs(items));
  }, [items]);

  // Toggle favourite
  function toggleFavorite(item: Item, tab: 'items' | 'outfits') {
    const token = localStorage.getItem('token');
    if (!token) return;
    const isFav = favourites.some(f => f.id === item.id && f.tab === tab);
    const updated = isFav
      ? favourites.filter(f => !(f.id === item.id && f.tab === tab))
      : [...favourites, { ...item, favorite: true, tab }];
    setFavourites(updated);
    localStorage.setItem(`closet-favs-${token}`, JSON.stringify(updated));
    if (tab === 'items') {
      setItems(items.map(i => (i.id === item.id ? { ...i, favorite: !i.favorite } : i)));
    }
  }

  // Delete confirm
  function handleRemoveClick(id: string, tab: TabType, name: string) {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  }
  async function confirmRemove() {
    if (!itemToRemove) return;
    try {
      await deleteItem(itemToRemove.id);
      if (itemToRemove.tab === 'items') {
        setItems(items.filter(i => i.id !== itemToRemove.id));
      } else {
        setOutfits(outfits.filter(o => o.id !== itemToRemove.id));
      }
    } catch (err) {
      console.error(err);
    }
    setShowModal(false);
  }
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
          className="px-4 py-2 border rounded-full"
        >
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
          className="px-4 py-2 border rounded-full disabled:opacity-50"
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
        {(['items', 'outfits', 'favourites'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-full ${activeTab === t ? 'bg-black text-white' : 'border'
              }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {activeTab !== 'outfits'
          ? getCurrentData().map(item => (
            <div key={item.id} className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                onClick={() => setPreviewImage(item.image)}
                className="w-full h-full object-contain p-2"
              />
              <button
                onClick={() => handleRemoveClick(item.id, activeTab, item.name)}
                className="absolute top-2 right-2 bg-white p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => toggleFavorite(item, activeTab as any)} className="absolute bottom-2 right-2">
                <Heart
                  className={`w-5 h-5 ${item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                />
              </button>
            </div>
          ))
          : (getCurrentData() as RecommendedOutfit[]).map(o => (
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
                <button onClick={cancelRemove} className="px-4 py-2 bg-gray-200 rounded">
                  Cancel
                </button>
                <button onClick={confirmRemove} className="px-4 py-2 bg-red-500 text-white rounded">
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
    </div>
  );
}
