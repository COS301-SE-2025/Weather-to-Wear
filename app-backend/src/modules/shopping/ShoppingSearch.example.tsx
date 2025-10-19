// Example React component for using the shopping API
import React, { useState } from 'react';

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

interface UsageStats {
  rekognition: { used: number; limit: number; remaining: number };
  serpApi: { used: number; limit: number; remaining: number };
  month: string;
}

const ShoppingSearch: React.FC<{ clothingItemId: string; authToken: string }> = ({ 
  clothingItemId, 
  authToken 
}) => {
  const [results, setResults] = useState<PurchaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [searchInfo, setSearchInfo] = useState<{
    method: string;
    query: string;
    totalResults: number;
  } | null>(null);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/shopping/usage-stats', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const stats = await response.json();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const handleSearch = async (forceMetadata = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shopping/item/${clothingItemId}/purchase-options`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          forceMetadata,
          location: 'Pretoria, South Africa' // Or get from user
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.purchaseOptions);
        setSearchInfo({
          method: data.searchMethod,
          query: data.searchQuery,
          totalResults: data.totalResults
        });
        
        // Update usage stats
        if (data.quota) {
          setUsageStats(prev => prev ? {
            ...prev,
            rekognition: data.quota.rekognition
          } : null);
        }
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsageStats();
  }, []);

  return (
    <div className="shopping-search">
      {/* Usage Stats Display */}
      {usageStats && (
        <div className="usage-stats mb-4 p-3 bg-gray-100 rounded">
          <h4 className="font-semibold">API Usage This Month</h4>
          <div className="flex items-center space-x-2">
            <span>Visual Search: {usageStats.rekognition.used}/{usageStats.rekognition.limit}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  usageStats.rekognition.remaining < 50 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${(usageStats.rekognition.used / usageStats.rekognition.limit) * 100}%` 
                }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {usageStats.rekognition.remaining} remaining
            </span>
          </div>
        </div>
      )}

      {/* Search Buttons */}
      <div className="search-buttons mb-4 space-x-2">
        <button 
          onClick={() => handleSearch(false)}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Smart Search (AI Visual)'}
        </button>
        <button 
          onClick={() => handleSearch(true)}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Quick Search (Metadata)
        </button>
      </div>

      {/* Search Info */}
      {searchInfo && (
        <div className="search-info mb-4 p-2 bg-blue-50 rounded">
          <p><strong>Search Method:</strong> {searchInfo.method}</p>
          <p><strong>Search Query:</strong> "{searchInfo.query}"</p>
          <p><strong>Results Found:</strong> {searchInfo.totalResults}</p>
        </div>
      )}

      {/* Quota Warning */}
      {usageStats && !usageStats.rekognition.remaining && (
        <div className="quota-warning mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
           Visual search quota exceeded for this month. Using metadata search only.
        </div>
      )}

      {/* Results */}
      <div className="results">
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item, index) => (
              <div key={index} className="purchase-option border rounded-lg p-4 hover:shadow-lg">
                <img 
                  src={item.thumbnail} 
                  alt={item.title}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{item.title}</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-blue-600">{item.price}</span>
                  <span className="text-sm text-gray-500">{item.store}</span>
                </div>
                {item.rating && (
                  <div className="flex items-center mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm ml-1">{item.rating}</span>
                    {item.reviews && (
                      <span className="text-xs text-gray-500 ml-1">({item.reviews} reviews)</span>
                    )}
                  </div>
                )}
                <a 
                  href={item.productUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-green-500 text-white py-2 rounded hover:bg-green-600"
                >
                  View Product
                </a>
              </div>
            ))}
          </div>
        )}
        
        {results.length === 0 && searchInfo && (
          <div className="no-results text-center py-8 text-gray-500">
            <p>No purchase options found.</p>
            <p className="text-sm">Try adding more details to your clothing item or use a different search method.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingSearch;
