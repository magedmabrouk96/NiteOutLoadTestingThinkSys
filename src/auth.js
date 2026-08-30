import { SharedArray } from 'k6/data';
import { ENV } from '../config/environments.js';

const tokenPool = __ENV.K6_TOKEN_FILE
  ? new SharedArray('niteout-firebase-token-pool', () =>
      open(__ENV.K6_TOKEN_FILE).split(/\r?\n/).map(v=>v.trim()).filter(v=>v && !v.startsWith('#'))
    )
  : null;

export function setupAuthentication() {
  if (tokenPool && tokenPool.length) return { tokens: Array.from(tokenPool), source:'token-file' };
  if (!ENV.firebaseToken) throw new Error('Set K6_FIREBASE_TOKEN to a fresh Firebase ID token, or provide K6_TOKEN_FILE for multi-user load.');
  return { tokens:[ENV.firebaseToken], source:'direct-firebase-token' };
}
export function tokenForVu(authData) {
  const tokens=authData?.tokens||[];
  if(!tokens.length) throw new Error('No Firebase token available');
  return tokens[(__VU-1)%tokens.length];
}
