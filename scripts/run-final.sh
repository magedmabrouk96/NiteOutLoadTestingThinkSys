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
  echo "ERROR: .env.${PROFILE} not found. Use: smoke | coverage | local | target-600" >&2
  exit 1
fi
set +a

if [[ -z "${K6_FIREBASE_TOKEN:-}" && -z "${K6_TOKEN_FILE:-}" ]]; then
  echo 'ERROR: export K6_FIREBASE_TOKEN="<fresh Firebase token>" before running.' >&2
  exit 1
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
echo "Venues: ${K6_VENUE_IDS}"
echo "Detailed JSON: ${K6_DETAILED_JSON}"
echo "Native k6 JSON: ${NATIVE_JSON}"
echo "Client HTML report: ${CLIENT_REPORT}"
if [[ "${REPORT_HTML:-true}" == "true" ]]; then echo "Engineering dashboard: ${DASHBOARD_REPORT}"; fi
if [[ "${GRAFANA_OUTPUT:-false}" == "true" ]]; then echo "Grafana/Prometheus streaming: ${K6_PROMETHEUS_RW_SERVER_URL}"; fi
echo "================================================================================"

if [[ "${GRAFANA_OUTPUT:-false}" == "true" ]]; then
  k6 run -o experimental-prometheus-rw --summary-export="$NATIVE_JSON" scripts/final-user-journey.js
else
  k6 run --summary-export="$NATIVE_JSON" scripts/final-user-journey.js
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
