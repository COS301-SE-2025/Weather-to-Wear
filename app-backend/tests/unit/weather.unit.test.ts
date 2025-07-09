import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getWeatherByLocation, __weatherCache, getWeatherByDay  } from '../../src/modules/weather/weather.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather Service', () => {
  beforeEach(() => {
    __weatherCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns weather from FreeWeatherAPI', async () => {
    const now = new Date();
    const mockHours = Array.from({ length: 6 }).map((_, i) => {
      const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
      const formatted = hour.toISOString().slice(0, 13).replace('T', ' ') + ':00';
      return {
        time: formatted,
        temp_c: 25,
        condition: { text: 'Sunny', icon: 'icon.png' }
      };
    });

    const mockFreeWeatherResponse: AxiosResponse = {
      data: {
        location: { name: 'Cape Town' },
        forecast: {
          forecastday: [
            {
              hour: mockHours
            }
          ]
        }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get
      .mockResolvedValueOnce(mockFreeWeatherResponse);

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('FreeWeatherAPI');
    expect(result.forecast[0].temperature).toBe(25);
  });

  it('falls back to OpenWeatherMap if FreeWeatherAPI fails', async () => {
    const mockGeoResponse: AxiosResponse = {
      data: [
        {
          name: 'Cape Town',
          lat: -33.918861,
          lon: 18.4233
        }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    const mockOpenWeatherResponse: AxiosResponse = {
      data: {
        list: [
          {
            dt: Math.floor(Date.now() / 1000) + 3600,
            dt_txt: '2025-05-23 15:00:00',
            main: { temp: 20 },
            weather: [{ description: 'Clear sky', icon: '01d' }]
          }
        ],
        city: { name: 'Cape Town' }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get
      .mockRejectedValueOnce(new Error('FreeWeatherAPI down'))
      .mockResolvedValueOnce(mockGeoResponse)
      .mockResolvedValueOnce(mockOpenWeatherResponse);

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('OpenWeatherMap');
    expect(result.forecast[0].temperature).toBe(20);
  });

  it('throws an error if both APIs fail', async () => {
    mockedAxios.get.mockRejectedValue(new Error('All APIs down'));

    await expect(getWeatherByLocation('Cape Town')).rejects.toThrow('Both weather services failed');
  });
});

describe('Weather Service (getWeatherByDay)', () => {
  beforeEach(() => {
    __weatherCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns weather for a specific day from FreeWeatherAPI', async () => {
    const mockDay = '2025-06-24';

    const mockHours = Array.from({ length: 24 }).map((_, i) => ({
      time: `${mockDay} ${i.toString().padStart(2, '0')}:00`,
      temp_c: 18 + i * 0.5,
      condition: { text: 'Sunny', icon: 'icon.png' }
    }));

    const mockFreeWeatherResponse: AxiosResponse = {
      data: {
        location: { name: 'Cape Town' },
        forecast: {
          forecastday: [
            {
              date: mockDay,
              hour: mockHours
            }
          ]
        }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get.mockResolvedValueOnce(mockFreeWeatherResponse);

    const result = await getWeatherByDay('Cape Town', mockDay);
    expect(result.source).toBe('FreeWeatherAPI');
    expect(result.location).toBe('Cape Town');
    expect(result.forecast.length).toBe(24);
    expect(result.forecast[0].temperature).toBe(18);
    expect(result.summary).toBeDefined();
  });

  it('falls back to OpenWeatherMap for a day if FreeWeatherAPI fails', async () => {
    const mockDay = '2025-06-25';

    // OWM returns data in 3-hour intervals for a specific day
    const mockGeoResponse: AxiosResponse = {
      data: [
        {
          name: 'Cape Town',
          lat: -33.918861,
          lon: 18.4233
        }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    const threeHourly = [0, 3, 6, 9, 12, 15, 18, 21].map(hour => ({
      dt: Math.floor(Date.now() / 1000) + hour * 3600,
      dt_txt: `${mockDay} ${hour.toString().padStart(2, '0')}:00:00`,
      main: { temp: 20 + hour * 0.5 },
      weather: [{ description: 'Cloudy', icon: '03d' }]
    }));

    const mockOpenWeatherResponse: AxiosResponse = {
      data: {
        list: threeHourly,
        city: { name: 'Cape Town' }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get
      .mockRejectedValueOnce(new Error('FreeWeatherAPI down'))
      .mockResolvedValueOnce(mockGeoResponse)
      .mockResolvedValueOnce(mockOpenWeatherResponse);

    const result = await getWeatherByDay('Cape Town', mockDay);
    expect(result.source).toBe('OpenWeatherMap');
    expect(result.forecast.length).toBe(24); // Interpolated
    expect(result.location).toBe('Cape Town');
    expect(result.forecast[0].description).toBe('Cloudy');
    expect(result.summary).toBeDefined();
  });

  it('throws an error if both APIs fail for the requested day', async () => {
    mockedAxios.get.mockRejectedValue(new Error('All APIs down'));
    await expect(getWeatherByDay('Cape Town', '2025-06-26')).rejects.toThrow('Both weather services failed');
  });

  it('returns null or error if requested date is too far in the future', async () => {
    // FreeWeatherAPI returns no matching day, OWM returns no entries for the date
    const farDay = '2030-01-01';

    const mockFreeWeatherResponse: AxiosResponse = {
      data: {
        location: { name: 'Cape Town' },
        forecast: {
          forecastday: [
            { date: '2025-06-24', hour: [] },
            { date: '2025-06-25', hour: [] }
          ]
        }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    const mockGeoResponse: AxiosResponse = {
      data: [
        {
          name: 'Cape Town',
          lat: -33.918861,
          lon: 18.4233
        }
      ],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    const mockOpenWeatherResponse: AxiosResponse = {
      data: {
        list: [], // No entries for this day
        city: { name: 'Cape Town' }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get
      .mockResolvedValueOnce(mockFreeWeatherResponse) // FreeWeatherAPI: no match
      .mockResolvedValueOnce(mockGeoResponse)         // OWM geo
      .mockResolvedValueOnce(mockOpenWeatherResponse); // OWM forecast

    await expect(getWeatherByDay('Cape Town', farDay)).rejects.toThrow('Both weather services failed');
  });
});