# Final NiteOut User Journey

## Phase A — once per test (coverage profile only)
- POST /phone-waitinglist
- POST /user/handle/check
- POST /user/handle
- POST /me
- POST /profileImage
- POST /groupChats
- POST /subscribe-to-email-list — intentionally excluded by client

## Phase B — every simulated user session
- GET /bars
- GET /bars/{barId}
- GET /home/playing-songs
- GET /bars/{barId}/queue when the selected venue supports queue
- GET /events/current
- GET /events/{eventId}/rsvp
- GET /users
- GET /user-invite-code
- GET /my-blocked-users
- GET /who-blocked-me
- GET /leaderboard

## Phase C — active venue heartbeat
Every HEARTBEAT_SECONDS (+ configured jitter):
- GET /bars/{barId}/music
- GET /bars/{barId}/getannouncement
- GET /events/{eventId}/rsvp

Optional endpoints that previously returned 0% success remain disabled until the server contract changes:
- GET /bars/stream-info
- GET /bars/{barId}/feed
- GET /djs

## Phase D — controlled runtime writes
- POST /events/{eventId}/rsvp according to RSVP_WRITE_PROBABILITY
- POST /chat/messages according to CHAT_WRITE_PROBABILITY

The default probabilities are intentionally below 100% to avoid modelling every active user as chatting and RSVPing every session.

## Load target
600 VUs + 3 configured venues = deterministic round-robin distribution of 200 VUs per venue.
