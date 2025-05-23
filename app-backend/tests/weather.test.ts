import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getWeatherByLocation } from '../src/modules/weather/weather.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns weather from FreeWeatherAPI', async () => {
    const mockFreeWeatherResponse: AxiosResponse = {
      data: {
        location: { name: 'Cape Town' },
        forecast: {
          forecastday: [{
            hour: Array.from({ length: 6 }).map((_, i) => ({
              time: `2025-05-23 ${14 + i}:00`,
              temp_c: 25,
              condition: { text: 'Sunny', icon: 'icon.png' }
            }))
          }]
        }
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    };

    mockedAxios.get.mockResolvedValueOnce(mockFreeWeatherResponse);

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
      .mockRejectedValueOnce(new Error('FreeWeatherAPI down')) // FreeWeatherAPI
      .mockResolvedValueOnce(mockGeoResponse) // Geo lookup
      .mockResolvedValueOnce(mockOpenWeatherResponse); // Forecast

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('OpenWeatherMap');
    expect(result.forecast[0].temperature).toBe(20);
  });

  it('throws an error if both APIs fail', async () => {
    mockedAxios.get.mockRejectedValue(new Error('All APIs down'));

    await expect(getWeatherByLocation('Cape Town')).rejects.toThrow('Both weather services failed');
  });
});
