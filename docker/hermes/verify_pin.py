"""Verify that the mounted Hermes tree IS the pinned snapshot — PLAN-HERMES-PHASE2 P2-1.

WHY THIS RUNS IN THE CONTAINER
------------------------------
The image does not bake the Hermes source in; it mounts the pinned tree read-only
at `/hermes-src`. That keeps ONE copy of the pin (the defect L136 names: two
copies of one thing) — but it also means the code that actually runs is whatever
the mount contains, which is exactly the question a pin exists to answer. So the
check runs here, at boot, against the bytes the interpreter is about to import.

The algorithm is byte-for-byte the one in `library/.hermes_pin.py`, so a digest
computed here equals a digest computed on the host:

    for each file, in sorted relative-path order:
        line := "<md5 of file>  <relative path with / separators>"
    digest := md5(concat(line + "\n"))

Anything that changes the tree — a re-pin, a stray `__pycache__`, a partial
copy, a hand-edited file — changes the digest and stops the boot.

Usage:
    python3 verify_pin.py [source_dir]

Environment:
    HERMES_PIN_DIGEST        expected digest (defaults to the recorded pin)
    HERMES_SKIP_PIN_VERIFY   "1" skips the check with a loud warning (never quiet)
"""
import hashlib
import os
import sys
from concurrent.futures import ThreadPoolExecutor

# The recorded pin — `library/development/HERMES-PIN.md` §1, revision
# `db44c46208f1b421b4ecb7e56bf9d68b0423906f` (the owner's 2026-10-15 download,
# flattened to the mount-root layout; 19,728 files). Update this ONLY together
# with the pin document and `library/.hermes_pin.py`, in the same change.
#
# MEASURED 2026-10-16 (rule 13 — corrected by name): this constant was MISSED in
# the 2026-10-16 re-pin. `library/.hermes_pin.py` (`EXPECTED_DIGEST`),
# `HERMES-PIN.md` and the compose's `HERMES_PIN_DIGEST` default all moved to
# `07ee857b…`/`db44c462…`, while this copy still named the PREVIOUS pin
# (`3569e846…`/`ca760e97…`). Effect: any invocation WITHOUT `HERMES_PIN_DIGEST`
# set — a manual `docker run`, a test, the `handshake_gate.py` — rejected the
# CORRECTLY-pinned tree with "PIN BROKEN". The live stack was unaffected only
# because `docker-compose.hermes.yml` injects the env. The value below is the
# one the pin of record actually produces, verified by the gate's PIN HOLDS.
DEFAULT_EXPECTED_DIGEST = "07ee857bdab59a875317035d8aaad4d6"
DEFAULT_SOURCE_DIR = "/hermes-src"

# Measured 2026-10-12 on the pinned tree (18,248 files) over a Docker Desktop
# bind mount on Windows: sequential ~200 s, threaded ~35 s. The digest is
# order-independent — files are hashed in any order and sorted at the end — so
# this is a pure wall-clock win with no change to the number produced.
WORKERS = 8


def digest_of(root):
    """One digest over every file under `root`, content-addressed."""
    entries = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            entries.append((full, rel))

    def hash_one(entry):
        full, rel = entry
        h = hashlib.md5()
        try:
            with open(full, "rb") as fh:
                for chunk in iter(lambda: fh.read(1 << 20), b""):
                    h.update(chunk)
        except OSError as exc:
            # A file that cannot be read is a file whose content this
            # process will not run: that is a mismatch, not a warning.
            raise SystemExit(
                "PIN UNREADABLE: %s (%s)\n  A file the interpreter would "
                "import cannot be read." % (rel, exc)
            )
        return "%s  %s" % (h.hexdigest(), rel)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        lines = list(pool.map(hash_one, entries))

    lines.sort(key=lambda ln: ln.split("  ", 1)[1])
    blob = "".join(ln + "\n" for ln in lines).encode("utf-8")
    return hashlib.md5(blob).hexdigest(), len(lines)


def main(argv):
    source = argv[1] if len(argv) > 1 else os.environ.get("HERMES_SOURCE_DIR", DEFAULT_SOURCE_DIR)
    expected = os.environ.get("HERMES_PIN_DIGEST", DEFAULT_EXPECTED_DIGEST)

    if os.environ.get("HERMES_SKIP_PIN_VERIFY") == "1":
        sys.stderr.write(
            "HERMES PIN VERIFICATION SKIPPED (HERMES_SKIP_PIN_VERIFY=1).\n"
            "  The worker will run whatever is mounted at %s, with no proof\n"
            "  that it is the pinned revision %s.\n"
            % (source, "db44c462…")
        )
        return 0

    if not os.path.isdir(source):
        sys.stderr.write(
            "PIN ABSENT: no Hermes source at %s.\n"
            "  Mount the pinned tree there (docker-compose.hermes.yml does),\n"
            "  or point HERMES_SOURCE_DIR at it.\n" % source
        )
        return 1

    actual, count = digest_of(source)
    if actual == expected:
        # stderr, not stdout: this process shares stdout with the gateway's
        # JSON-RPC channel, and a diagnostic there is a corrupt frame.
        sys.stderr.write(
            "PIN HOLDS\n  source   : %s\n  files    : %d\n  digest   : %s\n"
            % (source, count, actual)
        )
        return 0

    sys.stderr.write(
        "PIN BROKEN — the mounted tree is not the snapshot that was pinned.\n"
        "  expected : %s\n  actual   : %s\n  files    : %d\n  source   : %s\n"
        "  If this is a deliberate re-pin, update the digest in\n"
        "  library/.hermes_pin.py, library/development/HERMES-PIN.md and this\n"
        "  file, in the same change. If it is not, restore the pinned tree.\n"
        % (expected, actual, count, source)
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
