// src/components/EditOutfitModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { saveOutfitEdits } from "../services/outfitApi";
import { fetchAllItems } from "../services/closetApi";

type ClosetItemLite = {
  id: string;
  imageUrl: string;
  category: string;
  layerCategory: string;
  // (optional) anything else you need
};

type OutfitItemPayload = {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
};

type OutfitItemView = {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
  imageUrl?: string;
  category?: string;
};

type Props = {
  outfitId: string;
  initialStyle?: string;              // OverallStyle from your enum
  initialRating?: number;
  initialItems: {                     
    closetItemId: string;
    layerCategory: string;
    imageUrl?: string;
    category?: string;
  }[];
  onClose: () => void;
  onSaved: (updated: any) => void;    // pass back the updated outfit
};

const LAYERS: { value: string; label: string }[] = [
  { value: "base_top", label: "Base Top" },
  { value: "mid_top", label: "Mid Top" },
  { value: "outerwear", label: "Outerwear" },
  { value: "base_bottom", label: "Base Bottom" },
  { value: "mid_bottom", label: "Mid Bottom" },
  { value: "footwear", label: "Footwear" },
  { value: "headwear", label: "Headwear" },
  { value: "accessory", label: "Accessory" },
];

const STYLES = ["Formal","Casual","Athletic","Party","Business","Outdoor"];

const API_PREFIX = "http://localhost:5001";

const prefixed = (u?: string) => (u?.startsWith("http") ? u! : `${API_PREFIX}${u ?? ""}`);

export default function EditOutfitModal({
  outfitId,
  initialStyle,
  initialRating,
  initialItems,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [closet, setCloset] = useState<ClosetItemLite[]>([]);
  const [style, setStyle] = useState<string>(initialStyle ?? "Casual");
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [items, setItems] = useState<OutfitItemView[]>([]);  // editable list

  // 1) Load closet items (for picker)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAllItems();
        const list: ClosetItemLite[] = (res.data || []).map((i: any) => ({
          id: i.id,
          imageUrl: i.imageUrl,
          category: i.category,
          layerCategory: i.layerCategory,
        }));
        setCloset(list);
      } catch (e) {
        console.error("Failed to load closet", e);
      }
    })();
  }, []);

  // 2) Seed editable items list with current outfit
  useEffect(() => {
    const seeded = initialItems.map((it, idx) => ({
      closetItemId: it.closetItemId,
      layerCategory: it.layerCategory,
      sortOrder: idx,
      imageUrl: it.imageUrl,
      category: it.category,
    }));
    setItems(seeded);
  }, [initialItems]);

  // group closet by layer for picker
  const closetByLayer = useMemo(() => {
    const m: Record<string, ClosetItemLite[]> = {};
    for (const c of closet) {
      if (!m[c.layerCategory]) m[c.layerCategory] = [];
      m[c.layerCategory].push(c);
    }
    return m;
  }, [closet]);

  function addItem(layer: string, closetItemId: string) {
    const choice = closet.find(c => c.id === closetItemId);
    setItems(prev => {
      const nextOrder =
        Math.max(-1, ...prev.filter(p => p.layerCategory === layer).map(p => p.sortOrder)) + 1;
      return [
        ...prev,
        {
          closetItemId,
          layerCategory: layer,
          sortOrder: nextOrder,
          imageUrl: choice ? choice.imageUrl : undefined,
          category: choice ? choice.category : undefined,
        },
      ];
    });
  }

  function removeAt(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    setItems(prev => {
      const copy = [...prev];
      const target = copy[idx];
      // only reorder within the same layerCategory
      // find siblings in same layer
      const siblingsIdx = copy
        .map((x, i) => ({ i, x }))
        .filter(s => s.x.layerCategory === target.layerCategory)
        .map(s => s.i);
      const pos = siblingsIdx.indexOf(idx);
      const newPos = pos + dir;
      if (newPos < 0 || newPos >= siblingsIdx.length) return prev;

      const idxB = siblingsIdx[newPos];
      // swap
      [copy[idx], copy[idxB]] = [copy[idxB], copy[idx]];
      // re-sequence sortOrder inside that layer
      const layerSiblings = copy
        .filter(s => s.layerCategory === target.layerCategory)
        .sort((a, b) => copy.indexOf(a) - copy.indexOf(b))
        .map((s, k) => ({ ...s, sortOrder: k }));

      const others = copy.filter(s => s.layerCategory !== target.layerCategory);
      return [...others, ...layerSiblings].sort((a, b) => {
        // keep global order stable; not required, only cosmetic
        return a.layerCategory.localeCompare(b.layerCategory) || a.sortOrder - b.sortOrder;
      });
    });
  }

  async function handleSave() {
    setLoading(true);
    try {
      // backend expects outfitItems array OR none; we send the replacement list
      const payload = {
        userRating: rating,
        overallStyle: style,
        outfitItems: items.map(it => ({
          closetItemId: it.closetItemId,
          layerCategory: it.layerCategory,
          sortOrder: it.sortOrder,
        })),
      };
      const updated = await saveOutfitEdits(outfitId, payload);
      onSaved(updated);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save outfit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-[92vw] max-w-3xl max-h-[86vh] overflow-hidden shadow-xl grid grid-rows-[auto,1fr,auto]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-gray-100">Edit Outfit</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* Current outfit items (editable) */}
          <div>
            <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Current Items</h3>
            {items.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">No items yet.</div>
            ) : (
              <ul className="space-y-2">
                {items
                  .slice()
                  .sort(
                    (a, b) =>
                      a.layerCategory.localeCompare(b.layerCategory) || a.sortOrder - b.sortOrder
                  )
                  .map((it, idx) => (
                    <li
                      key={`${it.layerCategory}-${it.closetItemId}-${idx}`}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={prefixed(it.imageUrl)}
                        className="w-10 h-10 object-contain bg-white rounded"
                      />
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-300">{it.layerCategory}</div>
                        <div className="text-sm font-medium dark:text-gray-100">{it.category}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          className="p-1 rounded hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Picker by layer */}
          <div>
            <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Add Items from Closet</h3>
            <div className="space-y-3">
              {LAYERS.map((L) => {
                const options = (closetByLayer[L.value] || []).slice(0, 24);
                if (options.length === 0) return null;
                return (
                  <div key={L.value}>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{L.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {options.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => addItem(L.value, c.id)}
                          title={c.category}
                          className="relative border rounded-md p-1 bg-white hover:shadow"
                        >
                          <img
                            src={prefixed(c.imageUrl)}
                            className="w-14 h-14 object-contain"
                          />
                          <Plus className="w-4 h-4 absolute -top-1 -right-1 bg-teal-600 text-white rounded-full" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meta (style + rating) */}
          <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-800 pt-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-600 dark:text-gray-300">Overall Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full mt-1 border rounded-full px-3 py-2"
                >
                  {STYLES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Your Rating</label>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i + 1)}
                      className={`w-8 h-8 rounded-full border ${rating >= i + 1 ? "bg-teal-500 text-white" : "bg-white"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full border">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-teal-600 text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
