import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, ExternalLink, Star, AlertCircle, Loader, Eye } from 'lucide-react';
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
      fetchUsageStats();
      handleSearch(false); // Start with smart search
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={itemImage}
                alt={itemCategory}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingBag size={20} />
                Where to Buy This {itemCategory}
              </h2>
              <p className="text-gray-500 text-sm">Find similar items from various stores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Usage Stats */}
        {usageStats && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
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

        {/* Search Options */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Search Methods</h3>
            <p className="text-xs text-gray-500">Choose how to find similar items</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleSearch(false)}
              disabled={loading}
              className="flex flex-col items-start gap-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="flex items-center gap-2 w-full">
                {loading ? <Loader className="animate-spin" size={16} /> : <Eye size={16} />}
                <span className="font-medium">Smart Search (AI Visual)</span>
              </div>
              <span className="text-xs text-blue-100 mt-1">
                AI analyzes the image to find visually similar items
              </span>
            </button>
            <button
              onClick={() => handleSearch(true)}
              disabled={loading}
              className="flex flex-col items-start gap-1 px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="flex items-center gap-2 w-full">
                {loading ? <Loader className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
                <span className="font-medium">Quick Search (Details)</span>
              </div>
              <span className="text-xs text-gray-100 mt-1">
                Uses your item tags (style, material, color) for fast results
              </span>
            </button>
          </div>
        </div>

        {/* Search Info */}
        {searchInfo && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-800">
                  {searchInfo.method === 'AI Visual Analysis' ? '🤖 AI Visual Search' : 
                   searchInfo.method === 'Quick Search (Details)' ? '⚡ Quick Search' :
                   searchInfo.method === 'Metadata Search (AI Fallback)' ? '📝 Metadata Search (AI Fallback)' :
                   '📝 Metadata Search'}
                </span>
                <span className="text-blue-600">
                  {searchInfo.totalResults} results found
                </span>
              </div>
              <p className="text-blue-700 mt-1">
                Searched for: "<span className="font-medium">{searchInfo.query}</span>"
              </p>
              {searchInfo.message && (
                <p className="text-orange-600 mt-1 text-xs flex items-center gap-1">
                  <AlertCircle size={12} />
                  {searchInfo.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quota Warning */}
        {usageStats && !usageStats.rekognition.remaining && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-gray-200">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">
                AI Visual search quota exceeded for this month. Using metadata search only.
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-4 text-blue-500" size={32} />
                <p className="text-gray-500">Searching for purchase options...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <span className="font-medium">Search Failed</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/200/200';
                      }}
                    />
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 h-10">
                    {item.title}
                  </h3>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-green-600">
                      {item.price}
                    </span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {item.store}
                    </span>
                  </div>
                  
                  {item.rating && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="fill-yellow-400 text-yellow-400" size={14} />
                        <span className="text-sm font-medium">{item.rating}</span>
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
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <ExternalLink size={14} />
                    View Product
                  </a>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && searchInfo && !loading && (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No purchase options found
              </h3>
              <p className="text-gray-500 mb-4">
                Try using a different search method or check back later.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleSearch(!searchInfo.method.includes('visual'))}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Try {searchInfo.method.includes('visual') ? 'Metadata' : 'Visual'} Search
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
