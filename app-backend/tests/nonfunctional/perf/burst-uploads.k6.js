// docker run --rm -it -v "${PWD}\tests\nonfunctional\perf:/work" -w /work --env-file "${PWD}\tests\nonfunctional\perf\.env.example" grafana/k6 run burst-uploads.k6.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { login, authHeaders, requireEnv, jitter } from "./lib.js";

export const options = {
    scenarios: {
        uploads: {
            executor: "constant-arrival-rate",
            rate: 6,            // 6 per minute
            timeUnit: "1m",
            duration: "5m",
            preAllocatedVUs: 6,
            maxVUs: 12,
            exec: "uploadOne",
        },
    },
    thresholds: {
        "http_req_failed": ["rate<0.02"],
        "pipeline_total_ms": ["p(50)<7000", "p(95)<10000"],
        "e2e_total_ms": ["p(50)<9000", "p(95)<12000"],
    },
};

const BASE_URL = requireEnv("BASE_URL");
const EMAIL = requireEnv("TEST_USER_EMAIL");
const PASS = requireEnv("TEST_USER_PASSWORD");

// init-time file load (k6 requirement)
const TINY = open("./tiny1.png", "b");

// metrics
const uploadLatency = new Trend("upload_latency_ms");
const pipelineTotal = new Trend("pipeline_total_ms");
const e2eTotal = new Trend("e2e_total_ms");

// rotate spec to vary items
const SPEC = [
    { layerCategory: "base_top", category: "TSHIRT", style: "Casual", material: "Cotton", warmthFactor: "3", waterproof: "false" },
    { layerCategory: "base_bottom", category: "PANTS", style: "Casual", material: "Denim", warmthFactor: "4", waterproof: "false" },
    { layerCategory: "footwear", category: "SHOES", style: "Athletic", material: "Leather", warmthFactor: "5", waterproof: "false" },
    { layerCategory: "outerwear", category: "JACKET", style: "Outdoor", material: "Nylon", warmthFactor: "6", waterproof: "true" },
    { layerCategory: "mid_top", category: "SWEATER", style: "Casual", material: "Wool", warmthFactor: "7", waterproof: "false" },
    { layerCategory: "headwear", category: "HAT", style: "Outdoor", material: "Fabric", warmthFactor: "1", waterproof: "false" },
];

export function setup() {
    const runId = `burst-${Date.now()}`;
    const token = login(BASE_URL, EMAIL, PASS, runId);
    const runStartISO = new Date().toISOString();
    return { token, runId, runStartISO };
}

export function uploadOne(data) {
    const h = authHeaders(data.token, data.runId, { endpoint: "closet_upload" });
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

    const headers = { ...h.headers };
    delete headers["Content-Type"];

    const e2eStart = Date.now();
    const t0 = Date.now();
    const res = http.post(`${BASE_URL}/api/closet/upload`, form, {
        headers,
        tags: h.tags,
    });
    const uploadMs = Date.now() - t0;
    uploadLatency.add(uploadMs);

    if (res.status < 200 || res.status >= 300) {
        console.error("UPLOAD_FAIL", res.status, res.body?.slice(0, 200));
    }
    check(res, { "upload 2xx": r => r.status >= 200 && r.status < 300 });

    const uploaded = safeJson(res);
    const id = uploaded?.id ?? (Array.isArray(uploaded) && uploaded[0]?.id) ?? null;
    check(null, { "upload returned id": () => !!id });

    // Poll for enrichment (dominantColors or colorHex or warmthFactor)
    const pollStart = Date.now();
    let ready = false;
    for (let i = 0; i < 40; i++) { // ~20s max
        const list = http.get(`${BASE_URL}/api/closet/all`, { headers: h.headers, tags: { endpoint: "closet_all" } });
        if (list.status !== 200) { sleep(0.5); continue; }
        let items = [];
        try { items = list.json(); } catch (_) { }
        const item = Array.isArray(items) ? items.find(x => x.id === id) : null;
        if (item && (item.dominantColors || item.colorHex || item.warmthFactor !== undefined)) { ready = true; break; }
        sleep(0.5);
    }
    const pipelineMs = Date.now() - pollStart;
    pipelineTotal.add(pipelineMs);

    const e2eMs = Date.now() - e2eStart;
    e2eTotal.add(e2eMs);

    sleep(jitter());
}

// Cleanup: delete items created during this run (best-effort)
export function teardown(data) {
    const h = authHeaders(data.token, data.runId);
    const list = http.get(`${BASE_URL}/api/closet/all`, h);
    if (list.status !== 200) {
        console.warn(`Cleanup: failed to list closet items. status=${list.status}`);
        return;
    }
    let items = [];
    try { items = list.json(); } catch (_) { }
    const createdAfter = new Date(data.runStartISO).getTime();

    const toDelete = (Array.isArray(items) ? items : []).filter(x => {
        const t = Date.parse(x.createdAt || "");
        return isFinite(t) && t >= createdAfter;
    });

    for (const it of toDelete) {
        const r = http.del(`${BASE_URL}/api/closet/${it.id}`, null, h);
        if (r.status >= 200 && r.status < 300) {
            // ok
        } else {
            console.warn(`Cleanup: delete ${it.id} failed status=${r.status}`);
        }
        sleep(0.05);
    }
}

function safeJson(res) { try { return res.json(); } catch (_) { return null; } }
