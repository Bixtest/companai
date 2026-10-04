#!/bin/sh
# Tests for init-or-migrate.sh
#
# WHAT THIS PROTECTS
#   That script decides whether the database is ready, and writes a marker that makes
#   every later run skip initialisation entirely. A wrong "success" is silent and
#   expensive: the database stays half-seeded while the app comes up reporting healthy.
#   That is defect B-15. The regression it guards against is specifically a *lost exit
#   status* - a failure being reported to the caller as success.
#
# NO DOCKER NEEDED
#   The script runs its init and migrate steps through `sh -lc "<command>"`, so the
#   commands are replaced here by short inline strings with a chosen exit status and
#   output. Nothing is written except the marker under test. No database is touched.
#
# USAGE
#   sh docker/scripts/__tests__/init-or-migrate.test.sh [path/to/init-or-migrate.sh]
#
#   With no argument it tests the script next to it. Pass a path to test another copy
#   (there are two in this repo: docker/scripts/ and packages/create-app/template/).
#
# EXIT CODE
#   0 when every case passes, 1 when any case fails, 2 when the harness itself is broken.

set -u

HERE=$(cd "$(dirname "$0")" && pwd)
SCRIPT=${1:-"$HERE/../init-or-migrate.sh"}

if [ ! -f "$SCRIPT" ]; then
  echo "FATAL: init-or-migrate.sh not found at: $SCRIPT"
  exit 1
fi
SCRIPT=$(cd "$(dirname "$SCRIPT")" && pwd)/$(basename "$SCRIPT")

PASSED=0
FAILED=0

ok()  { PASSED=$((PASSED + 1)); printf '    ok    %s\n' "$1"; }
bad() { FAILED=$((FAILED + 1)); printf '    FAIL  %s\n' "$1"; }
case_start() { printf '\n  %s\n' "$1"; }

# Scratch space must be a path that BOTH this shell and `sh -lc` (which the script
# under test uses) can resolve. `mktemp -d` with no template returns a Windows path on
# Git Bash ("C:\Users\..."), and `sh -lc "C:\Users\..."` eats the backslashes and reports
# "No such file or directory" - which would make every case fail and the whole test lie.
# Naming /tmp explicitly keeps the path POSIX on Git Bash and is correct in the
# container too. (TMPDIR is deliberately not used: on Git Bash it is a Windows path.)
TMP_BASE=/tmp
[ -d "$TMP_BASE" ] || TMP_BASE=.

# The script under test calls bare `mktemp` for its own log files, and on Git Bash that
# also yields a Windows path - which the local `rm` shim rejects, so the script would die
# under `set -e` for a reason that has nothing to do with the logic being tested. Point
# mktemp at /tmp so the script sees the POSIX environment it sees in the container.
if [ -d /tmp ]; then
  TMPDIR=/tmp
  export TMPDIR
fi

CASE_DIR=""
MARKER=""
OUT=""

# A throwaway directory per case, so a stale marker can never mask a failure.
new_case() {
  CASE_DIR=$(mktemp -d "$TMP_BASE/init-or-migrate-test.XXXXXX") || exit 1
  MARKER="$CASE_DIR/marker/.seeded"
  OUT="$CASE_DIR/output.log"
}
drop_case() { rm -rf "$CASE_DIR"; }

# Runs the script under test with the given init/migrate commands in place of the real
# ones. Its exit code is the script's exit code.
#
# stdin is closed on purpose. The script invokes its steps through `sh -lc` (a *login*
# shell), and a login shell that inherits an open, never-ending stdin can sit there
# waiting instead of running the command. That produced a test that simply hung - the
# worst possible failure mode, because it looks like "still working".
run_under_test() {
  INIT_MARKER_FILE="$MARKER" \
  INIT_COMMAND="$1" \
  MIGRATE_COMMAND="$2" \
  sh "$SCRIPT" < /dev/null > "$OUT" 2>&1
}

# Stub commands. Each is a string handed to `sh -lc`, exactly as the real script does.
INIT_OK="echo 'initialization complete'"
MIGRATE_OK="echo 'migrations applied'"
INIT_FAILS="echo 'Initialization failed: current transaction is aborted, commands ignored until end of transaction block'; exit 1"
MIGRATE_FAILS="echo 'migration 20260101_add_orders failed'; exit 1"
# The real "database already has users" message (mercato.ts:1039). The script matches on
# the part after the emoji, so plain ASCII is faithful enough here.
INIT_ALREADY_SEEDED="echo 'Initialization aborted: found 3 existing user(s) in the database.'; exit 1"

printf 'Testing: %s\n' "$SCRIPT"

