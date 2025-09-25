// src/pages/ClosetPage.tsx
import { useState, useEffect, useRef } from 'react';
import { Heart, Search, X, Pen, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllItems, deleteItem, toggleFavourite as apiToggleFavourite } from '../services/closetApi';
import { fetchAllOutfits, RecommendedOutfit, deleteOutfit, toggleOutfitFavourite } from '../services/outfitApi';
import { fetchWithAuth } from "../services/fetchWithAuth";
import { useUploadQueue } from '../context/UploadQueueContext';
import { fetchAllEvents } from '../services/eventsApi';
import { getPackingList } from '../services/packingApi';
import TryOnViewer from "../components/tryon/TryOnViewer";
import { getTryOnPhoto, setTryOnPhotoBase64, runTryOnSelf, getTryOnCredits, getTryOnResult } from '../services/tryonApi';

import EditOutfitModal from "../components/EditOutfitModal";
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';

import "../styles/ClosetPage.css";

function isUIOutfit(obj: any): obj is UIOutfit {
  return obj && obj.tab === 'outfits' && 'outfitItems' in obj;
}
function isItem(obj: any): obj is Item {
  return obj && (!obj.tab || obj.tab === 'items');
}

const LAYER_OPTIONS = [
  { value: "", label: "Select Layer" },
  { value: "base_top", label: "Base Top" },
  { value: "base_bottom", label: "Base Bottom" },
  { value: "mid_top", label: "Mid Top" },
  { value: "outerwear", label: "Outerwear" },
  { value: "footwear", label: "Footwear" },
  { value: "headwear", label: "Headwear" },
  { value: "mid_bottom", label: "Mid Bottom" },
];

