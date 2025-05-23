# Weather API Documentation 

This document outlines the weather system for the **Weather-to-Wear** backend.

This subsystem implements the ability for users to retrieve real-time weather information based on their current location. The system first attempts to automatically detect the user's location via IP-based geolocation. If that fails, it supports manual location input. It uses a two-tier weather service system: the primary API is WeatherAPI.com, and the fallback is OpenWeatherMap.

---

## Features 

- Automatically fetch the user's location based on IP.
- If automatic location detection fails, allow the user to provide a location manually.
- Use Free Weather API to retrieve weather for the given location.
- If the Free Weather API fails, fallback to OpenWeatherMap API.
- Return structured weather data (location, temperature, condition, icon, source).
- Log and handle errors gracefully.

---

## File Structure

src/modules/weather/
  ├── weather.controller.ts
  ├── weather.routes.ts
  ├── weather.service.ts
  └── weather.interface.ts

---

## Interface 

```ts
export interface WeatherData {
  location: string;
  temperature: number; // Celsius
  description: string;
  icon?: string;
  source: 'FreeWeatherAPI' | 'OpenWeatherMap';
}
```

---

## Location Detection

Performed via http://ip-api.com/json
Extracts city from the returned JSON
If this fails, the service will prompt for manual location

---

## Weather API 

1. Free Weather API (Primary)
- URL: https://api.weatherapi.com/v1/current.json
- Params: key, q=<location>
- Returns:
    - location.name
    - current.temp_c
    - current.condition.text
    - current.condition.icon
2. OpenWeatherMap (Fallback)
- URL: https://api.openweathermap.org/data/2.5/weather
- Params: appid, q=<location>, units=metric
- Returns:
    - name
    - main.temp
    - weather[0].description
    - weather[0].icon
3. Error Handling and Fallback
If FreeWeatherAPI fails:
- The system logs the error using winston
- Then retries using OpenWeatherMap
- If both fail, an error is returned to the user

---

## Route Definition 

`GET /api/weather`

| Query Param | Required | Description                           |
| ----------- | -------- | ------------------------------------- |
| location    | Optional | City name (used if auto-detect fails) |

Examples:
- `/api/weather` → auto-detect IP
- `/api/weather?location=Cape Town` → manual override

---

## Environment Variables 

```env
FREE_WEATHER_API_KEY=...
FREE_WEATHER_API_URL=https://api.weatherapi.com/v1/current.json

OPENWEATHER_API_KEY=...
OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather
```

---

## Tests 

- Mocks API calls using Jest
- Scenarios covered:
    - Successful weather fetch from Free Weather API
    - Fallback to OpenWeatherMap
    - Failure of both services
- To run the tests, cd into `app-backend` and run:
```bash
npm test
```

---

## CI/CD Integration 

- .github/workflows/ci.yml sets dummy API keys for testing
- PostgreSQL service is used for complete environment bootstrapping
- Weather service runs tests in isolation (external APIs are mocked)

---

## Example of JSON response

```json
{
  "location": "Cape Town",
  "temperature": 24,
  "description": "Sunny",
  "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
  "source": "FreeWeatherAPI"
}
```

---

## Future Improvements

- Geolocation by GPS (for mobile)
- More accurate location detection rather than just 
- Cache weather responses in Redis
- Automated calls 
- User preference for temperature units