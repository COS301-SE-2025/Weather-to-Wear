import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchAllItems } from '../services/closetApi';
import { createOutfitManual } from '../services/outfitApi';


// Types for your closet items
export interface ClosetItem {
  id: string;
  name: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  layerCategory: string;
}

// Props for ClosetPickerModal
interface ClosetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  items: ClosetItem[];
  onSelect: (item: ClosetItem) => void;
  title: string;
}

// ClosetPickerModal component
const ClosetPickerModal: React.FC<ClosetPickerModalProps> = ({
  visible,
  onClose,
  items,
  onSelect,
  title
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="grid grid-cols-2 gap-4">
          {items.length === 0 && (
            <div className="col-span-2 text-gray-500 italic">No items found.</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              className="flex flex-col items-center rounded-lg p-3 bg-gray-50 hover:bg-teal-50 border border-gray-200 transition"
              onClick={() => {
                onSelect(item);
                onClose();
              }}
              type="button"
            >
              <img
                src={item.image || item.imageUrl || "/placeholder.svg"}
                alt={item.name}
                className="w-24 h-24 object-contain rounded mb-2"
              />
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// MOCK ITEMS for demo; replace with API call for real use
const MOCK_ITEMS: ClosetItem[] = [
  { id: "1", name: "White Tee", layerCategory: "base_top" },
  { id: "2", name: "Black Jeans", layerCategory: "base_bottom" },
  { id: "3", name: "Sneakers", layerCategory: "footwear" },
  { id: "4", name: "Denim Jacket", layerCategory: "outerwear" },
  { id: "5", name: "Scarf", layerCategory: "accessory" },
];

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
  // Closet items (should fetch from API)
  const [allItems, setAllItems] = useState<ClosetItem[]>([]);
  // Selections
  const [baseTop, setBaseTop] = useState<ClosetItem | null>(null);
  const [baseBottom, setBaseBottom] = useState<ClosetItem | null>(null);
  const [footwear, setFootwear] = useState<ClosetItem | null>(null);
  const [additional, setAdditional] = useState<ClosetItem[]>([]);
  // Modal state
  const [modal, setModal] = useState<null | "base_top" | "base_bottom" | "footwear">(null);

  // Submission
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getItems = async () => {
      try {
        const res = await fetchAllItems();
        // Map backend items to your ClosetItem shape (match what ClosetPage does)
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
  const itemsForLayer = (layer: string) =>
    allItems.filter(i => (i.layerCategory || '').toLowerCase() === layer.toLowerCase());


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

  // Submission logic
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
      // Build outfitItems array
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
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-2xl shadow space-y-6">
      <h1 className="text-2xl font-bold text-center">Create An Outfit</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* --- Main Three Selection Boxes --- */}
        <div>
          <label className="block font-medium mb-1">Base Top</label>
          <button
            type="button"
            className="w-full border rounded px-3 py-2 text-left flex items-center justify-between"
            onClick={() => setModal("base_top")}
          >
            <span>
              {baseTop
                ? baseTop.name
                : <span className="text-gray-400">Pick a base top...</span>}
            </span>
            <span className="text-gray-400">{baseTop ? "Change" : "Pick"}</span>
          </button>
        </div>
        <div>
          <label className="block font-medium mb-1">Base Bottom</label>
          <button
            type="button"
            className="w-full border rounded px-3 py-2 text-left flex items-center justify-between"
            onClick={() => setModal("base_bottom")}
          >
            <span>
              {baseBottom
                ? baseBottom.name
                : <span className="text-gray-400">Pick a base bottom...</span>}
            </span>
            <span className="text-gray-400">{baseBottom ? "Change" : "Pick"}</span>
          </button>
        </div>
        <div>
          <label className="block font-medium mb-1">Footwear</label>
          <button
            type="button"
            className="w-full border rounded px-3 py-2 text-left flex items-center justify-between"
            onClick={() => setModal("footwear")}
          >
            <span>
              {footwear
                ? footwear.name
                : <span className="text-gray-400">Pick footwear...</span>}
            </span>
            <span className="text-gray-400">{footwear ? "Change" : "Pick"}</span>
          </button>
        </div>
        {/* --- Additional Items --- */}
        <div>
          <label className="block font-medium mb-1">Additional Items</label>
          <div className="flex flex-col gap-2">
            {additional.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <span>{item.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAdditional(item.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            {/* Add new item */}
            <select
              className="w-full border rounded px-3 py-2 mt-2"
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
        {/* --- Submit --- */}
        {error && <div className="text-red-600">{error}</div>}
        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Outfit"}
        </button>
        {success && <div className="text-green-600 text-center font-semibold">Outfit created successfully!</div>}
      </form>
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
