import http from 'k6/http';
import { sleep } from 'k6';
import { ENV } from '../../config/environments.js';
import { invoke } from '../swagger-client.js';
import { skippedOperations, journeySuccess, journeyDuration } from '../metrics.js';

const tinyPng = open('../../data/fixtures/1x1.png', 'b');

export const MOBILE_WRITE_TARGETS = [
  'waitinglist',
  'handle-check',
  'handle-update',
  'profile',
  'profile-image',
  'group-chat-image',
  'email-subscribe',
  'rsvp',
  'chat-message',
  'all',
];

function skip(name) { skippedOperations.add(1, { operation: name }); }
function ok(r) { return !!r && r.status >= 200 && r.status < 300; }
function targetEnabled(name) {
  const target = ENV.mobileWriteTarget;
  return ENV.enableWrites && (target === 'all' || target === name);
}
function executionIds() {
  const vu = typeof __VU !== 'undefined' ? __VU : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  return { vu, iter };
}
function uniqueHandle() {
  const { vu, iter } = executionIds();
  return `${ENV.testHandlePrefix}_${vu}_${iter}_${Date.now()}`.replace(/[^A-Za-z0-9_]/g, '').slice(0, 28);
}
function uniquePhone() {
  if (__ENV.K6_TEST_PHONE) return ENV.testPhone;
  const suffix = String(Date.now()).slice(-7);
  return `+1555${suffix}`;
}
function requireValue(value, envName, target) {
  if (!value) throw new Error(`MOBILE_WRITE_TARGET=${target} requires ${envName}.`);
  return value;
}
function logResult(target, operation, response) {
  const status = response?.status || 0;
  let body = '';
  try { body = String(response?.body || '').replace(/\s+/g, ' ').slice(0, 300); } catch (_) {}
  console.log(`[MOBILE WRITE] target=${target} operation="${operation}" status=${status}${body ? ` body=${body}` : ''}`);
}

