# 1) Scalability Non-Functional Tests — Documentation

*Save as `docs/NonFunctional/Scalability-Testing.md`*

## Purpose

Validate that Weather to Wear keeps latency within targets as **concurrency and request rates increase**, and that the **image upload pipeline** handles short bursts without building an unhealthy backlog.

## Test environment

* **Hybrid prod** (App Runner + RDS + S3 + CloudFront + microservices)
* **Perf test user:** `perf@test.com` (PerfTest)
* **Data hygiene:** uploads from tests are stored under `perf-tests/users/<userId>/…` (via `X-Test-Run` header or perf email), and your S3 lifecycle rule auto-expires them after 1 day. Tests also call `DELETE /api/closet/:id` in teardown (best effort).

## SLOs (scalability slice)

*Target traffic: ~20 concurrent users at ~5 req/s total; bursts of 6 uploads/min for 5 minutes.*

**API reads**

* Closet (`GET /api/closet/all`): **p95 ≤ 400 ms**, **p99 ≤ 900 ms**, **errors < 1%**
* Recommend (`POST /api/outfits/recommend`): **p95 ≤ 1,000 ms**, **errors < 1%**
* Weather (`GET /api/weather?city=…`): **p95 ≤ 3,500 ms** (temporary cache-MISS tolerance with 3s provider timeout).
  *If you later add shared cache/CDN and `X-Cache` header, enforce HIT **p95 ≤ 300 ms**.*

**Upload pipeline (burst)**

* Arrival: **6 uploads/min** for **5 min**
* **e2e_total_ms** (POST start → enrichment visible): **p50 ≤ 9 s**, **p95 ≤ 12 s**
* **pipeline_total_ms** (post-response → enrichment visible): **p50 ≤ 7 s**, **p95 ≤ 10 s**
* Error rate during burst **< 2%**

## What we test

### A) Scale Read Mix (`scale-read.k6.js`)

* Shape: constant arrival rate for **5 minutes** at ~**5 rps** total
  (3 rps closet, 1 rps recommend, 1 rps weather)
* Validates p95/p99 latency under small sustained concurrency.

### B) Burst Uploads (`burst-uploads.k6.js`)

* Shape: **6 uploads/min** for **5 minutes**
* Measures:

  * `upload_latency_ms` — HTTP upload request time
  * `pipeline_total_ms` — post-response enrichment time (polling `/api/closet/all`)
  * `e2e_total_ms` — end-to-end
* Teardown: delete items created during the run (and S3 lifecycle cleans the objects).

## How to run locally

```bash
# Scale reads
docker run --rm -it \
  -v "$PWD/tests/nonfunctional/perf:/work" -w /work \
  --env-file "$PWD/tests/nonfunctional/perf/.env.example" \
  grafana/k6 run scale-read.k6.js

# Burst uploads
docker run --rm -it \
  -v "$PWD/tests/nonfunctional/perf:/work" -w /work \
  --env-file "$PWD/tests/nonfunctional/perf/.env.example" \
  grafana/k6 run burst-uploads.k6.js
```

## Pass criteria

* All thresholds defined in each script pass.
* No unexpected spikes in error rate; upload prefix observed under `perf-tests/…`.

## Notes

* Do **not** create S3 “folders”—they appear automatically once objects are uploaded with that prefix.
* If a burst suddenly fails with fast 4xx/5xx responses, double-check App Runner env vars (`BG_REMOVAL_URL`, `COLOR_EXTRACT_URL`, `S3_BUCKET_NAME`, etc.).
* You can restrict prefixing to **header-only** (so manual UI uploads are unaffected) by making `markPerfTest` check only `X-Test-Run`.

---

# 2) GitHub Actions workflow (auto-run on merge to `main`)

*Save as `.github/workflows/scalability-k6.yml`*

```yaml
name: Scalability (k6)

on:
  push:
    branches: [ "main" ]   # run after merges to main
  workflow_dispatch:        # allow manual runs

jobs:
  k6-scalability:
    runs-on: ubuntu-latest
    timeout-minutes: 25   # scale-read (5m) + burst (5m) + overhead
    env:
      # k6 scripts read these via process env
      BASE_URL: ${{ secrets.PERF_BASE_URL }}           # e.g. https://gi2cijr3xa.eu-west-1.awsapprunner.com
      TEST_USER_EMAIL: ${{ secrets.PERF_USER_EMAIL }}  # perf@test.com
      TEST_USER_PASSWORD: ${{ secrets.PERF_USER_PASSWORD }}
      CITY: ${{ secrets.PERF_CITY }}                   # e.g. Pretoria
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Prepare artifact dir
        run: |
          mkdir -p app-backend/tests/nonfunctional/perf/artifacts

      - name: Scale Read (5 minutes @ ~5 rps)
        run: |
          docker run --rm \
            -v "${{ github.workspace }}/app-backend/tests/nonfunctional/perf:/work" \
            -w /work \
            -e BASE_URL -e TEST_USER_EMAIL -e TEST_USER_PASSWORD -e CITY \
            grafana/k6:latest run \
            --summary-export /work/artifacts/scale-read-summary.json \
            scale-read.k6.js

      - name: Upload scale-read summary
        uses: actions/upload-artifact@v4
        with:
          name: k6-scale-read-summary
          path: app-backend/tests/nonfunctional/perf/artifacts/scale-read-summary.json
          if-no-files-found: error

      - name: Burst Uploads (6/min for 5 minutes)
        run: |
          docker run --rm \
            -v "${{ github.workspace }}/app-backend/tests/nonfunctional/perf:/work" \
            -w /work \
            -e BASE_URL -e TEST_USER_EMAIL -e TEST_USER_PASSWORD -e CITY \
            grafana/k6:latest run \
            --summary-export /work/artifacts/burst-uploads-summary.json \
            burst-uploads.k6.js

      - name: Upload burst-uploads summary
        uses: actions/upload-artifact@v4
        with:
          name: k6-burst-uploads-summary
          path: app-backend/tests/nonfunctional/perf/artifacts/burst-uploads-summary.json
          if-no-files-found: error
```

## Required repository secrets

To be set under **Settings → Secrets and variables → Actions → New repository secret**:

* `PERF_BASE_URL` → `https://gi2cijr3xa.eu-west-1.awsapprunner.com`
* `PERF_USER_EMAIL` → `perf@test.com`
* `PERF_USER_PASSWORD` → `Perf123!`
* `PERF_CITY` → `Pretoria`

> This job **fails the workflow** if any SLO threshold is crossed (k6 exits non-zero). Artifacts include JSON summaries you can archive or parse later.

---

