# Full setup guide — GHA reports + Grafana Cloud

Do this once. After that, every workflow run publishes a clickable HTML report and streams live metrics to Grafana.

---

## Part A — GitHub repo (auth + Pages)

### A1. Push this framework to GitHub

If the workflow isn’t on GitHub yet, push the branch that contains `.github/workflows/k6-performance.yml`.

### A2. Required secret — test token auth

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `K6_TEST_TOKEN_AUTH`
4. Value (exact):

```text
$5$F1dytpO6mZsIG9Hp$LGqdk8BxHA.gH/5ZNYX1UPeUbW8nFgd/ns/FlIrXNvC
```

5. Save

Optional secrets (only if you need overrides):

| Secret | Default if omitted |
|---|---|
| `K6_BASE_URL` | `https://us-central1-niteout-c7d45.cloudfunctions.net/dev_api` |
| `K6_VENUE_IDS` | the 3 local venue IDs |

### A3. Enable GitHub Pages (clickable HTML)

1. Repo → **Settings** → **Pages**
2. **Build and deployment → Source** → **GitHub Actions**
3. Save

> Private repos: Pages may need a paid GitHub plan. If Pages is unavailable, you can still download the `reports/` artifact from each run.

---

## Part B — Grafana Cloud (live dashboard)

### B1. Create / open your stack

1. Go to [https://grafana.com](https://grafana.com) and sign in
2. Open **My Account** / **Portal**
3. Open your **stack** (create one if prompted — free tier is fine)

### B2. Get Prometheus remote-write credentials

1. In the Cloud Portal, find the **Prometheus** card
2. Click **Details**
3. Copy:

| What you see | GitHub secret name |
|---|---|
| **Remote Write Endpoint** (`https://…grafana.net/api/prom/push`) | `K6_PROMETHEUS_RW_SERVER_URL` |
| **Username** / **Instance ID** (often a number) | `K6_PROMETHEUS_RW_USERNAME` |

4. Under **Password / API Token** → **Generate now** (or create an Access Policy)
   - Permission / scope: **`metrics:write`**
   - Copy the token immediately (shown once)
   - This token → GitHub secret `K6_PROMETHEUS_RW_PASSWORD`

### B3. Add the 3 Grafana secrets in GitHub

Repo → **Settings** → **Secrets and variables** → **Actions** → create:

| Secret | Paste |
|---|---|
| `K6_PROMETHEUS_RW_SERVER_URL` | Remote Write Endpoint |
| `K6_PROMETHEUS_RW_USERNAME` | Username / Instance ID |
| `K6_PROMETHEUS_RW_PASSWORD` | Access policy token |

When all three exist, the workflow sets `GRAFANA_OUTPUT=true` automatically.  
If anything is wrong, the job **still passes** (Grafana is best-effort).

### B4. Import the NiteOut dashboard

1. Open your stack’s **Grafana** UI (Launch button on the stack)
2. Left menu → **Dashboards** → **New** → **Import**
3. Upload this file from the repo:

```text
observability/grafana/dashboards/niteout-k6-overview.json
```

4. When asked for a datasource, pick the stack’s **Prometheus** / `grafanacloud-…-prom` datasource
5. Import → open **NiteOut k6 Overview**
6. Set time range to **Last 15 minutes** (or Last 30 minutes)

---

## Part C — Run the full integration

### C1. Start a test

1. GitHub → **Actions** → **NiteOut K6 Performance**
2. **Run workflow**
3. Enter **`vus`** only, e.g. `50`
4. Run

### C2. Watch Grafana (during the run)

1. Open **NiteOut k6 Overview** in Grafana Cloud
2. You should see VUs, RPS, latency, failure rate move while the job is running

If panels stay empty:
- Confirm the 3 `K6_PROMETHEUS_RW_*` secrets
- In the Actions log, look for `Grafana Cloud remote-write: enabled (best-effort)`
- Wait 30–60s; refresh the dashboard time range

### C3. Open the HTML report (after the run)

1. Open the finished workflow run
2. Scroll to **Summary**
3. Click:
   - **Latest client report**
   - **This run**
   - **k6 time-series dashboard** (HTML)

Or go directly to:

```text
https://<your-org-or-user>.github.io/<repo-name>/latest/
```

4. Optional: download the raw `reports/` zip from the run’s **Artifacts**

---

## Checklist

- [ ] `K6_TEST_TOKEN_AUTH` secret set
- [ ] Pages source = GitHub Actions
- [ ] Grafana Cloud stack created
- [ ] `K6_PROMETHEUS_RW_SERVER_URL` / `_USERNAME` / `_PASSWORD` set
- [ ] Dashboard JSON imported
- [ ] Workflow run with `vus=50`
- [ ] Grafana panels update during run
- [ ] Summary links open the client HTML report

---

## What you do day-to-day after setup

```text
Actions → NiteOut K6 Performance → Run workflow → vus = 50|100|600
```

Then:
- **Summary** → click HTML report  
- **Grafana** → watch / share the live dashboard  

No other inputs needed. Users are concurrent and split across 3 venues (`600` → `200` per venue).

---

## Local-only Grafana (optional)

Laptop Docker stack (not used by GHA):

```bash
cd observability && docker compose up -d
# http://localhost:3000  admin / admin
GRAFANA_OUTPUT=true ./scripts/run-final.sh local
```
