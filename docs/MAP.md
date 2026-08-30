# Framework map — where to change what

## Run

| Goal | Command |
|---|---|
| 1 user | `./scripts/run-final.sh smoke` |
| 50 users | `./scripts/run-final.sh local` |
| CI | Actions → **NiteOut K6 Performance** → `vus` |
| Open report | `open "$(ls -t reports/final-*-client-report.html \| head -1)"` |

## Call path

```
scripts/run-final.sh
  → scripts/final-user-journey.js
      → src/auth.js                         # GET /tests/token
      → src/bootstrap.js                    # venues / events
      → src/journeys/final-user-journey.js  # API call order
      → src/journeys/heartbeat.js           # in-venue poll loop
      → src/api.js + src/http.js            # HTTP helpers
      → src/slo.js                          # pass/fail gates
      → src/reporting.js                    # HTML / console
```

## Change guide

| Want to… | Edit |
|---|---|
| Add / remove / reorder an API in the journey | `src/journeys/final-user-journey.js` (+ `heartbeat.js` if poll) |
| HTTP URL / method / body helper | `src/api.js` |
| Show in client report | `src/endpoint-metrics.js` |
| Latency tier / SLO numbers | `src/slo.js` |
| Auth | `src/auth.js` |
| VUs, venues, writes, heartbeat | `.env` / `config/environments.js` |
| CI | `.github/workflows/k6-performance.yml` |
| Grafana panels | `observability/grafana/dashboards/niteout-k6-overview.json` |

### New endpoint checklist

1. `src/api.js` — helper  
2. Journey — call it  
3. `src/endpoint-metrics.js` — registry row (`metricKey` must match `ok(...,'KEY')`)  
4. `src/slo.js` — `ENDPOINT_TIER`  
5. Smoke run → confirm in HTML report  

## Debug a failure

1. Client HTML → **Issues**  
2. Transport / `status=0` → generator/network  
3. Application errors → auth or API  
4. SLO latency → `src/slo.js` tier  
5. Grafana (if configured) → live `k6_*` metrics  

## Optional tool scripts (not the main load path)

| Script | Use |
|---|---|
| `scripts/preflight.js` | Quick env check |
| `scripts/validate-optional-endpoints.js` | Probe gated endpoints |
| `scripts/mobile-complete.js` / `mobile-write-validator.js` | Mobile write coverage |
| `scripts/swagger-catalog.js` / `swagger-read-sweep.js` / `operation.js` | Swagger exploration |

## Other docs

- [THRESHOLDS.md](THRESHOLDS.md) — SLO model  
- [PUBLISHING.md](PUBLISHING.md) — Pages + Grafana  
- [REPORTING.md](REPORTING.md) — artifacts  
