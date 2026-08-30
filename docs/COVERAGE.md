# NiteOut Performance Coverage Matrix

## Implemented from documented HTTP contracts

| Meeting expectation | Framework coverage |
|---|---|
| User authentication | Firebase ID token direct or `/tests/token` bootstrap |
| Loading venues | `GET /bars`, `GET /bars/{barId}`, stream info |
| Venue music sync/poll | `GET /home/playing-songs`, `GET /bars/{barId}/music`, queue |
| Venue announcements | `GET /bars/{barId}/getannouncement` in heartbeat |
| Venue feed/state | `GET /bars/{barId}/feed` in heartbeat |
| Events | current event discovery + event profile |
| RSVP state | `GET /events/{eventId}/rsvp`; optional controlled POST |
| Live activity / heartbeat-like event update | optional `POST /events/{eventId}/liveActivity` update |
| Event guests | `GET /event/{eventId}/guests` |
| Venue chat write | optional `POST /chat/messages` |
| User search | `GET /users` |
| DJs | `GET /djs` |
| Invite code | `GET /user-invite-code` |
| Block-list reads | `/my-blocked-users`, `/who-blocked-me` |
| Mini-game leaderboard | `GET /leaderboard` |

## Intentionally not fabricated

The meeting also listed Firebase Realtime Database listeners/state for individual/group chat,
read receipts, typing, music/theme changes, last seen, venue active-user activity, DJ listener data,
followers/followees, follow/unfollow, interests, avatar config, mini-game stats/invites, profile
settings, first-open state, focus/background state, device token and last visited.

It also listed Unity server traffic for transform/animation sync, mini-games, venue music/effects,
announcements, active-user tracking and Spotify top-artists sync.

Those require the actual Firebase paths/security rules and Unity transport/message contract. The
framework contains explicit adapters under `src/adapters/` and should be completed when those
contracts are supplied. Guessing them would make the test technically invalid.
