# Provisional SLO model

Single source of truth: [`src/slo.js`](../src/slo.js).

## Design (standard perf practice)

1. **Reliability first** — errors, journey, heartbeat, checks must pass on every profile.
2. **Latency by criticality** — tighter for interactive path, looser for writes/uploads.
3. **Profile selects severity** — smoke never fails CI on latency noise.
4. **Provisional** — QA trend gates sized to the concurrent load model (multi-venue + heartbeat + chat/RSVP every lap), until the client signs formal SLAs.

## Profiles

| Profile | Fails on reliability? | Fails on latency? |
|---|---|---|
| `smoke` | Yes | No (timings still reported) |
| `load` / `local` / `ci` / `stress` / `soak` | Yes | Yes (1× tiers) |
| `coverage` | Yes | Yes (1.5× tiers) |

## Reliability gates (do not relax)

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
| **Interactive** | 3s | 5s | venue, music/heartbeat, events |
| **Browse** | 2.5s | 5s | social / discovery |
| **Write** | 5s | 8s | chat / RSVP mutations |
| **Heavy** | 5s | 8s | profile / media / onboarding |

WARN in reports when an endpoint reaches **85%** of its latency SLO (budget burn).

Per-endpoint request failures are graded by **rate**, not absolute count:

| Fail rate | Report |
|---|---|
| `< 0.5%` | PASS (noise OK — e.g. 10 / 43k) |
| `≥ 0.5%` | WARN |
| `≥ 1%` | FAIL (matches overall `application_error_rate`) |

## Changing SLOs

Edit only `src/slo.js` (`LATENCY_TIERS` / `RELIABILITY_THRESHOLDS`).  
`config/environments.js` and `src/reporting.js` consume that module — do not fork numbers elsewhere.
