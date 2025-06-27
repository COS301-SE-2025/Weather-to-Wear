import React, { useState, useEffect } from "react";

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

const Appearance = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [style, setStyle] = useState<UserPreference["style"]>("Casual");
  const [preferredColours, setPreferredColours] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentColor, setCurrentColor] = useState<string>("");

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Please log in to access preferences.");
        }
        const response = await fetch("http://localhost:5001/api/preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    if (preferredColours.includes(hex)) {
      setError("Color already selected.");
      return;
    }
    if (preferredColours.length >= 5) {
      setError("Maximum 5 colors allowed.");
      return;
    }
    setPreferredColours([...preferredColours, hex]);
    setCurrentColor("");
    setError(null);
  };

  const removeColor = (hex: string) => {
    setPreferredColours(preferredColours.filter((c) => c !== hex));
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
      if (!token) {
        throw new Error("Please log in to save preferences.");
      }
      const response = await fetch("http://localhost:5001/api/preferences", {
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
      setSuccess("Preferences updated successfully!");
      setPreferences(updatedPrefs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update preferences.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Appearance</h1>
      <p className="text-gray-600 dark:text-gray-300">Choose your preferred theme:</p>
      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => setTheme("light")}
          className={`p-6 border rounded-lg text-center transition ${theme === "light"
              ? "border-teal-500 bg-teal-50"
              : "hover:border-gray-400 dark:hover:border-gray-600"
            }`}
          aria-label="Switch to light mode"
        >
          <div className="h-24 mb-3 bg-gray-200 rounded" />
          <span className="block font-medium">Light Mode</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`p-6 border rounded-lg text-center transition ${theme === "dark"
              ? "border-teal-500 bg-gray-800"
              : "hover:border-gray-400 dark:hover:border-gray-600"
            }`}
          aria-label="Switch to dark mode"
        >
          <div className="h-24 mb-3 bg-gray-900 rounded" />
          <span className="block font-medium text-white">Dark Mode</span>
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">User Preferences</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Customize your style and color preferences:
        </p>
        {isLoading && <div className="text-center">Loading...</div>}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="style"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Preferred Style:
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
              disabled={isLoading}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Preferred Colors:
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Select up to 5 colors from the palette below.
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition ${preferredColours.includes(hex)
                      ? "border-teal-500 scale-110 shadow-lg"
                      : "border-gray-300 hover:border-teal-400"
                    }`}
                  style={{ backgroundColor: hex }}
                  onClick={() => addColor(hex)}
                  disabled={isLoading}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {preferredColours.map((hex, index) => {
                const color = COLOR_PALETTE.find((c) => c.hex === hex);
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {color?.label || hex}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeColor(hex)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isLoading}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition ${isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {isLoading ? "Saving..." : "Save Preferences"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Appearance;