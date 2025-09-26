import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  __weatherCache,
  getWeatherByLocation,
  getWeatherByDay,
  getWeatherWeek,
  groupByDay,
  summarizeWeather,
  searchCities,
} from '../../src/modules/weather/weather.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function resp<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

/* ---------- Test data builders ---------- */

function makeOMGeocode(name = 'Cape Town') {
  return resp({
    results: [
      {
        name,
        country: 'South Africa',
        admin1: 'Western Cape',
        latitude: -33.918861,
        longitude: 18.4233,
        timezone: 'Africa/Johannesburg',
      },
    ],
  });
}

function makeOMGeocodeEmpty() {
  return resp({ results: [] as any[] });
}

function makeOMHourly(hours = 6, startOffsetHours = 0, opts?: { code?: number; isDay?: number; baseTemp?: number }) {
  const now = Date.now();
  const code = opts?.code ?? 1; // 1 = mainly clear
  const isDay = opts?.isDay ?? 1; // 1 = day, 0 = night
  const baseTemp = opts?.baseTemp ?? 20;

  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weathercode: number[] = [];
  const is_day: number[] = [];
  const precipitation: number[] = [];
  const precipitation_probability: number[] = [];

  for (let i = 0; i < hours; i++) {
    const dt = new Date(now + (startOffsetHours + i) * 3600 * 1000);
    // ISO like "YYYY-MM-DDTHH:mm"
    const t = dt.toISOString().slice(0, 16);
    time.push(t);
    temperature_2m.push(baseTemp + i * 0.1);
    weathercode.push(code);
    is_day.push(isDay);
    precipitation.push(0);
    precipitation_probability.push(10);
  }

  return resp({
    hourly: {
      time,
      temperature_2m,
      weathercode,
      is_day,
      precipitation,
      precipitation_probability,
    },
  });
}

function makeFreeWeatherHours(n = 6) {
  const now = Date.now();
  return Array.from({ length: n }).map((_, i) => {
    const dt = new Date(now + i * 3600 * 1000);
    // "YYYY-MM-DD HH:00"
    const formatted = dt.toISOString().slice(0, 13).replace('T', ' ') + ':00';
    return {
      time: formatted,
      temp_c: 25,
      condition: { text: 'Sunny', icon: 'icon.png' },
    };
  });
}

function makeFreeWeatherResp(name = 'Cape Town', n = 6) {
  return resp({
    location: { name },
    forecast: {
      forecastday: [{ hour: makeFreeWeatherHours(n) }],
    },
  });
}

function makeOWMGeo(name = 'Cape Town') {
  return resp([
    { name, lat: -33.918861, lon: 18.4233 },
  ]);
}

function makeOWM3HourlyForDay(date: string) {
  const entries = [0, 3, 6, 9, 12, 15, 18, 21].map((hour) => ({
    dt: Math.floor(Date.now() / 1000) + hour * 3600,
    dt_txt: `${date} ${hour.toString().padStart(2, '0')}:00:00`,
    main: { temp: 20 + hour * 0.5 },
    weather: [{ description: 'Cloudy', icon: '03d' }],
  }));
  return resp({ list: entries, city: { name: 'Cape Town' } });
}

/* ---------- Test setup ---------- */

