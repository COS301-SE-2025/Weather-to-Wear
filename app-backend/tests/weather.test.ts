import axios, { AxiosResponse, InternalAxiosRequestConfig  } from 'axios';
import { getWeatherByLocation } from '../src/modules/weather/weather.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns weather from FreeWeatherAPI', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        location: { name: 'Cape Town' },
        current: {
          temp_c: 25,
          condition: { text: 'Sunny', icon: 'icon.png' },
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {},
        url: '',
        method: 'get',
      } as InternalAxiosRequestConfig,
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('FreeWeatherAPI');
    expect(result.temperature).toBe(25);
  });

  it('falls back to OpenWeatherMap if FreeWeatherAPI fails', async () => {
    const fallbackResponse: AxiosResponse = {
      data: {
        name: 'Cape Town',
        main: { temp: 20 },
        weather: [{ description: 'Clear sky', icon: '01d' }],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {},
        url: '',
        method: 'get',
      } as InternalAxiosRequestConfig,
    };

    mockedAxios.get
      .mockRejectedValueOnce(new Error('FreeWeatherAPI down'))
      .mockResolvedValueOnce(fallbackResponse);

    const result = await getWeatherByLocation('Cape Town');
    expect(result.source).toBe('OpenWeatherMap');
    expect(result.temperature).toBe(20);
  });

  it('throws an error if both APIs fail', async () => {
    mockedAxios.get.mockRejectedValue(new Error('All APIs down'));

    await expect(getWeatherByLocation('Cape Town')).rejects.toThrow('Both weather services failed');
  });
});
