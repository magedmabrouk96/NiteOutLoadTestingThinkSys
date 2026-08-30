#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-local}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found" >&2
  exit 1
fi

set -a
source .env
if [[ -f ".env.${PROFILE}" ]]; then
  source ".env.${PROFILE}"
else
  echo "ERROR: .env.${PROFILE} not found. Use: smoke | coverage | local | target-600 | ci" >&2
  exit 1
fi
set +a

# Auth priority (resolved inside k6 setup):
#   1) K6_TOKEN_FILE  2) K6_TEST_TOKEN_AUTH → GET /tests/token  3) K6_FIREBASE_TOKEN
if [[ -z "${K6_FIREBASE_TOKEN:-}" && -z "${K6_TOKEN_FILE:-}" && -z "${K6_TEST_TOKEN_AUTH:-}" ]]; then
  echo 'ERROR: set K6_TEST_TOKEN_AUTH in .env (auto-fetches JWT via GET /tests/token),' >&2
  echo '       or export K6_FIREBASE_TOKEN / K6_TOKEN_FILE.' >&2
  exit 1
fi

if [[ -n "${K6_TOKEN_FILE:-}" ]]; then
  AUTH_MODE="token-file (${K6_TOKEN_FILE})"
elif [[ -n "${K6_TEST_TOKEN_AUTH:-}" ]]; then
  AUTH_MODE="GET /tests/token (K6_TEST_TOKEN_AUTH)"
  if [[ -n "${K6_FIREBASE_TOKEN:-}" ]]; then
    echo "NOTE: K6_FIREBASE_TOKEN is set in this shell but will be ignored; /tests/token wins." >&2
  fi
elif [[ -n "${K6_FIREBASE_TOKEN:-}" ]]; then
  AUTH_MODE="direct K6_FIREBASE_TOKEN"
fi

# Round-robin venue split (same as src/data.js venueForVu).
VENUE_COUNT=0
VENUE_SPLIT_MSG="(no K6_VENUE_IDS configured — setup will discover)"
if [[ -n "${K6_VENUE_IDS:-}" ]]; then
  IFS=',' read -r -a _VENUES <<< "${K6_VENUE_IDS}"
  VENUE_COUNT=${#_VENUES[@]}
  if (( VENUE_COUNT > 0 )); then
    _per=$(( VUS / VENUE_COUNT ))
    _rem=$(( VUS % VENUE_COUNT ))
    VENUE_SPLIT_MSG="~${_per}/venue across ${VENUE_COUNT} venues (+${_rem} remainder via round-robin)"
  fi
fi

mkdir -p reports
STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_ID="${PROFILE}-${STAMP}"
export K6_RUN_ID="$RUN_ID"
export K6_DETAILED_JSON="reports/final-${RUN_ID}-detailed.json"
NATIVE_JSON="reports/final-${RUN_ID}-k6-summary.json"
CLIENT_REPORT="reports/final-${RUN_ID}-client-report.html"
DASHBOARD_REPORT="reports/final-${RUN_ID}-dashboard.html"
export K6_CLIENT_HTML="$CLIENT_REPORT"

# Built-in k6 web dashboard: live at localhost:5665 during the run and exported
# as a self-contained HTML artifact at the end. Disable with REPORT_HTML=false.
if [[ "${REPORT_HTML:-true}" == "true" ]]; then
  export K6_WEB_DASHBOARD=true
  export K6_WEB_DASHBOARD_OPEN=false
  export K6_WEB_DASHBOARD_PERIOD="${K6_WEB_DASHBOARD_PERIOD:-2s}"
  export K6_WEB_DASHBOARD_EXPORT="$DASHBOARD_REPORT"
fi

if [[ "${GRAFANA_OUTPUT:-false}" == "true" ]]; then
  export K6_PROMETHEUS_RW_SERVER_URL="${K6_PROMETHEUS_RW_SERVER_URL:-http://localhost:9090/api/v1/write}"
  export K6_PROMETHEUS_RW_TREND_STATS="${K6_PROMETHEUS_RW_TREND_STATS:-p(90),p(95),p(99),min,max}"
  export K6_PROMETHEUS_RW_STALE_MARKERS="${K6_PROMETHEUS_RW_STALE_MARKERS:-true}"
fi

echo "================================================================================"
echo "NiteOut final journey | run=${RUN_ID} | profile=${PROFILE} | VUS=${VUS}"
echo "duration=${TEST_DURATION} | session=${SESSION_SECONDS}s | heartbeat=${HEARTBEAT_SECONDS}s"
echo "Auth: ${AUTH_MODE}"
echo "Venues: ${K6_VENUE_IDS}"
echo "Venue split: ${VENUE_SPLIT_MSG}"
echo "Detailed JSON: ${K6_DETAILED_JSON}"
echo "Native k6 JSON: ${NATIVE_JSON}"
echo "Client HTML report: ${CLIENT_REPORT}"
if [[ "${REPORT_HTML:-true}" == "true" ]]; then echo "Engineering dashboard: ${DASHBOARD_REPORT}"; fi
if [[ "${GRAFANA_OUTPUT:-false}" == "true" ]]; then echo "Grafana/Prometheus streaming: ${K6_PROMETHEUS_RW_SERVER_URL}"; fi
echo "================================================================================"

thresholds_breached() {
  local summary="$1"
  [[ -f "$summary" ]] || return 1
  python3 - "$summary" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
# In k6 summary JSON, a threshold entry of true means the threshold was crossed (failed).
for metric in (data.get("metrics") or {}).values():
    for crossed in (metric.get("thresholds") or {}).values():
        if crossed is True:
            sys.exit(0)
sys.exit(1)
PY
}

run_k6() {
  local with_grafana="${1:-false}"
  if [[ "$with_grafana" == "true" ]]; then
    k6 run -o experimental-prometheus-rw --summary-export="$NATIVE_JSON" scripts/final-user-journey.js
  else
    k6 run --summary-export="$NATIVE_JSON" scripts/final-user-journey.js
  fi
}

if [[ "${GRAFANA_OUTPUT:-false}" == "true" ]]; then
  echo "Grafana remote-write: enabled (best-effort — publish failures will not fail this run)"
  set +e
  run_k6 true
  K6_EXIT=$?
  set -e

  if [[ "$K6_EXIT" -ne 0 ]]; then
    if thresholds_breached "$NATIVE_JSON"; then
      echo "k6 failed due to breached thresholds (exit ${K6_EXIT})"
      exit "$K6_EXIT"
    fi
    if [[ ! -f "$NATIVE_JSON" ]]; then
      echo "WARN: Grafana remote-write likely failed before results were written; retrying without Grafana..." >&2
      run_k6 false
    else
      echo "WARN: k6 exited ${K6_EXIT} but no thresholds were breached — treating as Grafana publish issue; not failing the job." >&2
    fi
  fi
else
  run_k6 false
fi

echo
echo "Artifacts for run ${RUN_ID}:"
echo "  - ${K6_DETAILED_JSON}"
echo "  - ${NATIVE_JSON}"
echo "  - ${CLIENT_REPORT}"
if [[ "${REPORT_HTML:-true}" == "true" ]]; then
  if [[ -f "$DASHBOARD_REPORT" ]]; then echo "  - ${DASHBOARD_REPORT}"; else echo "  - Engineering dashboard was not produced (check k6 web-dashboard support/version)."; fi
fi

echo
echo "Open client report:"
echo "  open \"${CLIENT_REPORT}\""
