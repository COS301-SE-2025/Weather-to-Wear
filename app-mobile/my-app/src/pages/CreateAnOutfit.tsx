import React, { useEffect, useState } from "react";
import { fetchAllItems } from '../services/closetApi';
import { createOutfitManual } from '../services/outfitApi';
import ClosetPickerModal from '../components/ClosetPickerModal';

// Types
export interface ClosetItem {
  id: string;
  name: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  layerCategory: string;
}

const CATEGORY_BY_LAYER: Record<string, { value: string; label: string }[]> = {
  base_top: [
    { value: 'TSHIRT', label: 'T-shirt' },
    { value: 'LONGSLEEVE', label: 'Long Sleeve' },
    { value: 'SHIRT', label: 'Shirt' },
  ],
  base_bottom: [
    { value: 'PANTS', label: 'Pants' },
    { value: 'SHORTS', label: 'Shorts' },
    { value: 'JEANS', label: 'Jeans' },
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
    { value: 'UMBRELLA', label: 'Umbrella' },
  ],
};

type OutfitItemInput = {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
};

export default function CreateAnOutfit() {
  // State
  const [allItems, setAllItems] = useState<ClosetItem[]>([]);
  const [baseTop, setBaseTop] = useState<ClosetItem | null>(null);
  const [baseBottom, setBaseBottom] = useState<ClosetItem | null>(null);
  const [footwear, setFootwear] = useState<ClosetItem | null>(null);
  const [additional, setAdditional] = useState<ClosetItem[]>([]);
  const [modal, setModal] = useState<null | "base_top" | "base_bottom" | "footwear">(null);

  // Submission
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getItems = async () => {
      try {
        const res = await fetchAllItems();
        const formatted: ClosetItem[] = res.data.map((item: any) => ({
          id: item.id,
          name: item.category,
          category: item.category,
          layerCategory: item.layerCategory,
          imageUrl: item.imageUrl
            ? item.imageUrl.startsWith('http')
              ? item.imageUrl
              : `http://localhost:5001${item.imageUrl}`
            : undefined,
        }));
        setAllItems(formatted);
      } catch (err) {
        console.error("Error fetching closet items", err);
      }
    };
    getItems();
  }, []);

  // Helpers
  const selectedIds = [
    baseTop?.id,
    baseBottom?.id,
    footwear?.id,
    ...additional.map((i) => i.id),
  ].filter(Boolean);

  const handleAddAdditional = (item: ClosetItem) =>
    setAdditional((prev) => [...prev, item]);
  const handleRemoveAdditional = (id: string) =>
    setAdditional((prev) => prev.filter((i) => i.id !== id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      if (!baseTop || !baseBottom || !footwear) {
        setError("Please select all three main items.");
        setCreating(false);
        return;
      }
      const outfitItems: OutfitItemInput[] = [
        { closetItemId: baseTop.id, layerCategory: "base_top", sortOrder: 1 },
        { closetItemId: baseBottom.id, layerCategory: "base_bottom", sortOrder: 2 },
        { closetItemId: footwear.id, layerCategory: "footwear", sortOrder: 3 },
        ...additional.map((item, i) => ({
          closetItemId: item.id,
          layerCategory: item.layerCategory,
          sortOrder: 4 + i,
        })),
      ];
      const body = {
        outfitItems,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
      };
      await createOutfitManual(body);
      setSuccess(true);
      setBaseTop(null);
      setBaseBottom(null);
      setFootwear(null);
      setAdditional([]);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="w-full relative flex items-center justify-center h-48 mb-8">
        <div
          className="absolute inset-0 z-0 rounded-b-2xl"
          style={{
            backgroundImage: `url(/header2.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.7)'
          }}
        ></div>
        <div className="relative z-10 px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-light font-bodoni tracking-tight text-white text-center drop-shadow"
            style={{ letterSpacing: '0.04em' }}>
            CREATE AN OUTFIT
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-10 pb-10 px-3">
        {/* --- FORM --- */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg px-7 py-7">
          <form className="space-y-7" onSubmit={handleSubmit}>
            {/* Base Top */}
            <div>
              <label className="text-base font-medium text-black mb-3 block font-sans">Base Top</label>
              <button
                type="button"
                className="w-full border font-normal text-base rounded-full px-5 py-3 bg-white flex items-center justify-between shadow transition outline-none focus:ring-2"
                style={{
                  borderColor: 'black',
                  color: baseTop ? "#222" : "#aaa"
                }}
                onClick={() => setModal("base_top")}
              >
                <span>
                  {baseTop ? baseTop.name : <span className="text-gray-400">Pick a base top...</span>}
                </span>
                <span className="text-gray-400 text-sm">{baseTop ? "Change" : "Pick"}</span>
              </button>
            </div>
            {/* Base Bottom */}
            <div>
              <label className="text-base font-medium text-black mb-3 block font-sans">Base Bottom</label>
              <button
                type="button"
                className="w-full border font-normal text-base rounded-full px-5 py-3 bg-white flex items-center justify-between shadow transition outline-none focus:ring-2"
                style={{
                  borderColor: 'black',
                  color: baseBottom ? "#222" : "#aaa"
                }}
                onClick={() => setModal("base_bottom")}
              >
                <span>
                  {baseBottom ? baseBottom.name : <span className="text-gray-400">Pick a base bottom...</span>}
                </span>
                <span className="text-gray-400 text-sm">{baseBottom ? "Change" : "Pick"}</span>
              </button>
            </div>
            {/* Footwear */}
            <div>
              <label className="text-base font-medium text-black mb-3 block font-sans">Footwear</label>
              <button
                type="button"
                className="w-full border font-normal text-base rounded-full px-5 py-3 bg-white flex items-center justify-between shadow transition outline-none focus:ring-2"
                style={{
                  borderColor: 'black',
                  color: footwear ? "#222" : "#aaa"
                }}
                onClick={() => setModal("footwear")}
              >
                <span>
                  {footwear ? footwear.name : <span className="text-gray-400">Pick footwear...</span>}
                </span>
                <span className="text-gray-400 text-sm">{footwear ? "Change" : "Pick"}</span>
              </button>
            </div>
            {/* Additional Items */}
            <div>
              <label className="text-base font-medium text-black mb-3 block font-sans">Additional Items</label>
              <div className="flex flex-col gap-2">
                {additional.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-[#e5f6f4] rounded-full px-4 py-2 shadow-sm font-sans">
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditional(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <select
                  className="w-full border font-normal text-base rounded-full px-5 py-3 mt-1 bg-white shadow-sm outline-none focus:ring-2"
                  style={{ borderColor: 'black' }}
                  value=""
                  onChange={e => {
                    const id = e.target.value;
                    const item = allItems.find(
                      i =>
                        i.id === id &&
                        !selectedIds.includes(i.id) &&
                        !["base_top", "base_bottom", "footwear"].includes(i.layerCategory)
                    );
                    if (item) handleAddAdditional(item);
                  }}
                >
                  <option value="">Add another item...</option>
                  {allItems
                    .filter(
                      i =>
                        !selectedIds.includes(i.id) &&
                        !["base_top", "base_bottom", "footwear"].includes(i.layerCategory)
                    )
                    .map(i => (
                      <option value={i.id} key={i.id}>
                        {i.name} (
                        {
                          CATEGORY_BY_LAYER[i.layerCategory]?.find(c => c.value === i.category)?.label || i.category || i.layerCategory
                        }
                        )
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {/* --- Error / Success --- */}
            {error && (
              <div className="bg-red-100 border border-red-200 rounded-full px-4 py-2 text-red-700 text-center text-base shadow-sm font-sans">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-200 rounded-full px-4 py-2 text-green-700 text-center text-base shadow-sm font-semibold font-sans">
                Outfit created successfully!
              </div>
            )}
            {/* --- Submit --- */}
            <button
              type="submit"
              style={{
                backgroundColor: '#3f978f',
                borderRadius: '9999px',
                padding: '0.85rem 1.5rem',
                fontWeight: 700,
                fontSize: '1.1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
              className="w-full text-white shadow-sm transition hover:opacity-90 outline-none font-sans"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Outfit"}
            </button>
          </form>
        </div>

        {/* --- OUTFIT PREVIEW --- */}
        <div className="w-full md:w-[340px] mt-8 md:mt-0 flex justify-center">
          <div className="bg-gradient-to-br from-[#e5f6f4] via-white to-white rounded-2xl shadow-lg px-6 py-8 flex flex-col items-center min-h-[390px]">
            {/* Preview Images Only, Centered and Large */}
            <div className="flex flex-wrap justify-center items-center gap-6 w-full">
              {baseTop && (
                <div>
                  {baseTop.imageUrl ? (
                    <img
                      src={baseTop.imageUrl}
                      alt=""
                      className="w-28 h-28 object-contain rounded-2xl border bg-white mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-xl font-sans">
                      Top
                    </div>
                  )}
                </div>
              )}
              {baseBottom && (
                <div>
                  {baseBottom.imageUrl ? (
                    <img
                      src={baseBottom.imageUrl}
                      alt=""
                      className="w-28 h-28 object-contain rounded-2xl border bg-white mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-xl font-sans">
                      Bottom
                    </div>
                  )}
                </div>
              )}
              {footwear && (
                <div>
                  {footwear.imageUrl ? (
                    <img
                      src={footwear.imageUrl}
                      alt=""
                      className="w-28 h-28 object-contain rounded-2xl border bg-white mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-xl font-sans">
                      Shoes
                    </div>
                  )}
                </div>
              )}
              {additional.length > 0 && additional.map(item => (
                <div key={item.id}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-20 h-20 object-contain rounded-2xl border bg-white mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-lg font-sans">
                      +
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* If nothing picked */}
            {(!baseTop && !baseBottom && !footwear && additional.length === 0) && (
              <div className="text-gray-400 text-center mt-20 text-base font-sans">
                Start picking items<br />to build your outfit!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <ClosetPickerModal
        visible={modal === "base_top"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          i =>
            i.layerCategory === "base_top" &&
            CATEGORY_BY_LAYER["base_top"].some(c => c.value === i.category) &&
            (!selectedIds.includes(i.id) || baseTop?.id === i.id)
        )}
        onSelect={item => setBaseTop(item)}
        title="Pick a Base Top"
      />
      <ClosetPickerModal
        visible={modal === "base_bottom"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          i =>
            i.layerCategory === "base_bottom" &&
            CATEGORY_BY_LAYER["base_bottom"].some(c => c.value === i.category) &&
            (!selectedIds.includes(i.id) || baseBottom?.id === i.id)
        )}
        onSelect={item => setBaseBottom(item)}
        title="Pick a Base Bottom"
      />
      <ClosetPickerModal
        visible={modal === "footwear"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          i =>
            i.layerCategory === "footwear" &&
            CATEGORY_BY_LAYER["footwear"].some(c => c.value === i.category) &&
            (!selectedIds.includes(i.id) || footwear?.id === i.id)
        )}
        onSelect={item => setFootwear(item)}
        title="Pick Footwear"
      />
    </div>
  );
}
