# Weather-to-Wear: Outfit Recommendation Subsystem

## **Overview**

The Outfit Recommendation Engine is a core backend subsystem of Weather-to-Wear. It generates smart, personalized outfit suggestions for users, taking into account the user’s virtual closet, current weather forecast, and their style and color preferences.

This subsystem is responsible for producing 3–5 high-quality outfit recommendations that are suitable for the predicted weather, do not clash in style or color, and reflect the user’s personal taste. These recommendations are generated in real-time and are **not** saved to the database unless a user explicitly chooses and rates an outfit.

---

## **How it Works**

1. **User makes a request** for outfit recommendations (via the app, usually each morning).
2. The backend retrieves the user’s closet items and preferences, along with the latest weather forecast for their location.
3. The rule-based engine:

   * Filters and partitions closet items by layer and style.
   * Assembles valid outfit combinations with appropriate layers (e.g., base, mid, outerwear, footwear).
   * Checks for style consistency (no mixing of Formal and Casual, for example).
   * Evaluates color harmony between items and compares them with the user’s preferred colors.
   * Prioritizes waterproof items if rain is forecast.
   * Scores and ranks outfits based on weather suitability, style, and color preferences.
4. The top recommendations are returned to the user, who can accept, rate, or regenerate suggestions.

---

## **API Endpoint**

### **POST** `/api/outfits/recommend`

#### **Description**

Generates 3–5 recommended outfits for the authenticated user, based on their closet, the provided weather summary, and (optionally) their preferred style or a future event.

#### **Authentication**

Requires a valid JWT token (`Authorization: Bearer <token>`).

#### **Request Body**

```json
{
  "weatherSummary": {
    "avgTemp": 15.6,
    "minTemp": 10,
    "maxTemp": 22,
    "willRain": false,
    "mainCondition": "clear"
  },
  "style": "Casual",     // optional; will use user preference if omitted
  "eventId": "..."       // optional; for recommending for a specific event
}
```

#### **Response**

Returns an array of up to 5 recommended outfits, each with scoring and weather info:

```json
[
  {
    "outfitItems": [
      { "closetItemId": "item1", "layerCategory": "base_top", "category": "TSHIRT", "colorHex": "#222222", "style": "Casual" },
      { "closetItemId": "item2", "layerCategory": "base_bottom", "category": "JEANS", "colorHex": "#224488", "style": "Casual" },
      { "closetItemId": "item3", "layerCategory": "footwear", "category": "SHOES", "colorHex": "#333333", "style": "Casual" }
    ],
    "overallStyle": "Casual",
    "score": 9.3,
    "warmthRating": 7,
    "waterproof": false,
    "weatherSummary": { "avgTemp": 15.6, "minTemp": 10, "maxTemp": 22, "willRain": false, "mainCondition": "clear" }
  }
  // ...up to 5 total
]
```

#### **How Recommendations are Generated**

* **Layering:** Each outfit includes essential layers (base top/bottom, footwear) and adds mid/outer layers if the weather is cold or rainy.
* **Style Consistency:** Only items with the same style as the chosen (or default) style are combined in a single outfit.
* **Color Harmony:** Colors within an outfit are chosen to minimize clashing and to reflect the user's preferred colors, which are stored as a `Json` array of color hex strings.
* **Weather Suitability:** Outfits are matched to weather conditions, including temperature and precipitation.
* **Scoring:** Each outfit is scored based on fit to user preferences, style, color harmony, weather match, and other factors. The top 3–5 unique combinations are returned.

---

## **Key Data Structures**

* **`preferredColours` (UserPreference):**

  * Stored as a `Json` array of color hex codes (e.g., `["#FFAABB", "#0099FF"]`).
  * Chosen via a color picker in the frontend and sent as an array to the backend.
* **`colorHex` (ClosetItem):**

  * Stored as a string (single color hex, e.g., `"#FF5733"`).
  * Represents the main color of each closet item.

---

## **Example Use Case**

1. User logs in and requests outfit recommendations.
2. Backend calls `/api/outfits/recommend` with the current day’s weather summary.
3. User sees up to five tailored outfit suggestions, each scored and detailed, and can pick, rate, or regenerate suggestions.

---

## **Future Improvements**

* Smarter variety and diversity logic.
* Integration of accessories and more advanced color theory.
* Adaptive learning from past user ratings.

---