# ---------------------------------------------------------------------------
# 0. SELF-CHECK. A test that cannot tell a passing stub from a failing one proves
#    nothing - and a harness bug then hides as a product bug. Before trusting any
#    result below, confirm that a command exiting 0 is read as 0 and one exiting 1 is
#    read as 1, through the same `sh -lc` path the script under test uses.
# ---------------------------------------------------------------------------
case_start 'self-check: the harness can tell success from failure'
sh -lc "$INIT_OK"    < /dev/null >/dev/null 2>&1; rc_ok=$?
sh -lc "$INIT_FAILS" < /dev/null >/dev/null 2>&1; rc_bad=$?
if [ "$rc_ok" -ne 0 ] || [ "$rc_bad" -eq 0 ]; then
  printf '\n  ABORTING: the harness is broken, so every result below would be meaningless.\n'
  printf '    a command that exits 0 was read as %s (want 0)\n' "$rc_ok"
  printf '    a command that exits 1 was read as %s (want 1)\n' "$rc_bad"
  printf '    usually the scratch path is not usable by `sh -lc`\n\n'
  exit 2
fi
ok 'a command exiting 0 reads as 0, and one exiting 1 reads as 1'

# ---------------------------------------------------------------------------
# 1. First run, initialisation succeeds -> success, and the marker is written.
#    (If this fails, the script is broken for the happy path.)
# ---------------------------------------------------------------------------
case_start 'first run, init succeeds'
new_case
run_under_test "$INIT_OK" "$MIGRATE_OK"
rc=$?
[ "$rc" -eq 0 ] && ok 'exits 0' || bad "expected exit 0, got $rc"
[ -f "$MARKER" ] && ok 'marker written' || bad 'marker was NOT written after a successful init'
drop_case

# ---------------------------------------------------------------------------
# 2. THE B-15 REGRESSION. First run, initialisation FAILS -> must report failure and
#    must NOT write the marker. If the marker is written, every later run skips
#    initialisation and the database stays half-seeded while looking fine.
# ---------------------------------------------------------------------------
case_start 'first run, init FAILS (B-15 regression)'
new_case
run_under_test "$INIT_FAILS" "$MIGRATE_OK"
rc=$?
if [ "$rc" -eq 0 ]; then
  bad 'init failed but the script exited 0 - the failure was reported as success'
else
  ok "failure propagated (exit $rc)"
fi
if [ -f "$MARKER" ]; then
  bad 'marker written despite a failed init - later runs will skip initialisation'
else
  ok 'no marker written'
fi
drop_case

# ---------------------------------------------------------------------------
# 3. First run, init fails *because the database already has users* -> that is not a
#    failure. The script should run migrations, write the marker, and exit 0.
#    (This is the one failure that must NOT be propagated.)
# ---------------------------------------------------------------------------
case_start 'first run, database already seeded'
new_case
run_under_test "$INIT_ALREADY_SEEDED" "$MIGRATE_OK"
rc=$?
[ "$rc" -eq 0 ] && ok 'exits 0 (already-seeded is treated as success)' || bad "expected exit 0, got $rc"
[ -f "$MARKER" ] && ok 'marker written' || bad 'marker was NOT written after the recovery path'
drop_case

# ---------------------------------------------------------------------------
# 4. Later run (marker already present), migrations FAIL -> must report failure.
# ---------------------------------------------------------------------------
case_start 'later run, migrate FAILS'
new_case
mkdir -p "$(dirname "$MARKER")"
: > "$MARKER"
run_under_test "$INIT_OK" "$MIGRATE_FAILS"
rc=$?
if [ "$rc" -eq 0 ]; then
  bad 'migration failed but the script exited 0'
else
  ok "failure propagated (exit $rc)"
fi
drop_case

# ---------------------------------------------------------------------------
# 5. Later run (marker already present), migrations succeed -> success.
# ---------------------------------------------------------------------------
case_start 'later run, migrate succeeds'
new_case
mkdir -p "$(dirname "$MARKER")"
: > "$MARKER"
run_under_test "$INIT_OK" "$MIGRATE_OK"
rc=$?
[ "$rc" -eq 0 ] && ok 'exits 0' || bad "expected exit 0, got $rc"
[ -f "$MARKER" ] && ok 'marker still present' || bad 'marker disappeared'
drop_case

# ---------------------------------------------------------------------------
printf '\n  %s passed, %s failed\n' "$PASSED" "$FAILED"
if [ "$FAILED" -gt 0 ]; then
  printf '  RESULT: FAIL\n\n'
  exit 1
fi
printf '  RESULT: PASS\n\n'
exit 0
