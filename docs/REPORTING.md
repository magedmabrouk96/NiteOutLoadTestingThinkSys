# NiteOut Reporting

Each run produces four outputs:

1. **Client HTML report** (`*-client-report.html`) — primary shareable result. It includes an executive PASS/FAIL banner, highlighted issues, **three scope tables** (concurrent load · one-time coverage writes · optional/excluded), endpoint-level status, provisional threshold vs actual p95/p99, slowest endpoints, quality gates, load configuration, venue scope, and test assumptions.
2. **Engineering k6 dashboard** (`*-dashboard.html`) — time-series charts from the built-in k6 web dashboard.
3. **Detailed JSON** (`*-detailed.json`) — NiteOut-specific machine-readable endpoint results.
4. **Native k6 JSON** (`*-k6-summary.json`) — raw k6 end-of-test summary.

## Status colors

- **Green / PASS**: no request failures; within provisional SLO (see `docs/THRESHOLDS.md`).
- **Amber / WATCH**: at or above 85% of the provisional SLO (error-budget burn).
- **Red / FAIL**: request failures, or latency SLO breached (load/coverage only — smoke does not fail on latency).
- A separate table lists **HTTP status codes other than 200** (timeouts, other 2xx, 4xx/5xx) with counts per endpoint.

## Recommended use

- Send the `*-client-report.html` to stakeholders.
- Use the `*-dashboard.html` and Grafana for engineering investigation and time-series analysis.
- Keep both JSON files as CI artifacts and for run-to-run comparisons.

The report explicitly states that concurrent VUs use the single client-provided Firebase test identity and that `POST /subscribe-to-email-list` is excluded per client confirmation.

## v9.4 client-report conventions

- The report always identifies the authenticated test identity as **test user (+1 1234567891)** (configurable with `K6_TEST_USER_IDENTITY`).
- The **Load Journey** table lists only concurrent-load endpoints (plus excluded email). Ones with calls &gt; 0 were executed this run. Onboarding/profile writes belong to the `coverage` profile, not concurrent load.
- `EXCLUDED` means the endpoint was removed from scope by explicit client confirmation.
- Response-time limits are labelled **Provisional SLO Gates**, not contractual SLAs. Model and numbers live in `src/slo.js` / `docs/THRESHOLDS.md`.
