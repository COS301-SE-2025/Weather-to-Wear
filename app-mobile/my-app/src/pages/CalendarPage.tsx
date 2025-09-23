import React, { useEffect, useState, useMemo, ReactElement, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Luggage } from 'lucide-react';
import { fetchAllEvents, createEvent, deleteEvent, updateEvent } from '../services/eventsApi';
import { fetchAllItems } from '../services/closetApi';
import { fetchAllOutfits } from '../services/outfitApi';
import { getPackingList, createPackingList, updatePackingList, deletePackingList } from '../services/packingApi';
import { API_BASE } from '../config';
import axios from 'axios';
import { groupByDay, summarizeDay, type HourlyForecast as H } from '../utils/weather';
import { fetchRecommendedOutfits, type RecommendedOutfit } from '../services/outfitApi';


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

type OutfitItemPreview = {
  closetItemId: string;
  layerCategory: string;
  imageUrl: string | null;
};

type Outfit = {
  id: string;
  name: string;
  style?: string | Style;
  coverImageUrl?: string | null;
  outfitItems?: OutfitItemPreview[];
};

type PopupState = {
  open: boolean;
  variant: 'success' | 'error';
  message: string;
};

type ConfirmState = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve?: (ok: boolean) => void;
};

const parseISO = (s: string) => new Date(s);
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isToday = (d: Date) => isSameDay(d, new Date());
const isSameMonth = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', o).format(d);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const ROW_GAP_PX = 2;
const isNarrow = () => (typeof window !== 'undefined' ? window.innerWidth < 640 : false);
const normalizeUrl = (u?: string | null) => {
  if (!u) return null;
  return u.startsWith('http') ? u : `${API_BASE}${u}`;
};

function isTripEvent(ev: Partial<Event>) {
  if (!ev) return false;
  const t = ev.type ? String(ev.type).toLowerCase() : '';
  return t === 'trip' || ev.isTrip === true || /(^|\s)trip(\s|$)/i.test(ev.name || '');
}

function toLocalDatetimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Open-Meteo geocoder (for city suggestions/validation) ---
async function geocodeCity(query: string, count = 5): Promise<Array<{ label: string; city: string }>> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data?.results || []) as Array<any>;
  return results.map(r => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '), // what we show
    city: r.name as string,                                          // what we save
  }));
}

