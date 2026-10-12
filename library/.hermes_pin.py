"""The Hermes source pin — verify the pinned snapshot, and record its digest.

WHY THIS EXISTS
---------------
The Hermes runtime (Nous Research `hermes-agent`) sits in this repository as
*gitignored study material*, not as tracked code. It has no `.git`, and its
`pyproject.toml` declares `version = "0.0.0"`. So there is no version string and
no commit to check against: nothing tells you whether the copy you are reading
is the copy that was studied.

Architecture Phase 0 ("pin and map") names this: *"Create the pin that does not
exist (a recorded source digest and a compatibility harness)."* This file is
that harness. It does two things and nothing else:

  1. It computes ONE digest for the whole pinned snapshot — a sorted listing of
     `<md5>  <relative path>` over every file, hashed again into a single
     value. Two snapshots with different content or different files produce
     different digests.
  2. It compares that digest against the value recorded in `HERMES-PIN.md`, and
     exits non-zero on a mismatch. That is the compatibility check: it tells you
     the moment the snapshot on disk stops being the snapshot that was pinned.

WHAT THE PINNED SNAPSHOT IS
---------------------------
`library/ai/hermes-agent-main/` — the extracted contents of
`library/ai/hermes-agent-main.zip`, whose archive comment carries the upstream
source revision: `eb044063235fbf7a4e68dd2970ade05dbe637ff3`.

The OTHER copy at the repository root (`hermes-agent-main/`) is a *later,
different* extract of the same product. The two are NOT byte-identical. This is
exactly the "source-versus-image divergence" the architecture warns about (its
§10 risk table). This pin deliberately names ONE of them so there is a single
answer to "which Hermes are we reading".

HOW TO RUN IT
-------------
    "C:\\Users\\Ramzi\\.workbuddy-ai\\binaries\\python\\versions\\3.13.12\\python.exe" ^
      "C:\\Users\\Ramzi\\Downloads\\companai\\library\\.hermes_pin.py"

    ... --check    compute and compare only (this is what the exit gate means)
    ... --print    compute and print the digest, compare nothing
    ... --quiet    machine-friendly: print only the digest, nothing else

Exit codes: 0 = pin holds (or --print/--quiet succeeded); 1 = mismatch or the
snapshot is missing; 2 = usage error.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# The ONE pinned snapshot. See the module docstring for why this and not the
# root copy.
PINNED = os.path.join(HERE, "ai", "hermes-agent-main")

# The upstream revision, read from the zip's own archive comment on 2026-10-12.
# It is recorded here so the pin carries the source revision as well as the
# content digest: the zip is the provenance, the digest is the proof.
UPSTREAM_REVISION = "eb044063235fbf7a4e68dd2970ade05dbe637ff3"

# The digest the snapshot must produce. Updated only when the snapshot is
# deliberately re-pinned, and then only together with this file's own record in
# HERMES-PIN.md.
EXPECTED_DIGEST = "53b320bb83a155225ab4b36b3ad0dace"


def digest_of(root):
    """One digest over every file under `root`, content-addressed.

    The algorithm is deliberately simple and re-implementable by hand, so anyone
    can reproduce the number without this script:

        for each file, in sorted relative-path order:
            line := "<md5 of file>  <relative path with / separators>"
        digest := md5("\n".join(lines) + "\n")

    Returns (digest, file_count) or raises FileNotFoundError if root is absent.
    """
    if not os.path.isdir(root):
        raise FileNotFoundError(root)

    lines = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            h = hashlib.md5()
            with open(full, "rb") as fh:
                for chunk in iter(lambda: fh.read(1 << 20), b""):
                    h.update(chunk)
            lines.append("%s  %s" % (h.hexdigest(), rel))

    lines.sort(key=lambda ln: ln.split("  ", 1)[1])
    blob = "".join(ln + "\n" for ln in lines).encode("utf-8")
    return hashlib.md5(blob).hexdigest(), len(lines)


def main(argv):
    mode = "verify"
    for arg in argv[1:]:
        if arg == "--check":
            mode = "verify"
        elif arg == "--print":
            mode = "print"
        elif arg == "--quiet":
            mode = "quiet"
        else:
            sys.stderr.write("usage: .hermes_pin.py [--check|--print|--quiet]\n")
            return 2

    try:
        actual, count = digest_of(PINNED)
    except FileNotFoundError:
        sys.stderr.write(
            "PIN ABSENT: the pinned snapshot is not on disk:\n  %s\n"
            "It is gitignored study material — restore it from\n"
            "  library/ai/hermes-agent-main.zip\n"
            "before this pin can be checked.\n" % PINNED
        )
        return 1

    if mode == "quiet":
        print(actual)
        return 0

    if mode == "print":
        print("snapshot : %s" % PINNED)
        print("revision : %s" % UPSTREAM_REVISION)
        print("files    : %d" % count)
        print("digest   : %s" % actual)
        return 0

    # verify
    if actual == EXPECTED_DIGEST:
        print("PIN HOLDS")
        print("  revision : %s" % UPSTREAM_REVISION)
        print("  files    : %d" % count)
        print("  digest   : %s" % actual)
        return 0

    sys.stderr.write(
        "PIN BROKEN — the snapshot on disk is not the snapshot that was pinned.\n"
        "  expected : %s\n"
        "  actual   : %s\n"
        "  files    : %d\n"
        "  snapshot : %s\n"
        "If this change is deliberate, re-pin it: update EXPECTED_DIGEST in this\n"
        "file AND the digest recorded in library/development/HERMES-PIN.md, in the\n"
        "same change. If it is not deliberate, restore the snapshot from\n"
        "library/ai/hermes-agent-main.zip.\n"
        % (EXPECTED_DIGEST, actual, count, PINNED)
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
