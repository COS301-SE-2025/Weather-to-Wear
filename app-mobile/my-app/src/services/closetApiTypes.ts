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

export interface ClosetItemDTO {
  id: string;
  category: Category;
  layerCategory?: LayerCategory; 
  imageUrl: string;
  createdAt: string;
  colorHex?: string | null;
  dominantColors: string[];
  warmthFactor?: number | null;
  waterproof?: boolean | null;
  style?: Style | null;
  material?: Material | null;
  favourite?: boolean; 
}

export interface UploadExtras {
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  style?: Style;
  material?: Material;
}
