import http from "k6/http";
import { check, fail } from "k6";

export function requireEnv(name) {
  const v = __ENV[name];
  if (!v) fail(`Missing required env var: ${name}`);
  return v;
}

function safeJson(res) {
  try { return res.json(); } catch (e) { return null; }
}

export function login(baseUrl, email, password, runId) {
  const url = `${baseUrl}/api/auth/login`; // route good
  const res = http.post(
    url,
    JSON.stringify({ email, password }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Test-Run": runId,
      },
      tags: { endpoint: "auth_login" },
    }
  );

  if (res.status !== 200) {
    console.error(`Login failed. status=${res.status} url=${url}`);
    console.error(`Body (first 300 chars): ${String(res.body).slice(0, 300)}`);
    fail(`Login HTTP ${res.status}`);
  }

  const body = safeJson(res);
  const token = body && (body.token || body.accessToken);
  if (!token) {
    console.error("Login succeeded but token field not found.");
    console.error(`Body (first 300 chars): ${String(res.body).slice(0, 300)}`);
    fail("No token in login response. Expected 'token' or 'accessToken'.");
  }

  return token;
}

export function authHeaders(token, runId, extraTags = {}) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Test-Run": runId,
    },
    tags: extraTags,
  };
}

export function jitter(min = 0.2, max = 0.6) {
  return Math.random() * (max - min) + min;
}
