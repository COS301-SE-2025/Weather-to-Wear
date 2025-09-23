// Mirror of backend enum (frontend-local to avoid pulling Prisma types)
export type LayerCategory =
    | "base_top"
    | "base_bottom"
    | "mid_top"
    | "mid_bottom"
    | "outerwear"
    | "footwear"
    | "headwear"
    | "accessory";

export type AnchorBox = { x: number; y: number; w: number; h: number };
export type PoseAnchors = {
  id: string; // "front_v1"
  boxes: {
    NECK_CENTER: { x: number; y: number };
    CHEST_BOX: AnchorBox;
    WAIST_BOX: AnchorBox;
    HIP_BOX: AnchorBox;
    HEM_LINE: { x1: number; y: number; x2: number };
    LEFT_SHOE_BOX: AnchorBox;
    RIGHT_SHOE_BOX: AnchorBox;
    HEAD_BOX: AnchorBox;
  };
  layerDefaults: Record<LayerCategory, { z: number }>;
};

// Tuned for 1024x1536 mannequin (normalized 0..1)
export const FRONT_V1: PoseAnchors = {
  id: "front_v1",
  boxes: {
   NECK_CENTER:   { x: 0.50, y: 0.184 },
   HEAD_BOX:      { x: 0.400, y: 0.05,  w: 0.2, h: 0.1 },
   CHEST_BOX:     { x: 0.30, y: 0.20,  w: 0.40, h: 0.24 },
   WAIST_BOX:     { x: 0.33, y: 0.50,  w: 0.34, h: 0.10 },
   HIP_BOX:       { x: 0.31, y: 0.60,  w: 0.38, h: 0.16 },
   HEM_LINE:      { x1: 0.28, y: 0.88, x2: 0.72 },
   LEFT_SHOE_BOX:  { x: 0.43, y: 0.94, w: 0.11, h: 0.07 },
   RIGHT_SHOE_BOX: { x: 0.57, y: 0.94, w: 0.11, h: 0.07 },
  },
  layerDefaults: {
    base_top:    { z: 200 },
    base_bottom: { z: 250 },
    mid_top:     { z: 300 },
    mid_bottom:  { z: 275 },
    outerwear:   { z: 400 },
    accessory:   { z: 500 },
    footwear:    { z: 600 },
    headwear:    { z: 650 },
  },
};

export function anchorForLayer(layer: LayerCategory, pose = FRONT_V1) {
  switch (layer) {
    case "base_top":
    case "mid_top":
    case "outerwear":
      return pose.boxes.CHEST_BOX;
    case "base_bottom":
    case "mid_bottom":
      return pose.boxes.HIP_BOX;
    case "footwear":
      return null; // handled specially
    case "headwear":
      return pose.boxes.HEAD_BOX;
    case "accessory":
      return pose.boxes.WAIST_BOX;
    default:
      return pose.boxes.CHEST_BOX;
  }
}