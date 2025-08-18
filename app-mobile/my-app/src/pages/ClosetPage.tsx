// src/pages/ClosetPage.tsx
import { useState, useEffect } from 'react';
import { Heart, Search, X, Pen, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllItems, deleteItem, toggleFavourite as apiToggleFavourite, toggleFavourite } from '../services/closetApi';
import { fetchAllOutfits, RecommendedOutfit, deleteOutfit } from '../services/outfitApi';
import { fetchWithAuth } from "../services/fetchWithAuth";
import { useUploadQueue } from '../context/UploadQueueContext';
import { fetchAllEvents } from '../services/eventsApi';
import { getPackingList, createPackingList, deletePackingList } from '../services/packingApi';

import StarRating from '../components/StarRating';

import { toggleOutfitFavourite } from '../services/outfitApi';

import EditOutfitModal from "../components/EditOutfitModal";


import { API_BASE } from '../config';
import { absolutize } from '../utils/url';

function isUIOutfit(obj: any): obj is UIOutfit {
  return obj && obj.tab === 'outfits' && 'outfitItems' in obj;
}
function isItem(obj: any): obj is Item {
  return obj && (!obj.tab || obj.tab === 'items');
}
function getSortedOutfits(list: UIOutfit[]) {
  return [...list].sort(
    (a, b) => (b.userRating || 0) - (a.userRating || 0)
  );
}


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
  const [favourites, setFavourites] = useState<(Item | UIOutfit)[]>([]);

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

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [favView, setFavView] = useState<'items' | 'outfits'>('items');
  const [activeDetailsItem, setActiveDetailsItem] = useState<Item | null>(null);
  const [activeDetailsOutfit, setActiveDetailsOutfit] = useState<UIOutfit | null>(null);

  const [editingOutfit, setEditingOutfit] = useState<UIOutfit | null>(null);
    
  // Global popup (Success/Error)
  // ! Merge TAYLOR
  const [popup, setPopup] = useState<{ open: boolean; message: string; variant: 'success' | 'error' }>({
    open: false,
    message: '',
    variant: 'success',
  });

  useEffect(() => {
    const fetchItemsOnce = async () => {
      try {
        const res = await fetchAllItems();
        const formattedItems: Item[] = res.data.map((item: any) => ({
          id: item.id,
          name: item.category,
          // image: `${API_BASE}${item.imageUrl}`,
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
        setPopup({ open: true, message: 'Failed to load items.', variant: 'error' });
      }
    };

    fetchItemsOnce();
  }, [justFinished]);  // Refresh after upload finishes

  // helper to prefix local uploads
  const prefixed = (url: string) =>
    url.startsWith('http') ? url : `${API_BASE}${url}`;

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
        setPopup({ open: true, message: 'Failed to load outfits.', variant: 'error' });
      });
  }, []);

  // Restore favourites from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const stored = localStorage.getItem(`closet-favs-${token}`);
    if (!stored) return;
    const parsedFavs: Item[] = JSON.parse(stored);
    setFavourites(parsedFavs);

    setItems(prev =>
      prev.map(x => ({
        ...x,
        favorite: parsedFavs.some(f => f.id === x.id && f.tab === x.tab),
      }))
    );

    setOutfits(prev =>
      prev.map(o => ({
        ...o,
        favorite: parsedFavs.some(f => f.id === o.id && f.tab === 'outfits'),
      }))
    );
  }, []);

  useEffect(() => {
    if (showModal || showEditModal || previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showModal, showEditModal, previewImage]);

  const toggleFavourite = async (item: Item | UIOutfit, originTab: 'items' | 'outfits') => {
    if (originTab === 'items') {
      try {
        // Await the server and get new fav value
        const res = await apiToggleFavourite(item.id);
        setItems(prev =>
          prev.map(i =>
            i.id === item.id ? { ...i, favourite: res.data.favourite } : i
          )
        );
      } catch (err) {
        console.error('Server toggle failed', err);
        // Optionally revert local state or show an error
      }
    } else if (originTab === 'outfits') {
      setOutfits(prev =>
        prev.map(o =>
          o.id === item.id ? { ...o, favourite: !o.favourite } : o
        )
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
      const res = await fetchWithAuth(
        `${API_BASE}/api/closet/${itemToEdit.id}`,
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

      if (!res.ok) {
        let errMsg = `Status ${res.status}`;
        try {
          const body = await res.json();
          errMsg += ` — ${JSON.stringify(body)}`;
        } catch {}
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
      // for items & favourites
      const itemUpdater = (arr: (Item | UIOutfit)[]) =>
        arr.map(i => isItem(i) && i.id === updated.id ? { ...i, ...updated } : i);

      // for outfits
      const outfitUpdater = (arr: (UIOutfit | Item)[]) =>
        arr.map(o =>
          isUIOutfit(o) && o.id === updated.id
            ? {
              ...o,
              category: updated.category,
              colorHex: updated.colorHex,
              warmthRating: updated.warmthFactor,
              waterproof: updated.waterproof,
              overallStyle: updated.style,
            }
            : o
        );

      if (itemToEdit.tab === 'items') {
        setItems(
          itemUpdater(items).filter(isItem)
        );

      } else if (itemToEdit.tab === 'outfits') {
        setOutfits(
          outfitUpdater(outfits).filter(isUIOutfit)
        );
      } else {
        //setFavourites(itemUpdater(favourites)); // now safe
      }
    } catch (err) {
      console.error('Save failed', err);
      setPopup({ open: true, message: 'Could not save changes.', variant: 'error' });
    } finally {
      setShowEditModal(false);
      setItemToEdit(null);
    }
  };

  const handleRemoveClick = (id: string, tab: TabType, name: string) => {
    setItemToRemove({ id, tab, name });
    setShowModal(true);
  };

    // --- Axios-safe request helper (works with either axios or fetch responses) ---
  type HttpResult<T = any> = { ok: boolean; status: number; data?: T };

  const request = async (url: string, init?: RequestInit): Promise<HttpResult> => {
    try {
      const res: any = await fetchWithAuth(url, init);

      // If it's a Fetch Response
      if (res && typeof res === 'object' && 'ok' in res && 'status' in res) {
        let data: any = undefined;
        try {
          data = typeof res.json === 'function' ? await res.json() : undefined;
        } catch {}
        return { ok: !!res.ok, status: Number(res.status) || 0, data };
      }

      // If it's an AxiosResponse
      const status = Number(res?.status) || 0;
      return { ok: status >= 200 && status < 300, status, data: res?.data };
    } catch (err: any) {
      const status = Number(err?.response?.status) || 0;
      return { ok: false, status, data: err?.response?.data };
    }
  };

  
  // --- Helpers to strip from outfits & packing lists before deletion ---

  
  // Try to fetch all saved outfits from a few likely endpoints (some apps pluralize, some don't)
const fetchSavedOutfits = async (): Promise<any[]> => {
  const urls = [
    `${API_BASE}/api/outfits`,
    `${API_BASE}/api/outfit`,
    `${API_BASE}/api/outfit/saved`,
    `${API_BASE}/api/outfits/saved`,
  ];
  for (const u of urls) {
    const r = await request(u, { method: 'GET' } as any);
    if (r.ok && Array.isArray(r.data)) return r.data;
    if (r.ok && Array.isArray((r.data as any)?.data)) return (r.data as any).data;
  }
  return [];
};

    // --- Helpers to strip from outfits & packing lists before deletion ---
    const stripItemFromAllOutfits = async (closetItemId: string) => {
      // get a fresh list from the server (covers any local drift)
      const outfits = await fetchSavedOutfits();
      if (!outfits.length) return;

      const usesItem = (o: any) =>
        Array.isArray(o?.outfitItems) &&
        o.outfitItems.some((it: any) => String(it.closetItemId) === String(closetItemId));

      const patchUrls = (id: string) => [
        `${API_BASE}/api/outfits/${id}`,
        `${API_BASE}/api/outfit/${id}`,
      ];
      const deleteUrls = patchUrls;

      // Track what changed so we can reflect it in local state immediately
      const removedIds: string[] = [];
      const updatedOutfitItems: Record<
        string,
        { closetItemId: string; layerCategory: string; imageUrl: string | null }[]
      > = {};

      for (const o of outfits) {
        if (!usesItem(o)) continue;

        const kept = (o.outfitItems || []).filter(
          (it: any) => String(it.closetItemId) !== String(closetItemId)
        );

        // If nothing left -> delete the whole outfit
        if (kept.length === 0) {
          for (const u of deleteUrls(o.id)) {
            const r = await request(u, { method: 'DELETE' } as any);
            if (r.ok || r.status === 404) break;
          }
          removedIds.push(String(o.id));
          continue;
        }

        // Try PATCH #1: array of IDs
        let patched = false;
        for (const u of patchUrls(o.id)) {
          const r = await request(u, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' } as any,
            body: JSON.stringify({ outfitItems: kept.map((it: any) => it.closetItemId) }),
          } as any);
          if (r.ok) { patched = true; break; }
        }

        // Try PATCH #2: array of objects
        if (!patched) {
          for (const u of patchUrls(o.id)) {
            const r = await request(u, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' } as any,
              body: JSON.stringify({ outfitItems: kept.map((it: any) => ({ closetItemId: it.closetItemId })) }),
            } as any);
            if (r.ok) { patched = true; break; }
          }
        }

        if (patched) {
          updatedOutfitItems[String(o.id)] = kept.map((it: any) => ({
            closetItemId: String(it.closetItemId),
            layerCategory: String(it.layerCategory),
            imageUrl: it.imageUrl ?? null,
          }));
        } else {
          // Last resort: delete outfit
          for (const u of deleteUrls(o.id)) {
            const r = await request(u, { method: 'DELETE' } as any);
            if (r.ok || r.status === 404) break;
          }
          removedIds.push(String(o.id));
        }
      }

      // Local state: drop deleted outfits & update patched ones (prevents blank cards)
      setOutfits(prev =>
        prev
          .filter(o => !removedIds.includes(String(o.id)))
          .map(o => (updatedOutfitItems[o.id] ? { ...o, outfitItems: updatedOutfitItems[o.id] as any } : o))
          .filter(o => (o.outfitItems?.length ?? 0) > 0) // guard against any empties that slipped through
      );

      // Extra nuke: try join-row deletes by closetItem if the API supports them
      const joinDeleteCandidates = [
        `${API_BASE}/api/outfit-items/by-closet/${closetItemId}`,
        `${API_BASE}/api/outfitItems/by-closet/${closetItemId}`,
        `${API_BASE}/api/outfitItem/by-closet/${closetItemId}`,
      ];
      for (const u of joinDeleteCandidates) {
        const r = await request(u, { method: 'DELETE' } as any);
        if (r.ok) break;
      }
    };



    const stripItemFromAllPackingLists = async (closetItemId: string) => {
      try {
        const evts = await fetchAllEvents();
        for (const ev of evts) {
          try {
            const list = await getPackingList(ev.id).catch(() => null);
            if (!list?.id) continue;

            const hasItem =
              Array.isArray(list.items) &&
              list.items.some((r: any) => String(r.closetItemId) === String(closetItemId));
            if (!hasItem) continue;

            const items   = (list.items   || []).filter((r: any) => String(r.closetItemId) !== String(closetItemId)).map((r: any) => String(r.closetItemId));
            const outfits = (list.outfits || []).map((r: any) => String(r.outfitId));
            const others  = (list.others  || []).map((r: any) => String(r.label));

            await deletePackingList(list.id).catch(() => {});
            await createPackingList({ tripId: ev.id, items, outfits, others }).catch(() => {});
          } catch {
            // ignore & continue
          }
        }
      } catch (err) {
        console.error('stripItemFromAllPackingLists failed', err);
      }
    };



  const confirmRemove = async () => {
    if (!itemToRemove) return;
    const { id } = itemToRemove;

    try {
      // Step 1: remove item from all outfits (multi-endpoint + local state sync)
      await stripItemFromAllOutfits(id);

      // Step 2: remove from all packing lists
      await stripItemFromAllPackingLists(id);

      // Step 3: delete the closet item
      await deleteItem(id);

      // Step 4: update local state & prune empty outfits (prevents ghost cards)
      setItems(prev => prev.filter(i => i.id !== id));
      setFavourites(prev => prev.filter(f => f.id !== id));
      setOutfits(prev =>
        prev
          .map(o => ({ ...o, outfitItems: o.outfitItems.filter(it => String(it.closetItemId) !== String(id)) }))
          .filter(o => (o.outfitItems?.length ?? 0) > 0)
      );

      setPopup({ open: true, message: 'Item deleted.', variant: 'success' });
    } catch (err) {
      console.error('Failed to delete item (first attempt):', err);

      // Hard fallback: try direct join-row nukes in case some ref slipped through
      const nukes = [
        `${API_BASE}/api/outfit-items/by-closet/${id}`,
        `${API_BASE}/api/outfitItems/by-closet/${id}`,
        `${API_BASE}/api/outfitItem/by-closet/${id}`,
      ];
      for (const u of nukes) {
        await request(u, { method: 'DELETE' } as any);
      }

      // Retry the closet delete once
      try {
        await deleteItem(id);

        setItems(prev => prev.filter(i => i.id !== id));
        setFavourites(prev => prev.filter(f => f.id !== id));
        setOutfits(prev =>
          prev
            .map(o => ({ ...o, outfitItems: o.outfitItems.filter(it => String(it.closetItemId) !== String(id)) }))
            .filter(o => (o.outfitItems?.length ?? 0) > 0)
        );

        setPopup({ open: true, message: 'Item deleted.', variant: 'success' });
      } catch (err2) {
        console.error('Failed after final purge:', err2);
        setPopup({ open: true, message: 'Delete failed. Try again.', variant: 'error' });
      }

// ! Merge Diya Code
//      if (tab === 'outfits') {
//        await deleteOutfit(id);
//        setOutfits(prev => prev.filter(o => o.id !== id));
//      } else {
//        await deleteItem(id);
//        setItems(prev => prev.filter(i => i.id !== id));
//      }
//    } catch (err: any) {
//      console.error('Failed to delete item:', err);
//      if (
//        err.response?.status === 400 ||
//        (err.response?.data?.message && err.response.data.message.includes("part of an outfit")) ||
//        (err.message && err.message.includes("part of an outfit"))
//      ) {
//        setDeleteError("You can't delete this item because it's part of an outfit. Remove it from all outfits first!");
//      } else {
//        setDeleteError(err.response?.data?.message || 'Delete failed. Try again.');
//      }
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

    // Sort favourites to the top for "items" and "favourites" tabs
    if (activeTab === 'items' || activeTab === 'favourites') {
      data = data.sort((a, b) => Number(b.favourite) - Number(a.favourite));
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
    <div className="w-full max-w-screen-sm mx-auto px-2 sm:px-4 -mt-16">
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
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            MY CLOSET
          </h1>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      <div className="max-w-screen-sm mx-auto px-4 pb-12">
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
            {/* --- END TOGGLE BUTTONS --- */}

            {favView === 'items' ? (
              <div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
                            <button

                              onClick={() => toggleFavourite(entry, 'items')}
                            >
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {outfits.filter(o => o.favourite).length === 0 ? (
                    <p className="col-span-full text-gray-400 italic text-center">No favourite outfits yet.</p>
                  ) : (
                    outfits.filter(o => o.favourite).map(entry => (
                      <div
                        key={entry.id}
                        className="relative bg-white border rounded-xl p-2 w-full cursor-pointer"
                        onClick={() => setActiveDetailsOutfit(entry)}
                      >                        <button
                        onClick={() => handleRemoveClick(entry.id, 'outfits', 'Outfit')}
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white rounded-full p-1 shadow z-10"
                      >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                        </button>
                        <div className="space-y-1">
                          {/* headwear + accessory */}
                          <div
                            className={`flex justify-center space-x-1 ${entry.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory))
                              ? ''
                              : 'hidden'
                              }`}
                          >
                            {entry.outfitItems
                              .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                              .map(it => (
                                <img
                                  key={it.closetItemId}
                                  // src={prefixed(it.imageUrl)}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  className="w-16 h-16 object-contain rounded"
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
                                  // src={prefixed(it.imageUrl)}
                                  src={absolutize(it.imageUrl, API_BASE)}
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
                                  // src={prefixed(it.imageUrl)}
                                  src={absolutize(it.imageUrl, API_BASE)}
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
                                  // src={prefixed(it.imageUrl)}
                                  src={absolutize(it.imageUrl, API_BASE)}
                                  className="w-14 h-14 object-contain rounded"
                                />
                              ))}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(entry, 'outfits');
                          }}
                          aria-label={entry.favourite ? 'Unfavourite outfit' : 'Favourite outfit'}
                          className="absolute bottom-2 left-2 z-10"
                        >
                          <Heart
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition 
                  ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {getCurrentData().map(entry => {
              if (isItem(entry)) {
                return (
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
                        <button
                          onClick={() => toggleFavourite(entry, entry.tab === 'outfits' ? 'outfits' : 'items')}
                        >
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
                    className="relative bg-white border rounded-xl p-2 w-full cursor-pointer"
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
                      <div
                        className={`flex justify-center space-x-1 ${entry.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory))
                          ? ''
                          : 'hidden'
                          }`}
                      >
                        {entry.outfitItems
                          .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                          .map(it => (
                            <img
                              key={it.closetItemId}
                              // src={prefixed(it.imageUrl)}
                              src={absolutize(it.imageUrl, API_BASE)}
                              className="w-16 h-16 object-contain rounded"
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
                              // src={prefixed(it.imageUrl)}
                              src={absolutize(it.imageUrl, API_BASE)}
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
                              // src={prefixed(it.imageUrl)}
                              src={absolutize(it.imageUrl, API_BASE)}
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
                              // src={prefixed(it.imageUrl)}
                              src={absolutize(it.imageUrl, API_BASE)}
                              className="w-14 h-14 object-contain rounded"
                            />
                          ))}
                      </div>
                    </div>


                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(entry, 'outfits');
                      }}
                      aria-label={entry.favourite ? 'Unfavourite outfit' : 'Favourite outfit'}
                      className="absolute bottom-2 left-2 z-10"
                    >
                      <Heart
                        className={`h-4 w-4 sm:h-5 sm:w-5 transition 
                  ${entry.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                      />
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

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
                className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6 relative flex flex-col gap-4"
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveDetailsOutfit(null)}
                  className="absolute top-3 right-3 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-20"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Favourite Heart (Top Left, smaller, no bg) */}
                <button
                  onClick={() => toggleFavourite(activeDetailsOutfit, 'outfits')}
                  className="absolute top-3 left-3 z-20"
                >
                  <Heart
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition 
              ${activeDetailsOutfit.favourite ? 'fill-red-500 text-red-500' : 'text-gray-300'}`}
                  />
                </button>

                {/* Outfit Images */}
                <div className="flex justify-center mb-2">
                  <div className="space-y-1">
                    {/* headwear + accessory */}
                    <div className={`flex justify-center space-x-1 ${activeDetailsOutfit.outfitItems.some(it => ['headwear', 'accessory'].includes(it.layerCategory)) ? '' : 'hidden'}`}>
                      {activeDetailsOutfit.outfitItems
                        .filter(it => ['headwear', 'accessory'].includes(it.layerCategory))
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            // src={prefixed(it.imageUrl)}
                            src={absolutize(it.imageUrl, API_BASE)}
                            className="w-16 h-16 object-contain rounded"
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
                            // src={prefixed(it.imageUrl)}
                            src={absolutize(it.imageUrl, API_BASE)}
                            className="w-16 h-16 object-contain rounded"
                          />
                        ))}
                    </div>
                    {/* bottoms */}
                    <div className="flex justify-center space-x-1">
                      {activeDetailsOutfit.outfitItems
                        .filter(it => it.layerCategory === 'base_bottom')
                        .map(it => (
                          <img
                            key={it.closetItemId}
                            // src={prefixed(it.imageUrl)}
                            src={absolutize(it.imageUrl, API_BASE)}
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
                            // src={prefixed(it.imageUrl)}
                            src={absolutize(it.imageUrl, API_BASE)}
                            className="w-14 h-14 object-contain rounded"
                          />
                        ))}
                    </div>
                  </div>
                </div>

                {/* Outfit Info */}
                <div className="space-y-2 text-gray-700 text-base mt-2">
                  <div>
                    <span className="font-semibold">Warmth Rating:</span>{' '}
                    {activeDetailsOutfit.warmthRating}
                  </div>
                  <div>
                    <span className="font-semibold">Waterproof:</span>{' '}
                    {activeDetailsOutfit.waterproof ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-semibold">Overall Style:</span>{' '}
                    {activeDetailsOutfit.overallStyle}
                  </div>
                  {typeof activeDetailsOutfit.userRating === 'number' && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Your Rating:</span>
                      {Array(activeDetailsOutfit.userRating || 0)
                        .fill(0)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className="w-5 h-5 text-teal-500"
                            style={{
                              stroke: '#14b8a6', // Tailwind teal-500
                              fill: '#14b8a6',
                              strokeWidth: 1.5,
                            }}
                          />
                        ))}
                      <span className="ml-1">{activeDetailsOutfit.userRating}/5</span>
                    </div>
                  )}

                </div>

                {/* Delete button */}
                <div className="flex justify-end gap-2 pt-6">
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

        {/* Preview Overlay */}
        <AnimatePresence>
          {previewImage && (
            <motion.div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80">
              <motion.img src={previewImage} alt="" className="max-w-3/4 max-h-3/4 object-contain" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white bg-gray-800 p-2 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
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
                  ${editedColorHex === c.hex ? "border-teal-500 scale-110 shadow-lg" : "border-gray-300"}`}
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

        <AnimatePresence>
          {deleteError && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-80 text-center"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              >
                <h2 className="text-lg font-livvic text-red-600 mb-3"> Item is apart of an existing outfit!</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{deleteError}</p>
                <button
                  onClick={() => setDeleteError(null)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full"
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm md:max-w-md p-6 relative flex flex-col gap-4"
              >
                {/* Close button */}
                <button
                  onClick={() => setActiveDetailsItem(null)}
                  className="absolute top-3 right-3 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full p-2 z-20"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Favourite */}
                <Heart
                  className={`absolute top-3 left-3 w-6 h-6 cursor-pointer transition ${activeDetailsItem.favourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                  onClick={() => toggleFavourite(activeDetailsItem, 'items')}
                />
                {/* Image */}
                <div className="w-full flex justify-center">
                  <img
                    src={activeDetailsItem.image}
                    alt={activeDetailsItem.name}
                    className="w-40 h-40 object-contain rounded-lg shadow"
                  />
                </div>

                {/* Item details */}
                <div className="space-y-2 text-gray-700 text-base">
                  <div><span className="font-semibold">Category:</span> {activeDetailsItem.category}</div>
                  <div><span className="font-semibold">Style:</span> {activeDetailsItem.style}</div>
                  <div><span className="font-semibold">Material:</span> {activeDetailsItem.material}</div>

                  <div>
                    <span className="font-semibold">Dominant Colors:</span>
                    {activeDetailsItem.dominantColors?.length
                      ? activeDetailsItem.dominantColors.map((c, i) => (
                        <span key={i}
                          className="inline-block w-4 h-4 rounded-full mx-1 border"
                          style={{ background: c }} />
                      ))
                      : "—"}
                  </div>
                  <div><span className="font-semibold">Warmth Factor:</span> {activeDetailsItem.warmthFactor}/10</div>
                  <div><span className="font-semibold">Waterproof:</span> {activeDetailsItem.waterproof ? "Yes" : "No"}</div>
                  {/* <pre>{JSON.stringify(activeDetailsItem, null, 2)}</pre> */}
                </div>

                {/* Edit/Delete actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setItemToEdit({ ...activeDetailsItem, tab: 'items' });
                      setEditedCategory(activeDetailsItem.category);
                      setEditedColorHex(activeDetailsItem.colorHex || '');
                      setEditedWarmthFactor(activeDetailsItem.warmthFactor || 0);
                      setEditedWaterproof(activeDetailsItem.waterproof || false);
                      setEditedStyle(activeDetailsItem.style || '');
                      setEditedMaterial(activeDetailsItem.material || '');
                      setShowEditModal(true);
                      setActiveDetailsItem(null); // Close details modal
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
                    className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-700"
                  >
                    Delete
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
              // Merge server response back into local state
              setOutfits(prev =>
                prev.map(o => (o.id === updated.id
                  ? {
                    ...o,
                    overallStyle: updated.overallStyle,
                    userRating: updated.userRating ?? o.userRating,
                    // normalize imageUrl (same as fetchAllOutfits normalization)
                    outfitItems: (updated.outfitItems || []).map((it: any) => ({
                      closetItemId: it.closetItemId,
                      layerCategory: it.layerCategory,
                      imageUrl: it.imageUrl && it.imageUrl.length > 0
                          ? it.imageUrl
                          : absolutize(`/uploads/${it?.closetItem?.filename ?? ""}`, API_BASE),
                      category: it?.closetItem?.category ?? it.category,
                    })),
                  }
                  : o))
              );
            }}
          />
        )}

      </div>

      {/* Global popup (same look & feel as Add/Calendar pages) */}
      {popup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              {popup.variant === 'success' ? '🎉 Success! 🎉' : '⚠️ Error'}
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
