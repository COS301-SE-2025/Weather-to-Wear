import request from 'supertest';
import app from '../../src/app';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/* ---------- helpers ---------- */
function resp<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function makeOMGeocode(name = 'Pretoria') {
  return resp({
    results: [
      {
        name,
        country: 'South Africa',
        admin1: 'Gauteng',
        latitude: -25.7459,
        longitude: 28.1878,
        timezone: 'Africa/Johannesburg',
      },
    ],
  });
}

function makeOMHourly(hours = 6, startOffsetHours = 2, opts?: { code?: number; isDay?: number; baseTemp?: number }) {
  const now = Date.now();
  const code = opts?.code ?? 1;      // 1=mainly clear/partly cloudy
  const isDay = opts?.isDay ?? 1;
  const baseTemp = opts?.baseTemp ?? 25;

  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weathercode: number[] = [];
  const is_day: number[] = [];
  const precipitation: number[] = [];
  const precipitation_probability: number[] = [];

  for (let i = 0; i < hours; i++) {
    const dt = new Date(now + (startOffsetHours + i) * 3600 * 1000);
    const t = dt.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    time.push(t);
    temperature_2m.push(baseTemp + i * 0.1);
    weathercode.push(code);
    is_day.push(isDay);
    precipitation.push(0);
    precipitation_probability.push(10);
  }

  return resp({
    hourly: { time, temperature_2m, weathercode, is_day, precipitation, precipitation_probability },
  });
}

function makeOMHourlyForDay(date: string) {
  const times: string[] = [];
  const temps: number[] = [];
  const codes: number[] = [];
  const isDay: number[] = [];
  const precip: number[] = [];
  const precipProb: number[] = [];

  for (let h = 0; h < 24; h++) {
    const t = `${date}T${String(h).padStart(2, '0')}:00`;
    times.push(t);
    temps.push(19 + h * 0.25);
    codes.push(2); // partly cloudy
    isDay.push(h >= 6 && h <= 18 ? 1 : 0);
    precip.push(0);
    precipProb.push(20);
  }

  return resp({
    hourly: {
      time: times,
      temperature_2m: temps,
      weathercode: codes,
      is_day: isDay,
      precipitation: precip,
      precipitation_probability: precipProb,
    },
  });
}

/* ---------- tests ---------- */
describe('Integration: Weather API', () => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    // icons are optional; setting a base avoids undefined if you ever assert them later
    process.env.OPEN_METEO_ICON_BASE =
      'https://basmilius.github.io/weather-icons/production/fill/all';
  });

  it('GET /api/weather returns weather for valid location', async () => {
    // Open-Meteo: geocode → hourly (future hours so they pass the 24h filter)
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode('Pretoria'))
      .mockResolvedValueOnce(makeOMHourly(6, 2, { code: 1, isDay: 1, baseTemp: 25 }));

    const res = await request(app).get('/api/weather?location=Pretoria');
    expect(res.status).toBe(200);
    expect(res.body.location).toMatch(/Pretoria/i);
    expect(Array.isArray(res.body.forecast)).toBe(true);
    expect(res.body.forecast.length).toBeGreaterThan(0);
    expect(res.body.summary).toHaveProperty('avgTemp');
  });

  it('GET /api/weather/day returns weather for specific day', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode('Pretoria'))
      .mockResolvedValueOnce(makeOMHourlyForDay(todayStr));

    const res = await request(app).get(`/api/weather/day?location=Pretoria&date=${todayStr}`);
    expect(res.status).toBe(200);
    expect(res.body.location).toMatch(/Pretoria/i);
    expect(res.body.forecast.length).toBeGreaterThan(0);
    expect(res.body.summary).toHaveProperty('avgTemp');
  });

  it('GET /api/weather returns 500 if all providers fail', async () => {
    // OM geocode -> no results; FW fails; OWM geo fails
    mockedAxios.get
      .mockResolvedValueOnce(resp({ results: [] }))   // OM geocode empty
      .mockRejectedValueOnce(new Error('FW down'))    // FreeWeather
      .mockRejectedValueOnce(new Error('OWM geo down')); // OWM geocode

    const res = await request(app).get('/api/weather?location=Nowhere');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Unable to fetch weather data/i);
  });

  it('GET /api/weather/day returns 404 or 500 if no forecast available (far future)', async () => {
    // OM geocode succeeds but OM hourly returns empty arrays,
    // then FW returns no matching day, and OWM returns empty list.
    mockedAxios.get
      .mockResolvedValueOnce(makeOMGeocode('Pretoria')) // OM geocode
      .mockResolvedValueOnce(
        resp({
          hourly: {
            time: [],
            temperature_2m: [],
            weathercode: [],
            is_day: [],
            precipitation: [],
            precipitation_probability: [],
          },
        }),
      ) // OM hourly empty -> treated as unavailable
      .mockResolvedValueOnce(resp({ location: { name: 'Pretoria' }, forecast: { forecastday: [] } })) // FW no match
      .mockResolvedValueOnce(resp([{ name: 'Pretoria', lat: -25.74, lon: 28.19 }])) // OWM geo
      .mockResolvedValueOnce(resp({ list: [], city: { name: 'Pretoria' } })); // OWM no entries

    const res = await request(app).get(`/api/weather/day?location=Pretoria&date=2050-01-01`);
    expect([404, 500]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.error).toMatch(/forecast is unavailable/i);
    } else {
      expect(res.body.error).toMatch(/unable to fetch weather/i);
    }
  });

  it('GET /api/weather/day returns 400 if missing params', async () => {
    const res = await request(app).get(`/api/weather/day?location=Pretoria`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/location and date are required/i);
  });
});