export function executeMobileWrite(target, token, context = {}) {
  const eventId = context.eventId;
  const venueId = context.venues?.[0] || context.venueIds?.[0] || '';
  const handle = uniqueHandle();
  let operation = '';
  let response = null;

  switch (target) {
    case 'waitinglist':
      operation = 'POST /phone-waitinglist';
      response = invoke(operation, token, {
        body: { phone: uniquePhone() },
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'handle-check':
      operation = 'POST /user/handle/check';
      response = invoke(operation, token, {
        body: { handle },
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'handle-update':
      operation = 'POST /user/handle';
      response = invoke(operation, token, {
        body: { handle },
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'profile':
      operation = 'POST /me';
      response = invoke(operation, token, {
        body: { type: 'USER', firstName: ENV.testFirstName, lastName: ENV.testLastName },
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'profile-image':
      operation = 'POST /profileImage';
      response = invoke(operation, token, {
        multipart: { image: http.file(tinyPng, 'profile.png', 'image/png') },
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'group-chat-image': {
      operation = 'POST /groupChats';
      const groupId = requireValue(ENV.groupId, 'K6_GROUP_ID', target);
      response = invoke(operation, token, {
        multipart: { image: http.file(tinyPng, 'group.png', 'image/png'), groupId },
        params: { apiGroup: 'mobile' },
      });
      break;
    }

    case 'email-subscribe':
      operation = 'POST /subscribe-to-email-list';
      // Swagger defines this endpoint with no request body.
      response = invoke(operation, token, {
        noBody: true,
        params: { apiGroup: 'mobile' },
      });
      break;

    case 'rsvp': {
      operation = 'POST /events/{eventId}/rsvp';
      const id = requireValue(eventId, 'K6_EVENT_ID or a discoverable CURRENT event', target);
      response = invoke(operation, token, {
        path: { eventId: id },
        body: { status: ENV.testRsvpStatus },
        params: { apiGroup: 'mobile' },
      });
      break;
    }

    case 'chat-message': {
      operation = 'POST /chat/messages';
      const barid = requireValue(venueId, 'K6_VENUE_IDS or discoverable bars', target);
      const userUUID = requireValue(ENV.chatUserUuid, 'K6_CHAT_USER_UUID', target);
      response = invoke(operation, token, {
        body: {
          barid,
          environment: ENV.environment,
          timestamp: Date.now(),
          message: (() => { const { vu, iter } = executionIds(); return `${ENV.chatMessagePrefix}-${vu}-${iter}-${Date.now()}`; })(),
          userUUID,
          userName: ENV.chatUserName,
          userProfilePicture: ENV.chatUserProfilePicture,
          userRole: ENV.chatUserRole,
        },
        params: { apiGroup: 'chat' },
      });
      break;
    }

    default:
      throw new Error(`Unknown MOBILE_WRITE_TARGET="${target}". Supported: ${MOBILE_WRITE_TARGETS.join(', ')}`);
  }

  logResult(target, operation, response);
  return ok(response);
}

export function mobileWriteValidationJourney(token, context = {}) {
  const start = Date.now();
  const target = ENV.mobileWriteTarget;
  if (!target || target === 'none') {
    throw new Error(`Set MOBILE_WRITE_TARGET to one of: ${MOBILE_WRITE_TARGETS.filter(x => x !== 'all').join(', ')}`);
  }
  if (!ENV.enableWrites) throw new Error('Mobile write validation requires ENABLE_WRITES=true.');
  if (target === 'all') throw new Error('Use scripts/mobile-write-validator.js with one MOBILE_WRITE_TARGET at a time. Target "all" is only for mobile-complete.js controlled coverage.');

  const success = executeMobileWrite(target, token, context);
  journeySuccess.add(success, { journey: `mobile_write_${target}` });
  journeyDuration.add(Date.now() - start, { journey: `mobile_write_${target}` });
  sleep(0.5);
}

export function mobileCompleteJourney(token, context = {}) {
  const start = Date.now();
  let success = true;

  if (ENV.mobileIncludeReads) {
    success = ok(invoke('GET /bars', token, { params: { apiGroup: 'mobile' } })) && success;
    success = ok(invoke('GET /home/playing-songs', token, { params: { apiGroup: 'mobile' } })) && success;
    success = ok(invoke('GET /users', token, { query: { query: 'a' }, params: { apiGroup: 'mobile' } })) && success;
    success = ok(invoke('GET /leaderboard', token, { query: { gameType: 'All' }, params: { apiGroup: 'mobile' } })) && success;
    success = ok(invoke('GET /user-invite-code', token, { params: { apiGroup: 'mobile' } })) && success;
  }

  // /tests/token is a test utility, not an end-user journey.
  skip('GET /tests/token');

  const writeTargets = MOBILE_WRITE_TARGETS.filter(x => x !== 'all');
  for (const target of writeTargets) {
    if (targetEnabled(target)) {
      try {
        success = executeMobileWrite(target, token, context) && success;
      } catch (e) {
        console.error(`[MOBILE WRITE] target=${target} skipped/fatal prerequisite: ${e.message}`);
        success = false;
      }
    } else {
      const operationByTarget = {
        waitinglist: 'POST /phone-waitinglist',
        'handle-check': 'POST /user/handle/check',
        'handle-update': 'POST /user/handle',
        profile: 'POST /me',
        'profile-image': 'POST /profileImage',
        'group-chat-image': 'POST /groupChats',
        'email-subscribe': 'POST /subscribe-to-email-list',
        rsvp: 'POST /events/{eventId}/rsvp',
        'chat-message': 'POST /chat/messages',
      };
      skip(operationByTarget[target]);
    }
  }

  journeySuccess.add(success, { journey: 'mobile_complete' });
  journeyDuration.add(Date.now() - start, { journey: 'mobile_complete' });
  sleep(1);
}
