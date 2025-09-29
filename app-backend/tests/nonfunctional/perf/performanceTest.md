# Weather to Wear — Performance (Non-Functional) Testing

## 1) Why these tests & why they matter

**Goal:** make sure core user flows feel fast and stay fast as we iterate.

* **Outfit recommendations** must feel snappy or users won’t explore.
* **Closet reads** back most screens; slow reads = slow app.
* **Weather** powers logic across the app; tail latency spikes can ripple everywhere.
* **Upload pipeline (BG removal + colour extraction)** seeds the closet and enables features; if slow, users stall at the first step.

We chose small, **production-like** tests that:

* Hit the **exact infra** users hit (App Runner, RDS, S3/CDN) without polluting prod (test user + S3 prefix + 1-day lifecycle).
* Cover one fast **read-only smoke** path and one **write/pipeline** path.
* Produce **objective thresholds (SLOs)** that we can gate in CI.

> Environment: **Hybrid (prod)** — read tests directly on prod; write tests under a **PerfTest** user and S3 `perf-tests/` prefix with **1-day lifecycle** cleanup.

---

## 2) What we tested

### A) Read-only smoke (auth + weather + closet + recommend)

* **Purpose:** validate health, warm caches, and record baseline latencies.
* **Load profile:** 5 **VUs** for 1 minute (tiny, safe).
* **Endpoints:**

  * `POST /api/auth/login` (implicit via helper)
  * `GET  /api/weather?city=<city>` (twice per iteration to observe cache)
  * `GET  /api/closet/all`
  * `POST /api/outfits/recommend` with:

    ```json
    {
      "weatherSummary": {"avgTemp": 15.6, "minTemp": 10, "maxTemp": 22, "willRain": false, "mainCondition": "clear"},
      "style": "Casual"
    }
    ```

### B) Upload + pipeline (auto-seed closet)

* **Purpose:** measure end-to-end upload experience and async processing, and seed items for the smoke test.
* **Load profile:** 1 VU, 3 iterations (TSHIRT / PANTS / SHOES), tiny PNG.
* **Endpoint & fields:** `POST /api/closet/upload` (multipart)

  * `image`, `layerCategory`, `category`, `style`, `material`, `warmthFactor`, `waterproof`.
* **What we time:**

  * `upload_latency_ms` — time to complete the HTTP upload request.
  * `pipeline_total_ms` — time from upload response → item shows enrichment (`dominantColors`/`colorHex`/`warmthFactor`) in `GET /api/closet/all`.
  * `e2e_total_ms` — **POST start → enrichment visible** (true end-to-end).

---

## 3) SLOs and what we measured (SLIs)

| Area                          | SLI (what we measure)                               |            **SLO** |    Final p95 / result |
| ----------------------------- | --------------------------------------------------- | -----------------: | --------------------: |
| Closet reads                  | `http_req_duration{endpoint:closet_all}` p95        |       **≤ 800 ms** |          **222 ms** ✅ |
| Outfit recommend              | `http_req_duration{endpoint:outfits_recommend}` p95 |        **≤ 1.5 s** |          **441 ms** ✅ |
| Weather (prod miss tolerance) | `http_req_duration{endpoint:weather}` p95           |        **≤ 3.5 s** |          **3.20 s** ✅ |
| Upload pipeline (async part)  | `pipeline_total_ms` p50 / p95                       | **≤ 7 s / ≤ 10 s** | **0.75 s / 0.78 s** ✅ |
| Upload end-to-end             | `e2e_total_ms` p50 / p95                            | **≤ 9 s / ≤ 12 s** | **8.37 s / 8.74 s** ✅ |
| Errors                        | `http_req_failed` rate                              |   **< 1% (smoke)** |              **0%** ✅ |

**Notes**

* Weather p95 SLO is temporarily **3.5 s** to account for **per-instance cache** and a **3 s outbound timeout** to third-party providers. Once we add a shared cache (Redis/ElastiCache) or CDN caching by city, we can push this SLO back to sub-second.
* Upload’s time is **mostly synchronous in the request handler** (~7.6–8.0 s), with the remaining ~~0.75 s post-response. If we move more work fully async, the end-to-end time will drop further.

---

## 4) Results (from the final runs)

### Smoke (5 VUs, 1m)

* All checks passed; **0% errors**.
* **Closet** p95 **222 ms**; **Recommend** p95 **441 ms**.
* **Weather** p95 **3.20 s** (bounded by the new **3 s timeout + stale cache fallback**); no more 60 s stalls.

### Upload + pipeline (1 VU × 3)

* `upload 201` with IDs returned ✅
* `upload_latency_ms` p95 ≈ **7.99 s**
* `pipeline_total_ms` p95 ≈ **0.78 s**
* `e2e_total_ms` p95 ≈ **8.74 s**
* Closet was seeded with items (confirmed in UI).

---

## 5) Design choices & rationale

* **Hybrid prod testing**: realistic network/CDN/DB path; minimal setup; isolated with **PerfTest** user + S3 `perf-tests/` prefix (1-day lifecycle).
* **k6 + Docker**: single command reproducibility; thresholds fail the job when SLOs are breached.
* **Cache-aware weather testing**: two back-to-back calls observe cache vs miss; outbound timeout prevents extreme tail latency.
* **Upload measured two ways**: split **synchronous** time (inside handler) from **async pipeline** (post-response) to pinpoint UX pain.

---

## 6) How to run

**Smoke**

```bash
docker run --rm -it -v "$PWD/tests/nonfunctional/perf:/scripts" --env-file tests/nonfunctional/perf/.env.example grafana/k6 run /scripts/smoke-read.k6.js
```

**Upload / pipeline**

```bash
docker run --rm -it -v "$PWD/tests/nonfunctional/perf:/work" -w /work --env-file "$PWD/tests/nonfunctional/perf/.env.example" grafana/k6 run upload-pipeline.k6.js
```

> Env file: `BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `CITY`.
> Scripts live in `tests/nonfunctional/perf/`.

Optional CI (GitHub Actions) is ready to add; the workflow will fail on SLO breach.

---

## 7) Known limitations & next steps

* **Weather caching is in-memory per instance** → misses can hit the 3 s timeout.
  **Next:** add Redis/ElastiCache or CDN caching keyed by `city` (TTL 30 min). Then set weather p95 SLO back to **≤ 800 ms**.
* **Upload handler is doing heavy work synchronously** (user waits ~7–8 s).
  **Next:** push BG removal/colour extraction fully async (queue/worker), return **201** quickly, and let the client poll.
* **Load headroom not formally tested** (we ran a small smoke).
  **Next:** optional short stress ramp to 25–40 VUs; keep p95 within SLOs; tune DB indexes and App Runner concurrency if needed.
* **Observability:** add `X-Test-Run` (already used) and, for weather, `X-Cache: HIT|MISS` to split SLOs by cache outcome.

---

## 8) Glossary

* **SLO (Service Level Objective):** the performance target you commit to (e.g., “p95 ≤ 1.5 s”).
* **SLI (Service Level Indicator):** the measured metric (e.g., k6’s `http_req_duration` p95).
* **p95 / p99:** the latency under which 95% / 99% of requests fall.
* **VU (Virtual User):** a k6 execution context that runs your script in a loop; “5 VUs for 1m” ≈ up to 5 concurrent users exercising the flow for one minute.
