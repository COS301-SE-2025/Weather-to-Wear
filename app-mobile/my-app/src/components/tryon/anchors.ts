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
    // canvas-normalized boxes (0..1) relative to canvas width/height
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

export const FRONT_V1: PoseAnchors = {
    id: "front_v1",
    boxes: {
        NECK_CENTER: { x: 0.5, y: 0.20 },
        CHEST_BOX: { x: 0.35, y: 0.22, w: 0.30, h: 0.16 },
        WAIST_BOX: { x: 0.35, y: 0.38, w: 0.30, h: 0.10 },
        HIP_BOX: { x: 0.34, y: 0.46, w: 0.32, h: 0.12 },
        HEM_LINE: { x1: 0.30, y: 0.82, x2: 0.70 },
        LEFT_SHOE_BOX: { x: 0.42, y: 0.86, w: 0.10, h: 0.07 },
        RIGHT_SHOE_BOX: { x: 0.52, y: 0.86, w: 0.10, h: 0.07 },
        HEAD_BOX: { x: 0.42, y: 0.05, w: 0.16, h: 0.12 },
    },
    layerDefaults: {
        base_top: { z: 200 },
        base_bottom: { z: 250 },
        mid_top: { z: 300 },
        mid_bottom: { z: 275 },
        outerwear: { z: 400 },
        accessory: { z: 500 },
        footwear: { z: 600 },
        headwear: { z: 650 },
    },
};

export function anchorForLayer(layer: LayerCategory, pose = FRONT_V1) {
    switch (layer) {
        case "base_top": return pose.boxes.CHEST_BOX;
        case "mid_top": return pose.boxes.CHEST_BOX;
        case "outerwear": return pose.boxes.CHEST_BOX;
        case "base_bottom": return pose.boxes.HIP_BOX;
        case "mid_bottom": return pose.boxes.HIP_BOX;
        case "footwear": return null; // special: left/right duplicate
        case "headwear": return pose.boxes.HEAD_BOX;
        case "accessory": return pose.boxes.WAIST_BOX;
        default: return pose.boxes.CHEST_BOX;
    }
}
