# NiteOut Complete Performance Model

## What is covered

This package uses the supplied OpenAPI snapshot (`data/docs.json`) as the API source of truth. It catalogs all 133 documented operations across 109 paths.

Coverage has three layers:

1. **Realistic load journeys** — venue session, heartbeat/music, event attendee, social/discovery and chat.
2. **Complete Mobile journey** — every Mobile-tagged operation is represented; reads run directly, writes are gated by explicit write switches, and `/tests/token` is classified as a test utility rather than user traffic.
3. **Swagger surface coverage** — all safe GET operations can be swept with `scripts/swagger-read-sweep.js`; every single Swagger operation can be invoked with `scripts/operation.js`, including admin/operator/destructive operations behind safety switches.

## Why all 133 operations are not fired in the 600-user journey

Several Swagger operations are administrative or lifecycle mutations: clearing playlists, deleting events, banning users, sending emails, switching music sources, creating/deleting invite codes, etc. Executing those continuously for hundreds of VUs would not represent mobile-user behavior and could corrupt the test environment. They remain available in the framework but are isolated from the standard load mix.

## Remaining non-Swagger gap

The OpenAPI specification does not define direct Firebase Realtime Database listeners/paths or Unity realtime transport messages. Those cannot be reproduced faithfully from Swagger alone. The `src/adapters/` placeholders remain for those protocols until their contracts are supplied.
