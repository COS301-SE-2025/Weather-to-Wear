import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Thermometer, Droplets, Sun, Cloud, CloudRain, Wind, Filter, Trash2, RefreshCw, Snowflake, CloudSnow } from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { absolutize } from '../utils/url';

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
  temperatureRanges?: { minTemp: number; maxTemp: number }[];
}

interface GenerateInspoRequest {
  weatherFilter?: WeatherFilter;
  styleFilter?: string;
  limit?: number;
}

type ConfirmState = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve?: (ok: boolean) => void;
};

// Create API endpoint from the imported API_BASE
const API_ENDPOINT = `${API_BASE}/api`;

// API Functions
const generateInspoOutfits = async (request: GenerateInspoRequest, token: string): Promise<InspoOutfit[]> => {
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_ENDPOINT}/inspo/generate`, {
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

const getUserInspoOutfits = async (token: string): Promise<InspoOutfit[]> => {
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_ENDPOINT}/inspo`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch inspiration outfits');
  }

  return response.json();
};

const deleteInspoOutfit = async (id: string, token: string): Promise<void> => {
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_ENDPOINT}/inspo/${id}`, {
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
    cold: <CloudSnow size={size} className="text-blue-600" />,
    freezing: <Snowflake size={size} className="text-blue-800" />,
  };
  
  return icons[condition as keyof typeof icons] || <Sun size={size} className="text-gray-400" />;
};

// Helper function to get weather icon based on temperature
const getWeatherIconForTemperature = (avgTemp: number, conditions: string[] = [], size = 16) => {
  // Check if specific weather conditions are present that should override temperature
  const hasRain = conditions.some(c => c.toLowerCase().includes('rain') || c.toLowerCase().includes('drizzle'));
  const hasWind = conditions.some(c => c.toLowerCase().includes('wind'));
  
  if (hasRain) {
    return <CloudRain size={size} className="text-blue-500" />;
  }
  
  // Temperature-based icons
  if (avgTemp >= 30) {
    // Very hot - bright orange sun
    return <Sun size={size} className="text-orange-600" />;
  } else if (avgTemp >= 24) {
    // Hot - orange/yellow sun
    return <Sun size={size} className="text-orange-500" />;
  } else if (avgTemp >= 22) {
    // Warm - yellow sun
    return <Sun size={size} className="text-yellow-500" />;
  } else if (avgTemp >= 12) {
    // Moderate/partly cloudy weather (12-22°C) - show both sun and cloud
    return (
      <div className="flex items-center space-x-1">
        <Sun size={size} className="text-yellow-400" />
        <Cloud size={size} className="text-gray-400" />
      </div>
    );
  } else if (avgTemp >= 10) {
    // Cool - cloudy
    return <Cloud size={size} className="text-gray-400" />;
  } else if (avgTemp >= 0) {
    // Cold - cold cloud with possible snow
    return <CloudSnow size={size} className="text-blue-500" />;
  } else {
    // Freezing - snowflake
    return <Snowflake size={size} className="text-blue-700" />;
  }
};

// Outfit Card Component
const OutfitCard = ({ outfit, onDelete }: { outfit: InspoOutfit; onDelete: (id: string) => void }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4 border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 capitalize">{outfit.overallStyle} Style</h3>
          </div>
          <button
            onClick={() => onDelete(outfit.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
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
            <div className="flex items-center space-x-1 text-[#3F978F]">
              <Droplets size={14} />
              <span>Waterproof</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            {(() => {
              const avgTemp = (outfit.recommendedWeather.minTemp + outfit.recommendedWeather.maxTemp) / 2;
              const primaryIcon = getWeatherIconForTemperature(avgTemp, outfit.recommendedWeather.conditions, 16);
              
              // Show up to 2 additional condition-based icons if they're different from temperature-based icon
              const additionalIcons = outfit.recommendedWeather.conditions
                .slice(0, 2)
                .map(condition => condition.toLowerCase())
                .filter(condition => {
                  // Only show if it's a specific weather condition (not temperature-based)
                  return ['rainy', 'drizzle', 'windy'].includes(condition) || 
                         condition.includes('rain') || condition.includes('wind');
                })
                .slice(0, 2)
                .map((condition, index) => (
                  <WeatherIcon key={`additional-${index}`} condition={condition} size={14} />
                ));
              
              return (
                <>
                  {primaryIcon}
                  {additionalIcons}
                </>
              );
            })()}
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
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={item.imageUrl ? absolutize(item.imageUrl, API_BASE) : '/api/placeholder/150/150'}
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

        {/* Temperature Suitability Bar */}
        <div className="mt-4">
          <div className="relative px-32">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Temperature Suitability</span>
              <span className="text-xs text-gray-500">
                {outfit.recommendedWeather.minTemp}°C - {outfit.recommendedWeather.maxTemp}°C
              </span>
            </div>
          </div>
          
          {(() => {
            // Calculate average temperature for the outfit
            const avgTemp = (outfit.recommendedWeather.minTemp + outfit.recommendedWeather.maxTemp) / 2;
            console.log(`Temperature: ${avgTemp}°C (${outfit.recommendedWeather.minTemp}°C - ${outfit.recommendedWeather.maxTemp}°C)`);
            
            // Determine bar color and fill based on temperature
            let barColor, fillPercentage, tempLabel;
            
            if (avgTemp >= 22) {
              // Hot weather - red/orange bar, high fill (60-85%)
              barColor = 'from-orange-400 to-red-500';
              fillPercentage = Math.min(85, 60 + ((avgTemp - 22) / 14) * 25); // 60-85% fill for 22-36°C
              tempLabel = 'Hot Weather';
            } else if (avgTemp >= 12) {
              // Moderate weather - yellow/orange bar, medium fill (35-55%)
              barColor = 'from-yellow-400 to-orange-400';
              fillPercentage = 35 + ((avgTemp - 12) / 10) * 20; // 35-55% fill for 12-22°C
              tempLabel = 'Moderate Weather';
            } else {
              // Cold weather - blue bar, low fill (10-30%)
              barColor = 'from-blue-400 to-blue-600';
              fillPercentage = Math.max(10, 30 - ((12 - avgTemp) / 22) * 20); // 10-30% fill for -10-12°C
              tempLabel = 'Cold Weather';
            }
            
            return (
              <div className="relative px-32">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out rounded-full`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-blue-600 font-medium">Cold</span>
                  <span className="text-xs font-medium text-gray-700">{tempLabel}</span>
                  <span className="text-xs text-red-600 font-medium">Hot</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tags */}
        <div className="mt-4 flex justify-center flex-wrap gap-2">
          {/* Warmth Factor Tag */}
          {(() => {
            const rating = outfit.warmthRating;
            let warmthLabel, warmthIcon, bgColor, textColor;
            
            if (rating >= 25) {
              warmthLabel = 'Extreme Warmth';
              warmthIcon = '🔥';
              bgColor = 'bg-red-200';
              textColor = 'text-red-900';
            } else if (rating >= 20) {
              warmthLabel = 'Very Warm';
              warmthIcon = '🔥';
              bgColor = 'bg-red-100';
              textColor = 'text-red-800';
            } else if (rating >= 15) {
              warmthLabel = 'Warm';
              warmthIcon = '🌡️';
              bgColor = 'bg-orange-100';
              textColor = 'text-orange-800';
            } else if (rating >= 10) {
              warmthLabel = 'Moderate';
              warmthIcon = '🌤️';
              bgColor = 'bg-yellow-100';
              textColor = 'text-yellow-800';
            } else if (rating >= 6) {
              warmthLabel = 'Cool';
              warmthIcon = '🌬️';
              bgColor = 'bg-blue-100';
              textColor = 'text-blue-800';
            } else {
              warmthLabel = 'Cold';
              warmthIcon = '❄️';
              bgColor = 'bg-indigo-100';
              textColor = 'text-indigo-800';
            }
            
            return (
              <span className={`px-3 py-1 ${bgColor} ${textColor} text-xs rounded-full font-medium flex items-center gap-1`}>
                <span>{warmthIcon}</span>
                {warmthLabel}
              </span>
            );
          })()}

          {/* Weather Condition Tag */}
          {(() => {
            const avgTemp = (outfit.recommendedWeather.minTemp + outfit.recommendedWeather.maxTemp) / 2;
            const primaryIcon = getWeatherIconForTemperature(avgTemp, outfit.recommendedWeather.conditions, 14);
            
            let weatherLabel;
            if (avgTemp >= 30) {
              weatherLabel = 'Very Hot';
            } else if (avgTemp >= 24) {
              weatherLabel = 'Hot';
            } else if (avgTemp >= 22) {
              weatherLabel = 'Warm';
            } else if (avgTemp >= 12) {
              weatherLabel = 'Partly Cloudy';
            } else if (avgTemp >= 10) {
              weatherLabel = 'Cool';
            } else if (avgTemp >= 0) {
              weatherLabel = 'Cold';
            } else {
              weatherLabel = 'Freezing';
            }
            
            return (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium flex items-center gap-1">
                {primaryIcon}
                <span>{weatherLabel}</span>
              </span>
            );
          })()}

          {/* Color Scheme Tag */}
          {(() => {
            // Collect all dominant colors from outfit items
            const allColors = outfit.inspoItems
              .flatMap(item => item.dominantColors || (item.colorHex ? [item.colorHex] : []))
              .filter(Boolean);
            
            // Get unique colors (remove duplicates)
            const uniqueColors = Array.from(new Set(allColors)).slice(0, 4); // Show max 4 colors
            
            if (uniqueColors.length > 0) {
              return (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium flex items-center gap-2">
                  <span>Colors</span>
                  <div className="flex gap-1">
                    {uniqueColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </span>
              );
            }
            return null;
          })()}

          {/* Style Tag */}
          <span className="px-3 py-1 bg-[#3F978F]/10 text-[#3F978F] text-xs rounded-full font-medium capitalize">
            {outfit.overallStyle} Style
          </span>
        </div>
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
    <div className="bg-white rounded-2xl shadow-md p-4 mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Generate New Inspiration</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Filter size={16} />
            <span>Filters</span>
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-[#3F978F] text-white rounded-full hover:bg-[#359A91] disabled:opacity-50 transition-colors"
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
              className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3F978F] focus:border-transparent"
            >
              <option value="">Any Style</option>
              {styles.map((style) => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Ranges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Ranges</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Freezing', range: '< 0°C', minTemp: -10, maxTemp: -1 },
                { label: 'Cold', range: '0-10°C', minTemp: 0, maxTemp: 10 },
                { label: 'Cool', range: '10-15°C', minTemp: 10, maxTemp: 15 },
                { label: 'Mild', range: '15-20°C', minTemp: 15, maxTemp: 20 },
                { label: 'Warm', range: '20-25°C', minTemp: 20, maxTemp: 25 },
                { label: 'Hot', range: '25-30°C', minTemp: 25, maxTemp: 30 },
                { label: 'Very Hot', range: '30°C+', minTemp: 30, maxTemp: 40 },
              ].map((tempRange) => {
                // Check if this range is selected by looking at selected temperature ranges array
                const selectedRanges = filters.weatherFilter?.temperatureRanges || [];
                const isSelected = selectedRanges.some(range => 
                  range.minTemp === tempRange.minTemp && range.maxTemp === tempRange.maxTemp
                );
                
                return (
                  <label key={tempRange.label} className="flex items-center space-x-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const currentRanges = filters.weatherFilter?.temperatureRanges || [];
                        
                        if (e.target.checked) {
                          // Add this temperature range to the selection
                          const newRanges = [...currentRanges, { minTemp: tempRange.minTemp, maxTemp: tempRange.maxTemp }];
                          const newWeatherFilter = {
                            ...filters.weatherFilter,
                            temperatureRanges: newRanges
                          };
                          updateFilter('weatherFilter', newWeatherFilter);
                        } else {
                          // Remove this temperature range from the selection
                          const newRanges = currentRanges.filter(range => 
                            !(range.minTemp === tempRange.minTemp && range.maxTemp === tempRange.maxTemp)
                          );
                          
                          const newWeatherFilter = { ...filters.weatherFilter };
                          if (newRanges.length > 0) {
                            newWeatherFilter.temperatureRanges = newRanges;
                          } else {
                            delete newWeatherFilter.temperatureRanges;
                          }
                          
                          // If no weather filters remain, set to undefined
                          const hasOtherFilters = newWeatherFilter.conditions && newWeatherFilter.conditions.length > 0;
                          updateFilter('weatherFilter', hasOtherFilters || newRanges.length > 0 ? newWeatherFilter : undefined);
                        }
                      }}
                      className="rounded border-gray-300 text-[#3F978F] focus:ring-[#3F978F]"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{tempRange.label}</span>
                      <span className="text-xs text-gray-500">{tempRange.range}</span>
                    </div>
                  </label>
                );
              })}
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
                    className="rounded border-gray-300 text-[#3F978F] focus:ring-[#3F978F]"
                  />
                  <div className="flex items-center space-x-1">
                    <WeatherIcon condition={condition} size={14} />
                    <span className="text-xs capitalize">{condition}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>


        </div>
      )}
    </div>
  );
};

