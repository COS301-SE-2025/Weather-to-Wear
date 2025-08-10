import { fetchWithAuth } from './fetchWithAuth';

const BASE = 'http://localhost:5001/api/events/packing';

export async function getPackingList(eventId: string) {
  const res = await fetchWithAuth(`${BASE}/${eventId}`);
  if (!res.ok) throw new Error(`Fetch packing failed: ${res.status}`);
  return res.json();
}

export async function savePackingList(eventId: string, payload: {
  itemsJson: { closetItemId: string; checked?: boolean }[];
  outfitsJson: { outfitId: string; checked?: boolean }[];
  othersJson: { id: string; text: string; checked?: boolean }[];
}) {
  const res = await fetchWithAuth(`${BASE}/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Save packing failed: ${res.status}`);
  return res.json();
}
