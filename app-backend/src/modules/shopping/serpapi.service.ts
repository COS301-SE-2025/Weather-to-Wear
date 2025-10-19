import dotenv from 'dotenv';

dotenv.config();

// Import SerpAPI with better error handling
const { GoogleSearch } = require('google-search-results-nodejs');

interface ShoppingResult {
  position: number;
  title: string;
  link: string;
  product_link: string;
  product_id: string;
  serpapi_product_api: string;
  source: string;
  price: string;
  extracted_price: number;
  thumbnail: string;
  delivery?: string;
  rating?: number;
  reviews?: number;
}

interface SerpApiShoppingResponse {
  shopping_results: ShoppingResult[];
  search_metadata: {
    google_url: string;
    total_time_taken: number;
  };
  error?: string;
}

export class SerpApiService {
  private apiKey: string;
  private searchClient: any;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || '';
    if (!this.apiKey) {
      console.warn('SERPAPI_KEY environment variable is not set - shopping search will be disabled');
    } else {
      try {
        this.searchClient = new GoogleSearch(this.apiKey);
        console.log('SerpAPI client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize SerpAPI client:', error);
        throw new Error('SerpAPI initialization failed');
      }
    }
  }

  // Search for where to buy a specific clothing item based on user location
  async findPurchaseOptions(
    clothingItem: {
      category: string;
      style?: string;
      material?: string;
      color?: string;
    },
    userLocation: string,
    maxResults: number = 10
  ): Promise<ShoppingResult[]> {
    try {
      if (!this.apiKey || !this.searchClient) {
        console.warn('SerpAPI not configured - returning empty results');
        return [];
      }

      // Build search query from clothing item details
      const searchQuery = this.buildSearchQuery(clothingItem);
      
      const searchParams = {
        api_key: this.apiKey,
        engine: "google_shopping",
        q: searchQuery,
        location: userLocation, // e.g., "Pretoria, South Africa"
        hl: "en",
        gl: this.getCountryCode(userLocation),
        num: maxResults,
        no_cache: false
      };

      console.log(`Searching for: "${searchQuery}" in ${userLocation} with params:`, searchParams);
      
      const response = await new Promise<SerpApiShoppingResponse>((resolve, reject) => {
        try {
          this.searchClient.json(searchParams, (data: SerpApiShoppingResponse) => {
            if (data.error) {
              console.error('SerpAPI returned error:', data.error);
              reject(new Error(data.error));
            } else {
              console.log('SerpAPI response received, shopping_results count:', data.shopping_results?.length || 0);
              resolve(data);
            }
          });
        } catch (error) {
          console.error('SerpAPI call failed:', error);
          reject(error);
        }
      });
      
      return response.shopping_results || [];
    } catch (error) {
      console.error('SerpApi search failed:', error);
      return [];
    }
  }

  /**
   * Build search query from clothing item properties
   */
  private buildSearchQuery(clothingItem: {
    category: string;
    style?: string;
    material?: string;
    color?: string;
  }): string {
    const parts: string[] = [];
    
    // Add color if available
    if (clothingItem.color) {
      parts.push(clothingItem.color);
    }
    
    // Add material if available
    if (clothingItem.material) {
      parts.push(clothingItem.material);
    }
    
    // Convert frontend categories to searchable terms with gender context
    const categoryMap: Record<string, string> = {
      // Men's Base Top
      'TSHIRT': 'mens t-shirt tee shirt',
      'LONGSLEEVE': 'mens long sleeve shirt',
      'SLEEVELESS': 'mens sleeveless tank top vest',
      
      // Men's Base Bottom  
      'PANTS': 'mens pants trousers',
      'JEANS': 'mens jeans denim pants',
      'SHORTS': 'mens shorts',
      
      // Women's specific
      'SKIRT': 'womens skirt',
      
      // Men's Mid Top
      'SWEATER': 'mens sweater jumper pullover',
      'HOODIE': 'mens hoodie sweatshirt',
      
      // Men's Outerwear
      'COAT': 'mens coat overcoat',
      'BLAZER': 'mens blazer suit jacket',
      'JACKET': 'mens jacket',
      'RAINCOAT': 'mens raincoat rain jacket',
      
      // Men's Footwear
      'SHOES': 'mens shoes',
      'BOOTS': 'mens boots',
      'SANDALS': 'mens sandals',
      'HEELS': 'womens heels high heels',
      
      // Unisex Headwear
      'BEANIE': 'unisex beanie knit hat',
      'HAT': 'unisex hat cap',
    };
    
    const categoryTerm = categoryMap[clothingItem.category] || clothingItem.category.toLowerCase();
    parts.push(categoryTerm);
    
    // Add style if available
    if (clothingItem.style && clothingItem.style !== 'Unknown') {
      parts.push(clothingItem.style.toLowerCase());
    }
    
    return parts.join(' ');
  }


  private getCountryCode(location: string): string {
    const locationLower = location.toLowerCase().trim();
    
    const countryPatterns: Array<{ patterns: string[]; code: string }> = [
      // South Africa
      { patterns: ['south africa', 'za', 'pretoria', 'johannesburg', 'cape town', 'durban', 'bloemfontein'], code: 'za' },
      
      // United States
      { patterns: ['united states', 'usa', 'us', 'america', 'california', 'new york', 'texas', 'florida'], code: 'us' },
      
      // United Kingdom
      { patterns: ['united kingdom', 'uk', 'britain', 'england', 'scotland', 'wales', 'london', 'manchester'], code: 'gb' },
      
      // Canada
      { patterns: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'], code: 'ca' },
      
      // Australia
      { patterns: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'], code: 'au' },
      
      // Germany
      { patterns: ['germany', 'deutschland', 'berlin', 'munich', 'hamburg', 'cologne'], code: 'de' },
      
      // France
      { patterns: ['france', 'paris', 'lyon', 'marseille', 'toulouse'], code: 'fr' },
      
      // Other major countries
      { patterns: ['india', 'mumbai', 'delhi', 'bangalore', 'chennai'], code: 'in' },
      { patterns: ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen'], code: 'cn' },
      { patterns: ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama'], code: 'jp' },
      { patterns: ['brazil', 'são paulo', 'rio de janeiro', 'brasília'], code: 'br' },
      { patterns: ['mexico', 'mexico city', 'guadalajara', 'monterrey'], code: 'mx' },
      { patterns: ['italy', 'rome', 'milan', 'naples', 'turin'], code: 'it' },
      { patterns: ['spain', 'madrid', 'barcelona', 'valencia', 'seville'], code: 'es' },
      { patterns: ['netherlands', 'amsterdam', 'rotterdam', 'the hague'], code: 'nl' },
      { patterns: ['sweden', 'stockholm', 'gothenburg', 'malmö'], code: 'se' },
    ];
    
    // Check each pattern set
    for (const { patterns, code } of countryPatterns) {
      for (const pattern of patterns) {
        if (locationLower.includes(pattern)) {
          return code;
        }
      }
    }
    
  
    const parts = locationLower.split(',').map(part => part.trim());
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      // Check if last part is a 2-letter country code
      if (lastPart.length === 2) {
        return lastPart;
      }
    }
    
    return 'za';
  }
}

export default new SerpApiService();
