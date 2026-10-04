#!/bin/sh
# Tests that the `app` service in a compose file refuses to start the application when
# database initialisation or migration fails.
#
# WHY THIS EXISTS
#   init-or-migrate.sh writes a marker that makes later runs skip initialisation. If the
#   app is allowed to start after a failed init, it comes up looking healthy while the
#   database is half-initialised - silent, and expensive to diagnose. Defect B-15.
#
# HOW IT WORKS, WITHOUT DOCKER
#   It extracts the REAL `command:` block out of the compose file - so it tests the text
#   that actually ships, not a paraphrase - points the init script at a stub, puts a stub
#   `yarn` on PATH that announces itself, and runs the block.
#
# USAGE
#   sh docker/scripts/__tests__/compose-init-guard.test.sh [path/to/docker-compose.yml]
#
#   With no argument it tests docker-compose.fullapp.yml at the repository root. Pass a
#   path to test the create-app template copy as well.
#
# EXIT CODE
#   0 when every case passes, 1 when any case fails, 2 when the harness itself is broken.

set -u

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../.." && pwd)
COMPOSE=${1:-"$ROOT/docker-compose.fullapp.yml"}

if [ ! -f "$COMPOSE" ]; then
  echo "FATAL: compose file not found: $COMPOSE"
  exit 1
fi

PASSED=0
FAILED=0
ok()  { PASSED=$((PASSED + 1)); printf '    ok    %s\n' "$1"; }
bad() { FAILED=$((FAILED + 1)); printf '    FAIL  %s\n' "$1"; }
case_start() { printf '\n  %s\n' "$1"; }

# See the note in init-or-migrate.test.sh: on Git Bash a bare `mktemp -d` yields a
# Windows path, which the local `rm` shim rejects and which `sh -lc` cannot resolve.
# Naming /tmp keeps the scratch paths POSIX on Git Bash and is correct in the container.
TMP_BASE=/tmp
[ -d "$TMP_BASE" ] || TMP_BASE=.

D=""
STUB=""

new_case() {
  D=$(mktemp -d "$TMP_BASE/compose-init-guard.XXXXXX") || exit 1
  mkdir -p "$D/bin"
  # A `yarn` that announces itself, so we can see whether `yarn start` was reached.
  printf '#!/bin/sh\necho "YARN-START-RAN"\nexit 0\n' > "$D/bin/yarn"
  chmod +x "$D/bin/yarn"
  printf '#!/bin/sh\necho "init stub: SUCCEEDED"\nexit 0\n' > "$D/init-ok.sh"
  chmod +x "$D/init-ok.sh"
  printf '#!/bin/sh\necho "init stub: FAILED" >&2\nexit 1\n' > "$D/init-fail.sh"
  chmod +x "$D/init-fail.sh"
}
drop_case() { rm -rf "$D"; }

# Extract the literal block scalar that follows `command:` / `- |` inside the `app:`
# service. Scoping to `app:` matters: other services (mcp, opencode) also have a `- |`
# block, and taking the first one would silently test the wrong service.
extract_block() {
  awk '
    /^  [A-Za-z_][A-Za-z0-9_-]*:$/ {
      if ($0 == "  app:") { inservice = 1 } else if (inservice) { exit }
      next
    }
    inservice && /^      - \|$/ { inblock = 1; next }
    inblock && /^        / { sub(/^        /, ""); print; next }
    inblock { exit }
  ' "$COMPOSE" > "$D/cmd.sh"
}

# Run the extracted block with the init script pointed at $1, and print everything.
run_block() {
  sed "s#/app/docker/scripts/init-or-migrate.sh#$1#g" "$D/cmd.sh" > "$D/cmd.run.sh"
  PATH="$D/bin:$PATH" sh "$D/cmd.run.sh" </dev/null > "$D/out.txt" 2>&1
}

printf 'Testing: %s\n' "$COMPOSE"

# ---------------------------------------------------------------------------
# 0. SELF-CHECK. If the stub `yarn` is not reachable, "YARN-START-RAN" would never
#    appear even on the happy path, and the assertions below would pass for the wrong
#    reason. Confirm the harness can see it first.
# ---------------------------------------------------------------------------
case_start 'self-check: the stub yarn is reachable and announces itself'
new_case
PATH="$D/bin:$PATH" sh -c 'yarn start' </dev/null > "$D/out.txt" 2>&1
if grep -q 'YARN-START-RAN' "$D/out.txt"; then
  ok 'stub yarn runs and prints its marker'
else
  printf '\n  ABORTING: the harness is broken - the stub yarn did not run.\n'
  printf '  Output was:\n'
  cat "$D/out.txt"
  printf '\n'
  drop_case
  exit 2
fi
drop_case

# ---------------------------------------------------------------------------
# 1. Initialisation FAILS -> the block must exit non-zero and must NOT reach
#    `yarn start`. This is the B-15 regression.
# ---------------------------------------------------------------------------
case_start 'init FAILS: the app must not be started'
new_case
extract_block
if [ ! -s "$D/cmd.sh" ]; then
  printf '\n  ABORTING: could not extract the command block from %s\n\n' "$COMPOSE"
  drop_case
  exit 2
fi
run_block "$D/init-fail.sh"
rc=$?
[ "$rc" -ne 0 ] && ok "exits non-zero ($rc)" || bad 'exited 0 after a failed init'
if grep -q 'YARN-START-RAN' "$D/out.txt"; then
  bad 'the app was started anyway - it would serve a half-initialized database'
else
  ok 'the app was NOT started'
fi
grep -q 'refusing to start the app' "$D/out.txt" \
  && ok 'says why it refused' \
  || bad 'no explanatory message in the output'
drop_case

# ---------------------------------------------------------------------------
# 2. Initialisation SUCCEEDS -> the app must still be started, and the block must
#    exit 0. (Guards against "fixing" the failure path by breaking the happy one.)
# ---------------------------------------------------------------------------
case_start 'init SUCCEEDS: the app must be started'
new_case
extract_block
run_block "$D/init-ok.sh"
rc=$?
[ "$rc" -eq 0 ] && ok 'exits 0' || bad "expected exit 0, got $rc"
grep -q 'YARN-START-RAN' "$D/out.txt" \
  && ok 'the app was started' \
  || bad 'the app was NOT started after a successful init'
drop_case

# ---------------------------------------------------------------------------
printf '\n  %s passed, %s failed\n' "$PASSED" "$FAILED"
if [ "$FAILED" -gt 0 ]; then
  printf '  RESULT: FAIL\n\n'
  exit 1
fi
printf '  RESULT: PASS\n\n'
exit 0
