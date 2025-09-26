// src/services/closetApiTypes.ts

// Mirror your Prisma enums as string unions for the FE
export type Category =
  | 'SHIRT' | 'HOODIE' | 'PANTS' | 'SHORTS' | 'SHOES' | 'TSHIRT' | 'LONGSLEEVE'
  | 'SWEATER' | 'JACKET' | 'JEANS' | 'BEANIE' | 'HAT' | 'SCARF' | 'GLOVES'
  | 'RAINCOAT' | 'UMBRELLA' | 'SLEEVELESS' | 'SKIRT' | 'BLAZER' | 'COAT'
  | 'BOOTS' | 'SANDALS' | 'HEELS';

export type LayerCategory =
  | 'base_top' | 'base_bottom' | 'mid_top' | 'mid_bottom'
  | 'outerwear' | 'footwear' | 'headwear' | 'accessory';

export type Style = 'Formal' | 'Casual' | 'Athletic' | 'Party' | 'Business' | 'Outdoor';

export type Material =
  | 'Cotton' | 'Wool' | 'Polyester' | 'Leather' | 'Nylon' | 'Fleece'
  | 'Denim' | 'Linen' | 'Silk' | 'Suede' | 'Fabric';

// What your closet endpoints return (based on closet.controller.ts mapping)
export interface ClosetItemDTO {
  id: string;
  category: Category;
  layerCategory?: LayerCategory; // not included by /category/:category in your controller, present in /all
  imageUrl: string;
  createdAt: string;
  colorHex?: string | null;
  dominantColors: string[];
  warmthFactor?: number | null;
  waterproof?: boolean | null;
  style?: Style | null;
  material?: Material | null;
  favourite?: boolean; // included by /all and /category
}

// Minimal payloads used in the app
export interface UploadExtras {
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  style?: Style;
  material?: Material;
}
