import React, { useEffect, useState } from "react";
import { fetchAllItems } from "../services/closetApi";
import { createOutfitManual } from "../services/outfitApi";
import ClosetPickerModal from "../components/ClosetPickerModal";

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
    { value: "TSHIRT", label: "T-shirt" },
    { value: "LONGSLEEVE", label: "Long Sleeve" },
    { value: "SHIRT", label: "Shirt" },
  ],
  base_bottom: [
    { value: "PANTS", label: "Pants" },
    { value: "SHORTS", label: "Shorts" },
    { value: "JEANS", label: "Jeans" },
  ],
  mid_top: [
    { value: "SWEATER", label: "Sweater" },
    { value: "HOODIE", label: "Hoodie" },
  ],
  outerwear: [
    { value: "JACKET", label: "Jacket" },
    { value: "RAINCOAT", label: "Raincoat" },
  ],
  footwear: [
    { value: "SHOES", label: "Shoes" },
    { value: "BOOTS", label: "Boots" },
  ],
  headwear: [
    { value: "BEANIE", label: "Beanie" },
    { value: "HAT", label: "Hat" },
  ],
  accessory: [
    { value: "SCARF", label: "Scarf" },
    { value: "GLOVES", label: "Gloves" },
    { value: "UMBRELLA", label: "Umbrella" },
  ],
};

type OutfitItemInput = {
  closetItemId: string;
  layerCategory: string;
  sortOrder: number;
};

