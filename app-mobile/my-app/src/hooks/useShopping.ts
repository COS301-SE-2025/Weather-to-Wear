import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';

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

interface ShoppingResult {
  item: {
    id: string;
    category: string;
    imageUrl: string;
  };
  searchQuery: string;
  searchMethod: string;
  message?: string;
  location: string;
  quota: {
    rekognition: { remaining: number; totalUsed: number };
    canUseRekognition: boolean;
  };
  purchaseOptions: PurchaseOption[];
  totalResults: number;
}

interface UsageStats {
  rekognition: { used: number; limit: number; remaining: number };
  serpApi: { used: number; limit: number; remaining: number };
  month: string;
}

export const useShopping = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  const fetchUsageStats = async (): Promise<UsageStats | null> => {
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_BASE}/api/shopping/usage-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const stats = await response.json();
        setUsageStats(stats);
        return stats;
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
    return null;
  };

  const findPurchaseOptions = async (
    itemId: string, 
    location?: string, 
    forceMetadata = false
  ): Promise<ShoppingResult | null> => {
    if (!token) return null;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/shopping/item/${itemId}/purchase-options`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          location: location || 'Pretoria, South Africa',
          forceMetadata 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update usage stats if provided
        if (result.quota) {
          setUsageStats(prev => prev ? {
            ...prev,
            rekognition: result.quota.rekognition
          } : null);
        }
        
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to find purchase options');
      }
    } catch (error) {
      console.error('Shopping search failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    usageStats,
    fetchUsageStats,
    findPurchaseOptions
  };
};
