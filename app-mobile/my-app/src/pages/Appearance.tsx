import React, { useState, useEffect } from "react";
import { API_BASE } from '../config';
import Toast from '../components/Toast';

interface UserPreference {
  style: "Formal" | "Casual" | "Athletic" | "Party" | "Business" | "Outdoor";
  preferredColours: string[];
  learningWeight?: number | null;
}

const COLOR_PALETTE = [
  { hex: "#E53935", label: "Red" },
  { hex: "#8E24AA", label: "Purple" },
  { hex: "#3949AB", label: "Blue" },
  { hex: "#00897B", label: "Teal" },
  { hex: "#43A047", label: "Green" },
  { hex: "#FDD835", label: "Yellow" },
  { hex: "#F4511E", label: "Orange" },
  { hex: "#6D4C41", label: "Brown" },
  { hex: "#757575", label: "Grey" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#000000", label: "Black" },
  { hex: "#FFFDD0", label: "Cream" },
];

const Appearance: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [style, setStyle] = useState<UserPreference["style"]>("Casual");
  const [preferredColours, setPreferredColours] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showToast, setShowToast] = useState(false);

  // apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // fetch saved prefs
  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in to access preferences.");

        const response = await fetch(`${API_BASE}/api/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to fetch preferences");
        }

        const data: UserPreference = await response.json();
        setPreferences(data);
        setStyle(data.style);
        setPreferredColours(data.preferredColours || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load preferences.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const addColor = (hex: string) => {
    setError(null);
    if (preferredColours.includes(hex)) {
      setError("Color already selected.");
      return;
    }
    if (preferredColours.length >= 5) {
      setError("Maximum 5 colors allowed.");
      return;
    }
    setPreferredColours((s) => [...s, hex]);
  };

  const removeColor = (hex: string) => {
    setPreferredColours((s) => s.filter((c) => c !== hex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (preferredColours.length === 0) {
      setError("Please select at least one color.");
      setIsLoading(false);
      return;
    }

    const updatedPrefs: UserPreference = {
      style,
      preferredColours,
      learningWeight: preferences?.learningWeight || null,
    };

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in to save preferences.");

      const response = await fetch(`${API_BASE}/api/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPrefs),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update preferences");
      }

      setPreferences(updatedPrefs);
      // setSuccess("Preferences updated successfully!");
      setShowToast(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update preferences.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 -mt-16">
      {/* Page header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:pt-10">

        {/* Preferences card */}
        <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-24">
          <h2 className="text-lg sm:text-xl font-livvic mb-1">Style Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Customize your style and color preferences:
          </p>

          {isLoading && <div className="text-sm text-gray-500">Loading…</div>}
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Style select */}
            <div>
              <label
                htmlFor="style"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
              >
                Preferred Style
              </label>
              <div className="relative">
                <select
                  id="style"
                  value={style}
                  onChange={(e) =>
                    setStyle(
                      e.target.value as
                      | "Formal"
                      | "Casual"
                      | "Athletic"
                      | "Party"
                      | "Business"
                      | "Outdoor"
                    )
                  }
                  disabled={isLoading}
                  className="block w-full rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                >
                  <option value="Formal">Formal</option>
                  <option value="Casual">Casual</option>
                  <option value="Athletic">Athletic</option>
                  <option value="Party">Party</option>
                  <option value="Business">Business</option>
                  <option value="Outdoor">Outdoor</option>
                </select>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Preferred Colors
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Select up to 5 colors from the palette.
              </p>

              {/* Palette */}
              <div className="grid grid-cols-8 xs:grid-cols-10 sm:grid-cols-12 md:grid-cols-12 gap-2">
                {COLOR_PALETTE.map(({ hex, label }) => {
                  const selected = preferredColours.includes(hex);
                  const isWhite = hex.toLowerCase() === "#ffffff";
                  return (
                    <button
                      type="button"
                      key={hex}
                      title={label}
                      onClick={() => addColor(hex)}
                      disabled={isLoading}
                      className={`relative w-8 h-8 rounded-full border-2 transition
                        ${selected ? "border-[#3F978F] ring-2 ring-[#3F978F]/30" : "border-gray-300 hover:border-[#3F978F]"}
                        ${isWhite ? "bg-white" : ""}`}
                      style={{ backgroundColor: isWhite ? undefined : hex }}
                    >
                      {/* check dot when selected */}
                      {selected && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#3F978F]" />
                      )}
                      {/* white tile needs inner ring to be visible */}
                      {isWhite && !selected && (
                        <span className="absolute inset-0 rounded-full ring-1 ring-gray-200" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected list as chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {preferredColours.map((hex) => {
                  const label = COLOR_PALETTE.find((c) => c.hex === hex)?.label || hex;
                  const isDark = ["#000000", "#3949AB", "#6D4C41", "#757575", "#00897B", "#43A047"].includes(hex);
                  return (
                    <span
                      key={hex}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
                      style={{ backgroundColor: hex }}
                    >
                      <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeColor(hex)}
                        disabled={isLoading}
                        className={`text-xs rounded-full px-2 py-0.5 border transition
                          ${isDark
                            ? "text-white border-white/60 hover:bg-white/10"
                            : "text-gray-700 border-gray-700/40 hover:bg-black/5"}`}
                        aria-label={`Remove ${label}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {preferredColours.length === 0 && (
                  <span className="text-xs text-gray-500">No colors selected.</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 rounded-full font-livvic transition
                  ${isLoading
                    ? "bg-[#3F978F]/60 cursor-not-allowed text-white"
                    : "bg-[#3F978F] hover:bg-[#2F6F6A] text-white"}`}
              >
                {isLoading ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        </div>

        {/* Theme card */}
        <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 -mt-20 md:-mt-12 mb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-livvic">Theme</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3F978F]/10 text-[#2F6F6A]">
              preview
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">Choose your preferred theme:</p>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4">
            {/* Light */}
            <button
              onClick={() => setTheme("light")}
              aria-label="Switch to light mode"
              className={`group relative p-4 sm:p-5 rounded-2xl border transition
                ${theme === "light"
                  ? "border-[#3F978F] ring-2 ring-[#3F978F]/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              <div className="h-20 sm:h-24 rounded-xl bg-gray-100 border border-gray-200" />
              <div className="mt-3 text-center font-medium">Light Mode</div>
              {theme === "light" && (
                <span className="absolute -top-2 -right-2 text-xs bg-[#3F978F] text-white rounded-full px-2 py-0.5">
                  Selected
                </span>
              )}
            </button>

            {/* Dark */}
            <button
              onClick={() => setTheme("dark")}
              aria-label="Switch to dark mode"
              className={`group relative p-4 sm:p-5 rounded-2xl border transition
                ${theme === "dark"
                  ? "border-[#3F978F] ring-2 ring-[#3F978F]/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              <div className="h-20 sm:h-24 rounded-xl bg-gray-900 border border-gray-700" />
              <div className="mt-3 text-center font-medium">Dark Mode</div>
              {theme === "dark" && (
                <span className="absolute -top-2 -right-2 text-xs bg-[#3F978F] text-white rounded-full px-2 py-0.5">
                  Selected
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
      {showToast && <Toast message="Preferences updated successfully!" />}
    </div>
  );
};

export default Appearance;
