#!/usr/bin/env bash
#
# checkpoint.sh — take a restore point before a risky change.
#
#   ./workspace/scripts/checkpoint.sh r2b-transactional-audit
#   ./workspace/scripts/checkpoint.sh --list
#   ./workspace/scripts/checkpoint.sh --prune
#
# WHAT IT BACKS UP, AND WHAT IT DELIBERATELY DOES NOT
#
# Source files are NOT copied. They are in git, and a commit or tag is a better
# restore point than a file copy: atomic, diffable, self-describing, and it costs
# no disk. Copying them would clutter the tree without adding recoverability —
# which is the failure mode this script exists to avoid, not cause.
#
# What git genuinely cannot restore, and this script therefore does:
#
#   1. The DATABASE. Not in git. `db:migrate` is one-way; a bad migration or a
#      mass update cannot be undone by checking anything out. This is the real gap.
#   2. `apps/mercato/.env`. Gitignored by design (it holds real secrets), so it is
#      invisible to every git operation, including `git checkout .`.
#
# It also tags the code, so one label ties the schema, the config and the source
# together at the same instant. Restoring one without the others is how a
# "recovered" system quietly stays broken.
#
# RETENTION: the newest 5 checkpoints are kept, plus anything from the last 24
# hours. Everything older is deleted on each run. Git tags are kept — they cost
# nothing and carry no data — but are listed by --list so stale ones are visible.

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$WORKSPACE_DIR/.backups"
REPO_DIR="$WORKSPACE_DIR/starting-kit"
ENV_FILE="$REPO_DIR/apps/mercato/.env"
PG_CONTAINER="mercato-postgres"
PG_USER="postgres"
PG_DB="open-mercato"
KEEP_NEWEST=5
GRACE_MINUTES=1440

mkdir -p "$BACKUP_DIR"

# Keep the newest N sets; of what remains, delete anything past the grace
# window. A file is only ever removed when BOTH are true.
#
# The rank has to be computed over **every** backup, not over the old ones
# alone. Ranking only the stale files was the bug: the newest sets counted as
# zero against the cap, so ten stale files survived on top of them and the
# directory grew by a set per checkpoint with `pruned: 0` reported each time.
prune() {
  local removed=0
  local doomed
  doomed=$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name '*.sql.gz' -o -name '*.env' \) 2>/dev/null \
    | sort -r \
    | awk -v keep="$((KEEP_NEWEST * 2))" 'NR > keep')
  if [ -n "$doomed" ]; then
    while IFS= read -r file; do
      [ -n "$file" ] || continue
      # The grace window is the second condition, deliberately. Rolling back to
      # something taken an hour ago is the whole point of a checkpoint, and a
      # busy day can produce more than N of them.
      [ -n "$(find "$file" -maxdepth 0 -mmin +$GRACE_MINUTES 2>/dev/null)" ] || continue
      rm -f "$file"
      removed=$((removed + 1))
    done <<< "$doomed"
  fi
  echo "  pruned: $removed old file(s)"
}

case "${1:-}" in
  --list)
    echo "Checkpoints in $BACKUP_DIR:"
    for entry in $(ls -1t "$BACKUP_DIR" 2>/dev/null); do
      case "$entry" in
        *.sql.gz)
          if gzip -t "$BACKUP_DIR/$entry" 2>/dev/null; then echo "  $entry"
          else echo "  $entry   <-- UNREADABLE, not a restore point"; fi ;;
        *) echo "  $entry" ;;
      esac
    done
    echo
    echo "Git tags:"
    git -C "$REPO_DIR" tag -l 'checkpoint/*' | sed 's/^/  /' || echo "  (none)"
    echo
    echo "Disk used: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
    exit 0
    ;;
  --prune)
    prune
    exit 0
    ;;
  "")
    echo "usage: checkpoint.sh <label> | --list | --prune" >&2
    exit 2
    ;;
esac

LABEL="$1"
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE="$BACKUP_DIR/${STAMP}-${LABEL}"

echo "Checkpoint '$LABEL' @ $STAMP"

# 1. Code — a git tag, not a copy.
if [ -n "$(git -C "$REPO_DIR" status --porcelain)" ]; then
  echo "  WARNING: working tree is dirty. The tag records HEAD, not your"
  echo "           uncommitted edits. Commit or stash first if they matter."
fi
git -C "$REPO_DIR" tag -f "checkpoint/${LABEL}-${STAMP}" >/dev/null
echo "  code:     tag checkpoint/${LABEL}-${STAMP} -> $(git -C "$REPO_DIR" rev-parse --short HEAD)"

# 2. Database — the thing git cannot restore.
#
# Bounded, because `docker exec` can hang indefinitely when the daemon's
# management channel wedges while the container itself keeps serving traffic.
# That happened on 2026-08-10: the script sat there, was killed from outside,
# and printed only the code line — so a run that took no backup looked like a
# run that had not reached the backup yet. A backup step that can hang is one
# that silently does nothing exactly when somebody is about to do something
# risky.
# Written, then *verified*. `gzip -t` is what tells a real backup from a
# truncated one: two of today's dumps were non-empty, unreadable, and sitting in
# the directory looking exactly like the good ones. A backup nobody can restore
# is worse than a missing backup, because it is counted on.
if timeout "${PG_DUMP_TIMEOUT_SECONDS:-120}" docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" 2>/dev/null | gzip > "${BASE}.sql.gz"   && [ -s "${BASE}.sql.gz" ]   && gzip -t "${BASE}.sql.gz" 2>/dev/null; then
  echo "  database: ${BASE##*/}.sql.gz ($(du -h "${BASE}.sql.gz" | cut -f1))"
else
  rm -f "${BASE}.sql.gz"
  echo "  database: FAILED — no readable dump from '$PG_CONTAINER' within ${PG_DUMP_TIMEOUT_SECONDS:-120}s. There is NO database backup for this checkpoint."
fi

# 3. Env — gitignored, so invisible to git.
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${BASE}.env"
  echo "  env:      ${BASE##*/}.env"
else
  echo "  env:      SKIPPED — $ENV_FILE not found"
fi

prune

cat <<EOF

To restore this checkpoint:
  code      git -C workspace/starting-kit checkout checkpoint/${LABEL}-${STAMP}
  database  gunzip -c "${BASE}.sql.gz" | docker exec -i $PG_CONTAINER psql -U $PG_USER -d $PG_DB
  env       cp "${BASE}.env" "$ENV_FILE"

Restore all three together — a schema from one moment and code from another is
how a "recovered" system stays subtly broken.
EOF