// Main InspoPage Component
const InspoPage = () => {
  const [filters, setFilters] = useState<GenerateInspoRequest>({ limit: 5 }); // Fixed limit to 5
  const queryClient = useQueryClient();
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // State for generated outfits (like dashboard - only show these)
  const [generatedOutfits, setGeneratedOutfits] = useState<InspoOutfit[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false); // Track if user has generated outfits

  // Confirm dialog state and helper
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: '' });
  const askConfirm = (message: string, confirmLabel = 'Delete', cancelLabel = 'Cancel') =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, message, confirmLabel, cancelLabel, resolve });
    });

  // Enable full bleed layout like HomePage
  useEffect(() => {
    document.body.classList.add('home-fullbleed');
    return () => {
      document.body.classList.remove('home-fullbleed');
    };
  }, []);

  // Generate new outfits mutation
  const generateMutation = useMutation({
    mutationFn: (request: GenerateInspoRequest) => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      return generateInspoOutfits(request, token);
    },
    onSuccess: (data) => {
      setGeneratedOutfits(data); // Replace old outfits with new ones (max 5)
      setHasGenerated(true);
    },
    onError: (error) => {
      console.error('Failed to generate outfits:', error);
      setHasGenerated(true); // Still mark as generated attempt
    },
  });

  // Delete outfit mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      return deleteInspoOutfit(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspo-outfits'] });
    },
  });

  // Auto-generate outfits when page first loads (like dashboard)
  useEffect(() => {
    if (isAuthenticated && token && !hasGenerated && generatedOutfits.length === 0) {
      console.log('Auto-generating initial outfits...');
      generateMutation.mutate(filters);
    }
  }, [isAuthenticated, token, hasGenerated]);

  const handleGenerate = () => {
    if (!token) {
      navigate('/login', { state: { from: '/inspo' } });
      return;
    }
    generateMutation.mutate(filters);
  };

  const handleDelete = async (id: string) => {
    if (!token) {
      navigate('/login', { state: { from: '/inspo' } });
      return;
    }
    
    const confirmed = await askConfirm('Are you sure you want to delete this inspiration outfit?', 'Delete', 'Cancel');
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  // Only show generated outfits (max 5, like dashboard)
  const allOutfits = generatedOutfits;

  // Auto-generate outfits when page first loads (like dashboard)
  useEffect(() => {
    if (isAuthenticated && token && !hasGenerated && generatedOutfits.length === 0) {
      console.log('Auto-generating initial outfits...');
      generateMutation.mutate(filters);
    }
  }, [isAuthenticated, token, hasGenerated]);

  // If not authenticated, show login prompt
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6 text-center">
            Please log in to view and generate outfit inspiration.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/inspo' } })}
            className="w-full bg-[#3F978F] text-white py-2 px-4 rounded-xl hover:bg-[#359A91] transition duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0 ml-[calc(-50vw+50%)]" style={{ paddingTop: 0 }}>
      
      {/* ===================== HERO SECTION ===================== */}
      <header className="relative w-full overflow-hidden pb-16 sm:pb-20 mb-8">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/inspo_2.mp4" type="video/mp4" />
          <source src="/inspo_2.webm" type="video/webm" />
          {/* Fallback for browsers that don't support video tag */}
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

        {/* Content */}
        <div className="relative z-10 w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6 lg:py-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
              {/* LEFT: title + description */}
              <div className="text-white relative pb-12 sm:pb-0">

                <div className="hidden sm:inline-block backdrop-blur-2xl bg-white/10 rounded-2xl p-2 sm:p-2.5 -mb-2 mt-2 mb-2 sm:mb-2">
                  <p className="text-[14px] sm:text-xs font-medium tracking-wide">Style Inspiration</p>
                </div>

                <h1 className="text-4xl sm:text-4xl md:text-6xl font-livvic font-semibold leading-snug mb-2 sm:mb-3">
                  <span className="text-[#3F978F]">Style</span> Made Simple
                </h1>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Generate Section */}
          <FilterPanel
            onFilterChange={setFilters}
            onGenerate={handleGenerate}
            isGenerating={generateMutation.isPending}
          />

          {/* Error States */}
          {generateMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700">
                {(generateMutation.error as Error)?.message || 'Failed to generate inspiration outfits'}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Try liking some items from the social feed to get outfit recommendations.
                Inspo only uses items you've liked, not your personal closet items.
              </p>
            </div>
          )}
          
          {generateMutation.isSuccess && generatedOutfits.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-700 font-medium">
                No inspiration outfits could be generated
              </p>
              <p className="text-sm text-amber-600 mt-1">
                The inspo feature creates outfit combinations using only items you've liked from social posts.
                Please like some posts with outfit items to generate inspiration outfits.
              </p>
            </div>
          )}

          {deleteMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700">
                Failed to delete inspiration outfit. Please try again.
              </p>
            </div>
          )}

          {/* Loading State */}
          {generateMutation.isPending && (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-4 text-[#3F978F]" size={32} />
              <p className="text-gray-500">Generating your inspiration outfits...</p>
            </div>
          )}

          {/* Results */}
          {allOutfits.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Generated Inspiration Outfits ({allOutfits.length})
              </h2>
              {allOutfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : !generateMutation.isPending && hasGenerated && (
            <div className="text-center py-12">
              <div className="mb-4">
                <Sun className="mx-auto text-[#3F978F]" size={64} />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No inspiration outfits yet</h3>
              <p className="text-gray-500 mb-4">
                Start by liking some outfit posts from the social feed. 
                The inspo feature creates new outfit combinations using only items you've liked, 
                not items from your personal closet.
              </p>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-[#3F978F] text-white rounded-xl hover:bg-[#359A91] transition-colors"
              >
                Generate Your First Inspiration
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Confirm dialog (replaces window.confirm) */}
      {confirmState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-lg">
            <p className="mb-6 text-gray-700 dark:text-gray-300">{confirmState.message}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  confirmState.resolve?.(false);
                  setConfirmState(cs => ({ ...cs, open: false, resolve: undefined }));
                }}
                className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {confirmState.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => {
                  confirmState.resolve?.(true);
                  setConfirmState(cs => ({ ...cs, open: false, resolve: undefined }));
                }}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {confirmState.confirmLabel ?? 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspoPage;
