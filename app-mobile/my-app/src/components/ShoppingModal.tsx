import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ExternalLink, Star, AlertCircle, Loader } from 'lucide-react';
import { useShopping } from '../hooks/useShopping';

interface PurchaseOption {
  title: string;
  store: string;
  price: string;
  extractedPrice: number;
  productUrl: string;
  thumbnail: string;
  rating?: number;
  reviews?: number;
}

interface ShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemCategory: string;
  itemImage: string;
}

const ShoppingModal: React.FC<ShoppingModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemCategory,
  itemImage
}) => {
  const { loading, usageStats, fetchUsageStats, findPurchaseOptions } = useShopping();
  const [results, setResults] = useState<PurchaseOption[]>([]);
  const [searchInfo, setSearchInfo] = useState<{
    method: string;
    query: string;
    totalResults: number;
    message?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setError(null);
      setResults([]);
      setSearchInfo(null);
      
      fetchUsageStats();
      handleSearch(true); // Always use metadata search (Quick Search)
    }
  }, [isOpen, itemId]);

  const handleSearch = async (forceMetadata = false) => {
    setError(null);
    setResults([]);
    setSearchInfo(null);

    try {
      const result = await findPurchaseOptions(itemId, undefined, forceMetadata);
      
      if (result) {
        setResults(result.purchaseOptions);
        setSearchInfo({
          method: result.searchMethod,
          query: result.searchQuery,
          totalResults: result.totalResults,
          message: result.message
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find purchase options');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
              <img
                src={itemImage}
                alt={itemCategory}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-[#3F978F]/10 rounded-xl">
                  <ShoppingBag size={20} className="text-[#3F978F]" />
                </div>
                Shop Similar {itemCategory}
              </h2>
              <p className="text-gray-500 text-sm mt-1">Discover where to buy this item online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all duration-200 hover:scale-105"
          >
            <X size={20} />
          </button>
        </div>

        {/* Usage Stats */}
        {usageStats && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                AI Visual Search: {usageStats.rekognition.used}/{usageStats.rekognition.limit}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usageStats.rekognition.remaining < 50 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(usageStats.rekognition.used / usageStats.rekognition.limit) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {usageStats.rekognition.remaining} left
                </span>
              </div>
            </div>
          </div>
        )}



        {/* Search Info */}
        {searchInfo && (
          <div className="px-4 py-2 bg-gradient-to-r from-[#3F978F]/5 to-[#3F978F]/10 border-b border-gray-200 flex-shrink-0">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#3F978F]">
                  🛍️ Shopping Search
                </span>
                <span className="text-xs font-medium text-gray-600 bg-white/60 px-3 py-1 rounded-full">
                  {searchInfo.totalResults} results found
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                Searched for: "<span className="text-gray-800 font-normal">{searchInfo.query}</span>"
              </p>
              {searchInfo.message && (
                <p className="text-orange-600 mt-2 text-xs flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-xl">
                  <AlertCircle size={14} />
                  {searchInfo.message}
                </p>
              )}
            </div>
          </div>
        )}



        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3F978F]/20 to-[#3F978F]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Loader className="animate-spin text-[#3F978F]" size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Searching for similar items</h3>
                <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Our AI is analyzing your item to find the best purchase options...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">Search Failed</h3>
                  <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#3F978F]/30"
                >
                  <div className="aspect-square w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden mb-3 shadow-inner">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/200/200';
                      }}
                    />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 h-10 text-gray-800 leading-relaxed">
                    {item.title}
                  </h3>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-[#3F978F]">
                      {item.price}
                    </span>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                      {item.store}
                    </span>
                  </div>
                  
                  {item.rating && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="fill-yellow-400 text-yellow-400" size={16} />
                        <span className="text-sm font-semibold">{item.rating}</span>
                      </div>
                      {item.reviews && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({item.reviews} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#3F978F] text-white py-2.5 rounded-2xl hover:bg-[#347e77] transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                  >
                    <ExternalLink size={16} />
                    View Product
                  </a>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && searchInfo && !loading && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="text-gray-400" size={36} />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                No purchase options found
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
                We couldn't find any similar items available for purchase. This might be due to the specific style, color, or category of your item.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleSearch(true)}
                  className="px-6 py-3 bg-[#3F978F] text-white rounded-2xl hover:bg-[#347e77] transition-all duration-200 font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02]"
                >
                  Search Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingModal;
