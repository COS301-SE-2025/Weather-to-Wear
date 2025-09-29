import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Thermometer, Droplets, Sun, Cloud, CloudRain, Wind, Filter, Trash2, RefreshCw, Snowflake, CloudSnow, Flame } from 'lucide-react';
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

const API_ENDPOINT = `${API_BASE}/api`;

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

const WeatherIcon = ({ condition, size = 16 }: { condition: string; size?: number }) => {
  const icons = {
    sunny: <Sun size={size} />,
    cloudy: <Cloud size={size} />,
    rainy: <CloudRain size={size} />,
    drizzle: <CloudRain size={size} />,
    windy: <Wind size={size} />,
    hot: <Sun size={size} />,
    warm: <Sun size={size} />,
    mild: <Sun size={size} />,
    cool: <Cloud size={size} />,
    cold: <CloudSnow size={size} />,
    freezing: <Snowflake size={size} />,
  };
  return icons[condition as keyof typeof icons] || <Sun size={size} />;
};



const getWeatherIconForTemperature = (avgTemp: number, conditions: string[] = [], size = 16) => {
  const hasRain = conditions.some(c => c.toLowerCase().includes('rain') || c.toLowerCase().includes('drizzle'));
  if (hasRain) return <CloudRain size={size} />;

  if (avgTemp >= 30) return <Sun size={size} />;
  if (avgTemp >= 24) return <Sun size={size} />;
  if (avgTemp >= 22) return <Sun size={size} />;
  if (avgTemp >= 12) {
    return (
      <span className="inline-flex items-center gap-1">
        <Sun size={size} />
        <Cloud size={size} />
      </span>
    );
  }
  if (avgTemp >= 10) return <Cloud size={size} />;
  if (avgTemp >= 0) return <CloudSnow size={size} />;
  return <Snowflake size={size} />;
};


