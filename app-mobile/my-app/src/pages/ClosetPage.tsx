// src/pages/ClosetPage.tsx
import { useState, useEffect } from 'react';
import { Heart, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllItems, deleteItem } from '../services/closetApi';
import { fetchAllOutfits, RecommendedOutfit } from '../services/outfitApi';

interface ClosetApiItem {
  id: string;
  category: string;
  imageUrl: string;
}

type Item = {
  id: string;
  name: string;
  image: string;
  favorite: boolean;
  category: string;
  tab?: 'items' | 'outfits';
};
type TabType = 'items' | 'outfits' | 'favourites';

export default function ClosetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<RecommendedOutfit[]>([]);
  const [favourites, setFavourites] = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; tab: TabType; name: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // helper to prefix local uploads
  const prefixed = (url: string) =>
    url.startsWith('http') ? url : `http://localhost:5001${url}`;

  // 1️⃣ Fetch closet items
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
            tab: 'items',
          }))
        );
      })
      .catch(console.error);
  }, []);

  // 2️⃣ Fetch saved outfits
  useEffect(() => {
    fetchAllOutfits()
      .then(setOutfits)
      .catch(console.error);
  }, []);

  // 3️⃣ Load favourites
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const stored = localStorage.getItem(`closet-favs-${token}`);
    if (!stored) return;
    const favs: Item[] = JSON.parse(stored);
    setFavourites(favs);
    const mark = (list: Item[]) =>
      list.map(x => ({
        ...x,
        favorite: favs.some(f => f.id === x.id && f.tab === x.tab),
      }));
    setItems(mark(items));
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
    if (activeCategory && activeTab !== 'outfits') {
      data = data.filter(i => i.category === activeCategory);
    }
    if (searchQuery && activeTab !== 'outfits') {
      data = data.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return data;
  }
  function getTabCategories() {
    const list = activeTab === 'items' ? items : favourites;
    return Array.from(new Set(list.map(i => i.category)));
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 pb-12">
      {/* Filters & Search */}
      <div className="flex flex-wrap justify-center gap-3 my-4">
        {['All', ...getTabCategories()].map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCategory(cat === 'All' ? null : cat)}
            className={`px-4 py-1 rounded-full border ${
              activeCategory === cat ? 'bg-black text-white' : ''
            }`}
          >
            {cat}
          </button>
        ))}
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
            className={`px-4 py-2 rounded-full ${
              activeTab === t ? 'bg-black text-white' : 'border'
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
                    className={`w-5 h-5 ${
                      item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
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
                    className={`flex justify-center space-x-1 ${
                      o.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory))
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
