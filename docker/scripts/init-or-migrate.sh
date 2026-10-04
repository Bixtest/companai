#!/bin/sh
# Decide whether the database is ready, and remember the answer.
#
# This script writes a marker that makes every later run skip initialisation entirely,
# so getting its success/failure decision wrong is silent and expensive. It has tests
# that need no Docker and no database:
#
#   sh docker/scripts/__tests__/init-or-migrate.test.sh
#
# Run them after changing anything in this file.
set -e

MARKER_FILE="${INIT_MARKER_FILE:-/tmp/init-marker/.seeded}"
INIT_COMMAND="${INIT_COMMAND:-yarn initialize}"
MIGRATE_COMMAND="${MIGRATE_COMMAND:-yarn db:migrate}"
ALREADY_INITIALIZED_PATTERN='Initialization aborted: found [0-9][0-9]* existing user\(s\) in the database\.'
CLI_NOT_FOUND_PATTERN='command not found: mercato'

run_command_with_cli_recovery() {
  COMMAND="$1"
  LOG_FILE="$2"

  # Capture the exit status of the command itself, and be careful HOW.
  #
  # Do NOT read `$?` after an `if ... fi`: the exit status of an `if` with no `else`
  # whose condition was false is 0, so the failure would be reported to the caller as
  # success. That is precisely how a failed initialisation used to write the
  # "already seeded" marker, leaving the database half-seeded while the app looked
  # healthy (defect B-15, tests in __tests__/).
  #
  # This file read `$?` in four places. Two were broken this way - the two read after
  # an `fi` - and the other two sat inside an `else` branch, where `$?` really is the
  # failed condition's status, so they were right only by accident of where they were
  # written. All four now use the shape below, so copying a neighbouring line cannot
  # reintroduce the defect.
  #
  # `|| STATUS=$?` is also deliberate: this script runs under `set -e`, and a bare
  # failing command on its own line would abort the script before the status is read.
  # A command on the left of `||` is exempt from `set -e`.
  STATUS=0
  sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1 || STATUS=$?

  if [ "${STATUS}" -eq 0 ]; then
    return 0
  fi

  if ! grep -Fq "${CLI_NOT_FOUND_PATTERN}" "${LOG_FILE}"; then
    return "${STATUS}"
  fi

  echo "Open Mercato CLI missing; running yarn install and retrying..."
  yarn install
  sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1
}

if [ ! -f "${MARKER_FILE}" ]; then
  echo "First run: full initialization..."
  LOG_FILE="$(mktemp)"

  # Read the status from the call itself. Never `$?` after `fi` - see the note in
  # run_command_with_cli_recovery above.
  STATUS=0
  run_command_with_cli_recovery "${INIT_COMMAND}" "${LOG_FILE}" || STATUS=$?

  if [ "${STATUS}" -eq 0 ]; then
    cat "${LOG_FILE}"
    rm -f "${LOG_FILE}"
    mkdir -p "$(dirname "${MARKER_FILE}")"
    touch "${MARKER_FILE}"
    exit 0
  fi

  cat "${LOG_FILE}"

  if grep -Eq "${ALREADY_INITIALIZED_PATTERN}" "${LOG_FILE}"; then
    rm -f "${LOG_FILE}"
    echo "Initialization reported existing users; treating database as already initialized."
    echo "Running migrations..."
    RECOVERY_LOG_FILE="$(mktemp)"
    RECOVERY_STATUS=0
    run_command_with_cli_recovery "${MIGRATE_COMMAND}" "${RECOVERY_LOG_FILE}" || RECOVERY_STATUS=$?
    cat "${RECOVERY_LOG_FILE}"
    rm -f "${RECOVERY_LOG_FILE}"
    if [ "${RECOVERY_STATUS}" -ne 0 ]; then
      exit "${RECOVERY_STATUS}"
    fi
    mkdir -p "$(dirname "${MARKER_FILE}")"
    touch "${MARKER_FILE}"
    exit 0
  fi

  rm -f "${LOG_FILE}"
  exit "${STATUS}"
fi

echo "Subsequent run: migrations only..."
LOG_FILE="$(mktemp)"

STATUS=0
run_command_with_cli_recovery "${MIGRATE_COMMAND}" "${LOG_FILE}" || STATUS=$?
cat "${LOG_FILE}"
rm -f "${LOG_FILE}"
exit "${STATUS}"
