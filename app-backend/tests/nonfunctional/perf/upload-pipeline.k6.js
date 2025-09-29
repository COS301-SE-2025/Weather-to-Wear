//docker run --rm -it -v "${PWD}\tests\nonfunctional\perf:/work" -w /work --env-file "${PWD}\tests\nonfunctional\perf\.env.example" grafana/k6 run upload-pipeline.k6.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { login, authHeaders, requireEnv, jitter } from "./lib.js";

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: {
    "http_req_failed": ["rate<0.05"],
    // combined BG removal + color extraction target window
    "pipeline_total_ms": ["p(50)<7000", "p(95)<10000"],
    // Full end-to-end: POST start -> item visible with tags
    "e2e_total_ms": ["p(50)<9000", "p(95)<12000"]
  },
};

const BASE_URL = requireEnv("BASE_URL");
const EMAIL = requireEnv("TEST_USER_EMAIL");
const PASS  = requireEnv("TEST_USER_PASSWORD");

const TINY = open("./tiny.png", "b");

const uploadLatency = new Trend("upload_latency_ms");
const pipelineTotal = new Trend("pipeline_total_ms");
const e2eTotal      = new Trend("e2e_total_ms");

// rotate across different categories
const SPEC = [
//   { layerCategory: "base_top",    category: "TSHIRT",  style: "Casual",   material: "Cotton",   warmthFactor: "2", waterproof: "false" },
  { layerCategory: "base_top",    category: "TSHIRT",  style: "Casual",   material: "Cotton",   warmthFactor: "4", waterproof: "false" },
//   { layerCategory: "base_top",    category: "TSHIRT",   style: "Casual", material: "Leather",  warmthFactor: "5", waterproof: "false" },
//   { layerCategory: "base_bottom", category: "PANTS",   style: "Casual",   material: "Denim",    warmthFactor: "3", waterproof: "false" },
//   { layerCategory: "base_bottom", category: "PANTS",   style: "Casual",   material: "Denim",    warmthFactor: "5", waterproof: "false" },
//   { layerCategory: "base_bottom", category: "PANTS",   style: "Casual",   material: "Denim",    warmthFactor: "6", waterproof: "false" },
//   { layerCategory: "footwear",    category: "SHOES",   style: "Casual", material: "Leather",  warmthFactor: "3", waterproof: "false" },
//   { layerCategory: "footwear",    category: "SHOES",   style: "Casual", material: "Leather",  warmthFactor: "5", waterproof: "false" },
//   { layerCategory: "footwear",    category: "SHOES",   style: "Casual", material: "Leather",  warmthFactor: "7", waterproof: "false" },
//   { layerCategory: "mid_top",    category: "HOODIE",   style: "Casual", material: "Leather",  warmthFactor: "5", waterproof: "false" },
  { layerCategory: "mid_top",    category: "HOODIE",   style: "Casual", material: "Leather",  warmthFactor: "6", waterproof: "false" },
//   { layerCategory: "mid_top",    category: "HOODIE",   style: "Casual", material: "Leather",  warmthFactor: "7", waterproof: "false" },
//   { layerCategory: "outerwear",    category: "JACKET",   style: "Casual", material: "Leather",  warmthFactor: "5", waterproof: "true" },
  { layerCategory: "outerwear",    category: "JACKET",   style: "Casual", material: "Leather",  warmthFactor: "7", waterproof: "true" },
//   { layerCategory: "outerwear",    category: "JACKET",   style: "Casual", material: "Leather",  warmthFactor: "8", waterproof: "false" },
];

export function setup() {
  const runId = `upload-${Date.now()}`;
  const token = login(BASE_URL, EMAIL, PASS, runId);
  return { token, runId };
}

export default function (data) {
  const h = authHeaders(data.token, data.runId);
  const spec = SPEC[__ITER % SPEC.length];

  const form = {
    image: http.file(TINY, "tiny.png", "image/png"),
    layerCategory: spec.layerCategory,
    category: spec.category,
    style: spec.style,
    material: spec.material,
    warmthFactor: spec.warmthFactor,
    waterproof: spec.waterproof,
  };

  const tStart = Date.now(); // begin E2E timer

  // ---- Upload ----
  const t0 = Date.now();
  const res = http.post(`${BASE_URL}/api/closet/upload`, form, {
    headers: {
      Authorization: h.headers.Authorization,
      "X-Test-Run": h.headers["X-Test-Run"],
    },
    tags: { endpoint: "closet_upload" },
  });
  const uploadMs = Date.now() - t0;
  uploadLatency.add(uploadMs);

  check(res, {
    "upload 201": (r) => r.status === 201,
    "upload returns id": (r) => r.status === 201 && !!(safeJson(r)?.id),
  });

  const uploaded = safeJson(res);
  const id =
    uploaded?.id ??
    (Array.isArray(uploaded) && uploaded[0]?.id) ??
    null;

  check(null, { "upload returned id": () => !!id });

  if (!id) {
    console.error(`Upload response missing id. status=${res.status} body=${String(res.body).slice(0,300)}`);
    return;
  }

  // Poll closet until item with tags appear
  const pollStart = Date.now();
  let ready = false;
  for (let i = 0; i < 40; i++) { 
    const list = http.get(`${BASE_URL}/api/closet/all`, { ...h, tags: { endpoint: "closet_all" }});
    if (list.status !== 200) { sleep(0.5); continue; }

    let items = [];
    try { items = list.json(); } catch (_) {}
    const item = Array.isArray(items) ? items.find((x) => x.id === id) : null;

    if (item && (item.dominantColors || item.colorHex || item.warmthFactor !== undefined)) {
      ready = true;
      break;
    }
    sleep(0.5);
  }

  const pipelineMs = Date.now() - pollStart;
  pipelineTotal.add(pipelineMs);

  const e2eMs = Date.now() - tStart;
  e2eTotal.add(e2eMs);

  check(null, {
    "pipeline finished <=10s": () => ready && pipelineMs <= 10000,
  });

  sleep(jitter());
}

function safeJson(res) { try { return res.json(); } catch (_) { return null; } }
