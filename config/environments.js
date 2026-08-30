import { thresholdsForProfile } from '../src/slo.js';

function bool(name, fallback='false') { return (__ENV[name] || fallback).toLowerCase() === 'true'; }
function num(name, fallback) { const n=Number(__ENV[name]); return Number.isFinite(n) && n>0 ? n : fallback; }
function ratio(name, fallback) { const n=Number(__ENV[name]); return Number.isFinite(n) && n>=0 && n<=1 ? n : fallback; }

const TEST_PROFILE = (__ENV.TEST_PROFILE || 'load').toLowerCase();

export const ENV = {
  baseUrl: (__ENV.K6_BASE_URL || 'https://us-central1-niteout-c7d45.cloudfunctions.net/dev_api').replace(/\/$/, ''),
  // Static bearer for GET /tests/token (test-utility auth). Prefer this over hand-exporting JWTs.
  testTokenAuth: __ENV.K6_TEST_TOKEN_AUTH || '',
  firebaseToken: __ENV.K6_FIREBASE_TOKEN || '',
  venueIds: (__ENV.K6_VENUE_IDS || '').split(',').map(v=>v.trim()).filter(Boolean),
  queueVenueIds: (__ENV.K6_QUEUE_VENUE_IDS || '').split(',').map(v=>v.trim()).filter(Boolean),
  eventId: __ENV.K6_EVENT_ID || '',
  planId: __ENV.K6_PLAN_ID || '',
  playlistId: __ENV.K6_PLAYLIST_ID || '',
  targetUserId: __ENV.K6_TARGET_USER_ID || '',
  groupId: __ENV.K6_GROUP_ID || '',
  environment: __ENV.K6_ENVIRONMENT || 'performance',
  testUserIdentity: __ENV.K6_TEST_USER_IDENTITY || 'test user (+1 1234567891)',
  totalVUs: num('VUS', 25),
  duration: __ENV.TEST_DURATION || '10m',
  sessionSeconds: num('SESSION_SECONDS', 60),
  heartbeatSeconds: num('HEARTBEAT_SECONDS', 15),
  requestTimeout: __ENV.REQUEST_TIMEOUT || '15s',

  // Safety switches. Reads run by default; writes are deliberately opt-in.
  enableWrites: bool('ENABLE_WRITES'),
  enableOnboardingWrites: bool('ENABLE_ONBOARDING_WRITES'),
  enableProfileWrites: bool('ENABLE_PROFILE_WRITES'),
  enableEventWrites: bool('ENABLE_EVENT_WRITES'),
  enableChatWrites: bool('ENABLE_CHAT_WRITES'),
  enablePlanWrites: bool('ENABLE_PLAN_WRITES'),
  enableRareWrites: bool('ENABLE_RARE_WRITES'),
  enableDestructive: bool('ENABLE_DESTRUCTIVE_WRITES'),
  enableOperatorFlows: bool('ENABLE_OPERATOR_FLOWS'),
  enableAdminFlows: bool('ENABLE_ADMIN_FLOWS'),
  enableIntegrations: bool('ENABLE_INTEGRATION_FLOWS'),

  enableLiveActivity: bool('ENABLE_LIVE_ACTIVITY'),
  enableStreamInfo: bool('ENABLE_STREAM_INFO'),
  enableVenueFeed: bool('ENABLE_VENUE_FEED'),
  enableDjs: bool('ENABLE_DJS'),
  enableQueue: bool('ENABLE_QUEUE','true'),
  enableAnnouncement: bool('ENABLE_ANNOUNCEMENT','true'),
  enableUserSearch: bool('ENABLE_USER_SEARCH','true'),
  heartbeatJitterSeconds: num('HEARTBEAT_JITTER_SECONDS', 2),
  maxBootstrapVenues: num('MAX_BOOTSTRAP_VENUES', 5),
  loadGenerator: (__ENV.LOAD_GENERATOR || 'local').toLowerCase(),
  localMaxVUs: num('LOCAL_MAX_VUS', 100),
  allowHighLocalLoad: bool('ALLOW_HIGH_LOCAL_LOAD'),
  allowSharedWriteIdentity: bool('ALLOW_SHARED_WRITE_IDENTITY'),

  // Test data for controlled write journeys.
  testPhone: __ENV.K6_TEST_PHONE || '+15550000001',
  testEmail: __ENV.K6_TEST_EMAIL || 'niteout-k6@example.invalid',
  testHandlePrefix: __ENV.K6_TEST_HANDLE_PREFIX || 'k6user',
  testFirstName: __ENV.K6_TEST_FIRST_NAME || 'K6',
  testLastName: __ENV.K6_TEST_LAST_NAME || 'LoadTest',
  chatUserUuid: __ENV.K6_CHAT_USER_UUID || '',
  chatUserName: __ENV.K6_CHAT_USER_NAME || 'K6 Load User',
  chatUserProfilePicture: __ENV.K6_CHAT_USER_PROFILE_PICTURE || '',
  chatUserRole: __ENV.K6_CHAT_USER_ROLE || 'USER',
  chatMessagePrefix: __ENV.K6_CHAT_MESSAGE_PREFIX || 'k6-mobile-write',
  testRsvpStatus: __ENV.K6_TEST_RSVP_STATUS || 'GOING',
  mobileWriteTarget: (__ENV.MOBILE_WRITE_TARGET || 'none').toLowerCase(),
  mobileIncludeReads: bool('MOBILE_INCLUDE_READS','true'),

  // Final concatenated journey controls.
  enableRuntimeWrites: bool('ENABLE_RUNTIME_WRITES','true'),
  runRareMobileWritesOnce: bool('RUN_RARE_MOBILE_WRITES_ONCE'),
  excludeEmailSubscribe: bool('EXCLUDE_EMAIL_SUBSCRIBE','true'),
  chatWriteProbability: ratio('CHAT_WRITE_PROBABILITY', 0.20),
  rsvpWriteProbability: ratio('RSVP_WRITE_PROBABILITY', 0.10),

  // Provisional SLOs — single source of truth in src/slo.js
  thresholds: thresholdsForProfile(TEST_PROFILE),
};
export function url(path) { return `${ENV.baseUrl}${path}`; }
