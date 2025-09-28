// docker run --rm -it -v "${PWD}\tests\nonfunctional\perf:/work" -w /work --env-file "${PWD}\tests\nonfunctional\perf\.env.example" grafana/k6 run scale-read.k6.js

import http from "k6/http";
import { check } from "k6";
import { login, authHeaders, requireEnv } from "./lib.js";

export const options = {
  scenarios: {
    closet: {
      executor: "constant-arrival-rate",
      rate: 3, // 3 requests per second
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 12,
      maxVUs: 24,
      exec: "closet",
    },
    recommend: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: "recommend",
    },
    weather: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: "weather",
    },
  },
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{endpoint:closet_all}": ["p(95)<400", "p(99)<900"],
    "http_req_duration{endpoint:outfits_recommend}": ["p(95)<1000"],
    "http_req_duration{endpoint:weather}": ["p(95)<3500"],
  },
};

const BASE_URL = requireEnv("BASE_URL");
const EMAIL = requireEnv("TEST_USER_EMAIL");
const PASS  = requireEnv("TEST_USER_PASSWORD");

export function setup() {
  const runId = `scale-${Date.now()}`;
  const token = login(BASE_URL, EMAIL, PASS, runId);
  return { token, runId };
}

export function closet(data) {
  const h = authHeaders(data.token, data.runId, { endpoint: "closet_all" });
  const r = http.get(`${BASE_URL}/api/closet/all`, h);
  check(r, { "closet 200": res => res.status === 200 });
}

export function recommend(data) {
  const h = authHeaders(data.token, data.runId, { endpoint: "outfits_recommend" });
  const body = JSON.stringify({
    weatherSummary: { avgTemp: 16, minTemp: 12, maxTemp: 20, willRain: false, mainCondition: "clear" },
    style: "Casual",
  });
  const r = http.post(`${BASE_URL}/api/outfits/recommend`, body, h);
  check(r, { "recommend 200": res => res.status === 200 });
}

export function weather(data) {
  const h = authHeaders(data.token, data.runId, { endpoint: "weather" });
  const r = http.get(`${BASE_URL}/api/weather?city=Pretoria`, h);

  check(r, { "weather 200": res => res.status === 200 });
}
