# Quick start — direct Firebase token mode

```bash
export K6_BASE_URL="https://us-central1-niteout-c7d45.cloudfunctions.net/dev_api"
export K6_FIREBASE_TOKEN="<fresh Firebase ID token>"
unset K6_TEST_TOKEN_AUTH
```

Validate the core environment:

```bash
k6 run scripts/preflight.js
```

Run all safe documented GET operations that have resolvable IDs:

```bash
k6 run scripts/swagger-read-sweep.js
```

Run all Mobile-tagged reads with writes skipped safely:

```bash
k6 run scripts/mobile-complete.js
```

Enable selected Mobile writes only with dedicated test data:

```bash
ENABLE_WRITES=true ENABLE_ONBOARDING_WRITES=true \
K6_GROUP_ID='<test-group-id>' K6_CHAT_USER_UUID='<test-user-uuid>' \
k6 run scripts/mobile-complete.js
```

Run the standard realistic concurrency model:

```bash
k6 run -e TEST_PROFILE=local -e VUS=25 -e TEST_DURATION=5m \
  -e SESSION_SECONDS=60 -e HEARTBEAT_SECONDS=15 \
  -e ENABLE_WRITES=false -e LOAD_GENERATOR=local \
  scripts/performance.js
```

List all 133 Swagger operations:

```bash
k6 run scripts/swagger-catalog.js
```

Execute one write operation explicitly:

```bash
ENABLE_WRITES=true \
OPERATION_KEY='POST /user/handle/check' \
BODY_JSON='{"handle":"k6_candidate"}' \
k6 run scripts/operation.js
```

Destructive operations require `ENABLE_DESTRUCTIVE_WRITES=true`. Operator/admin/integration operations require their respective explicit switches.
