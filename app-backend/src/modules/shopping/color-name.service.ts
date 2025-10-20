// app-backend/src/modules/shopping/color-name.service.ts
import fetch from 'node-fetch';

interface ColorAPIResponse {
  name: {
    value: string;
    closest_named_hex: string;
    exact_match_name: boolean;
    distance: number;
  };
  hex: {
    value: string;
    clean: string;
  };
  rgb: {
    fraction: {
      r: number;
      g: number;
      b: number;
    };
    r: number;
    g: number;
    b: number;
    value: string;
  };
  hsl: {
    fraction: {
      h: number;
      s: number;
      l: number;
    };
    h: number;
    s: number;
    l: number;
    value: string;
  };
}

class ColorNameService {
  private cache = new Map<string, string>();
  
  /**
   * Map specific Color API names to common, searchable terms
   */
  private mapToSearchableColor(apiColorName: string): string {
    const colorName = apiColorName.toLowerCase();
    
    // Map specific/uncommon color names to searchable terms
    const colorMapping: Record<string, string> = {
      // Reds
      'crimson': 'red',
      'scarlet': 'red',
      'burgundy': 'red',
      'maroon': 'red',
      'wine': 'red',
      'cherry': 'red',
      'ruby': 'red',
      'rose': 'pink',
      'salmon': 'pink',
      'coral': 'pink',
      'blush': 'pink',
      'fuchsia': 'pink',
      'magenta': 'pink',
      
      // Blues
      'navy': 'blue',
      'royal blue': 'blue',
      'sky blue': 'blue',
      'azure': 'blue',
      'cerulean': 'blue',
      'cobalt': 'blue',
      'indigo': 'blue',
      'sapphire': 'blue',
      'teal': 'blue',
      'turquoise': 'blue',
      'cyan': 'blue',
      'aqua': 'blue',
      
      // Greens
      'forest green': 'green',
      'lime': 'green',
      'olive': 'green',
      'sage': 'green',
      'mint': 'green',
      'emerald': 'green',
      'jade': 'green',
      'pine': 'green',
      
      // Yellows
      'gold': 'yellow',
      'amber': 'yellow',
      'lemon': 'yellow',
      'mustard': 'yellow',
      'canary': 'yellow',
      
      // Cream/Off-white 
      'cream': 'cream',
      'ivory': 'cream',
      'off-white': 'cream',
      'eggshell': 'cream',
      'vanilla': 'cream',
      'silver': 'cream',

      
      // Browns
      'chocolate': 'brown',
      'coffee': 'brown',
      'espresso': 'brown',
      'mahogany': 'brown',
      'chestnut': 'brown',
      'bronze': 'brown',
      'rust': 'brown',
      'copper': 'brown',
      'tan': 'brown',
      'beige': 'brown',
      'khaki': 'brown',
      'camel': 'brown',
      
      // Purples
      'violet': 'purple',
      'lavender': 'purple',
      'plum': 'purple',
      'grape': 'purple',
      'orchid': 'purple',
      'lilac': 'purple',
      'amethyst': 'purple',
      'rum':'purple',
      
      // Oranges
      'peach': 'orange',
      'apricot': 'orange',
      'tangerine': 'orange',
      'papaya': 'orange',
      'pumpkin': 'orange',
      'sunset': 'orange',
      
      // Grays
      'charcoal': 'gray',
      'slate': 'gray',
      'ash': 'gray',
      'smoke': 'gray',
      'pewter': 'gray',
      'steel': 'gray',
      'graphite': 'gray',
      'manatee': 'black',
      
      // Unusual names 
      'shark': 'black',
      'martini': 'green',
      'whiskey': 'brown',
      'wine berry': 'red',
      'dolphin': 'gray',
      'storm cloud': 'gray',
      'midnight': 'black',
      'snow': 'white',
      'pearl': 'white',
      'coconut': 'white',
      'onyx':'black',
      'timberwolf':'white',
      'schooner':'blue'
    };
    
    // Check direct mapping first
    if (colorMapping[colorName]) {
      return colorMapping[colorName];
    }
    
    // Check if the color name contains basic color words
    const basicColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'cream'];
    for (const basicColor of basicColors) {
      if (colorName.includes(basicColor)) {
        return basicColor === 'grey' ? 'gray' : basicColor;
      }
    }
    
    return apiColorName;
  }
  

  async getColorName(hex: string): Promise<string> {
    try {
      const cleanHex = hex.replace('#', '');
      
      const cacheKey = cleanHex.toLowerCase();
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
      
      const response = await fetch(`https://www.thecolorapi.com/id?hex=${cleanHex}`, {
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.ok) {
        console.warn(`Color API returned ${response.status} for ${hex}`);
        return this.fallbackColorName(hex);
      }
      
      const data = await response.json() as ColorAPIResponse;
      const apiColorName = data.name?.value || 'Unknown';
      
      const searchableColorName = this.mapToSearchableColor(apiColorName);
      
      this.cache.set(cacheKey, searchableColorName);
      
      console.log(`Color API: ${hex} -> ${apiColorName} -> ${searchableColorName}`);
      return searchableColorName;
      
    } catch (error) {
      console.error(`Color API failed for ${hex}:`, error);
      return this.fallbackColorName(hex);
    }
  }
  
  
  async getColorNames(hexColors: string[]): Promise<string[]> {
    const promises = hexColors.map(hex => this.getColorName(hex));
    return Promise.all(promises);
  }
  

  private fallbackColorName(hex: string): string {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      
      if (diff < 30) {
        if (max < 50) return 'black';
        if (max < 100) return 'gray';
        if (max < 150) return 'gray';
        if (max < 200) return 'gray';
        return 'white';
      }
      
      if (r > g && r > b) {
        if (g > 100 && b < 100) return 'orange';
        if (g < 100 && b > 100) return 'purple';
        return 'red';
      }
      
      if (g > r && g > b) {
        if (r > 100 && b < 100) return 'yellow';
        if (r < 100 && b > 100) return 'blue';
        return 'green';
      }
      
      if (b > r && b > g) {
        if (r > 100 && g < 100) return 'purple';
        if (r < 100 && g > 100) return 'blue';
        return 'blue';
      }
      
      return 'mixed';
      
    } catch (error) {
      console.error(`Fallback color naming failed for ${hex}:`, error);
      return 'unknown';
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export default new ColorNameService();
