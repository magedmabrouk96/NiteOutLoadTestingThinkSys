# NiteOut k6 Test Plan

## Traffic mix
Default load/soak mix is 70% active venue sessions, 15% event attendees, 10% social/discovery and
5% chat. Heartbeat polling is embedded in every active venue session.

## Profiles
- smoke: contract/framework validation; all journeys, one VU each
- load: ramp to requested target mix, hold for TEST_DURATION, ramp down
- stress: same mix at 2x requested target
- soak: constant requested target for TEST_DURATION

## Default acceptance gates
- overall HTTP error rate < 1%
- overall p95 < 1000 ms
- overall p99 < 2000 ms
- checks > 99%
- venue/music/event/heartbeat p95 < 1000 ms
- social/chat p95 < 1200 ms

Dwell time and journey duration are metrics, not latency gates. A user deliberately spending 60
seconds in a venue must not fail a 5-second performance threshold.

## Safe-write policy
`ENABLE_WRITES=false` by default. RSVP, live-activity updates and chat writes are enabled only in a
dedicated test environment with approved test identities/data. Avoid running many VUs with one
identity when write state is user-specific.
