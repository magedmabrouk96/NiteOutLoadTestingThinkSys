# NiteOut k6 Final User-Journey Framework v8

This is the consolidated requirement-ready NiteOut performance framework.

## What one execution does

The single entry point `scripts/final-user-journey.js` models the complete REST/API user session in this order:

1. Session/bootstrap reads: bars, selected venue details, playing songs, supported venue queue.
2. Event state: current events and RSVP state; controlled RSVP writes when selected by probability.
3. Social/discovery: users, invite code, blocked users, who-blocked-me, leaderboard.
4. Active venue session / heartbeat: music + announcement + event RSVP state every configured heartbeat interval with jitter.
5. Controlled runtime chat write.
6. Optional one-time Mobile coverage phase: waiting list, handle check/update, profile, profile image and group-chat image. Email subscription is excluded per client confirmation.

The one-time Mobile coverage operations run only with the `coverage` profile. They do not repeat during normal load.

## Authentication

Every run bootstraps auth once in k6 `setup()` via `GET /tests/token`, using `K6_TEST_TOKEN_AUTH` from `.env`. The returned Firebase JWT is shared by all VUs for the suite.

```bash
# Already set in .env (single-quoted — value contains $ characters):
# K6_TEST_TOKEN_AUTH='$5$...'
```

Optional overrides if you need them:

```bash
export K6_FIREBASE_TOKEN="<fresh Firebase ID token>"   # skip /tests/token
# or
export K6_TOKEN_FILE=./tokens.txt                      # multi-user pool
```

All other known configuration/test data is already in `.env`.

## Run

```bash
./scripts/run-final.sh smoke
./scripts/run-final.sh coverage
./scripts/run-final.sh local
./scripts/run-final.sh target-600
```

Reports are written to `reports/final-<profile>-<timestamp>.*`.

### GitHub Actions

Manual workflow: **NiteOut K6 Performance** (Actions → Run workflow).

| Input | Role |
|---|---|
| `vus` | Total concurrent users — split round-robin across the 3 venues (`≈ vus/3` each) |
| `duration` | Ramp/hold length (`7m`, `30m`, …) |
| `session_seconds` / `heartbeat_seconds` | Per-iteration session model |
| `enable_runtime_writes` | Probabilistic chat/RSVP writes |
| `allow_high_ci_load` | Required if `vus > 100` on `ubuntu-latest` |

**Secret required:** `K6_TEST_TOKEN_AUTH` (same static bearer used for `GET /tests/token`).

Optional secrets: `K6_BASE_URL`, `K6_VENUE_IDS` (defaults to the three local venues), `K6_EVENT_ID`, `K6_GROUP_ID`, `K6_CHAT_USER_UUID`.

Examples: `vus=50` → ~17/venue; `vus=100` → ~33/venue; `vus=600` → 200/venue (set `allow_high_ci_load=true`; prefer a dedicated generator for 600).

Artifacts upload the `reports/` folder (client HTML + detailed JSON + k6 summary).

## Client target

`.env.target-600` is configured for 600 concurrent sessions across the three venue IDs in `.env`. `venueForVu()` distributes VUs round-robin, producing 200 VUs per venue when VUS=600 and three venue IDs are configured.

## Important identity note

A single `K6_TEST_TOKEN_AUTH` / `K6_FIREBASE_TOKEN` means all VUs authenticate as the same Firebase test identity. This is enough for endpoint/load generation, but a production-representative 600-user write test should use `K6_TOKEN_FILE` with multiple test-user Firebase tokens if the client can provide them.

## Excluded endpoint

`POST /subscribe-to-email-list` is excluded because the client confirmed the current app flow does not enforce email collection and the endpoint is not relevant to the performance scope.

## Non-Swagger boundary

The framework fully covers the in-scope REST/API user journey. Direct Firebase RTDB subscriptions and Unity realtime protocol traffic can only be added if their non-REST contracts are supplied separately; they are not invented here.

## Final reporting

Every final run now produces:

1. a detailed endpoint-by-endpoint console table (calls, pass/fail, pass %, avg, p95, p99, max),
2. a machine-readable detailed JSON result,
3. the native k6 JSON summary,
4. a self-contained HTML web-dashboard report (when supported by the installed k6 version), and
5. optional Prometheus/Grafana streaming using the included `observability/` stack.

See `docs/REPORTING.md`.