async function validateAndStandardizeLocation(raw: string): Promise<string | null> {
  const q = (raw || '').trim();
  if (!q) return null;
  const matches = await geocodeCity(q, 1);
  return matches[0]?.city ?? null; // canonical city
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
    style: 'Casual' as Style,
  });
  // Edit-location autocomplete state
  const [locSuggestE, setLocSuggestE] = useState<Array<{ label: string; city: string }>>([]);
  const [locErrorE, setLocErrorE] = useState<string | null>(null);
  const [locLoadingE, setLocLoadingE] = useState(false);

  // Recommended outfit (for selected event)
  const [eventOutfit, setEventOutfit] = useState<RecommendedOutfit | null>(null);
  const [eventOutfitLoading, setEventOutfitLoading] = useState(false);
  const [eventOutfitError, setEventOutfitError] = useState<string | null>(null);
  const [showDayList, setShowDayList] = useState<{ open: boolean; date: Date | null }>({ open: false, date: null });
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packItems, setPackItems] = useState<{ closetItemId: string; name: string; imageUrl?: string | null; checked?: boolean; _rowId?: string }[]>([]);
  const [packOutfits, setPackOutfits] = useState<{ outfitId: string; name: string; imageUrl?: string | null; checked?: boolean; _rowId?: string }[]>([]);
  const [packOthers, setPackOthers] = useState<{ id: string; text: string; checked?: boolean }[]>([]);
  const [newOtherItem, setNewOtherItem] = useState('');
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [packingListId, setPackingListId] = useState<string | null>(null);
  const [baseItemIds, setBaseItemIds] = useState<Set<string>>(new Set());
  const [baseOutfitIds, setBaseOutfitIds] = useState<Set<string>>(new Set());
  const [baseOtherLabels, setBaseOtherLabels] = useState<Set<string>>(new Set());

  const [maxLanes, setMaxLanes] = useState<number>(isNarrow() ? 1 : 2);
  const [rowPx, setRowPx] = useState<number>(isNarrow() ? 14 : 16);

  // Popup + Confirm (Add page style)
  const [popup, setPopup] = useState<PopupState>({ open: false, variant: 'success', message: '' });
  const notify = (variant: PopupState['variant'], message: string) => setPopup({ open: true, variant, message });

  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: '' });
  const askConfirm = (message: string, confirmLabel = 'OK', cancelLabel = 'Cancel') =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, message, confirmLabel, cancelLabel, resolve });
    });

  const pruneOutfitsBasedOnItems = useCallback(
    (nextItems: { closetItemId: string }[]) => {
      const selectedIds = new Set(nextItems.map(p => p.closetItemId));
      setPackOutfits(prev => prev.filter(po => {
        const o = outfits.find(oo => oo.id === po.outfitId);
        const hasAny = o?.outfitItems?.some(it => selectedIds.has(it.closetItemId));
        return !!hasAny;
      }));
    },
    [outfits]
  );

  const addPackItemIfMissing = useCallback(
    (closetItemId: string, fallbackName?: string, fallbackImg?: string | null) => {
      setPackItems(prev => {
        if (prev.some(p => p.closetItemId === closetItemId)) return prev;
        const meta = closetItems.find(ci => ci.id === closetItemId);
        const next = [
          ...prev,
          {
            closetItemId,
            name: meta?.name || fallbackName || 'Item',
            imageUrl: meta?.imageUrl || fallbackImg || null,
            checked: false,
          },
        ];
        pruneOutfitsBasedOnItems(next);
        return next;
      });
    },
    [closetItems, pruneOutfitsBasedOnItems]
  );

  // helper sets for styling selections in the Outfit grid
  const packedItemIds = React.useMemo(
    () => new Set(packItems.map(p => p.closetItemId)),
    [packItems]
  );

  const outfitFullyInList = React.useCallback(
    (o: Outfit) => {
      const parts = (o.outfitItems ?? []).map(it => it.closetItemId);
      return parts.length > 0 && parts.every(id => packedItemIds.has(id));
    },
    [packedItemIds]
  );

  useEffect(() => {
    const onResize = () => {
      const narrow = isNarrow();
      setMaxLanes(narrow ? 1 : 2);
      setRowPx(narrow ? 14 : 16);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mapEventDto = (d: any): Event => {
    const isTrip = !!d?.isTrip || String(d?.type || '').toLowerCase() === 'trip' || /(^|\s)trip(\s|$)/i.test(String(d?.name || ''));
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
        notify('error', 'Failed to load events. Please try again later.');
      }
    };
    load();
    const rerender = () => load();
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
      dateFrom: toLocalDatetimeInputValue(selectedEvent.dateFrom),
      dateTo: toLocalDatetimeInputValue(selectedEvent.dateTo),
      style: selectedEvent.style || 'Casual'
    });
  }, [selectedEvent]);

  // Day-1 summary from the event's weather (enables outfit recs)
  const selectedEventTodaySummary = useMemo(() => {
    if (!selectedEvent?.weather) return undefined;
    try {
      const days: { date: string; summary: any }[] = JSON.parse(selectedEvent.weather) || [];
      const s = days[0]?.summary;
      return s
        ? {
            avgTemp: s.avgTemp,
            minTemp: s.minTemp,
            maxTemp: s.maxTemp,
            willRain: s.willRain,
            mainCondition: s.mainCondition,
          }
        : undefined;
    } catch {
      return undefined;
    }
  }, [selectedEvent?.weather]);

  // Fetch a recommended outfit whenever the modal opens and we have a summary
  useEffect(() => {
    if (!showEventModal || !selectedEvent?.id || !selectedEvent?.style || !selectedEventTodaySummary) {
      setEventOutfit(null);
      return;
    }
    let cancelled = false;
    setEventOutfitLoading(true);
    setEventOutfitError(null);

    fetchRecommendedOutfits(selectedEventTodaySummary, selectedEvent.style, selectedEvent.id)
      .then(recs => {
        if (cancelled) return;
        setEventOutfit(recs[0] ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setEventOutfitError('Could not load outfit recommendation.');
      })
      .finally(() => {
        if (!cancelled) setEventOutfitLoading(false);
      });

    return () => { cancelled = true; };
  }, [
    showEventModal,
    selectedEvent?.id,
    selectedEvent?.style,
    selectedEventTodaySummary ? JSON.stringify(selectedEventTodaySummary) : 'no-summary',
  ]);



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

  useEffect(() => {
    if (!isEditing) return;
    const q = editEventData.location.trim();
    setLocErrorE(null);
    if (!q || q.length < 2) {
      setLocSuggestE([]);
      return;
    }
    let cancelled = false;
    setLocLoadingE(true);
    const t = setTimeout(async () => {
      const opts = await geocodeCity(q, 6);
      if (!cancelled) setLocSuggestE(opts);
      setLocLoadingE(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isEditing, editEventData.location]);


  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const onDayClick = (d: Date) => setSelectedDate(d);

  async function handleCreate(kind: 'event' | 'trip') {
    const src = kind === 'event' ? newEvent : newTrip;
    if ((kind === 'event' && !src.name) || !src.dateFrom || !src.dateTo) {
      notify('error', 'Please fill in all required fields.');
      return;
    }
    try {
      const created = await createEvent({
        name: kind === 'trip' ? 'Trip' : (src.name ?? null),
        location: src.location,
        style: src.style,
        dateFrom: new Date(src.dateFrom).toISOString(),
        dateTo: new Date(src.dateTo).toISOString(),
        isTrip: kind === 'trip',
      });
      const mapped = mapEventDto(created);
      setEvents((e) => [...e, mapped]);
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
      notify('error', err?.response?.data?.message || 'Failed to create');
    }
  }

  // === Rebuild weather + summaries after an edit (city/date/style) ===
  async function rebuildEventWeatherAndRecs(ev: Event) {
    try {
      const { data } = await axios.get(`${API_BASE}/api/weather/week`, {
        params: { location: ev.location, t: Date.now() },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const hours: H[] = (data?.forecast || []) as H[];
      const byDay = groupByDay(hours);

      const days: Array<{ date: string; summary: ReturnType<typeof summarizeDay> | null }> = [];
      const start = new Date(ev.dateFrom);
      const end = new Date(ev.dateTo);
      const seen = new Set<string>();

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (seen.has(key)) continue;
        seen.add(key);
        const dayHours = byDay[key] || [];
        days.push({ date: key, summary: dayHours.length ? summarizeDay(dayHours) : null });
      }

      const withWeather: Event = {
        ...ev,
        weather: JSON.stringify(
          days.map(d => ({
            date: d.date,
            summary: d.summary && {
              avgTemp: d.summary.avgTemp,
              minTemp: d.summary.minTemp,
              maxTemp: d.summary.maxTemp,
              willRain: d.summary.willRain,
              mainCondition: d.summary.mainCondition,
            },
          }))
        ),
      };

      setEvents(list => list.map(e => (e.id === withWeather.id ? withWeather : e)));
      setSelectedEvent(withWeather);
      return withWeather;
    } catch (e) {
      console.error('Failed to rebuild weather after edit', e);
      return ev;
    }
  }

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    try {
      setLocErrorE(null);
      const standardized = await validateAndStandardizeLocation(editEventData.location);
      if (!standardized) {
        setLocErrorE('Please select a real city (use the suggestions).');
        return;
      }

      const payload = {
        id: selectedEvent.id,
        name: editEventData.name || selectedEvent.name,
        location: standardized, // save canonical city
        style: editEventData.style || selectedEvent.style,
        dateFrom: new Date(
          editEventData.dateFrom || toLocalDatetimeInputValue(selectedEvent.dateFrom)
        ).toISOString(),
        dateTo: new Date(
          editEventData.dateTo || toLocalDatetimeInputValue(selectedEvent.dateTo)
        ).toISOString(),
        isTrip: selectedEvent.isTrip ?? false,
      };

      const updated = await updateEvent(payload as any);
      const mapped = mapEventDto(updated);

      // Rebuild weather (for the possibly new city)
      await rebuildEventWeatherAndRecs(mapped);

      setIsEditing(false);
      notify('success', 'Event updated');
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (e: any) {
      console.error('update failed', e?.response?.data || e);
      notify('error', e?.response?.data?.message || 'Failed to update event');
    }
  };


  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    const ok = await askConfirm('Are you sure you want to delete this?', 'Delete', 'Cancel');
    if (!ok) return;

    try {
      // If it’s a trip, remove its packing list first to satisfy FK
      if (isTripEvent(selectedEvent)) {
        try {
          const existing = await getPackingList(selectedEvent.id);
          if (existing?.id) {
            await deletePackingList(existing.id);
          }
        } catch {
          // swallow 404/no-list cases, we only need to ensure nothing remains
        }
      }

      await deleteEvent(selectedEvent.id);

      setEvents(list => list.filter(e => e.id !== selectedEvent.id));
      setShowEventModal(false);
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (e) {
      console.error('delete failed', e);
      notify('error', 'Failed to delete event. Please try again.');
    }
  };


  async function handleOpenPacking(trip: Event) {
    try {
      const [ciRes, ofRes, existing] = await Promise.all([fetchAllItems(), fetchAllOutfits(), getPackingList(trip.id)]);
      const ciRaw = Array.isArray((ciRes as any)?.data) ? (ciRes as any).data : ((ciRes as any)?.data?.items ?? (ciRes as any)?.data ?? ciRes);
      const ofRaw = Array.isArray((ofRes as any)?.data) ? (ofRes as any).data : ((ofRes as any)?.data?.outfits ?? (ofRes as any)?.data ?? ofRes);
      const ciList: ClothingItem[] = (ciRaw as any[]).map((it: any) => ({
        id: String(it.id ?? it.itemId ?? ''),
        name: it.name ?? it.title ?? it.category ?? '',
        category: it.category ?? it.type ?? 'Other',
        imageUrl: it.imageUrl ? normalizeUrl(it.imageUrl) : null,
        style: (it.style ?? it.tag ?? null) as any,
      }));
      const outfitsList: Outfit[] = (ofRaw as any[]).map((o: any, idx: number) => ({
        id: String(o.id ?? o.outfitId ?? `outfit-${idx}`),
        name: o.name ?? o.title ?? `Outfit ${idx + 1}`,
        style: o.style ?? o.occasion ?? 'Other',
        coverImageUrl: normalizeUrl(o.coverImageUrl ?? null),
        outfitItems: Array.isArray(o.outfitItems)
          ? o.outfitItems.map((it: any) => ({
              closetItemId: String(it.closetItemId ?? it.id ?? ''),
              layerCategory: String(it.layerCategory ?? it.layer ?? ''),
              imageUrl: normalizeUrl(it.imageUrl ?? null),
            }))
          : [],
      }));

      // ❗ Remove outfit parts that point to deleted/missing closet items.
      // Then drop any outfits that are now empty.
      const ciIds = new Set(ciList.map(c => c.id));
      const cleanedOutfits: Outfit[] = outfitsList
        .map(o => ({
          ...o,
          outfitItems: (o.outfitItems ?? []).filter(it => ciIds.has(it.closetItemId)),
        }))
        .filter(o => (o.outfitItems?.length ?? 0) > 0);


      setClosetItems(ciList);
      setOutfits(cleanedOutfits);
      setPackingListId(existing?.id ?? null);

      const ciById = new Map(ciList.map(c => [c.id, c]));
      const initialItems = (existing?.items ?? []).map((r: any) => {
        const meta = ciById.get(String(r.closetItemId));
        return {
          closetItemId: String(r.closetItemId),
          name: meta?.name || r.closetItem?.name || 'Item',
          imageUrl: meta?.imageUrl || normalizeUrl(r.closetItem?.imageUrl ?? null),
          checked: !!r.packed,
          _rowId: r.id,
        };
      });

      const initialOthers = (existing?.others ?? []).map((r: any) => ({
        id: String(r.id),
        text: r.label,
        checked: !!r.packed,
      }));

      const initialOutfits = (existing?.outfits ?? [])
        .filter((r: any) => cleanedOutfits.some(o => o.id === String(r.outfitId)))
        .map((r: any) => ({
          outfitId: String(r.outfitId),
          name:
            r.outfit?.name ??
            cleanedOutfits.find(o => o.id === String(r.outfitId))?.name ??
            'Outfit',
          imageUrl:
            cleanedOutfits.find(o => o.id === String(r.outfitId))?.coverImageUrl ??
            normalizeUrl(r.outfit?.coverImageUrl ?? null),
          checked: !!r.packed,
          _rowId: r.id,
        }));


      setPackItems(initialItems);
      setPackOthers(initialOthers);
      setPackOutfits(initialOutfits);

      setBaseItemIds(new Set((existing?.items ?? []).map((r: any) => String(r.closetItemId))));
      setBaseOutfitIds(new Set((existing?.outfits ?? []).map((r: any) => String(r.outfitId))));
      setBaseOtherLabels(new Set((existing?.others ?? []).map((r: any) => String(r.label))));


      if (initialOutfits.length) {
        const toAdd: { id: string; name?: string; img?: string | null }[] = [];
        for (const oSel of initialOutfits) {
          const o = cleanedOutfits.find(oo => oo.id === oSel.outfitId);
          o?.outfitItems?.forEach(it => {
            toAdd.push({ id: it.closetItemId, name: ciById.get(it.closetItemId)?.name, img: ciById.get(it.closetItemId)?.imageUrl || it.imageUrl });
          });
        }
        setPackItems(prev => {
          const seen = new Set(prev.map(p => p.closetItemId));
          const next = [...prev];
          for (const x of toAdd) {
            if (seen.has(x.id)) continue;
            seen.add(x.id);
            next.push({ closetItemId: x.id, name: x.name || 'Item', imageUrl: x.img || null, checked: false });
          }
          return next;
        });
      }

      setShowPackingModal(true);
    } catch (e) {
      console.error('open packing failed', e);
      notify('error', 'Could not open packing list.');
    }
  }

  const addClothingToPack = (item: ClothingItem) => {
    setPackItems(prev => {
      if (prev.some(p => p.closetItemId === item.id)) return prev;
      const next = [
        ...prev,
        {
          closetItemId: item.id,
          name: item.name,
          // imageUrl: item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:5001${item.imageUrl}`) : null,
          imageUrl: normalizeUrl(item.imageUrl),
          checked: false,
        },
      ];
      pruneOutfitsBasedOnItems(next);
      return next;
    });
  };

  const addOutfitToPack = (o: Outfit) => {
    if (!o.outfitItems || o.outfitItems.length === 0) return; // safety: ignore empty outfits

    if (!packOutfits.some(p => p.outfitId === o.id)) {
      const thumb = o.coverImageUrl || (o.outfitItems?.[0]?.imageUrl ?? null);
      setPackOutfits(prev => [...prev, { outfitId: o.id, name: o.name, imageUrl: thumb, checked: false }]);
    }
    (o.outfitItems ?? []).forEach(it => {
      addPackItemIfMissing(it.closetItemId, undefined, it.imageUrl);
    });
  };


  const addOtherToPack = () => {
    const t = newOtherItem.trim();
    if (!t) return;
    setPackOthers(prev => [...prev, { id: `other-${Date.now()}`, text: t, checked: false }]);
    setNewOtherItem('');
  };

  const removeItemFromPack = (id: string) => {
    setPackItems(prev => {
      const next = prev.filter(p => p.closetItemId !== id);
      pruneOutfitsBasedOnItems(next);
      return next;
    });
  };

  const removeOtherFromPack = (id: string) => setPackOthers(prev => prev.filter(p => p.id !== id));

  const togglePackedItem = (id: string) =>
    setPackItems(prev => prev.map(p => (p.closetItemId === id ? { ...p, checked: !p.checked } : p)));

  const togglePackedOther = (id: string) =>
    setPackOthers(prev => prev.map(p => (p.id === id ? { ...p, checked: !p.checked } : p)));

  async function savePacking(tripId: string) {
    try {
      const have = new Set(packItems.map(p => p.closetItemId));

      const outfitsToPersist = packOutfits.filter(po => {
        const o = outfits.find(oo => oo.id === po.outfitId);
        const parts = (o?.outfitItems ?? []).map(i => i.closetItemId);
        return parts.length > 0 && parts.every(id => have.has(id));
      });

      const currentItemIds = new Set(packItems.map(p => p.closetItemId));
      const currentOutfitIds = new Set(outfitsToPersist.map(o => o.outfitId));
      const currentOtherLabels = new Set(
        packOthers.map(o => o.text.trim()).filter(Boolean)
      );

      const setsEqual = (a: Set<string>, b: Set<string>) =>
        a.size === b.size && Array.from(a).every(x => b.has(x));

      const structureChanged =
        !packingListId ||
        !setsEqual(baseItemIds, currentItemIds) ||
        !setsEqual(baseOutfitIds, currentOutfitIds) ||
        !setsEqual(baseOtherLabels, currentOtherLabels) ||
        packItems.some(p => !(p as any)._rowId) ||
        outfitsToPersist.some(o => !(o as any)._rowId) ||
        packOthers.some(o => o.id.startsWith('other-'));

      let listId = packingListId;

      if (structureChanged) {
        if (listId) {
          await deletePackingList(listId);
        }

        await createPackingList({
          tripId,
          items: Array.from(currentItemIds),
          outfits: Array.from(currentOutfitIds),
          others: Array.from(currentOtherLabels),
        });

        const fresh = await getPackingList(tripId);
        listId = fresh?.id ?? null;

        const itemsUpdate = packItems
          .filter(p => currentItemIds.has(p.closetItemId))
          .map(p => {
            const row = (fresh?.items ?? []).find(
              (r: any) => String(r.closetItemId) === p.closetItemId
            );
            return row ? { id: row.id, packed: !!p.checked } : null;
          })
          .filter(Boolean) as Array<{ id: string; packed: boolean }>;

        const outfitsUpdate = outfitsToPersist
          .map(po => {
            const row = (fresh?.outfits ?? []).find(
              (r: any) => String(r.outfitId) === po.outfitId
            );
            return row ? { id: row.id, packed: !!po.checked } : null;
          })
          .filter(Boolean) as Array<{ id: string; packed: boolean }>;

        const othersUpdate = packOthers
          .filter(o => currentOtherLabels.has(o.text.trim()))
          .map(o => {
            const row = (fresh?.others ?? []).find(
              (r: any) => String(r.label) === o.text.trim()
            );
            return row ? { id: row.id, packed: !!o.checked } : null;
          })
          .filter(Boolean) as Array<{ id: string; packed: boolean }>;

        if (listId && (itemsUpdate.length || outfitsUpdate.length || othersUpdate.length)) {
          await updatePackingList(listId, {
            items: itemsUpdate as any,
            outfits: outfitsUpdate as any,
            others: othersUpdate as any,
          });
        }
      } else {
        await updatePackingList(listId!, {
          items: packItems.map(p => ({ id: (p as any)._rowId, packed: !!p.checked })) as any,
          outfits: outfitsToPersist.map(o => ({ id: (o as any)._rowId, packed: !!o.checked })) as any,
          others: packOthers
            .filter(o => !o.id.startsWith('other-'))
            .map(o => ({ id: o.id, packed: !!o.checked })) as any,
        });
      }

      setShowPackingModal(false);
    } catch (e) {
      console.error(e);
      notify('error', 'Failed to save packing list');
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
      if (e < start || s > end) continue;
      const cs = Math.max(1, s < start ? 1 : s.getDay() + 1);
      const ce = Math.min(8, e > end ? 8 : e.getDay() + 2);
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
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return events.filter(event => {
      const eventStart = new Date(event.dateFrom);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.dateTo);
      eventEnd.setHours(23, 59, 59, 999);
      return normalizedDate >= eventStart && normalizedDate <= eventEnd;
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
            const dayEvents = eventsOnDay(d);
            const dayCount = dayEvents.length;
            const overflow = Math.max(0, dayCount - maxLanes);
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
                    className="absolute bottom-1 left-1 z-20 text-[11px] leading-none px-1.5 py-0.5 rounded-full bg-gray-100 border shadow-sm"
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
          const segsToRender = segs.filter(s => s.lane < maxLanes);
          return (
            <div key={week[0].toDateString()} className="relative">
              <div className="grid grid-cols-7 gap-1">{dayCells}</div>
              <div
                className="absolute inset-x-0 top-6 bottom-7 sm:bottom-6 z-0 grid grid-cols-7 gap-x-1 pointer-events-none"
                style={{ gridAutoRows: `${rowPx}px`, rowGap: `${ROW_GAP_PX}px` }}
              >
                {segsToRender.map(seg => {
                  const ev = seg.event;
                  const bg = isTripEvent(ev) ? 'bg-emerald-600' : 'bg-[#3F978F]';
                  const evStart = parseISO(ev.dateFrom);
                  const evEnd = parseISO(ev.dateTo);
                  const isStart = isSameDay(evStart, week[seg.colStart - 1]);
                  const isEnd = isSameDay(evEnd, week[seg.colEnd - 2]);
                  return (
                    <div
                      key={`${ev.id}-${seg.weekKey}-${seg.lane}`}
                      className={`flex items-center ${bg} text-white text-[11px] sm:text-xs h-[14px] sm:h-[16px] px-1.5 sm:px-2 rounded-full overflow-hidden truncate pointer-events-auto`}
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
                {lanes > 0 && Array.from({ length: Math.min(lanes, maxLanes) }).map((_, i) => (
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
          {isToday(selectedDate) ? "Today's Events" : fmt(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
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
    <div className="p-4 max-w-4xl mx-auto -mt-16 md:mt-8">
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
                  <input
                    className="w-full p-2 border rounded"
                    value={editEventData.location}
                    onChange={e => setEditEventData(d => ({ ...d, location: e.target.value }))}
                    placeholder="City (pick from suggestions)"
                  />

                  {locLoadingE && <div className="text-xs text-gray-500 mt-1">Searching cities…</div>}

                  {locSuggestE.length > 0 && (
                    <ul className="mt-1 border rounded-md max-h-40 overflow-auto bg-white">
                      {locSuggestE.map((opt, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100"
                            onClick={() => {
                              setEditEventData(d => ({ ...d, location: opt.city })); // save only city
                              setLocSuggestE([]);
                              setLocErrorE(null);
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {locErrorE && <p className="text-sm text-red-500 mt-1">{locErrorE}</p>}
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
                {/* Recommended Outfit (like the dashboard) */}
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Recommended Outfit</h3>
                    {eventOutfitLoading && <p className="text-sm text-gray-500">Loading outfit…</p>}
                    {eventOutfitError && <p className="text-sm text-red-500">{eventOutfitError}</p>}
                    {eventOutfit && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {eventOutfit.outfitItems.map(item => (
                          <img
                            key={item.closetItemId}
                            src={normalizeUrl(item.imageUrl) || ''}
                            alt={item.layerCategory}
                            className="w-16 h-16 object-contain rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
            <h2 className="text-2xl mb-2 font-livvic">Pack Your Suitcase</h2>
            <h3 className="text-lg font-semibold mb-2">Contents</h3>
            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center p-3 cursor-pointer bg-gray-50">
                    <span className="font-medium">Items ({packItems.length})</span>
                    <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="p-3 space-y-3">
                    {Array.from(new Set(closetItems.map(i => i.category))).map(cat => (
                      <div key={cat}>
                        <h4 className="font-medium mb-1">{cat}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {closetItems.filter(i => i.category === cat).map(i => {
                            const selected = packItems.some(p => p.closetItemId === i.id);
                            return (
                              <button
                                key={i.id}
                                className={`flex items-center justify-center p-2 border rounded hover:bg-gray-50 text-left ${selected ? 'border-2 border-[#3F978F]' : ''}`}
                                onClick={() => addClothingToPack(i)}
                                title={i.name}
                              >
                                {i.imageUrl && <img src={i.imageUrl} alt={i.name} className="w-12 h-12 rounded object-cover" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
                    {Array.from(
                      new Set(
                        outfits
                          .filter(o => (o.outfitItems?.length ?? 0) > 0) // only non-empty outfits
                          .map(o => (o.style ?? 'Other'))
                      )
                    ).map(style => (
                      <div key={String(style)}>
                        <h4 className="font-medium mb-1">{String(style)}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {outfits
                            .filter(o => (o.outfitItems?.length ?? 0) > 0 && (o.style ?? 'Other') === style) // only non-empty outfits
                            .map(o => {
                            const anyItemChosen = o.outfitItems?.some(it => packItems.some(pi => pi.closetItemId === it.closetItemId));
                            const selected = packOutfits.some(p => p.outfitId === o.id) || !!anyItemChosen;
                            return (
                              <button
                                key={o.id}
                                onClick={() => addOutfitToPack(o)}
                                className={`border rounded-lg p-2 bg-white hover:bg-gray-50 text-left ${outfitFullyInList(o) ? 'border-[#3F978F] ring-2 ring-[#3F978F]' : 'border-gray-200'}`}
                                title={o.name}
                              >

                                <div className="space-y-1">
                                  <div className={`${o.outfitItems?.some(it => ['headwear', 'accessory'].includes(it.layerCategory)) ? 'flex' : 'hidden'} justify-center space-x-1`}>
                                    {o.outfitItems?.filter(it => ['headwear', 'accessory'].includes(it.layerCategory)).map(it => (
                                      <img key={it.closetItemId} src={it.imageUrl || ''} alt="" className="w-12 h-12 object-contain rounded" />
                                    ))}
                                  </div>
                                  <div className="flex justify-center space-x-1">
                                    {o.outfitItems?.filter(it => ['base_top', 'mid_top', 'outerwear'].includes(it.layerCategory)).map(it => (
                                      <img key={it.closetItemId} src={it.imageUrl || ''} alt="" className="w-12 h-12 object-contain rounded" />
                                    ))}
                                  </div>
                                  <div className="flex justify-center space-x-1">
                                    {o.outfitItems?.filter(it => it.layerCategory === 'base_bottom').map(it => (
                                      <img key={it.closetItemId} src={it.imageUrl || ''} alt="" className="w-12 h-12 object-contain rounded" />
                                    ))}
                                  </div>
                                  <div className="flex justify-center space-x-1">
                                    {o.outfitItems?.filter(it => it.layerCategory === 'footwear').map(it => (
                                      <img key={it.closetItemId} src={it.imageUrl || ''} alt="" className="w-10 h-10 object-contain rounded" />
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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

            <h3 className="text-lg font-semibold mt-6 mb-2">Packing List</h3>
            <div className="space-y-2">
              {packItems.map(p => (
                <div key={p.closetItemId} className="flex items-center p-2 border rounded">
                  <input type="checkbox" className="mr-2" checked={!!p.checked} onChange={() => togglePackedItem(p.closetItemId)} />
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded mr-2 object-cover" />}
                  <span className={`flex-1 ${p.checked ? 'line-through text-gray-500' : ''}`}>{p.name}</span>
                  <button className="text-red-500 text-lg ml-2" onClick={() => removeItemFromPack(p.closetItemId)} aria-label={`Remove ${p.name}`} title="Remove">×</button>
                </div>
              ))}
              {packOthers.map(p => (
                <div key={p.id} className="flex items-center p-2 border rounded">
                  <input type="checkbox" className="mr-2" checked={!!p.checked} onChange={() => togglePackedOther(p.id)} />
                  <span className={`flex-1 ${p.checked ? 'line-through text-gray-500' : ''}`}>{p.text}</span>
                  <button className="text-red-500 text-lg ml-2" onClick={() => removeOtherFromPack(p.id)} aria-label={`Remove ${p.text}`} title="Remove">×</button>
                </div>
              ))}
              <div className="text-sm text-gray-600 mt-2">
                {packItems.filter(i => !i.checked).length + packOthers.filter(i => !i.checked).length} items left to pack
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

      {/* Global popup (same look & feel as Add page) */}
      {popup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              {popup.variant === 'success' ? '🎉 Success! 🎉' : '⚠️ Error'}
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">{popup.message}</p>
            <button
              onClick={() => setPopup(p => ({ ...p, open: false }))}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog (replaces window.confirm) */}
      {confirmState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg">
            <p className="mb-6 text-gray-700 dark:text-gray-300">{confirmState.message}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  confirmState.resolve?.(false);
                  setConfirmState(cs => ({ ...cs, open: false, resolve: undefined }));
                }}
                className="px-5 py-2 rounded-full border"
              >
                {confirmState.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => {
                  confirmState.resolve?.(true);
                  setConfirmState(cs => ({ ...cs, open: false, resolve: undefined }));
                }}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
              >
                {confirmState.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
