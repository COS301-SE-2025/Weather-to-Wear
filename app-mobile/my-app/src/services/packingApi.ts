import { fetchWithAuth } from './fetchWithAuth';

const BASE = 'http://localhost:5001/api/events/packing';

export async function getPackingList(tripId: string) {
  const res = await fetchWithAuth(`${BASE}/${tripId}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Fetch packing failed: ${res.status}`);
  return res.json(); // { id, tripId, items:[{id,closetItemId,packed,closetItem}], outfits:[...], others:[...] }
}

export async function createPackingList(payload: {
  tripId: string;
  items: string[];    // closetItemIds
  outfits: string[];  // outfitIds
  others: string[];   // text labels
}) {
  const res = await fetchWithAuth(`${BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create packing failed: ${res.status}`);
  return res.json();
}

export async function updatePackingList(listId: string, payload: {
  items: { id: string; packed: boolean }[];
  outfits: { id: string; packed: boolean }[];
  others: { id: string; packed: boolean }[];
}) {
  const res = await fetchWithAuth(`${BASE}/${listId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update packing failed: ${res.status}`);
  return res.json();
}

export async function deletePackingList(listId: string) {
  const res = await fetchWithAuth(`${BASE}/${listId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete packing failed: ${res.status}`);
}
