"""Build the companai documentation library.

Markdown only. Deterministic and re-runnable:
  pass 1  stage every source file into its destination folder, with collision
          detection (same path from two sources is compared by content, never
          silently overwritten)
  pass 2  remove exact content duplicates, keeping the copy in the
          lowest-numbered folder
  pass 3  write MANIFEST.txt describing exactly what happened
"""
import hashlib, os, shutil, collections

LIB = r"C:\Users\Ramzi\Downloads\companai\library"
E   = r"E:\brainstorming\projecting"
K   = r"C:\Users\Ramzi\Downloads\konsult\aissistant-package"

# Directories inside LIB that this script must NEVER delete.
#
# These are not shelves. They were added by hand after the shelves were built,
# and they hold material that cannot be re-generated from the sources below:
#
#   ai/        the ai-first direction set, the Hermes runtime source and the
#              sibling project's documentation (plus an 88 MB source archive)
#   analysis/  the analysis programme — PLAN.md, LOG.md and every batch report
#
# Without this set, running the script as PROVENANCE.md documents it would
# delete both, silently, and there is no source to rebuild them from.
PRESERVE = {"ai", "analysis"}

# Directory names never copied (raw material, vendored code, generated assets).
EXCLUDE_DIRS = {
    "node_modules", "legacy_copies", "_source", "screenshots", "raw",
    "dist", ".git", "backups", "data", ".next", "coverage", "tmp",
}

# (destination folder, source path, maxdepth, note)
# maxdepth = directory levels below the source to include; 0 = top level only.
SOURCES = [
    ("01-policy-and-plan",          rf"{E}\project\docs",                       0,    "Platform policy, gap analysis, implementation plan, dictionary"),
    ("02-architecture-contracts",   rf"{E}\project\docs\architecture",          None, "Contracts and architecture decision records"),
    ("03-uxaios-product-and-paths", rf"{E}\project\docs\uxaios",                None, "UXAIOS product set: vision, feature specs, phase plans"),
    ("03-uxaios-product-and-paths", rf"{E}\project\reboot",                     None, "UXAIOS path plans: PHASE-C/D, feature specs batches"),
    ("04-agent-analysis",           rf"{E}\project\docs\agent-analysis",        None, "Agent analysis reports"),
    ("05-platform-audit-and-srs",   rf"{E}\project\formalize-platform-audit",   None, "The audit -> SRS -> target architecture series (01-48)"),
    ("06-certification",            rf"{E}\project\debug-certification",        None, "Bug and gap registries, certification reports, phase 1-9"),
    ("07-canonical-hardening",      rf"{E}\canonical",                          None, "Canonical hardening set: blueprint, vision, defects, open decisions"),
    ("08-formalize-blueprint",      rf"{E}\formalize",                          None, "Platform formalisation: overview, sitemap, data model, roles, pages"),
    ("09-reboot-vision",            rf"{E}\reboot",                             None, "Reboot system_v0 and boardograph vision set"),
    ("10-uxaios-interface-vision",  rf"{E}\bookmarks\frontend_vision",          None, "The 2.5D interface paradigm and platform concept manual"),
    ("11-active-workstreams",       rf"{E}\active",                             None, "Eight active design workstreams"),
    ("12-vision-extras",            rf"{E}\vision-and-some",                    None, "Vision documents not held elsewhere"),
    ("13-design-conversations",     rf"{E}\ai-datasets",                        None, "Exported design conversations (ChatGPT, Claude, Gemini)"),
    ("14-reference-collections",    rf"{E}\bookmarks\backend_references",       0,    "Backend reference notes"),
    ("15-agent-rules",              rf"{E}\agent_rules",                        None, "Agent operating rules"),
    ("16-konsult-product-docs",     rf"{K}\docs",                               None, "Product docs of the live codebase: docs/"),
    ("16-konsult-product-docs/documentation", rf"{K}\documentation",            None, "Product docs of the live codebase: documentation/"),
]

LOOSE = [
    (rf"{E}\FRAMEWORK_FORENSIC_TESTING.md",     "12-vision-extras"),
    (rf"{E}\GRAPH_PORTAL_AGENT_IMMERSION.md",   "12-vision-extras"),
    (rf"{E}\platform-foundation-brainstorm.md", "12-vision-extras"),
    (rf"{E}\task.md",                           "12-vision-extras"),
]

NOTES = {}


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def collect(src, maxdepth):
    """Yield (absolute source file, path relative to src)."""
    out = []
    if not os.path.isdir(src):
        print(f"  !! MISSING SOURCE: {src}")
        return out
    for root, dirs, names in os.walk(src):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel = os.path.relpath(root, src)
        level = 0 if rel == "." else rel.count(os.sep) + 1
        if maxdepth is not None and level > maxdepth:
            dirs[:] = []
            continue
        for n in names:
            if not n.lower().endswith(".md"):
                continue
            rp = [n] if rel == "." else rel.split(os.sep) + [n]
            if maxdepth is not None and (len(rp) - 1) > maxdepth:
                continue
            out.append((os.path.join(root, n), os.path.join(*rp)))
    return out