export default function CreateAnOutfit() {
  const [allItems, setAllItems] = useState<ClosetItem[]>([]);
  const [baseTop, setBaseTop] = useState<ClosetItem | null>(null);
  const [baseBottom, setBaseBottom] = useState<ClosetItem | null>(null);
  const [footwear, setFootwear] = useState<ClosetItem | null>(null);
  const [additional, setAdditional] = useState<ClosetItem[]>([]);
  const [modal, setModal] = useState<null | "base_top" | "base_bottom" | "footwear" | "additional">(null);

  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<number>(0);

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
            ? item.imageUrl.startsWith("http")
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

      if (rating <= 0) {
        setError("Please add a rating before saving (same flow as Home).");
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

      // Align with Home: include userRating when creating
      const body = {
        outfitItems,
        warmthRating: 5,
        waterproof: false,
        overallStyle: "Casual",
        userRating: rating,          // ⭐ important
        // (Home’s SaveOutfitPayload also has weatherSummary, but manual create
        // works without it; add if your backend marks it required)
        // weatherSummary: "",
      };

      await createOutfitManual(body);

      setSuccess(true);
      setBaseTop(null);
      setBaseBottom(null);
      setFootwear(null);
      setAdditional([]);
      setRating(0);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Unknown error");
    } finally {
      setCreating(false);
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 -mt-12 md:mt-0">
      {/* Hero header (matches other pages) */}


      {/* Main grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 sm:gap-8 px-3 sm:px-4 md:px-0 pb-10">
        {/* FORM CARD */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md px-5 sm:px-7 py-6 sm:py-7">
          {/* Section title pill */}
          <div className="flex justify-center mb-5">
            <h2 className="text-lg md:text-xl font-livvic border-2 border-black dark:border-gray-100 px-4 py-1 text-black dark:text-gray-100">
              Create an Outfit
            </h2>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Base Top */}
            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
                Base Top
              </label>
              <button
                type="button"
                onClick={() => setModal("base_top")}
                className="w-full rounded-full border border-black px-5 py-3 bg-white dark:bg-gray-800 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
              >
                <div className="flex items-center justify-between">
                  <span className={baseTop ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
                    {baseTop ? baseTop.name : "Pick a base top..."}
                  </span>
                  <span className="text-gray-400 text-sm">{baseTop ? "Change" : "Pick"}</span>
                </div>
              </button>
            </div>

            {/* Base Bottom */}
            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
                Base Bottom
              </label>
              <button
                type="button"
                onClick={() => setModal("base_bottom")}
                className="w-full rounded-full border border-black px-5 py-3 bg-white dark:bg-gray-800 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
              >
                <div className="flex items-center justify-between">
                  <span className={baseBottom ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
                    {baseBottom ? baseBottom.name : "Pick a base bottom..."}
                  </span>
                  <span className="text-gray-400 text-sm">{baseBottom ? "Change" : "Pick"}</span>
                </div>
              </button>
            </div>

            {/* Footwear */}
            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
                Footwear
              </label>
              <button
                type="button"
                onClick={() => setModal("footwear")}
                className="w-full rounded-full border border-black px-5 py-3 bg-white dark:bg-gray-800 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
              >
                <div className="flex items-center justify-between">
                  <span className={footwear ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
                    {footwear ? footwear.name : "Pick footwear..."}
                  </span>
                  <span className="text-gray-400 text-sm">{footwear ? "Change" : "Pick"}</span>
                </div>
              </button>
            </div>

            {/* Additional Items */}
            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
                Additional Items
              </label>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-2">
                {additional.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-[#e5f6f4] dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 rounded-full px-3 py-1.5 shadow-sm"
                  >
                    <span className="text-sm">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditional(item.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setModal("additional")}
                className="w-full rounded-full border border-black px-5 py-3 bg-white dark:bg-gray-800 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
              >
                <div className="flex items-center justify-between">
                  <span className={additional.length ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}>
                    {additional.length ? `Add more items (${additional.length} selected)` : "Pick additional items..."}
                  </span>
                  <span className="text-gray-400 text-sm">{additional.length ? "Add more" : "Pick"}</span>
                </div>
              </button>


              {/* Add select */}

            </div>

            {/* Rating (required, like Home) */}
            <div>
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 block">
                Your Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    onClick={() => setRating(star)}
                    className={`text-2xl leading-none transition ${star <= rating ? "text-[#3F978F]" : "text-gray-300 dark:text-gray-600"
                      } hover:scale-110`}
                  >
                    ★
                  </button>
                ))}
                {rating > 0 && (
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    className="ml-2 text-xs text-gray-500 dark:text-gray-400 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                We’ll save the outfit only after you rate it.
              </p>
            </div>



            {/* Alerts */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-full px-4 py-2 text-red-700 dark:text-red-300 text-center text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-full px-4 py-2 text-green-700 dark:text-green-300 text-center text-sm font-semibold">
                Outfit created successfully!
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-full bg-[#3F978F] hover:bg-[#2F6F6A] disabled:opacity-60 text-white text-base py-3 shadow-sm transition"
            >
              {creating ? "Creating..." : "Create Outfit"}
            </button>
          </form>
        </div>

        {/* PREVIEW CARD */}
        <div className="w-full md:w-auto">
          <div className="bg-gradient-to-br from-[#e5f6f4] via-white to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md px-5 py-6 flex flex-col items-center min-h-[360px]">
            <div className="flex flex-wrap justify-center items-center gap-5 w-full">
              {baseTop && (
                <div>
                  {baseTop.imageUrl ? (
                    <img
                      src={baseTop.imageUrl}
                      alt=""
                      className="w-28 h-28 object-contain rounded-2xl border bg-white dark:bg-gray-700 mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
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
                      className="w-28 h-28 object-contain rounded-2xl border bg-white dark:bg-gray-700 mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
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
                      className="w-28 h-28 object-contain rounded-2xl border bg-white dark:bg-gray-700 mx-auto"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
                      Shoes
                    </div>
                  )}
                </div>
              )}
              {additional.length > 0 &&
                additional.map((item) => (
                  <div key={item.id}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-20 h-20 object-contain rounded-2xl border bg-white dark:bg-gray-700 mx-auto"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
                        +
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {!baseTop && !baseBottom && !footwear && additional.length === 0 && (
              <div className="text-gray-400 dark:text-gray-500 text-center mt-16 text-sm">
                Start picking items<br />to build your outfit!
              </div>
            )}
          </div>
        </div>
      </div >

      {/* MODALS */}
      < ClosetPickerModal
        visible={modal === "base_top"
        }
        onClose={() => setModal(null)}
        items={
          allItems.filter(
            (i) =>
              i.layerCategory === "base_top" &&
              CATEGORY_BY_LAYER["base_top"].some((c) => c.value === i.category) &&
              (!selectedIds.includes(i.id) || baseTop?.id === i.id)
          )
        }
        onSelect={(item) => setBaseTop(item)}
        title="Pick a Base Top"
      />
      <ClosetPickerModal
        visible={modal === "base_bottom"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          (i) =>
            i.layerCategory === "base_bottom" &&
            CATEGORY_BY_LAYER["base_bottom"].some((c) => c.value === i.category) &&
            (!selectedIds.includes(i.id) || baseBottom?.id === i.id)
        )}
        onSelect={(item) => setBaseBottom(item)}
        title="Pick a Base Bottom"
      />
      <ClosetPickerModal
        visible={modal === "footwear"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          (i) =>
            i.layerCategory === "footwear" &&
            CATEGORY_BY_LAYER["footwear"].some((c) => c.value === i.category) &&
            (!selectedIds.includes(i.id) || footwear?.id === i.id)
        )}
        onSelect={(item) => setFootwear(item)}
        title="Pick Footwear"
      />

      <ClosetPickerModal
        visible={modal === "additional"}
        onClose={() => setModal(null)}
        items={allItems.filter(
          (i) =>
            !["base_top", "base_bottom", "footwear"].includes(i.layerCategory) &&
            !selectedIds.includes(i.id)
        )}
        onSelect={(item) => handleAddAdditional(item)}
        title="Add Additional Items"
        closeOnSelect={false}
      />
    </div >
  );
}
