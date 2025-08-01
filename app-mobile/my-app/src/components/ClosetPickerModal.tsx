import React from "react";
import { X } from "lucide-react";

export interface ClosetItem {
  id: string;
  name?: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  layerCategory?: string;
  // Add other fields as needed
}

interface ClosetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  items: ClosetItem[];
  onSelect: (id: string) => void;
}


export default function ClosetPickerModal({
  visible,
  onClose,
  items,
  onSelect
}: ClosetPickerModalProps) {

  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Pick an Item</h2>
        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="col-span-2 text-gray-500 italic">No items found.</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              className="flex flex-col items-center rounded-lg p-3 bg-gray-50 hover:bg-teal-50 border border-gray-200 transition"
              onClick={() => {
                onSelect(item.id);
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
}