def main(check=False):
    # ---- pre-flight: every source must exist, or we refuse to touch anything ----
    # Without this, running on a machine where the E: drive is not mounted would
    # print "MISSING SOURCE" for every shelf and then delete the shelves, leaving
    # an empty library. Refusing is the only safe answer.
    missing = [src for _l, src, _d, _n in SOURCES if not os.path.isdir(src)]
    missing += [f for f, _l in LOOSE if not os.path.isfile(f)]
    if missing:
        print("REFUSING TO RUN — these sources are missing:")
        for m in missing:
            print(f"  !! {m}")
        print("Nothing was deleted. Fix the paths, then run again.")
        raise SystemExit(2)

    # ---- the deletion plan, printed before anything is removed ----
    if os.path.isdir(LIB):
        for entry in sorted(os.listdir(LIB)):
            p = os.path.join(LIB, entry)
            if not os.path.isdir(p):
                continue
            if entry in PRESERVE:
                print(f"  -- preserving {entry}/  (not a shelf — hand-added material)")
            else:
                print(f"  -- would delete {entry}/  (shelf — rebuilt from source)")

    if check:
        print("\n--check: nothing was written. Re-run without --check to rebuild.")
        return

    if os.path.isdir(LIB):
        for entry in os.listdir(LIB):
            p = os.path.join(LIB, entry)
            if entry in PRESERVE:
                continue
            if os.path.isdir(p):
                shutil.rmtree(p)
    os.makedirs(LIB, exist_ok=True)

    staged = {}          # dest path -> (source file, tag)
    collisions = []

    def stage(dest, srcfile, tag):
        if dest in staged:
            other_src, _ = staged[dest]
            if md5(other_src) == md5(srcfile):
                return                       # byte-identical, keep the first
            base, ext = os.path.splitext(dest)
            candidate, n = f"{base}--from-{tag}{ext}", 2
            while candidate in staged:
                candidate = f"{base}--from-{tag}-{n}{ext}"
                n += 1
            collisions.append((dest, candidate, tag))
            dest = candidate
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(srcfile, dest)
        staged[dest] = (srcfile, tag)

    for label, src, maxdepth, note in SOURCES:
        tag = os.path.basename(src.rstrip("\\/"))
        files = collect(src, maxdepth)
        dest_root = os.path.join(LIB, *label.split("/"))
        for srcfile, rel in files:
            stage(os.path.join(dest_root, rel), srcfile, tag)
        NOTES[label] = note
        print(f"  {label:<40} {len(files):4d} found in {src}")

    for srcfile, label in LOOSE:
        if not os.path.isfile(srcfile):
            print(f"  !! MISSING FILE: {srcfile}")
            continue
        stage(os.path.join(LIB, label, os.path.basename(srcfile)), srcfile, "loose")
    print(f"  {'(loose files)':<40} {len(LOOSE):4d} found")

    # ---- dedupe by content, unique destination paths only ----
    groups = collections.defaultdict(list)
    for dest in staged:
        groups[md5(dest)].append(dest)

    removed = []
    for h, paths in groups.items():
        if len(paths) > 1:
            paths.sort()
            removed.extend(paths[1:])
    for p in removed:
        os.remove(p)

    counts = collections.Counter()
    for dest in staged:
        if dest in removed:
            continue
        counts[os.path.relpath(dest, LIB).split(os.sep)[0]] += 1

    with open(os.path.join(LIB, "MANIFEST.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"staged unique paths : {len(staged)}\n")
        fh.write(f"kept after dedupe   : {len(staged) - len(removed)}\n")
        fh.write(f"duplicates removed  : {len(removed)}\n")
        fh.write(f"name collisions     : {len(collisions)}\n\n")
        fh.write("-- documents per folder --\n")
        for k in sorted(counts):
            fh.write(f"{counts[k]:5d}  {k}\n")
        fh.write("\n-- duplicates removed (kept copy is in the lower-numbered folder) --\n")
        for p in sorted(removed):
            fh.write(os.path.relpath(p, LIB).replace("\\", "/") + "\n")
        fh.write("\n-- name collisions (same filename, different content) --\n")
        for a, b, tag in collisions:
            fh.write(f"{os.path.relpath(a, LIB)}  ->  {os.path.relpath(b, LIB)}\n")

    print(f"\nstaged_unique={len(staged)}  kept={len(staged)-len(removed)}  "
          f"duplicates={len(removed)}  collisions={len(collisions)}")
    for k in sorted(counts):
        print(f"  {counts[k]:5d}  {k}")


if __name__ == "__main__":
    import sys
    main(check="--check" in sys.argv)
