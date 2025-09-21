// src/components/PostClothingPicker.tsx
import React, { useEffect, useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { fetchAllItems } from "../services/closetApi";
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';

type ClosetItemLite = {
  id: string;
  imageUrl: string;
  category: string;
  layerCategory: string;
  name: string;
};

type Props = {
  visible: boolean;
  selectedItemIds: string[];
  onClose: () => void;
  onConfirm: (selectedItems: ClosetItemLite[]) => void;
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

export default function PostClothingPicker({ 
  visible, 
  selectedItemIds, 
  onClose, 
  onConfirm 
}: Props) {
  const [loading, setLoading] = useState(false);
  const [closetItems, setClosetItems] = useState<ClosetItemLite[]>([]);
  const [selectedItems, setSelectedItems] = useState<ClosetItemLite[]>([]);

  // Load closet items when modal opens
  useEffect(() => {
    if (!visible) return;
    
    const loadClosetItems = async () => {
      setLoading(true);
      try {
        const res = await fetchAllItems();
        const formatted: ClosetItemLite[] = (res.data || []).map((item: any) => ({
          id: item.id,
          name: item.category,
          category: item.category,
          layerCategory: item.layerCategory,
          imageUrl: item.imageUrl 
            ? item.imageUrl.startsWith("http")
              ? item.imageUrl
              : absolutize(item.imageUrl, API_BASE)
            : '',
        }));
        setClosetItems(formatted);
        
        // Pre-select items based on selectedItemIds
        const preSelected = formatted.filter(item => selectedItemIds.includes(item.id));
        setSelectedItems(preSelected);
      } catch (error) {
        console.error("Failed to load closet items:", error);
      } finally {
        setLoading(false);
      }
    };

    loadClosetItems();
  }, [visible, selectedItemIds]);

  // Group items by layer
  const itemsByLayer = closetItems.reduce((acc, item) => {
    if (!acc[item.layerCategory]) {
      acc[item.layerCategory] = [];
    }
    acc[item.layerCategory].push(item);
    return acc;
  }, {} as Record<string, ClosetItemLite[]>);

  const toggleItem = (item: ClosetItemLite) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedItems);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[80vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-gray-100">
            Tag Clothing Items ({selectedItems.length} selected)
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading your closet...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {LAYERS.map(layer => {
                const layerItems = itemsByLayer[layer.value] || [];
                if (layerItems.length === 0) return null;

                return (
                  <div key={layer.value}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {layer.label}
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {layerItems.map(item => {
                        const isSelected = selectedItems.some(selected => selected.id === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item)}
                            className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                              isSelected 
                                ? 'border-[#3F978F] ring-2 ring-[#3F978F]/30' 
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDE2IDI1IDEzQzI1IDEwLjIzODYgMjIuNzYxNCA4IDIwIDhDMTcuMjM4NiA4IDE1IDEwLjIzODYgMTUgMTNDMTUgMTYgMTcuMjM4NiAyNSAyMCAyNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHA+PC9wYXRoPgo8L3N2Zz4K';
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#3F978F]/20 flex items-center justify-center">
                                <div className="bg-[#3F978F] rounded-full p-1">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                              {item.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItems.length > 0 
              ? `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} selected`
              : 'Select clothing items to tag in your post'
            }
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="px-4 py-2 text-sm bg-[#3F978F] hover:bg-[#2F6F6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-colors"
            >
              Confirm ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
