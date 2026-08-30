import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { ENV, url } from '../config/environments.js';
import { tokenDuration } from './metrics.js';

const tokenPool = __ENV.K6_TOKEN_FILE
  ? new SharedArray('niteout-firebase-token-pool', () =>
      open(__ENV.K6_TOKEN_FILE).split(/\r?\n/).map(v=>v.trim()).filter(v=>v && !v.startsWith('#'))
    )
  : null;

/**
 * Bootstrap a fresh Firebase ID token from GET /tests/token.
 * Called once in setup() before VUs start; the returned JWT is shared by all sessions.
 */
function fetchTokenViaTestEndpoint() {
  if (!ENV.testTokenAuth) return null;

  const res = http.get(url('/tests/token'), {
    timeout: ENV.requestTimeout,
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${ENV.testTokenAuth}`,
    },
    tags: { endpoint: '/tests/token', api_group: 'auth', name: 'GET /tests/token' },
  });

  tokenDuration.add(res.timings.duration);

  if (!res || res.status < 200 || res.status >= 300) {
    throw new Error(
      `GET /tests/token failed: status=${res?.status ?? 'n/a'} body=${String(res?.body || '').slice(0, 300)}`
    );
  }

  let body;
  try {
    body = res.json();
  } catch (_) {
    throw new Error('GET /tests/token returned a non-JSON body');
  }

  const token = body && body.token;
  if (!token || typeof token !== 'string') {
    throw new Error('GET /tests/token response missing a usable token field');
  }

  console.log(
    `Auth: acquired Firebase ID token via GET /tests/token (expiresIn=${body.expiresIn || 'unknown'})`
  );
  return { token, expiresIn: body.expiresIn || null };
}

export function setupAuthentication() {
  if (tokenPool && tokenPool.length) {
    return { tokens: Array.from(tokenPool), source: 'token-file' };
  }

  // Prefer a fresh mint from GET /tests/token whenever K6_TEST_TOKEN_AUTH is set.
  // A leftover K6_FIREBASE_TOKEN in the shell must not silently override this.
  const fetched = fetchTokenViaTestEndpoint();
  if (fetched) {
    if (ENV.firebaseToken) {
      console.log('Auth: ignoring K6_FIREBASE_TOKEN because K6_TEST_TOKEN_AUTH is set (fresh /tests/token wins)');
    }
    return {
      tokens: [fetched.token],
      source: 'tests-token-endpoint',
      expiresIn: fetched.expiresIn,
    };
  }

  if (ENV.firebaseToken) {
    return { tokens: [ENV.firebaseToken], source: 'direct-firebase-token' };
  }

  throw new Error(
    'Set K6_TEST_TOKEN_AUTH (preferred — auto GET /tests/token), K6_FIREBASE_TOKEN, or K6_TOKEN_FILE.'
  );
}

export function tokenForVu(authData) {
  const tokens = authData?.tokens || [];
  if (!tokens.length) throw new Error('No Firebase token available');
  return tokens[(__VU - 1) % tokens.length];
}
