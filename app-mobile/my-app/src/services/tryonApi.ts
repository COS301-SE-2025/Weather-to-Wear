import { API_BASE } from "../config";
import { fetchWithAuth } from "./fetchWithAuth";

export async function getItemFits(poseId: string, itemIds: string[]) {
    const params = new URLSearchParams({ poseId, itemIds: itemIds.join(",") });
    const res = await fetchWithAuth(`${API_BASE}/api/tryon/fits?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch fits");
    return res.json(); // { fits: [...] }
}

export async function saveItemFit(payload: {
    itemId: string;
    poseId: string;
    transform: { x: number; y: number; scale: number; rotationDeg: number };
    mesh?: { x: number; y: number }[];
}) {
    const res = await fetchWithAuth(`${API_BASE}/api/tryon/fits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save fit");
    return res.json();
}

export async function runTryOnSelf(payload: {
  useProfilePhoto?: boolean;
  modelImageUrl?: string;
  closetItemIds?: string[];
  mode?: 'performance'|'balanced'|'quality';
  returnBase64?: boolean;
  numSamples?: 1|2|3|4;
  seed?: number;
}) {
  return fetchWithAuth('/tryon-self/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTryOnCredits() {
  return fetchWithAuth('/tryon-self/credits', { method: 'GET' });
}