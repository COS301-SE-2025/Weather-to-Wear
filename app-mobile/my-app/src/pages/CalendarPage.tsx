import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
};

const parseISO = (dateString: string) => new Date(dateString);
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isSameMonth = (a: Date, b: Date) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const isToday = (date: Date) => isSameDay(date, new Date());
const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => 
  new Intl.DateTimeFormat('en-US', options).format(date);
const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getMonthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    style: 'Casual' as Style
  });

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
    const loadEvents = async () => {
      try {
        const fetchedEvents = await fetchAllEvents();
        setEvents(fetchedEvents);
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };

    const handleStorageChange = () => loadEvents();
    
    loadEvents();
    window.addEventListener('eventUpdated', handleStorageChange);
    return () => window.removeEventListener('eventUpdated', handleStorageChange);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      setIsEditing(false);
      setEditEventData({
        id: selectedEvent.id,
        name: selectedEvent.name,
        location: selectedEvent.location,
        dateFrom: selectedEvent.dateFrom.slice(0, 16),
        dateTo: selectedEvent.dateTo.slice(0, 16),
        style: selectedEvent.style || 'Casual'
      });
    }
  }, [selectedEvent]);

  useEffect(() => {
    const cleanupExpiredEvents = async () => {
      const now = new Date();
      const expiredIds = events
        .filter(event => new Date(event.dateTo) < now)
        .map(event => event.id);

      if (expiredIds.length > 0) {
        try {
          await Promise.all(expiredIds.map(id => deleteEvent(id)));
          setEvents(prev => prev.filter(event => 
            !expiredIds.includes(event.id)
          ));
        } catch (err) {
          console.error('Error deleting expired events:', err);
        }
      }
    };

    // Run every 5 minutes (adjust as needed)
    const interval = setInterval(cleanupExpiredEvents, 5 * 60 * 1000);
    cleanupExpiredEvents(); 
    
    return () => clearInterval(interval);
  }, [events]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.dateFrom || !newEvent.dateTo) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const created = await createEvent({
        name: newEvent.name,
        location: newEvent.location,
        style: newEvent.style, 
        dateFrom: new Date(newEvent.dateFrom).toISOString(),
        dateTo: new Date(newEvent.dateTo).toISOString(),
      });

      setEvents([...events, created]);
      setShowCreateModal(false);
      setNewEvent({ 
        name: '', 
        location: '', 
        dateFrom: '', 
        dateTo: '', 
        style: 'Casual' 
      });
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (err: unknown) {
      console.error('Create event failed:', err);
      if (err instanceof Error) {
        alert(err.message);
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Failed to create event');
      } else {
        alert('Failed to create event');
      }
    }
  };

  const handleUpdateEvent = async () => {
    try {
      const updated = await updateEvent({
        id: editEventData.id,
        name: editEventData.name,
        location: editEventData.location,
        dateFrom: new Date(editEventData.dateFrom).toISOString(),
        dateTo: new Date(editEventData.dateTo).toISOString(),
        style: editEventData.style, 
      });
      
      setEvents(events.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);
      setIsEditing(false);
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (err) {
      console.error('Failed to update event:', err);
      alert('Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !window.confirm('Delete this event?')) return;
    
    try {
      await deleteEvent(selectedEvent.id);
      setEvents(events.filter(e => e.id !== selectedEvent.id));
      setShowEventModal(false);
      window.dispatchEvent(new Event('eventUpdated'));
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event');
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h2 className="text-xl font-bold">
        {formatDate(currentMonth, { month: 'long', year: 'numeric' })}
      </h2>
      <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(day => (
          <div key={day} className="text-center font-medium text-sm py-1">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = getMonthStart(currentMonth);
    const monthEnd = getMonthEnd(currentMonth);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const rows = [];
    let days = [];
    let day = new Date(startDate);

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dayEvents = events.filter(event => {
          const eventStart = parseISO(event.dateFrom);
          const eventEnd = parseISO(event.dateTo);
          return (
            isSameDay(eventStart, cloneDay) || 
            isSameDay(eventEnd, cloneDay) ||
            (eventStart <= cloneDay && eventEnd >= cloneDay)
          );
        });

        days.push(
          <div
            key={day.toString()}
            className={`min-h-16 p-1 border ${isSameMonth(day, monthStart) ? 'bg-white' : 'bg-gray-100'} 
              ${isToday(day) ? 'border-2 border-[#3F978F]' : 'border-gray-200'}
              ${isSameDay(day, selectedDate) ? 'bg-[#3F978F] bg-opacity-10' : ''}`}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="text-right text-sm mb-1">
              {day.getDate()}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map(event => (
                <div 
                  key={event.id}
                  className="text-xs p-1 bg-[#3F978F] text-white rounded truncate cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                >
                  {event.name}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-center text-gray-500">
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          </div>
        );
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="mb-4">{rows}</div>;
  };

  const renderSelectedDateEvents = () => {
    const dateEvents = events.filter(event => {
      const eventStart = parseISO(event.dateFrom);
      const eventEnd = parseISO(event.dateTo);
      return (
        isSameDay(eventStart, selectedDate) || 
        isSameDay(eventEnd, selectedDate) ||
        (eventStart <= selectedDate && eventEnd >= selectedDate)
      );
    });

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">
          Events on {formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        {dateEvents.length === 0 ? (
          <p className="text-gray-500">No events scheduled</p>
        ) : (
          <div className="space-y-2">
            {dateEvents.map(event => (
              <div 
                key={event.id} 
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                }}
              >
                <div className="font-medium">{event.name}</div>
                <div className="text-sm text-gray-600">
                  {formatDate(parseISO(event.dateFrom), { hour: 'numeric', minute: '2-digit' })} -{' '}
                  {formatDate(parseISO(event.dateTo), { hour: 'numeric', minute: '2-digit' })}
                </div>
                {event.location && (
                  <div className="text-sm text-gray-600">Location: {event.location}</div>
                )}
                <div className="text-xs mt-1 px-2 py-1 bg-gray-100 rounded-full inline-block">
                  {event.style}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="p-2 rounded-full bg-[#3F978F] text-white hover:bg-[#347e77] transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderSelectedDateEvents()}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button
              className="absolute top-4 right-4 text-xl"
              onClick={() => setShowCreateModal(false)}
            >
              ×
            </button>

            <h2 className="text-2xl mb-4 font-livvic">Create new event</h2>

            <div className="space-y-3">
              <input
                className="w-full p-2 border rounded"
                placeholder="Event name"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              />
              <input
                className="w-full p-2 border rounded"
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                value={newEvent.dateFrom}
                onChange={(e) => setNewEvent({ ...newEvent, dateFrom: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                value={newEvent.dateTo}
                onChange={(e) => setNewEvent({ ...newEvent, dateTo: e.target.value })}
              />
              <select
                className="w-full p-2 border rounded"
                value={newEvent.style}
                onChange={(e) => setNewEvent({ ...newEvent, style: e.target.value as Style })}
              >
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Athletic">Athletic</option>
                <option value="Party">Party</option>
                <option value="Business">Business</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded-full border border-black"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-full bg-[#3F978F] text-white"
                onClick={handleCreateEvent}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button
              className="absolute top-4 right-4 text-xl"
              onClick={() => setShowEventModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">
              {isEditing ? (
                <input
                  className="w-full p-2 border rounded"
                  value={editEventData.name}
                  onChange={e => setEditEventData({...editEventData, name: e.target.value})}
                />
              ) : (
                selectedEvent.name
              )}
            </h2>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={editEventData.location}
                    onChange={e => setEditEventData({...editEventData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full p-2 border rounded"
                    value={editEventData.dateFrom}
                    onChange={e => setEditEventData({...editEventData, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input
                    type="datetime-local"
                    className="w-full p-2 border rounded"
                    value={editEventData.dateTo}
                    onChange={e => setEditEventData({...editEventData, dateTo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Style</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={editEventData.style}
                    onChange={e => setEditEventData({...editEventData, style: e.target.value as Style})}
                  >
                    <option value="Casual">Casual</option>
                    <option value="Formal">Formal</option>
                    <option value="Athletic">Athletic</option>
                    <option value="Party">Party</option>
                    <option value="Business">Business</option>
                    <option value="Outdoor">Outdoor</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="font-medium">When:</span>{' '}
                  {formatDate(parseISO(selectedEvent.dateFrom), { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })} -{' '}
                  {formatDate(parseISO(selectedEvent.dateTo), { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
                {selectedEvent.location && (
                  <div>
                    <span className="font-medium">Where:</span> {selectedEvent.location}
                  </div>
                )}
                {selectedEvent.style && (
                  <div>
                    <span className="font-medium">Style:</span> {selectedEvent.style}
                  </div>
                )}
                {selectedEvent.weather && (
                  <div className="mt-2">
                    <span className="font-medium">Weather:</span>
                    <div className="text-sm text-gray-600">
                      {JSON.parse(selectedEvent.weather)[0]?.summary?.mainCondition} -{' '}
                      {Math.round(JSON.parse(selectedEvent.weather)[0]?.summary?.avgTemp)}°C
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateEvent}
                    className="px-4 py-2 rounded bg-[#3F978F] text-white"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded bg-[#3F978F] text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 rounded bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}