# Requirement Mapping

## In-scope Mobile REST operations
Validated and represented in the final flow:
- GET /bars
- GET /home/playing-songs
- GET /users
- GET /leaderboard
- GET /user-invite-code
- POST /phone-waitinglist (coverage profile, once)
- POST /user/handle/check (coverage profile, once)
- POST /user/handle (coverage profile, once)
- POST /me (coverage profile, once)
- POST /profileImage (coverage profile, once)
- POST /groupChats (coverage profile, once; client groupId in .env)
- POST /events/{eventId}/rsvp (coverage once + controlled runtime probability)
- POST /chat/messages (coverage once + controlled runtime probability)
- POST /subscribe-to-email-list (excluded by client from current app flow)
- GET /tests/token (test utility; called once in setup via K6_TEST_TOKEN_AUTH to mint the Firebase JWT used by the suite)

## Additional user-session REST coverage
- GET /bars/{barId}
- GET /bars/{barId}/queue for auto-probed supported venues
- GET /bars/{barId}/music
- GET /bars/{barId}/getannouncement
- GET /events/current
- GET /events/{eventId}/rsvp
- GET /my-blocked-users
- GET /who-blocked-me

## Heartbeat
Every HEARTBEAT_SECONDS (+ jitter) while the simulated user remains active in a venue:
- venue music state
- venue announcement state
- event RSVP state

## Disabled optional endpoints
These remain disabled because earlier direct validation showed no successful responses:
- GET /bars/stream-info
- GET /bars/{barId}/feed
- GET /djs

## 600-user target
The configured 3 venue IDs are selected round-robin by VU number. With 600 VUs this yields 200 concurrent VUs per venue.
