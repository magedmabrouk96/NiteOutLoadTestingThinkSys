# Provisional SLO model

Single source of truth: [`src/slo.js`](../src/slo.js).

## Design (standard perf practice)

1. **Reliability first** — errors, journey, heartbeat, checks must pass on every profile.
2. **Latency by criticality** — tighter for interactive path, looser for writes/uploads.
3. **Profile selects severity** — smoke never fails CI on latency noise.
4. **Provisional** — QA trend gates until the client signs formal SLAs.

## Profiles

| Profile | Fails on reliability? | Fails on latency? |
|---|---|---|
| `smoke` | Yes | No (timings still reported) |
| `load` / `local` / `ci` / `stress` / `soak` | Yes | Yes (1× tiers) |
| `coverage` | Yes | Yes (1.5× tiers) |

## Reliability gates

| Gate | Limit |
|---|---|
| `transport_error_rate` | `< 1%` |
| `application_error_rate` | `< 1%` |
| `checks` | `> 99%` |
| `journey_success` | `> 98%` |
| `heartbeat_success` | `> 99%` |

## Latency tiers (load)

| Tier | p95 | p99 | Examples |
|---|---|---|---|
| **Interactive** | 1.5s | 3s | venue, music/heartbeat, events |
| **Browse** | 2s | 4s | social / discovery |
| **Write** | 3.5s | 5s | chat / runtime mutations |
| **Heavy** | 5s | 8s | profile / media / onboarding |

WARN in reports when an endpoint reaches **85%** of its SLO (budget burn).

## Changing SLOs

Edit only `src/slo.js` (`LATENCY_TIERS` / `RELIABILITY_THRESHOLDS`).  
`config/environments.js` and `src/reporting.js` consume that module — do not fork numbers elsewhere.
