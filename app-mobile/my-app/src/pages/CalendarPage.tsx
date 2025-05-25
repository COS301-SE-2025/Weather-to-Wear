// src/pages/CalendarPage.tsx

import React, { useState } from "react";

type ViewMode = "daily" | "weekly" | "monthly";

interface EventItem {
  id: number;
  title: string;
  date: string;      // ISO yyyy-MM-dd
  weather: string;   // e.g. "sunny", "rainy", "cloudy"
  outfit: string;    // URL to suggestion image
}

export default function CalendarPage() {
  // mock initial events
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 1,
      title: "Kyle's Birthday",
      date: "2025-12-30",
      weather: "sunny",
      outfit: "/outfit.jpg",
    },
    {
      id: 2,
      title: "Diya's Birthday",
      date: "2025-11-04",
      weather: "cloudy",
      outfit: "/outfit.jpg",
    },
    {
      id: 3,
      title: "21st Birthday",
      date: "2025-05-21",
      weather: "rainy",
      outfit: "/outfit.jpg",
    },
  ]);

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // helper to generate mock weather/outfit for new events
  const mockWeather = (date: string) => {
    const day = new Date(date).getDate();
    const types = ["sunny", "cloudy", "rainy"];
    return types[day % types.length];
  };

  const addEvent = () => {
    if (!newDate || !newTitle.trim()) return;
    const weather = mockWeather(newDate);
    setEvents((e) => [
      ...e,
      {
        id: e.length + 1,
        title: newTitle.trim(),
        date: newDate,
        weather,
        outfit: "/outfit.jpg",
      },
    ]);
    setNewDate("");
    setNewTitle("");
  };

  // filters for each view
  const today = new Date().toISOString().slice(0, 10);
  const dailyEvents = events.filter((e) => e.date === today);
  const weeklyEvents = events.filter((e) => {
    const d = new Date(e.date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 7;
  });

  // monthly grid data
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEvents = events.filter((e) => {
    const [y, m] = e.date.split("-").map(Number);
    return y === year && m - 1 === month;
  });

  return (
    <div className="p-8 mt-20">
      <h1 className="text-3xl font-bold text-center mb-6">Fashion Time Machine</h1>

      {/* ── Add Event Form ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 justify-center">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="border px-2 py-1"
        />
        <input
          type="text"
          placeholder="Event title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border px-2 py-1 flex-1"
        />
        <button
          onClick={addEvent}
          className="bg-black text-white px-4 py-1 rounded hover:bg-[#304946] transition-colors"
        >
          Add Event
        </button>
      </div>

      {/* ── View Mode Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 justify-center mb-8">
        {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-1 rounded transition-colors ${
              viewMode === mode
                ? "bg-[#3F978F] text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Daily View ─────────────────────────────────────────────── */}
      {viewMode === "daily" && (
        <div className="space-y-4 max-w-xl mx-auto">
          {dailyEvents.length ? (
            dailyEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-4 border p-4 rounded"
              >
                <div className="flex-1">
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-gray-600">{e.weather}</div>
                </div>
                <img
                  src={e.outfit}
                  alt="Suggested outfit"
                  className="w-20 h-20 object-cover rounded"
                />
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No events for today.</p>
          )}
        </div>
      )}

      {/* ── Weekly View ────────────────────────────────────────────── */}
      {viewMode === "weekly" && (
        <div className="space-y-6 max-w-xl mx-auto">
          {weeklyEvents.length ? (
            weeklyEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-4 border p-4 rounded"
              >
                <div className="w-24 font-semibold">{e.date}</div>
                <div className="flex-1">
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-gray-600">{e.weather}</div>
                </div>
                <img
                  src={e.outfit}
                  alt="Suggested outfit"
                  className="w-16 h-16 object-cover rounded"
                />
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No events this week.</p>
          )}
        </div>
      )}

      {/* ── Monthly View ───────────────────────────────────────────── */}
      {viewMode === "monthly" && (
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array(firstDayOfWeek)
              .fill(null)
              .map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${
                String(month + 1).padStart(2, "0")
              }-${String(day).padStart(2, "0")}`;
              const dayEvents = monthEvents.filter((e) => e.date === dateStr);
              return (
                <div
                  key={dateStr}
                  className="border p-2 rounded h-24 flex flex-col overflow-hidden"
                >
                  <div className="font-semibold">{day}</div>
                  {dayEvents.map((e) => (
                    <div key={e.id} className="mt-1 flex-1">
                      <div className="text-xs font-medium">{e.title}</div>
                      <img
                        src={e.outfit}
                        alt="Outfit suggestion"
                        className="w-full h-10 object-cover rounded mt-1"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
