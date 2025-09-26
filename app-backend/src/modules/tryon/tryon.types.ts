export type FitTransform = {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

export type FitMeshPoint = { x: number; y: number };

export type ItemFitDTO = {
  userId: string;
  itemId: string;
  poseId: string;
  transform: FitTransform;
  mesh?: FitMeshPoint[];
};

export type BulkGetFitsQuery = {
  poseId: string;
  itemIds: string[]; // comma-separated in query
};
