// app-backend/src/modules/tryon-self/tryon-self.types.ts
export type TryOnMode = 'performance' | 'balanced' | 'quality';
export type FashnCategory = 'auto' | 'tops' | 'bottoms' | 'one-pieces';

export type LayerHint =
  | 'base_top'
  | 'mid_top'
  | 'outerwear'
  | 'base_bottom'
  | 'mid_bottom'
  | 'footwear'
  | 'headwear'
  | 'accessory';


export interface RunTryOnStep {
  garmentImageUrl: string;
  category?: FashnCategory;
  garmentPhotoType?: 'auto' | 'flat-lay' | 'model';
  layerHint?: LayerHint;
}

export interface RunTryOnRequest {
  useTryOnPhoto?: boolean;
  modelImageUrl?: string;
  closetItemIds?: string[];
  steps?: RunTryOnStep[];
  mode?: TryOnMode;
  returnBase64?: boolean;
  numSamples?: 1 | 2 | 3 | 4;
  seed?: number;
  includeFootwear?: boolean;
  includeHeadwear?: boolean;
}

export interface RunTryOnResponse {
  finalUrl?: string;
  finalBase64?: string;
  stepOutputs: string[];
  skipped: string[];
}
