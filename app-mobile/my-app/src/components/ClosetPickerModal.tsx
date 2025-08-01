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
}

const ClosetPickerModal: React.FC<ClosetPickerModalProps> = ({
  visible,
  onClose,
  items,
  onSelect,
  title
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
      <div
        className="
          bg-white
          w-[96vw] max-w-xs sm:max-w-sm md:max-w-md
          mx-2 rounded-2xl shadow-xl relative flex flex-col
          p-4
        "
        style={{
          maxHeight: "85vh",
          minHeight: "180px",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-black"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold mb-3 mt-3 text-center">{title}</h2>
        <div
          className="
            grid grid-cols-2 gap-3
            overflow-y-auto px-1 pb-2
            flex-1
          "
          style={{
            maxHeight: "60vh",
          }}
        >
          {items.length === 0 ? (
            <div className="col-span-2 text-gray-500 italic">No items found.</div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="
                  flex flex-col items-center rounded-lg p-2
                  bg-gray-50 hover:bg-teal-50 border border-gray-200 transition
                  focus:outline-none focus:ring-2 focus:ring-teal-400
                "
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                type="button"
              >
                <img
                  src={item.image || item.imageUrl || "/placeholder.svg"}
                  alt={item.name}
                  className="w-16 h-16 object-contain rounded mb-1"
                />
                <span className="text-xs font-medium text-center break-words">{item.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ClosetPickerModal;
