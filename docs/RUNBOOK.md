# NiteOut Performance Runbook

## Gate sequence
1. `k6 run scripts/preflight.js`
2. `k6 run scripts/validate-optional-endpoints.js`
3. smoke
4. 25 VU local
5. 50 VU local
6. 75/100 VU local only if generator remains healthy
7. dedicated 100/250 VU
8. dedicated/distributed 600 VU
9. stress/spike/soak only after baseline load is understood

## Generator-health stop conditions
Stop/invalidate the run if logs contain sustained `network is unreachable`, `can't assign requested address`, or widespread `status=0`/request timeout failures and `transport_error_rate` rises above threshold. Those indicate the generator/network is materially affecting the result.

## Backend stop conditions
If transport is healthy but `application_error_rate`, endpoint checks, or backend latency thresholds fail, preserve the summary and investigate the server/API group.

## Optional endpoint gate
`/bars/stream-info`, `/bars/{barId}/feed`, and `/djs` are opt-in because the supplied high-load result showed zero successes for them. Validate individually first and only then enable them in the main workload.


### Queue capability
Queue support is auto-probed once per selected venue during setup. Do not treat an unsupported venue queue as a journey failure. If the service contract defines supported venues explicitly, set `K6_QUEUE_VENUE_IDS` to a comma-separated list.

### Duration semantics (v4)
`TEST_DURATION` controls the entire ramp profile duration for local/load/stress tests. A `3m` local run uses ramp/hold/ramp-down stages totalling ~3 minutes, followed only by k6 graceful completion time.