describe('Weather Service — Open-Meteo primary & fallbacks', () => {
  beforeEach(() => {
    __weatherCache.clear();
    jest.clearAllMocks();
    process.env.OPEN_METEO_ICON_BASE =
      'https://basmilius.github.io/weather-icons/production/fill/all';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------- getWeatherByLocation -------- */

  it('returns weather from Open-Meteo (primary) with icon + precip fields', async () => {
    // OM geocoding
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode())
      // OM forecast (hours within next 24h)
      .mockResolvedValueOnce(makeOMHourly(6, 0, { code: 0, isDay: 1, baseTemp: 19 }));

    const result = await getWeatherByLocation('Cape Town');

    expect(result.source).toBe('openMeteo');
    expect(result.location).toMatch(/Cape Town/i);
    expect(result.summary).toBeDefined();
    expect(result.forecast.length).toBeGreaterThan(0);
    expect(result.forecast[0].description).toMatch(/clear/i);
    // icon should be a full URL- backend maps 0+day = clear-day.svg
    expect(result.forecast[0].icon).toMatch(/clear-day\.svg$/);
    // precipitation fields present
    expect(result.forecast[0]).toHaveProperty('precipitationMm');
    expect(result.forecast[0]).toHaveProperty('precipitationProbability');
  });

  it('falls back to FreeWeatherAPI when Open-Meteo fails (geocoding)', async () => {
    mockedAxios.get
      // OM geocoding fails
      .mockResolvedValueOnce(makeOMGeocodeEmpty())
      // FreeWeatherAPI succeeds
      .mockResolvedValueOnce(makeFreeWeatherResp('Cape Town', 6));

    const result = await getWeatherByLocation('Cape Town');

    expect(result.source).toBe('FreeWeatherAPI');
    expect(result.location).toBe('Cape Town');
    expect(result.forecast[0].temperature).toBe(25);
  });

  it('falls back to OpenWeatherMap when Open-Meteo and FreeWeatherAPI fail', async () => {
    mockedAxios.get
      // OM geocoding fails
      .mockResolvedValueOnce(makeOMGeocodeEmpty())
      // FreeWeatherAPI fails
      .mockRejectedValueOnce(new Error('FW down'))
      // OWM geocoding
      .mockResolvedValueOnce(makeOWMGeo())
      // OWM forecast
      .mockResolvedValueOnce(
        resp({
          list: [
            {
              dt: Math.floor(Date.now() / 1000) + 3600,
              dt_txt: '2025-05-23 15:00:00',
              main: { temp: 20 },
              weather: [{ description: 'Clear sky', icon: '01d' }],
            },
          ],
          city: { name: 'Cape Town' },
        }),
      );

    const result = await getWeatherByLocation('Cape Town');

    expect(result.source).toBe('OpenWeatherMap');
    expect(result.location).toBe('Cape Town');
    expect(result.forecast[0].temperature).toBe(20);
  });

  it('throws an error if all providers fail for location', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocodeEmpty()) // OM geocode -> no results
      .mockRejectedValueOnce(new Error('FW down'))  // FW
      .mockRejectedValueOnce(new Error('OWM geo down')); // OWM geo

    await expect(getWeatherByLocation('Cape Town'))
      .rejects.toThrow(/Both weather services failed/i);
  });

  // -------- getWeatherByDay -------- 

  it('returns weather for a specific day from Open-Meteo (primary)', async () => {
    const day = '2025-06-24';

    // Build 24 entries for that date
    const times: string[] = [];
    const temps: number[] = [];
    const codes: number[] = [];
    const isDay: number[] = [];
    const precip: number[] = [];
    const precipProb: number[] = [];
    for (let h = 0; h < 24; h++) {
      const t = `${day}T${String(h).padStart(2, '0')}:00`;
      times.push(t);
      temps.push(18 + h * 0.25);
      codes.push(2); // partly cloudy
      isDay.push(h >= 6 && h <= 18 ? 1 : 0);
      precip.push(0);
      precipProb.push(20);
    }

    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode())
      .mockResolvedValueOnce(
        resp({
          hourly: {
            time: times,
            temperature_2m: temps,
            weathercode: codes,
            is_day: isDay,
            precipitation: precip,
            precipitation_probability: precipProb,
          },
        }),
      );

    const result = await getWeatherByDay('Cape Town', day);

    expect(result.source).toBe('openMeteo');
    expect(result.location).toMatch(/Cape Town/i);
    expect(result.forecast.length).toBe(24);
    expect(result.forecast[0].description).toMatch(/cloud/i);
    expect(result.summary).toBeDefined();
  });

  it('falls back to FreeWeatherAPI for a day when Open-Meteo fails', async () => {
    const day = '2025-06-24';

    mockedAxios.get
      // OM geocoding fails
      .mockResolvedValueOnce(makeOMGeocodeEmpty())
      // FW returns a matching forecast day
      .mockResolvedValueOnce(
        resp({
          location: { name: 'Cape Town' },
          forecast: {
            forecastday: [
              {
                date: day,
                hour: Array.from({ length: 24 }).map((_, i) => ({
                  time: `${day} ${String(i).padStart(2, '0')}:00`,
                  temp_c: 18 + i * 0.5,
                  condition: { text: 'Sunny', icon: 'icon.png' },
                })),
              },
            ],
          },
        }),
      );

    const result = await getWeatherByDay('Cape Town', day);

    expect(result.source).toBe('FreeWeatherAPI');
    expect(result.forecast.length).toBe(24);
    expect(result.summary).toBeDefined();
  });

  it('falls back to OpenWeatherMap for a day when Open-Meteo and FreeWeatherAPI fail', async () => {
    const day = '2025-06-25';

    mockedAxios.get
      // OM geocoding fails
      .mockResolvedValueOnce(makeOMGeocodeEmpty())
      // FreeWeatherAPI fails
      .mockRejectedValueOnce(new Error('FW day down'))
      // OWM geo
      .mockResolvedValueOnce(makeOWMGeo())
      // OWM 3-hour forecast for that day
      .mockResolvedValueOnce(makeOWM3HourlyForDay(day));

    const result = await getWeatherByDay('Cape Town', day);

    expect(result.source).toBe('OpenWeatherMap');
    expect(result.location).toBe('Cape Town');
    // interpolated to 24 hours
    expect(result.forecast.length).toBe(24);
    expect(result.forecast[0].description).toBe('Cloudy');
  });

  it('throws when all providers fail for the requested day', async () => {
    const day = '2025-06-26';
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocodeEmpty()) // OM geocode -> none
      .mockRejectedValueOnce(new Error('FW day down')) // FW day
      .mockRejectedValueOnce(new Error('OWM geo down')) // OWM geo

    await expect(getWeatherByDay('Cape Town', day))
      .rejects.toThrow(/Both weather services failed/i);
  });

  // -------- getWeatherWeek -------- 

  it('returns a 7-day (hourly) planner from Open-Meteo', async () => {
    // keep payload small provide only 30 hours
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode())
      .mockResolvedValueOnce(makeOMHourly(30, 0, { code: 1, isDay: 1, baseTemp: 21 }));

    const result = await getWeatherWeek('Cape Town');

    expect(result.source).toBe('openMeteo');
    expect(Array.isArray(result.forecast)).toBe(true);
    expect(result.forecast.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
  });

  // -------- helpers & mapping --------

  it('groupByDay groups hourly entries into dates', () => {
    const day1 = '2025-09-19';
    const day2 = '2025-09-20';
    const f = [
      { time: `${day1}T00:00`, temperature: 10, description: 'Clear' },
      { time: `${day2}T01:00`, temperature: 11, description: 'Clear' },
      { time: `${day1}T02:00`, temperature: 12, description: 'Cloudy' },
    ] as any;

    const grouped = groupByDay(f);
    expect(Object.keys(grouped).sort()).toEqual([day1, day2]);
    expect(grouped[day1].length).toBe(2);
    expect(grouped[day1][0].time <= grouped[day1][1].time).toBe(true);
  });

  it('summarizeWeather sets willRain true when precipitation signals are high even if description lacks "rain"', () => {
    const hours = [
      { time: '2025-09-19T00:00', temperature: 20, description: 'Overcast', precipitationProbability: 60 },
      { time: '2025-09-19T01:00', temperature: 20, description: 'Overcast', precipitationMm: 0.3 },
    ] as any;

    const sum = summarizeWeather(hours);
    expect(sum.willRain).toBe(true);
    expect(sum.mainCondition).toBe('overcast');
  });

  it('searchCities maps Open-Meteo geocoding results', async () => {
    mockedAxios.get.mockResolvedValueOnce(makeOMGeocode('Pretoria'));

    const matches = await searchCities('Pretoria');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toHaveProperty('name', 'Pretoria');
    expect(matches[0]).toHaveProperty('latitude');
    expect(matches[0]).toHaveProperty('longitude');
    expect(matches[0]).toHaveProperty('timezone');
  });

  it('uses correct icon mapping for night variant', async () => {
    // code=0 (clear), isDay=0 -> clear-night.svg
    // Push hours at least +2h into the future to avoid edge filtering at "now"
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode())
      .mockResolvedValueOnce(makeOMHourly(3, 2, { code: 0, isDay: 0, baseTemp: 19 }));

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('openMeteo');
    expect(result.forecast.length).toBeGreaterThan(0);
    const nightIconEntry = result.forecast.find(h => (h.icon || '').includes('clear-night.svg'));
    expect(nightIconEntry).toBeDefined();
  });
});
