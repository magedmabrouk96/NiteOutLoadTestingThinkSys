# NiteOut Reporting (v9.3)

Each run produces four outputs:

1. **Client HTML report** (`*-client-report.html`) — primary shareable result. It includes an executive PASS/FAIL banner, highlighted issues, endpoint-level status, provisional threshold vs actual p95/p99, slowest endpoints, quality gates, load configuration, venue scope, and test assumptions.
2. **Engineering k6 dashboard** (`*-dashboard.html`) — time-series charts from the built-in k6 web dashboard.
3. **Detailed JSON** (`*-detailed.json`) — NiteOut-specific machine-readable endpoint results.
4. **Native k6 JSON** (`*-k6-summary.json`) — raw k6 end-of-test summary.

## Status colors

- **Green / PASS**: endpoint has no failures and is comfortably inside the provisional performance threshold.
- **Amber / WATCH**: endpoint is at or above 80% of its p95 or p99 provisional threshold and should be monitored as load increases.
- **Red / FAIL**: endpoint has request failures or breaches its configured p95/p99 provisional threshold.

## Recommended use

- Send the `*-client-report.html` to stakeholders.
- Use the `*-dashboard.html` and Grafana for engineering investigation and time-series analysis.
- Keep both JSON files as CI artifacts and for run-to-run comparisons.

The report explicitly states that concurrent VUs use the single client-provided Firebase test identity and that `POST /subscribe-to-email-list` is excluded per client confirmation.

## v9.4 client-report conventions

- The report always identifies the authenticated test identity as **test user (+1 1234567891)** (configurable with `K6_TEST_USER_IDENTITY`).
- The **API Coverage Matrix** lists all endpoints known to the final journey even when a load profile intentionally does not execute one-time profile/onboarding writes.
- `COVERAGE ONLY` means the endpoint was validated in the single-user coverage run and is intentionally not repeated under concurrent load.
- `EXCLUDED` means the endpoint was removed from scope by explicit client confirmation.
- Response-time limits are labelled **Provisional Performance Thresholds**, not SLAs. They are QA-defined trend/quality gates until the client provides formal performance acceptance criteria.
