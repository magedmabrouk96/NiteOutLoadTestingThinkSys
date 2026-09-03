# NiteOut k6 Performance Framework

API load tests for the NiteOut mobile user journey against the [dev REST API](https://us-central1-niteout-c7d45.cloudfunctions.net/dev_api/docs/).

**Start here for changes:** [docs/MAP.md](docs/MAP.md)

---

## User journey covered

Each virtual user (VU) runs one **session lap**, then repeats until the test duration ends. VUs are split **round-robin across 3 venues** (e.g. 600 users → ~200 per venue).

Auth is bootstrapped **once per run** via `GET /tests/token` (`K6_TEST_TOKEN_AUTH`). All VUs share that Firebase JWT for API load generation.

Implementation: `src/journeys/final-user-journey.js` + `src/journeys/heartbeat.js`.

### Session lap (in order)

#### 0 — Setup (once per run, not per VU)

| Step | Method | Endpoint |
|---|---|---|
| Mint Firebase ID token | `GET` | `/tests/token` |
| Resolve venues / event / queue capability | `GET` | `/bars`, `/events?filter=CURRENT`, queue probes |

#### 1 — Open app / enter venue

| Step | Method | Endpoint | Notes |
|---|---|---|---|
| List venues | `GET` | `/bars` | |
| Open assigned venue | `GET` | `/bars/{barId}` | One of 3 configured venues |
| What’s playing | `GET` | `/home/playing-songs` | |
| Venue queue | `GET` | `/bars/{barId}/queue` | Only if queue supported for that venue |

#### 2 — Events

| Step | Method | Endpoint | Notes |
|---|---|---|---|
| Current events | `GET` | `/events/current` | |
| RSVP state | `GET` | `/events/{eventId}/rsvp` | |
| Set RSVP | `POST` | `/events/{eventId}/rsvp` | **Every lap** when `ENABLE_RUNTIME_WRITES=true` |

#### 3 — Social / discovery

| Step | Method | Endpoint |
|---|---|---|
| Search users | `GET` | `/users` |
| Invite code | `GET` | `/user-invite-code` |
| My blocked users | `GET` | `/my-blocked-users` |
| Who blocked me | `GET` | `/who-blocked-me` |
| Mini-game leaderboard | `GET` | `/leaderboard` |

#### 4 — Stay in venue (heartbeat)

For `SESSION_SECONDS` (e.g. 60s local / 120s at 600 VUs), poll every `HEARTBEAT_SECONDS` (~15s + jitter):

| Step | Method | Endpoint |
|---|---|---|
| Current track | `GET` | `/bars/{barId}/music` |
| Announcement | `GET` | `/bars/{barId}/getannouncement` |
| RSVP again | `GET` | `/events/{eventId}/rsvp` |

This repeating poll is why one lap is typically **~25–30+ HTTP calls**.

#### 5 — Venue chat

| Step | Method | Endpoint | Notes |
|---|---|---|---|
| Send venue chat | `POST` | `/chat/messages` | **Every lap** when `ENABLE_RUNTIME_WRITES=true` |

#### 6 — Pause and repeat

Short sleep (1–3s), then start another lap until the test ends.

### Flow (summary)

```
GET /tests/token  (once)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  Per VU lap                                                │
│  GET /bars → /bars/{id} → /home/playing-songs → [/queue] │
│  GET /events/current → /events/{id}/rsvp → POST RSVP     │
│  GET /users → invite → blocked → who-blocked → leaderboard│
│  loop ~15s for SESSION_SECONDS:                           │
│       music → announcement → rsvp                         │
│  POST /chat/messages  (every lap)                         │
│  sleep → repeat                                           │
└───────────────────────────────────────────────────────────┘
```

### Coverage-only writes (not under concurrent load)

Run with `./scripts/run-final.sh coverage` — executed **once** at startup, not by every VU:

| Method | Endpoint |
|---|---|
| `POST` | `/phone-waitinglist` |
| `POST` | `/user/handle/check` |
| `POST` | `/user/handle` |
| `POST` | `/me` |
| `POST` | `/profileImage` |
| `POST` | `/groupChats` |

### Excluded

| Method | Endpoint | Reason |
|---|---|---|
| `POST` | `/subscribe-to-email-list` | Client confirmation — not part of current app flow |

### Pass criteria per call

Every journey call must return **HTTP 2xx** within the request timeout (`src/http.js`). Timeouts (`status=0`) and 4xx/5xx count as failures. Run-level gates: [docs/THRESHOLDS.md](docs/THRESHOLDS.md).

---

## Run locally

```bash
./scripts/run-final.sh smoke        # 1 VU
./scripts/run-final.sh local        # 50 VUs
./scripts/run-final.sh coverage     # 1 VU + rare mobile writes once
./scripts/run-final.sh target-600   # 600 VUs (dedicated generator)

open "$(ls -t reports/final-*-client-report.html | head -1)"
```

Auth: `K6_TEST_TOKEN_AUTH` in `.env` → `GET /tests/token` once per run.

## GitHub Actions

Actions → **NiteOut K6 Performance** → set **`vus`** only.

| Secret | Required? |
|---|---|
| `K6_TEST_TOKEN_AUTH` | Yes |
| `K6_PROMETHEUS_RW_SERVER_URL` / `_USERNAME` / `_PASSWORD` | Optional (Grafana Cloud) |

Pages: Settings → Pages → Source **GitHub Actions** (clickable HTML in run Summary).  
Setup details: [docs/PUBLISHING.md](docs/PUBLISHING.md)

## Docs

| Doc | Purpose |
|---|---|
| [MAP.md](docs/MAP.md) | Where to change endpoints / debug |
| [THRESHOLDS.md](docs/THRESHOLDS.md) | Provisional SLO model |
| [PUBLISHING.md](docs/PUBLISHING.md) | Pages + Grafana |
| [REPORTING.md](docs/REPORTING.md) | Report artifacts |

## Notes

- One shared Firebase test identity is enough for API load; multi-token `K6_TOKEN_FILE` only if you need identity-realistic writes.
- Latency gates are **provisional QA SLOs**, not client-signed contractual SLAs, until agreed.
