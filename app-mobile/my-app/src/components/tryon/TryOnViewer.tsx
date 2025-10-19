import React, { useEffect, useMemo, useState } from "react";
import TryOnCanvas, { TryOnItem, FitTransform } from "./TryOnCanvas";
import { getItemFits, saveItemFit } from "../../services/tryonApi";
import { cdnUrlFor } from "../../utils/cdn";

type OutfitItemLite = {
  closetItemId: string;
  urlKey?: string;
  imageUrl?: string;
  layerCategory: TryOnItem["layerCategory"];
};

// Build your frame URLs here (adjust base path if needed)
function buildMannequinFrames(baseDir = "/mannequins", stem = "front_v", count = 8) {
  return Array.from({ length: count }, (_, i) => `${baseDir}/${stem}${i + 1}.png`);
}

export default function TryOnViewer({
  // kept for compatibility if you pass a single starting image, but we ignore it for frames
  mannequinUrl,
  poseId = "front_v1",
  outfitItems,
}: {
  mannequinUrl: string;
  poseId?: string;          // current visual pose id (e.g., 'front_v4') – used only for UI label
  outfitItems: OutfitItemLite[];
}) {
  // const [items, setItems] = useState<TryOnItem[]>([]);
  // const [items, setItems] = useState<TryOnItem[] | null>(null);
  const [items, setItems] = useState<TryOnItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState<Record<string, FitTransform>>({});
  const [frameIndex, setFrameIndex] = useState(0); // 0..7

  // IMPORTANT: use a canonical poseId for fits so transforms are universal
  const canonicalPoseId = "front_v1";

  const mannequinFrames = useMemo(() => buildMannequinFrames("/mannequins", "front_v", 8), []);

  // resolve item URLs
  const baseItems: TryOnItem[] = useMemo(
    () =>
      outfitItems.map((o) => ({
        id: o.closetItemId,
        url: cdnUrlFor(o.urlKey ?? o.imageUrl ?? ""),
        layerCategory: o.layerCategory,
      })),
    [JSON.stringify(outfitItems)]
  );

  // load fits once per outfit (from canonical pose)
  useEffect(() => {
    if (baseItems.length === 0) { setItems([]); return; }

    // 1) Set base immediately (so canvas sees non-empty items)
    setItems(baseItems);
    setDirty({});

    // 2) Then fetch fits and overlay
    const ids = outfitItems.map(o => o.closetItemId);
    getItemFits(canonicalPoseId, ids)
      .then(({ fits }) => {
        const byId: Record<string, any> = {};
        fits.forEach((f: any) => { byId[f.itemId] = f; });
        setItems(baseItems.map(o => {
          const fr = byId[o.id];
          return {
            ...o,
            fit: fr ? {
              x: fr.transform?.x ?? 0,
              y: fr.transform?.y ?? 0,
              scale: fr.transform?.scale ?? 1,
              rotationDeg: fr.transform?.rotationDeg ?? 0,
              mesh: fr.mesh ?? undefined,
            } : undefined
          };
        }));
      })
      .catch(() => {
        setItems(baseItems);       // keep base if fits fail
      });

    if (process.env.NODE_ENV !== "production") {
      console.log("[TRYON] viewer set baseItems:", baseItems.length);
    }
  }, [JSON.stringify(baseItems)]);

  const onChangeFit = (itemId: string, transform: FitTransform) => {
    setDirty((prev) => ({ ...prev, [itemId]: transform }));
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, fit: { ...transform } } : it)));
    // setItems(prev => (prev ?? []).map(it => it.id === itemId ? { ...it, fit: { ...transform } } : it));
  };

  const onSaveAll = async () => {
    const entries = Object.entries(dirty);
    if (entries.length === 0) return;
    try {
      await Promise.all(
        entries.map(([itemId, transform]) =>
          saveItemFit({
            itemId,
            poseId: canonicalPoseId, // always save to canonical pose
            transform,
          })
        )
      );
      setDirty({});
      // toast: saved
    } catch (err) {
      console.error("Failed to save some fits", err);
      // toast: failed
    }
  };

  return (
    <div className="try-on-container relative" style={{ width: "100%", height: "100%", minHeight: 420 }}>
      {/* Top-right toolbar */}
      <div
        className="absolute top-2 right-2 z-[101] flex items-center gap-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full border"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}
      >
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`px-3 py-1 rounded-full text-sm border ${editMode ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300"
            }`}
        >
          {editMode ? "Editing" : "View"}
        </button>
        <button
          onClick={onSaveAll}
          disabled={Object.keys(dirty).length === 0}
          className={`px-3 py-1 rounded-full text-sm border ${Object.keys(dirty).length === 0
            ? "opacity-40 cursor-not-allowed"
            : "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
            }`}
          title={Object.keys(dirty).length === 0 ? "No changes" : "Save all changes"}
        >
          Save All
        </button>
      </div>

      {/* Arm rotation slider (bottom center) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[101] flex flex-col items-center gap-1 bg-white/90 backdrop-blur px-3 py-2 rounded-full border">
        <label className="text-xs text-gray-700 select-none">
          Arm rotation
          <span className="ml-1 text-[11px] text-gray-500">(frame {frameIndex + 1} / {mannequinFrames.length})</span>
        </label>
        <input
          type="range"
          min={1}
          max={mannequinFrames.length}
          value={frameIndex + 1}
          onChange={(e) => setFrameIndex(parseInt(e.target.value, 10) - 1)}
          className="w-64"
        />
      </div>

      {/* Canvas */}
      {items && items.length > 0 && (
        <TryOnCanvas
          mannequinFrames={mannequinFrames}
          frameIndex={frameIndex}
          items={items}
          editable={editMode}
          onChangeFit={onChangeFit}
        />
      )}
    </div>
  );
}
