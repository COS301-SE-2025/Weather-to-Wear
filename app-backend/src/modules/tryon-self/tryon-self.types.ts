// app-backend/src/modules/tryon-self/tryon-self.types.ts
export type TryOnMode = 'performance' | 'balanced' | 'quality';
export type FashnCategory = 'auto' | 'tops' | 'bottoms' | 'one-pieces';

export interface RunTryOnStep {
  garmentImageUrl: string;
  category?: FashnCategory;
  garmentPhotoType?: 'auto' | 'flat-lay' | 'model';
}

export interface RunTryOnRequest {
  useProfilePhoto?: boolean;
  modelImageUrl?: string;
  closetItemIds?: string[];
  steps?: RunTryOnStep[];
  mode?: TryOnMode;
  returnBase64?: boolean;
  numSamples?: 1 | 2 | 3 | 4;
  seed?: number;
}

export interface RunTryOnResponse {
  finalUrl?: string;
  finalBase64?: string;
  stepOutputs: string[];
  skipped: string[];
}
