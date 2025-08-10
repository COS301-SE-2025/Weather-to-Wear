import React, { useEffect, useState, ReactElement } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Luggage } from 'lucide-react';
import { fetchAllEvents, createEvent, deleteEvent, updateEvent } from '../services/eventsApi';

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
};

const parseISO = (s: string) => new Date(s);
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isToday = (d: Date) => isSameDay(d, new Date());
const isSameMonth = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', o).format(d);
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' as Style });
  const [newTrip, setNewTrip] = useState({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' as Style });

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

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAllEvents();
        setEvents(list);
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
    if (!src.name || !src.dateFrom || !src.dateTo) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const created = await createEvent({
        name: src.name,
        location: src.location,
        style: src.style,
        dateFrom: new Date(src.dateFrom).toISOString(),
        dateTo: new Date(src.dateTo).toISOString(),
        type: kind
      } as any);
      setEvents(e => [...e, created]);
      if (kind === 'event') {
        setShowCreateModal(false);
        setNewEvent({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
      } else {
        setShowTripModal(false);
        setNewTrip({ name: '', location: '', dateFrom: '', dateTo: '', style: 'Casual' });
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
      setEvents(list => list.map(e => (e.id === updated.id ? updated : e)));
      setSelectedEvent(updated);
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


  function getCalendarBounds(month: Date) {
    const start = monthStart(month);
    const end = monthEnd(month);
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // back to Sunday
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // forward to Saturday
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
              </div>
            );
          });

          const segs = getWeekSegments(week, events);
          const lanes = segs.length ? Math.max(...segs.map(s => s.lane)) + 1 : 0;

          return (
            <div key={week[0].toDateString()} className="relative">
              <div className="grid grid-cols-7 gap-1">{dayCells}</div>

              {/* Overlay that spans the entire row, aligned to the 7 columns */}
              <div
                className="absolute inset-x-0 top-6 bottom-1 grid grid-cols-7 gap-1 pointer-events-none"
                style={{ gridAutoRows: '22px' }}  
              >
                {segs.map(seg => {
                  const ev = seg.event;
                  const isTrip = ev.type === 'trip';
                  const bg = isTrip ? 'bg-emerald-600' : 'bg-[#3F978F]';

                  const evStart = parseISO(ev.dateFrom);
                  const evEnd   = parseISO(ev.dateTo);

                  const isStart = evStart >= week[0] && evStart <= week[6] && (evStart.getDay() + 1) === seg.colStart;
                  const isEnd   = evEnd   >= week[0] && evEnd   <= week[6] && (evEnd.getDay() + 2) === seg.colEnd;

                  return (
                    <div
                      key={`${ev.id}-${seg.weekKey}-${seg.lane}`}
                      className={`flex items-center ${bg} text-white text-xs h-[20px] px-2 overflow-hidden truncate pointer-events-auto`}
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
                {/* reserve rows so overlay doesn't collapse */}
                {lanes > 0 && Array.from({ length: lanes }).map((_, i) => (
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
    const dateEvents = events.filter(event => {
      const s = parseISO(event.dateFrom);
      const e = parseISO(event.dateTo);
      return isSameDay(s, selectedDate) || isSameDay(e, selectedDate) || (s <= selectedDate && e >= selectedDate);
    });

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

      {/* Create Event Modal */}
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

      {/* Create Trip Modal */}
      {showTripModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button className="absolute top-4 right-4 text-xl" onClick={() => setShowTripModal(false)}>×</button>
            <h2 className="text-2xl mb-4 font-livvic">Plan a new trip</h2>
            <div className="space-y-3">
              <input className="w-full p-2 border rounded" placeholder="Trip name" value={newTrip.name} onChange={e => setNewTrip({ ...newTrip, name: e.target.value })} />
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

      {/* View/Edit Modal */}
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
                  {fmt(parseISO(selectedEvent.dateTo),   { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {selectedEvent.location && <div><span className="font-medium">Where:</span> {selectedEvent.location}</div>}
                {selectedEvent.style && <div><span className="font-medium">Style:</span> {selectedEvent.style}</div>}
                {selectedEvent.weather && (
                  <div className="mt-2">
                    <span className="font-medium">Weather:</span>
                    <div className="text-sm text-gray-600">
                      {JSON.parse(selectedEvent.weather)[0]?.summary?.mainCondition} - {Math.round(JSON.parse(selectedEvent.weather)[0]?.summary?.avgTemp)}°C
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded border">Cancel</button>
                  <button onClick={handleUpdateEvent} className="px-4 py-2 rounded bg-[#3F978F] text-white">Save</button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded bg-[#3F978F] text-white">Edit</button>
                  <button onClick={handleDeleteEvent} className="px-4 py-2 rounded bg-red-500 text-white">Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
