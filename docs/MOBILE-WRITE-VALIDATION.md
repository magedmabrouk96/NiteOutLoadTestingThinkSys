# Mobile write validation

The Mobile Swagger tag contains nine user-write operations. Validate them one at a time before adding any to a concurrent workload.

## Common environment

```bash
export K6_BASE_URL="https://us-central1-niteout-c7d45.cloudfunctions.net/dev_api"
export K6_FIREBASE_TOKEN="<fresh Firebase ID token>"
export ENABLE_WRITES=true
```

Run exactly one target:

```bash
k6 run -e MOBILE_WRITE_TARGET=handle-check scripts/mobile-write-validator.js
```

Supported targets:

| Target | Swagger operation | Extra test data |
|---|---|---|
| `waitinglist` | `POST /phone-waitinglist` | Optional `K6_TEST_PHONE`; otherwise a unique E.164-like test number is generated |
| `handle-check` | `POST /user/handle/check` | None |
| `handle-update` | `POST /user/handle` | Mutates the current test user's handle |
| `profile` | `POST /me` | Optional name env vars; mutates test profile |
| `profile-image` | `POST /profileImage` | Uses bundled 1x1 PNG |
| `group-chat-image` | `POST /groupChats` | **Required:** `K6_GROUP_ID` |
| `email-subscribe` | `POST /subscribe-to-email-list` | Authenticated test user must have an email; Swagger specifies **no request body** |
| `rsvp` | `POST /events/{eventId}/rsvp` | Uses discovered current event or `K6_EVENT_ID` |
| `chat-message` | `POST /chat/messages` | **Required:** `K6_CHAT_USER_UUID`; venue is auto-discovered |

### Examples

```bash
k6 run -e MOBILE_WRITE_TARGET=waitinglist scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=handle-check scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=handle-update scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=profile scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=profile-image scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=email-subscribe scripts/mobile-write-validator.js
k6 run -e MOBILE_WRITE_TARGET=rsvp scripts/mobile-write-validator.js

export K6_GROUP_ID="<known test group id>"
k6 run -e MOBILE_WRITE_TARGET=group-chat-image scripts/mobile-write-validator.js

export K6_CHAT_USER_UUID="<Firebase/test user UUID>"
k6 run -e MOBILE_WRITE_TARGET=chat-message scripts/mobile-write-validator.js
```

Each validation prints a line such as:

```text
[MOBILE WRITE] target=handle-check operation="POST /user/handle/check" status=200 ...
```

A missing prerequisite stops the iteration with a clear error instead of silently marking the endpoint as skipped.

## Complete Mobile runner

`mobile-complete.js` remains the full Mobile-tag coverage runner. Its behavior is now deterministic:

- `ENABLE_WRITES=false`: execute Mobile reads only.
- `ENABLE_WRITES=true MOBILE_WRITE_TARGET=<target>`: reads + only that selected write.
- `ENABLE_WRITES=true MOBILE_WRITE_TARGET=all`: reads + all nine writes. Use only with controlled test data.

For requirement verification, prefer `mobile-write-validator.js` one target at a time.