const CATEGORY_BY_LAYER: Record<string, { value: string; label: string }[]> = {
  base_top: [
    { value: 'TSHIRT', label: 'T-shirt' },
    { value: 'LONGSLEEVE', label: 'Long Sleeve' },
    { value: 'SLEEVELESS', label: 'Sleeveless' },
  ],
  base_bottom: [
    { value: 'PANTS', label: 'Pants' },
    { value: 'JEANS', label: 'Jeans' },
    { value: 'SHORTS', label: 'Shorts' },
    { value: 'SKIRT', label: 'Skirt' },
  ],
  mid_top: [
    { value: 'SWEATER', label: 'Sweater' },
    { value: 'HOODIE', label: 'Hoodie' },
  ],
  outerwear: [
    { value: 'COAT', label: 'Coat' },
    { value: 'BLAZER', label: 'Blazer' },
    { value: 'JACKET', label: 'Jacket' },
    { value: 'RAINCOAT', label: 'Raincoat' },
    { value: 'BLAZER', label: 'Blazer' },
    { value: 'COAT', label: 'Coat' },
  ],
  footwear: [
    { value: 'SHOES', label: 'Shoes' },
    { value: 'BOOTS', label: 'Boots' },
    { value: 'SANDALS', label: 'Sandals' },
    { value: 'HEELS', label: 'Heels' },
  ],
  headwear: [
    { value: 'BEANIE', label: 'Beanie' },
    { value: 'HAT', label: 'Hat' },
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
  { value: "Denim", label: "Denim" },
  { value: "Linen", label: "Linen" },
  { value: "Silk", label: "Silk" },
  { value: "Suede", label: "Suede" },
  { value: "Fabric", label: "Fabric" },
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



type Item = {
  id: string;
  name: string;
  image: string;
  favourite: boolean;
  category: string;
  colorHex?: string;
  dominantColors?: string[];
  warmthFactor?: number;
  waterproof?: boolean;
  style?: string;
  material?: string;
  layerCategory?: string;
  createdAt?: string;
  tab?: 'items' | 'outfits' | 'favourites';
};

type TabType = 'items' | 'outfits' | 'favourites';

type UIOutfit = RecommendedOutfit & {
  favourite: boolean;
  tab: 'outfits';
};

export default function ClosetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<UIOutfit[]>([]);

  const [layerFilter, setLayerFilter] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; tab: TabType; name: string } | null>(null);

  const [showEditSuccess, setShowEditSuccess] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item & { tab: TabType } | null>(null);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedColorHex, setEditedColorHex] = useState('');
  const [editedWarmthFactor, setEditedWarmthFactor] = useState(0);
  const [editedWaterproof, setEditedWaterproof] = useState(false);
  const [editedStyle, setEditedStyle] = useState('');
  const [editedMaterial, setEditedMaterial] = useState('');
  const { queueLength, justFinished } = useUploadQueue();

  const [favView, setFavView] = useState<'items' | 'outfits'>('items');
  const [activeDetailsItem, setActiveDetailsItem] = useState<Item | null>(null);
  const [activeDetailsOutfit, setActiveDetailsOutfit] = useState<UIOutfit | null>(null);

  const [editingOutfit, setEditingOutfit] = useState<UIOutfit | null>(null);

  // Try-On (Mannequin)
  const [showTryOnModal, setShowTryOnModal] = useState(false); // New state for separate try-on modal
  const [tryOnOutfit, setTryOnOutfit] = useState<UIOutfit | null>(null);

  // Try-On (Yourself) modal & state
  const [showSelfTryOnModal, setShowSelfTryOnModal] = useState(false);
  const [selfTryOnOutfit, setSelfTryOnOutfit] = useState<UIOutfit | null>(null);

  // Stored / selected photo
  const [storedTryOnPhoto, setStoredTryOnPhoto] = useState<string | null>(null);
  const [selfPhotoPreview, setSelfPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Waiting…');
  const [stepImages, setStepImages] = useState<string[]>([]);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const progressTimer = useRef<number | null>(null);

  // show credits
  const [credits, setCredits] = useState<{ total: number; subscription: number; on_demand: number } | null>(null);

  const [showSelfPreviewModal, setShowSelfPreviewModal] = useState(false);
  const [selfPreviewUrl, setSelfPreviewUrl] = useState<string | null>(null);
  const [selfPreviewDate, setSelfPreviewDate] = useState<string | null>(null);

  // Global popup (Success/Error)
  const [popup, setPopup] = useState<{ open: boolean; message: string; variant: 'success' | 'error' }>({
    open: false,
    message: '',
    variant: 'success',
  });

  const prettyDate = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

  const showPopup = (message: string, variant: 'success' | 'error' = 'success') =>
    setPopup({ open: true, message, variant });

  useEffect(() => {
    const fetchItemsOnce = async () => {
      try {
        const res = await fetchAllItems();
        const formattedItems: Item[] = res.data.map((item: any) => ({
          id: item.id,
          name: item.category,
          image: absolutize(item.imageUrl, API_BASE),
          favourite: !!item.favourite,
          category: item.category,
          layerCategory: item.layerCategory,
          colorHex: item.colorHex,
          dominantColors: item.dominantColors,
          warmthFactor: item.warmthFactor,
          waterproof: item.waterproof,
          style: item.style,
          material: item.material,
          createdAt: item.createdAt,
          tab: 'items',
        }));
        if (formattedItems.length > 0 || queueLength === 0) {
          setItems(formattedItems);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        showPopup('Failed to load items.', 'error');
      }
    };

    fetchItemsOnce();
  }, [justFinished, queueLength]);

  // Fetch saved outfits
  useEffect(() => {
    fetchAllOutfits()
      .then(raw => {
        const uiList: UIOutfit[] = raw.map(o => ({
          ...o,
          favourite: !!o.favourite,
          tab: 'outfits',
        }));
        setOutfits(uiList);
      })
      .catch(err => {
        console.error(err);
        showPopup('Failed to load outfits.', 'error');
      });
  }, []);

  useEffect(() => {
    if (showModal || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showModal, showEditModal]);

  const onToggleFavourite = async (item: Item | UIOutfit, originTab: 'items' | 'outfits') => {
    if (originTab === 'items') {
      try {
        const res = await apiToggleFavourite(item.id);
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, favourite: res.data.favourite } : i))
        );
      } catch (err) {
        console.error('Server toggle failed', err);
      }
    } else {
      setOutfits(prev =>
        prev.map(o => (o.id === item.id ? { ...o, favourite: !o.favourite } : o))
      );
      try {
        await toggleOutfitFavourite(item.id);
      } catch (err) {
        console.error('Server toggle failed', err);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!itemToEdit) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/closet/${itemToEdit.id}`, {
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
      });

      if (!('ok' in res) || !res.ok) {
        let errMsg = `Status ${(res as any)?.status ?? '??'}`;
        try {
          const body = await (res as any).json?.();
          errMsg += ` — ${JSON.stringify(body)}`;
        } catch { }
        throw new Error(errMsg);
      }

      setShowEditSuccess(true);

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

      if (itemToEdit.tab === 'items') {
        setItems(prev => prev.map(i => (i.id === updated.id ? { ...i, ...updated } : i)));
      } else if (itemToEdit.tab === 'outfits') {
        setOutfits(prev =>
          prev.map(o =>
            o.id === updated.id
              ? {
                ...o,
                category: updated.category,
                colorHex: updated.colorHex,
                warmthRating: updated.warmthFactor,
                waterproof: updated.waterproof,
                overallStyle: updated.style,
              }
              : o
          )
        );
      }
    } catch (err) {
      console.error('Save failed', err);
      showPopup('Could not save changes.', 'error');
    } finally {
      setShowEditModal(false);
      setItemToEdit(null);
    }
  };

  const handleRemoveClick = (id: string, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

  const isItemInAnyOutfit = (closetItemId: string) =>
    outfits.some(o => o.outfitItems?.some(it => String(it.closetItemId) === String(closetItemId)));

  const isItemPackedAnywhere = async (closetItemId: string): Promise<boolean> => {
    try {
      const events = await fetchAllEvents();
      const subset = events.slice(0, 12); 
      const checks = subset.map(async ev => {
        try {
          const list = await getPackingList(ev.id).catch(() => null);
          const inItems =
            !!list &&
            Array.isArray((list as any).items) &&
            (list as any).items.some((r: any) => String(r.closetItemId) === String(closetItemId));
          return !!inItems;
        } catch {
          return false;
        }
      });
      const results = await Promise.allSettled(checks);
      return results.some(r => r.status === 'fulfilled' && r.value === true);
    } catch {
      return false;
    }
  };

  const confirmRemove = async () => {
    if (!itemToRemove) return;
    const { id, tab } = itemToRemove;

    try {
      if (tab === 'outfits') {
        await deleteOutfit(id);
        setOutfits(prev => prev.filter(o => o.id !== id));
        showPopup('Outfit deleted.', 'success');
        return;
      }

      if (isItemInAnyOutfit(id)) {
        showPopup('You can’t delete this item because it’s part of one or more outfits. Remove it from those outfits first.', 'error');
        return;
      }

      const packed = await isItemPackedAnywhere(id);
      if (packed) {
        showPopup('You can’t delete this item because it’s packed for a trip. Remove it from the packing list first.', 'error');
        return;
      }

      await deleteItem(id);

      setItems(prev => prev.filter(i => i.id !== id));
      setOutfits(prev =>
        prev
          .map(o => ({
            ...o,
            outfitItems: o.outfitItems.filter(it => String(it.closetItemId) !== String(id)),
          }))
          .filter(o => (o.outfitItems?.length ?? 0) > 0)
      );

      showPopup('Item deleted.', 'success');
    } catch (err: any) {
      console.error('Delete failed:', err);
      const raw =
        err?.response?.data?.message ||
        err?.message ||
        '';
      const friendly =
        /outfit/i.test(raw)
          ? 'You can’t delete this item because it’s part of an outfit. Remove it from the outfit first.'
          : /pack/i.test(raw)
            ? 'You can’t delete this item because it’s packed for a trip. Remove it from the packing list first.'
            : 'Delete failed. Try again.';
      showPopup(friendly, 'error');
    } finally {
      setShowModal(false);
      setItemToRemove(null);
    }
  };

  const cancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  function getCurrentData() {
    let data: any[] =
      activeTab === 'items'
        ? items
        : activeTab === 'favourites'
          ? [...items.filter(i => i.favourite), ...outfits.filter(o => o.favourite)]
          : outfits;

    if (activeCategory) {
      data = data.filter(i => i.category === activeCategory);
    }
    if (searchQuery && activeTab !== 'outfits') {
      data = data.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (activeTab === 'items' || activeTab === 'favourites') {
      data = data.sort((a, b) => Number(b.favourite) - Number(a.favourite));
    }
    return data;
  }



  // -------------------------- 
  //  Virtual Try on Yourself 
  // --------------------------

  function resolveImgSrc(u?: string): string {
    if (!u) return '';
    if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u;
    return absolutize(u, API_BASE);
  }

  async function resizeToDataUrl(file: File, maxW = 1280, maxH = 1280): Promise<string> {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });

    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);

    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function openSelfTryOn(outfit: UIOutfit) {
    setSelfTryOnOutfit(outfit);
    setShowSelfTryOnModal(true);
    setFinalImageUrl(null);
    setStepImages([]);
    setProgress(0);
    setProgressLabel('Checking your try-on photo…');

    try {
      const [photoRes, creditRes] = await Promise.allSettled([getTryOnPhoto(), getTryOnCredits()]);
      if (photoRes.status === 'fulfilled') {
        setStoredTryOnPhoto(photoRes.value?.tryOnPhoto ?? null);
        setSelfPhotoPreview(photoRes.value?.tryOnPhoto ?? null);
      }
      if (creditRes.status === 'fulfilled') setCredits(creditRes.value);
    } catch {
      // non-blocking
    } finally {
      setProgressLabel('Ready');
    }
  }

  function closeSelfTryOn() {
    setShowSelfTryOnModal(false);
    setSelfTryOnOutfit(null);
    setSelfPhotoPreview(null);
    setIsUploadingPhoto(false);
    setIsGenerating(false);
    setProgress(0);
    setProgressLabel('Waiting…');
    setFinalImageUrl(null);
    setStepImages([]);
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // const b64 = await fileToBase64(f);
    const b64 = await resizeToDataUrl(f, 1280, 1280); // smaller and faster than raw
    setSelfPhotoPreview(b64);
  }

  async function saveTryOnPhoto() {
    if (!selfPhotoPreview) return;
    setIsUploadingPhoto(true);
    try {
      const res = await setTryOnPhotoBase64(selfPhotoPreview);
      setStoredTryOnPhoto(res.tryOnPhoto || null);
      setProgressLabel('Saved your try-on photo');
      showPopup('Try-on photo saved.', 'success');
    } catch (err) {
      console.error(err);
      showPopup('Failed to save try-on photo.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function startFakeProgress(maxBeforeFinish = 85) {
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    setProgress(5);
    progressTimer.current = window.setInterval(() => {
      setProgress(p => {
        const next = p + Math.random() * 4 + 1;
        return next >= maxBeforeFinish ? maxBeforeFinish : next;
      });
    }, 500) as unknown as number;
  }

  async function startGeneration() {
    if (!selfTryOnOutfit) return;
    if (!storedTryOnPhoto) {
      showPopup('Please upload and save a full-body photo first.', 'error');
      return;
    }

    const closetItemIds = selfTryOnOutfit.outfitItems.map(it => it.closetItemId);

    setIsGenerating(true);
    setProgressLabel('Generating outfit…');
    startFakeProgress(88);

    try {
      const res = await runTryOnSelf({
        outfitId: selfTryOnOutfit?.id,
        useTryOnPhoto: true,
        closetItemIds,
        mode: 'balanced',
        returnBase64: false,
      });

      // Stop fake progress, finish to 100 after a short delay
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setStepImages(res.stepOutputs || []);
      setProgressLabel('Finalizing…');
      setProgress(97);

      const url = res.finalUrl || (res.finalBase64 ? res.finalBase64 : null);
      setFinalImageUrl(url);
      setTimeout(() => setProgress(100), 400);
      setProgressLabel('Done');
    } catch (err: any) {
      console.error(err);
      showPopup(err?.message || 'Try-on failed.', 'error');
      setProgressLabel('Failed');
    } finally {
      setIsGenerating(false);
    }
  }

  async function openSelfTryOnOrPreview(outfit: UIOutfit) {
    try {
      const hit = await getTryOnResult(outfit.id);
      if (hit?.finalImageUrl) {
        setSelfPreviewUrl(hit.finalImageUrl);
        setSelfPreviewDate(new Date(hit.createdAt).toLocaleString());
        setSelfTryOnOutfit(outfit);
        setShowSelfPreviewModal(true);
        return;
      }
    } catch {
      // ignore and fall through
    }
    await openSelfTryOn(outfit);
  }

  return (
    <div
      className="ml-[calc(-50vw+50%)] flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0"
      style={{ paddingTop: 0 }}
    >
      {/* Header Image Section */}
      <div className="relative w-full h-32 sm:h-56 md:h-64 lg:h-48 mb-6 mt-0 !mt-0">
        <div
          className="absolute inset-0 bg-cover bg-top md:bg-center"
          style={{ backgroundImage: `url(/header.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex h-full items-center justify-center px-0">

          <div className="px-6 py-2 border-2 border-white">
            <h1 className="text-2xl font-bodoni font-light text-center text-white">
              MY CLOSET
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pb-12">
        {/* Filters & Search */}
        <div className="flex flex-wrap justify-center gap-4 my-4">
          <select
            value={layerFilter}
            onChange={e => {
              setLayerFilter(e.target.value);
              setActiveCategory(null);
            }}
            className="px-4 py-2 border border-black text-black rounded-full"
          >
            {LAYER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={activeCategory || ''}
            onChange={e => setActiveCategory(e.target.value || null)}
            disabled={!layerFilter}
            className="px-4 py-2 border border-black text-black rounded-full disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {(CATEGORY_BY_LAYER[layerFilter] || []).map(opt => (
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
                (activeTab === tab ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100')
              }
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        {activeTab === 'favourites' ? (
          <div>
            {/* --- ITEMS/OUTFITS TOGGLE BUTTONS --- */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                className={`px-4 py-2 rounded-full border transition ${favView === 'items' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setFavView('items')}
              >
                Items
              </button>
              <button
                className={`px-4 py-2 rounded-full border transition ${favView === 'outfits' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setFavView('outfits')}
              >
                Outfits
              </button>
            </div>

            {favView === 'items' ? (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {items.filter(i => i.favourite).length === 0 ? (
                    <p className="col-span-full text-gray-400 italic text-center">No favourite items yet.</p>
                  ) : (
                    items.filter(i => i.favourite).map(entry => (
                      <div key={entry.id} className="relative h-[200px] sm:h-[250px] md:h-[280px]">
                        <div className="bg-transparent w-full h-full rounded-xl overflow-hidden flex flex-col text-xs sm:text-sm shadow-md shadow-gray-300 hover:shadow-lg transition">
                          <div className="flex-grow relative">
                            <img
                              src={entry.image}
                              alt={entry.name}
                              onClick={() => setActiveDetailsItem(entry)}
                              className="absolute inset-0 w-full h-full object-contain cursor-pointer bg-white"

                            />
                            <button
                              onClick={() => {
                                setItemToEdit({ ...entry, tab: 'items' });
                                setEditedCategory(entry.category);
                                setEditedColorHex(entry.colorHex || '');
                                setEditedWarmthFactor(entry.warmthFactor || 0);
                                setEditedWaterproof(entry.waterproof || false);
                                setEditedStyle(entry.style || '');
                                setEditedMaterial(entry.material || '');
                                setShowEditModal(true);
                              }}
                              className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white rounded-full p-1 shadow z-10"
                            >
                              <Pen className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleRemoveClick(entry.id, 'items', entry.name)}
                              className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 sm:p-2 bg-white">
                            <button onClick={() => onToggleFavourite(entry, 'items')}>
                              <Heart
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {outfits.filter(o => o.favourite).length === 0 ? (
                    <p className="col-span-full text-gray-400 italic text-center">No favourite outfits yet.</p>
                  ) : (
                    outfits.filter(o => o.favourite).map(entry => (
                      <div
                        key={entry.id}
                        className="
    relative bg-white border rounded-xl p-2 w-full cursor-pointer
    shadow-lg shadow-black/10 dark:shadow-black/40
    hover:shadow-2xl hover:shadow-black/20
    transition-transform transition-shadow duration-200
    
  "
                        onClick={() => setActiveDetailsOutfit(entry)}
                      >
                        <button
                          onClick={() => handleRemoveClick(entry.id, 'outfits', 'Outfit')}
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                        </button>
                        <div className="space-y-1">
                          {/* headwear + accessory */}
                          <div className={`${entry.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory)) ? 'flex' : 'hidden'} justify-center space-x-1`}>
                            {entry.outfitItems
                              .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                              .map(it => (
                                <img
                                  key={it.closetItemId}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  alt=""
                                  className="w-8 h-8 object-contain rounded"
                                />
                              ))}
                          </div>
                          {/* tops */}
                          <div className="flex justify-center space-x-1">
                            {entry.outfitItems
                              .filter(it => ['base_top', 'mid_top', 'outerwear'].includes(it.layerCategory))
                              .map(it => (
                                <img
                                  key={it.closetItemId}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  alt=""
                                  className="w-16 h-16 object-contain rounded"
                                />
                              ))}
                          </div>
                          {/* bottoms */}
                          <div className="flex justify-center space-x-1">
                            {entry.outfitItems
                              .filter(it => it.layerCategory === 'base_bottom')
                              .map(it => (
                                <img
                                  key={it.closetItemId}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  alt=""
                                  className="w-16 h-16 object-contain rounded"
                                />
                              ))}
                          </div>
                          {/* footwear */}
                          <div className="flex justify-center space-x-1">
                            {entry.outfitItems
                              .filter(it => it.layerCategory === 'footwear')
                              .map(it => (
                                <img
                                  key={it.closetItemId}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  alt=""
                                  className="w-14 h-14 object-contain rounded"
                                />
                              ))}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavourite(entry, 'outfits');
                          }}
                          aria-label={entry.favourite ? 'Unfavourite outfit' : 'Favourite outfit'}
                          className="absolute bottom-2 left-2 z-10"
                        >
                          <Heart
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                          />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // NORMAL GRID FOR ITEMS / OUTFITS TAB
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {getCurrentData().map(entry => {
              if (isItem(entry)) {
                return (
                  <div key={entry.id} className="relative h-[200px] sm:h-[250px] md:h-[280px]">
                    <div className="hover:shadow-2xl hover:shadow-black/20 bg-transparent w-full h-full rounded-xl overflow-hidden flex flex-col text-xs sm:text-sm shadow-md shadow-gray-300 hover:shadow-lg transition">
                      <div className="flex-grow relative">
                        <img
                          src={entry.image}
                          alt={entry.name}
                          onClick={() => setActiveDetailsItem(entry)}
                          className="absolute inset-0 w-full h-full object-contain cursor-pointer bg-white"
                        />
                        <button
                          onClick={() => {
                            setItemToEdit({ ...entry, tab: activeTab });
                            setEditedCategory(entry.category);
                            setEditedColorHex(entry.colorHex || '');
                            setEditedWarmthFactor(entry.warmthFactor || 0);
                            setEditedWaterproof(entry.waterproof || false);
                            setEditedStyle(entry.style || '');
                            setEditedMaterial(entry.material || '');
                            setShowEditModal(true);
                          }}
                          className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-white rounded-full p-1 shadow z-10"
                        >
                          <Pen className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveClick(entry.id, 'items', entry.name);
                          }}
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 sm:p-2 bg-white">
                        <button onClick={() => onToggleFavourite(entry, 'items')}>
                          <Heart
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else if (isUIOutfit(entry)) {
                return (
                  <div
                    key={entry.id}
                    className="
    relative bg-white border rounded-xl p-2 w-full cursor-pointer
    shadow-lg shadow-black/10 dark:shadow-black/40
    hover:shadow-2xl hover:shadow-black/20
    transition-transform transition-shadow duration-200
    
  "
                    onClick={() => setActiveDetailsOutfit(entry)}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveClick(entry.id, 'outfits', 'Outfit');
                      }}
                      className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                    </button>

                    <div className="space-y-1">
                      {/* headwear + accessory */}
                      <div className={`${entry.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory)) ? 'flex' : 'hidden'} justify-center space-x-1`}>
                        {entry.outfitItems
                          .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                          .map(it => (
                            <img
                              key={it.closetItemId}
                              src={absolutize(it.imageUrl, API_BASE)}
                              alt=""
                              className="w-8 h-8 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* tops */}
                      <div className="flex justify-center space-x-1">
                        {entry.outfitItems
                          .filter(it => ['base_top', 'mid_top', 'outerwear'].includes(it.layerCategory))
                          .map(it => (
                            <img
                              key={it.closetItemId}
                              src={absolutize(it.imageUrl, API_BASE)}
                              alt=""
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* bottoms */}
                      <div className="flex justify-center space-x-1">
                        {entry.outfitItems
                          .filter(it => it.layerCategory === 'base_bottom' || it.layerCategory === 'mid_bottom')
                          .map(it => (
                            <img
                              key={it.closetItemId}
                              src={absolutize(it.imageUrl, API_BASE)}
                              alt=""
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* footwear */}
                      <div className="flex justify-center space-x-1">
                        {entry.outfitItems
                          .filter(it => it.layerCategory === 'footwear')
                          .map(it => (
                            <img
                              key={it.closetItemId}
                              src={absolutize(it.imageUrl, API_BASE)}
                              alt=""
                              className="w-14 h-14 object-contain rounded"
                            />
                          ))}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavourite(entry, 'outfits');
                      }}
                      aria-label={entry.favourite ? 'Unfavourite outfit' : 'Favourite outfit'}
                      className="absolute bottom-2 left-2 z-10"
                    >
                      <Heart
                        className={`h-4 w-4 sm:h-5 sm:w-5 transition ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Outfit Details Modal (always shows thumbnails, no try-on toggle) */}
        <AnimatePresence>
          {activeDetailsOutfit && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl min-w-0 p-8 relative flex flex-col gap-4"
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveDetailsOutfit(null)}
                  className="absolute top-3 right-3 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-30"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Favourite Heart (Top Left) */}
                <button
                  onClick={() => activeDetailsOutfit && onToggleFavourite(activeDetailsOutfit, 'outfits')}
                  className="absolute top-3 left-3 z-20"
                >
                  <Heart
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition 
              ${activeDetailsOutfit.favourite ? 'fill-red-500 text-red-500' : 'text-gray-300'}`}
                  />
                </button>

                {/* Static thumbnails */}
                <div className="flex justify-center mb-2">
                  <div className="space-y-1">
                    {/* headwear + accessory */}
                    <div className={`${activeDetailsOutfit.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory)) ? 'flex' : 'hidden'} justify-center space-x-1`}>
                      {activeDetailsOutfit.outfitItems
                        .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            src={absolutize(it.imageUrl, API_BASE)}
                            alt=""
                            className="w-8 h-8 object-contain rounded"
                          />
                        ))}
                    </div>
                    {/* tops */}
                    <div className="flex justify-center space-x-1">
                      {activeDetailsOutfit.outfitItems
                        .filter(it => ['base_top', 'mid_top', 'outerwear'].includes(it.layerCategory))
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            src={absolutize(it.imageUrl, API_BASE)}
                            alt=""
                            className="w-16 h-16 object-contain rounded"
                          />
                        ))}
                    </div>
                    {/* bottoms */}
                    <div className="flex justify-center space-x-1">
                      {activeDetailsOutfit.outfitItems
                        .filter(it => it.layerCategory === 'base_bottom' || it.layerCategory === 'mid_bottom')
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            src={absolutize(it.imageUrl, API_BASE)}
                            alt=""
                            className="w-16 h-16 object-contain rounded"
                          />
                        ))}
                    </div>
                    {/* footwear */}
                    <div className="flex justify-center space-x-1">
                      {activeDetailsOutfit.outfitItems
                        .filter(it => it.layerCategory === 'footwear')
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            src={absolutize(it.imageUrl, API_BASE)}
                            alt=""
                            className="w-14 h-14 object-contain rounded"
                          />
                        ))}
                    </div>
                  </div>
                </div>

                {/* Outfit Info */}
                <div className="space-y-2 text-gray-700 text-base mt-2">
                  <div><span className="font-semibold">Warmth Rating:</span> {activeDetailsOutfit.warmthRating}</div>
                  <div><span className="font-semibold">Waterproof:</span> {activeDetailsOutfit.waterproof ? "Yes" : "No"}</div>
                  <div><span className="font-semibold">Overall Style:</span> {activeDetailsOutfit.overallStyle}</div>
                  {typeof activeDetailsOutfit.userRating === 'number' && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Your Rating:</span>
                      {Array(activeDetailsOutfit.userRating || 0)
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-teal-500" />
                        ))}
                      <span className="ml-1">{activeDetailsOutfit.userRating}/5</span>
                    </div>
                  )}
                </div>

                {/* Try On Avatar */}
                <div className="flex justify-end gap-2 pt-6">
                  <button
                    onClick={() => {
                      if (activeDetailsOutfit) {
                        setTryOnOutfit(activeDetailsOutfit); 
                        setShowTryOnModal(true);
                        setActiveDetailsOutfit(null); 
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
                  >
                    Try On Avatar
                  </button>

                  {/*Try On Yourself */}
                  <button
                    onClick={() => {
                      if (!activeDetailsOutfit) return;
                      // openSelfTryOn(activeDetailsOutfit);
                      openSelfTryOnOrPreview(activeDetailsOutfit);
                      setActiveDetailsOutfit(null);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Try On Yourself
                  </button>

                  <button
                    onClick={() => {
                      if (!activeDetailsOutfit) return;
                      setEditingOutfit(activeDetailsOutfit);
                      setActiveDetailsOutfit(null);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setItemToRemove({ id: activeDetailsOutfit!.id, tab: 'outfits', name: 'Outfit' });
                      setShowModal(true);
                      setActiveDetailsOutfit(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Try On Mannequin Modal */}
        <AnimatePresence>
          {showTryOnModal && tryOnOutfit && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTryOnModal(false);
                setTryOnOutfit(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl relative flex flex-col"
                style={{
                  width: 'min(95vw, 1200px)',
                  height: 'min(95vh, 800px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowTryOnModal(false);
                    setTryOnOutfit(null);
                  }}
                  className="absolute top-3 right-3 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-[101]"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Try-On Viewer - SIMPLIFIED CONTAINER */}
                <div
                  className="flex-1 relative"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px'
                  }}
                >
                  <TryOnViewer
                    mannequinUrl="/mannequins/front_v1.png"
                    poseId="front_v1"
                    outfitItems={tryOnOutfit.outfitItems.map(it => ({
                      closetItemId: it.closetItemId,
                      imageUrl: it.imageUrl,
                      layerCategory: it.layerCategory as any,
                    }))}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Try-On Yourself Modal */}
        <AnimatePresence>
          {showSelfTryOnModal && selfTryOnOutfit && (
            <motion.div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSelfTryOn}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl relative flex flex-col w-[min(95vw,1100px)] h-[min(95vh,820px)]"
              >
                {/* Close */}
                <button
                  onClick={closeSelfTryOn}
                  className="absolute top-3 right-3 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-[111]"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="px-5 pt-5">
                  <h2 className="text-xl font-semibold">Try On Yourself</h2>
                  <p className="text-sm text-gray-500">
                    Use your stored full-body photo or upload a new one, then we’ll put this outfit on you.
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-hidden">
                  {/* Left: Photo selection */}
                  <div className="border rounded-xl p-4 overflow-auto">
                    <h3 className="font-medium mb-2">1) Your full-body photo</h3>

                    {selfPhotoPreview ? (
                      <div className="relative">
                        <img
                          src={resolveImgSrc(selfPhotoPreview || '')}
                          alt="Your try-on photo"
                          className="w-full max-h-80 object-contain rounded-lg border"
                        />
                        <div className="flex gap-2 mt-3">
                          <label className="px-3 py-1.5 border rounded-full cursor-pointer hover:bg-gray-50">
                            Replace Photo
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={handlePickPhoto}
                            />
                          </label>
                          <button
                            disabled={isUploadingPhoto}
                            onClick={saveTryOnPhoto}
                            className="px-3 py-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                          >
                            {isUploadingPhoto ? 'Saving…' : 'Save as My Try-On Photo'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-lg p-6 text-center">
                        <p className="text-gray-600 mb-3">No photo yet. Upload or take one:</p>
                        <label className="inline-block px-4 py-2 border rounded-full cursor-pointer hover:bg-gray-50">
                          Choose Photo
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handlePickPhoto}
                          />
                        </label>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Tip: Stand straight, good lighting, no occlusions. Face & shoes visible if possible.
                    </div>

                    {credits && (
                      <div className="mt-4 text-sm text-gray-600">
                        <span className="font-medium">Credits:</span> {credits.total} total
                        <span className="mx-2">•</span> sub: {credits.subscription}
                        <span className="mx-2">•</span> on-demand: {credits.on_demand}
                      </div>
                    )}
                  </div>

                  {/* Right: Generate & result */}
                  <div className="border rounded-xl p-4 overflow-auto">
                    <h3 className="font-medium mb-2">2) Generate</h3>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{progressLabel}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={startGeneration}
                        disabled={!storedTryOnPhoto || isGenerating}
                        className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-60"
                      >
                        {isGenerating ? 'Generating…' : 'Try On Outfit'}
                      </button>
                      <button
                        onClick={() => {
                          setFinalImageUrl(null);
                          setStepImages([]);
                          setProgress(0);
                          setProgressLabel('Ready');
                        }}
                        className="px-4 py-2 rounded-full border hover:bg-gray-50"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Result */}
                    {finalImageUrl ? (
                      <div className="space-y-3">
                        <img
                          src={resolveImgSrc(finalImageUrl)}
                          alt="Final try-on"
                          className="w-full max-h-[520px] object-contain rounded-lg border"
                        />
                        {stepImages?.length > 1 && (
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Construction (step-by-step)</div>
                            <div className="flex flex-wrap gap-2">
                              {stepImages.map((s, idx) => (
                                <img
                                  key={idx}
                                  src={resolveImgSrc(s)}
                                  alt={`Step ${idx + 1}`}
                                  className="w-24 h-24 object-contain rounded border"
                                  title={`Step ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Click <span className="font-medium">Try On Outfit</span> to generate your image. We’ll apply the outfit piece by piece and return the final composite.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last Try-On */}
        <AnimatePresence>
          {showSelfPreviewModal && selfPreviewUrl && selfTryOnOutfit && (
            <motion.div
              className="fixed inset-0 z-[115] flex items-center justify-center bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelfPreviewModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl p-4 w-[min(95vw,900px)]"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Last Try-On</h3>
                  <button
                    onClick={() => setShowSelfPreviewModal(false)}
                    className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selfPreviewDate && (
                  <div className="text-xs text-gray-500 mb-2">Generated: {selfPreviewDate}</div>
                )}

                <img
                  src={resolveImgSrc(selfPreviewUrl)}
                  alt="Cached try-on"
                  className="w-full max-h-[70vh] object-contain rounded border"
                />

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowSelfPreviewModal(false)}
                    className="px-4 py-2 rounded-full border hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowSelfPreviewModal(false);
                      openSelfTryOn(selfTryOnOutfit); 
                    }}
                    className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800"
                  >
                    Generate Again
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item Details Modal */}
        <AnimatePresence>
          {activeDetailsItem && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl
            w-[85vw] sm:w-[70vw] max-w-sm p-4 sm:p-5"
              >
                {/* close */}
                <button
                  onClick={() => setActiveDetailsItem(null)}
                  className="absolute top-3 right-3 text-gray-700 dark:text-gray-200 hover:text-black bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full p-2 z-20"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* favourite (top-left) */}
                <button
                  onClick={() => onToggleFavourite(activeDetailsItem, 'items')}
                  className="absolute top-3 left-3 z-20"
                  aria-label={activeDetailsItem.favourite ? 'Unfavourite item' : 'Favourite item'}
                >
                  <Heart
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition ${activeDetailsItem.favourite ? 'fill-red-500 text-red-500' : 'text-gray-300'
                      }`}
                  />
                </button>

                {/* image */}
                <div className="flex justify-center mb-3">
                  <img
                    src={activeDetailsItem.image}
                    alt={activeDetailsItem.name}
                    className="max-h-56 sm:max-h-64 object-contain rounded-lg bg-white"
                  />
                </div>

                {/* info */}
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <div><span className="font-semibold">Name:</span> {activeDetailsItem.name}</div>
                  <div><span className="font-semibold">Layer:</span> {activeDetailsItem.layerCategory || '—'}</div>
                  <div><span className="font-semibold">Category:</span> {activeDetailsItem.category || '—'}</div>
                  <div><span className="font-semibold">Style:</span> {activeDetailsItem.style || '—'}</div>
                  <div><span className="font-semibold">Material:</span> {activeDetailsItem.material || '—'}</div>
                  <div><span className="font-semibold">Warmth:</span> {typeof activeDetailsItem.warmthFactor === 'number' ? activeDetailsItem.warmthFactor : '—'}</div>
                  <div><span className="font-semibold">Waterproof:</span> {activeDetailsItem.waterproof ? 'Yes' : 'No'}</div>
                  <div><span className="font-semibold">Added:</span> {prettyDate(activeDetailsItem.createdAt)}</div>

                  {/* colors */}
                  <div className="pt-1">
                    <div className="font-semibold mb-1">Colors</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* primary color */}
                      {activeDetailsItem.colorHex && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full border border-gray-300 shadow-sm"
                            style={{ backgroundColor: activeDetailsItem.colorHex }}
                            title={activeDetailsItem.colorHex}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{activeDetailsItem.colorHex}</span>
                        </div>
                      )}

                      {/* extracted dominant colors */}
                      {(activeDetailsItem.dominantColors || []).slice(0, 12).map((hex) => (
                        <div key={hex} className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full border border-gray-300 shadow-sm"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{hex}</span>
                        </div>
                      ))}

                      {!activeDetailsItem.colorHex && (!activeDetailsItem.dominantColors || activeDetailsItem.dominantColors.length === 0) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No colors detected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="flex justify-end gap-2 pt-5">
                  <button
                    onClick={() => {
                      setItemToEdit({ ...activeDetailsItem, tab: 'items' });
                      setEditedCategory(activeDetailsItem.category);
                      setEditedColorHex(activeDetailsItem.colorHex || '');
                      setEditedWarmthFactor(activeDetailsItem.warmthFactor || 0);
                      setEditedWaterproof(!!activeDetailsItem.waterproof);
                      setEditedStyle(activeDetailsItem.style || '');
                      setEditedMaterial(activeDetailsItem.material || '');
                      setShowEditModal(true);
                      setActiveDetailsItem(null);
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setItemToRemove({ id: activeDetailsItem.id, tab: 'items', name: activeDetailsItem.name });
                      setShowModal(true);
                      setActiveDetailsItem(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Remove Confirmation */}
        <AnimatePresence>
          {showModal && itemToRemove && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white p-6 rounded-lg z-60 relative"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              >
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


        {/* Edit Modal */}
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
                    onChange={e => setItemToEdit(prev => prev && { ...prev, layerCategory: e.target.value })}
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
                      (CATEGORY_BY_LAYER[itemToEdit.layerCategory] || []).map(o => (
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
                        className={`w-7 h-7 rounded-full border-2 transition ${editedColorHex === c.hex ? "border-teal-500 scale-110 shadow-lg" : "border-gray-300"}`}
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
              <h2 className="text-xl font-livvic mb-2 text-gray-900 dark:text-gray-100">
                Saved Successfully!
              </h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">Changes have been saved.</p>
              <button
                onClick={() => setShowEditSuccess(false)}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {editingOutfit && (
          <EditOutfitModal
            outfitId={editingOutfit.id}
            initialStyle={editingOutfit.overallStyle}
            initialRating={editingOutfit.userRating}
            initialItems={editingOutfit.outfitItems.map(it => ({
              closetItemId: it.closetItemId,
              layerCategory: it.layerCategory,
              imageUrl: it.imageUrl,
              category: it.category,
            }))}
            onClose={() => setEditingOutfit(null)}
            onSaved={(updated) => {
              setOutfits(prev =>
                prev.map(o =>
                  o.id === updated.id
                    ? {
                      ...o,
                      overallStyle: updated.overallStyle,
                      userRating: updated.userRating ?? o.userRating,
                      outfitItems: (updated.outfitItems || []).map((it: any) => ({
                        closetItemId: it.closetItemId,
                        layerCategory: it.layerCategory,
                        imageUrl:
                          it.imageUrl && it.imageUrl.length > 0
                            ? it.imageUrl
                            : absolutize(`/uploads/${it?.closetItem?.filename ?? ""}`, API_BASE),
                        category: it?.closetItem?.category ?? it.category,
                      })),
                    }
                    : o
                )
              );
              showPopup('Outfit updated.', 'success');
            }}
          />
        )}
      </div>

      {/* Global popup */}
      {popup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              {popup.variant === 'success' ? 'Success!' : 'Error'}
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">{popup.message}</p>
            <button
              onClick={() => setPopup(p => ({ ...p, open: false }))}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}