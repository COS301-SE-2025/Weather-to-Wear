import React, { useState, useEffect } from "react";

interface UserPreference {
  style: "Formal" | "Casual" | "Athletic" | "Party" | "Business" | "Outdoor";
  preferredColours: { min: number; max: number }[];
  learningWeight?: number | null;
}

interface SeasonRange {
  season: string;
  ranges: { min: number; max: number }[];
}

const seasonRanges: SeasonRange[] = [
  { season: "Winter", ranges: [{ min: 170, max: 255 }] }, // Blues, purples, reds
  { season: "Spring", ranges: [{ min: 0, max: 60 }, { min: 100, max: 140 }] }, // Pinks, yellows, light greens
  { season: "Summer", ranges: [{ min: 60, max: 170 }] }, // Yellows, greens, light blues
  { season: "Autumn", ranges: [{ min: 20, max: 60 }] }, // Oranges, browns
];

// Generate palette colors for a range
const getPaletteColors = (range: { min: number; max: number }) => {
  const count = 4; // Number of swatches
  const step = (range.max - range.min) / (count - 1);
  return Array.from({ length: count }, (_, i) => range.min + i * step);
};

const Appearance = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [style, setStyle] = useState<UserPreference["style"]>("Casual");
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Fetching preferences with token:", token);
        const response = await fetch("http://localhost:3000/api/preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const text = await response.text();
          console.error("Response text:", text);
          const data = response.headers.get("content-type")?.includes("application/json")
            ? await response.json()
            : { message: "Server returned non-JSON response" };
          throw new Error(data.message || "Failed to fetch preferences");
        }
        const data: UserPreference = await response.json();
        setPreferences(data);
        setStyle(data.style);
        // Map backend ranges to seasons
        const selected = seasonRanges
          .filter(season =>
            season.ranges.some(range =>
              data.preferredColours.some(
                pref => pref.min === range.min && pref.max === range.max
              )
            )
          )
          .map(season => season.season);
        setSelectedSeasons(selected);
      } catch (err: any) {
        setError(err.message || "Could not load preferences. Please try again.");
      }
    };
    fetchPreferences();
  }, []);

  // Handle season toggle
  const toggleSeason = (season: string) => {
    setSelectedSeasons(prev =>
      prev.includes(season)
        ? prev.filter(s => s !== season)
        : [...prev, season]
    );
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedSeasons.length === 0) {
      setError("Please select at least one season.");
      return;
    }

    // Combine ranges from selected seasons
    const preferredColours = selectedSeasons
      .flatMap(season =>
        seasonRanges.find(s => s.season === season)?.ranges || []
      );

    const updatedPrefs: UserPreference = {
      style,
      preferredColours,
      learningWeight: preferences?.learningWeight || null,
    };

    try {
      const token = localStorage.getItem("token");
      console.log("Sending PUT to /api/preferences with:", updatedPrefs, "Token:", token);
      const response = await fetch("http://localhost:3000/api/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPrefs),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Response text:", text);
        const data = response.headers.get("content-type")?.includes("application/json")
          ? await response.json()
          : { message: "Server returned non-JSON response" };
        throw new Error(data.message || "Failed to update preferences");
      }
      setSuccess("Preferences updated successfully!");
      setPreferences(updatedPrefs);
    } catch (err: any) {
      setError(err.message || "Could not update preferences. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Theme Section */}
      <h1 className="text-3xl font-bold">Appearance</h1>
      <p className="text-gray-600 dark:text-gray-300">Choose your preferred theme:</p>
      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => setTheme("light")}
          className={`p-6 border rounded-lg text-center transition ${
            theme === "light"
              ? "border-teal-500 bg-teal-50"
              : "hover:border-gray-400 dark:hover:border-gray-600"
          }`}
        >
          <div className="h-24 mb-3 bg-gray-200 rounded" />
          <span className="block font-medium">Light Mode</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-6 border rounded-lg text-center transition ${
            theme === "dark"
              ? "border-teal-500 bg-gray-800"
              : "hover:border-gray-400 dark:hover:border-gray-600"
          }`}
        >
          <div className="h-24 mb-3 bg-gray-900 rounded" />
          <span className="block font-medium text-white">Dark Mode</span>
        </button>
      </div>

      {/* Preferences Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold">User Preferences</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Customize your style and color preferences:
        </p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preferred Style */}
          <div>
            <label
              htmlFor="style"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Preferred Style
            </label>
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
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="Formal">Formal</option>
              <option value="Casual">Casual</option>
              <option value="Athletic">Athletic</option>
              <option value="Party">Party</option>
              <option value="Business">Business</option>
              <option value="Outdoor">Outdoor</option>
            </select>
          </div>

          {/* Preferred Colors */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Preferred Colors
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Select one or more seasonal color palettes:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {seasonRanges.map(({ season, ranges }) => (
                <div
                  key={season}
                  className={`p-4 border rounded-lg transition cursor-pointer ${
                    selectedSeasons.includes(season)
                      ? "border-teal-500 bg-teal-50 dark:bg-gray-800"
                      : "hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
                  onClick={() => toggleSeason(season)}
                >
                  <div className="flex space-x-2 mb-2">
                    {ranges.flatMap(range =>
                      getPaletteColors(range).map((hue, i) => (
                        <div
                          key={`${season}-${range.min}-${i}`}
                          className="h-6 w-6 rounded"
                          style={{ backgroundColor: `hsl(${Math.round((hue / 255) * 360)}, 70%, 50%)` }}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season)}
                      onChange={() => toggleSeason(season)}
                      className="mr-2"
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{season}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {selectedSeasons.flatMap(season =>
                seasonRanges
                  .find(s => s.season === season)
                  ?.ranges.map((range, index) => (
                    <div key={`${season}-${index}`} className="flex items-center space-x-4">
                      <div className="flex space-x-1">
                        {getPaletteColors(range).map((hue, i) => (
                          <div
                            key={`${season}-${range.min}-${i}`}
                            className="h-6 w-6 rounded"
                            style={{ backgroundColor: `hsl(${Math.round((hue / 255) * 360)}, 70%, 50%)` }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {season}: Hue {Math.round((range.min / 255) * 360)}°–
                        {Math.round((range.max / 255) * 360)}°
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSeason(season)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
          >
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
};

export default Appearance;