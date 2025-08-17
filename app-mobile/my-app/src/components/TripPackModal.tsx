import { useEffect, useMemo, useState } from 'react';
import {
  getPackingList,
  createPackingList,
  deletePackingList,
} from '../services/packingApi';

type PackItem = {
  id: string;
  type: 'item' | 'outfit' | 'other';
  name: string;
  imageUrl?: string | null;
  packed: boolean;
  referenceId: string; // closetItemId or outfitId
};

export default function TripPackModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const [packingList, setPackingList] = useState<PackItem[]>([]);
  const [packingListId, setPackingListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'outfits' | 'other'>('items');
  const [newOtherItem, setNewOtherItem] = useState('');

  // Sample data - replace with your actual data fetching
  const [availableItems, setAvailableItems] = useState([
    { id: '1', name: 'Shorts', imageUrl: '/shorts.jpg', category: 'Bottoms' },
    { id: '2', name: 'Beanie', imageUrl: '/beanie.jpg', category: 'Accessories' },
    // ... more items
  ]);

  const [availableOutfits, setAvailableOutfits] = useState([
    { id: '1', name: 'Outfit 1', imageUrl: '/outfit1.jpg' },
    { id: '2', name: 'Outfit 2', imageUrl: '/outfit2.jpg' },
    // ... more outfits
  ]);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getPackingList(eventId);
        if (existing) {
          setPackingListId(existing.id);
          
          const items = existing.items.map(item => ({
            id: item.id,
            type: 'item' as const,
            name: item.closetItem?.name || `Item ${item.closetItemId}`,
            imageUrl: item.closetItem?.imageUrl,
            packed: item.packed,
            referenceId: item.closetItemId
          }));

          const outfits = existing.outfits.map(outfit => ({
            id: outfit.id,
            type: 'outfit' as const,
            name: outfit.outfit?.name || `Outfit ${outfit.outfitId}`,
            imageUrl: outfit.outfit?.coverImageUrl,
            packed: outfit.packed,
            referenceId: outfit.outfitId
          }));

          const others = existing.others.map(other => ({
            id: other.id,
            type: 'other' as const,
            name: other.label,
            packed: other.packed,
            referenceId: other.id
          }));

          setPackingList([...items, ...outfits, ...others]);
        }
      } catch (e) {
        console.error(e);
        alert('Could not load packing list.');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const addToPackingList = (type: 'item' | 'outfit', id: string, name: string, imageUrl?: string) => {
    if (packingList.some(item => item.referenceId === id && item.type === type)) return;
    
    setPackingList(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        name,
        imageUrl,
        packed: false,
        referenceId: id
      }
    ]);
  };

  const addOtherItem = () => {
    if (!newOtherItem.trim()) return;
    
    setPackingList(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'other',
        name: newOtherItem.trim(),
        packed: false,
        referenceId: crypto.randomUUID()
      }
    ]);
    setNewOtherItem('');
  };

  const togglePacked = (id: string) => {
    setPackingList(prev =>
      prev.map(item =>
        item.id === id ? { ...item, packed: !item.packed } : item
      )
    );
  };

  const removeFromPackingList = (id: string) => {
    setPackingList(prev => prev.filter(item => item.id !== id));
  };

  async function save() {
    try {
      if (packingListId) {
        await deletePackingList(packingListId);
      }
      
      await createPackingList({
        tripId: eventId,
        items: packingList.filter(i => i.type === 'item').map(i => i.referenceId),
        outfits: packingList.filter(i => i.type === 'outfit').map(i => i.referenceId),
        others: packingList.filter(i => i.type === 'other').map(i => i.name),
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save packing list');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Pack Your Suitcase</h3>
          <button onClick={onClose} className="text-2xl">
            ×
          </button>
        </div>

        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${activeTab === 'items' ? 'border-b-2 border-[#3F978F]' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'outfits' ? 'border-b-2 border-[#3F978F]' : ''}`}
            onClick={() => setActiveTab('outfits')}
          >
            Outfits
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'other' ? 'border-b-2 border-[#3F978F]' : ''}`}
            onClick={() => setActiveTab('other')}
          >
            Other
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available items/outfits */}
          <div className="border rounded p-4">
            <h4 className="font-medium mb-4">
              {activeTab === 'items' ? 'Available Items' : 
               activeTab === 'outfits' ? 'Available Outfits' : 'Add Other Items'}
            </h4>

            {activeTab === 'items' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableItems.map(item => (
                  <button
                    key={item.id}
                    className="flex flex-col items-center p-2 border rounded hover:bg-gray-50"
                    onClick={() => addToPackingList('item', item.id, item.name, item.imageUrl)}
                  >
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-16 h-16 object-cover rounded mb-1"
                      />
                    )}
                    <span className="text-sm text-center">{item.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'outfits' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableOutfits.map(outfit => (
                  <button
                    key={outfit.id}
                    className="flex flex-col items-center p-2 border rounded hover:bg-gray-50"
                    onClick={() => addToPackingList('outfit', outfit.id, outfit.name, outfit.imageUrl)}
                  >
                    {outfit.imageUrl && (
                      <img 
                        src={outfit.imageUrl} 
                        alt={outfit.name} 
                        className="w-16 h-16 object-cover rounded mb-1"
                      />
                    )}
                    <span className="text-sm text-center">{outfit.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'other' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-2 border rounded"
                  placeholder="Add item (e.g., Toothbrush)"
                  value={newOtherItem}
                  onChange={(e) => setNewOtherItem(e.target.value)}
                />
                <button 
                  className="px-4 py-2 bg-[#3F978F] text-white rounded"
                  onClick={addOtherItem}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Packing list */}
          <div className="border rounded p-4">
            <h4 className="font-medium mb-4">Packing List</h4>
            
            {packingList.length === 0 ? (
              <p className="text-gray-500">No items added yet</p>
            ) : (
              <ul className="space-y-2">
                {packingList.map(item => (
                  <li key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => togglePacked(item.id)}
                      className="h-5 w-5"
                    />
                    
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    
                    <span className={`flex-1 ${item.packed ? 'line-through text-gray-400' : ''}`}>
                      {item.name}
                    </span>
                    
                    <button
                      onClick={() => removeFromPackingList(item.id)}
                      className="text-red-500 p-1"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 pt-2 border-t">
              <div className="text-sm text-gray-600">
                {packingList.filter(i => !i.packed).length} items left to pack
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button 
            className="px-4 py-2 rounded border"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 rounded bg-[#3F978F] text-white"
            onClick={save}
          >
            Save Packing List
          </button>
        </div>
      </div>
    </div>
  );
}