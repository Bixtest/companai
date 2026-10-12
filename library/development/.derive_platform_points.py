"""Re-derive the ONE NUMBER from the boxes in platform_points.md.

Implements the rule stated in the file itself (section "How the numbers are
derived"), §L excluded:

  - `- ` line .......... whole point  -> 1 unit
  - `- ` line with `▸ n/N`  split parent -> 1 unit, NEVER done (children carry)
  - `-   - ` line ...... sub-point   -> 1 unit
  - `-     ...` (5+ spaces) -> annotation, never a unit
  - done = whole points + sub-points carrying the tick glyph
  - section `L` stops the walk (the ledger holds no points)
"""
import re
import sys

PATH = r"C:\Users\Ramzi\Downloads\companai\library\development\platform_points.md"

TICKS = ("\u2611", "\u2705")          # ☑ ✅
OPEN = "\u2610"                        # ☐

whole_re = re.compile(r"^- (?!  - )")          # "- " not "-   - "
sub_re = re.compile(r"^-   - ")                 # "-   - "
# annotation: "- " then 2+ spaces before the (non-space) content — e.g. "-     *(was PART)*".
# A real whole point has exactly one space after "- " (then a glyph).
ann_re = re.compile(r"^- {3,}\S")
# a "whole point" marker: first non-space glyph after "- " is a box glyph or ▸
glyph_re = re.compile(r"^- ([%s%s%s])" % (OPEN, TICKS[0], TICKS[1]))
split_re = re.compile(r"^- .*\u25b8\s*\d+/\d+")   # ▸ n/N


def main():
    with open(PATH, "r", encoding="utf-8") as fh:
        lines = fh.read().splitlines()

    sec = None
    counts = {}   # sec -> [units, done]
    order = []
    for ln in lines:
        m = re.match(r"^## ([A-K])\.", ln)
        if m:
            sec = m.group(1)
            if sec not in counts:
                counts[sec] = [0, 0]
                order.append(sec)
            continue
        if re.match(r"^## L\.", ln):
            sec = None
            continue
        if sec is None:
            continue

        if sub_re.match(ln):
            counts[sec][0] += 1
            if any(t in ln[:8] for t in TICKS):
                counts[sec][1] += 1
        elif ann_re.match(ln):
            pass  # annotation continuation — never a unit
        elif whole_re.match(ln):
            counts[sec][0] += 1
            if split_re.match(ln):
                pass  # split parent: unit counted, never done
            elif any(t in ln[:8] for t in TICKS):
                counts[sec][1] += 1

    units = sum(v[0] for v in counts.values())
    done = sum(v[1] for v in counts.values())
    for s in "ABCDEFGHIJK":
        if s in counts:
            print("  %s %d/%d" % (s, counts[s][1], counts[s][0]))
    print("TOTAL %d / %d = %.0f%%" % (done, units, 100.0 * done / units))
    return 0


if __name__ == "__main__":
    sys.exit(main())
