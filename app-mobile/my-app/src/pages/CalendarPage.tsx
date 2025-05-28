// src/pages/CalendarPage.tsx

import React, { useState, useMemo } from "react";
import NavBar from "../components/NavBar";
import {
  Sun,
  Cloud,
  CloudRain,
  Wind,
  ArrowLeft,
  ArrowRight,
  Plus,
} from "lucide-react";

type ViewMode = "daily" | "weekly" | "monthly";

interface EventItem {
  id: number;
  title: string;
  date: string; // "YYYY-MM-DD"
  weather: "sunny" | "cloudy" | "rainy";
  itinerary: string[];
  moodTags: string[];
  friendNote: string;
  outfitImages: string[];
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [events] = useState<EventItem[]>([
    {
      id: 1,
      title: "Kyle's Birthday",
      date: todayKey,
      weather: "sunny",
      itinerary: ["University", "Movie Night"],
      moodTags: ["#feelingFrisky", "#warm", "#scottyTooHottyToddy"],
      friendNote: "Johnny shares today’s event!",
      outfitImages: ["/outfit1.jpg", "/outfit2.jpg", "/outfit3.jpg"],
    },
    // …more events…
  ]);

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [ootdIndex, setOotdIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const selectedEvent =
    events.find((e) => e.date === selectedDate) || events[0];

  const weekDates = useMemo(() => {
    const wd = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((wd + 6) % 7));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [today]);

  const year = today.getFullYear();
  const month = today.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEvents = events.filter((e) => {
    const [y, m] = e.date.split("-").map(Number);
    return y === year && m - 1 === month;
  });

  const iconFor = (w: EventItem["weather"]) => {
    if (w === "sunny") return <Sun className="w-6 h-6 text-yellow-500" />;
    if (w === "cloudy") return <Cloud className="w-6 h-6 text-gray-400" />;
    return <CloudRain className="w-6 h-6 text-blue-400" />;
  };

  return (
    <>
      <NavBar />

      <div className="bg-[#F8F9FA] dark:bg-gray-800 min-h-screen pt-32 px-4">
        <div className="max-w-screen-xl mx-auto">

          {/* View Mode Tabs */}
          <div className="flex justify-center space-x-2 mb-6">
            {(["monthly", "weekly", "daily"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setViewMode(m);
                  if (m === "daily") setSelectedDate(todayKey);
                }}
                className={`px-4 py-2 rounded-full transition ${
                  viewMode === m
                    ? "bg-[#3F978F] text-white"
                    : "bg-white dark:bg-gray-700 text-black dark:text-gray-100 hover:bg-[#3F978F] hover:text-white"
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* DAILY VIEW */}
          {viewMode === "daily" && (
            <>
              <div className="text-center bg-gray-200 dark:bg-gray-700 text-black dark:text-gray-100 py-2 rounded-lg mb-6">
                {today.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4 flex flex-col items-center w-full md:w-1/3">
                  {iconFor(selectedEvent.weather)}
                  <div className="mt-2 text-2xl">
                    {Math.floor(Math.random() * 15) + 18}°{" "}
                    {selectedEvent.weather.charAt(0).toUpperCase() +
                      selectedEvent.weather.slice(1)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4 w-full md:w-1/2">
                  <h3 className="font-semibold mb-2">Today's Itinerary</h3>
                  <ul className="list-disc list-inside">
                    {selectedEvent.itinerary.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-4 text-black dark:text-gray-100">OOTD</h2>
              <div className="relative bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow h-64 mb-6 overflow-hidden">
                <button
                  onClick={() =>
                    setOotdIndex((i) =>
                      i === 0
                        ? selectedEvent.outfitImages.length - 1
                        : i - 1
                    )
                  }
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-200 dark:bg-gray-600 p-2 rounded-full"
                >
                  <ArrowLeft />
                </button>
                <img
                  src={selectedEvent.outfitImages[ootdIndex]}
                  alt="ootd"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() =>
                    setOotdIndex((i) =>
                      i === selectedEvent.outfitImages.length - 1
                        ? 0
                        : i + 1
                    )
                  }
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 dark:bg-gray-600 p-2 rounded-full"
                >
                  <ArrowRight />
                </button>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {selectedEvent.outfitImages.map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === ootdIndex
                          ? "bg-gray-800 dark:bg-gray-200"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 mb-12">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 text-black dark:text-gray-100">Mood Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.moodTags.map((t, i) => (
                      <span
                        key={i}
                        className="text-sm text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4 w-full md:w-1/3">
                  <h3 className="font-semibold mb-2">Friends</h3>
                  <p className="text-sm">{selectedEvent.friendNote}</p>
                </div>
              </div>
            </>
          )}

          {/* WEEKLY VIEW */}
          {viewMode === "weekly" && (
            <>
              <div className="flex items-center gap-2 mb-6 overflow-x-auto">
                {weekDates.map((d) => {
                  const key = d.toISOString().slice(0, 10);
                  const sel = key === selectedDate;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`min-w-[3rem] px-3 py-2 rounded-lg transition ${
                        sel
                          ? "bg-[#3F978F] text-white"
                          : "bg-white dark:bg-gray-700 text-black dark:text-gray-100 hover:bg-[#3F978F] hover:text-white"
                      }`}
                    >
                      <div className="text-xs">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="font-semibold">{d.getDate()}</div>
                    </button>
                  );
                })}
                <button className="ml-auto p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                  <Plus />
                </button>
              </div>
              <div className="flex flex-col lg:flex-row gap-6 mb-12">
                <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4 flex-1">
                  <h3 className="font-semibold mb-2">OOTD</h3>
                  <img
                    src={selectedEvent.outfitImages[0]}
                    alt=""
                    className="w-full h-52 object-cover rounded"
                  />
                </div>
                <div className="flex flex-col gap-6 w-full lg:w-1/3">
                  <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-2">Weather</h3>
                    <div className="flex items-center gap-2">
                      <Wind className="w-6 h-6 text-blue-400" />
                      <span className="text-2xl">
                        {Math.floor(Math.random() * 15) + 18}°C
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-2">Mood Tags</h3>
                    <ul className="list-disc list-inside text-sm">
                      {selectedEvent.moodTags.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-2">Friends</h3>
                    <p className="text-sm">{selectedEvent.friendNote}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* MONTHLY VIEW */}
          {viewMode === "monthly" && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="overflow-x-auto flex-1">
                <div className="min-w-[700px] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-7 text-center text-xs font-medium mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div
                          key={d}
                          className="py-2 bg-gray-200 dark:bg-gray-600 border-b border-gray-300 dark:border-gray-500"
                        >
                          {d}
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstWeekday }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const day = idx + 1;
                      const iso = `${year}-${String(month + 1).padStart(
                        2,
                        "0"
                      )}-${String(day).padStart(2, "0")}`;
                      const onDay = monthEvents.filter((e) => e.date === iso);
                      return (
                        <div
                          key={iso}
                          className="relative h-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded"
                        >
                          {onDay.length > 0 && (
                            <div className="absolute inset-1 border border-gray-300 dark:border-gray-600 rounded p-1 flex flex-col items-center justify-center text-xs">
                              <div className="font-medium leading-none text-black dark:text-gray-100">
                                {onDay[0].title}
                              </div>
                              <div className="flex items-center mt-1 space-x-1">
                                {iconFor(onDay[0].weather)}
                                <img
                                  src={onDay[0].outfitImages[0]}
                                  alt=""
                                  className="w-5 h-5 object-cover rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="w-full lg:w-80 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold mb-4 text-black dark:text-gray-100">
                  Event List
                </h3>
                {events
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((e) => {
                    const d = new Date(e.date);
                    const dayNum = d.getDate();
                    const weekday = d.toLocaleDateString("en-US", {
                      weekday: "short",
                    });
                    return (
                      <div key={e.id} className="mb-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {weekday}
                        </div>
                        <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                          <div className="w-16 h-16 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-sm">
                            <div className="font-semibold text-black dark:text-gray-100">
                              {dayNum}
                            </div>
                            <div className="text-xs text-black dark:text-gray-100">
                              {weekday.toUpperCase()}
                            </div>
                          </div>
                          <div className="p-2 flex-1 flex flex-col justify-center text-xs text-black dark:text-gray-100">
                            <div className="font-medium">{e.title}</div>
                            <div className="flex items-center mt-1 space-x-1">
                              {iconFor(e.weather)}
                              <img
                                src={e.outfitImages[0]}
                                alt=""
                                className="w-5 h-5 object-cover rounded"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
