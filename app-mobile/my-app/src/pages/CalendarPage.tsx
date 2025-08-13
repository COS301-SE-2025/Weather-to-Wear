import React, { useEffect, useState, ReactElement } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Luggage } from 'lucide-react';
import { fetchAllEvents, createEvent, deleteEvent, updateEvent } from '../services/eventsApi';
import { fetchAllItems } from '../services/closetApi';
import { fetchAllOutfits } from '../services/outfitApi';
import { getPackingList, createPackingList, updatePackingList, deletePackingList } from '../services/packingApi';

type Style = 'Casual' | 'Formal' | 'Athletic' | 'Party' | 'Business' | 'Outdoor';

type Event = {
  id: string;
  name: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  style?: Style;
  weather?: string;
  type?: 'event' | 'trip';
  isTrip?: boolean;
};

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string | null;
  style?: Style | null;
};

type Outfit = {
  id: string;
  name: string;
  style?: string | Style;
  coverImageUrl?: string | null;
};

const parseISO = (s: string) => new Date(s);
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isToday = (d: Date) => isSameDay(d, new Date());
const isSameMonth = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', o).format(d);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const MAX_LANES = 2;
const EVENT_ROW_PX = 16;

function isTripEvent(ev: Partial<Event>) {
  if (!ev) return false;
  const t = ev.type ? String(ev.type).toLowerCase() : '';
  return t === 'trip' || ev.isTrip === true || /(^|\s)trip(\s|$)/i.test(ev.name || '');
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' as Style });
  const [newTrip, setNewTrip] = useState({ name: 'Trip', location: '', dateFrom: '', dateTo: '', style: 'Casual' as Style });

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editEventData, setEditEventData] = useState({
    id: '',
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: 'Casual' as Style
  });

  const [showDayList, setShowDayList] = useState<{ open: boolean; date: Date | null }>({ open: false, date: null });

  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packItems, setPackItems] = useState<{ closetItemId: string; name: string; imageUrl?: string | null; checked?: boolean }[]>([]);
  const [packOutfits, setPackOutfits] = useState<{ outfitId: string; name: string; checked?: boolean }[]>([]);
  const [packOthers, setPackOthers] = useState<{ id: string; text: string; checked?: boolean }[]>([]);
  const [packingNotes, setPackingNotes] = useState('');
  const [newOtherItem, setNewOtherItem] = useState('');
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [packingListId, setPackingListId] = useState<string | null>(null);

  const mapEventDto = (d: any): Event => {
  const isTrip =
    !!d?.isTrip ||
    String(d?.type || '').toLowerCase() === 'trip' ||
    /(^|\s)trip(\s|$)/i.test(String(d?.name || ''));

  return {
    id: String(d?.id),
    name: d?.name ?? (isTrip ? 'Trip' : ''),
    location: d?.location ?? '',
    dateFrom: d?.dateFrom,
    dateTo: d?.dateTo,
    style: (d?.style ?? 'Casual') as Style,
    weather: d?.weather ?? undefined,
    type: isTrip ? 'trip' : 'event',
    isTrip,
  };
};


  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAllEvents();
        setEvents(list.map(mapEventDto));
      } catch (e) {
        console.error('load events failed', e);
      }
    };
    const rerender = () => load();
    load();
    window.addEventListener('eventUpdated', rerender);
    return () => window.removeEventListener('eventUpdated', rerender);
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setIsEditing(false);
    setEditEventData({
      id: selectedEvent.id,
      name: selectedEvent.name,
      location: selectedEvent.location,
      dateFrom: selectedEvent.dateFrom.slice(0, 16),
      dateTo: selectedEvent.dateTo.slice(0, 16),
      style: selectedEvent.style || 'Casual'
    });
  }, [selectedEvent]);

  useEffect(() => {
    const tick = async () => {
      const now = new Date();
      const expired = events.filter(e => new Date(e.dateTo) < now).map(e => e.id);
      if (!expired.length) return;
      try {
        await Promise.all(expired.map(id => deleteEvent(id)));
        setEvents(prev => prev.filter(e => !expired.includes(e.id)));
      } catch (e) {
        console.error('delete expired failed', e);
      }
    };
    const id = setInterval(tick, 24 * 60 * 60 * 1000);
    tick();
    return () => clearInterval(id);
  }, [events]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const onDayClick = (d: Date) => setSelectedDate(d);

  async function handleCreate(kind: 'event' | 'trip') {
    const src = kind === 'event' ? newEvent : newTrip;
    if ((!src.name && kind === 'event') || !src.dateFrom || !src.dateTo) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const created = await createEvent({
        name: kind === 'trip' ? 'Trip' : src.name,
        location: src.location,
        style: src.style,
        dateFrom: new Date(src.dateFrom).toISOString(),
        dateTo: new Date(src.dateTo).toISOString(),
        isTrip: kind === 'trip',
      });

      const mapped = mapEventDto(created);
      setEvents(e => [...e, mapped]);
      if (kind === 'event') {
        setShowCreateModal(false);
        setNewEvent({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
      } else {
        setShowTripModal(false);
        setNewTrip({ name: 'Trip', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
      }
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (err: any) {
      console.error('create failed', err);
      alert(err?.response?.data?.message || 'Failed to create');
    }
  }

  const handleUpdateEvent = async () => {
    try {
      const updated = await updateEvent({
        id: editEventData.id,
        name: editEventData.name,
        location: editEventData.location,
        dateFrom: new Date(editEventData.dateFrom).toISOString(),
        dateTo: new Date(editEventData.dateTo).toISOString(),
        style: editEventData.style
      });
      const mapped = mapEventDto(updated);
      setEvents(list => list.map(e => (e.id === mapped.id ? mapped : e)));
      setSelectedEvent(mapped);
      setIsEditing(false);
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (e) {
      console.error('update failed', e);
      alert('Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(selectedEvent.id);
      setEvents(list => list.filter(e => e.id !== selectedEvent.id));
      setShowEventModal(false);
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (e) {
      console.error('delete failed', e);
      alert('Failed to delete event');
    }
  };

  async function handleOpenPacking(trip: Event) {
    try {
      const existing = await getPackingList(trip.id);
      setPackingListId(existing?.id ?? null);
      if (existing) {
        setPackItems((existing.items ?? []).map((r: any) => ({
          closetItemId: String(r.closetItemId),
          name: r.closetItem?.name ?? '',
          imageUrl: r.closetItem?.imageUrl ?? null,
          checked: !!r.packed,
          _rowId: r.id,
        })));
        setPackOutfits((existing.outfits ?? []).map((r: any) => ({
          outfitId: String(r.outfitId),
          name: r.outfit?.name ?? '',
          checked: !!r.packed,
          _rowId: r.id,
        })));
        setPackOthers((existing.others ?? []).map((r: any) => ({
          id: String(r.id),
          text: r.label,
          checked: !!r.packed,
        })));
        setPackingNotes('');
      } else {
        setPackItems([]); setPackOutfits([]); setPackOthers([]); setPackingNotes(''); setPackingListId(null);
      }
      const [ciRes, ofRes] = await Promise.all([fetchAllItems(), fetchAllOutfits()]);
      const ci = Array.isArray((ciRes as any)?.data) ? (ciRes as any).data : ((ciRes as any)?.data?.items ?? (ciRes as any)?.data ?? ciRes);
      const ofRaw = Array.isArray((ofRes as any)?.data) ? (ofRes as any).data : ((ofRes as any)?.data?.outfits ?? (ofRes as any)?.data ?? ofRes);
      setClosetItems((ci as any[]).map((it: any) => ({
        id: String(it.id ?? it.itemId ?? ''),
        name: it.name ?? it.title ?? '',
        category: it.category ?? it.type ?? 'Other',
        imageUrl: it.imageUrl ?? it.photoUrl ?? null,
        style: (it.style ?? it.tag ?? null) as any
      })));
      setOutfits((ofRaw as any[]).map((o: any, idx: number) => ({
        id: String(o.id ?? o.outfitId ?? `outfit-${idx}`),
        name: o.name ?? o.title ?? `Outfit ${idx + 1}`,
        style: o.style ?? o.occasion ?? 'Other',
        coverImageUrl: o.coverImageUrl ?? o.imageUrl ?? null
      })));
      setShowPackingModal(true);
    } catch (e) {
      console.error('open packing failed', e);
      alert('Could not open packing list.');
    }
  }

  const addClothingToPack = (item: ClothingItem) => {
    if (packItems.some(p => p.closetItemId === item.id)) return;
    setPackItems(prev => [...prev, { closetItemId: item.id, name: item.name, imageUrl: item.imageUrl ?? null, checked: false }]);
  };

  const addOutfitToPack = (o: Outfit) => {
    if (packOutfits.some(p => p.outfitId === o.id)) return;
    setPackOutfits(prev => [...prev, { outfitId: o.id, name: o.name, checked: false }]);
  };

  const addOtherToPack = () => {
    const t = newOtherItem.trim();
    if (!t) return;
    setPackOthers(prev => [...prev, { id: `other-${Date.now()}`, text: t, checked: false }]);
    setNewOtherItem('');
  };

  const removeItemFromPack = (id: string) => setPackItems(prev => prev.filter(p => p.closetItemId !== id));
  const removeOutfitFromPack = (id: string) => setPackOutfits(prev => prev.filter(p => p.outfitId !== id));
  const removeOtherFromPack = (id: string) => setPackOthers(prev => prev.filter(p => p.id !== id));

  const togglePackedItem = (id: string) => setPackItems(prev => prev.map(p => p.closetItemId === id ? { ...p, checked: !p.checked } : p));
  const togglePackedOutfit = (id: string) => setPackOutfits(prev => prev.map(p => p.outfitId === id ? { ...p, checked: !p.checked } : p));
  const togglePackedOther = (id: string) => setPackOthers(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));

  async function savePacking(tripId: string) {
    try {
      if (packingListId) {
        await deletePackingList(packingListId);
      }
      await createPackingList({
        tripId,
        items: packItems.map(p => p.closetItemId),
        outfits: packOutfits.map(p => p.outfitId),
        others: packOthers.map(p => p.text),
      });
      setShowPackingModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save packing list');
    }
  }

  function getCalendarBounds(month: Date) {
    const start = monthStart(month);
    const end = monthEnd(month);
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    return { startDate, endDate };
  }

  function buildWeeks(month: Date) {
    const { startDate, endDate } = getCalendarBounds(month);
    const weeks: Date[][] = [];
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }

  type Segment = {
    event: Event;
    colStart: number;
    colEnd: number;
    lane: number;
    weekKey: string;
  };

  function getWeekSegments(week: Date[], evts: Event[]): Segment[] {
    const start = week[0];
    const end = week[6];
    const segs: Omit<Segment, 'lane' | 'weekKey'>[] = [];
    for (const ev of evts) {
      const s = parseISO(ev.dateFrom);
      const e = parseISO(ev.dateTo);
      const segStart = s > start ? s : start;
      const segEnd = e < end ? e : end;
      if (segStart > segEnd) continue;
      const cs = segStart.getDay() + 1;
      const ce = segEnd.getDay() + 2;
      segs.push({ event: ev, colStart: cs, colEnd: ce });
    }
    const byStart = segs.sort((a, b) => a.colStart - b.colStart || a.colEnd - b.colEnd);
    const lanes: number[] = [];
    const out: Segment[] = [];
    for (const s of byStart) {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (s.colStart > lanes[i]) {
          lanes[i] = s.colEnd - 1;
          out.push({ ...s, lane: i, weekKey: week[0].toDateString() });
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push(s.colEnd - 1);
        out.push({ ...s, lane: lanes.length - 1, weekKey: week[0].toDateString() });
      }
    }
    return out;
  }

  function eventsOnDay(date: Date) {
    return events.filter(event => {
      const s = parseISO(event.dateFrom);
      const e = parseISO(event.dateTo);
      return isSameDay(s, date) || isSameDay(e, date) || (s <= date && e >= date);
    });
  }

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h2 className="text-xl font-bold">{fmt(currentMonth, { month: 'long', year: 'numeric' })}</h2>
      <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderDayNames = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(d => (
          <div key={d} className="text-center font-medium text-sm py-1">{d}</div>
        ))}
      </div>
    );
  };

  function renderWeeks() {
    const weeks = buildWeeks(currentMonth);
    const monthRef = monthStart(currentMonth);
    return (
      <div className="space-y-1 mb-4">
        {weeks.map((week) => {
          const dayCells: ReactElement[] = week.map((d) => {
            const inMonth = isSameMonth(d, monthRef);
            const dayCount = eventsOnDay(d).length;
            const overflow = Math.max(0, dayCount - MAX_LANES);
            return (
              <div
                key={d.toDateString()}
                className={`min-h-20 p-1 border relative
                  ${inMonth ? 'bg-white' : 'bg-gray-100'}
                  ${isToday(d) ? 'border-2 border-[#3F978F]' : 'border-gray-200'}
                  ${isSameDay(d, selectedDate) ? 'bg-[#3F978F] bg-opacity-10' : ''}`}
                onClick={() => onDayClick(new Date(d))}
              >
                <div className="text-right text-sm">{d.getDate()}</div>
                {overflow > 0 && (
                  <button
                     className="absolute bottom-1 right-1 z-20 text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 border shadow-sm"
                      onClick={(e) => { e.stopPropagation(); setShowDayList({ open: true, date: new Date(d) }); }}
                  >
                    +{overflow} more
                  </button>

                )}
              </div>
            );
          });

          const segs = getWeekSegments(week, events);
          const lanes = segs.length ? Math.max(...segs.map(s => s.lane)) + 1 : 0;
          const segsToRender = segs.filter(s => s.lane < MAX_LANES);

          return (
            <div key={week[0].toDateString()} className="relative">
              <div className="grid grid-cols-7 gap-1">{dayCells}</div>
              <div
                className="absolute inset-x-0 top-6 bottom-6 z-0 grid grid-cols-7 gap-1 pointer-events-none"
                style={{ gridAutoRows: `${EVENT_ROW_PX}px` }}
              >

                {segsToRender.map(seg => {
                  const ev = seg.event;
                  const bg = isTripEvent(ev) ? 'bg-emerald-600' : 'bg-[#3F978F]';
                  const evStart = parseISO(ev.dateFrom);
                  const evEnd = parseISO(ev.dateTo);
                  const isStart = evStart >= week[0] && evStart <= week[6] && (evStart.getDay() + 1) === seg.colStart;
                  const isEnd = evEnd >= week[0] && evEnd <= week[6] && (evEnd.getDay() + 2) === seg.colEnd;
                  return (
                    <div
                      key={`${ev.id}-${seg.weekKey}-${seg.lane}`}
                      className={`flex items-center ${bg} text-white text-xs h-[16px] px-2 overflow-hidden truncate pointer-events-auto`}
                      style={{
                        gridColumn: `${seg.colStart} / ${seg.colEnd}`,
                        gridRow: String(seg.lane + 1),
                        borderTopLeftRadius: isStart ? 8 : 0,
                        borderBottomLeftRadius: isStart ? 8 : 0,
                        borderTopRightRadius: isEnd ? 8 : 0,
                        borderBottomRightRadius: isEnd ? 8 : 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                        setShowEventModal(true);
                      }}
                      title={ev.name}
                    >
                      <span className="truncate">{ev.name}</span>
                    </div>
                  );
                })}
                {lanes > 0 && Array.from({ length: Math.min(lanes, MAX_LANES) }).map((_, i) => (
                  <div key={`lane-spacer-${i}`} style={{ gridColumn: '1 / 8', gridRow: String(i + 1), visibility: 'hidden' }}>.</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSelectedDateEvents() {
    const dateEvents = eventsOnDay(selectedDate);
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">
          Today's Events
        </h3>
        {dateEvents.length === 0 ? (
          <p className="text-gray-500">No events scheduled</p>
        ) : (
          <div className="space-y-2">
            {dateEvents.map(ev => (
              <div
                key={ev.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => { setSelectedEvent(ev); setShowEventModal(true); }}
              >
                <div className="font-medium">{ev.name}</div>
                <div className="text-sm text-gray-600">
                  {fmt(parseISO(ev.dateFrom), { hour: 'numeric', minute: '2-digit' })} – {fmt(parseISO(ev.dateTo), { hour: 'numeric', minute: '2-digit' })}
                </div>
                {ev.location && <div className="text-sm text-gray-600">Location: {ev.location}</div>}
                <div className="text-xs mt-1 px-2 py-1 bg-gray-100 rounded-full inline-block">{ev.style}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderUpcomingEvents() {
    const now = new Date();
    const in14 = new Date();
    in14.setDate(now.getDate() + 14);
    const upcoming = events
      .filter(ev => {
        const start = parseISO(ev.dateFrom);
        return start >= now && start <= in14;
      })
      .sort((a, b) => parseISO(a.dateFrom).getTime() - parseISO(b.dateFrom).getTime());
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Upcoming Events </h3>
        {upcoming.length === 0 ? (
          <p className="text-gray-500">Nothing coming up in the next two weeks.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(ev => (
              <div
                key={`up-${ev.id}`}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => { setSelectedEvent(ev); setShowEventModal(true); }}
              >
                <div className="font-medium">{ev.name}</div>
                <div className="text-sm text-gray-600">
                  {fmt(parseISO(ev.dateFrom), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {' – '}
                  {fmt(parseISO(ev.dateTo), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {ev.location && <div className="text-sm text-gray-600">Location: {ev.location}</div>}
                <div className="text-xs mt-1 px-2 py-1 bg-gray-100 rounded-full inline-block">{ev.style}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 rounded-full bg-[#3F978F] text-white hover:bg-[#347e77] transition"
            aria-label="Add event"
          >
            <CalendarPlus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowTripModal(true)}
            className="p-2 rounded-full bg-[#3F978F] text-white hover:bg-[#347e77] transition"
            aria-label="Add trip"
          >
            <Luggage className="w-5 h-5" />
          </button>
        </div>
      </div>

      {renderHeader()}
      {renderDayNames()}
      {renderWeeks()}
      {renderSelectedDateEvents()}
      {renderUpcomingEvents()}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowCreateModal(false)}>×</button>
            <h2 className="text-2xl mb-4 font-livvic">Create new event</h2>
            <div className="space-y-3">
              <input className="w-full p-2 border rounded" placeholder="Event name" value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} />
              <input className="w-full p-2 border rounded" placeholder="Location" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
              <input type="datetime-local" className="w-full p-2 border rounded" value={newEvent.dateFrom} onChange={e => setNewEvent({ ...newEvent, dateFrom: e.target.value })} />
              <input type="datetime-local" className="w-full p-2 border rounded" value={newEvent.dateTo} onChange={e => setNewEvent({ ...newEvent, dateTo: e.target.value })} />
              <select className="w-full p-2 border rounded" value={newEvent.style} onChange={e => setNewEvent({ ...newEvent, style: e.target.value as Style })}>
                <option value="Casual">Casual</option><option value="Formal">Formal</option><option value="Athletic">Athletic</option>
                <option value="Party">Party</option><option value="Business">Business</option><option value="Outdoor">Outdoor</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button className="px-4 py-2 rounded-full border border-black" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-full bg-[#3F978F] text-white" onClick={() => handleCreate('event')}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showTripModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowTripModal(false)}>×</button>
            <h2 className="text-2xl mb-4 font-livvic">Plan a new trip</h2>
            <div className="space-y-3">
              <input className="w-full p-2 border rounded" placeholder="Destination" value={newTrip.location} onChange={e => setNewTrip({ ...newTrip, location: e.target.value })} />
              <input type="datetime-local" className="w-full p-2 border rounded" value={newTrip.dateFrom} onChange={e => setNewTrip({ ...newTrip, dateFrom: e.target.value })} />
              <input type="datetime-local" className="w-full p-2 border rounded" value={newTrip.dateTo} onChange={e => setNewTrip({ ...newTrip, dateTo: e.target.value })} />
              <select className="w-full p-2 border rounded" value={newTrip.style} onChange={e => setNewTrip({ ...newTrip, style: e.target.value as Style })}>
                <option value="Casual">Casual</option><option value="Formal">Formal</option><option value="Athletic">Athletic</option>
                <option value="Party">Party</option><option value="Business">Business</option><option value="Outdoor">Outdoor</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button className="px-4 py-2 rounded-full border border-black" onClick={() => setShowTripModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-full bg-[#3F978F] text-white" onClick={() => handleCreate('trip')}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowEventModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? (
                <input className="w-full p-2 border rounded" value={editEventData.name} onChange={e => setEditEventData({ ...editEventData, name: e.target.value })} />
              ) : (selectedEvent.name)}
            </h2>
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input className="w-full p-2 border rounded" value={editEventData.location} onChange={e => setEditEventData({ ...editEventData, location: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start</label>
                  <input type="datetime-local" className="w-full p-2 border rounded" value={editEventData.dateFrom} onChange={e => setEditEventData({ ...editEventData, dateFrom: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input type="datetime-local" className="w-full p-2 border rounded" value={editEventData.dateTo} onChange={e => setEditEventData({ ...editEventData, dateTo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Style</label>
                  <select className="w-full p-2 border rounded" value={editEventData.style} onChange={e => setEditEventData({ ...editEventData, style: e.target.value as Style })}>
                    <option value="Casual">Casual</option><option value="Formal">Formal</option><option value="Athletic">Athletic</option>
                    <option value="Party">Party</option><option value="Business">Business</option><option value="Outdoor">Outdoor</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="font-medium">When:</span>{' '}
                  {fmt(parseISO(selectedEvent.dateFrom), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} -{' '}
                  {fmt(parseISO(selectedEvent.dateTo), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {selectedEvent.location && <div><span className="font-medium">Where:</span> {selectedEvent.location}</div>}
                {selectedEvent.style && <div><span className="font-medium">Style:</span> {selectedEvent.style}</div>}
                {selectedEvent.weather && (
                  <div className="mt-2">
                    <span className="font-medium">Weather:</span>
                    <div className="text-sm text-gray-600">
                      {JSON.parse(selectedEvent.weather)[0]?.summary?.mainCondition} - {Math.round(Number(JSON.parse(selectedEvent.weather)[0]?.summary?.avgTemp || 0))}°C
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-between">
              {isTripEvent(selectedEvent) ? (
                <button
                  onClick={() => handleOpenPacking(selectedEvent)}
                  className="px-4 py-2 rounded bg-[#3F978F] text-white"
                >
                  Pack
                </button>
              ) : <div />}
              {isEditing ? (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded border">Cancel</button>
                  <button onClick={handleUpdateEvent} className="px-4 py-2 rounded bg-[#3F978F] text-white">Save</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded bg-[#3F978F] text-white">Edit</button>
                  <button onClick={handleDeleteEvent} className="px-4 py-2 rounded bg-red-500 text-white">Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPackingModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-lg shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowPackingModal(false)}>×</button>
            <h2 className="text-2xl mb-2 font-livvic">Packing List: {selectedEvent.name}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Destination, occasion, climate, etc."
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">Contents</h3>
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <details className="group" open>
                  <summary className="flex justify-between items-center p-3 cursor-pointer bg-gray-50">
                    <span className="font-medium">Items ({packItems.length})</span>
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="p-3 space-y-3">
                    {Array.from(new Set(closetItems.map(i => i.category))).map(cat => (
                      <div key={cat}>
                        <h4 className="font-medium mb-1">{cat}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {closetItems.filter(i => i.category === cat).map(i => (
                            <button
                              key={i.id}
                              className="flex items-center p-2 border rounded hover:bg-gray-50 text-left"
                              onClick={() => addClothingToPack(i)}
                            >
                              {i.imageUrl && <img src={i.imageUrl} alt={i.name} className="w-8 h-8 rounded mr-2 object-cover" />}
                              <span className="text-sm">{i.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {packItems.length > 0 && (
                      <div className="pt-2">
                        <h4 className="font-medium mb-1">Selected</h4>
                        <div className="space-y-1">
                          {packItems.map(p => (
                            <div key={p.closetItemId} className="flex justify-between items-center p-2 border rounded">
                              <span>{p.name}</span>
                              <button className="text-red-500" onClick={() => removeItemFromPack(p.closetItemId)}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center p-3 cursor-pointer bg-gray-50">
                    <span className="font-medium">Outfits ({packOutfits.length})</span>
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="p-3 space-y-3">
                    {Array.from(new Set(outfits.map(o => (o.style ?? 'Other')))).map(style => (
                      <div key={String(style)}>
                        <h4 className="font-medium mb-1">{String(style)}</h4>
                        <div className="space-y-1">
                          {outfits.filter(o => (o.style ?? 'Other') === style).map(o => (
                            <button
                              key={o.id}
                              className="w-full p-2 border rounded hover:bg-gray-50 text-left"
                              onClick={() => addOutfitToPack(o)}
                            >
                              <span className="text-sm">{o.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {packOutfits.length > 0 && (
                      <div className="pt-2">
                        <h4 className="font-medium mb-1">Selected</h4>
                        <div className="space-y-1">
                          {packOutfits.map(p => (
                            <div key={p.outfitId} className="flex justify-between items-center p-2 border rounded">
                              <span>{p.name}</span>
                              <button className="text-red-500" onClick={() => removeOutfitFromPack(p.outfitId)}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center p-3 cursor-pointer bg-gray-50">
                    <span className="font-medium">Other ({packOthers.length})</span>
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="p-3 space-y-2">
                    <div className="flex">
                      <input
                        className="flex-1 p-2 border rounded-l"
                        placeholder="Add item (e.g., toothbrush, wallet)"
                        value={newOtherItem}
                        onChange={(e) => setNewOtherItem(e.target.value)}
                      />
                      <button className="px-4 py-2 bg-[#3F978F] text-white rounded-r" onClick={addOtherToPack}>Add</button>
                    </div>
                    <div className="space-y-1">
                      {packOthers.map(x => (
                        <div key={x.id} className="flex justify-between items-center p-2 border rounded">
                          <span>{x.text}</span>
                          <button className="text-red-500" onClick={() => removeOtherFromPack(x.id)}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-2">Packing Checklist</h3>
            <div className="space-y-2">
              {packItems.map(p => (
                <label key={p.closetItemId} className="flex items-center p-2 border rounded">
                  <input type="checkbox" className="mr-2" checked={!!p.checked} onChange={() => togglePackedItem(p.closetItemId)} />
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded mr-2 object-cover" />}
                  <span className={p.checked ? 'line-through text-gray-500' : ''}>{p.name}</span>
                </label>
              ))}
              {packOutfits.map(p => (
                <label key={p.outfitId} className="flex items-center p-2 border rounded">
                  <input type="checkbox" className="mr-2" checked={!!p.checked} onChange={() => togglePackedOutfit(p.outfitId)} />
                  <span className={p.checked ? 'line-through text-gray-500' : ''}>{p.name}</span>
                </label>
              ))}
              {packOthers.map(p => (
                <label key={p.id} className="flex items-center p-2 border rounded">
                  <input type="checkbox" className="mr-2" checked={!!p.checked} onChange={() => togglePackedOther(p.id)} />
                  <span className={p.checked ? 'line-through text-gray-500' : ''}>{p.text}</span>
                </label>
              ))}
              <div className="text-sm text-gray-600 mt-2">
                {packItems.filter(i => !i.checked).length + packOutfits.filter(i => !i.checked).length + packOthers.filter(i => !i.checked).length} items left to pack
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setShowPackingModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-[#3F978F] text-white" onClick={() => savePacking(selectedEvent.id)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showDayList.open && showDayList.date && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowDayList({ open: false, date: null })}>×</button>
            <h2 className="text-xl font-bold mb-4">{fmt(showDayList.date, { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
            <div className="space-y-2">
              {eventsOnDay(showDayList.date).map(ev => (
                <div
                  key={`dl-${ev.id}`}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => { setShowDayList({ open: false, date: null }); setSelectedEvent(ev); setShowEventModal(true); }}
                >
                  <div className="font-medium">{ev.name}</div>
                  <div className="text-sm text-gray-600">
                    {fmt(parseISO(ev.dateFrom), { hour: 'numeric', minute: '2-digit' })} – {fmt(parseISO(ev.dateTo), { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
