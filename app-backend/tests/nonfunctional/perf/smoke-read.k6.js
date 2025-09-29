// Run in `app-backend:
// docker run --rm -it -v "$PWD/tests/nonfunctional/perf:/scripts" --env-file tests/nonfunctional/perf/.env.example grafana/k6 run /scripts/smoke-read.k6.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { login, authHeaders, requireEnv, jitter } from "./lib.js";

export const options = {
  vus: 5,
  duration: "1m",
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{endpoint:weather}": ["p(95)<3500", "p(99)<4000"],
    "http_req_duration{endpoint:closet_all}": ["p(95)<800", "p(99)<1500"],
    "http_req_duration{endpoint:outfits_recommend}": ["p(95)<1500"], // only sampled if closet has items
  },
};

const BASE_URL = requireEnv("BASE_URL");
const EMAIL = requireEnv("TEST_USER_EMAIL");
const PASS = requireEnv("TEST_USER_PASSWORD");
const CITY = __ENV.CITY || "Pretoria";

// cache-observation
const weatherFirst = new Trend("weather_first_ms");
const weatherRepeat = new Trend("weather_repeat_ms");

export function setup() {
  const runId = `smoke-${Date.now()}`;
  const token = login(BASE_URL, EMAIL, PASS, runId);
  return { token, runId };
}

export default function (data) {
  const h = authHeaders(data.token, data.runId);

  // WEATHER twice to check cache effect
  let t0 = Date.now();
  let r = http.get(`${BASE_URL}/api/weather?location=${encodeURIComponent(CITY)}`, {
    ...h, tags: { endpoint: "weather" }
  });
  weatherFirst.add(Date.now() - t0);
  check(r, { "weather 200": (res) => res.status === 200 });

  t0 = Date.now();
  r = http.get(`${BASE_URL}/api/weather?city=${encodeURIComponent(CITY)}`, {
    ...h, tags: { endpoint: "weather" }
  });
  weatherRepeat.add(Date.now() - t0);
  check(r, { "weather repeat 200": (res) => res.status === 200 });

  // --- CLOSET (read) ---
  r = http.get(`${BASE_URL}/api/closet/all`, {
    ...h, tags: { endpoint: "closet_all" }
  });
  if (r.status !== 200) {
    console.error(`CLOSET non-200: ${r.status} body: ${String(r.body).slice(0, 300)}`);
  }
  check(r, { "closet 200": (res) => res.status === 200 });

  let items = [];
  try { items = r.json(); } catch (_) {}
  const hasItems = Array.isArray(items) && items.length > 0;

  // --- OUTFITS RECOMMEND (only if closet has items) ---
  if (hasItems) {
    const body = {
      weatherSummary: {
        avgTemp: 12.54, minTemp: 10.2, maxTemp: 15.8,
        willRain: false, mainCondition: "overcast"
      },
      style: "Casual"
    };
    r = http.post(`${BASE_URL}/api/outfits/recommend`, JSON.stringify(body), {
      ...h, tags: { endpoint: "outfits_recommend" }
    });
    if (r.status !== 200) {
      console.error(`RECOMMEND non-200: ${r.status} body: ${String(r.body).slice(0, 300)}`);
    }
    check(r, {
      "recommend 200": (res) => res.status === 200,
      "recommend returns array": (res) => res.status === 200 && Array.isArray(res.json()) && res.json().length >= 1,
      "recommend <=1.5s": (res) => res.status === 200 && res.timings.duration <= 1500,
    });
  } else {
    console.warn("Skipping /api/outfits/recommend because closet is empty.");
  }

  sleep(jitter());
}
