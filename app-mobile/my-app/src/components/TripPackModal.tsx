import { useEffect, useState } from 'react';
import { getPackingList, savePackingList } from '../services/packingApi';

type ItemRow = { closetItemId: string; checked?: boolean };
type OutfitRow = { outfitId: string; checked?: boolean };
type OtherRow = { id: string; text: string; checked?: boolean };

export default function TripPackModal({
  eventId,
  onClose
}: { eventId: string; onClose: () => void }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [outfits, setOutfits] = useState<OutfitRow[]>([]);
  const [others, setOthers] = useState<OtherRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPackingList(eventId);
        setItems(data?.itemsJson ?? []);
        setOutfits(data?.outfitsJson ?? []);
        setOthers(data?.othersJson ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const addItem = () => {
    const id = prompt('Enter closetItemId');
    if (id) setItems(prev => [...prev, { closetItemId: id }]);
  };
  const addOutfit = () => {
    const id = prompt('Enter outfitId');
    if (id) setOutfits(prev => [...prev, { outfitId: id }]);
  };
  const addOther = () => {
    const text = prompt('Add (e.g., Toothbrush)');
    if (text) setOthers(prev => [...prev, { id: crypto.randomUUID(), text }]);
  };

  const save = async () => {
    await savePackingList(eventId, {
      itemsJson: items,
      outfitsJson: outfits,
      othersJson: others,
    });
    onClose();
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Trip Packing</h3>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Items */}
          <section className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Items</h4>
              <button className="text-sm underline" onClick={addItem}>Add</button>
            </div>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {items.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!r.checked}
                    onChange={e => {
                      const next = [...items];
                      next[i] = { ...r, checked: e.target.checked };
                      setItems(next);
                    }}
                  />
                  <span>{r.closetItemId}</span>
                  <button className="ml-auto text-xs underline" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                    remove
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="text-gray-500">No items</li>}
            </ul>
          </section>

          {/* Outfits */}
          <section className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Outfits</h4>
              <button className="text-sm underline" onClick={addOutfit}>Add</button>
            </div>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {outfits.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!r.checked}
                    onChange={e => {
                      const next = [...outfits];
                      next[i] = { ...r, checked: e.target.checked };
                      setOutfits(next);
                    }}
                  />
                  <span>{r.outfitId}</span>
                  <button className="ml-auto text-xs underline" onClick={() => setOutfits(outfits.filter((_, idx) => idx !== i))}>
                    remove
                  </button>
                </li>
              ))}
              {outfits.length === 0 && <li className="text-gray-500">No outfits</li>}
            </ul>
          </section>

          {/* Other */}
          <section className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Other</h4>
              <button className="text-sm underline" onClick={addOther}>Add</button>
            </div>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {others.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!r.checked}
                    onChange={e => setOthers(others.map(o => o.id === r.id ? { ...o, checked: e.target.checked } : o))}
                  />
                  <span>{r.text}</span>
                  <button className="ml-auto text-xs underline" onClick={() => setOthers(others.filter(o => o.id !== r.id))}>
                    remove
                  </button>
                </li>
              ))}
              {others.length === 0 && <li className="text-gray-500">No other items</li>}
            </ul>
          </section>
        </div>

        <div className="flex justify-between pt-2">
          <button
            className="px-4 py-2 rounded-full border border-black"
            onClick={() => alert('Checklist view – you can reuse these checkboxes')}
          >
            Start Packing
          </button>
          <div className="space-x-2">
            <button className="px-4 py-2 rounded-full border" onClick={onClose}>Cancel</button>
            <button className="px-4 py-2 rounded-full bg-[#3F978F] text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
