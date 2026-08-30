/*
NiteOut meeting coverage adapter for Firebase Realtime Database / listeners.

Expected app behaviours include profile/event loads, RSVP state, individual/group/venue chat,
read receipts, typing state, music/theme changes, last-seen, DJ data, followers/followees,
interests, block lists, avatar config, mini-game stats/invites, app-focus state, device token,
profile settings, first-open flags, and last-visited state.

These cannot be implemented safely from the HTTP OpenAPI because the actual Firebase database
paths, security rules and listener protocol/path mapping are not present. Add the real paths from
the client implementation before enabling Firebase load. Do not invent RTDB paths.
*/
export const FIREBASE_REALTIME_IMPLEMENTED = false;
