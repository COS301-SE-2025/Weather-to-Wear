// src/components/EditOutfitModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { saveOutfitEdits } from "../services/outfitApi";
import { fetchAllItems } from "../services/closetApi";
import { API_BASE } from "../config";

type ClosetItemLite = {
  id: string;
  imageUrl: string;
  category: string;
  layerCategory: string;
};

type OutfitItemPayload = {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
};

type OutfitItemView = {
  uid: string; // stable identifier for UI ops
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
  imageUrl?: string;
  category?: string;
};

type Props = {
  outfitId: string;
  initialStyle?: string;
  initialRating?: number;
  initialItems: {
    closetItemId: string;
    layerCategory: string;
    imageUrl?: string;
    category?: string;
  }[];
  onClose: () => void;
  onSaved: (updated: any) => void;
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

const REQUIRED_LAYERS = ["base_top", "base_bottom", "footwear"]; // NEW

const STYLES = ["Formal", "Casual", "Athletic", "Party", "Business", "Outdoor"];

const API_PREFIX = `${API_BASE}`;
const prefixed = (u?: string) =>
  u?.startsWith("http") ? (u as string) : `${API_PREFIX}${u ?? ""}`;

// Local uid generator that works in browsers and SSR
const makeUid = () =>
  (globalThis as any)?.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Helpers (NEW)
const norm = (s?: string) => (s ?? "").trim().toLowerCase();

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
  const [items, setItems] = useState<OutfitItemView[]>([]);

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

  // 2) Seed editable items list with current outfit (with stable uids)
  useEffect(() => {
    const seeded: OutfitItemView[] = initialItems.map((it, idx) => ({
      uid: makeUid(),
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

  // Used categories set (case-insensitive)  (NEW)
  const usedCategories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      if (it.category) s.add(norm(it.category));
    }
    return s;
  }, [items]);

  // Validation (NEW): missing required layers + duplicate categories
  const validationErrors = useMemo(() => {
    const errs: string[] = [];

    // Required layers
    for (const req of REQUIRED_LAYERS) {
      const has = items.some((it) => it.layerCategory === req);
      if (!has) errs.push(`Add at least one item in ${req.replace("_", " ")}.`);
    }

    // Duplicate categories
    const counts: Record<string, number> = {};
    for (const it of items) {
      const c = norm(it.category);
      if (!c) continue; // if category unknown, skip duplicate rule
      counts[c] = (counts[c] ?? 0) + 1;
    }
    const dups = Object.entries(counts)
      .filter(([, n]) => n > 1)
      .map(([c]) => c);
    if (dups.length > 0) {
      errs.push(
        `Only one of each category allowed. Remove duplicates: ${dups
          .map((c) => `"${c}"`)
          .join(", ")}.`
      );
    }

    return errs;
  }, [items]);

  function addItem(layer: string, closetItemId: string) {
    const choice = closet.find((c) => c.id === closetItemId);
    // Block duplicate categories (NEW)
    if (choice?.category && usedCategories.has(norm(choice.category))) {
      // Soft UX: no alert spam; silently ignore add
      return;
    }

    setItems((prev) => {
      const nextOrder =
        Math.max(
          -1,
          ...prev.filter((p) => p.layerCategory === layer).map((p) => p.sortOrder)
        ) + 1;
      return [
        ...prev,
        {
          uid: makeUid(),
          closetItemId,
          layerCategory: layer,
          sortOrder: nextOrder,
          imageUrl: choice ? choice.imageUrl : undefined,
          category: choice ? choice.category : undefined,
        },
      ];
    });
  }

  // Remove by uid and resequence sortOrder within the affected layer(s)
  function removeById(uid: string) {
    setItems((prev) => {
      const toRemove = prev.find((p) => p.uid === uid);
      if (!toRemove) return prev;
      const remaining = prev.filter((p) => p.uid !== uid);

      // Resequence sortOrder in the same layer
      const resequenced = remaining
        .map((it) => ({ ...it }))
        .sort((a, b) =>
          a.layerCategory.localeCompare(b.layerCategory) || a.sortOrder - b.sortOrder
        );

      let k = 0;
      for (let i = 0; i < resequenced.length; i++) {
        if (resequenced[i].layerCategory === toRemove.layerCategory) {
          resequenced[i].sortOrder = k++;
        }
      }
      return resequenced;
    });
  }

  // Move by uid: swap sortOrder within the same layer
  function move(uid: string, dir: -1 | 1) {
    setItems((prev) => {
      const me = prev.find((p) => p.uid === uid);
      if (!me) return prev;

      const siblings = prev
        .filter((p) => p.layerCategory === me.layerCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const pos = siblings.findIndex((p) => p.uid === uid);
      const newPos = pos + dir;
      if (newPos < 0 || newPos >= siblings.length) return prev;

      const target = siblings[newPos];

      return prev.map((p) => {
        if (p.uid === me.uid) return { ...p, sortOrder: target.sortOrder };
        if (p.uid === target.uid) return { ...p, sortOrder: me.sortOrder };
        return p;
      });
    });
  }

  // Optional safety: ensure 0..n-1 per layer before saving
  function resequenceAllLayers(list: OutfitItemView[]): OutfitItemView[] {
    const byLayer: Record<string, OutfitItemView[]> = {};
    list.forEach((it) => {
      (byLayer[it.layerCategory] ||= []).push(it);
    });
    const out: OutfitItemView[] = [];
    for (const layer of Object.keys(byLayer)) {
      const sorted = byLayer[layer].sort((a, b) => a.sortOrder - b.sortOrder);
      sorted.forEach((it, idx) => out.push({ ...it, sortOrder: idx }));
    }
    // Keep a stable display order: layer then sortOrder
    return out.sort(
      (a, b) =>
        a.layerCategory.localeCompare(b.layerCategory) || a.sortOrder - b.sortOrder
    );
  }

  async function handleSave() {
    // Hard recheck before saving (NEW)
    if (validationErrors.length > 0) {
      alert(
        "Please fix the following before saving:\n\n" + validationErrors.join("\n")
      );
      return;
    }

    setLoading(true);
    try {
      const clean = resequenceAllLayers(items);
      const payload = {
        userRating: rating,
        overallStyle: style,
        outfitItems: clean.map<OutfitItemPayload>((it) => ({
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
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* Current outfit items (editable) */}
          <div>
            <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Current Items</h3>

            {/* Inline validation block (NEW) */}
            {validationErrors.length > 0 && (
              <div className="mb-3 text-xs rounded-lg border border-red-300 bg-red-50 text-red-700 p-2 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <ul className="list-disc ml-4 space-y-1">
                  {validationErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">No items yet.</div>
            ) : (
              <ul className="space-y-2">
                {items
                  .slice()
                  .sort(
                    (a, b) =>
                      a.layerCategory.localeCompare(b.layerCategory) ||
                      a.sortOrder - b.sortOrder
                  )
                  .map((it) => (
                    <li
                      key={it.uid}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={prefixed(it.imageUrl)}
                        className="w-10 h-10 object-contain bg-white rounded"
                        alt={it.category ?? "Item"}
                      />
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {it.layerCategory}
                        </div>
                        <div className="text-sm font-medium dark:text-gray-100">
                          {it.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* (Move buttons could go here if you want) */}
                        <button
                          type="button"
                          onClick={() => removeById(it.uid)}
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
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      {L.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {options.map((c) => {
                        const isDupCategory = !!c.category && usedCategories.has(norm(c.category)); // NEW
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => addItem(L.value, c.id)}
                            title={isDupCategory ? `${c.category} already added` : c.category}
                            className={`relative border rounded-md p-1 ${
                              isDupCategory
                                ? "opacity-50 cursor-not-allowed"
                                : "bg-white hover:shadow"
                            }`}
                            disabled={isDupCategory} // NEW
                            aria-disabled={isDupCategory}
                          >
                            <img
                              src={prefixed(c.imageUrl)}
                              className="w-14 h-14 object-contain"
                              alt={c.category}
                            />
                            {!isDupCategory && (
                              <Plus className="w-4 h-4 absolute -top-1 -right-1 bg-teal-600 text-white rounded-full" />
                            )}
                          </button>
                        );
                      })}
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
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Overall Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full mt-1 border rounded-full px-3 py-2"
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">
                  Your Rating
                </label>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i + 1)}
                      className={`w-8 h-8 rounded-full border ${
                        rating >= i + 1 ? "bg-teal-500 text-white" : "bg-white"
                      }`}
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
          <button onClick={onClose} className="px-4 py-2 rounded-full border">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || validationErrors.length > 0} // NEW
            className="px-4 py-2 rounded-full bg-teal-600 text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
