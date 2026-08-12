# UI and UX findings

**What this is.** Things that work but look or read badly, collected as they are
noticed rather than fixed on the spot.

**Why it is a list and not a stream of fixes.** Stopping a batch to fix a label
costs the batch. Recording it costs seconds. Once the Starting Kit is finished
this list becomes its own phase, and by then it will be worth doing properly —
with a designer's eye across the whole product rather than one screen at a time.

**The exception**, from COOKBOOK rule zero-two: genuinely small and risk-free
fixes go in at once. If a fix is a one-line string change with no behaviour
attached, do it and note it here as done rather than queueing it.

**Severity means:**

| | |
|---|---|
| **high** | Somebody will do the wrong thing, or fail to do the right one |
| **medium** | Confusing or ugly enough to erode trust |
| **low** | Noticed, worth tidying, harms nothing |

---

## Open

| # | Where | What | Severity |
|---|---|---|---|
| X1 | Sidebar customization | The save control is in the **top** card, above the list it saves, and reads **"Create variant"** rather than *Save*. Cost the owner real time on first use | **high** |
| X2 | Sidebar customization | *Apply to roles* toggles reset to off on every page load, and saving with them off **deletes** those roles' presets (U2) | **high** |
| X3 | Authority → edges | No create control on the page; an edge can only appear automatically or through the API. The empty state now explains this, but the gap remains | medium |
| X4 | Backend footer | `Version 0.0.0-dev` shown to end users | low |
| X5 | Authority graph | When the organization lookup fails the page **silently** renders raw UUIDs instead of saying anything is wrong. That is how X6 stayed invisible. A failed lookup should show an error, not degrade into unreadable output | medium |
| X6 | Parked modules (catalog, sales) | Three live-page queries request `pageSize=200`, above the API maximum of 100 — the same defect fixed on the authority page. They do not run today, so they are harmless until one of those modules is unparked | low |
| X9 | Profile menu | The header reads **"admin@local.test"** and then **"LOGGED IN AS:"** *underneath* it — label after value, which reads backwards. One-line reorder | low |
| X8 | Audit log | Action labels are inconsistent: command-bus writes render as *"Create currency"*, direct writes as raw ids like `authority.denial.created`. Mine — the denials routes use `writeDirectWriteAuditLog`, which has no translated label | low |
| X7 | Demo feedback bubble | The fixed "Feedback"/"Contact us" pill overlaps table rows at the bottom of long lists | low |

## Fixed already

| Where | What | When |
|---|---|---|
| Authority → edges | Empty state claimed an edge is "created automatically for each parent-child link" while none was. Reworded, and U11 made the claim true | 2026-08-11 |
| App shell logo | Rendered with `rounded-full` and `object-fit: fill` — a circle masked out of a mark that fills its canvas, then squashed 448×473 into a 40×40 box. Three call sites. **It did the same to any tenant's uploaded logo**, so this was a general defect, not a Companai one | 2026-08-12 |
| Page metadata | `description` still advertised upstream's product — a "modular ERP foundation". Replaced with what Companai actually is | 2026-08-12 |
| Favicon | The `.ico` sat in `public/` unreferenced; only the SVG was declared | 2026-08-12 |
| Authority graph | Every row showed raw UUIDs instead of organization names, because the page asked for `pageSize=200` and the API caps it at 100 — so the lookup 400'd on every load and `nameOf` fell back to the id. One-line fix. **The screen that governs authority was unreadable** | 2026-08-12 |

---

*Add rows as they are noticed. This list is not the roadmap; nothing here is
scheduled until the Starting Kit is finished.*
