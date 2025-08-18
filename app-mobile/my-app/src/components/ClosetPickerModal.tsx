// ClosetPickerModal.tsx
import React from "react";
import { X } from "lucide-react";

export interface ClosetItem {
  id: string;
  name: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  layerCategory: string;
}

interface ClosetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  items: ClosetItem[];
  onSelect: (item: ClosetItem) => void;
  title: string;
  /** NEW: keep modal open after selecting an item (default true = closes) */
  closeOnSelect?: boolean;
}

const ClosetPickerModal: React.FC<ClosetPickerModalProps> = ({
  visible,
  onClose,
  items,
  onSelect,
  title,
  closeOnSelect = true, // default behaviour unchanged
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
      <div
        className="
          bg-white
          w-[96vw] max-w-xs sm:max-w-sm md:max-w-md
          mx-2 rounded-2xl shadow-xl relative flex flex-col
          p-5 font-sans
        "
        style={{ maxHeight: "85vh", minHeight: "180px" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-teal-600 bg-gray-100 hover:bg-teal-50 rounded-full p-2 transition shadow"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h2
          className="text-lg sm:text-xl font-light text-gray-900 text-center mb-4 mt-2 tracking-wide"
          style={{ letterSpacing: "0.04em" }}
        >
          {title}
        </h2>

        <div
          className="
            grid grid-cols-2 gap-4
            overflow-y-auto px-1 pb-2 pt-1
            flex-1
          "
          style={{ maxHeight: "60vh" }}
        >
          {items.length === 0 ? (
            <div className="col-span-2 text-gray-400 italic text-center font-sans py-8">
              No items found.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="
                  flex flex-col items-center rounded-xl p-3
                  bg-gray-50 hover:bg-[#e5f6f4] border border-gray-200
                  shadow transition focus:outline-none focus:ring-2 focus:ring-teal-400
                  active:scale-95
                "
                onClick={() => {
                  onSelect(item);
                  if (closeOnSelect) onClose();
                }}
                type="button"
              >
                <div className="w-16 h-16 bg-white border rounded-xl flex items-center justify-center mb-2 overflow-hidden shadow-sm">
                  <img
                    src={item.image || item.imageUrl || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs font-normal text-gray-800 text-center break-words font-sans">
                  {item.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClosetPickerModal;
