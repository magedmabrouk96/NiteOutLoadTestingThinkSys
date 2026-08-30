/*
NiteOut meeting coverage adapter for Unity transport.

Expected behaviours: transform sync, animation sync, mini-game management, venue music sync,
venue effects, announcements, active-user tracking, and Spotify top-artists sync.

The supplied material does not define the Unity endpoint, WebSocket/TCP protocol, message schema,
heartbeat interval, or authentication handshake. Keep this adapter disabled until that contract is
provided, then model it as a dedicated k6 WebSocket scenario rather than HTTP guessing.
*/
export const UNITY_IMPLEMENTED = false;
