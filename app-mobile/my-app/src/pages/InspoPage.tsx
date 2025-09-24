import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Thermometer, Droplets, Sun, Cloud, CloudRain, Wind, Filter, Trash2, RefreshCw } from 'lucide-react';

interface WeatherCondition {
  minTemp: number;
  maxTemp: number;
  conditions: string[];
}

interface InspoItem {
  closetItemId: string;
  imageUrl: string;
  layerCategory: string;
  category: string;
  style?: string;
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  dominantColors?: string[];
  sortOrder: number;
}

interface InspoOutfit {
  id: string;
  overallStyle: string;
  warmthRating: number;
  waterproof: boolean;
  tags: string[];
  recommendedWeather: WeatherCondition;
  inspoItems: InspoItem[];
  score: number;
}

interface WeatherFilter {
  minTemp?: number;
  maxTemp?: number;
  conditions?: string[];
}

interface GenerateInspoRequest {
  weatherFilter?: WeatherFilter;
  styleFilter?: string;
  limit?: number;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Functions
const generateInspoOutfits = async (request: GenerateInspoRequest): Promise<InspoOutfit[]> => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/inspo/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate inspiration outfits');
  }

  return response.json();
};

const getUserInspoOutfits = async (): Promise<InspoOutfit[]> => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/inspo`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch inspiration outfits');
  }

  return response.json();
};

const deleteInspoOutfit = async (id: string): Promise<void> => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/inspo/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete inspiration outfit');
  }
};

// Weather Icons Component
const WeatherIcon = ({ condition, size = 16 }: { condition: string; size?: number }) => {
  const icons = {
    sunny: <Sun size={size} className="text-yellow-500" />,
    cloudy: <Cloud size={size} className="text-gray-400" />,
    rainy: <CloudRain size={size} className="text-blue-500" />,
    drizzle: <CloudRain size={size} className="text-blue-400" />,
    windy: <Wind size={size} className="text-gray-500" />,
    hot: <Sun size={size} className="text-orange-500" />,
    warm: <Sun size={size} className="text-yellow-400" />,
    mild: <Sun size={size} className="text-yellow-300" />,
    cool: <Cloud size={size} className="text-blue-300" />,
    cold: <Cloud size={size} className="text-blue-500" />,
    freezing: <Cloud size={size} className="text-blue-700" />,
  };
  
  return icons[condition as keyof typeof icons] || <Sun size={size} className="text-gray-400" />;
};

// Outfit Card Component
const OutfitCard = ({ outfit, onDelete }: { outfit: InspoOutfit; onDelete: (id: string) => void }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 capitalize">{outfit.overallStyle} Style</h3>
            <p className="text-sm text-gray-500">Score: {outfit.score.toFixed(1)}</p>
          </div>
          <button
            onClick={() => onDelete(outfit.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete outfit"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        {/* Weather Recommendations */}
        <div className="mt-3 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Thermometer size={14} />
            <span>{outfit.recommendedWeather.minTemp}°C - {outfit.recommendedWeather.maxTemp}°C</span>
          </div>
          {outfit.waterproof && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Droplets size={14} />
              <span>Waterproof</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            {outfit.recommendedWeather.conditions.slice(0, 3).map((condition, index) => (
              <WeatherIcon key={index} condition={condition} size={14} />
            ))}
          </div>
        </div>
      </div>

      {/* Clothing Items */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outfit.inspoItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <div key={item.closetItemId} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={item.imageUrl || '/api/placeholder/150/150'}
                    alt={item.category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {item.colorHex && (
                    <div
                      className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: item.colorHex }}
                    />
                  )}
                </div>
                <div className="mt-1 text-xs text-center">
                  <p className="font-medium capitalize text-gray-700">{item.category}</p>
                  <p className="text-gray-500 capitalize">{item.layerCategory.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
        </div>

        {/* Tags */}
        {outfit.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {outfit.tags.slice(0, 8).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag.replace(':', ': ').replace('_', ' ')}
              </span>
            ))}
            {outfit.tags.length > 8 && (
              <span className="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded-full">
                +{outfit.tags.length - 8} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({ 
  onFilterChange, 
  onGenerate,
  isGenerating 
}: { 
  onFilterChange: (filters: GenerateInspoRequest) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) => {
  const [filters, setFilters] = useState<GenerateInspoRequest>({
    limit: 10,
  });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof GenerateInspoRequest, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const updateWeatherFilter = (key: keyof WeatherFilter, value: any) => {
    const weatherFilter = { ...filters.weatherFilter, [key]: value };
    updateFilter('weatherFilter', weatherFilter);
  };

  const weatherConditions = ['sunny', 'cloudy', 'rainy', 'drizzle', 'windy', 'hot', 'warm', 'mild', 'cool', 'cold', 'freezing'];
  const styles = ['casual', 'formal', 'athletic', 'party', 'business', 'outdoor'];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Generate New Inspiration</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter size={16} />
            <span>Filters</span>
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          {/* Style Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
            <select
              value={filters.styleFilter || ''}
              onChange={(e) => updateFilter('styleFilter', e.target.value || undefined)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any Style</option>
              {styles.map((style) => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Range (°C)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min temp"
                value={filters.weatherFilter?.minTemp || ''}
                onChange={(e) => updateWeatherFilter('minTemp', e.target.value ? parseInt(e.target.value) : undefined)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max temp"
                value={filters.weatherFilter?.maxTemp || ''}
                onChange={(e) => updateWeatherFilter('maxTemp', e.target.value ? parseInt(e.target.value) : undefined)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Weather Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weather Conditions</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {weatherConditions.map((condition) => (
                <label key={condition} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.weatherFilter?.conditions?.includes(condition) || false}
                    onChange={(e) => {
                      const currentConditions = filters.weatherFilter?.conditions || [];
                      const newConditions = e.target.checked
                        ? [...currentConditions, condition]
                        : currentConditions.filter(c => c !== condition);
                      updateWeatherFilter('conditions', newConditions.length > 0 ? newConditions : undefined);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-1">
                    <WeatherIcon condition={condition} size={14} />
                    <span className="text-xs capitalize">{condition}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Results</label>
            <input
              type="number"
              min="1"
              max="50"
              value={filters.limit || 10}
              onChange={(e) => updateFilter('limit', parseInt(e.target.value) || 10)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Main InspoPage Component
const InspoPage = () => {
  const [filters, setFilters] = useState<GenerateInspoRequest>({ limit: 10 });
  const queryClient = useQueryClient();

  // Query for existing inspo outfits
  const { data: existingOutfits, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['inspo-outfits'],
    queryFn: getUserInspoOutfits,
  });

  // Query for generated outfits (starts empty)
  const [generatedOutfits, setGeneratedOutfits] = useState<InspoOutfit[]>([]);

  // Generate new outfits mutation
  const generateMutation = useMutation({
    mutationFn: generateInspoOutfits,
    onSuccess: (data) => {
      setGeneratedOutfits(data);
    },
  });

  // Delete outfit mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInspoOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspo-outfits'] });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(filters);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this inspiration outfit?')) {
      deleteMutation.mutate(id);
    }
  };

  const allOutfits = [...generatedOutfits, ...(existingOutfits || [])];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Style Inspiration</h1>
          <p className="text-gray-600">
            Discover new outfit ideas based on your liked items and personal style preferences.
          </p>
        </div>

        {/* Generate Section */}
        <FilterPanel
          onFilterChange={setFilters}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
        />

        {/* Error States */}
        {generateMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              {(generateMutation.error as Error)?.message || 'Failed to generate inspiration outfits'}
            </p>
            <p className="text-sm text-red-600 mt-1">
              Try liking some items from the social feed or rating your outfits to get better recommendations.
            </p>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              Failed to delete inspiration outfit. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingExisting && (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
            <p className="text-gray-500">Loading your inspiration outfits...</p>
          </div>
        )}

        {/* Results */}
        {allOutfits.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Inspiration Outfits ({allOutfits.length})
            </h2>
            {allOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : !isLoadingExisting && (
          <div className="text-center py-12">
            <div className="mb-4">
              <Sun className="mx-auto text-gray-400" size={64} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No inspiration outfits yet</h3>
            <p className="text-gray-500 mb-4">
              Start by liking some items from the social feed or generate new recommendations based on your style.
            </p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Your First Inspiration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspoPage;