const OutfitCard = ({ outfit, onDelete }: { outfit: InspoOutfit; onDelete: (id: string) => void }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4 border border-gray-200">
      {/* Header */}
      {/* Header */}
      <div className="bg-black text-white px-4 py-3 relative">
        <h3 className="text-lg sm:text-xl font-livvic text-center capitalize">          {outfit.overallStyle} Outfit Idea
        </h3>

        {/* Delete button (kept, but floated without affecting centering) */}
        <button
          onClick={() => onDelete(outfit.id)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Delete outfit"
        >
          <Trash2 size={16} />
        </button>
      </div>


      {/* Clothing Items */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
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
          <div className="relative px-4 sm:px-12 md:px-20 lg:px-28 xl:px-32">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-medium text-gray-600">Temperature Suitability</span>
              <span className="text-[11px] sm:text-xs text-gray-500">
                {outfit.recommendedWeather.minTemp}°C - {outfit.recommendedWeather.maxTemp}°C
              </span>
            </div>
          </div>

          {(() => {
            const avgTemp = (outfit.recommendedWeather.minTemp + outfit.recommendedWeather.maxTemp) / 2;
            console.log(`Temperature: ${avgTemp}°C (${outfit.recommendedWeather.minTemp}°C - ${outfit.recommendedWeather.maxTemp}°C)`);

            let barColor, fillPercentage, tempLabel;

            if (avgTemp >= 22) {
              barColor = 'from-rose-300 via-rose-500 to-rose-700';
              fillPercentage = Math.min(85, 60 + ((avgTemp - 22) / 14) * 25); 
              tempLabel = 'Hot Weather';
            } else if (avgTemp >= 12) {
              barColor = 'from-yellow-400 via-orange-400 to-rose-400';
              fillPercentage = 35 + ((avgTemp - 12) / 10) * 20; 
              tempLabel = 'Moderate Weather';
            } else {
              barColor = 'from-teal-300 via-teal-500 to-teal-700';
              fillPercentage = Math.max(10, 30 - ((12 - avgTemp) / 22) * 20); 
              tempLabel = 'Cold Weather';
            }

            return (
              <div className="relative px-32">
                <div className="w-full h-2.5 sm:h-3 bg-gray-200 rounded-full overflow-hidden">                  <div
                  className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${fillPercentage}%` }}
                />
                </div>
                <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 mt-1">
                  <span className="text-[10px] sm:text-xs text-teal-700 font-medium">Cold</span>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700">{tempLabel}</span>
                  <span className="text-[10px] sm:text-xs text-rose-700 font-medium">Hot</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tags */}
        <div className="mt-3 sm:mt-4 flex justify-center flex-wrap gap-1.5 sm:gap-2">
          {/* Warmth Factor Tag */}
          {/* Warmth Factor Tag (icon-only, no color) */}
          {(() => {
            const rating = outfit.warmthRating;

            let label: string;
            let Icon: React.ComponentType<{ size?: number }>;

            if (rating >= 25) { label = 'Extreme Warmth'; Icon = Flame; }
            else if (rating >= 20) { label = 'Very Warm'; Icon = Flame; }
            else if (rating >= 15) { label = 'Warm'; Icon = Thermometer; }
            else if (rating >= 10) { label = 'Moderate'; Icon = Sun; }         
            else if (rating >= 6) { label = 'Cool'; Icon = Wind; }
            else { label = 'Cold'; Icon = Snowflake; }

            return (
              <span className="px-3 py-1 border bg-gray-100 text-gray-800 text-xs rounded-full font-medium inline-flex items-center gap-1">
                <Icon size={14} />
                {label}
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
              <span className="px-3 py-1 border bg-gray-100 text-gray-800 text-xs rounded-full font-medium flex items-center gap-1">
                {primaryIcon}
                <span>{weatherLabel}</span>
              </span>
            );
          })()}

          {/* Color Scheme Tag */}
          {(() => {
            const allColors = outfit.inspoItems
              .flatMap(item => item.dominantColors || (item.colorHex ? [item.colorHex] : []))
              .filter(Boolean);

            const uniqueColors = Array.from(new Set(allColors)).slice(0, 4); 

            if (uniqueColors.length > 0) {
              return (
                <span className="px-3 py-1 border bg-gray-100 text-gray-800 text-xs rounded-full font-medium flex items-center gap-2">
                  <span>Colours</span>
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
          <span className="px-3 py-1 border bg-gray-100 text-gray-800 text-xs rounded-full font-medium capitalize">
            {outfit.overallStyle} Style
          </span>
        </div>
      </div>
    </div>
  );
};

const FilterPanel = ({
  onFilterChange,
  onGenerate,
  isGenerating
}: {
  onFilterChange: (filters: GenerateInspoRequest) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) => {
  const [filters, setFilters] = useState<GenerateInspoRequest>({ limit: 10 });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof GenerateInspoRequest, value: any) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  };

  const updateWeatherFilter = (key: keyof WeatherFilter, value: any) => {
    const weatherFilter = { ...filters.weatherFilter, [key]: value };
    updateFilter('weatherFilter', weatherFilter);
  };

  const weatherConditions = [
    'sunny', 'cloudy', 'rainy', 'drizzle', 'windy', 'hot', 'warm', 'mild', 'cool', 'cold', 'freezing'
  ];
  const styles = ['casual', 'formal', 'athletic', 'party', 'business', 'outdoor'];

  return (
    <div className="bg-white rounded-2xl p-4 mb-6">
      {/* centered buttons row */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">        <button
        onClick={() => setShowFilters(!showFilters)}
        className="border text-livvic flex items-center gap-2 px-4 py-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Filter size={16} />
        <span>Filters</span>
      </button>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2 bg-[#3F978F] text-white rounded-full hover:bg-[#359A91] disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>

      {showFilters && (
        <div className="space-y-4 pt-4">
          {/* Style Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
            <select
              value={filters.styleFilter || ''}
              onChange={(e) => updateFilter('styleFilter', e.target.value || undefined)}
              className="w-full p-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#3F978F] focus:border-transparent"
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
                const selectedRanges = filters.weatherFilter?.temperatureRanges || [];
                const isSelected = selectedRanges.some(
                  (r) => r.minTemp === tempRange.minTemp && r.maxTemp === tempRange.maxTemp
                );

                return (
                  <label
                    key={tempRange.label}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const current = filters.weatherFilter?.temperatureRanges || [];
                        if (e.target.checked) {
                          const newRanges = [...current, { minTemp: tempRange.minTemp, maxTemp: tempRange.maxTemp }];
                          updateFilter('weatherFilter', { ...filters.weatherFilter, temperatureRanges: newRanges });
                        } else {
                          const newRanges = current.filter(
                            (r) => !(r.minTemp === tempRange.minTemp && r.maxTemp === tempRange.maxTemp)
                          );
                          const wf: WeatherFilter = { ...(filters.weatherFilter || {}) };
                          if (newRanges.length > 0) wf.temperatureRanges = newRanges; else delete wf.temperatureRanges;
                          const hasOther = wf.conditions && wf.conditions.length > 0;
                          updateFilter('weatherFilter', hasOther || newRanges.length ? wf : undefined);
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
                <label key={condition} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.weatherFilter?.conditions?.includes(condition) || false}
                    onChange={(e) => {
                      const current = filters.weatherFilter?.conditions || [];
                      const next = e.target.checked
                        ? [...current, condition]
                        : current.filter((c) => c !== condition);
                      updateWeatherFilter('conditions', next.length ? next : undefined);
                    }}
                    className="rounded border-gray-300 text-[#3F978F] focus:ring-[#3F978F]"
                  />
                  <div className="flex items-center gap-1">
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

const InspoPage = () => {
  const [filters, setFilters] = useState<GenerateInspoRequest>({ limit: 5 }); 
  const queryClient = useQueryClient();
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUsername(JSON.parse(stored).name);
      } catch {
        /* noop */
      }
    }
  }, []);

  const [generatedOutfits, setGeneratedOutfits] = useState<InspoOutfit[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false); 

  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: '' });
  const askConfirm = (message: string, confirmLabel = 'Delete', cancelLabel = 'Cancel') =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, message, confirmLabel, cancelLabel, resolve });
    });

  useEffect(() => {
    document.body.classList.add('home-fullbleed');
    return () => {
      document.body.classList.remove('home-fullbleed');
    };
  }, []);

  const generateMutation = useMutation({
    mutationFn: (request: GenerateInspoRequest) => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      return generateInspoOutfits(request, token);
    },
    onSuccess: (data) => {
      setGeneratedOutfits(data);
      setHasGenerated(true);
    },
    onError: (error) => {
      console.error('Failed to generate outfits:', error);
      setHasGenerated(true); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) return Promise.reject(new Error('Authentication required'));
      return deleteInspoOutfit(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspo-outfits'] });
    },
  });

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

  const allOutfits = generatedOutfits;


  useEffect(() => {
    if (isAuthenticated && token && !hasGenerated && generatedOutfits.length === 0) {
      console.log('Auto-generating initial outfits...');
      generateMutation.mutate(filters);
    }
  }, [isAuthenticated, token, hasGenerated]);

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
    <div
      className="ml-[calc(-50vw+50%)] flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden !pt-0"
      style={{ paddingTop: 0 }}
    >
      {/* Header Image Section */}
      <div className="relative w-full h-32 sm:h-56 md:h-64 lg:h-48 mb-6 mt-0 !mt-0">
        <div
          className="absolute inset-0 bg-cover bg-top md:bg-center"
          style={{ backgroundImage: `url(/inspoheader.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex h-full items-center justify-center px-0">

          <div className="px-6 py-2 border-2 border-white">
            <h1 className="text-2xl font-bodoni font-light text-center text-white">
              {username ? `TOP PICKS FOR ${username.toUpperCase()}` : 'TOP PICKS'}
            </h1>
          </div>
        </div>
      </div>

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
