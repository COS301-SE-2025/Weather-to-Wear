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

export default function TryOnViewer({
  mannequinUrl,
  poseId = "front_v1",
  outfitItems,
}: {
  mannequinUrl: string;
  poseId?: string;
  outfitItems: OutfitItemLite[];
}) {
  const [items, setItems] = useState<TryOnItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState<Record<string, FitTransform>>({}); // itemId -> transform

  // resolve initial URLs up-front
  const baseItems: TryOnItem[] = useMemo(
    () =>
      outfitItems.map((o) => ({
        id: o.closetItemId,
        url: cdnUrlFor(o.urlKey ?? o.imageUrl ?? ""),
        layerCategory: o.layerCategory,
      })),
    [JSON.stringify(outfitItems)]
  );

  // load fits on mount / when outfit changes
  useEffect(() => {
    const ids = outfitItems.map((o) => o.closetItemId);
    getItemFits(poseId, ids)
      .then(({ fits }) => {
        const byId: Record<string, any> = {};
        fits.forEach((f: any) => {
          byId[f.itemId] = f;
        });
        const mapped: TryOnItem[] = baseItems.map((o) => {
          const fr = byId[o.id];
          const fit = fr
            ? {
                x: fr.transform?.x ?? 0,
                y: fr.transform?.y ?? 0,
                scale: fr.transform?.scale ?? 1,
                rotationDeg: fr.transform?.rotationDeg ?? 0,
                mesh: fr.mesh ?? undefined,
              }
            : undefined;
        return {
            ...o,
            fit,
          };
        });
        setItems(mapped);
        setDirty({});
      })
      .catch(() => {
        // fall back to view only with no fits
        setItems(baseItems);
        setDirty({});
      });
  }, [poseId, JSON.stringify(baseItems)]);

  const onChangeFit = (itemId: string, transform: FitTransform) => {
    setDirty((prev) => ({ ...prev, [itemId]: transform }));
    // optimistically update the items array so the canvas reflects current values
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, fit: { ...transform } } : it))
    );
  };

  const onSaveAll = async () => {
    const entries = Object.entries(dirty);
    if (entries.length === 0) return;

    try {
      await Promise.all(
        entries.map(([itemId, transform]) =>
          saveItemFit({
            itemId,
            poseId,
            transform, // already normalized (x relative to manW, y to manH)
          })
        )
      );
      setDirty({});
      // consider a toast in parent modal
    } catch (err) {
      console.error("Failed to save some fits", err);
      // consider a toast in parent modal
    }
  };

  return (
    <div className="try-on-container relative" style={{ width: "100%", height: "100%", minHeight: 400 }}>
      {/* Tiny toolbar */}
      <div
        className="absolute top-2 right-2 z-[101] flex items-center gap-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full border"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}
      >
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`px-3 py-1 rounded-full text-sm border ${editMode ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300"}`}
        >
          {editMode ? "Editing" : "View"}
        </button>
        <button
          onClick={onSaveAll}
          disabled={Object.keys(dirty).length === 0}
          className={`px-3 py-1 rounded-full text-sm border ${Object.keys(dirty).length === 0 ? "opacity-40 cursor-not-allowed" : "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"}`}
          title={Object.keys(dirty).length === 0 ? "No changes" : "Save all changes"}
        >
          Save All
        </button>
      </div>

      <TryOnCanvas
        mannequinUrl={mannequinUrl}
        poseId={poseId}
        items={items}
        editable={editMode}
        onChangeFit={onChangeFit}
      />
    </div>
  );
}