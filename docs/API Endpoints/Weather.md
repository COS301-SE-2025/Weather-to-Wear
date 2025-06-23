# Weather Service API Documentation

The Weather Service provides weather forecasts for a given location (or automatically detected location if no location given) and optionally for a specific day, suitable for both general use and event planning.

---

## **Endpoints**

### 1. **Current 24-hour Forecast**

**`GET /api/weather`**

#### **Query Parameters:**

* `location` (optional, `string`):
  Name of the city or location.

  * If omitted, the user’s IP address will be used to determine location.

#### **Response:**

```json
{
  "location": "Johannesburg",
  "forecast": [
    {
      "time": "2025-06-23 00:00",
      "temperature": 10.1,
      "description": "Clear ",
      "icon": "//cdn.weatherapi.com/weather/64x64/night/113.png"
    },
    // and the rest of the 23 hour forecast
  ],
  "source": "FreeWeatherAPI",
  "summary": {
    "avgTemp": 13.3,
    "minTemp": 9,
    "maxTemp": 18.2,
    "willRain": false,
    "mainCondition": "clear "
  }
}
```

#### **Errors:**

* `500`: Unable to fetch weather data.

---

### 2. **24-hour Forecast for a Specific Date**

**`GET /api/weather/day`**

#### **Query Parameters:**

* `location` (required, `string`):
  Name of the city or location.
* `date` (required, `string`, format: `YYYY-MM-DD`):
  The date for which to retrieve the forecast.

  * The date must be within the forecast range supported by the provider (typically up to 3 days for FreeWeatherAPI and 5 days for OpenWeatherMap).

#### **Response:**

```json
{
  "location": "Cape Town",
  "forecast": [
    {
      "time": "2025-06-24 00:00",
      "temperature": 12.3,
      "description": "Rain showers",
      "icon": "//cdn.weatherapi.com/weather/64x64/night/176.png"
    },
    // and the rest of the 23 hour forecast
  ],
  "source": "FreeWeatherAPI",
  "summary": {
    "avgTemp": 15.7,
    "minTemp": 12.3,
    "maxTemp": 18.8,
    "willRain": true,
    "mainCondition": "rain showers"
  }
}
```

#### **Errors:**

* `400`: Location and date are required.
* `404`: Forecast is unavailable for the requested date (e.g., too far in the future).
* `500`: Unable to fetch weather data for day.

---

## **Usage Examples**

* **Get today’s forecast for user’s location:**
  `GET /api/weather`

* **Get today’s forecast for Cape Town:**
  `GET /api/weather?location=Cape Town`

* **Get 24 June 2025 forecast for Cape Town:**
  `GET /api/weather/day?location=Cape Town&date=2025-06-24`

---

## **Notes**

* The forecast always contains up to 24 hourly entries (as available).
* For a date too far in the future, you’ll receive a 404 error.
* For OpenWeatherMap, hourly data is interpolated from 3-hour data.
* The `summary` object is provided for convenience to help with quick decisions and recommendations.
* For multi-day events, call `/api/weather/day` multiple times—once for each date.

