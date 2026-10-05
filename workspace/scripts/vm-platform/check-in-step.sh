#!/bin/sh
# Proves the version-controlled copies in this folder still match the working
# copies on the laptop. Run it from anywhere:
#
#   sh workspace/scripts/vm-platform/check-in-step.sh
#
# Exit 0 = in step.  Exit 1 = they have diverged, and it says which file.
set -eu
cd "$(dirname "$0")"

REPO=$(cd ../../.. && pwd)
WORK="$REPO/vms/platform"
fail=0

printf 'tracked copy  <->  working copy (vms/platform)\n'
for f in make-env.sh deploy.sh set-host.sh verify.sh docker-compose.wan.yml; do
  if [ ! -f "$WORK/$f" ]; then
    printf '  MISSING on the laptop : %s\n' "$f"; fail=1; continue
  fi
  if cmp -s "$f" "$WORK/$f"; then
    printf '  same                  : %s\n' "$f"
  else
    printf '  DIFFERS               : %s\n' "$f"; fail=1
  fi
done

if cmp -s new-site.sh "$REPO/vms/new-site.sh" 2>/dev/null; then
  printf '  same                  : new-site.sh\n'
else
  printf '  DIFFERS               : new-site.sh\n'; fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "in step — the tracked copy is a faithful copy of what is deployed"
else
  echo "OUT OF STEP — one of the two has been edited since the other was written."
  echo "Decide which is right, copy it over the other, and commit."
  exit 1
fi
