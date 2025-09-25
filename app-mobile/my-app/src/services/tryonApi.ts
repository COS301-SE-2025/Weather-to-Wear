import { API_BASE } from "../config";
import { fetchWithAuth } from "./fetchWithAuth";

// -------------------------
//    Try On Avatar
// -------------------------

export async function getItemFits(poseId: string, itemIds: string[]) {
  const params = new URLSearchParams({ poseId, itemIds: itemIds.join(",") });
  const res = await fetchWithAuth(`${API_BASE}/api/tryon/fits?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch fits");
  return res.json(); 
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

// -------------------------
//    Try on Yourself
// -------------------------

export interface CachedTryOn {
  finalImageUrl: string;
  createdAt: string;
  itemsHash: string;
  stepImageUrls?: string[];
}

export async function getTryOnResult(outfitId: string): Promise<CachedTryOn | null> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/result/${outfitId}`, { method: 'GET' });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function deleteTryOnResult(outfitId: string): Promise<{ ok: boolean }> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/result/${outfitId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export type TryOnMode = 'performance' | 'balanced' | 'quality';

export interface RunTryOnPayload {
  useTryOnPhoto?: boolean;
  modelImageUrl?: string;
  outfitId?: string;
  closetItemIds?: string[];
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

export interface TryOnCredits {
  total: number;
  subscription: number;
  on_demand: number;
}

export interface TryOnPhotoResponse {
  tryOnPhoto: string | null;
}

function assertOk(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function runTryOnSelf(payload: RunTryOnPayload): Promise<RunTryOnResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assertOk(res as Response);
  return (await (res as Response).json()) as RunTryOnResponse;
}

export async function getTryOnCredits(): Promise<TryOnCredits> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/credits`, { method: 'GET' });
  assertOk(res as Response);
  return (await (res as Response).json()) as TryOnCredits;
}

export async function setTryOnPhotoBase64(imageBase64: string): Promise<TryOnPhotoResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  assertOk(res as Response);
  return (await (res as Response).json()) as TryOnPhotoResponse;
}

export async function setTryOnPhotoUrl(imageUrl: string): Promise<TryOnPhotoResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  assertOk(res as Response);
  return (await (res as Response).json()) as TryOnPhotoResponse;
}

export async function getTryOnPhoto(): Promise<TryOnPhotoResponse> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/photo`, { method: 'GET' });
  assertOk(res as Response);
  return (await (res as Response).json()) as TryOnPhotoResponse;
}

export async function deleteTryOnPhoto(): Promise<{ ok: boolean }> {
  const res = await fetchWithAuth(`${API_BASE}/api/tryon-self/photo`, { method: 'DELETE' });
  assertOk(res as Response);
  return (await (res as Response).json()) as { ok: boolean };
}