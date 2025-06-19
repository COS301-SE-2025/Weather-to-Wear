import React, { useState, useEffect, useRef } from "react";

interface UserPreference {
  style: "Formal" | "Casual" | "Athletic" | "Party" | "Business" | "Outdoor";
  preferredColours: { min: number; max: number }[];
  learningWeight?: number | null;
}

const Appearance = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [style, setStyle] = useState<UserPreference["style"]>("Casual");
  const [colourRanges, setColourRanges] = useState<{ min: number; max: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Fetching preferences with token:", token);
        const response = await fetch("/api/preferences", {
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
        setColourRanges(
          data.preferredColours.map(range => ({
            min: Math.round((range.min / 255) * 360),
            max: Math.round((range.max / 255) * 360),
          }))
        );
      } catch (err: any) {
        setError(err.message || "Could not load preferences. Please try again.");
      }
    };
    fetchPreferences();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const segments = 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 360; i += 360 / segments) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        (i * Math.PI) / 180,
        ((i + 360 / segments) * Math.PI) / 180
      );
      ctx.fillStyle = `hsl(${i}, 70%, 50%)`;
      ctx.fill();
      ctx.strokeStyle = theme === "dark" ? "#fff" : "#000";
      ctx.stroke();
    }

    colourRanges.forEach(range => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        (range.min * Math.PI) / 180,
        (range.max * Math.PI) / 180
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 4;
      ctx.stroke();
    });
  }, [colourRanges, theme]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const segment = Math.floor(angle / 30) * 30;
    const newRange = { min: segment, max: segment + 30 };

    if (
      colourRanges.some(
        r => r.min < newRange.max && r.max > newRange.min
      )
    ) {
      setError("Selected range overlaps with existing range.");
      return;
    }

    setColourRanges([...colourRanges, newRange]);
    setError(null);
  };

  const removeColourRange = (index: number) => {
    setColourRanges(colourRanges.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (colourRanges.length === 0) {
      setError("Please select at least one color range.");
      return;
    }
    for (const range of colourRanges) {
      if (range.min > range.max || range.min < 0 || range.max > 360) {
        setError("Invalid color range.");
        return;
      }
    }

    const normalizedRanges = colourRanges.map(range => ({
      min: Math.round((range.min / 360) * 255),
      max: Math.round((range.max / 360) * 255),
    }));

    const updatedPrefs: UserPreference = {
      style,
      preferredColours: normalizedRanges,
      learningWeight: preferences?.learningWeight || null,
    };

    try {
      const token = localStorage.getItem("token");
      console.log("Sending PUT to /api/preferences with:", updatedPrefs, "Token:", token);
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPrefs),
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Error response:", data);
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

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">User Preferences</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Customize your style and color preferences:
        </p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Preferred Colors
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Click the color wheel to select hue ranges (30-degree segments).
            </p>
            <canvas
              ref={canvasRef}
              width="300"
              height="300"
              className="mx-auto cursor-pointer"
              onClick={handleCanvasClick}
            />
            <div className="mt-4 space-y-2">
              {colourRanges.map((range, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4"
                >
                  <div
                    className="h-6 w-24 rounded"
                    style={{
                      background: `linear-gradient(to right, hsl(${range.min}, 70%, 50%), hsl(${range.max}, 70%, 50%))`,
                    }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Hue {range.min}°–{range.max}°
                  </span>
                  <button
                    type="button"
                    onClick={() => removeColourRange(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition"
          >
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
};

export default Appearance;