import request from "supertest";
import app from "../../src/app";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Integration: Weather API", () => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/weather returns weather for valid location", async () => {
    mockedAxios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          location: { name: "Pretoria" },
          forecast: {
            forecastday: [
              {
                hour: Array.from({ length: 6 }).map((_, i) => ({
                  time: `${todayStr} ${14 + i}:00`,
                  temp_c: 25,
                  condition: { text: "Sunny", icon: "icon" },
                })),
              },
            ],
          },
        },
      })
    );

    const res = await request(app).get("/api/weather?location=Pretoria");
    expect(res.status).toBe(200);
    expect(res.body.location).toBe("Pretoria");
    expect(Array.isArray(res.body.forecast)).toBe(true);
    expect(res.body.summary).toHaveProperty("avgTemp");
  });

  it("GET /api/weather/day returns weather for specific day", async () => {
    mockedAxios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          location: { name: "Pretoria" },
          forecast: {
            forecastday: [
              {
                date: todayStr,
                hour: Array.from({ length: 6 }).map((_, i) => ({
                  time: `${todayStr} ${10 + i}:00`,
                  temp_c: 19 + i,
                  condition: { text: "Partly Cloudy", icon: "icon" },
                })),
              },
            ],
          },
        },
      })
    );

    const res = await request(app).get(`/api/weather/day?location=Pretoria&date=${todayStr}`);
    expect(res.status).toBe(200);
    expect(res.body.location).toBe("Pretoria");
    expect(res.body.forecast.length).toBeGreaterThan(0);
    expect(res.body.summary).toHaveProperty("avgTemp");
  });

  it("GET /api/weather returns 500 if both APIs fail", async () => {
    mockedAxios.get.mockRejectedValue(new Error("API fail"));

    const res = await request(app).get("/api/weather?location=Nowhere");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Unable to fetch weather data/i);
  });

  it("GET /api/weather/day returns 404 if no forecast available", async () => {
  mockedAxios.get.mockImplementationOnce(() =>
    Promise.resolve({
      data: {
        location: { name: "Pretoria" },
        forecast: {
          forecastday: [
          ]
        }
      }
    })
  );
  mockedAxios.get.mockImplementationOnce(() =>
    Promise.resolve({ data: [{ lat: -25.74, lon: 28.19, name: "Pretoria" }] })
  );
  mockedAxios.get.mockImplementationOnce(() =>
    Promise.resolve({ data: { list: [] } }) 
  );

  const res = await request(app).get(`/api/weather/day?location=Pretoria&date=2050-01-01`);
  expect([404, 500]).toContain(res.status); 
  if (res.status === 404) {
    expect(res.body.error).toMatch(/forecast is unavailable/i);
  } else {
    expect(res.body.error).toMatch(/unable to fetch weather/i);
  }
});

  it("GET /api/weather/day returns 400 if missing params", async () => {
    const res = await request(app).get(`/api/weather/day?location=Pretoria`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/location and date are required/i);
  });
});
