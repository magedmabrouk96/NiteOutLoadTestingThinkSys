/**
 * NiteOut performance SLO model (provisional until client-approved).
 *
 * Aligned with common perf-testing practice:
 * - Reliability gates first (availability / correctness)
 * - Latency SLOs by user-facing criticality (interactive → browse → write → heavy)
 * - Profile selects which gates fail the run (smoke = reliability only)
 *
 * Labels in reports: "Provisional SLO" — not contractual client SLAs.
 */

/** Always-on correctness / availability gates (smoke + load + coverage). */
export const RELIABILITY_THRESHOLDS = {
  transport_error_rate: ['rate<0.01'],       // <1% transport / generator failures
  application_error_rate: ['rate<0.01'],     // <1% non-2xx application responses
  checks: ['rate>0.99'],                     // assertion pass rate
  journey_success: ['rate>0.98'],            // end-to-end journey success
  heartbeat_success: ['rate>0.99'],          // in-venue poll success
};

/**
 * Latency tiers by criticality (ms).
 *
 * Sized for the agreed concurrent load model: multi-venue VUs with heartbeat
 * polls plus chat + RSVP every session lap. Values are provisional QA gates
 * (observed p95/p99 + headroom), not client-signed contractual SLAs.
 *
 * Interactive = hot path (venue / music / events)
 * Browse      = social / discovery
 * Write       = chat / RSVP mutations
 * Heavy       = rare profile / media / onboarding
 */
export const LATENCY_TIERS = {
  interactive: { p95: 3000, p99: 5000, label: 'Interactive (venue / heartbeat / events)' },
  browse: { p95: 2500, p99: 5000, label: 'Browse (social / discovery)' },
  write: { p95: 5000, p99: 8000, label: 'Write (chat / runtime mutations)' },
  heavy: { p95: 5000, p99: 8000, label: 'Heavy (profile / media / onboarding)' },
};

/** api_group → tier (must match tags used in http calls). */
export const API_GROUP_TIER = {
  venue: 'interactive',
  music: 'interactive',
  events: 'interactive',
  social: 'browse',
  chat: 'write',
  mobile: 'heavy',
  profile: 'heavy',
};

/** Endpoint id → tier for client-report assessment (mirrors API groups). */
export const ENDPOINT_TIER = {
  get_bars: 'interactive',
  get_bar: 'interactive',
  get_playing_songs: 'interactive',
  get_queue: 'interactive',
  get_music: 'interactive',
  get_announcement: 'interactive',
  setup_events: 'interactive',
  get_current_events: 'interactive',
  get_event_rsvp: 'interactive',
  post_event_rsvp: 'write',
  get_users: 'browse',
  get_invite_code: 'browse',
  get_blocked: 'browse',
  get_who_blocked: 'browse',
  get_leaderboard: 'browse',
  post_chat: 'write',
  post_waitinglist: 'heavy',
  post_handle_check: 'heavy',
  post_handle: 'heavy',
  post_profile: 'heavy',
  post_profile_image: 'heavy',
  post_group_chat_image: 'heavy',
};

function latencyThresholdsFromTiers(multiplier = 1) {
  const out = {};
  for (const [group, tierName] of Object.entries(API_GROUP_TIER)) {
    const tier = LATENCY_TIERS[tierName];
    const p95 = Math.round(tier.p95 * multiplier);
    const p99 = Math.round(tier.p99 * multiplier);
    out[`http_req_duration{api_group:${group}}`] = [`p(95)<${p95}`, `p(99)<${p99}`];
  }
  return out;
}

/**
 * Build k6 thresholds object for a test profile.
 * - smoke: reliability only (latency reported, does not fail CI)
 * - load / local / stress / soak: reliability + latency SLOs
 * - coverage: reliability + 1.5× latency (functional contract, slower writes OK)
 */
export function thresholdsForProfile(profile) {
  const p = String(profile || 'load').toLowerCase();

  if (p === 'smoke') {
    return { ...RELIABILITY_THRESHOLDS };
  }

  if (p === 'coverage') {
    return {
      ...RELIABILITY_THRESHOLDS,
      ...latencyThresholdsFromTiers(1.5),
    };
  }

  // load, local, stress, soak, ci, target-600, default
  return {
    ...RELIABILITY_THRESHOLDS,
    ...latencyThresholdsFromTiers(1),
  };
}

/** Reporting helper: provisional SLO band for an endpoint, or null if N/A for profile. */
export function sloForEndpoint(endpointId, profile) {
  const p = String(profile || 'load').toLowerCase();
  if (p === 'smoke') return null; // smoke does not grade latency

  const tierName = ENDPOINT_TIER[endpointId];
  if (!tierName) return null;

  const tier = LATENCY_TIERS[tierName];
  const mult = p === 'coverage' ? 1.5 : 1;
  return {
    p95: Math.round(tier.p95 * mult),
    p99: Math.round(tier.p99 * mult),
    label: tier.label,
    tier: tierName,
  };
}

/** WARN when at or above this fraction of the latency SLO (budget burn). */
export const SLO_WARN_RATIO = 0.85;

/**
 * Per-endpoint request failure budget for client-report grading.
 * Matches overall application_error_rate (<1%). A handful of failures across
 * tens of thousands of calls must not paint the whole endpoint FAIL.
 */
export const ENDPOINT_FAIL_RATE_FAIL = 0.01;   // ≥1% → FAIL
export const ENDPOINT_FAIL_RATE_WARN = 0.005;  // ≥0.5% → WARN
