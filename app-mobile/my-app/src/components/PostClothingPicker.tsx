// src/components/PostClothingPicker.tsx
import React, { useEffect, useState } from "react";
import { X, Plus, Check, Shirt, Package } from "lucide-react";
import { fetchAllItems } from "../services/closetApi";
import { fetchAllOutfits } from "../services/outfitApi";
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';

type ClosetItemLite = {
  id: string;
  imageUrl: string;
  category: string;
  layerCategory: string;
  name: string;
};

type OutfitLite = {
  id: string;
  overallStyle: string;
  userRating?: number;
  outfitItems: {
    closetItemId: string;
    imageUrl: string;
    category: string;
    layerCategory: string;
  }[];
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
  const [activeTab, setActiveTab] = useState<'items' | 'outfits'>('items');
  const [closetItems, setClosetItems] = useState<ClosetItemLite[]>([]);
  const [outfits, setOutfits] = useState<OutfitLite[]>([]);
  const [selectedItems, setSelectedItems] = useState<ClosetItemLite[]>([]);

  // Load closet items and outfits when modal opens
  useEffect(() => {
    if (!visible) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load closet items
        const itemsRes = await fetchAllItems();
        const formattedItems: ClosetItemLite[] = (itemsRes.data || []).map((item: any) => ({
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
        setClosetItems(formattedItems);

        // Load outfits
        const outfitsRes = await fetchAllOutfits();
        const formattedOutfits: OutfitLite[] = (outfitsRes || []).map((outfit: any) => ({
          id: outfit.id,
          overallStyle: outfit.overallStyle,
          userRating: outfit.userRating,
          outfitItems: (outfit.outfitItems || []).map((item: any) => ({
            closetItemId: item.closetItemId,
            imageUrl: item.imageUrl 
              ? item.imageUrl.startsWith("http")
                ? item.imageUrl
                : absolutize(item.imageUrl, API_BASE)
              : '',
            category: item.category,
            layerCategory: item.layerCategory,
          })),
        }));
        setOutfits(formattedOutfits);
        
        // Pre-select items based on selectedItemIds
        const preSelected = formattedItems.filter(item => selectedItemIds.includes(item.id));
        setSelectedItems(preSelected);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const selectOutfit = (outfit: OutfitLite) => {
    // Convert outfit items to ClosetItemLite format and add them to selection
    const outfitItemsAsClosetItems: ClosetItemLite[] = outfit.outfitItems.map(item => ({
      id: item.closetItemId,
      name: item.category,
      category: item.category,
      layerCategory: item.layerCategory,
      imageUrl: item.imageUrl,
    }));

    setSelectedItems(prev => {
      // Create a map to avoid duplicates
      const itemMap = new Map<string, ClosetItemLite>();
      
      // Add existing items
      prev.forEach(item => itemMap.set(item.id, item));
      
      // Add outfit items (will overwrite if duplicate)
      outfitItemsAsClosetItems.forEach(item => itemMap.set(item.id, item));
      
      return Array.from(itemMap.values());
    });

    // Switch to items tab to show what was selected
    setActiveTab('items');
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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Tag Clothing Items
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedItems.length > 0 
                ? `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} selected`
                : 'Select items to tag in your post'
              }
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="relative mx-6 mt-4">
          <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-inner">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 px-5 py-3.5 text-sm font-semibold flex items-center justify-center gap-2.5 rounded-xl transition-all duration-300 ${
                activeTab === 'items'
                  ? 'bg-white dark:bg-gray-800 text-[#3F978F] shadow-lg ring-1 ring-[#3F978F]/20 transform scale-[1.01]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:shadow-sm'
              }`}
            >
              <Shirt className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'items' ? 'scale-110' : ''}`} />
              <span className="relative">
                Individual Items
                {activeTab === 'items' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#3F978F] rounded-full" />}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('outfits')}
              className={`flex-1 px-5 py-3.5 text-sm font-semibold flex items-center justify-center gap-2.5 rounded-xl transition-all duration-300 ${
                activeTab === 'outfits'
                  ? 'bg-white dark:bg-gray-800 text-[#3F978F] shadow-lg ring-1 ring-[#3F978F]/20 transform scale-[1.01]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:shadow-sm'
              }`}
            >
              <Package className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'outfits' ? 'scale-110' : ''}`} />
              <span className="relative">
                Saved Outfits
                {activeTab === 'outfits' && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#3F978F] rounded-full" />}
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#3F978F] rounded-full animate-spin"></div>
                Loading...
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'items' && (
                <div className="space-y-8 py-4">{/* Enhanced spacing */}
                  {LAYERS.map(layer => {
                    const layerItems = itemsByLayer[layer.value] || [];
                    if (layerItems.length === 0) return null;

                    return (
                      <div key={layer.value}>
                        <div className="flex items-center gap-3 mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {layer.label}
                          </h4>
                          <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-600 to-transparent"></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {layerItems.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                          {layerItems.map(item => {
                            const isSelected = selectedItems.some(selected => selected.id === item.id);
                            return (
                              <button
                                key={item.id}
                                onClick={() => toggleItem(item)}
                                className={`relative aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 group ${
                                  isSelected 
                                    ? 'border-[#3F978F] ring-2 ring-[#3F978F]/30 shadow-lg transform scale-105' 
                                    : 'border-gray-200 dark:border-gray-600 hover:border-[#3F978F]/50 hover:shadow-md hover:scale-102'
                                }`}
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDE2IDI1IDEzQzI1IDEwLjIzODYgMjIuNzYxNCA4IDIwIDhDMTcuMjM4NiA4IDE1IDEwLjIzODYgMTUgMTNDMTUgMTYgMTcuMjM4NiAyNSAyMCAyNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHA+PC9wYXRoPgo8L3N2Zz4K';
                                  }}
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-[#3F978F]/20 flex items-center justify-center">
                                    <div className="bg-[#3F978F] rounded-full p-1.5 shadow-lg">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'outfits' && (
                <div className="py-4">
                  {outfits.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">No saved outfits found</h5>
                      <p className="text-sm text-gray-500">Create some outfits first to tag them in posts!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {outfits.map(outfit => (
                        <button
                          key={outfit.id}
                          className="border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-5 hover:border-[#3F978F] hover:shadow-lg transition-all duration-200 text-left group bg-white dark:bg-gray-800"
                          onClick={() => selectOutfit(outfit)}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#3F978F] transition-colors text-sm">
                              {outfit.overallStyle} Outfit
                            </h5>
                            {outfit.userRating && (
                              <div className="text-yellow-500 text-sm">
                                {'★'.repeat(outfit.userRating)}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2.5 mb-4">
                            {outfit.outfitItems.slice(0, 3).map((item, index) => (
                              <div key={index} className="aspect-square rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700">
                                <img
                                  src={item.imageUrl}
                                  alt={item.category}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDE2IDI1IDEzQzI1IDEwLjIzODYgMjIuNzYxNCA4IDIwIDhDMTcuMjM4NiA4IDE1IDEwLjIzODYgMTUgMTNDMTUgMTYgMTcuMjM4NiAyNSAyMCAyNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHA+PC9wYXRoPgo8L3N2Zz4K';
                                  }}
                                />
                              </div>
                            ))}
                            {outfit.outfitItems.length > 3 && (
                              <div className="aspect-square rounded-xl border border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                  +{outfit.outfitItems.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                              {outfit.outfitItems.length} item{outfit.outfitItems.length !== 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center gap-1.5 text-[#3F978F] opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">Add All</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="px-6 py-2.5 text-sm font-medium bg-[#3F978F] hover:bg-[#2F6F6A] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:hover:shadow-none"
          >
            {selectedItems.length > 0 ? `Confirm (${selectedItems.length})` : 'Select Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
