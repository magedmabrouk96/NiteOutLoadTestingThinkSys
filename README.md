# NiteOut k6 Performance Framework

API load tests for the NiteOut mobile journey: auth → venue session → events → social → heartbeat → optional chat/RSVP.

**Start here for changes:** [docs/MAP.md](docs/MAP.md)

## Run locally

```bash
./scripts/run-final.sh smoke        # 1 VU
./scripts/run-final.sh local        # 50 VUs
./scripts/run-final.sh coverage     # 1 VU + rare mobile writes once
./scripts/run-final.sh target-600   # 600 VUs (dedicated generator)

open "$(ls -t reports/final-*-client-report.html | head -1)"
```

Auth: `K6_TEST_TOKEN_AUTH` in `.env` → `GET /tests/token` once per run.  
Users split round-robin across 3 venues (`600` → `200` each).

## GitHub Actions

Actions → **NiteOut K6 Performance** → set **`vus`** only.

| Secret | Required? |
|---|---|
| `K6_TEST_TOKEN_AUTH` | Yes |
| `K6_PROMETHEUS_RW_SERVER_URL` / `_USERNAME` / `_PASSWORD` | Optional (Grafana Cloud) |

Pages: Settings → Pages → Source **GitHub Actions** (clickable HTML in run Summary).  
Setup details: [docs/PUBLISHING.md](docs/PUBLISHING.md)

## Docs (only these)

| Doc | Purpose |
|---|---|
| [MAP.md](docs/MAP.md) | Where to change endpoints / debug |
| [THRESHOLDS.md](docs/THRESHOLDS.md) | Provisional SLO model |
| [PUBLISHING.md](docs/PUBLISHING.md) | Pages + Grafana |
| [REPORTING.md](docs/REPORTING.md) | Report artifacts |

## Notes

- One shared Firebase test identity is enough for API load; multi-token `K6_TOKEN_FILE` only if you need identity-realistic writes.
- `POST /subscribe-to-email-list` is excluded (client confirmation).
