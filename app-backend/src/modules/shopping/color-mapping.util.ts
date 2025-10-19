// app-backend/src/modules/shopping/color-mapping.util.ts
const FRONTEND_COLOR_PALETTE = [
  { hex: "#E53935", label: "Red" },
  { hex: "#8E24AA", label: "Purple" },
  { hex: "#3949AB", label: "Blue" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#43A047", label: "Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#F4511E", label: "Orange" },
  { hex: "#6D4C41", label: "Brown" },
  { hex: "#757575", label: "Grey" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#000000", label: "Black" },
  { hex: "#FFFDD0", label: "Cream" },
];


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
