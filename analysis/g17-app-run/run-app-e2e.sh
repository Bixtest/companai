#!/usr/bin/env bash
# G-17 — the live APP-LEVEL end-to-end run.
#
# Order the owner set, and it matters: the model was probed from OUTSIDE the platform
# first (analysis/g17-app-run/outside-probe-2026-10-06.md — PASS). So if this fails, the
# fault is in the PLATFORM, not the model.
#
# What this drives: browser-style HTTP into the running app, an authenticated session,
# then POST to the IR agent's route, and the model's object comes back out.
#
# It does NOT evaluate answer quality — only that the platform path works end to end.
set -u

APP="${APP:-http://127.0.0.1:3000}"
EMAIL="${OM_TEST_EMAIL:-superadmin@acme.com}"
# MEASURED, not guessed: the container seeds superadmin with
# OM_INIT_SUPERADMIN_PASSWORD=password (docker exec starting-kit-app-1 env).
# The other two demo users (admin@, employee@) use 'secret'. Guessing 'secret'
# here is what produced the first run's 401 - a wrong input, not a defect.
PASSWORD="${OM_TEST_PASSWORD:-password}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

say() { printf '%s\n' "$*"; }

say "=== 1. session: POST /api/auth/login ==="
LOGIN_CODE=$(curl -s -o /tmp/g17-login.out -w '%{http_code}' -m 30 \
  -c "$COOKIE_JAR" \
  -X POST "$APP/api/auth/login" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD")
say "login http=$LOGIN_CODE"
say "login body(head): $(head -c 300 /tmp/g17-login.out)"

if [ "$LOGIN_CODE" != "200" ]; then
  say "!! LOGIN FAILED — cannot authenticate, so the route test cannot run. Stopping."
  # 429 is NOT a platform fault and NOT a credential fault: the login route rate
  # limits at 5 attempts / 60s per email+IP (packages/core/.../auth/api/login.ts,
  # readEndpointRateLimitConfig('LOGIN', { points: 5, ... })). Wait a minute and
  # re-run rather than debugging the app.
  if [ "$LOGIN_CODE" = "429" ]; then
    say "!! NOTE: 429 is the login RATE LIMITER (5/60s), not a defect. Wait 60s and re-run."
  fi
  exit 2
fi

say
say "=== 2. is the IR agent registered IN THE APP? ==="
curl -s -m 30 -b "$COOKIE_JAR" "$APP/api/ai_assistant/ai/agents" -o /tmp/g17-agents.out -w 'agents http=%{http_code}\n' || true
if [ -s /tmp/g17-agents.out ]; then
  say "agents body(head): $(head -c 500 /tmp/g17-agents.out)"
fi

say
say "=== 3. the end-to-end request through the platform ==="
# The route contract, read from the source rather than guessed
# (packages/ai-assistant/src/modules/ai_assistant/api/ai/run-object/route.ts,
#  runObjectRequestSchema): `agent` + `messages[{role,content}]`, NOT
# `agentId` + `input`. The route normalizes {role,content} into UIMessage parts
# via ensureUiMessageShape, so a plain content string is accepted.
PROMPT="${OM_TEST_PROMPT:-list invoices over 10,000 EUR for each customer, newest first, at most 50}"
PROMPT_JSON=$(printf '%s' "$PROMPT" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
cat > /tmp/g17-body.json <<JSON
{"agent":"business_ir.query_author","messages":[{"role":"user","content":$PROMPT_JSON}]}
JSON
say "prompt: $PROMPT"
say "body:   $(cat /tmp/g17-body.json)"
START=$(date +%s)
RUN_CODE=$(curl -s -o /tmp/g17-run.out -w '%{http_code}' -m 180 \
  -b "$COOKIE_JAR" \
  -X POST "$APP/api/ai_assistant/ai/run-object" \
  -H 'Content-Type: application/json' \
  --data @/tmp/g17-body.json)
END=$(date +%s)
say "run-object http=$RUN_CODE  elapsed=$((END-START))s"
say
say "--- raw response ---"
cat /tmp/g17-run.out
say
say "--- end ---"
