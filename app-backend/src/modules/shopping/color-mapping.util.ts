// app-backend/src/modules/shopping/color-mapping.util.ts

const FRONTEND_COLOR_PALETTE = [
  { hex: "#E53935", label: "Red" },
  { hex: "#D32F2F", label: "Dark Red" },
  { hex: "#8E24AA", label: "Purple" },
  { hex: "#7B1FA2", label: "Dark Purple" },
  { hex: "#3949AB", label: "Blue" },
  { hex: "#1976D2", label: "Royal Blue" },
  { hex: "#0D47A1", label: "Navy Blue" },
  { hex: "#1565C0", label: "Deep Blue" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#00695C", label: "Dark Teal" },
  { hex: "#43A047", label: "Green" },
  { hex: "#388E3C", label: "Dark Green" },
  { hex: "#2E7D32", label: "Forest Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#FBC02D", label: "Golden Yellow" },
  { hex: "#F4511E", label: "Orange" },
  { hex: "#E65100", label: "Dark Orange" },
  { hex: "#6D4C41", label: "Brown" },
  { hex: "#5D4037", label: "Dark Brown" },
  { hex: "#3E2723", label: "Deep Brown" },
  { hex: "#757575", label: "Grey" },
  { hex: "#616161", label: "Dark Grey" },
  { hex: "#424242", label: "Charcoal" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#F5F5F5", label: "Off White" },
  { hex: "#000000", label: "Black" },
  { hex: "#212121", label: "Dark Black" },
  { hex: "#FFFDD0", label: "Cream" },
  { hex: "#FFF8E1", label: "Light Cream" },
  { hex: "#FFCCBC", label: "Peach" },
  { hex: "#FFAB91", label: "Light Orange" },
  { hex: "#C8E6C9", label: "Light Green" },
  { hex: "#B3E5FC", label: "Light Blue" },
  { hex: "#E1BEE7", label: "Light Purple" },
  { hex: "#FFCDD2", label: "Light Pink" },
];

/**
 * Try to get color name from a free color naming API
 */
async function getColorNameFromAPI(hex: string): Promise<string | null> {
  try {
    // Remove # from hex if present
    const cleanHex = hex.replace('#', '');
    
    // Try TheColorAPI (free, no key needed)
    const response = await fetch(`https://www.thecolorapi.com/id?hex=${cleanHex}&format=json`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.name && data.name.value) {
        console.log(`Color API: ${hex} -> ${data.name.value}`);
        return data.name.value;
      }
    }
  } catch (error) {
    console.log(`Color API failed for ${hex}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  return null;
}

/**
 * Filter out extreme whites and near-whites that are likely background artifacts
 */
function isBackgroundColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  
  const { r, g, b } = rgb;
  
  // Check if it's very close to white (background removal artifacts)
  if (r > 240 && g > 240 && b > 240) {
    return true;
  }
  
  // Check if it's very close to pure white variations
  const whiteVariations = [
    '#FFFFFF', '#FFFEFF', '#FEFEFE', '#FDFDFD', '#FCFCFC', 
    '#FBFBFB', '#FAFAFA', '#F9F9F9', '#F8F8F8', '#F7F7F7'
  ];
  
  return whiteVariations.some(white => {
    const whiteRgb = hexToRgb(white);
    if (!whiteRgb) return false;
    return colorDistance(rgb, whiteRgb) < 10; // Very close to these whites
  });
}


function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const rDiff = color1.r - color2.r;
  const gDiff = color1.g - color2.g;
  const bDiff = color1.b - color2.b;
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

export function mapHexToColorName(hex: string): string {
  const targetRgb = hexToRgb(hex);
  if (!targetRgb) {
    return 'Unknown';
  }

  let closestColor = FRONTEND_COLOR_PALETTE[0];
  let minDistance = Infinity;

  for (const paletteColor of FRONTEND_COLOR_PALETTE) {
    const paletteRgb = hexToRgb(paletteColor.hex);
    if (paletteRgb) {
      const distance = colorDistance(targetRgb, paletteRgb);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = paletteColor;
      }
    }
  }

  return closestColor.label;
}

 
export function mapHexColorsToNames(hexColors: string[]): string[] {
  const colorNames = hexColors.map(mapHexToColorName);
  return [...new Set(colorNames)]; // Remove duplicates
}
